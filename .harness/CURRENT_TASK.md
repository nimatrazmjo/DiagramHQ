# Current Task
 
Feature ID: F007
Feature: API foundation (NestJS skeleton: validation, typed error envelope, health)
Status: NOT STARTED
Phase: Phase 01 — Foundation
 
## Objective
Establish the API edge foundation in NestJS: request validation at the edge, typed error envelopes `{ error: { code, message, details } }` preventing stack trace leaks past the edge, module-per-domain-area structure, and health endpoint wired with database check.
 
## Prerequisite
F001 and F006 are COMPLETE. F006 is on branch `feat/F006-database-foundation`. Merge to `main` before starting `feat/F007-api-foundation`.
 
## Steps
- [ ] Merge F006 to `main` and branch `feat/F007-api-foundation`
- [ ] Configure global ValidationPipe with class-validator / class-transformer for DTO validation at the edge
- [ ] Implement global HttpExceptionFilter / ErrorFilter providing typed error envelope `{ error: { code, message, details } }`
- [ ] Ensure no stack traces or raw database errors leak in production error responses
- [ ] Enhance `/health` endpoint to check database connectivity via PrismaService
- [ ] Integration tests verifying `/health` and structured error handling for invalid requests
 
## Verification
- [ ] TypeScript: NOT RUN  · Lint: NOT RUN · Unit/Integration: NOT RUN · Build: NOT RUN · check-architecture: NOT RUN
 
## Do Not
- Build business domain CRUD endpoints yet (handled in F003/F004/F018).
- Implement auth guards here (handled in F002).
 
## Last Updated
2026-09-26
