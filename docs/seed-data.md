# Seed data

```bash
pnpm db:seed        # = pnpm --filter @diagramhq/api prisma:seed
```

Source: [`apps/api/prisma/seed.ts`](../apps/api/prisma/seed.ts). Re-running is safe: it deletes only the `acme` and `globex` orgs (everything under them cascades) and upserts the technology catalogue. Your own data is untouched.

All ids are **fixed**, so you can paste them straight into API calls.

## Users & memberships

| User | Password | Acme Corporation (`org_acme`) | Globex Industries (`org_globex`) |
|---|---|---|---|
| `admin@diagramhq.com` | `adminpassword` | owner | — |
| `lead@diagramhq.com` | `leadpassword` | admin | — |
| `architect@diagramhq.com` | `strongpassword` | editor | owner |
| `developer@diagramhq.com` | `password123` | viewer | — |

Globex exists to test **tenant isolation**: only the architect can see it.

## Structure

```
Acme Corporation (org_acme, slug: acme)
├── Core Engineering (ws_core)
│   └── E-commerce Platform (arch_ecommerce)   ← the main demo model
└── Payments (ws_payments)
    └── Payments Ledger (arch_ledger)

Globex Industries (org_globex, slug: globex)
└── Platform (ws_globex_platform)
    └── Globex IoT Platform (arch_globex)
```

Each architecture has one `main` version (`ver_<name>_main`) set as its default.

## E-commerce Platform (`arch_ecommerce`)

20 objects · 18 connections · 9 views · 3 tags · 3 ADRs. Metadata is filled in so **every view type shows something**.

### Objects

| Id | Kind | Name | Parent | Notable metadata |
|---|---|---|---|---|
| `act_customer` | actor | Customer | — | role `end-user` |
| `act_support` | actor | Support Agent | — | department `customer-success` |
| `sys_store` | system | Online Store | — | team `platform`, trustZone `internal`, tag `critical` |
| `sys_stripe` | system | Stripe | — | **external**, compliance `PCI-DSS` |
| `sys_email` | system | SendGrid | — | **external** |
| `grp_checkout` | group | Checkout Domain | `sys_store` | groupKind `domain`, team `payments` |
| `app_web` | application | Web Storefront | `sys_store` | Next.js, trustZone `dmz`, **publicEndpoint** |
| `app_mobile` | application | Mobile App | `sys_store` | React Native, lifecycle **`future`** |
| `app_gateway` | application | API Gateway | `sys_store` | NestJS, public, requiresAuth, **hasSecrets**, TLS 1.3 |
| `app_catalog` | application | Catalog Service | `sys_store` | NestJS + Elasticsearch, team `catalog` |
| `app_orders` | application | Orders Service | `grp_checkout` | team `payments`, data `confidential` |
| `app_payments` | application | Payments Service | `grp_checkout` | Go, trustZone `restricted`, `PCI-DSS`/`SOC2`, data `restricted` |
| `app_legacy_search` | application | Legacy Search | `sys_store` | Elasticsearch, lifecycle **`deprecated`** |
| `cmp_orders_ctrl` | component | OrdersController | `app_orders` | |
| `cmp_orders_svc` | component | OrderService | `app_orders` | |
| `cmp_orders_repo` | component | OrderRepository | `app_orders` | |
| `sto_orders_db` | store (database) | Orders DB | `sys_store` | PostgreSQL 16, data `confidential`, AES-256 |
| `sto_catalog_db` | store (database) | Catalog DB | `sys_store` | PostgreSQL, data `public` |
| `sto_cache` | store (database) | Session Cache | `sys_store` | Redis, key-value |
| `que_order_events` | store (**queue**) | Order Events | `sys_store` | Kafka topic, `order.placed/paid/shipped` |

### Connections

| Id | From → To | Kind | Label |
|---|---|---|---|
| `con_cust_web` | Customer → Web Storefront | sync | Browses & buys |
| `con_cust_mobile` | Customer → Mobile App | sync | Uses |
| `con_support_orders` | Support Agent → Orders Service | sync | Issues refunds |
| `con_web_gw` | Web Storefront → API Gateway | sync | REST / JSON |
| `con_mobile_gw` | Mobile App → API Gateway | sync | REST / JSON |
| `con_gw_catalog` | API Gateway → Catalog Service | sync | Products API |
| `con_gw_orders` | API Gateway → Orders Service | sync | Orders API |
| `con_orders_payments` | Orders → Payments | sync (gRPC) | Charge — data `restricted` |
| `con_payments_stripe` | Payments → Stripe | sync | Stripe API — data `restricted` |
| `con_orders_db` | Orders → Orders DB | data | Reads/writes |
| `con_catalog_db` | Catalog → Catalog DB | data | Reads/writes |
| `con_gw_cache` | API Gateway → Session Cache | data | Sessions |
| `con_orders_events` | Orders → Order Events | async | Publishes order.* |
| `con_events_email` | Order Events → SendGrid | async | Order emails |
| `con_catalog_legacy` | Catalog → Legacy Search | dependency | Search fallback |
| `con_ctrl_svc` | OrdersController → OrderService | sync | Calls |
| `con_svc_repo` | OrderService → OrderRepository | sync | Persists via |
| `con_repo_db` | OrderRepository → Orders DB | data | SQL |

### Views

| Id | Name | Kind | Starred | Contents |
|---|---|---|:-:|---|
| `vw_ecom_context` | System Context | context (L1) | ⭐ | actors + systems |
| `vw_ecom_container` | Containers | container (L2) | ⭐ | apps, stores, queue, externals |
| `vw_ecom_component` | Orders Service — Components | component (L3) | | 3 components + Orders DB |
| `vw_ecom_security` | Security & Trust Zones | security | | trust zones, public endpoints, secrets, compliance |
| `vw_ecom_data` | Data Classification | data | | stores + data flows |
| `vw_ecom_ownership` | Team Ownership | ownership | | apps coloured by team |
| `vw_ecom_tech` | Technology Radar | technology | | incl. deprecated / `hold` tech |
| `vw_ecom_persona` | Executive Overview | persona | | high-level systems only |
| `vw_ecom_payments_team` | Payments Team (dynamic) | custom | | **no pinned objects**; filter `{ "team": "payments" }` resolves live |

### Tags & decisions

- Tags: `critical`, `pci`, `public`.
- ADR-1 *Use PostgreSQL for transactional data* (accepted) → Orders DB, Catalog DB
- ADR-2 *Publish order lifecycle events to Kafka* (accepted) → Orders Service, Order Events
- ADR-3 *Retire Legacy Search* (proposed) → Legacy Search, Catalog Service

## Technology catalogue (global)

| Name | Category | Lifecycle | Security |
|---|---|---|---|
| Next.js | frontend | adopt | ok |
| React Native | mobile | trial | ok |
| NestJS | backend | adopt | ok |
| Go | backend | adopt | ok |
| PostgreSQL | database | adopt | ok |
| Redis | cache | adopt | ok |
| Kafka | messaging | adopt | ok |
| Elasticsearch | search | **hold** | **vulnerable** |

## Smaller models

- **Payments Ledger** (`arch_ledger`) — Ledger system, Ledger API, Reconciliation Job (`future`), Ledger DB; 1 container view.
- **Globex IoT Platform** (`arch_globex`) — 2 objects; used only for isolation checks.

## Adding your own seed data

Edit `seed.ts` and call `seedArchitecture({...})` with objects, connections, views and decisions — it handles versions, tags, technologies and view positions. To add a user to an org, add a `member` with `userId: userIdFor('<email>')`.
