# Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `/health` → `"database":"down"` or `503` | Postgres not running or wrong `DATABASE_URL` | `docker compose up -d postgres`; make the port in `DATABASE_URL` match `POSTGRES_PORT` |
| `P1001: Can't reach database server` | Same as above | Same as above |
| `The column 'views.is_starred' does not exist` (or any missing column) | Migrations not applied | `pnpm db:migrate` |
| `P3005: The database schema is not empty` / migration conflicts after using `prisma db push` | Tables were created without migration history | Dev only: `docker compose down -v`, then `docker compose up -d postgres redis && pnpm db:migrate && pnpm db:seed` |
| `Module '@prisma/client' has no exported member 'ModelObject'` | Prisma client not generated | `pnpm prisma:generate` |
| `Cannot find module '@diagramhq/domain'` | Domain package not built | `pnpm build:domain` (`pnpm dev` does this for you) |
| Login succeeds but the dashboard is empty | Seed not run, or you logged in as a user with no memberships | `pnpm db:seed`, then use a [demo account](authentication.md#demo-accounts-after-pnpm-dbseed) |
| Seeded org not visible for a custom email | Membership is keyed on the derived user id | Add a member with `userId: userIdFor('<email>')` in `seed.ts` |
| Two different emails act as the same user | The user id uses only the first 6 characters of the email ([known limitation](authentication.md#user-identity)) | Use emails whose first 6 characters differ |
| API returns `401` for a web-issued token | Web and API use different `AUTH_SECRET` | Use the same `AUTH_SECRET` for both (see `.env`) |
| `403 Viewer role does not have write permissions` | Logged in as a viewer (e.g. `developer@`) | Use `architect@` (editor) or higher |
| `404` on an object or architecture that exists | It belongs to an org you're not a member of (tenant isolation) | Log in as a member, e.g. `architect@` for Globex |
| `docker compose build` fails in the api `tsc` step | Stale Dockerfile (before PR #47) | Pull `main`; images now build the domain package and generate the Prisma client |
| API container: `libssl` / Prisma engine error | Old image without openssl | Rebuild: `docker compose build --no-cache api` |
| Port 3000 / 4000 / 5432 already in use | Another process is on that port | Stop it, or change `WEB_PORT` / `API_PORT` / `POSTGRES_PORT` in `.env` |
| `pnpm db:seed` fails: `Unknown argument isStarred` / `persona` | Prisma client older than the schema | `pnpm prisma:generate`, then `pnpm db:migrate` |
| Smoke test fails on "view kind … present" | DB seeded with the old seed, or not seeded | `pnpm db:seed` |

## Useful commands

```bash
docker compose ps                         # container health
docker compose logs -f api                # API logs (Docker mode)
cd apps/api && npx prisma migrate status  # which migrations are applied
cd apps/api && npx prisma studio          # browse data at http://localhost:5555
docker exec -it diagramhq-postgres-1 psql -U diagramhq -d diagramhq   # raw SQL
```
