# Staging Deploy Setup

This file describes a safe staging deployment path based on the current production deploy script.

## Goal

Run a separate staging instance that:

- uses a staging database
- listens on port `3010`
- does not modify production data
- can be used to validate new API routes before production rollout

## Files Added

- deploy script: [`scripts/deploy-staging.sh`](/D:/HaydenWeb/scripts/deploy-staging.sh)
- systemd example: [`docs/hayden-web-staging.service.example`](/D:/HaydenWeb/docs/hayden-web-staging.service.example)

## Recommended Server Paths

- app repo: `/opt/hayden-web/current`
- shared env: `/opt/hayden-web/shared/.env.staging`
- service file: `/etc/systemd/system/hayden-web-staging.service`

## Example `.env.staging`

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/hayden_web_staging"
AUTH_SECRET="replace-me"
AUTH_TRUST_HOST="true"
DEFAULT_USER_ID="seed-user-id"
DEFAULT_USER_EMAIL="hayden@example.com"
AUTH_DEMO_PASSWORD="replace-me"
OPENCLAW_API_KEY="replace-with-staging-key"
```

Use a staging-only API key. Do not reuse the production OpenClaw key.

## Setup Steps

1. Create the staging database.
2. Create `/opt/hayden-web/shared/.env.staging`.
3. Copy [`docs/hayden-web-staging.service.example`](/D:/HaydenWeb/docs/hayden-web-staging.service.example) to `/etc/systemd/system/hayden-web-staging.service`.
4. Run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable hayden-web-staging
```

5. Copy [`scripts/deploy-staging.sh`](/D:/HaydenWeb/scripts/deploy-staging.sh) to the server and make it executable:

```bash
chmod +x scripts/deploy-staging.sh
```

6. Deploy staging:

```bash
./scripts/deploy-staging.sh main
```

## Nginx Example

Proxy a staging subdomain to port `3010`, for example:

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

## Important Notes

- This script currently uses `prisma db push`, matching the existing production deploy flow.
- For staging validation, that is acceptable and keeps the flow consistent with production.
- The script also runs `pnpm db:seed`, so keep staging isolated from production.
- If you later want a stricter release process, we can switch production and staging to `prisma migrate deploy`.

## Recommended Validation After Deploy

Verify these endpoints on staging:

- `GET /api/check-in/today`
- `GET /api/check-in/habits`
- `POST /api/check-in/today/update`
- `POST /api/check-in/entries/update`
- `POST /api/check-in/entries/reset`
- `GET /api/check-in/audit`
