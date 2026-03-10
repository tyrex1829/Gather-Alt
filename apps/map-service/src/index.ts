import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import { connectDb } from "@gather/db";
import { loadEnv } from "@gather/config";
import { AppError, authMiddleware, logError, logInfo } from "@gather/utils";
import { MapModel } from "./models/Map";
import { UserModel } from "./models/User";
import { MessageModel } from "./models/Message";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
const env = loadEnv(process.env);
const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));
app.use(express.json());

const auth = authMiddleware(env.JWT_SECRET);

const TileSchema = z.object({
  type: z.string(),
  objectId: z.string().optional(),
  rotation: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const MapCreateSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tiles: z.array(z.array(TileSchema)),
  spawnPoint: z.object({ x: z.number().int(), y: z.number().int() }),
  rooms: z.array(z.any()).optional()
});

const MessageListQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

function buildCollisionGrid(tiles: any[][]) {
  return tiles.map((row) =>
    row.map((t) => (t.type === "wall" || t.type === "desk" || t.type === "chair" ? 1 : 0))
  );
}

function isServiceRequest(req: any, serviceName?: string) {
  if (!req.user?.service) return false;
  if (!serviceName) return true;
  return req.user.service === serviceName;
}

async function requireUserOrgAccess(req: any, organizationId: string) {
  if (isServiceRequest(req)) return;

  const user = await UserModel.findById(req.user.userId).lean();
  if (!user) throw new AppError("User not found", 404);

  const orgIds = user.organizationIds || [];
  if (!orgIds.includes(organizationId)) {
    throw new AppError("Forbidden", 403);
  }
}

async function requireMapAccess(req: any, mapId: string) {
  const map = await MapModel.findById(mapId).lean();
  if (!map) throw new AppError("Map not found", 404);

  await requireUserOrgAccess(req, map.organizationId);
  return map;
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/maps", auth, async (req: any, res, next) => {
  try {
    const { organizationId } = z.object({ organizationId: z.string() }).parse(req.query);
    await requireUserOrgAccess(req, organizationId);

    const maps = await MapModel.find(
      { organizationId },
      { _id: 1, name: 1, width: 1, height: 1, spawnPoint: 1, organizationId: 1 }
    ).lean();

    res.json({ maps });
  } catch (err) {
    next(err);
  }
});

app.post("/maps", auth, async (req: any, res, next) => {
  try {
    const input = MapCreateSchema.parse(req.body);
    await requireUserOrgAccess(req, input.organizationId);

    const collisionGrid = buildCollisionGrid(input.tiles);
    const map = await MapModel.create({ ...input, collisionGrid });
    res.status(201).json({ map });
  } catch (err) {
    next(err);
  }
});

app.get("/maps/:id", auth, async (req: any, res, next) => {
  try {
    const map = await requireMapAccess(req, req.params.id);
    res.json({ map });
  } catch (err) {
    next(err);
  }
});

app.patch("/maps/:id", auth, async (req: any, res, next) => {
  try {
    const existingMap = await requireMapAccess(req, req.params.id);

    const input = MapCreateSchema.partial().parse(req.body);
    if (input.organizationId && input.organizationId !== existingMap.organizationId) {
      await requireUserOrgAccess(req, input.organizationId);
    }

    const update: any = { ...input };
    if (input.tiles) update.collisionGrid = buildCollisionGrid(input.tiles);

    const map = await MapModel.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    res.json({ map });
  } catch (err) {
    next(err);
  }
});

app.delete("/maps/:id", auth, async (req: any, res, next) => {
  try {
    await requireMapAccess(req, req.params.id);
    await MapModel.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.get("/maps/:id/messages", auth, async (req: any, res, next) => {
  try {
    await requireMapAccess(req, req.params.id);
    const query = MessageListQuerySchema.parse(req.query);

    const filter: any = {
      roomId: req.params.id,
      $or: [
        { type: "room" },
        { type: "direct", recipientId: req.user.userId },
        { type: "direct", senderId: req.user.userId }
      ]
    };

    if (query.cursor) {
      filter.createdAt = { $lt: new Date(query.cursor) };
    }

    const messagesDesc = await MessageModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit)
      .lean();

    const messages = messagesDesc.reverse();
    const nextCursor = messagesDesc.length === query.limit
      ? new Date(messagesDesc[messagesDesc.length - 1].createdAt).toISOString()
      : null;

    res.json({ messages, nextCursor });
  } catch (err) {
    next(err);
  }
});

// Internal endpoint for WS service to fetch collision grids.
app.get("/internal/maps/:id/collision", auth, async (req: any, res, next) => {
  try {
    if (!isServiceRequest(req, "ws-service")) {
      await requireMapAccess(req, req.params.id);
    }

    const map = await MapModel.findById(req.params.id, {
      collisionGrid: 1,
      width: 1,
      height: 1,
      spawnPoint: 1
    }).lean();

    if (!map) throw new AppError("Map not found", 404);
    res.json({ map });
  } catch (err) {
    next(err);
  }
});

app.use((err: any, _req: any, res: any, _next: any) => {
  const status = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : "Unknown error";
  logError(message);
  res.status(status).json({ error: message });
});

connectDb(env.MONGO_URL)
  .then(() => {
    app.listen(env.MAP_PORT, () => {
      logInfo(`Map service listening on ${env.MAP_PORT}`);
    });
  })
  .catch((err) => {
    logError("Failed to connect to DB", { err });
    process.exit(1);
  });
