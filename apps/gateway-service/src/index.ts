import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { connectDb } from "@gather/db";
import { loadEnv } from "@gather/config";
import {
  ApiKeyValidateSchema,
  InviteCreateSchema,
  RefreshTokenInputSchema
} from "@gather/shared-types";
import { AppError, logError, logInfo } from "@gather/utils";
import { UserModel } from "./models/User";
import { OrganizationModel } from "./models/Organization";
import { ApiKeyModel } from "./models/ApiKey";
import { InviteModel } from "./models/Invite";
import { MessageModel } from "./models/Message";
import { authMiddleware } from "./middleware/auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
const env = loadEnv(process.env);
const app = express();

const ACCESS_TOKEN_TTL: SignOptions["expiresIn"] =
  (process.env.ACCESS_TOKEN_TTL || "15m") as SignOptions["expiresIn"];
const REFRESH_TOKEN_TTL: SignOptions["expiresIn"] =
  (process.env.REFRESH_TOKEN_TTL || "30d") as SignOptions["expiresIn"];
const INVITE_TTL_DAYS = Math.max(1, Number(process.env.INVITE_TTL_DAYS || 7));

const ORG_ROLES = ["owner", "admin", "member", "viewer"] as const;
type OrgRole = (typeof ORG_ROLES)[number];

const ROLE_WEIGHT: Record<OrgRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3
};

type JwtAuthPayload = {
  userId: string;
  email: string;
  name?: string;
  tokenVersion?: number;
  type?: "access" | "refresh";
  service?: string;
};

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" }
});

app.use("/auth", authLimiter);

const auth = authMiddleware(env.JWT_SECRET);

function serviceOnly(serviceName: string) {
  return function (req: any, _res: any, next: any) {
    if (req.user?.service !== serviceName) {
      return next(new AppError("Forbidden", 403));
    }
    next();
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashValue(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateApiKey(prefix: string) {
  const raw = crypto.randomBytes(32).toString("base64url");
  return `${prefix}${raw}`;
}

function generateInviteToken() {
  return `inv_${crypto.randomBytes(24).toString("base64url")}`;
}

function signAccessToken(user: any) {
  return jwt.sign(
    {
      userId: String(user._id),
      email: user.email,
      name: user.name,
      tokenVersion: user.refreshTokenVersion || 0,
      type: "access"
    },
    env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function signRefreshToken(user: any) {
  return jwt.sign(
    {
      userId: String(user._id),
      email: user.email,
      tokenVersion: user.refreshTokenVersion || 0,
      type: "refresh"
    },
    env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
}

function buildTokenPair(user: any) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  return {
    token: accessToken,
    accessToken,
    refreshToken
  };
}

function sanitizeUser(user: any) {
  return {
    id: String(user._id),
    _id: String(user._id),
    email: user.email,
    name: user.name,
    avatarCharacterId: user.avatarCharacterId,
    organizationIds: user.organizationIds || [],
    role: user.role,
    designation: user.designation,
    status: user.status,
    refreshTokenVersion: user.refreshTokenVersion || 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function roleCanAssign(actorRole: OrgRole, targetRole: OrgRole) {
  if (actorRole === "owner") return true;
  if (actorRole === "admin") return ROLE_WEIGHT[targetRole] <= ROLE_WEIGHT.member;
  return false;
}

function getOrgRole(org: any, user: any, userId: string): OrgRole | null {
  if (String(org.ownerId) === userId) return "owner";
  const member = (org.members || []).find((m: any) => String(m.userId) === userId);
  if (member?.role && ORG_ROLES.includes(member.role)) {
    return member.role as OrgRole;
  }
  if ((user.organizationIds || []).includes(String(org._id))) {
    return "member";
  }
  return null;
}

async function requireOrgAccess(userId: string, orgId: string, allowedRoles?: OrgRole[]) {
  const [org, user] = await Promise.all([
    OrganizationModel.findById(orgId),
    UserModel.findById(userId)
  ]);
  if (!org) throw new AppError("Organization not found", 404);
  if (!user) throw new AppError("User not found", 404);

  const role = getOrgRole(org, user, userId);
  if (!role) throw new AppError("Forbidden", 403);
  if (allowedRoles && !allowedRoles.includes(role)) {
    throw new AppError("Insufficient permissions", 403);
  }

  return { org, user, role };
}

async function addUserToOrg(org: any, userId: string, role: OrgRole) {
  const orgId = String(org._id);
  const existing = (org.members || []).find((m: any) => String(m.userId) === userId);
  if (!existing) {
    org.members.push({ userId, role, joinedAt: new Date() });
    await org.save();
  }

  await UserModel.findByIdAndUpdate(userId, {
    $addToSet: { organizationIds: orgId }
  });
}

app.get("/health", (_req, res) => res.json({ ok: true }));

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1)
});

app.post("/auth/signup", async (req, res, next) => {
  try {
    const input = SignupSchema.parse(req.body);
    const email = normalizeEmail(input.email);

    const existing = await UserModel.findOne({ email });
    if (existing) throw new AppError("Email already in use", 409);

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await UserModel.create({
      email,
      passwordHash,
      name: input.name,
      organizationIds: []
    });

    const tokens = buildTokenPair(user);
    res.json({ ...tokens, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

app.post("/auth/login", async (req, res, next) => {
  try {
    const input = LoginSchema.parse(req.body);
    const email = normalizeEmail(input.email);
    const user = await UserModel.findOne({ email });
    if (!user) throw new AppError("Invalid credentials", 401);

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new AppError("Invalid credentials", 401);

    const tokens = buildTokenPair(user);
    res.json({ ...tokens, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

app.post("/auth/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = RefreshTokenInputSchema.parse(req.body);

    let payload: JwtAuthPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_SECRET) as JwtAuthPayload;
    } catch {
      throw new AppError("Invalid refresh token", 401);
    }

    if (payload.type !== "refresh") {
      throw new AppError("Invalid refresh token", 401);
    }

    const user = await UserModel.findById(payload.userId);
    if (!user) throw new AppError("User not found", 404);

    if ((user.refreshTokenVersion || 0) !== (payload.tokenVersion || 0)) {
      throw new AppError("Refresh token expired", 401);
    }

    const tokens = buildTokenPair(user);
    res.json({ ...tokens, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

app.post("/auth/logout", auth, async (req: any, res, next) => {
  try {
    await UserModel.findByIdAndUpdate(req.user.userId, {
      $inc: { refreshTokenVersion: 1 }
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.post("/auth/logout-all", auth, async (req: any, res, next) => {
  try {
    await UserModel.findByIdAndUpdate(req.user.userId, {
      $inc: { refreshTokenVersion: 1 }
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.get("/users/me", auth, async (req: any, res, next) => {
  try {
    const user = await UserModel.findById(req.user.userId);
    if (!user) throw new AppError("User not found", 404);
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

const UserUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  designation: z.string().optional(),
  status: z.enum(["available", "busy", "away", "in-meeting"]).optional()
});

app.patch("/users/me", auth, async (req: any, res, next) => {
  try {
    const input = UserUpdateSchema.parse(req.body);
    const user = await UserModel.findByIdAndUpdate(req.user.userId, input, { new: true });
    if (!user) throw new AppError("User not found", 404);
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

const OrgCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/)
});

app.post("/orgs", auth, async (req: any, res, next) => {
  try {
    const input = OrgCreateSchema.parse(req.body);

    const org = await OrganizationModel.create({
      name: input.name,
      slug: input.slug,
      ownerId: req.user.userId,
      members: [
        {
          userId: req.user.userId,
          role: "owner",
          joinedAt: new Date()
        }
      ]
    });

    await UserModel.findByIdAndUpdate(req.user.userId, {
      $addToSet: { organizationIds: String(org._id) },
      role: "owner"
    });

    res.status(201).json({ org });
  } catch (err: any) {
    if (err?.code === 11000) {
      return next(new AppError("Organization slug already exists", 409));
    }
    next(err);
  }
});

app.get("/orgs", auth, async (req: any, res, next) => {
  try {
    const user = await UserModel.findById(req.user.userId).lean();
    if (!user) throw new AppError("User not found", 404);

    const orgIds = user.organizationIds || [];
    const orgs = await OrganizationModel.find({
      $or: [
        { _id: { $in: orgIds } },
        { ownerId: req.user.userId },
        { "members.userId": req.user.userId }
      ]
    }).lean();

    res.json({ orgs });
  } catch (err) {
    next(err);
  }
});

app.get("/orgs/:id", auth, async (req: any, res, next) => {
  try {
    const { org } = await requireOrgAccess(req.user.userId, req.params.id);
    res.json({ org });
  } catch (err) {
    next(err);
  }
});

app.get("/orgs/:id/roles", auth, async (req: any, res, next) => {
  try {
    const { role } = await requireOrgAccess(req.user.userId, req.params.id);
    res.json({ roles: ORG_ROLES, currentRole: role });
  } catch (err) {
    next(err);
  }
});

const RoleUpdateSchema = z.object({
  role: z.enum(["owner", "admin", "member", "viewer"])
});

app.patch("/orgs/:id/members/:userId/role", auth, async (req: any, res, next) => {
  try {
    const { role: targetRole } = RoleUpdateSchema.parse(req.body);
    const actorId = req.user.userId;
    const targetUserId = req.params.userId;
    const { org, role: actorRole } = await requireOrgAccess(actorId, req.params.id, ["owner", "admin"]);

    if (!roleCanAssign(actorRole, targetRole)) {
      throw new AppError("Insufficient permissions to assign this role", 403);
    }

    const targetUser = await UserModel.findById(targetUserId);
    if (!targetUser) throw new AppError("Target user not found", 404);

    if (targetRole === "owner") {
      if (actorRole !== "owner") {
        throw new AppError("Only owners can transfer ownership", 403);
      }

      const previousOwnerId = String(org.ownerId);
      org.ownerId = targetUserId;

      const prevOwnerMember = (org.members || []).find((m: any) => String(m.userId) === previousOwnerId);
      if (prevOwnerMember) {
        prevOwnerMember.role = "admin";
      } else {
        org.members.push({ userId: previousOwnerId, role: "admin", joinedAt: new Date() });
      }

      const targetMember = (org.members || []).find((m: any) => String(m.userId) === targetUserId);
      if (targetMember) {
        targetMember.role = "owner";
      } else {
        org.members.push({ userId: targetUserId, role: "owner", joinedAt: new Date() });
      }

      await org.save();
      await Promise.all([
        UserModel.findByIdAndUpdate(targetUserId, { $addToSet: { organizationIds: String(org._id) } }),
        UserModel.findByIdAndUpdate(previousOwnerId, { $addToSet: { organizationIds: String(org._id) } })
      ]);

      return res.json({ ok: true, ownerId: targetUserId });
    }

    const member = (org.members || []).find((m: any) => String(m.userId) === targetUserId) as any;
    if (!member) {
      org.members.push({ userId: targetUserId, role: targetRole, joinedAt: new Date() } as any);
    } else {
      member.role = targetRole;
    }

    await org.save();
    await UserModel.findByIdAndUpdate(targetUserId, {
      $addToSet: { organizationIds: String(org._id) }
    });

    res.json({ ok: true, role: targetRole });
  } catch (err) {
    next(err);
  }
});

app.get("/orgs/:id/members", auth, async (req: any, res, next) => {
  try {
    const { org } = await requireOrgAccess(req.user.userId, req.params.id);

    const memberIds = new Set<string>((org.members || []).map((m: any) => String(m.userId)));
    memberIds.add(String(org.ownerId));

    const members = await UserModel.find(
      {
        $or: [
          { organizationIds: req.params.id },
          { _id: { $in: Array.from(memberIds) } }
        ]
      },
      { passwordHash: 0 }
    ).lean();

    const hydrated = members.map((m: any) => {
      const roleFromOrg = String(org.ownerId) === String(m._id)
        ? "owner"
        : ((org.members || []).find((entry: any) => String(entry.userId) === String(m._id))?.role || "member");
      return {
        ...m,
        role: roleFromOrg
      };
    });

    res.json({ members: hydrated });
  } catch (err) {
    next(err);
  }
});

const JoinOrgSchema = z.object({ slug: z.string().min(1) });

app.post("/orgs/join", auth, async (req: any, res, next) => {
  try {
    const { slug } = JoinOrgSchema.parse(req.body);
    const org = await OrganizationModel.findOne({ slug });
    if (!org) throw new AppError("Organization not found", 404);

    await addUserToOrg(org, req.user.userId, "member");
    res.json({ org });
  } catch (err) {
    next(err);
  }
});

async function createInvite(orgId: string, actorId: string, email: string, role: OrgRole) {
  const { role: actorRole } = await requireOrgAccess(actorId, orgId, ["owner", "admin"]);
  if (!roleCanAssign(actorRole, role)) {
    throw new AppError("Insufficient permissions to assign this invite role", 403);
  }

  const normalizedEmail = normalizeEmail(email);
  const existingPending = await InviteModel.findOne({
    organizationId: orgId,
    email: normalizedEmail,
    acceptedAt: null,
    expiresAt: { $gt: new Date() }
  });

  if (existingPending) {
    throw new AppError("Pending invite already exists for this email", 409);
  }

  const rawToken = generateInviteToken();
  const invite = await InviteModel.create({
    organizationId: orgId,
    email: normalizedEmail,
    role,
    tokenHash: hashValue(rawToken),
    createdBy: actorId,
    expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
  });

  return { invite, rawToken };
}

app.post("/orgs/:id/invites", auth, async (req: any, res, next) => {
  try {
    const input = InviteCreateSchema.parse(req.body);
    const { invite, rawToken } = await createInvite(req.params.id, req.user.userId, input.email, input.role as OrgRole);

    res.status(201).json({
      invite: {
        id: String(invite._id),
        organizationId: invite.organizationId,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt
      },
      inviteToken: rawToken,
      acceptPath: `/invites/${rawToken}/accept`
    });
  } catch (err) {
    next(err);
  }
});

// Legacy alias kept for backward compatibility.
app.post("/orgs/:id/invite", auth, async (req: any, res, next) => {
  try {
    const email = z.string().email().parse(req.body?.email);
    const role = z.enum(["owner", "admin", "member", "viewer"]).default("member").parse(req.body?.role ?? "member");
    const { invite, rawToken } = await createInvite(req.params.id, req.user.userId, email, role as OrgRole);

    res.status(201).json({
      ok: true,
      invite: {
        id: String(invite._id),
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt
      },
      inviteToken: rawToken
    });
  } catch (err) {
    next(err);
  }
});

app.get("/orgs/:id/invites", auth, async (req: any, res, next) => {
  try {
    await requireOrgAccess(req.user.userId, req.params.id, ["owner", "admin"]);

    const invites = await InviteModel.find({
      organizationId: req.params.id,
      acceptedAt: null,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 }).lean();

    res.json({ invites });
  } catch (err) {
    next(err);
  }
});

app.post("/invites/:token/accept", auth, async (req: any, res, next) => {
  try {
    const token = z.string().min(1).parse(req.params.token);
    const tokenHash = hashValue(token);

    const invite = await InviteModel.findOne({
      tokenHash,
      acceptedAt: null,
      expiresAt: { $gt: new Date() }
    });

    if (!invite) throw new AppError("Invite not found or expired", 404);

    const user = await UserModel.findById(req.user.userId);
    if (!user) throw new AppError("User not found", 404);
    if (normalizeEmail(user.email) !== normalizeEmail(invite.email)) {
      throw new AppError("This invite was issued for a different email", 403);
    }

    const org = await OrganizationModel.findById(invite.organizationId);
    if (!org) throw new AppError("Organization not found", 404);

    await addUserToOrg(org, req.user.userId, invite.role as OrgRole);
    invite.acceptedAt = new Date();
    await invite.save();

    res.json({
      ok: true,
      orgId: invite.organizationId,
      role: invite.role
    });
  } catch (err) {
    next(err);
  }
});

const ApiKeyCreateSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1),
  permissions: z.array(z.string()).default([])
});

app.post("/api-keys", auth, async (req: any, res, next) => {
  try {
    const input = ApiKeyCreateSchema.parse(req.body);
    await requireOrgAccess(req.user.userId, input.organizationId, ["owner", "admin"]);

    const prefix = process.env.NODE_ENV === "production" ? "mk_live_" : "mk_test_";
    const rawKey = generateApiKey(prefix);
    const keyHash = hashValue(rawKey);

    const apiKey = await ApiKeyModel.create({
      organizationId: input.organizationId,
      name: input.name,
      permissions: input.permissions,
      prefix,
      keyHash
    });

    res.status(201).json({
      apiKeyId: String(apiKey._id),
      key: rawKey,
      organizationId: input.organizationId,
      name: input.name,
      permissions: input.permissions
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api-keys", auth, async (req: any, res, next) => {
  try {
    const organizationId = z.string().min(1).parse(req.query.organizationId);
    await requireOrgAccess(req.user.userId, organizationId, ["owner", "admin"]);

    const apiKeys = await ApiKeyModel.find(
      { organizationId },
      { keyHash: 0 }
    ).sort({ createdAt: -1 }).lean();

    res.json({ apiKeys });
  } catch (err) {
    next(err);
  }
});

app.post("/api-keys/validate", async (req, res, next) => {
  try {
    const input = ApiKeyValidateSchema.parse(req.body);
    const keyHash = hashValue(input.key);

    const apiKey = await ApiKeyModel.findOne({ keyHash }).lean();
    if (!apiKey) {
      return res.json({ valid: false });
    }

    if (input.permission && !(apiKey.permissions || []).includes(input.permission)) {
      return res.json({ valid: false });
    }

    res.json({
      valid: true,
      apiKeyId: String(apiKey._id),
      organizationId: apiKey.organizationId,
      name: apiKey.name,
      permissions: apiKey.permissions || []
    });
  } catch (err) {
    next(err);
  }
});

app.delete("/api-keys/:id", auth, async (req: any, res, next) => {
  try {
    const apiKey = await ApiKeyModel.findById(req.params.id);
    if (!apiKey) throw new AppError("API key not found", 404);

    await requireOrgAccess(req.user.userId, apiKey.organizationId, ["owner", "admin"]);
    await apiKey.deleteOne();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const InternalMessageSchema = z.object({
  mapId: z.string().min(1),
  senderId: z.string().min(1),
  senderName: z.string().min(1),
  content: z.string().min(1).max(2000),
  recipientId: z.string().optional(),
  type: z.enum(["direct", "room"]).optional(),
  mentions: z.array(z.string()).optional()
});

app.post("/internal/messages", auth, serviceOnly("ws-service"), async (req: any, res, next) => {
  try {
    const input = InternalMessageSchema.parse(req.body);
    const type = input.type || (input.recipientId ? "direct" : "room");

    const message = await MessageModel.create({
      roomId: input.mapId,
      senderId: input.senderId,
      senderName: input.senderName,
      recipientId: input.recipientId,
      type,
      content: input.content,
      mentions: input.mentions || []
    });

    res.status(201).json({
      message: {
        id: String(message._id),
        roomId: message.roomId,
        senderId: message.senderId,
        senderName: message.senderName,
        recipientId: message.recipientId,
        type: message.type,
        content: message.content,
        mentions: message.mentions,
        createdAt: message.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

app.use((err: any, _req: any, res: any, _next: any) => {
  const status = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : "Unknown error";
  if (status >= 500) {
    logError(message, { stack: err?.stack });
  } else {
    logError(message);
  }
  res.status(status).json({ error: message });
});

connectDb(env.MONGO_URL)
  .then(() => {
    app.listen(env.GATEWAY_PORT, () => {
      logInfo(`Gateway listening on ${env.GATEWAY_PORT}`);
    });
  })
  .catch((err) => {
    logError("Failed to connect to DB", { err });
    process.exit(1);
  });
