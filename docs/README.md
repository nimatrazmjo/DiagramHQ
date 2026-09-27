# DiagramHQ Docs

Hands-on guides for running and testing DiagramHQ locally. For the project overview, see the [root README](../README.md).

| Guide | What's inside |
|---|---|
| [Local setup](local-setup.md) | Start Postgres/Redis, run migrations, start API + web (host or Docker) |
| [Authentication](authentication.md) | How login and "registration" work, demo accounts, getting an API token |
| [Seed data](seed-data.md) | What `prisma:seed` creates: users, roles, orgs, architectures, views, ADRs |
| [Manual testing](manual-testing.md) | Step-by-step test scenarios for the web UI and the REST API |
| [Automated tests](automated-tests.md) | Unit, e2e and integration suites; `pnpm verify`; smoke test script |
| [Troubleshooting](troubleshooting.md) | Common errors and fixes |

## TL;DR — zero to logged in

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres redis
pnpm prisma:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open <http://localhost:3000/login> and sign in as **`admin@diagramhq.com` / `adminpassword`**.

Then check the API end to end:

```bash
./scripts/smoke-test.sh
```
