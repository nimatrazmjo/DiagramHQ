# syntax=docker/dockerfile:1

# ---- build: install workspace deps, compile, produce a portable bundle ----
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @diagramhq/api build
# pnpm deploy resolves workspace deps into a self-contained node_modules
RUN pnpm --filter @diagramhq/api deploy --prod /out

# ---- runtime: minimal, non-root ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/dist ./dist
USER app
EXPOSE 4000
CMD ["node", "dist/main.js"]
