# Current Task

Feature ID: F002
Feature: Authentication (Login, logout, session handling, protected routes, API AuthGuard)
Status: COMPLETE (PR ready for review loop)
Phase: Phase 01 — Foundation

## Objective
Implement authentication across the stack: Auth.js in Next.js web (login, logout, session, protected route middleware redirect) and stateless JWT verification via AuthGuard in NestJS API, with zero external SaaS dependencies for local/CI testability.

## Prerequisite
F001, F006, and F007 are COMPLETE and merged to `main`. Branch `feat/F002-authentication` is active.

## Steps
- [x] Record provider decision (Auth.js) in DECISIONS.md (DEC-007)
- [x] Add auth/user types to `packages/domain` (Id, User, SessionUser)
- [x] Configure Auth.js in `apps/web` with Credentials provider, login page (`/login`), and session handling
- [x] Add Next.js route protection middleware redirecting unauthenticated requests from `/dashboard` to `/login`
- [x] Implement `AuthModule`, `AuthGuard`, `@CurrentUser()`, and `/auth/me` endpoint in `apps/api`
- [x] Automated integration tests for Next.js auth/middleware and NestJS `AuthGuard`
- [x] Full verification suite (`pnpm verify` + `pnpm build`)

## Verification
- [x] TypeScript: PASS · Lint: PASS · Unit/Integration: PASS · Build: PASS · check-architecture: PASS

## Do Not
- Build enterprise SSO / SAML / SCIM (Phase 13).
- Implement multi-tenant organization switching (F003 / F004).
- Add full RBAC permission matrices (F005).

## Next Task
F003 — Organizations.

## Last Updated
2026-09-26
