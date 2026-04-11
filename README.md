# Komorebi Personal Workstation

Single-user modular workstation for planning, knowledge capture, writing, archive replay, and desktop-style command entry.

## Version Status

The current sealed baseline is `V6.1`.

Current live scope includes:

- private single-user sign-in
- planner tasks and planning views
- knowledge notes with domains and tags
- writing drafts, publishing, and archive linkage
- archive records and replay surfaces
- global search and command center
- activity hub and replay-oriented workstation flow
- settings, module toggles, and replay posture controls

What this means in practice:

- `V6.1` is the frozen release baseline
- current work should prefer regression coverage, UX polish, consistency fixes, and deployment readiness
- cross-platform workflows should stay portable across Windows development and Linux deployment

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
- `docs/`: architecture, snapshot, overview, and delivery docs
- `stitch/`: provided design prototype references
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
5. Seed the workspace user:
   - `pnpm db:seed`
6. Start the app:
   - `pnpm dev`

Default seeded workspace account:

- email: `hayden@example.com`
- password: `hayden-workstation`

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

1. `docs/PROJECT_SNAPSHOT_2026-04-03.md`
2. `docs/PROJECT_OVERVIEW.md`
3. `docs/FIRST_DELIVERABLE.md`
4. `docs/V1_BOUNDARY.md`
5. `docs/SETUP_NOTES.md`
6. `docs/LINUX_MIGRATION.md` when preparing Linux or WSL environments

