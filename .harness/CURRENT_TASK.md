# Current Task
 
Feature ID: F007
Feature: API foundation (NestJS skeleton: validation, typed error envelope, health)
Status: COMPLETE
Phase: Phase 01 — Foundation
 
## Objective
Establish the API edge foundation in NestJS: request validation at the edge, typed error envelopes `{ error: { code, message, details } }` preventing stack trace leaks past the edge, module-per-domain-area structure, and health endpoint wired with database check.
 
## Prerequisite
F001 and F006 are COMPLETE. F006 is on branch `feat/F006-database-foundation`. Merge to `main` before starting `feat/F007-api-foundation`.
 
## Steps
- [x] Merge F006 to `main` and branch `feat/F007-api-foundation`
- [x] Configure global ValidationPipe with class-validator / class-transformer for DTO validation at the edge
- [x] Implement global HttpExceptionFilter / ErrorFilter providing typed error envelope `{ error: { code, message, details } }`
- [x] Ensure no stack traces or raw database errors leak in production error responses
- [x] Enhance `/health` endpoint to check database connectivity via PrismaService
- [x] Integration tests verifying `/health` and structured error handling for invalid requests
 
## Verification
- [x] TypeScript: PASS · Lint: PASS · Unit/Integration: PASS (31 tests) · Build: PASS · check-architecture: PASS. Evaluator: 5.0/5.0. Log: `.harness/reviews/F007-review.md`.
 
## Do Not
- Build business domain CRUD endpoints yet (handled in F003/F004/F018).
- Implement auth guards here (handled in F002).
 
## Next Task
F002 — Authentication. Next unchecked item in `ROADMAP.md`'s Phase 01 order (F006/F007 were worked ahead of it with no recorded reason in `DECISIONS.md`; F002 is the honest next pick absent one).
 
## Last Updated
2026-09-26
