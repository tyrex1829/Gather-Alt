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
  name: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tiles: z.array(z.array(TileSchema)),
  spawnPoint: z.object({ x: z.number().int(), y: z.number().int() }),
  rooms: z.array(z.any()).optional()
});

function buildCollisionGrid(tiles: any[][]) {
  return tiles.map((row) => row.map((t) => (t.type === "wall" || t.type === "desk" || t.type === "chair" ? 1 : 0)));
}

app.get("/health", (_req, res) => res.json({ ok: true }));

// List maps by organization
app.get("/maps", auth, async (req: any, res, next) => {
  try {
    const { organizationId } = z.object({ organizationId: z.string() }).parse(req.query);
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
    const collisionGrid = buildCollisionGrid(input.tiles);
    const map = await MapModel.create({ ...input, collisionGrid });
    res.json({ map });
  } catch (err) {
    next(err);
  }
});

app.get("/maps/:id", auth, async (req: any, res, next) => {
  try {
    const map = await MapModel.findById(req.params.id).lean();
    if (!map) throw new AppError("Map not found", 404);
    res.json({ map });
  } catch (err) {
    next(err);
  }
});

app.patch("/maps/:id", auth, async (req: any, res, next) => {
  try {
    const input = MapCreateSchema.partial().parse(req.body);
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
    await MapModel.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Internal endpoint for WS service to fetch collision grids (uses service token or JWT)
app.get("/internal/maps/:id/collision", auth, async (req: any, res, next) => {
  try {
    const map = await MapModel.findById(req.params.id, { collisionGrid: 1, width: 1, height: 1, spawnPoint: 1 }).lean();
    if (!map) throw new AppError("Map not found", 404);
    res.json({ map });
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
    app.listen(env.MAP_PORT, () => {
      logInfo(`Map service listening on ${env.MAP_PORT}`);
    });
  })
  .catch((err) => {
    logError("Failed to connect to DB", { err });
    process.exit(1);
  });
