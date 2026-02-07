import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { connectDb } from "@gather/db";
import { loadEnv } from "@gather/config";
import { AppError, logError, logInfo } from "@gather/utils";
import { UserModel } from "./models/User";
import { OrganizationModel } from "./models/Organization";
import { ApiKeyModel } from "./models/ApiKey";
import { authMiddleware } from "./middleware/auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
const env = loadEnv(process.env);
const app = express();

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

app.get("/health", (_req, res) => res.json({ ok: true }));

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1)
});

app.post("/auth/signup", async (req, res, next) => {
  try {
    const input = SignupSchema.parse(req.body);
    const existing = await UserModel.findOne({ email: input.email });
    if (existing) throw new AppError("Email already in use", 409);
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await UserModel.create({
      email: input.email,
      passwordHash,
      name: input.name,
      organizationIds: []
    });
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
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
    const user = await UserModel.findOne({ email: input.email });
    if (!user) throw new AppError("Invalid credentials", 401);
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new AppError("Invalid credentials", 401);
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    next(err);
  }
});

app.get("/users/me", authMiddleware(env.JWT_SECRET), async (req: any, res, next) => {
  try {
    const user = await UserModel.findById(req.user.userId).lean();
    if (!user) throw new AppError("User not found", 404);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

const UserUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  designation: z.string().optional(),
  status: z.enum(["available", "busy", "away", "in-meeting"]).optional()
});

app.patch("/users/me", authMiddleware(env.JWT_SECRET), async (req: any, res, next) => {
  try {
    const input = UserUpdateSchema.parse(req.body);
    const user = await UserModel.findByIdAndUpdate(req.user.userId, input, { new: true }).lean();
    if (!user) throw new AppError("User not found", 404);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

const OrgSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1)
});

app.post("/orgs", authMiddleware(env.JWT_SECRET), async (req: any, res, next) => {
  try {
    const input = OrgSchema.parse(req.body);
    const org = await OrganizationModel.create({
      name: input.name,
      slug: input.slug,
      ownerId: req.user.userId
    });
    await UserModel.findByIdAndUpdate(req.user.userId, { $addToSet: { organizationIds: org.id }, role: "owner" });
    res.json({ org });
  } catch (err) {
    next(err);
  }
});

// List orgs where user is a member
app.get("/orgs", authMiddleware(env.JWT_SECRET), async (req: any, res, next) => {
  try {
    const user = await UserModel.findById(req.user.userId).lean();
    if (!user) throw new AppError("User not found", 404);
    const orgs = await OrganizationModel.find({ _id: { $in: user.organizationIds } }).lean();
    res.json({ orgs });
  } catch (err) {
    next(err);
  }
});

app.get("/orgs/:id", authMiddleware(env.JWT_SECRET), async (req: any, res, next) => {
  try {
    const org = await OrganizationModel.findById(req.params.id).lean();
    if (!org) throw new AppError("Org not found", 404);
    res.json({ org });
  } catch (err) {
    next(err);
  }
});

// List members of an org
app.get("/orgs/:id/members", authMiddleware(env.JWT_SECRET), async (req: any, res, next) => {
  try {
    const members = await UserModel.find(
      { organizationIds: req.params.id },
      { passwordHash: 0 }
    ).lean();
    res.json({ members });
  } catch (err) {
    next(err);
  }
});

// Join org by slug
app.post("/orgs/join", authMiddleware(env.JWT_SECRET), async (req: any, res, next) => {
  try {
    const { slug } = z.object({ slug: z.string().min(1) }).parse(req.body);
    const org = await OrganizationModel.findOne({ slug });
    if (!org) throw new AppError("Organization not found", 404);
    await UserModel.findByIdAndUpdate(req.user.userId, {
      $addToSet: { organizationIds: org.id }
    });
    res.json({ org });
  } catch (err) {
    next(err);
  }
});

app.post("/orgs/:id/invite", authMiddleware(env.JWT_SECRET), async (_req, res) => {
  res.json({ ok: true });
});

const ApiKeySchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1),
  permissions: z.array(z.string()).default([])
});

function hashKey(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateKey(prefix: string) {
  const raw = crypto.randomBytes(32).toString("base64url");
  return `${prefix}${raw}`;
}

app.post("/api-keys", authMiddleware(env.JWT_SECRET), async (req: any, res, next) => {
  try {
    const input = ApiKeySchema.parse(req.body);
    const prefix = "mk_test_";
    const rawKey = generateKey(prefix);
    const keyHash = hashKey(rawKey);
    const apiKey = await ApiKeyModel.create({
      organizationId: input.organizationId,
      name: input.name,
      permissions: input.permissions,
      prefix,
      keyHash
    });
    res.json({ apiKeyId: apiKey.id, key: rawKey });
  } catch (err) {
    next(err);
  }
});

app.delete("/api-keys/:id", authMiddleware(env.JWT_SECRET), async (req: any, res, next) => {
  try {
    await ApiKeyModel.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.use((err: any, _req: any, res: any, _next: any) => {
  const status = err instanceof AppError ? err.statusCode : 400;
  const message = err instanceof Error ? err.message : "Unknown error";
  logError(message);
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
