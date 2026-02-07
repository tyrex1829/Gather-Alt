import { z } from "zod";

export const UserStatus = z.enum(["available", "busy", "away", "in-meeting"]);

export const UserSchema = z.object({
  _id: z.string().optional(),
  email: z.string().email(),
  name: z.string().min(1),
  avatarCharacterId: z.string().optional(),
  organizationIds: z.array(z.string()).default([]),
  role: z.enum(["owner", "admin", "member", "viewer"]).default("member"),
  designation: z.string().optional(),
  status: UserStatus.default("available"),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const OrganizationSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  ownerId: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const MapTileSchema = z.object({
  type: z.enum([
    "floor",
    "wall",
    "desk",
    "chair",
    "door",
    "meeting-room-floor",
    "cafeteria-floor",
    "poster-wall",
    "spawn-point"
  ]),
  objectId: z.string().optional(),
  rotation: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const MapSchema = z.object({
  _id: z.string().optional(),
  organizationId: z.string(),
  name: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tiles: z.array(z.array(MapTileSchema)),
  collisionGrid: z.array(z.array(z.number().int().min(0).max(1))).optional(),
  spawnPoint: z.object({ x: z.number().int(), y: z.number().int() }),
  rooms: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    bounds: z.object({ x: z.number().int(), y: z.number().int(), w: z.number().int(), h: z.number().int() })
  })).default([])
});

export const MessageSchema = z.object({
  _id: z.string().optional(),
  roomId: z.string(),
  senderId: z.string(),
  recipientId: z.string().optional(),
  type: z.enum(["direct", "room"]),
  content: z.string(),
  mentions: z.array(z.string()).default([]),
  createdAt: z.date().optional()
});

// WS event schemas
export const RoomJoinSchema = z.object({
  mapId: z.string(),
  characterId: z.string().optional()
});

export const PlayerMoveSchema = z.object({
  mapId: z.string(),
  position: z.object({ x: z.number().int(), y: z.number().int() }),
  direction: z.string().optional()
});

export const ChatSendSchema = z.object({
  mapId: z.string(),
  content: z.string().min(1).max(2000),
  recipientId: z.string().optional()
});

export const PlayerStatusSchema = z.object({
  status: UserStatus
});

export const PlayerStateSchema = z.object({
  userId: z.string(),
  name: z.string(),
  characterId: z.string().optional(),
  position: z.object({ x: z.number().int(), y: z.number().int() }),
  status: UserStatus.default("available")
});

export type User = z.infer<typeof UserSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type MapDoc = z.infer<typeof MapSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type RoomJoin = z.infer<typeof RoomJoinSchema>;
export type PlayerMove = z.infer<typeof PlayerMoveSchema>;
export type ChatSend = z.infer<typeof ChatSendSchema>;
export type PlayerStatus = z.infer<typeof PlayerStatusSchema>;
export type PlayerState = z.infer<typeof PlayerStateSchema>;
