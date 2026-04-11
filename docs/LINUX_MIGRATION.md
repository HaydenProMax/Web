# Linux Migration Guide

## Goal

This repository keeps its primary development and regression commands portable across Windows and Linux.

The app stack itself is already Linux-friendly:

- Next.js
- TypeScript
- Prisma
- PostgreSQL
- Auth.js
- Docker Compose
- pnpm

The main remaining work during migration is environmental setup, not application logic.

## Recommended Linux Base

Recommended baseline:

- Ubuntu 24.04 LTS or another modern glibc-based distribution
- Node.js 22 LTS
- pnpm 10
- Docker Engine + Docker Compose plugin
- PostgreSQL through Docker for local development

## Required Tool Versions

Repository-level expectations:

- Node.js: `>=22.0.0`
- pnpm: `>=10.0.0`

Note:

- A real WSL validation pass was completed successfully on Ubuntu 24.04 with Node 18.19.1 for compatibility checking.
- That proves Linux runtime viability.
- The recommended and supported baseline for ongoing development and deployment remains Node 22 LTS.

## One-Time Setup

1. Install Node.js 22 LTS.
2. Install pnpm 10.
3. Install Docker Engine and Compose plugin.
4. Clone the repository.
5. Copy or create the root `.env` with a valid `DATABASE_URL`.

## Local Development Flow

From the workspace root:

1. Start the database:
   - `docker compose -f docker/compose.dev-db.yml up -d`
2. Install dependencies:
   - `pnpm install`
3. Generate Prisma client:
   - `pnpm db:generate`
4. Apply migrations:
   - `pnpm db:migrate`
5. Seed the development user:
   - `pnpm db:seed`
6. Start the app:
   - `pnpm dev`

Default seeded account:

- email: `hayden@example.com`
- password: `hayden-workstation`

## Regression Commands

These commands are intended to be cross-platform:

- `pnpm regression:web:start`
- `pnpm regression:web:status`
- `pnpm regression:web:stop`


Custom port examples:

- `pnpm regression:web:start -- --port 3092`
- `pnpm regression:web:status -- --port 3092`
- `pnpm regression:web:stop -- --port 3092`


## Production Build Check

Before moving to a Linux host or container image, verify:

- `pnpm --filter web prisma generate`
- `pnpm --filter web typecheck`
- `pnpm --filter web build`

## File and Path Notes

The codebase is already mostly safe for Linux path behavior:

- server-side path handling uses Node `path` utilities instead of hard-coded separators in the main app runtime
- root env loading in `apps/web/src/server/db.ts` is path-based and not tied to Windows drive letters
- Prisma client generation now includes `debian-openssl-3.0.x` in addition to `native`
- database and media storage contracts are not Windows-only

## Known Migration Notes

1. README and regression entrypoints were previously Windows-biased.
   - This has been updated so the main command surface uses Node scripts instead of PowerShell-only scripts.
2. Legacy `.ps1` files still exist.
   - They are now compatibility wrappers that forward into the new Node scripts.
3. Historical docs still mention old Windows-specific troubleshooting or PowerShell write issues.
   - Those notes are historical and should not be treated as current architecture requirements.
4. If `corepack` is broken inside WSL, prefer the directly installed `pnpm` binary.
   - The current docs and scripts assume `pnpm dev` as the primary path.

## Verified WSL Pass

The following flow was validated inside `Ubuntu-24.04` on WSL2:

1. `pnpm --filter web prisma generate`
2. `pnpm --filter web typecheck`
3. `pnpm --filter web build`
4. `pnpm regression:web:start -- --port 3295`
5. `pnpm regression:web:stop -- --port 3295`


Result:

- Linux-compatible Prisma client generation succeeded
- TypeScript validation succeeded
- Next production build succeeded
- cross-platform regression instance management succeeded
- regression instance lifecycle succeeded

## Migration Verdict

Current status:

- application runtime: verified on Linux via WSL Ubuntu 24.04
- database/dev stack: verified on Linux via WSL Ubuntu 24.04
- primary package scripts: ready for Linux
- regression command surface: verified on Linux via WSL Ubuntu 24.04
- remaining work: production host rollout and operational hardening, not platform rescue
