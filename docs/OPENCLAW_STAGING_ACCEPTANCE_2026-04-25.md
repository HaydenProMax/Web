# OpenClaw Staging Acceptance 2026-04-25

This note records the staging deployment and integration verification result
for the OpenClaw check-in API.

## Scope

This acceptance covers:

- independent staging deploy directory
- independent staging database
- public access through staging domain
- API key authentication
- check-in read APIs
- check-in write APIs
- audit visibility
- partial failure semantics

## Environment

- date: `2026-04-25`
- branch: `codex/checkin-openclaw-staging`
- staging repo: `/opt/hayden-web-staging/current`
- staging env: `/opt/hayden-web-staging/shared/.env.staging`
- staging service: `hayden-web-staging`
- staging port: `3010`
- staging domain: `https://staging-console.super-hayden.top`

## Verified Items

### Service and public access

Confirmed:

- `hayden-web-staging` starts successfully under `systemd`
- the app serves traffic on port `3010`
- Nginx reverse proxy is working
- public HTTPS access is working on `staging-console.super-hayden.top`

### Read APIs

Verified through the public staging domain:

- `GET /api/check-in/today`
- `GET /api/check-in/habits`
- `GET /api/check-in/audit`

Confirmed:

- API key auth works
- response shape is correct
- `today` returns `summary`, `habits`, `done`, `pending`, `unfinished`, and `counts`

### Write APIs

Verified with real writes:

- `POST /api/check-in/habits`
- `POST /api/check-in/today/update`

Created test habit:

- `habitId`: `cmoe6rkg40001pynnia29ecff`
- `title`: `Workout`

Verified a successful public write:

- `status`: `DONE`
- `note`: `cross-server staging verification`

Success request id:

- `74273ca9-d17b-4fd4-9de3-008a6d51b09b`

### Error and partial success semantics

Verified with invalid input:

- `habitId`: `bad-habit-id`
- `status`: `SKIPPED`
- `reasonTag`: `BUSY`

Observed response:

- HTTP `207 Multi-Status`
- `updatedCount = 0`
- `failedCount = 1`
- item result includes `applied: false`
- item result includes `error: "Check-in habit not found"`

Failure request id:

- `b8c98b8b-244f-41a1-a825-667e1b4ac851`

This confirms:

- partial failure response semantics are working
- agent-friendly structured error payloads are present
- request-level tracing is available

### Audit trail

Confirmed that `GET /api/check-in/audit` returns real logs.

Observed audit actions:

- `CREATE_HABIT`
- `UPDATE_TODAY`

Confirmed fields include:

- `action`
- `requestId`
- `payload`
- `result`
- `createdAt`

## Conclusion

As of `2026-04-25`, the OpenClaw check-in API on staging has passed:

- isolated environment deployment
- public domain access
- cross-server read verification
- cross-server write verification
- error path verification
- audit trail verification

Conclusion:

`The server-side foundation required for OpenClaw integration is ready on staging.`

## Next Items

Still recommended for the next phase:

- real OpenClaw conversational integration
- stable natural language mapping to `DONE` and `SKIPPED`
- automatic `reasonTag` mapping for skip cases
- broader public regression checklist
- optional verification for:
  - `POST /api/check-in/entries/update`
  - `POST /api/check-in/entries/reset`
  - `PATCH /api/check-in/habits/:habitId`
  - `POST /api/check-in/habits/:habitId/archive`

## Related Docs

- [OPENCLAW_CHECKIN_API.md](/D:/HaydenWeb/docs/OPENCLAW_CHECKIN_API.md)
- [OPENCLAW_CHECKIN_TESTING.md](/D:/HaydenWeb/docs/OPENCLAW_CHECKIN_TESTING.md)
- [STAGING_DEPLOY_SETUP.md](/D:/HaydenWeb/docs/STAGING_DEPLOY_SETUP.md)
