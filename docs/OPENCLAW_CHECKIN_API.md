# OpenClaw Check-in API

This document describes the check-in API endpoints currently exposed for OpenClaw integration.

## Overview

Current API scope:

- Read today's check-in status
- Read audit history for API-driven check-in changes
- Batch update today's check-in results
- Batch update check-in results for a specified date
- Reset check-in results for a specified date
- List active habits
- Create habits
- Update habit fields
- Archive habits

Current design assumptions:

- API key requests are bound to one default user
- The client does not pass a `userId` in the request
- The server resolves the target user from `DEFAULT_USER_ID`

## Authentication

The API supports two authentication modes:

- Session auth for signed-in web users
- API key auth for OpenClaw or other external clients

Accepted API key headers:

```http
x-api-key: YOUR_OPENCLAW_API_KEY
```

or

```http
Authorization: ApiKey YOUR_OPENCLAW_API_KEY
```

Required server environment variables:

```env
OPENCLAW_API_KEY="your-api-key"
DEFAULT_USER_ID="your-real-user-id"
```

Notes:

- `DEFAULT_USER_ID` must exist in the database
- API key requests will act on that user
- After changing `.env`, restart the app process

## Response Envelope

All endpoints use this top-level envelope:

Successful response:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "authMethod": "apiKey",
    "requestId": "REQUEST_UUID"
  }
}
```

Error response:

```json
{
  "ok": false,
  "error": "Unauthorized"
}
```

`meta.authMethod` is either:

- `session`
- `apiKey`

Some mutation endpoints also include:

- `meta.requestId`: unique audit correlation id for that write request

## GET /api/check-in/today

Returns today's check-in snapshot for the authenticated user.

### Example

```bash
curl -i "https://your-domain.com/api/check-in/today" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY"
```

### Success Response

```json
{
  "ok": true,
  "data": {
    "date": "2026-04-25",
    "timeZone": "Asia/Shanghai",
    "summary": "2/4 check-ins done today, 2 unfinished.",
    "habits": [],
    "scheduled": [],
    "done": [],
    "pending": [],
    "skipped": [],
    "unfinished": [],
    "counts": {
      "scheduledCount": 4,
      "doneCount": 2,
      "pendingCount": 1,
      "skippedCount": 1,
      "unfinishedCount": 2
    }
  },
  "meta": {
    "authMethod": "apiKey",
    "requestId": "REQUEST_UUID"
  }
}
```

### Important Fields

- `data.summary`: human-readable summary for conversational use
- `data.pending`: habits not yet completed today
- `data.skipped`: habits marked skipped today
- `data.unfinished`: combined list of pending and skipped habits
- `data.counts`: numeric summary for agent logic

### Status Codes

- `200`: success
- `401`: missing or invalid authentication
- `500`: server-side failure while loading today's status

## GET /api/check-in/audit

Returns recent audit logs for check-in API mutations.

### Query Parameters

- `limit`: optional, default `20`, max `100`
- `habitId`: optional, filter by one habit id

### Example

```bash
curl -i "https://your-domain.com/api/check-in/audit?limit=20" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY"
```

### Success Response

```json
{
  "ok": true,
  "data": {
    "logs": [
      {
        "id": "audit-log-id",
        "ownerId": "seed-user-id",
        "habitId": "habit-id",
        "habitTitle": "Workout",
        "action": "UPDATE_TODAY",
        "source": "apiKey",
        "requestId": "c9d71df9-6dd4-4a72-b5a4-a6df57f26d61",
        "targetDate": "2026-04-25",
        "payload": {},
        "result": {},
        "createdAt": "2026-04-25T10:30:00.000Z"
      }
    ],
    "count": 1
  },
  "meta": {
    "authMethod": "apiKey",
    "requestId": "REQUEST_UUID"
  }
}
```

### Action Values

- `CREATE_HABIT`
- `UPDATE_HABIT`
- `ARCHIVE_HABIT`
- `UPDATE_TODAY`
- `UPDATE_DATE`
- `RESET_DATE`

### Status Codes

- `200`: success
- `400`: invalid query input
- `401`: missing or invalid authentication

## GET /api/check-in/habits

Returns all active check-in habits for the authenticated user.

### Example

```bash
curl -i "https://your-domain.com/api/check-in/habits" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY"
```

### Success Response

```json
{
  "ok": true,
  "data": {
    "habits": [
      {
        "id": "habit-id",
        "title": "Workout",
        "description": "",
        "scheduleType": "DAILY",
        "scheduleDays": [],
        "isArchived": false,
        "monthlyDoneCount": 3,
        "yearlyDoneCount": 3,
        "totalDoneCount": 3,
        "currentStreak": 3,
        "longestStreak": 3,
        "todayStatus": "DONE",
        "updatedAt": "2026-04-25T12:00:00.000Z"
      }
    ],
    "count": 1
  },
  "meta": {
    "authMethod": "apiKey",
    "requestId": "REQUEST_UUID"
  }
}
```

### Status Codes

- `200`: success
- `401`: missing or invalid authentication
- `500`: server-side failure while loading habits

## POST /api/check-in/habits

Creates a new check-in habit.

### Request Body

```json
{
  "title": "Workout",
  "description": "30 minutes minimum",
  "scheduleType": "CUSTOM",
  "scheduleDays": [1, 3, 5]
}
```

### Field Rules

- `title`: required, max 80 characters
- `description`: optional, max 240 characters
- `scheduleType`: `DAILY`, `WEEKDAYS`, or `CUSTOM`
- `scheduleDays`: required when `scheduleType` is `CUSTOM`

Weekday mapping:

- `0`: Sunday
- `1`: Monday
- `2`: Tuesday
- `3`: Wednesday
- `4`: Thursday
- `5`: Friday
- `6`: Saturday

### Example

```bash
curl -i -X POST "https://your-domain.com/api/check-in/habits" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY" \
  -d '{
    "title": "Workout",
    "description": "30 minutes minimum",
    "scheduleType": "CUSTOM",
    "scheduleDays": [1, 3, 5]
  }'
```

### Status Codes

- `201`: created
- `400`: invalid input
- `401`: missing or invalid authentication

## PATCH /api/check-in/habits/:habitId

Updates habit fields for an existing active habit.

### Supported Fields

- `title`
- `description`
- `scheduleType`
- `scheduleDays`

Notes:

- `title` is still required in the current implementation
- `description` may be empty
- If `scheduleType` is omitted, the current schedule is preserved
- If `scheduleType` is `CUSTOM`, `scheduleDays` must be provided and non-empty

### Request Body

```json
{
  "title": "Workout",
  "description": "Gym or home session",
  "scheduleType": "WEEKDAYS"
}
```

### Example

```bash
curl -i -X PATCH "https://your-domain.com/api/check-in/habits/habit-id" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY" \
  -d '{
    "title": "Workout",
    "description": "Gym or home session",
    "scheduleType": "WEEKDAYS"
  }'
```

### Status Codes

- `200`: updated
- `400`: invalid input or habit not found
- `401`: missing or invalid authentication

## POST /api/check-in/habits/:habitId/archive

Archives an active habit. Past records remain in the database.

### Example

```bash
curl -i -X POST "https://your-domain.com/api/check-in/habits/habit-id/archive" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY"
```

### Success Response

```json
{
  "ok": true,
  "data": {
    "id": "habit-id",
    "isArchived": true
  },
  "meta": {
    "authMethod": "apiKey",
    "requestId": "REQUEST_UUID"
  }
}
```

### Status Codes

- `200`: archived
- `400`: habit not found or already archived
- `401`: missing or invalid authentication

## POST /api/check-in/today/update

Batch writes today's check-in results for one or more habits.

This endpoint is designed for the OpenClaw conversation loop:

1. OpenClaw reads `GET /api/check-in/today`
2. The user replies in natural language
3. OpenClaw maps the reply into structured updates
4. OpenClaw sends the batch update request

### Request Body

```json
{
  "updates": [
    {
      "habitId": "cmo79o2fg002dpybooxddelrq",
      "status": "DONE"
    },
    {
      "habitId": "cmo79ojhh002hpybom1pb6he9",
      "status": "SKIPPED",
      "reasonTag": "BUSY",
      "note": "Busy with work today"
    }
  ]
}
```

### Field Rules

Each `updates[]` item supports:

- `habitId`: required string
- `status`: required, one of `DONE` or `SKIPPED`
- `reasonTag`: required when `status` is `SKIPPED`
- `note`: optional free-text note, max length 280

Supported `reasonTag` values:

- `SICK`
- `BUSY`
- `OUT`
- `REST`
- `FORGOT`
- `OTHER`

### Example

```bash
curl -i -X POST "https://your-domain.com/api/check-in/today/update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY" \
  -d '{
    "updates": [
      {
        "habitId": "cmo79o2fg002dpybooxddelrq",
        "status": "DONE"
      },
      {
        "habitId": "cmo79ojhh002hpybom1pb6he9",
        "status": "SKIPPED",
        "reasonTag": "BUSY",
        "note": "Busy with work today"
      }
    ]
  }'
```

## POST Response Semantics

This endpoint supports full success and partial success.

### Full Success

HTTP status:

```http
200 OK
```

Response:

```json
{
  "ok": true,
  "data": {
    "ok": true,
    "updatedCount": 2,
    "failedCount": 0,
    "results": [
      {
        "index": 0,
        "habitId": "habit-a",
        "status": "DONE",
        "applied": true
      },
      {
        "index": 1,
        "habitId": "habit-b",
        "status": "SKIPPED",
        "applied": true,
        "reasonTag": "BUSY",
        "note": "Busy with work today"
      }
    ],
    "today": {}
  },
  "meta": {
    "authMethod": "apiKey"
  }
}
```

### Partial Success

HTTP status:

```http
207 Multi-Status
```

Response:

```json
{
  "ok": true,
  "data": {
    "ok": false,
    "updatedCount": 1,
    "failedCount": 1,
    "results": [
      {
        "index": 0,
        "habitId": "valid-habit-id",
        "status": "DONE",
        "applied": true
      },
      {
        "index": 1,
        "habitId": "bad-habit-id",
        "status": "SKIPPED",
        "applied": false,
        "reasonTag": "BUSY",
        "note": "Busy with work today",
        "error": "Check-in habit not found"
      }
    ],
    "today": {}
  },
  "meta": {
    "authMethod": "apiKey"
  }
}
```

### Invalid Request

HTTP status:

```http
400 Bad Request
```

Typical causes:

- Missing `updates`
- `updates` is empty
- More than 50 items
- Request body is not valid JSON

### Result Fields

- `data.ok`: whether all items were applied successfully
- `data.updatedCount`: number of successful updates
- `data.failedCount`: number of failed updates
- `data.results`: per-item execution results
- `data.results[].index`: original item position in the request
- `data.results[].applied`: whether the item was written successfully
- `data.results[].error`: error message for a failed item
- `data.today`: latest today snapshot after processing the batch

## POST /api/check-in/entries/update

Batch writes check-in results for a specified date. This is the backfill endpoint for missed or delayed updates.

### Request Body

```json
{
  "date": "2026-04-24",
  "updates": [
    {
      "habitId": "habit-a",
      "status": "DONE"
    },
    {
      "habitId": "habit-b",
      "status": "SKIPPED",
      "reasonTag": "FORGOT",
      "note": "Updated the next day"
    }
  ]
}
```

### Response Semantics

- `200`: all updates applied
- `207`: partial success
- `400`: invalid request

### Success Response

```json
{
  "ok": true,
  "data": {
    "ok": true,
    "date": "2026-04-24",
    "updatedCount": 2,
    "failedCount": 0,
    "results": [
      {
        "index": 0,
        "habitId": "habit-a",
        "status": "DONE",
        "applied": true
      },
      {
        "index": 1,
        "habitId": "habit-b",
        "status": "SKIPPED",
        "applied": true,
        "reasonTag": "FORGOT",
        "note": "Updated the next day"
      }
    ]
  },
  "meta": {
    "authMethod": "apiKey"
  }
}
```

### Example

```bash
curl -i -X POST "https://your-domain.com/api/check-in/entries/update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY" \
  -d '{
    "date": "2026-04-24",
    "updates": [
      {
        "habitId": "habit-a",
        "status": "DONE"
      },
      {
        "habitId": "habit-b",
        "status": "SKIPPED",
        "reasonTag": "FORGOT",
        "note": "Updated the next day"
      }
    ]
  }'
```

## POST /api/check-in/entries/reset

Clears previously written check-in entries for a specified date.

Use this when the agent needs to undo or reset one or more habit results.

### Request Body

```json
{
  "date": "2026-04-24",
  "resets": [
    {
      "habitId": "habit-a"
    },
    {
      "habitId": "habit-b"
    }
  ]
}
```

### Response Semantics

- `200`: all resets applied
- `207`: partial success
- `400`: invalid request

### Success Response

```json
{
  "ok": true,
  "data": {
    "ok": true,
    "date": "2026-04-24",
    "clearedCount": 2,
    "failedCount": 0,
    "results": [
      {
        "index": 0,
        "habitId": "habit-a",
        "cleared": true
      },
      {
        "index": 1,
        "habitId": "habit-b",
        "cleared": true
      }
    ]
  },
  "meta": {
    "authMethod": "apiKey"
  }
}
```

### Example

```bash
curl -i -X POST "https://your-domain.com/api/check-in/entries/reset" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY" \
  -d '{
    "date": "2026-04-24",
    "resets": [
      { "habitId": "habit-a" },
      { "habitId": "habit-b" }
    ]
  }'
```

## Recommended OpenClaw Flow

Recommended workflow for the agent:

1. Call `GET /api/check-in/today`
2. Read `data.unfinished`
3. Ask the user which habits were completed and why others were skipped
4. Convert the reply into structured `updates`
5. Call `POST /api/check-in/today/update`
6. Read `data.results` and `data.today`
7. If `failedCount > 0`, tell the user which items failed and why

## Mapping Natural Language to reasonTag

Suggested mapping:

- "busy", "working", "too much work" -> `BUSY`
- "forgot" -> `FORGOT`
- "sick", "not feeling well" -> `SICK`
- "outside", "traveling" -> `OUT`
- "rest day" -> `REST`
- anything else -> `OTHER`

The original explanation can still be preserved in `note`.

## Current Limitations

Current API limitations:

- API key requests always use `DEFAULT_USER_ID`
- The client cannot specify another user
- There is no per-key user mapping yet
- `PATCH /api/check-in/habits/:habitId` currently requires `title`

## Planned Next Steps

Suggested future extensions:

- Stronger multi-user or per-key user binding
- Dedicated integration examples for OpenClaw tool configuration
- Audit summaries grouped by request or date
