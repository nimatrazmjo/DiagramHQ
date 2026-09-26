.PHONY: install dev build test lint typecheck fmt up down

install: ; pnpm install
dev: ; pnpm dev
build: ; pnpm build
test: ; pnpm test
lint: ; pnpm lint
typecheck: ; pnpm typecheck
fmt: ; pnpm format
up: ; docker compose up --build
down: ; docker compose down
