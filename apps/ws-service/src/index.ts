import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import jwt from "jsonwebtoken";
import { loadEnv } from "@gather/config";
import { logInfo, logError } from "@gather/utils";
import {
  RoomJoinSchema,
  PlayerMoveSchema,
  ChatSendSchema,
  PlayerStatusSchema
} from "@gather/shared-types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
const env = loadEnv(process.env);

const MAP_SERVICE_URL = process.env.NEXT_PUBLIC_MAP_URL || `http://localhost:${env.MAP_PORT}`;

const app = express();
const httpServer = createServer(app);
app.get("/health", (_req, res) => res.json({ ok: true }));

const io = new Server(httpServer, {
  cors: { origin: env.CORS_ORIGIN.split(","), credentials: true }
});

if (env.REDIS_URL) {
  const pubClient = new Redis(env.REDIS_URL);
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
}

// JWT auth middleware for Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      email: string;
      name?: string;
    };
    socket.data.user = {
      userId: payload.userId,
      email: payload.email,
      name: payload.name || payload.email
    };
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

// In-memory state
const roomState = new Map<string, Map<string, any>>();
const collisionGrids = new Map<string, { grid: number[][]; width: number; height: number; spawnPoint: { x: number; y: number } }>();

// Create a service JWT for internal calls to map-service
function createServiceToken(): string {
  return jwt.sign({ userId: "ws-service", email: "ws@internal", name: "WS Service" }, env.JWT_SECRET, { expiresIn: "1h" });
}

async function fetchCollisionGrid(mapId: string) {
  if (collisionGrids.has(mapId)) return collisionGrids.get(mapId)!;
  try {
    const token = createServiceToken();
    const res = await fetch(`${MAP_SERVICE_URL}/internal/maps/${mapId}/collision`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const mapData = {
      grid: data.map.collisionGrid || [],
      width: data.map.width,
      height: data.map.height,
      spawnPoint: data.map.spawnPoint || { x: 0, y: 0 }
    };
    collisionGrids.set(mapId, mapData);
    return mapData;
  } catch (err) {
    logError("Failed to fetch collision grid", { mapId, err });
    return null;
  }
}

function isValidPosition(mapData: { grid: number[][]; width: number; height: number }, pos: { x: number; y: number }): boolean {
  if (pos.x < 0 || pos.y < 0 || pos.x >= mapData.width || pos.y >= mapData.height) return false;
  if (mapData.grid[pos.y]?.[pos.x] === 1) return false;
  return true;
}

let chatIdCounter = 0;

io.on("connection", (socket) => {
  const user = socket.data.user;
  logInfo(`Player connected: ${user.name} (${user.userId})`);

  socket.on("room:join", async (data) => {
    const parsed = RoomJoinSchema.safeParse(data);
    if (!parsed.success) return;
    const { mapId, characterId } = parsed.data;

    socket.join(mapId);

    // Fetch collision grid if not cached
    const mapData = await fetchCollisionGrid(mapId);
    const spawnPoint = mapData?.spawnPoint || { x: 1, y: 1 };

    if (!roomState.has(mapId)) roomState.set(mapId, new Map());
    const playerState = {
      userId: user.userId,
      name: user.name,
      characterId: characterId || "char_1",
      position: spawnPoint,
      status: "available"
    };
    roomState.get(mapId)!.set(user.userId, playerState);

    io.to(mapId).emit("player:joined", playerState);
    socket.emit("room:state", {
      players: Array.from(roomState.get(mapId)!.values()),
      objects: []
    });
  });

  socket.on("player:move", (data) => {
    const parsed = PlayerMoveSchema.safeParse(data);
    if (!parsed.success) return;
    const { mapId, position, direction } = parsed.data;

    const room = roomState.get(mapId);
    if (!room) return;
    const player = room.get(user.userId);
    if (!player) return;

    // Server-side collision validation
    const mapData = collisionGrids.get(mapId);
    if (mapData && !isValidPosition(mapData, position)) return;

    player.position = position;
    player.direction = direction;
    io.to(mapId).emit("player:moved", {
      userId: user.userId,
      position,
      direction
    });
  });

  socket.on("chat:send", (data) => {
    const parsed = ChatSendSchema.safeParse(data);
    if (!parsed.success) return;
    const { mapId, content, recipientId } = parsed.data;

    const message = {
      id: `msg_${++chatIdCounter}_${Date.now()}`,
      senderId: user.userId,
      senderName: user.name,
      content,
      recipientId,
      timestamp: Date.now()
    };

    if (recipientId) {
      // DM: emit only to recipient and sender
      const recipientSocketIds: string[] = [];
      const senderSocketIds: string[] = [];
      for (const [, s] of io.of("/").sockets) {
        if (s.data.user?.userId === recipientId) recipientSocketIds.push(s.id);
        if (s.data.user?.userId === user.userId) senderSocketIds.push(s.id);
      }
      for (const sid of [...recipientSocketIds, ...senderSocketIds]) {
        io.to(sid).emit("chat:received", message);
      }
    } else {
      io.to(mapId).emit("chat:received", message);
    }
  });

  socket.on("player:status", (data) => {
    const parsed = PlayerStatusSchema.safeParse(data);
    if (!parsed.success) return;
    const { status } = parsed.data;

    // Update status in all rooms this player is in
    for (const [mapId, room] of roomState.entries()) {
      const player = room.get(user.userId);
      if (player) {
        player.status = status;
        io.to(mapId).emit("player:status:changed", {
          userId: user.userId,
          status
        });
      }
    }
  });

  socket.on("disconnect", () => {
    logInfo(`Player disconnected: ${user.name} (${user.userId})`);
    for (const [mapId, room] of roomState.entries()) {
      if (room.delete(user.userId)) {
        io.to(mapId).emit("player:left", { userId: user.userId });
      }
    }
  });
});

httpServer.listen(env.WS_PORT, () => {
  logInfo(`WS listening on ${env.WS_PORT}`);
});
