# Project Status (MVP+ Foundations)

## Scope Covered
- Turborepo monorepo with frontend + multi-service backend.
- Bun + TypeScript + Express + MongoDB + Zod.
- Next.js (App Router) + Zustand + Tailwind frontend.
- Socket.io real-time presence and chat.
- Map CRUD + collision validation + map message history.

## Implemented Now

### Shared Platform
- `packages/shared-types`: expanded schemas for roles, invites, refresh tokens, API key validation, and WS chat payloads.
- `packages/config`: additional service ports (`MEDIA_PORT`, `AI_PORT`, `NOTIFICATION_PORT`).
- `packages/utils`: JWT middleware now rejects refresh tokens on access routes.

### Gateway Service (`apps/gateway-service`)
- Auth:
  - `POST /auth/signup`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `POST /auth/logout-all`
- User:
  - `GET /users/me`
  - `PATCH /users/me`
- Organizations:
  - `POST /orgs`
  - `GET /orgs`
  - `GET /orgs/:id`
  - `GET /orgs/:id/roles`
  - `GET /orgs/:id/members`
  - `PATCH /orgs/:id/members/:userId/role`
  - `POST /orgs/join`
- Invites:
  - `POST /orgs/:id/invites`
  - `GET /orgs/:id/invites`
  - `POST /invites/:token/accept`
  - legacy alias retained: `POST /orgs/:id/invite`
- API keys:
  - `POST /api-keys`
  - `GET /api-keys?organizationId=...`
  - `DELETE /api-keys/:id`
  - `POST /api-keys/validate`
- Internal message ingest (service-auth):
  - `POST /internal/messages`

### WS Service (`apps/ws-service`)
- JWT socket auth.
- Events: `room:join`, `player:move`, `player:status`, `chat:send`, `player:left`, `room:state`.
- Ack events added:
  - `room:join:ack`
  - `player:move:ack`
  - `chat:send:ack`
- Status event normalization:
  - emits `player:status-changed` (+ legacy `player:status:changed`).
- Chat persistence wired via gateway internal endpoint.

### Map Service (`apps/map-service`)
- CRUD with org membership authorization:
  - `GET /maps`
  - `POST /maps`
  - `GET /maps/:id`
  - `PATCH /maps/:id`
  - `DELETE /maps/:id`
- Message history retrieval:
  - `GET /maps/:id/messages?cursor=&limit=`
- Internal collision endpoint for WS service:
  - `GET /internal/maps/:id/collision`

### Frontend (`apps/web`)
- Auth pages `/login`, `/signup` updated for access+refresh token storage.
- API client auto-refreshes access token on 401.
- Dashboard map view now loads persisted message history on room entry.
- Logout now calls backend logout endpoint.

### Service Topology Scaffolding
- Added runnable scaffold services:
  - `apps/media-service` (`/health`)
  - `apps/ai-service` (`/health`)
  - `apps/notification-service` (`/health`)

## Runtime Ports
- Gateway: `4000`
- WS: `4001`
- Media (scaffold): `4002`
- AI (scaffold): `4003`
- Map: `4004`
- Notification (scaffold): `4005`
- Web: `3000`

## Validation Run
- `bun run typecheck` passes across all workspaces (11 packages).
- Backend service builds pass for gateway/map/ws/media/ai/notification.

## Remaining Major Work
- Implement actual LiveKit flows in `media-service`.
- Implement RAG + agent endpoints/jobs in `ai-service`.
- Implement email/webhook delivery pipelines in `notification-service`.
- Add integration/e2e/load tests and production observability (metrics, traces, SLO dashboards).
