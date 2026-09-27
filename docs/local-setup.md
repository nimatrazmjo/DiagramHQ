# Local setup

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 22 (min 20) — `nvm use` reads `.nvmrc` | `node -v` |
| pnpm | 9.12.x — `corepack enable` | `pnpm -v` |
| Docker | any recent Docker Desktop / Engine | `docker compose version` |
| curl, jq (optional) | for API testing | `jq --version` |

## 1. Install and configure

```bash
pnpm install
cp .env.example .env
```

`.env` defaults work out of the box. The two values you may need to change:

- `POSTGRES_PORT` — host port for Postgres (default `5432`). If something else already uses 5432, set e.g. `5433`.
- `DATABASE_URL` — **must use the same port** as `POSTGRES_PORT`, e.g. `postgresql://diagramhq:diagramhq@localhost:5433/diagramhq`.

## 2. Start infrastructure

```bash
docker compose up -d postgres redis
docker compose ps          # both should be "healthy"
```

## 3. Prepare the database

```bash
pnpm prisma:generate       # generate the Prisma client
pnpm db:migrate            # apply all migrations (prisma migrate deploy)
pnpm db:seed               # load demo data — see seed-data.md
```

The seed is **idempotent**: it deletes and recreates only the demo orgs (`acme`, `globex`), so re-running it resets the demo data without touching anything else you created.

## 4. Run the apps

### Option A — on the host (hot reload, recommended for development)

```bash
pnpm dev
```

| Service | URL |
|---|---|
| Web | <http://localhost:3000> |
| API | <http://localhost:4000> |
| Health | <http://localhost:4000/health> |

### Option B — in Docker

```bash
docker compose up -d --build        # postgres, redis, api, web
```

Same URLs as above. The containers talk to the same Postgres, so run migrations and the seed **from the host** (step 3) — the production API image does not ship the Prisma CLI or the seed script.

Stop everything:

```bash
docker compose down                 # keep data
docker compose down -v              # also wipe the Postgres volume
```

## 5. Confirm it works

```bash
curl -s localhost:4000/health
# {"status":"ok","service":"diagramhq-api",...,"checks":{"database":"up"}}

./scripts/smoke-test.sh
```

Then log in at <http://localhost:3000/login> — see [authentication.md](authentication.md).

## Resetting

| Goal | Command |
|---|---|
| Reset demo data only | `pnpm db:seed` |
| Wipe the whole database | `docker compose down -v && docker compose up -d postgres redis && pnpm db:migrate && pnpm db:seed` |
| Create a migration after editing `schema.prisma` | `cd apps/api && npx prisma migrate dev --name <change>` |
| Browse the DB | `cd apps/api && npx prisma studio` (opens <http://localhost:5555>) |
