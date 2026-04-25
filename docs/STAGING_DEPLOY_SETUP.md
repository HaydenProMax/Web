# Staging Deploy Runbook

This runbook defines the long-lived staging environment for Hayden Web.

Use it before shipping meaningful feature work to production.

## Goal

The staging environment should:

- live in its own repo directory
- use its own database
- run as its own `systemd` service
- stay available for repeated pre-release testing
- allow OpenClaw and API validation without touching production data

## Canonical Layout

Production:

- repo: `/opt/hayden-web/current`
- env: `/opt/hayden-web/shared/.env`
- service: `hayden-web`
- port: `3000`
- domain: `console.super-hayden.top`

Staging:

- repo: `/opt/hayden-web-staging/current`
- env: `/opt/hayden-web-staging/shared/.env.staging`
- service: `hayden-web-staging`
- port: `3010`
- domain: `staging-console.super-hayden.top`

## Source Files In This Repo

- deploy script: [`scripts/deploy-staging.sh`](D:/HaydenWeb/scripts/deploy-staging.sh)
- `systemd` template: [`docs/hayden-web-staging.service.example`](D:/HaydenWeb/docs/hayden-web-staging.service.example)
- OpenClaw API reference: [`docs/OPENCLAW_CHECKIN_API.md`](D:/HaydenWeb/docs/OPENCLAW_CHECKIN_API.md)

## One-Time Server Setup

### 1. Prepare directories

```bash
mkdir -p /opt/hayden-web-staging
mkdir -p /opt/hayden-web-staging/shared
cd /opt/hayden-web-staging
git clone git@github.com:HaydenProMax/Web.git current
```

### 2. Create staging environment file

Path:

```bash
/opt/hayden-web-staging/shared/.env.staging
```

Recommended baseline:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/hayden_web_staging"
AUTH_SECRET="replace-me"
AUTH_TRUST_HOST="true"
AUTH_DEMO_PASSWORD="replace-me"
DEFAULT_USER_ID="seed-user-id"
DEFAULT_USER_EMAIL="hayden@example.com"
OPENCLAW_API_KEY="replace-with-staging-key"
```

Rules:

- use a staging-only database
- use a staging-only API key
- do not reuse production secrets unless you intentionally want the same auth posture

### 3. Install the staging `systemd` service

Copy the template from [`docs/hayden-web-staging.service.example`](D:/HaydenWeb/docs/hayden-web-staging.service.example) to:

```bash
/etc/systemd/system/hayden-web-staging.service
```

Then run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable hayden-web-staging
```

### 4. Add reverse proxy entry

Example Nginx host:

```nginx
server {
    server_name staging-console.super-hayden.top;

    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Reload Nginx after adding the site.

## Standard Update Flow

This is the default pre-release workflow for new feature work.

### Step 1. Push the test branch

From local development:

```bash
git push -u origin codex/checkin-openclaw-staging
```

Replace the branch name as needed for future work.

### Step 2. Deploy that branch to staging

On the server:

```bash
cd /opt/hayden-web-staging/current
./scripts/deploy-staging.sh codex/checkin-openclaw-staging
```

What the script currently does:

- fetches latest code
- checks out the target ref
- pulls the branch
- installs dependencies
- generates Prisma client
- runs `prisma db push`
- runs `pnpm db:seed`
- builds the app
- restarts `hayden-web-staging`
- runs a health check against `/sign-in`

## Validation Checklist

After each staging deployment, verify:

### App health

```bash
curl -I http://127.0.0.1:3010/sign-in
systemctl status hayden-web-staging --no-pager
```

### Check-in API coverage

```bash
curl -i "https://staging-console.super-hayden.top/api/check-in/today" \
  -H "x-api-key: STAGING_OPENCLAW_API_KEY"
```

```bash
curl -i "https://staging-console.super-hayden.top/api/check-in/habits" \
  -H "x-api-key: STAGING_OPENCLAW_API_KEY"
```

```bash
curl -i -X POST "https://staging-console.super-hayden.top/api/check-in/today/update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: STAGING_OPENCLAW_API_KEY" \
  -d '{
    "updates": [
      {
        "habitId": "HABIT_ID",
        "status": "DONE"
      }
    ]
  }'
```

```bash
curl -i -X POST "https://staging-console.super-hayden.top/api/check-in/entries/update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: STAGING_OPENCLAW_API_KEY" \
  -d '{
    "date": "2026-04-24",
    "updates": [
      {
        "habitId": "HABIT_ID",
        "status": "SKIPPED",
        "reasonTag": "FORGOT",
        "note": "staging verification"
      }
    ]
  }'
```

```bash
curl -i -X POST "https://staging-console.super-hayden.top/api/check-in/entries/reset" \
  -H "Content-Type: application/json" \
  -H "x-api-key: STAGING_OPENCLAW_API_KEY" \
  -d '{
    "date": "2026-04-24",
    "resets": [
      {
        "habitId": "HABIT_ID"
      }
    ]
  }'
```

```bash
curl -i "https://staging-console.super-hayden.top/api/check-in/audit?limit=10" \
  -H "x-api-key: STAGING_OPENCLAW_API_KEY"
```

### UI checks

Verify:

- `/check-in` loads
- the audit panel renders
- recent audit entries appear after write requests
- the new routes do not return `404`

## Rollback Procedure

If staging deploy fails:

1. Check service logs:

```bash
journalctl -u hayden-web-staging -n 120 --no-pager
```

2. Return the staging repo to the last known-good ref:

```bash
cd /opt/hayden-web-staging/current
git fetch --all --tags
git checkout <known-good-branch-or-tag>
git pull --ff-only origin <known-good-branch-or-tag>
```

3. Re-run the deploy script for that ref:

```bash
./scripts/deploy-staging.sh <known-good-branch-or-tag>
```

## Operational Notes

- This staging environment is intentionally long-lived.
- Production and staging must stay in separate repo directories.
- The current deploy flow uses `prisma db push` to match the existing production posture.
- The current deploy flow also runs `pnpm db:seed`, so staging must stay isolated from production.
- If you later want a stricter release discipline, the next improvement is switching both environments to `prisma migrate deploy`.

## Release Habit

Recommended team habit for future work:

1. build locally
2. push feature branch
3. deploy branch to staging
4. validate API and UI
5. merge into `main`
6. deploy production

This file should remain the canonical staging runbook.
