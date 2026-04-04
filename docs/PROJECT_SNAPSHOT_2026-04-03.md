# 2026-04-03 Project Snapshot

## Purpose

This snapshot is a concise archive of the workstation's current architecture, implemented capability set, and product direction as of 2026-04-03.

Use this file for quick re-entry before new development work. For the detailed rolling log, continue to use `docs/PROJECT_OVERVIEW.md`.

## Product Definition

This project is a single-user personal workstation.

It is designed as a shared shell plus isolated modules, not as one monolithic note app or one-purpose planner. The current goal is to make it deeply usable for one owner first, while preserving clean module boundaries so future expansion remains possible.

Core product pillars:

- planning and execution
- knowledge capture and retrieval
- writing and publishing
- archive and re-entry
- replay-oriented workstation flow

## Architecture Summary

### Application Shape

- architecture: modular monolith
- frontend and backend: Next.js App Router
- language: TypeScript
- styling: Tailwind CSS
- validation: Zod
- database: PostgreSQL
- ORM: Prisma
- auth: Auth.js credentials flow for the seeded single-user workspace account
- package management: pnpm workspace

### Runtime Model

- Windows is the active development environment
- Linux remains the deployment target
- local PostgreSQL runs through Docker for development
- local media storage is filesystem-backed in development
- object-storage abstraction remains available for later S3/MinIO deployment

### Structural Layers

- shell layer: layout, navigation, auth/session gating, search entry, replay entry, system posture
- module layer: planner, knowledge, writing, archive, activity, settings, modules
- shared server layer: data access, aggregation, replay helpers, search, media, settings state
- shared packages: module registry and TypeScript shared types

## Current Module Map

### Dashboard

Responsibilities:

- workspace overview
- KPI cards
- today focus
- cross-module quick actions
- recent activity summary
- entry into replay surfaces

### Activity Hub

Responsibilities:

- unified replay surface
- focus lenses
- recent activity
- work threads
- history timeline
- lens-aware next actions

### Planner

Responsibilities:

- task creation
- task editing
- task state transitions
- linked task context from notes and drafts
- execution-oriented re-entry

### Knowledge

Responsibilities:

- note creation and editing
- domains and tags
- filtered library views
- rich-content detail pages
- links into writing and planner

### Writing

Responsibilities:

- draft creation and editing
- rich-media content blocks
- image upload
- video embed
- publishing to posts
- source-note relationships
- article detail rendering

### Archive

Responsibilities:

- cross-module archival records
- favorite state
- historical replay
- note-backed and post-backed archive entries

### Modules

Responsibilities:

- module registry
- module posture and fit
- module toggles
- replay-aware module entry

### Settings

Responsibilities:

- profile preferences
- appearance preferences
- module toggles
- replay habit controls
- system posture surface

## Core Design Decisions

### 1. Single-User First

The product currently targets one workspace owner.

This is intentional.

The data model already preserves per-owner boundaries, but the product surface and auth flow are currently optimized for a private workstation rather than a multi-user SaaS product.

### 2. Rich Media Writing, Not Plain Markdown Only

Writing is treated as structured rich content with media support.

Current supported content patterns:

- headings
- paragraphs
- quotes
- inline images
- cover images
- video embeds

Storage pattern:

- structured JSON for editing and rendering fidelity
- media metadata in PostgreSQL
- binary files in local storage provider for development

### 3. Replay As a First-Class UX Layer

The workstation is no longer only module-driven. It also has a replay-oriented control layer.

This includes:

- recent activity
- work threads
- history timeline
- activity focus lenses
- command center re-entry
- remembered replay context
- default replay habit

### 4. Module Isolation With Cross-Module Bridges

Modules stay isolated in their own services and routes, but cross-module bridges are now real and product-visible.

Implemented bridges:

- knowledge note -> start writing draft
- writing draft/post -> show source note
- knowledge note -> create planner task
- writing draft -> create planner task
- writing publish -> archive item
- knowledge save/update -> archive item
- dashboard/activity/search -> aggregate across all modules

## Implemented Functional State

### Auth and Shell

Implemented:

- sign-in flow via Auth.js
- protected workstation routes
- sign-out in shell
- request-scoped user resolution for live services
- module-aware sidebar navigation
- top search / command entry

### Planner

Implemented:

- create task
- edit task
- update task status: TODO, IN_PROGRESS, DONE
- scheduling and due-date fields
- task overview counts
- task list ordering and guardrails
- task links to knowledge notes and writing drafts
- work threads surface

Not yet implemented:

- full calendar view
- reminders/notifications
- recurring tasks
- drag-and-drop scheduling

### Knowledge

Implemented:

- create note
- edit note
- note detail page
- domains and tags
- library filters by domain and tag
- recent touches stream
- source links into writing and planner
- archive linkage

Not yet implemented:

- backlinks graph
- block-level references
- note history/versioning
- full-text semantic knowledge tools

### Writing

Implemented:

- create draft
- edit draft
- live preview
- upload local images
- insert video embeds
- publish posts
- republish/update existing posts
- article detail rendering
- recent touches stream
- source note relationship
- archive linkage after publish

Not yet implemented:

- full TipTap editing experience
- uploaded video pipeline
- publication settings/SEO controls
- post deletion/unpublish flow

### Archive

Implemented:

- archive records for writing posts
- archive records for knowledge notes
- list view
- favorites
- resource/history/favorites counts
- history timeline grouped by day
- links back to source modules

Not yet implemented:

- richer collection management
- archive search facets
- non-note/non-post resource ingestion

### Search and Command Center

Implemented:

- unified search across planner, knowledge, writing drafts, published writing, archive
- title, summary, and body-text matching where applicable
- grouped results with real match totals
- result highlighting
- command center when query is empty
- contextual actions from current data
- lens-aware command guidance

Not yet implemented:

- PostgreSQL full-text ranking
- saved searches
- recent searches
- keyboard command palette overlay

### Dashboard and Replay Layer

Implemented:

- KPI cards from live data
- today focus
- cross-module threads
- archive signals
- recent activity timeline
- workspace view navigation
- activity hub with focus lenses
- lens snapshot
- lens launch surface
- from-this-lens actions
- remembered current lens
- default replay habit
- replay-aware module and shell posture

Not yet implemented:

- deeper analytics
- user-customizable dashboard sections
- long-range trend views

### Settings and Modules

Implemented:

- live profile/preferences form
- module enable/disable state
- module registry page
- replay-aware module fit display
- shared system posture navigation
- default replay lens selection
- replay-aligned navigation bias

Not yet implemented:

- import/export
- advanced theme system
- plugin installation flow

## Current Cross-Module Experience

The workstation now supports these meaningful end-to-end loops:

1. Capture a note in Knowledge, start a draft from that note, publish it in Writing, and automatically see it in Archive.
2. Create a task from a note or draft, then revisit the linked context from Planner.
3. Search across tasks, notes, drafts, posts, and archive records from one global entry.
4. Use Activity Hub to replay recent motion, linked execution threads, and archive history from one place.
5. Use replay habit and remembered lens context to bias navigation, commands, and system posture toward the user's preferred mode.

## Known Technical Reality

- The app is stable at the typecheck/build level for current features.
- Important behavior regressions have been manually tested repeatedly on fresh local production instances.
- Windows occasionally triggers Prisma schema-engine `EPERM` issues; this is treated as an environment quirk, not a product-logic flaw.
- Local development therefore favors minimizing unnecessary Prisma migration churn unless a schema change is truly needed.

## Most Important Current Files

- app shell and routes: `apps/web/src/app`
- replay helpers: `apps/web/src/lib/activity-focus.ts`
- replay preference server helper: `apps/web/src/server/activity/preferences.ts`
- settings state and module posture: `apps/web/src/server/settings/service.ts`
- command/search service: `apps/web/src/server/search/service.ts`
- planner service: `apps/web/src/server/planner/service.ts`
- knowledge service: `apps/web/src/server/knowledge/service.ts`
- writing service: `apps/web/src/server/writing/service.ts`
- archive service: `apps/web/src/server/archive/service.ts`
- shared module registry: `packages/config/src/modules.ts`
- shared types: `packages/types/src/index.ts`
- rolling development log: `docs/PROJECT_OVERVIEW.md`

## Recommended Re-Entry Checklist

Before starting new development later:

1. Read this file first.
2. Read `docs/PROJECT_OVERVIEW.md` second for detailed history and verification notes.
3. Verify whether the next task belongs to shell/replay, planner, knowledge, writing, archive, settings, or module posture.
4. Prefer preserving module isolation and cross-module bridges instead of adding new global state.
5. Validate with at least `corepack pnpm --filter web typecheck` and `corepack pnpm --filter web build` after meaningful changes.

## Suggested Next Development Directions

Most natural next steps from the current state:

- strengthen system posture and control-surface UX
- add more behavior-level regression coverage around replay-aware flows
- deepen planner scheduling and calendar behavior
- deepen writing editing/publishing ergonomics
- deepen knowledge relationship tools
- eventually decide whether activity/replay deserves persistence beyond cookies
