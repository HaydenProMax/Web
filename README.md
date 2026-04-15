# Hayden Garden

Single-user modular workstation for planning, knowledge capture, writing, publishing, archive replay, and desktop-style command entry.

## Version Status

- Historical sealed baseline: `V6.1.0`.
- Current stable release line: `V9.0.0`.
- Current focus after release: production hardening and the next round of UX polish.

Current live scope includes:

- private single-user sign-in
- planner todo workspace with Today / Upcoming / Done
- task quick add, edit, done, reopen, archive, and delete flows
- lightweight focus filters: All / High / Doing
- knowledge notes with document-style editing, Markdown-first authoring, and Mermaid preview
- writing drafts, Markdown block support, cover selection, publishing, and article delete flow
- archive records and replay surfaces
- global search and command center
- settings, profile/avatar editing, and Linux production deployment support

What this means in practice:

- `V6.1.0` remains the historical sealed baseline
- `V9.0.0` is the latest tagged stable line in git
- current production work can focus on regression coverage, stability, search, backup posture, and cross-module refinement

## Current Product Shape

Hayden Garden is now usable as a real personal workstation for:

- planning daily work and small todo flows
- storing knowledge notes and domain context
- turning notes into drafts and published writing
- revisiting finished work through archive and search

It is not positioned as:

- a multi-user collaboration product
- a mobile-first app
- a full project-management suite

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Auth.js
- pnpm workspace

## Workspace Layout

- `apps/web`: main Next.js application shell
- `modules/*`: domain-oriented module folders
- `packages/*`: shared config and shared types
- `prisma/`: root seed script and migration history
- `docs/`: architecture, snapshot, overview, and deployment docs
- `storage/`: local media storage for development
- `scripts/`: local regression-instance scripts

## Start Locally

1. Start the local database:
   - `docker compose -f docker/compose.dev-db.yml up -d`
2. Install dependencies:
   - `pnpm install`
3. Generate Prisma client:
   - `pnpm db:generate`
4. Apply migrations:
   - `pnpm db:migrate`
5. Seed the workspace user if needed:
   - `pnpm db:seed`
6. Start the app:
   - `pnpm dev`

WSL recommendation:

- use Node.js `22.x`
- run the workspace from `/mnt/d/HaydenWeb`
- if Prisma schema changed, run `pnpm db:generate` before `pnpm dev`

Default seeded workspace account:

- email: `hayden@example.com`
- password: read from `AUTH_DEMO_PASSWORD` in the root `.env`

## Linux Production Baseline

Recommended deployment baseline:

- Ubuntu 24.04 LTS
- Node.js 22 LTS
- pnpm 10+
- PostgreSQL 16
- Nginx or another reverse proxy
- systemd or another process manager

Read before production deployment:

1. `docs/LINUX_PRODUCTION_CHECKLIST.md`
2. `docs/LINUX_MIGRATION.md`
3. `docs/SETUP_NOTES.md`

## Stable Regression Flow

Use the dedicated regression-instance scripts for page-level regression on both Windows and Linux:

- `pnpm regression:web:start`
- `pnpm regression:web:status`
- `pnpm regression:web:stop`

Default regression port:

- `3090`

Custom port examples:

- `pnpm regression:web:start -- --port 3092`
- `pnpm regression:web:status -- --port 3092`
- `pnpm regression:web:stop -- --port 3092`

## Primary Documents

Read these in this order when re-entering the project:

1. `docs/CURRENT_RELEASE_STATUS.md`
2. `docs/PROJECT_SNAPSHOT_2026-04-03.md`
3. `docs/PROJECT_OVERVIEW.md`
4. `docs/FIRST_DELIVERABLE.md`
5. `docs/LINUX_PRODUCTION_CHECKLIST.md`
6. `docs/LINUX_MIGRATION.md`
