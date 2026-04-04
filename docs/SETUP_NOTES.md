# Setup Notes

## Intended Local Development Flow

1. Install Node.js LTS and `pnpm`.
2. Start the project database with `docker compose -f docker/compose.dev-db.yml up -d`.
3. Confirm `.env` points to the containerized PostgreSQL instance.
4. Keep `USE_WRITING_MOCKS=false` for the real app flow; only switch it to `true` during isolated early UI work.
5. Run `pnpm install`.
6. Run `pnpm --filter web prisma generate`.
7. Run `pnpm db:migrate`.
8. Run `pnpm db:seed`.
9. Run `pnpm dev`.

## Current State

This repository contains a verified Next.js build, a first Writing vertical slice, Prisma schema under `apps/web/prisma/schema.prisma`, Prisma config, seed data, and a working local media upload pipeline.

## Local Database

The recommended local database is a dedicated Docker container:

- compose file: `docker/compose.dev-db.yml`
- database: `hayden_web`
- user: `hayden`
- port: `54329`

## Local Media

Phase 1 local media handling now supports:

- image file upload through `/api/media/uploads`
- embed record creation through `/api/media/uploads`
- local file serving through `/api/media/files/[...segments]`
- filesystem storage root: `storage/media`

## Seed Defaults

- default user id: `seed-user-id`
- default user email: `hayden@example.com`
- module registry entries: Dashboard, Planner, Knowledge, Writing, Archive, Modules, Settings

## Stable Regression Instance

For page-level regression on Windows, use the dedicated regression instance scripts instead of ad-hoc detached shell commands:

- `pnpm regression:web:start`
- `pnpm regression:web:status`
- `pnpm regression:web:stop`

Default port:

- `3090`

Direct script usage with a custom port:

- `powershell -ExecutionPolicy Bypass -File scripts/start-regression-web.ps1 -Port 3092`
- `powershell -ExecutionPolicy Bypass -File scripts/status-regression-web.ps1 -Port 3092`
- `powershell -ExecutionPolicy Bypass -File scripts/stop-regression-web.ps1 -Port 3092`

Runtime artifacts:

- pid file: `tmp/regression-web-<port>.pid`
- stdout log: `tmp/regression-web-<port>.out.log`
- stderr log: `tmp/regression-web-<port>.err.log`

This flow avoids the unstable detached-process behavior we saw when repeatedly spawning temporary `next start` instances through one-off PowerShell and `cmd` chains.