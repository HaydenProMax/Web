# Linux Production Checklist

## Goal

Use this checklist when moving from local or WSL validation to a real Linux server.

## Recommended Baseline

- Ubuntu 24.04 LTS
- Node.js 22 LTS
- pnpm 10+
- Docker Engine with Compose plugin
- reverse proxy such as Nginx or Caddy
- PostgreSQL 16

## Pre-Deploy Checks

Run these from the repository root before deployment:

1. `pnpm install`
2. `pnpm db:generate`
3. `pnpm --filter web typecheck`
4. `pnpm --filter web build`
5. `pnpm regression:web:start -- --port 3092`
6. `pnpm regression:web:stop -- --port 3092`


## Environment Requirements

Required env should include at least:

- `DATABASE_URL`
- Auth.js secrets and host settings
- any production media/storage configuration if not using local development storage

## Database Checklist

1. Confirm PostgreSQL is reachable from the app host.
2. Run `pnpm db:migrate` against the target database.
3. Run `pnpm db:seed` only if this environment should receive seeded development data.
4. Confirm Prisma client has been generated on Linux after deployment.

## App Startup Checklist

1. Install dependencies with `pnpm install`.
2. Generate Prisma client with `pnpm db:generate`.
3. Build with `pnpm --filter web build`.
4. Start with `pnpm --filter web start` behind a process manager.

Recommended process managers:

- systemd
- PM2
- container entrypoint with restart policy

## Reverse Proxy Checklist

1. Proxy incoming traffic to the Next.js app port.
2. Forward host and protocol headers correctly.
3. Keep TLS termination at the proxy layer.
4. Confirm Auth.js host settings align with the public domain.

## Persistence Checklist

Confirm these paths/volumes are handled intentionally:

- database storage
- any local uploaded media under `storage/`
- logs if you keep app-level logs on disk

## Smoke Test

After deployment, verify:

1. `/sign-in` loads
2. sign-in succeeds with the intended account
3. `/writing` loads authenticated content
4. `/writing/new` loads successfully
5. a draft detail page loads without Prisma runtime errors
6. media routes and uploaded image rendering still work

## Rollback Posture

Before first production cutover, have these ready:

- previous known-good build artifact or branch
- database backup or snapshot
- clear migration rollback plan if schema changes are involved
