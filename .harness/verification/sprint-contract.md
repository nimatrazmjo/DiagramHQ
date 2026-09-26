# Sprint Contract — F002 (Authentication)

Written by the Planner before any code. It fixes "done" so the Generator cannot drift and the Evaluator has something objective to grade against.

## Feature
- Id: F002
- Title: Authentication
- Phase / slice: Phase 01 — Foundation

## Goal (one sentence)
Users can log in and log out with managed sessions, unauthenticated visits to protected web routes are redirected to login, and the API protects endpoints via stateless token validation.

## Acceptance -> checks
Map each acceptance item from `PHASE-01-FOUNDATION.md` to how it will be verified.
| Acceptance item | How verified (command / test / screenshot) |
|---|---|
| Login, logout, session handling | Web auth routes/session state + API token issuance/validation integration tests |
| Protected routes redirect when unauthenticated | Next.js middleware test / integration check: unauthenticated GET to `/dashboard` redirects to `/login`; API `AuthGuard` returns 401 `UNAUTHORIZED` envelope |
| Authenticated access allowed | Request with valid token/session passes through to protected routes and populates current user |
| No SSO/SCIM (Phase 13) | Code review confirms standard auth only; enterprise SSO/SCIM parked for Phase 13 |

## Plan (steps)
1. In `apps/web`: Set up Auth.js (`next-auth`) with Credentials provider, session handling, login page (`/login`), and route protection middleware (`middleware.ts`).
2. In `apps/api`: Implement `AuthModule`, `AuthGuard`, `@CurrentUser()` parameter decorator, and a protected endpoint (e.g. `GET /auth/me`) validating the shared session JWT / Bearer token using standard error envelope (`UNAUTHORIZED`).
3. Shared session/user types in `packages/domain` or shared contract so web and api use the exact same user payload shape `{ id, email, name }`.
4. Automated tests:
   - Next.js middleware and auth handler tests in `apps/web`.
   - NestJS `AuthGuard` and `/auth/me` integration tests in `apps/api` (401 when unauthenticated/invalid token, 200 with user profile when valid token provided).
5. Verify: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `./scripts/check-architecture.sh`, `pnpm build`.

## In scope
- Auth.js in `apps/web` with Credentials authentication for development/CI and standard JWT strategy.
- `/login` page and sign-out functionality.
- Route protection middleware in Next.js redirecting unauthenticated visitors to `/login`.
- NestJS `AuthModule`, `AuthGuard`, token extraction (Bearer header or cookie), and current user injection.
- Integration tests in both apps verifying authentication boundaries.

## Explicitly out of scope (parked)
- Enterprise SSO / SAML / OIDC provider federation (Phase 13 — F106).
- SCIM directory synchronization (Phase 13 — F107).
- Organization membership / tenant switching (F003 / F004).
- Granular RBAC permissions (F005 / F104).

## New dependencies
- `apps/web`: `next-auth@5.0.0-beta.25` (or compatible Auth.js) for Next.js App Router auth.
- `apps/api`: `jsonwebtoken` + `@types/jsonwebtoken` for verifying JWTs signed with `AUTH_SECRET`.

## Boundaries touched
- Layers: `apps/web` (UI, middleware, auth API route), `apps/api` (auth module, guards, edge filter compatibility), `packages/domain` (user/auth types).
- Check-architecture rules: no domain -> web/api imports, no cross-app imports.

## Risks / unknowns
- Next.js 14 App Router compatibility with next-auth v5 beta vs v4: verify clean build with `next build`.
- Shared secret `AUTH_SECRET` must be set in `.env` for both web and api.

## Definition of done
- All acceptance checks green + evidence recorded.
- check-architecture passes.
- Evaluator score >= 4.0, no criterion at 1.
- state + handoff updated, committed on `feat/F002-authentication`.

---
Signed off (Planner) before build: [x]
