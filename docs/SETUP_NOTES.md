# Setup Notes

## Intended Local Development Flow

1. Install Node.js 22 LTS and pnpm 10.
2. Start the project database with `docker compose -f docker/compose.dev-db.yml up -d`.
3. Confirm `.env` points to the containerized PostgreSQL instance.
4. Keep `USE_WRITING_MOCKS=false` for the real app flow; only switch it to `true` during isolated early UI work.
5. Run `pnpm install`.
6. Run `pnpm --filter web prisma generate`.
7. Run `pnpm db:migrate`.
8. Run `pnpm db:seed`.
9. Run `pnpm dev`.

## Current State

This repository contains a verified Next.js build, a working Writing vertical slice, Prisma schema under `apps/web/prisma/schema.prisma`, Prisma config, seed data, and a working local media upload pipeline.

## Local Database

The recommended local database is a dedicated Docker container:

- compose file: `docker/compose.dev-db.yml`
- database: `hayden_web`
- user: `hayden`
- port: `54329`

## Local Media

Current local media handling supports:

- image file upload through `/api/media/uploads`
- embed record creation through `/api/media/uploads`
- local file serving through `/api/media/files/[...segments]`
- filesystem storage root: `storage/media`

## Seed Defaults

- default user id: `seed-user-id`
- default user email: `hayden@example.com`
- module registry entries: Dashboard, Planner, Knowledge, Writing, Archive, Modules, Settings

## Stable Regression Instance

Use the dedicated regression instance scripts instead of ad-hoc detached shell commands:

- `pnpm regression:web:start`
- `pnpm regression:web:status`
- `pnpm regression:web:stop`


Default port:

- `3090`

Direct custom-port usage:

- `pnpm regression:web:start -- --port 3092`
- `pnpm regression:web:status -- --port 3092`
- `pnpm regression:web:stop -- --port 3092`


Runtime artifacts:

- pid file: `tmp/regression-web-<port>.pid`

This flow is intended to stay portable across Windows and Linux rather than relying on PowerShell-only process wrappers.
