# Komorebi Personal Workstation

Single-user modular workstation for planning, knowledge capture, writing, archive replay, and desktop-style command entry.

## Version Status

V1 is now sealed for the single-user desktop web experience.

The current codebase is at the end of the first deliverable phase for the desktop web experience.

What is in scope for this version:

- private single-user sign-in
- planner tasks and planning views
- knowledge notes with domains and tags
- writing drafts, publishing, and archive linkage
- archive records and replay surfaces
- global search and command center
- activity hub and replay-oriented workstation flow
- settings, module toggles, and replay posture controls

What this means in practice:

- V1 should be treated as the baseline release line
- further changes should default to Phase 2 unless they are needed to keep V1 stable
- V1 work should now focus on regression, defect fixes, and release clarity rather than feature expansion

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
   - `corepack pnpm install`
3. Generate Prisma client:
   - `corepack pnpm db:generate`
4. Apply migrations:
   - `corepack pnpm db:migrate`
5. Seed the workspace user:
   - `corepack pnpm db:seed`
6. Start the app:
   - `corepack pnpm dev`

Default seeded workspace account:

- email: `hayden@example.com`
- password: `hayden-workstation`

## Stable Regression Flow

Use the dedicated regression-instance scripts for page-level regression on Windows:

- `corepack pnpm regression:web:start`
- `corepack pnpm regression:web:status`
- `corepack pnpm regression:web:stop`

Default regression port:

- `3090`

## Primary Documents

Read these in this order when re-entering the project:

1. `docs/PROJECT_SNAPSHOT_2026-04-03.md`
2. `docs/PROJECT_OVERVIEW.md`
3. `docs/FIRST_DELIVERABLE.md`
4. `docs/V1_BOUNDARY.md`
5. `docs/SETUP_NOTES.md`
