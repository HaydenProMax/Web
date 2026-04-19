# V10 Daily Check-in Architecture

## Goal

`V10.0` introduces a lightweight `Daily Check-in` module for repeatable personal habits.

It is not a replacement for Planner / Todo.

It exists for a different loop:

- Planner answers: what should I do next?
- Daily Check-in answers: did I keep today's habit?

The module should work smoothly in:

- local WSL development and testing
- Linux production deployment

This cross-platform requirement is non-negotiable for the implementation.

## Product Scope

### Core User Outcome

The user can:

- define recurring check-in items
- mark today as `done`
- mark today as `skipped`
- explain a skipped day with a reason tag and optional note
- review total completions and streak-related stats
- review recent history

### First-Release Boundary

`V10.0` should include:

- habit item CRUD
- schedule support: `daily`, `weekdays`, `custom weekdays`
- daily completion action
- daily skip action
- skip reason tag + optional note
- stats:
  - total completions
  - current streak
  - longest streak
  - monthly completion rate
- history list for recent days
- archive support for inactive habits

`V10.0` should not include:

- reminders / notifications
- heatmap calendar
- team or social features
- complex recurrence rules beyond weekdays
- planner auto-sync rules
- advanced analytics dashboards

## Module Positioning

The new module should sit beside Planner, not inside Planner.

Reasoning:

- habits are ongoing and identity-level
- planner tasks are outcome-oriented and finite
- forcing habits into Planner would blur the product boundary and make daily use noisier

Recommended route:

- `/check-in`

Recommended navigation label:

- `Check-in`

## Architecture Shape

The module should follow the existing modular monolith structure already used by Planner, Knowledge, and Writing.

Implementation slices:

- route layer: `apps/web/src/app/check-in/*`
- presentation components: `apps/web/src/components/check-in/*`
- server logic: `apps/web/src/server/check-in/*`
- shared types only when needed: `packages/types/*`

The module must use:

- Next.js App Router
- Prisma
- PostgreSQL
- Auth.js session boundary
- server actions for primary mutations

## Data Model

### CheckInHabit

Represents one long-running habit/check-in definition.

Suggested fields:

- `id`
- `ownerId`
- `title`
- `description`
- `scheduleType`
- `scheduleDays`
- `isArchived`
- `createdAt`
- `updatedAt`

Recommended enum for `scheduleType`:

- `DAILY`
- `WEEKDAYS`
- `CUSTOM`

Recommended storage for `scheduleDays`:

- JSON array of weekday numbers or weekday keys

Example:

- `[1,2,3,4,5]` for weekdays
- `[1,3,5]` for Monday/Wednesday/Friday

### CheckInEntry

Represents the result for a specific habit on a specific day.

Suggested fields:

- `id`
- `habitId`
- `ownerId`
- `date`
- `status`
- `reasonTag`
- `note`
- `createdAt`
- `updatedAt`

Recommended enum for `status`:

- `DONE`
- `SKIPPED`

Recommended enum for `reasonTag`:

- `SICK`
- `BUSY`
- `OUT`
- `REST`
- `FORGOT`
- `OTHER`

### Constraints

Recommended uniqueness:

- unique `(habitId, date)`

Reason:

- a habit should only have one recorded outcome per day

## Derived Logic

### Today Eligibility

The module should first determine whether a habit is scheduled for the current day.

Rules:

- `DAILY`: always active
- `WEEKDAYS`: Monday to Friday only
- `CUSTOM`: active only on configured weekdays

Only eligible habits should appear in `Today`.

### Completion Counting

`Total completions` should count only `DONE` entries.

`SKIPPED` should not count as completion.

### Streak Rules

Recommended first-pass streak logic:

- streak grows only on scheduled days with `DONE`
- `SKIPPED` breaks the streak
- missing a scheduled day also breaks the streak
- unscheduled days do not break the streak

This keeps the first version easy to understand and consistent.

### Monthly Completion Rate

Recommended formula:

- completed scheduled days in current month / total scheduled days so far in current month

Exclude unscheduled days from the denominator.

## Page Architecture

### Route

Primary page:

- `/check-in`

Suggested high-level page layout:

1. lightweight hero/header
2. left column:
   - today check-ins
   - history
3. right column:
   - stats
   - habit management

### Component Plan

Recommended presentation components:

- `check-in-hero.tsx`
- `check-in-today-list.tsx`
- `check-in-habit-card.tsx`
- `check-in-skip-form.tsx`
- `check-in-stats-panel.tsx`
- `check-in-history-panel.tsx`
- `check-in-habit-manager.tsx`
- `check-in-empty-state.tsx`

### Interaction Rules

Primary interactions:

- mark as done
- open skip form
- confirm skip
- create habit
- edit habit
- archive habit

Recommended UX:

- skip should expand inline inside the habit card
- avoid modal-first interaction for the initial release
- keep the page fast to scan and act on

## Server Structure

Recommended server files:

- `apps/web/src/server/check-in/service.ts`
- `apps/web/src/server/check-in/queries.ts` if query volume grows
- `apps/web/src/server/check-in/types.ts` only if module-local typing becomes noisy

Recommended responsibilities for `service.ts`:

- list active habits
- list today's scheduled habits
- create habit
- update habit
- archive / restore habit
- mark habit done for a date
- mark habit skipped for a date
- calculate stats
- list recent history

## Action Layer

Recommended server actions:

- `createCheckInHabitAction`
- `updateCheckInHabitAction`
- `archiveCheckInHabitAction`
- `markCheckInDoneAction`
- `markCheckInSkippedAction`

Recommended placement:

- `apps/web/src/app/check-in/actions.ts`

## Dashboard Integration

`V10.0` should keep dashboard integration light.

Recommended first-pass integration:

- show today's pending check-ins count
- show current streak summary
- optionally show one quick action link into `/check-in`

Do not rebuild the dashboard around this module in the first pass.

## Deployment / Environment Notes

The implementation must stay compatible with both:

- WSL local development
- Ubuntu Linux production deployment

Implementation requirements:

- no Windows-only path assumptions
- no shell-specific app logic
- Prisma migrations must remain Linux-safe
- file naming must stay case-correct
- date logic should be server-side and timezone-aware

Recommended timezone rule:

- use the authenticated user's configured timezone when resolving "today"
- fall back to workspace/server timezone only if the user preference is unavailable

## Recommended Build Order

1. Add Prisma schema and migration
2. Generate Prisma client
3. Build server service layer
4. Create `/check-in` page skeleton with static layout
5. Wire real today list and stats
6. Add `Done` and `Skip` actions
7. Add habit management section
8. Add history section
9. Add light dashboard integration
10. Run regression on WSL and Linux deployment path

## Regression Focus

Before sealing `V10.0`, verify:

- habit creation works
- weekday filtering works
- custom weekday filtering works
- done action is idempotent per day
- skip action overwrites/updates the same day cleanly
- streak logic behaves correctly across missed days
- monthly rate handles unscheduled days correctly
- archive hides a habit from today without deleting history
- WSL local build/test path works
- Linux production build/run path works

## Working Rule

Keep `V10.0` narrow.

This module should become:

- fast to open
- easy to act on
- emotionally light
- structurally clean

It should not become a second Planner.
