# Project Status (MVP)

## Scope You Asked For
- Turborepo monorepo.
- Backend: Bun + TypeScript + Express + MongoDB (Mongoose) + Zod.
- Frontend: Next.js (App Router) + Zustand + Tailwind + shadcn-style UI.
- Real-time presence via WebSocket (Socket.io).
- Map CRUD + collision grid.
- Basic MVP flow end-to-end.

## What’s Implemented Now

### Monorepo + Tooling
- Turborepo with workspaces in `apps/*` and `packages/*`.
- Root configs: `package.json`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.env.example`.
- CI: basic GitHub Actions workflow.

### Shared Packages
- `packages/shared-types`: Zod schemas for users, orgs, maps, messages.
- `packages/db`: Mongoose connection helper.
- `packages/config`: env parsing with Zod.
- `packages/utils`: logger + AppError.

### Backend Services
- **Gateway** (`apps/gateway-service`)
  - Auth: `POST /auth/signup`, `POST /auth/login`.
  - User: `GET /users/me`, `PATCH /users/me`.
  - Orgs: `POST /orgs`, `GET /orgs/:id`, `POST /orgs/:id/invite` (stub).
  - API keys: `POST /api-keys`, `DELETE /api-keys/:id` (hashed storage).
  - Loads root `.env` from repo.
- **WS Service** (`apps/ws-service`)
  - Socket.io server with Redis adapter support.
  - Events: `room:join`, `player:move`, `player:joined`, `player:left`, `room:state`.
  - Simple in-memory room state.
- **Map Service** (`apps/map-service`)
  - CRUD: `POST /maps`, `GET /maps/:id`, `PATCH /maps/:id`, `DELETE /maps/:id`.
  - Collision grid generation from tiles.
  - Loads root `.env` from repo.

### Frontend (Next.js App)
- Auth pages: `/login`, `/signup`.
- Dashboard: shows user, live presence count, map create + render.
- Map grid render with local player movement (arrow keys) and WS position emit.
- Zustand auth store + API client helpers.

### UI Theme (Your Latest Request)
- Global cosmic-nebula background.
- Font: Inter via `next/font`.
- Card/input/button styling aligned with the reference pattern UI.

## What You Asked Me To Do (Summary)
- Build a full MVP stack using the specified tech.
- Scaffold monorepo and wire services.
- Get everything running locally.
- Create a map and show it in UI.
- Apply a specific UI design pattern and background.

## Current Runtime Status (Expected)
- Gateway: `http://localhost:4000`
- WS: `http://localhost:4001`
- Map: `http://localhost:4004`
- Web: `http://localhost:3000`

## Known Gaps / Next Steps
- Tie maps to real organizations (instead of hardcoded `org-default`).
- Render remote players (currently only local player is visible).
- Persist player positions in Redis (or DB) if needed.
- Add chat UI + WS message persistence.
- Add role/permission enforcement on org/map endpoints.
- Add seed/fixture data for quick demos.

