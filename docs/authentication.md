# Authentication

> ⚠️ **Development-only auth.** There is no users table, no password hashing and no sign-up flow yet. Do not expose this build publicly.

## How it works

| Piece | Where | What it does |
|---|---|---|
| Web login | `apps/web/auth.config.ts` (NextAuth v5, Credentials provider) | Validates email + password, stores a JWT session cookie |
| API token | `POST /auth/token` (`apps/api/src/auth`) | Same credential rules, returns a signed JWT (HS256, 7-day expiry) |
| API guard | `AuthGuard` | Every route except `/auth/token` and `/health` needs `Authorization: Bearer <token>` |
| Shared secret | `AUTH_SECRET` in `.env` | Web and API must use the same value |

### Credential rules

1. Email must contain `@`; password must be **at least 6 characters**.
2. Passwords starting with `wrong` are always rejected (used by tests).
3. **Demo accounts** below only accept their listed passwords.
4. **Any other email is accepted with any valid password** — this is how you "register" a new user.

### User identity

There is no users table. A user's id is derived from the email:

```
userId = "usr_" + hex(email.toLowerCase())[0..12]
```

e.g. `admin@diagramhq.com` → `usr_61646d696e40`. Organization membership (`members.user_id`) is keyed on this id. The seed uses the same function (`userIdFor` in `apps/api/prisma/seed.ts`).

> Known limitation: only the first 6 characters of the email feed the id, so `admin@acme.com` and `admin@globex.com` resolve to the **same user**. Pick test emails with distinct first 6 characters.

## Demo accounts (after `pnpm db:seed`)

| Email | Password | Acme Corporation | Globex Industries |
|---|---|---|---|
| `admin@diagramhq.com` | `adminpassword` (or `password123`) | **owner** | — |
| `lead@diagramhq.com` | `leadpassword` (any 6+ chars) | **admin** | — |
| `architect@diagramhq.com` | `strongpassword` (or `securepassword`) | **editor** | **owner** |
| `developer@diagramhq.com` | `password123` | **viewer** | — |

What each role can do:

| Action | owner | admin | editor | viewer |
|---|:-:|:-:|:-:|:-:|
| Read org, members, workspaces, architectures, views | ✅ | ✅ | ✅ | ✅ |
| Create/edit/delete objects, connections, views | ✅ | ✅ | ✅ | ❌ 403 |
| Create/update workspaces | ✅ | ✅ | ✅ | ❌ 403 |
| Delete workspaces | ✅ | ✅ | ❌ 403 | ❌ 403 |
| Update organization | ✅ | ✅ | ❌ 403 | ❌ 403 |
| Change member roles | ✅ | ✅ (editors/viewers only) | ❌ 403 | ❌ 403 |
| Delete organization | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |

An owner's role can never be changed. Resources in an org you don't belong to return **404** (not 403), so their existence isn't leaked.

## Log in to the web app

1. Open <http://localhost:3000/login>.
2. Enter `admin@diagramhq.com` / `adminpassword`.
3. You land on `/dashboard` showing **Acme Corporation** with the *owner* badge and its workspaces (*Core Engineering*, *Payments*).

Log out via the top bar, or clear the `authjs.session-token` cookie.

## "Register" a new user

There is no sign-up page. To act as a brand-new user:

1. Go to `/login` and enter a new email (e.g. `newbie@example.com`) and any password of 6+ characters.
2. You land on an empty dashboard — *"You are not a member of any organization yet"*.
3. Use **Create New Organization**. You become its **owner**, and can then create workspaces.

There is no invite endpoint yet, so a new user cannot be added to an existing org through the UI/API. To put a user into a seeded org, add a member row (e.g. edit `seed.ts` and re-run `pnpm db:seed`, or use Prisma Studio with the derived `userId`).

## Get an API token

```bash
TOKEN=$(curl -s -X POST localhost:4000/auth/token \
  -H 'content-type: application/json' \
  -d '{"email":"admin@diagramhq.com","password":"adminpassword"}' | jq -r .token)

curl -s localhost:4000/auth/me -H "Authorization: Bearer $TOKEN"
# {"user":{"sub":"usr_61646d696e40","email":"admin@diagramhq.com","name":"admin",...}}
```

Without `jq`:

```bash
TOKEN=$(curl -s -X POST localhost:4000/auth/token -H 'content-type: application/json' \
  -d '{"email":"admin@diagramhq.com","password":"adminpassword"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
```

### Negative checks

| Request | Expected |
|---|---|
| Demo email with wrong password | `401 Invalid email or password` |
| Password shorter than 6 chars | `401` |
| No `Authorization` header on a protected route | `401` |
| Tampered / expired token | `401 Invalid or expired authentication token` |
