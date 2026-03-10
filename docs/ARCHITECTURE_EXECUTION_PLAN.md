# Architecture Execution Plan

## Goals
- Close the gap between `docs/PRODUCT.md` and the currently implemented MVP.
- Keep existing local flows working while adding production-ready contracts.
- Roll out in phases so each step is shippable and testable.

## Implemented in this iteration

### Phase 0: Contract and security hardening
- Added shared contract primitives in `packages/shared-types`:
  - org roles/members
  - invite schema
  - refresh token + token pair schema
  - API key validation schema
- Hardened JWT middleware to reject refresh tokens on access-protected routes.
- Added organization role checks in gateway for sensitive org/api-key operations.
- Added map-service org membership enforcement on map CRUD and message reads.

### Phase 1: Session, invite, and chat foundations
- Added refresh-token lifecycle endpoints:
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `POST /auth/logout-all`
- Added invite lifecycle:
  - `POST /orgs/:id/invites`
  - `GET /orgs/:id/invites`
  - `POST /invites/:token/accept`
  - Legacy alias retained: `POST /orgs/:id/invite`
- Added org role endpoints:
  - `GET /orgs/:id/roles`
  - `PATCH /orgs/:id/members/:userId/role`
- Added API key management/validation:
  - `GET /api-keys?organizationId=...`
  - `POST /api-keys/validate`
- Added chat persistence flow:
  - WS service persists messages to gateway internal endpoint:
    - `POST /internal/messages` (service-auth only)
  - Map service exposes history:
    - `GET /maps/:id/messages?cursor=&limit=`

### WS contract improvements
- Added ack events:
  - `room:join:ack`
  - `player:move:ack`
  - `chat:send:ack`
- Standardized status update event:
  - new `player:status-changed`
  - legacy `player:status:changed` still emitted for compatibility

### Web app compatibility updates
- Auth store now tracks both `token` and `refreshToken`.
- API client auto-refreshes access token on 401 (except login/signup/refresh paths).
- Map canvas now loads chat history when entering a map.
- Logout now calls server logout endpoint and clears local auth state.

## Current architecture status
- Implemented services:
  - `apps/web`
  - `apps/gateway-service`
  - `apps/ws-service`
  - `apps/map-service`
  - `apps/media-service` (scaffolded health endpoint + runtime)
  - `apps/ai-service` (scaffolded health endpoint + runtime)
  - `apps/notification-service` (scaffolded health endpoint + runtime)
- Next in those new services:
  - `apps/media-service`: LiveKit token issuance + proximity policy APIs.
  - `apps/ai-service`: ingestion, retrieval, and agent interaction APIs.
  - `apps/notification-service`: email invites, retries, webhook delivery.

## Next implementation milestones
1. Build `media-service` with LiveKit token issuance and proximity policy integration.
2. Build `notification-service` and wire invite-email delivery from gateway.
3. Build `ai-service` with ingest queue + retrieval endpoints.
4. Add integration adapters (Slack/GitHub/Jira/Calendar) behind API key permissions.
5. Expand tests:
  - route-level integration tests for auth/org/invite/api-key/map
  - WS event contract tests
  - load tests for ws + message persistence path
