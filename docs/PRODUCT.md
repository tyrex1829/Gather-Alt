# MetaOffice — Virtual Office Platform

## Product Vision

A Gather.town alternative — a 2D metaverse virtual office platform where companies create custom office maps, invite team members as avatars, and collaborate in real-time with proximity-based audio/video, chat, and AI-powered office agents.

Target: Remote/hybrid teams who want presence, spontaneity, and culture that Slack/Zoom can't deliver.

---

## Tech Stack

### Frontend
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **State Management:** Zustand
- **Canvas Rendering:** HTML5 Canvas / PixiJS (for map rendering and character movement)
- **Real-time:** Socket.io client
- **Media:** WebRTC (via mediasoup-client or LiveKit client SDK)

### Backend
- **Runtime:** Bun
- **HTTP Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB with Mongoose
- **Validation:** Zod
- **Queue:** BullMQ
- **Cache / Pub-Sub:** Redis
- **WebSocket:** Socket.io (scaled via Redis adapter)
- **Media Server:** mediasoup or LiveKit (SFU for WebRTC)
- **AI:** OpenAI API / Anthropic API, LangChain, vector DB (Pinecone or MongoDB Atlas Vector Search)

### Infra & DevOps
- **Monorepo:** Turborepo
- **VPS Deployment:** PM2 process manager
- **CI/CD:** GitHub Actions -> SSH deploy to VPS
- **Reverse Proxy:** Nginx (with SSL via Let's Encrypt)
- **Containerization (optional):** Docker + Docker Compose

---

## Monorepo Structure (Turborepo)

```
Gather/
├── apps/
│   ├── web/                    # Next.js frontend
│   ├── gateway-service/        # HTTP API — auth, REST, API key management
│   ├── ws-service/             # WebSocket server — real-time state sync
│   ├── media-service/          # WebRTC SFU — audio/video streams
│   ├── ai-service/             # AI agent, RAG pipeline, LLM calls
│   ├── map-service/            # Map CRUD, tile validation, collision maps
│   └── notification-service/   # Email (invites), push notifications
├── packages/
│   ├── shared-types/           # Shared TypeScript types & Zod schemas
│   ├── db/                     # Mongoose models, connection logic
│   ├── config/                 # Shared env config, constants
│   ├── utils/                  # Shared utility functions
│   └── ui/                     # Shared UI components (if needed)
├── docs/
│   └── PRODUCT.md              # This file
├── turbo.json
├── package.json
└── CLAUDE.md
```

---

## Service Architecture

### 1. Gateway Service (HTTP API)
- **Port:** 4000
- **Responsibilities:**
  - Auth (JWT-based: signup, login, refresh, logout)
  - Organization/team CRUD
  - User profile management
  - API key generation & validation (for external integrations)
  - Role & permission management (admin, member, viewer)
  - Invitation system (email-based)
- **Key endpoints:**
  - `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`
  - `POST /orgs`, `GET /orgs/:id`, `POST /orgs/:id/invite`
  - `POST /api-keys`, `DELETE /api-keys/:id`
  - `GET /users/me`, `PATCH /users/me`

### 2. WebSocket Service (WS)
- **Port:** 4001
- **Responsibilities:**
  - Real-time character position broadcasting
  - Room join/leave management
  - Status updates (busy, in-meeting, available, away)
  - Chair sit/stand interactions
  - Chat messages (1:1 and room-wide)
  - Typing indicators, presence
- **Scaling:** Multiple WS server instances behind Nginx (sticky sessions via IP hash or cookie). Redis adapter for Socket.io so all instances share room state.
- **Pub-Sub flow:**
  - User moves on Server A -> Server A publishes to Redis channel `room:{roomId}:movement`
  - Server B (also serving users in that room) receives from Redis -> broadcasts to its local clients
- **Room model:** Each virtual office map = one Socket.io room. Sub-rooms (meeting rooms, cafeteria) can be nested namespaces or sub-channels.

### 3. Media Service (WebRTC SFU)
- **Port:** 4002
- **Responsibilities:**
  - Audio/video stream routing via SFU (Selective Forwarding Unit)
  - Proximity-based audio: server calculates distance between characters, instructs SFU to adjust volume or mute
  - Proximity-based video: same logic, show/hide video feeds based on distance
  - Meeting room mode: when inside a meeting room, all participants hear/see each other regardless of distance
- **Tech:** mediasoup (Node.js SFU) or LiveKit (standalone SFU server)
- **Proximity logic:**
  - Every tick (e.g., 100ms), WS service sends character positions to media service
  - Media service computes pairwise distances
  - If distance < `AUDIO_RANGE` (e.g., 5 tiles): stream audio, volume scales linearly with distance
  - If distance < `VIDEO_RANGE` (e.g., 3 tiles): stream video
  - If inside a meeting room: override ranges, full audio/video for all room occupants

### 4. AI Service
- **Port:** 4003
- **Responsibilities:**
  - AI Office Agent (NPC) — exists as an avatar on the map
  - RAG pipeline: ingest company docs, codebase, wikis -> vector embeddings -> retrieval-augmented Q&A
  - Meeting transcription & summarization
  - Smart office layout generation from natural language prompts
  - Proximity context engine: surface relevant info when two people are near each other
  - Status prediction based on user behavior patterns
- **Tech:** LangChain + OpenAI/Anthropic API + vector store (Pinecone or MongoDB Atlas Vector Search)
- **Communication:** Receives requests via BullMQ jobs (async) or direct HTTP calls (sync for chat-like interactions)

### 5. Map Service
- **Port:** 4004
- **Responsibilities:**
  - Map CRUD (create, read, update, delete office layouts)
  - Tile/grid management: each map is a 2D grid of tiles
  - Collision map generation: binary grid marking walkable vs non-walkable tiles
  - Object placement validation (desks, chairs, walls, posters, meeting rooms)
  - Map templates (pre-built office layouts)
  - Export collision map to WS service for server-side movement validation
- **Tile types:** `floor`, `wall`, `desk`, `chair`, `door`, `meeting-room-floor`, `cafeteria-floor`, `poster-wall`, `spawn-point`
- **Storage:** Map data in MongoDB (JSON grid), collision bitmap cached in Redis for fast lookups

### 6. Notification Service
- **Port:** 4005
- **Responsibilities:**
  - Email sending (team invitations, password resets, meeting summaries)
  - Push notifications (browser notifications for mentions, DMs)
  - Webhook dispatching (for external integrations via API keys)
- **Tech:** Nodemailer (or Resend/SendGrid), Web Push API
- **Queue:** Consumes jobs from BullMQ

---

## Core Features (MVP — v1)

### Map Editor
- Grid-based drag-and-drop editor
- Place walls, floors, desks, chairs, doors, spawn points
- Define room boundaries (meeting rooms, cafeteria)
- Save/load maps
- Collision map auto-generated from wall/object placement

### Character System
- Pre-built character sprites (8-12 characters to choose from)
- 4-directional movement (up, down, left, right) or 8-directional
- Walking animation sprites
- Sitting animation (when on a chair)
- Name tag above character
- Status indicator (colored dot: green=available, red=busy, yellow=away, purple=in-meeting)

### Real-Time Movement & Collision
- Client sends movement intent (direction + position) to WS server
- Server validates against collision map (server-authoritative)
- Server broadcasts validated position to all clients in the room
- Client does optimistic rendering (move immediately, rubber-band if server rejects)
- Interpolation for smooth remote character movement
- Tick rate: ~20-30 updates/second for position data

### Proximity Audio
- WebRTC audio streams via SFU
- Volume scales with distance (closer = louder, farther = quieter)
- Beyond `AUDIO_RANGE`: muted completely
- Multiple simultaneous audio streams supported
- Mic toggle (mute/unmute) per user
- Visual indicator on character when mic is active

### Proximity Video
- WebRTC video streams via SFU
- Video feed appears when within `VIDEO_RANGE`
- Multiple simultaneous video feeds in a floating panel
- Camera toggle per user
- Video quality adapts to number of visible streams (bandwidth management)

### Chat
- Sidebar chat panel
- 1:1 direct messages
- Room-wide group chat (visible to everyone in the virtual office)
- Message persistence (stored in MongoDB)
- Unread message indicators
- @mentions with notifications

### Team Management
- Create organization / workspace
- Invite members via email
- Roles: Owner, Admin, Member, Viewer
- Admin can set designations (Engineer, Designer, PM, etc.)
- Admin can configure office rules (e.g., quiet hours, meeting room booking)

### Chair Interaction
- When character moves adjacent to a chair: show "Sit" action button
- Sitting: character sprite changes to sitting pose, faces the desk
- Desk shows a computer screen graphic
- Standing up: press button or move keys to stand

---

## Features (v2 — Post-MVP)

### Meeting Rooms (Special Functionality)
- Enter a meeting room: auto-join a dedicated audio/video channel (no proximity, everyone hears/sees everyone)
- Screen sharing within meeting rooms
- Whiteboard (collaborative drawing canvas)
- Meeting room booking system (calendar integration)
- AI auto-transcription and summary generation
- Action item extraction and assignment

### AI Office Agent (NPC)
- Avatar placed on the map (customizable appearance)
- Walk up to the AI agent to interact (chat bubble UI)
- RAG-based Q&A: answers questions from company knowledge base
- Standup catch-up: "What happened while I was away?" -> summarizes activity, messages, meetings
- Task routing: "Who should I talk to about X?" -> analyzes team roles and suggests
- Voice interaction: speak to the AI agent via mic when in proximity

### Smart Map Generator
- Admin describes office in natural language
- AI generates a map layout matching the description
- Admin can iterate: "Add two more meeting rooms on the right side"
- Template library with AI customization

### Proximity Context Engine
- When two people are near each other, surface relevant context
- "You both have PRs touching the same module"
- "You have a shared calendar event in 30 minutes"
- Requires integration with GitHub, Jira, Google Calendar via API keys

### Company Customization
- Upload company logo as poster/wall art
- Custom color themes for office furniture
- Custom character skins/uniforms
- Branded loading screens

### External Integrations (via API Keys)
- Slack: post office activity to Slack channels
- GitHub: show PR/commit activity as office notifications
- Jira: sync ticket status with user status
- Google Calendar: auto-set status based on calendar events
- CI/CD webhooks: build status displayed on an "office monitor" object

### Status & Availability
- Manual status: Available, Busy, In a Meeting, Do Not Disturb, Away
- Auto-status: detect idle (no movement for X minutes) -> set to Away
- AI-predicted availability: learn patterns, suggest best times to approach someone
- Focus mode: temporarily increase personal "proximity range" requirement (people need to be closer to interact)

---

## Database Schema (MongoDB Collections)

### users
```
{
  _id, email, passwordHash, name, avatarCharacterId,
  organizationIds[], role, designation, status,
  preferences: { audioRange, videoRange, theme },
  createdAt, updatedAt
}
```

### organizations
```
{
  _id, name, slug, ownerId, logo,
  settings: { maxMembers, features[] },
  apiKeys: [{ key, name, permissions[], createdAt }],
  createdAt, updatedAt
}
```

### maps
```
{
  _id, organizationId, name, width, height,
  tiles: [[{ type, objectId?, rotation?, metadata? }]],
  collisionGrid: [[0|1]],
  spawnPoint: { x, y },
  rooms: [{ id, name, type, bounds: { x, y, w, h } }],
  createdAt, updatedAt
}
```

### messages
```
{
  _id, roomId, senderId, recipientId?,
  type: 'direct' | 'room',
  content, mentions[],
  createdAt
}
```

### meetings
```
{
  _id, roomId, mapRoomId, participants[],
  startedAt, endedAt,
  transcript?, summary?, actionItems[]
}
```

---

## WebSocket Events

### Client -> Server
| Event | Payload | Description |
|-------|---------|-------------|
| `player:move` | `{ direction, position }` | Movement intent |
| `player:sit` | `{ chairId }` | Sit on chair |
| `player:stand` | `{}` | Stand up from chair |
| `player:status` | `{ status }` | Update status |
| `chat:send` | `{ to?, message }` | Send chat message |
| `room:join` | `{ mapId, characterId }` | Join virtual office |
| `room:leave` | `{}` | Leave virtual office |
| `media:toggle-mic` | `{ enabled }` | Toggle microphone |
| `media:toggle-cam` | `{ enabled }` | Toggle camera |

### Server -> Client
| Event | Payload | Description |
|-------|---------|-------------|
| `player:moved` | `{ userId, position, direction }` | Broadcast position |
| `player:joined` | `{ userId, name, characterId, position }` | New player joined |
| `player:left` | `{ userId }` | Player left |
| `player:sat` | `{ userId, chairId }` | Player sat down |
| `player:stood` | `{ userId }` | Player stood up |
| `player:status-changed` | `{ userId, status }` | Status update |
| `chat:received` | `{ from, message, type }` | Incoming message |
| `media:peer-update` | `{ userId, audioEnabled, videoEnabled }` | Media state change |
| `media:proximity-update` | `{ peers: [{ userId, distance, volume }] }` | Proximity audio levels |
| `room:state` | `{ players[], objects[] }` | Full room state on join |

---

## Collision Detection (Server-Authoritative)

### Grid-Based Approach
- Map is a 2D grid (e.g., 100x80 tiles, each tile = 32x32 pixels)
- Each tile has a collision flag: `0` = walkable, `1` = blocked
- Walls, desks, occupied chairs = blocked
- Doors, floors, spawn points = walkable

### Movement Validation Flow
1. Client sends `player:move { direction: 'right', position: { x: 10, y: 5 } }`
2. Server calculates target tile: `{ x: 11, y: 5 }`
3. Server checks `collisionGrid[5][11]`
4. If `0`: update player position in server state, broadcast `player:moved`
5. If `1`: reject, send correction `player:moved` with current valid position (rubber-band)

### Character Bounding
- Each character occupies 1 tile
- Movement is tile-to-tile (not pixel-based) for simplicity — feels like a 2D RPG
- Movement speed: configurable tiles-per-second (e.g., 4 tiles/sec)

---

## WebSocket Scaling via Redis Pub-Sub

### Architecture
```
                    ┌─────────────┐
                    │   Nginx LB  │
                    │ (sticky)    │
                    └──────┬──────┘
                 ┌─────────┼─────────┐
                 │         │         │
           ┌─────┴──┐ ┌───┴────┐ ┌──┴─────┐
           │ WS-1   │ │ WS-2   │ │ WS-3   │
           │ :4001  │ │ :4001  │ │ :4001  │
           └───┬────┘ └───┬────┘ └───┬────┘
               │          │          │
               └──────────┼──────────┘
                    ┌─────┴──────┐
                    │   Redis    │
                    │  Pub-Sub   │
                    └────────────┘
```

### How It Works
- Socket.io with `@socket.io/redis-adapter`
- All WS servers connect to the same Redis instance
- When a message is emitted to a room on WS-1, Redis adapter publishes it
- WS-2 and WS-3 (if they have clients in that room) receive and broadcast locally
- Room state (player positions) stored in Redis hash for fast access and consistency

---

## API Key System (External Integrations)

### Flow
1. Admin generates API key in dashboard: `POST /api-keys { name: "CI/CD Bot", permissions: ["read:status", "write:notifications"] }`
2. Server generates a hashed key, returns the raw key once (never stored raw)
3. External system includes key in header: `Authorization: Bearer mk_live_abc123...`
4. Gateway service validates key, checks permissions, routes request

### Key Format
- Prefix: `mk_live_` (production) or `mk_test_` (sandbox)
- 32-byte random string, base62 encoded
- Stored as SHA-256 hash in DB

---

## CI/CD Pipeline (GitHub Actions -> VPS)

### Flow
```
Push to main -> GitHub Actions -> Lint + Type Check + Test -> Build -> SSH into VPS -> Pull latest -> Install deps -> PM2 restart
```

### PM2 Ecosystem File
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    { name: 'gateway',       script: 'apps/gateway-service/dist/index.js',       port: 4000, instances: 1 },
    { name: 'ws-1',           script: 'apps/ws-service/dist/index.js',            port: 4001, instances: 1 },
    { name: 'ws-2',           script: 'apps/ws-service/dist/index.js',            port: 4006, instances: 1 },
    { name: 'media',          script: 'apps/media-service/dist/index.js',         port: 4002, instances: 1 },
    { name: 'ai',             script: 'apps/ai-service/dist/index.js',            port: 4003, instances: 1 },
    { name: 'map',            script: 'apps/map-service/dist/index.js',           port: 4004, instances: 1 },
    { name: 'notification',   script: 'apps/notification-service/dist/index.js',  port: 4005, instances: 1 },
  ]
}
```

### Nginx Config (Simplified)
```nginx
upstream ws_servers {
    ip_hash;
    server 127.0.0.1:4001;
    server 127.0.0.1:4006;
}

server {
    listen 443 ssl;
    server_name app.metaoffice.io;

    location / {
        proxy_pass http://127.0.0.1:3000;  # Next.js
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;  # Gateway
    }

    location /ws/ {
        proxy_pass http://ws_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Key Design Principles

1. **Server-authoritative state:** Never trust client for position, collision, or permissions. Client renders optimistically, server validates.
2. **Horizontal scaling:** WS servers are stateless (state in Redis). Add more instances behind the load balancer as needed.
3. **Service isolation:** Each service has its own responsibility. Communication via HTTP (sync) or BullMQ (async). No direct DB access across services — go through APIs.
4. **Zod everywhere:** Validate all inputs at service boundaries. Shared Zod schemas in `packages/shared-types`.
5. **Fail gracefully:** If AI service is down, office still works. If media service is down, chat and movement still work. Degrade, don't crash.
6. **SOLID principles:** Single responsibility per service and per module. Depend on abstractions (interfaces), not implementations.
