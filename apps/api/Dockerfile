# syntax=docker/dockerfile:1

# ---- build: install (cached by manifests), compile, produce a portable bundle ----
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
# Dependency layer first so source edits don't bust the install cache.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/domain/package.json packages/domain/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @diagramhq/api...
# Source + build
COPY tsconfig.base.json ./
COPY apps/api apps/api
RUN pnpm --filter @diagramhq/api build
# 'files: ["dist"]' guarantees deploy ships the compiled output
RUN pnpm --filter @diagramhq/api deploy --prod /out

# ---- runtime: minimal, non-root ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /out/package.json ./
COPY --from=build --chown=app:app /out/node_modules ./node_modules
COPY --from=build --chown=app:app /out/dist ./dist
USER app
EXPOSE 4000
CMD ["node", "dist/main.js"]
