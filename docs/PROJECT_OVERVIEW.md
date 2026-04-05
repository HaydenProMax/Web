# Personal Workstation Project Overview

## V1 Seal Status

As of 2026-04-04, the current single-user desktop web release line is defined as V1 sealed.

From this point forward:

- V1 is the frozen baseline
- further work should default to Phase 2 unless it is required to preserve V1 stability
- V1 changes should focus on regression, defect repair, and release clarity

## Quick Re-entry

For a concise archived snapshot of the current architecture, module design, implemented capability set, and next-step posture, read:

- `docs/PROJECT_SNAPSHOT_2026-04-03.md`
- `docs/V2_CHINESE_UI_TRACKING.md` for the current Chinese UI adaptation checklist

Use this overview file as the detailed rolling log after reading the snapshot.


## Goal

Build a modular personal workstation that supports:

- schedule planning
- knowledge base
- writing and sharing
- future extensibility through isolated modules

The frontend visual prototype already exists under `stitch/` and serves as the product/design reference.

## Product Positioning

This is not a single-purpose tool. It is a personal digital workstation with a shared shell and multiple independent business modules.

The current confirmed core modules are:

- Dashboard
- Planner
- Knowledge
- Writing
- Archive
- Modules
- Settings

## Design Reference

Primary visual and design language source:

- `stitch/komorebi_journal/DESIGN.md`

Primary prototype pages:

- `stitch/dashboard_personal_sanctuary/3.html`
- `stitch/planner_personal_sanctuary/7.html`
- `stitch/knowledge_base_personal_sanctuary/4.html`
- `stitch/note_detail_personal_sanctuary/6.html`
- `stitch/writing_journal_personal_sanctuary/9.html`
- `stitch/article_detail_personal_sanctuary/2.html`
- `stitch/archive_library_personal_sanctuary/1.html`
- `stitch/modules_explore_personal_sanctuary/5.html`
- `stitch/settings_personal_sanctuary/8.html`

## Architecture Decision

Use a modular monolith architecture with plugin-ready extension points.

Reasoning:

- simpler to develop and maintain in the early stage
- keeps module boundaries clear
- supports Windows development and Linux deployment
- avoids premature microservice complexity
- leaves room to split modules later if needed

## Cross-Platform Requirement

The project must support:

- development and testing on Windows
- seamless deployment on Linux

Implementation constraints:

- use Node.js tooling that works on both Windows and Linux
- avoid shell-specific core workflows
- use environment variables for all environment-specific config
- use path utilities instead of hard-coded separators
- keep filename casing strict for Linux compatibility
- keep local and production database engines consistent

## Recommended Tech Stack

Frontend:

- Next.js
- TypeScript
- Tailwind CSS

Backend:

- Next.js App Router
- Route Handlers
- Server Actions where appropriate

Data and validation:

- PostgreSQL
- Prisma
- Zod

Authentication:

- Auth.js

Editor and content:

- TipTap

Search:

- phase 1: PostgreSQL full-text search
- phase 2: optional Meilisearch

Storage:

- local filesystem provider for development
- S3-compatible object storage for production
- MinIO as a self-hosted production-compatible option

Infrastructure:

- pnpm
- Docker Desktop for local dependencies on Windows
- Docker Compose for Linux deployment
- Nginx as reverse proxy in production

## High-Level System Structure

### Shell Layer

Shared application shell responsibilities:

- global layout
- sidebar and top navigation
- module routing
- auth/session handling
- global search entry
- quick actions
- settings entry
- module registry

### Business Modules

Each core module owns its own domain logic and persistence access.

#### Dashboard

Responsibilities:

- aggregate summaries from other modules
- present today focus, recent content, quick actions

#### Planner

Responsibilities:

- calendars
- tasks
- reminders
- daily timeline
- weekly intentions

#### Knowledge

Responsibilities:

- notes
- domains/categories
- tags
- backlinks or note relations
- detail view for individual knowledge entries

#### Writing

Responsibilities:

- drafts
- published posts
- article detail pages
- publishing workflow
- rich media content

#### Archive

Responsibilities:

- favorites
- historical content
- saved resources
- cross-module archival records

#### Modules

Responsibilities:

- show installed/enabled modules
- enable/disable modules
- provide extension entry for future modules

#### Settings

Responsibilities:

- profile
- appearance
- privacy
- module preferences
- export/import related settings

## Media Requirement

Writing content is not plain text only.

Confirmed requirement:

- writing content can include images
- writing content can include videos

This means the content system must be designed as rich media content, not only markdown articles.

### Media Strategy

Use structured rich content stored as JSON, with optional rendered HTML for delivery.

Recommended content approach:

- TipTap editor
- JSON document storage for editing fidelity
- rendered HTML for frontend presentation and SEO

### Media Types

Phase 1 required:

- cover images
- inline images
- video embeds

Phase 2 planned:

- uploaded videos
- audio
- files/attachments
- galleries

### Media Storage Strategy

Do not store binary files in PostgreSQL.

Store:

- files in storage provider
- metadata in database

Storage providers:

- development: local storage
- production: S3-compatible object storage

## Module Isolation Rules

To keep modules from interfering with each other:

- each module owns its domain logic
- each module owns its repositories/services
- modules do not directly mutate another module's internal data
- cross-module interactions go through explicit services or domain events
- shared capabilities live under a core/common layer

## Suggested Project Structure

```text
apps/
  web/
    src/app/
    src/components/
    src/lib/
    src/server/
modules/
  dashboard/
    application/
    domain/
    infrastructure/
    presentation/
  planner/
    application/
    domain/
    infrastructure/
    presentation/
  knowledge/
    application/
    domain/
    infrastructure/
    presentation/
  writing/
    application/
    domain/
    infrastructure/
    presentation/
  archive/
    application/
    domain/
    infrastructure/
    presentation/
  settings/
    application/
    domain/
    infrastructure/
    presentation/
packages/
  ui/
  config/
  types/
  utils/
prisma/
  schema.prisma
  migrations/
docs/
```

## Data Model Summary

### System Layer

- users
- accounts
- sessions
- user_profiles
- user_preferences
- module_registry
- user_module_settings
- attachments
- audit_logs
- media_assets
- media_usages

### Planner

- planner_calendars
- planner_events
- planner_tasks
- planner_task_labels
- planner_task_relations
- planner_reminders

### Knowledge

- knowledge_notes
- knowledge_note_blocks
- knowledge_tags
- knowledge_note_tags
- knowledge_links
- knowledge_domains

### Writing

- writing_drafts
- writing_posts
- writing_post_versions
- writing_publications

Writing content fields should support:

- title
- summary
- cover_media_id
- content_json
- content_html
- status
- published_at

### Archive

- archive_items
- archive_collections
- archive_snapshots

## Communication Pattern Between Modules

Use both synchronous orchestration and domain events.

### Synchronous Use Cases

- dashboard requests summary data from planner, knowledge, and writing
- settings updates module preferences

### Event-Driven Use Cases

- `writing.post.published`
- `knowledge.note.created`
- `planner.task.completed`
- `media.asset.uploaded`

Example:

- Writing publishes an article
- Archive creates an archival entry from the event
- Dashboard can later aggregate the published result

## API Organization

Group APIs by module:

- `/api/dashboard/*`
- `/api/planner/*`
- `/api/knowledge/*`
- `/api/writing/*`
- `/api/archive/*`
- `/api/settings/*`
- `/api/modules/*`
- `/api/media/*`

## Frontend Route Mapping

Suggested application routes:

- `/dashboard`
- `/planner`
- `/knowledge`
- `/knowledge/[noteId]`
- `/writing`
- `/writing/[slug]`
- `/archive`
- `/modules`
- `/settings`

## MVP Scope

### Shell and Foundation

- application shell
- navigation
- authentication
- base design system tokens/components
- module registry

### Dashboard MVP

- today summary
- quick actions
- recent notes
- recent writing

### Planner MVP

- task CRUD
- month calendar view
- daily focus list
- basic reminder structure

### Knowledge MVP

- note CRUD
- note detail page
- tags
- categories/domains

### Writing MVP

- draft CRUD
- rich text editor
- image upload
- video embed
- cover image
- post publishing
- article detail page

### Archive MVP

- favorite/save items
- archive list
- cross-module archive entries

### Settings MVP

- profile
- appearance
- module toggles
- privacy basics

## Delivery Phases

### Phase 1

- project foundation
- shell
- planner MVP
- knowledge MVP
- writing MVP with image support and video embed
- dashboard aggregation

### Phase 2

- archive enhancement
- search enhancement
- module enable/disable system
- media management improvements
- uploaded video support

### Phase 3

- richer plugin/module extensibility
- cross-device sync
- AI-assisted features if desired

## Working Agreement For Future Conversations

Before continuing implementation, refer back to this document to keep architecture, module boundaries, and feature scope consistent.

Primary reference document:

- `docs/PROJECT_OVERVIEW.md`


## Current Progress

### Foundation

- Next.js workspace scaffold is in place under `apps/web`
- modular shell routes exist for dashboard, planner, knowledge, writing, archive, modules, and settings
- dedicated Docker PostgreSQL dev database is running for this project
- Prisma generate, migrate, seed, typecheck, and production build have all been verified

### Writing Module

Implemented so far:

- database-backed draft creation
- database-backed draft listing
- draft detail/edit page
- local image upload to filesystem storage
- media asset and media usage persistence
- video embed insertion
- live rich-content preview shared with article rendering
- draft publishing to database-backed posts
- republishing updates existing posts and creates post versions
- live published article detail rendering with shared preview renderer
- draft publishing now retries slug/version reservation when concurrent writes hit unique constraints

### Archive Module

Implemented so far:

- published writing now upserts archive records during the publish flow
- archive post records are now protected by a database-level unique index to prevent duplicate archive entries under concurrent publish flows
- archive list page reads real database-backed archive items
- archive summaries link back to their writing source when available
- archive now supports favorite state and filterable views
- archive collection cards show live counts for favorites, history, and resources
- archive is now part of the live cross-module data flow instead of a static placeholder



### Planner Module

Implemented so far:

- database-backed task listing
- planner task creation surface with status, priority, and scheduling fields
- planner overview counts for total, todo, in-progress, and done work
- planner tasks can now move through todo, in-progress, and done states directly from the planner list
- planner tasks can now be edited from a dedicated /planner/[id]/edit surface with full field updates
- planner status transitions now explicitly reject ARCHIVED updates from the public action path
- dashboard now surfaces recent planner tasks alongside writing, knowledge, and archive activity

### Knowledge Module

Implemented so far:

- database-backed note listing
- knowledge note creation surface with domains and tags
- note detail pages with shared rich-content rendering
- knowledge notes can now be edited with slug-safe updates from a dedicated edit page
- knowledge overview counts for notes, domains, and tags
- dashboard now surfaces recent knowledge notes alongside writing and archive activity
- knowledge library now supports domain and tag filtering with detail-page jumpbacks
- knowledge note create/update now retries slug reservation when concurrent writes hit unique constraints



### Authentication Layer

Implemented so far:

- Auth.js is now wired into the app with a credentials-based development sign-in flow
- request-scoped sessions now provide the current user boundary for planner, knowledge, writing, archive, search, media, and settings services
- middleware now protects the workstation surface and routes unauthenticated users to /sign-in
- the shell now includes a real sign-out action
- the seeded workspace user remains the default development identity, but ownership is now resolved from session state instead of a process-wide fallback
### Settings Module

Implemented so far:

- settings now reads live user profile and preference data from UserProfile and UserPreference
- module visibility is now driven by UserModuleSetting and ModuleRegistry instead of only static config
- the shell navigation now resolves from enabled modules so hiding a module removes it from the sidebar
- dashboard highlight cards now respect enabled module preferences for planner, knowledge, writing, and archive
- settings includes a real preferences form for display name, curator title, theme, accent, typography, locale, and timezone
- modules and settings both expose live enable/disable controls for non-locked modules
- dashboard, modules, and settings remain locked-on infrastructure modules so the shell can always be recovered
### Dashboard Module

Implemented so far:

- dashboard reads live draft, published writing, and archive summaries
- quick actions link into the working writing and archive flows
- the shared shell header now includes a real workspace search entry point
- dashboard module cards reflect the active workstation shell structure
- latest published article and recent activity sections are now database-backed
- dashboard now computes a live Today Focus state from planner tasks, recent notes, recent drafts, and module overview counts instead of using static hero copy
- dashboard KPI cards now use real module totals for tasks, drafts, notes, published entries, and archive records

### Verification Notes

Latest live verification results:

- local image upload API works against the running app
- draft creation API works with uploaded local image URLs plus video embed blocks
- draft persistence to PostgreSQL is confirmed through API responses
- the original schema bug that rejected local `/api/media/files/...` URLs has been fixed
- the Windows runtime chunk-loading issue was traced to mixing `next dev` and `next start` outputs in the same `.next` folder
- after stopping stale Node processes, rebuilding, and running only `next start`, page rendering and APIs both worked normally
- publishing a draft through the live API created a real `WritingPost` with slug `review-flow-draft`
- `/writing` now shows database-backed published posts ahead of mock content
- `/writing/review-flow-draft?published=1` successfully renders the live article with image and video blocks
- `MediaUsage` syncing no longer leaves `pending` records behind for saved draft media
- republishing `review-flow-draft` through the live API upserted a real `ArchiveItem`
- `/archive` now renders the real archive record for `Review Flow Draft`
- the `archive_favorites` migration added persistent favorite state to archive items
- Prisma verification created the first live Planner task and confirmed planner overview counts
- Prisma verification confirmed that a live planner task can transition from TODO to IN_PROGRESS
- dashboard and planner pages now have real task data available instead of placeholders
- Prisma verification created the first live Knowledge note with 1 domain and 3 tags
- Prisma verification confirmed that a live Knowledge note can be updated and moved to a new slug safely
- Prisma verification confirmed that the live Knowledge note can be found through both its domain and tag filters
- dashboard and knowledge pages now have real note data available instead of placeholders
- Prisma verification confirmed that `Review Flow Draft` can now be marked favorite and counted inside archive summaries
- a fresh `3007` production instance confirmed that `/` now aggregates live draft, writing, and archive data
- live dashboard verification showed current counts for drafts, published entries, and archive records instead of placeholders
- Dashboard Today Focus changes passed both corepack pnpm --filter web typecheck and corepack pnpm --filter web build
- Planner edit flow changes passed both corepack pnpm --filter web typecheck and corepack pnpm --filter web build
- guardrail fixes passed both corepack pnpm --filter web typecheck and corepack pnpm --filter web build
- search MVP changes passed both corepack pnpm --filter web typecheck and corepack pnpm --filter web build
- search ranking/highlight enhancements passed both corepack pnpm --filter web typecheck and corepack pnpm --filter web build
- writing-draft search coverage passed both corepack pnpm --filter web typecheck and corepack pnpm --filter web build
- body-text search enhancements passed both corepack pnpm --filter web typecheck and corepack pnpm --filter web build
- search completeness/count fixes passed both corepack pnpm --filter web typecheck and corepack pnpm --filter web build
- behavior-level search regression on a fresh production instance confirmed title hits, body-text hits, and destination links for planner, knowledge, writing drafts, published writing, and archive results
- search snippets now prefer the field that actually matched, so body-text hits surface readable body excerpts instead of unrelated summaries when summary text is present
- settings and modules pages now render live per-user module state from the database on a fresh production instance
- read-only Prisma verification confirmed the seeded user currently has 7 module settings available for shell visibility control
- Auth.js credentials sign-in now completes successfully against the seeded workspace user and returns a session that can access protected pages
- the authentication rollout required enabling trustHost for local verification because the workstation currently runs on custom localhost ports during development
- trustHost is now gated by AUTH_TRUST_HOST or non-production mode, so local verification still works without leaving host trust permanently enabled in production
- sensitive JSON APIs now enforce session checks directly and return 401 JSON payloads when unauthenticated instead of falling through to HTML redirects
- Docker PostgreSQL verification confirmed the ArchiveItem_ownerId_sourceType_postId_key unique index is present in the dev database
- migration SQL for the archive uniqueness guardrail is saved under prisma/migrations/20260402133000_archive_uniqueness_and_guardrails/migration.sql, but Prisma migrate could not record it automatically because the local Windows Prisma engine still hits intermittent EPERM file-lock errors

### Search Layer

Implemented so far:

- workspace search now queries live planner tasks, knowledge notes, writing drafts, published writing, and archive records
- search now scans note, draft, and post body content so text matches are not limited to titles and summaries
- search results are grouped by module, sorted by match strength, and link directly into the relevant destination pages
- search counts now represent real match totals, while the UI explicitly shows the displayed subset per module
- archive search now supports both post-backed and note-backed archive destinations, with /archive fallback for other record types
- the search page now highlights matched query terms inside result titles and summaries
- the shell header now routes search input to /search

- a self-contained authenticated regression run on a fresh `3013` production instance confirmed that the dashboard now renders the `Recent Activity` section and the `A shared timeline across the workstation` heading
- the same regression confirmed the dashboard still renders `Cross-Module Threads` and `Archive Signals` alongside the new timeline instead of displacing older cross-module sections
- activity cards on the live dashboard exposed working links into planner, knowledge, writing drafts, and published writing, and each sampled destination returned `200` in the authenticated session:
  - `/planner/cmnioh77k0001ukw0hxywxzme/edit`
  - `/knowledge/knowledge-to-writing-regression-note-1775205960156`
  - `/writing/drafts/cmnio4sgw0001ukm42qwii34c`
  - `/writing/knowledge-to-writing-regression-post-1775205960156`
- the live HTML on that `3013` instance also confirmed mixed module badges in the timeline: `Planner |`, `Knowledge |`, `Writing Draft |`, and `Published |`

### Known Follow-Up

- `3002` was confirmed to be a stale production instance during regression work, so future verification should prefer a freshly started server when behavior looks inconsistent with the latest code
- a fresh `3003` production instance confirmed that the no-cover fallback card and dual-usage media sync fixes are both working as intended
- archive verification should avoid parallel publish-and-fetch checks when timing matters, because the first fetch can race ahead of the completed publish transaction
- regression verification created these reference records in the dev database:
  - draft `cmnh9xd6p0005ukb8rftti4t6` -> post `no-cover-regression-draft`
  - draft `cmnh9xda90007ukb8tshd5foz` -> post `dual-usage-regression-draft`
- read-only Prisma verification confirmed that the dual-usage post now stores the same media asset as both `coverImage` and `content`
- archive verification confirmed that `review-flow-draft` is now represented in the archive surface as a live cross-module record

### Knowledge and Writing Interconnection

Implemented so far:

- knowledge note detail pages now offer a `Start Draft from Note` flow into `/writing/new?sourceNote=...`
- writing drafts and published posts can now persist an optional `sourceNoteId` link back to the originating knowledge note
- the writing new-draft flow can seed title, summary, and initial content from a source note
- writing draft and post detail views now surface source-note banners that link back to the originating note
- knowledge note detail pages now surface related writing entries from both linked drafts and linked published posts
- Prisma schema now includes bidirectional source-note relations between `KnowledgeNote`, `WritingDraft`, and `WritingPost`

### Migration and Verification Updates

Latest updates:

- Prisma migration `20260403084157_knowledge_writing_links` has been created and applied successfully
- Prisma migration history drift from the earlier archive uniqueness guardrail was repaired without resetting development data
- a prep migration `20260402130000_archive_index_prep` was recorded so shadow-database replays now succeed
- archive post uniqueness has been restored and recorded under `20260403085030_restore_archive_post_uniqueness`
- `corepack pnpm --filter web prisma migrate status` now reports the database schema as up to date
- `corepack pnpm --filter web typecheck` and `corepack pnpm --filter web build` both pass after the knowledge-writing linkage work
- Prisma relation validation created a live regression note and confirmed it resolves to exactly one linked draft and one linked published post through the new `sourceNoteId` relation
- live note-to-writing verification on a fresh `3011` production instance confirmed that a source note can seed a draft page, save through the authenticated drafts API, publish through the authenticated publish API, and keep the source-note banner visible on both the draft page and the published article page
- live HTML verification on `/knowledge/[slug]` confirmed that the note detail page shows `Start Draft from Note` plus related writing cards for linked drafts and linked published posts
- the live verification uncovered and fixed a production-only Prisma connection leak: `getDb()` had been creating a new PrismaClient per request in production mode, which caused `Too many database connections opened` under repeated authenticated page loads
- `src/server/db.ts` now reuses a single process-wide Prisma client in production and development, and the rebuilt `3011` instance no longer throws connection-exhaustion errors during the note -> draft -> post flow

### Planner Cross-Module Links

Implemented so far:

- planner tasks can now persist an optional linked knowledge note and an optional linked writing draft
- planner create and edit forms now surface live note and draft selectors sourced from the current user's recent knowledge notes and writing drafts
- knowledge note detail pages now expose `Create Task from Note`
- writing draft detail pages now expose `Create Task from Draft`
- planner list cards now show linked note and draft badges when a task is connected to upstream content

### Planner Link Verification

Latest updates:

- Prisma migration `20260403090200_planner_module_links` has been created and applied successfully
- `corepack pnpm --filter web prisma validate`, `corepack pnpm --filter web typecheck`, and `corepack pnpm --filter web build` all pass after the planner-link work
- live verification on a fresh `3011` production instance confirmed:
  - knowledge note detail pages show `Create Task from Note`
  - writing draft detail pages show `Create Task from Draft`
  - `/planner/new?note=...` preselects the linked note
  - `/planner/new?draft=...` preselects the linked draft
  - planner list pages render linked note and draft badges for persisted linked tasks
  - planner edit pages keep the linked note and linked draft selections intact
- the intermediate verification work uncovered that PowerShell file writes had reintroduced non-UTF8 output into a planner service file and a BOM into `schema.prisma`; both were normalized before the final validation pass

### Knowledge Archive Integration

Implemented so far:

- knowledge note create and update flows now upsert note-backed archive records through the archive service
- archive items now resolve knowledge-note destinations as `/knowledge/[slug]`
- archive cards now show `Knowledge` as the badge for note-backed records
- knowledge detail pages now include a `View Archive` shortcut so note work can move directly into the record layer
- archive storage now enforces one note-backed archive record per owner/source/note tuple via the `ownerId + sourceType + noteId` uniqueness key

### Knowledge Archive Verification

Latest updates:

- Prisma migration history now includes `20260403093000_archive_knowledge_notes`, and `corepack pnpm --filter web prisma migrate status` reports the database schema as up to date
- `corepack pnpm --filter web prisma generate`, `corepack pnpm --filter web typecheck`, and `corepack pnpm --filter web build` all pass after the knowledge archive integration
- a live note-backed archive record was seeded against `knowledge-to-writing-regression-note-1775205960156`, and a fresh `3011` production instance confirmed that `/archive` now shows the note title, the `Knowledge` badge, and a working link back to the knowledge detail page
- the same live verification confirmed that the knowledge detail page now exposes a `View Archive` shortcut
- the automatic note-archive upsert path is now wired into `createKnowledgeNote` and `updateKnowledgeNote` in the knowledge service, even though this round's behavior-level verification of the archive UI used a seeded note-backed record rather than a browser-submitted note form

### Dashboard Cross-Module Enhancements

Implemented so far:

- dashboard now surfaces a `Cross-Module Threads` section built from planner tasks that link back to knowledge notes and writing drafts
- dashboard now surfaces an `Archive Signals` section that highlights knowledge records entering the archive layer
- dashboard quick actions now include context-aware actions for creating a task from the latest note and the latest draft when those records exist
- today-focus logic now prioritizes in-progress tasks that carry note/draft context, so cross-module work gets promoted above generic status summaries
- dashboard home copy and empty states now describe the workstation as a connected system rather than a set of isolated module cards

### Dashboard Verification

Latest updates:

- `corepack pnpm --filter web typecheck` and `corepack pnpm --filter web build` both pass after the dashboard cross-module enhancements
- live verification on a fresh `3011` production instance confirmed that the homepage now renders:
  - the `Cross-Module Threads` section
  - the linked planner regression task title
  - linked note and draft chips for that task
  - the `Archive Signals` section
  - the knowledge-backed archive record title
  - the contextual `Task from Latest Note` and `Task from Latest Draft` quick actions

### Command Center

Implemented so far:

- `/search` now doubles as a command center when no query is provided, instead of only acting as a result page
- the command center now surfaces reusable quick actions like `Create new task`, `Create new draft`, `Capture new note`, `Open archive`, and `Open settings`
- the command center also surfaces contextual actions derived from live data, such as creating a task from the latest note or latest draft and reopening the latest planner task
- when a query is present, command results now appear alongside planner, knowledge, writing, and archive search groups instead of being hidden behind a separate experience
- the global shell search bar now uses `Search or run a command...` to reflect the broader workstation entry behavior

### Command Center Verification

Latest updates:

- `corepack pnpm --filter web typecheck` and `corepack pnpm --filter web build` both pass after the command center upgrade
- live verification on a fresh `3011` production instance confirmed that:
  - `/search` with no query now renders the command center and quick-action cards
  - contextual actions such as the latest-note task shortcut appear in the empty-query state
  - `/search?q=task` renders both the `Commands` group and the `Planner` group together
  - the command result `Create new task` appears inside the query-backed commands group with highlighted matches
  - the shell header now renders the updated `Search or run a command...` placeholder and `Go` submit label

### Recent Activity Timeline

Implemented so far:

- dashboard now builds a unified `Recent Activity` timeline across planner tasks, knowledge notes, writing drafts, published posts, and archive records
- timeline entries sort by the latest meaningful timestamp so the shell can show cross-module momentum instead of isolated module snapshots
- each timeline card links back into the correct module destination and reuses existing live data sources rather than introducing a separate activity table
- planner link-option copy was normalized back to clean ASCII separators during this pass after Windows encoding noise briefly corrupted the service text

### Recent Activity Verification

Latest updates:

- the dashboard activity-timeline pass required recovering two corrupted source files after an overly broad text replacement touched optional chaining and ternaries during editing
- `D:\HaydenWeb\apps\web\src\app\page.tsx` and `D:\HaydenWeb\apps\web\src\server\planner\service.ts` were rewritten back to known-good UTF-8 content before validation continued
- `corepack pnpm --filter web typecheck` and `corepack pnpm --filter web build` both pass after the activity-timeline work
- source inspection confirmed the dashboard now contains a single `Recent Activity` section plus a dedicated `buildRecentActivity` helper instead of duplicate timeline blocks
### Archive History Timeline

Implemented so far:

- archive now exposes a `History Timeline` section that groups recent archive records by day instead of only showing a flat grid
- timeline groups reuse the same live archive records and source links, so the history view stays aligned with favorites, writing archives, and knowledge archives
- the first history-replay pass is intentionally date-based rather than event-sourced, which keeps the feature lightweight while still making recent work easier to re-enter chronologically

### Archive History Timeline Verification

Latest updates:

- `corepack pnpm --filter web typecheck` and `corepack pnpm --filter web build` both pass after the timeline-grouping work
- a self-contained authenticated regression run on a fresh `3014` production instance confirmed that `/archive` now renders both `History Timeline` and `Timeline Group`
- that same live verification confirmed that the archive timeline includes both `Knowledge` and `Writing` badges in the rendered HTML
- a sampled timeline record reopened `/knowledge/knowledge-to-writing-regression-note-1775205960156` successfully with HTTP `200`, confirming that timeline links still resolve back into live module pages
### Writing and Knowledge Recent Touches

Implemented so far:

- the Writing landing page now includes a `Recent Touches` revision stream that mixes draft updates with published-entry timestamps for quick re-entry
- the Knowledge landing page now includes a `Recent Touches` note stream so recently edited notes can be reopened before they disappear into the larger library grid
- both streams intentionally reuse live module data rather than introducing a separate revision table, keeping the first pass lightweight and close to the current architecture

### Writing and Knowledge Recent Touches Verification

Latest updates:

- `corepack pnpm --filter web typecheck` and `corepack pnpm --filter web build` both pass after the writing/knowledge history pass
- the first live regression exposed a hidden Prisma runtime bug in `getKnowledgeLibrarySummary`: `_count.select.noteTags` is invalid for the current Prisma model and caused `/knowledge` to return `500` in production mode
- that bug was fixed by switching the tag-count query back to the valid `_count.select.notes` field before the final regression run
- a self-contained authenticated regression run on a fresh `3017` production instance confirmed:
  - `/writing` returns `200` and renders `Recent Touches` plus `A live revision stream for drafts and published pieces`
  - `/writing` shows both `Draft |` and `Published |` badges inside the new touch stream
  - `/knowledge` returns `200` and renders `Recent Touches` plus `A quick re-entry stream for recently edited notes`
  - `/knowledge` now renders `Re-open note` links in the new touch stream without runtime errors
### Planner Work Threads

Implemented so far:

- the Planner landing page now includes a `Work Threads` section that pulls linked tasks into a separate cross-module re-entry view
- thread cards emphasize upstream context by showing connected note and draft chips alongside the task status and latest update time
- this planner-level thread view complements the dashboard summary by giving linked tasks a dedicated home inside the execution module itself

### Planner Work Threads Verification

Latest updates:

- `corepack pnpm --filter web typecheck` and `corepack pnpm --filter web build` both pass after the planner thread-view pass
- a self-contained authenticated regression run on a fresh `3018` production instance confirmed that `/planner` now renders `Work Threads` and `Connected tasks grouped by their upstream context`
- that same live verification confirmed the planner thread cards render both `Note:` and `Draft:` chips when linked data exists
- sampled thread links all returned `200` in the authenticated session:
  - `/planner/cmnioh77k0001ukw0hxywxzme/edit`
  - `/knowledge/knowledge-to-writing-regression-note-1775205960156`
  - `/writing/drafts/cmnio4sgw0001ukm42qwii34c`
### Workspace View Navigation

Implemented so far:

- dashboard, planner, and archive now share a lightweight secondary navigation pattern for moving between `Recent Activity`, `Work Threads`, and `History Timeline`
- these re-entry links are implemented as a shared `WorkspaceViewNav` component so the workstation's replay surfaces now read as one system instead of three unrelated sections
- the navigation currently connects the shell's main replay views with anchor-style deep links before any heavier command-palette or tab-state work is introduced

### Workspace View Navigation Verification

Latest updates:

- `corepack pnpm --filter web typecheck` and `corepack pnpm --filter web build` both pass after the shared replay-navigation pass
- a self-contained authenticated regression run on a fresh `3019` production instance confirmed:
  - `/` renders `Follow the workstation flow` plus links to `/planner#work-threads` and `/archive#history-timeline`
  - `/planner` renders `Re-enter linked work` plus links back to `/#recent-activity` and `/archive#history-timeline`
  - `/archive` renders `Move between time and context` plus links back to `/#recent-activity` and `/planner#work-threads`

### Activity Hub

Implemented so far:

- `/activity` now acts as a dedicated replay surface that brings together `Recent Activity`, `Work Threads`, and `History Timeline` in one place
- the hub reuses live planner, knowledge, writing, and archive data instead of introducing a separate activity store
- dashboard, planner, and archive replay navigation now point into `/activity#recent-activity`, `/activity#work-threads`, and `/activity#history-timeline` so the shell has a single re-entry destination
- the hub keeps recent movement, linked execution context, and slower archive history visible side-by-side, making the workstation's time and relationship layers easier to browse together
- the hub now includes a `Focus Lens` layer so replay views can be narrowed to execution, thinking, publishing, or archive history without leaving the shared surface
- focus-aware empty states now explain when a lane is intentionally quiet versus when that lens does not apply to a section
- the hub now also includes a `Lens Snapshot` summary so each focus view immediately shows its visible activity cards, linked threads, day groups, and replayable record counts
- the hub now includes a `From This Lens` action strip so each replay lens can launch directly into the most relevant next move without sending the user back out through the shell first
- Activity Hub is now registered as a first-class module in shared config, seed data, and the live development database, so it appears in navigation and the module-management surfaces alongside the original core modules
- dashboard quick actions and the command center now both link directly into Activity Hub so the replay surface is reachable from the shell's two highest-traffic entry points

### Activity Hub Verification

Latest updates:

- `corepack pnpm --filter web typecheck` and `corepack pnpm --filter web build` both pass after the activity-hub pass
- a self-contained authenticated regression run on a fresh `3021` production instance confirmed that `/activity` returns `200` and renders:
  - `Activity Hub`
  - `Recent Activity`
  - `Work Threads`
  - `History Timeline`
- that same live verification confirmed that the shared replay entry points now target the hub correctly:
  - dashboard points to `/activity#recent-activity`
  - planner points to `/activity#work-threads`
  - archive points to `/activity#history-timeline`
- the new focus-lens pass also cleared `corepack pnpm --filter web typecheck` and `corepack pnpm --filter web build`
- a fresh authenticated regression run on a local `3022` production instance confirmed that the focus-lens variants render correctly:
  - `/activity` shows `Focus Lens` plus all three replay sections together
  - `/activity?focus=planner` shows the planner lens and the planner-only archive empty state
  - `/activity?focus=knowledge` shows the thinking lens and knowledge-backed replay content
  - `/activity?focus=writing` shows the publishing lens with both `Writing Draft |` and `Published |` badges
  - `/activity?focus=archive` shows the history lens plus the archive-specific thread empty state
- the regression also confirmed that lens labels are present in live HTML, but Next.js renders them with inline comment markers like `Active lens: <!-- -->Execution`, so behavior assertions should not assume a raw contiguous text node
- after registering Activity Hub as a real module, a fresh authenticated regression run on local `3025` confirmed:
  - the sidebar/home shell now contains `Activity Hub`
  - `/modules` shows `Activity Hub`
  - `/settings` shows `Activity Hub`
  - `/activity` still returns `200` and renders both `Lens Snapshot` and `From This Lens`
- a fresh authenticated regression run on local `3026` confirmed the higher-traffic entry points now expose Activity Hub too:
  - dashboard renders `Open Activity Hub`
  - dashboard highlight cards include `Activity Hub`
  - `/search` renders the `Open activity hub` command
- Prisma client, shared types, shared module config, and root seed data now all recognize `activity`, and the development database was patched with a direct SQL enum update because Windows Prisma schema-engine calls were still intermittently hitting `EPERM`
### Activity Lens Memory

- Activity Hub now remembers the last selected focus lens via a lightweight cookie-based preference instead of a Prisma-backed setting.
- The lens cards inside 
generate 
the preference on click, so re-entering /activity now resumes the most recent replay mode.
- Dashboard replay links and the Activity Hub quick action now respect the remembered lens, including deep links into recent activity, work threads, and history timeline.
- Command Center now changes its hub action from a generic Open activity hub to a lens-aware Resume ... lens entry when a non-default replay mode has been used.

### Activity Lens Memory Verification

- corepack pnpm --filter web typecheck passes.
- corepack pnpm --filter web build passes.
- The implementation keeps the browser-safe lens helpers in apps/web/src/lib/activity-focus.ts and reserves next/headers access for the server-only helper in apps/web/src/server/activity/preferences.ts, so the remembered-lens flow works without pulling server-only code into client components.

### Activity Re-entry Surfacing

- The workstation shell now surfaces the last-used activity lens directly under the global search bar as a Resume ... Lens entry point.
- Command Center now exposes the remembered replay context in its hero area, so the last-used lens is visible before running a search or action.
- The underlying server helper now provides a reusable preferred activity re-entry snapshot for shell-level and command-level entry points.

### Activity Re-entry Surfacing Verification

- corepack pnpm --filter web typecheck passes.
- corepack pnpm --filter web build passes.

### Module-to-Activity Re-entry

- Planner and Archive replay navigation now respects the remembered activity lens instead of always linking back to the generic /activity anchors.
- Knowledge and Writing now surface a direct Resume ... Lens action near their primary create buttons, so module work can hand back to the current replay context without detouring through the hub first.
- Both modules also include a small Replay Context panel that explains which lens is currently active for workstation re-entry.

### Module-to-Activity Re-entry Verification

- corepack pnpm --filter web typecheck passes.
- corepack pnpm --filter web build passes.

### Lens-Aware Next Step

- The replay system now exposes a shared lens-aware next step helper, so module pages do more than show the current lens label.
- Planner, Knowledge, Writing, and Archive now each render a context-aware action inside their Replay Context panel, pointing back to the most relevant Activity Hub anchor for the current lens.
- The action wording changes by lens, for example Review execution flow, Re-open thinking stream, Resume publishing lane, or Open history timeline.

### Lens-Aware Next Step Verification

- corepack pnpm --filter web typecheck passes.
- corepack pnpm --filter web build passes.

### Command Center Lens Guidance

- Command Center now injects lens-specific commands at the top of the command set, so the first actions reflect the currently remembered replay mode.
- The empty-query command surface also includes a dedicated From Current Lens panel driven by the same lens-aware next-step helper used in module pages.
- Planner, Knowledge, Writing, Archive, and All Motion each now bias Command Center toward different first moves instead of showing one generic command stack.

### Command Center Lens Guidance Verification

- corepack pnpm --filter web typecheck passes.
- corepack pnpm --filter web build passes.

### Activity Hub Launch Surface

- Activity Hub now includes a dedicated Lens Launch Surface section that promotes the current lens's primary next step above the replay stream.
- The hub also surfaces two secondary launch cards derived from the same lens-aware action set, so the page behaves more like a workstation console and less like a passive timeline.
- This keeps Activity Hub aligned with the newer Command Center and module-level replay context patterns.

### Activity Hub Launch Surface Verification

- corepack pnpm --filter web typecheck passes.
- corepack pnpm --filter web build passes.

### Dashboard Today Focus Launch

- Dashboard Today Focus now includes a dedicated action card that connects the daily focus summary to the current replay lens.
- The homepage can now launch directly into the lens-aware next step while still offering a secondary Resume ... Lens action for broader hub re-entry.
- This brings Dashboard into the same console pattern already established in Activity Hub, Command Center, and module-level replay context panels.

### Dashboard Today Focus Launch Verification

- corepack pnpm --filter web typecheck passes.
- corepack pnpm --filter web build passes.

### Settings Replay Habit

- Settings now exposes a dedicated Default Replay Lens preference so the workstation has an explicit replay habit source instead of relying only on the last-used lens cookie.
- The implementation keeps this preference cookie-backed rather than Prisma-backed, which avoids reopening the Windows Prisma migration tail while still separating default lens from current lens memory.
- Saving the setting updates both the default replay cookie and the current activity-focus cookie so the shell, dashboard, command center, and activity hub immediately converge on the new preference.

### Settings Replay Habit Verification

- corepack pnpm --filter web typecheck passes.
- corepack pnpm --filter web build passes.

### Replay-Aligned Navigation

- The replay preference now influences module presentation, not just action links.
- Enabled modules carry a new replayAligned flag, derived from the default replay lens, and the shell navigation now lightly promotes that module without disturbing the core infrastructure ordering.
- Settings and Modules also surface this relationship in the UI with explicit copy such as Aligned with replay habit and Matches your default lens.

### Replay-Aligned Navigation Verification

- corepack pnpm --filter web typecheck passes.
- corepack pnpm --filter web build passes.

### Modules Replay Entry

- The Modules registry now surfaces replay-aware entry points instead of only describing module fit.
- A new Module Replay Habit panel summarizes the current default lens and lets the user jump straight into the current or default replay surface from the registry page.
- Each module card now includes a lens-aware replay entry such as execution, thinking, publishing, or history replay, so the registry doubles as a launch surface instead of only a settings page.

### Modules Replay Entry Verification

- corepack pnpm --filter web typecheck passes.
- corepack pnpm --filter web build passes.

### System Posture Navigation

- Settings and Modules now share a dedicated System Posture navigation band so they read as one continuous control surface instead of two disconnected admin pages.
- The shared nav connects replay habit editing, module registry control, and direct jumps back into the current or default replay lens.
- This keeps the system layer aligned with the broader workstation direction where replay posture, entry points, and module posture all reinforce each other.

### System Posture Navigation Verification

- corepack pnpm --filter web typecheck passes.
- corepack pnpm --filter web build passes.

### System Posture Snapshot

Implemented so far:

- dashboard, settings, and modules now share a reusable `SystemPostureSnapshotCard` so replay posture is summarized consistently instead of being implied by scattered controls
- the new server-side `getSystemPostureSnapshot` helper brings together the current replay lens, default replay habit, aligned module, visible module count, hidden module count, and locked shell count
- this gives the workstation a clearer system-state readout before the user changes module visibility or replay settings

### System Posture Snapshot Verification

- corepack pnpm --filter web typecheck passes.
- corepack pnpm --filter web build passes.

### Posture-Aware Hints

Implemented so far:

- the workstation now derives posture-aware hint copy from the current or default replay lens instead of showing the same system guidance on every surface
- dashboard, settings, and modules all feed their posture snapshot through shared lens-aware hint logic, so each page now explains the shell posture from its own role
- this keeps the system layer more directional without introducing another source of replay state

### Posture-Aware Hints Verification

- corepack pnpm --filter web typecheck passes.
- corepack pnpm --filter web build passes.

### Shell Posture Chip

Implemented so far:

- the shared shell header now exposes a compact Current Posture strip directly under the search and replay entry area
- this chip surfaces the current lens, default replay habit, aligned module, and a direct jump to replay-habit tuning without requiring the user to enter Dashboard, Settings, or Modules first
- the shell now reinforces the replay/system posture model at the highest-frequency entry point in the app

### Shell Posture Chip Verification

- corepack pnpm --filter web typecheck passes.
- corepack pnpm --filter web build passes.

### Desktop Console

Implemented so far:

- the left shell sidebar now includes a dedicated Desktop Console section aimed specifically at desktop-web usage rather than narrow-screen compromise
- this console keeps the current lens, aligned module, next-step launch, resume-lens entry, and replay-habit tuning within permanent reach in the shell chrome
- the workstation shell now behaves more like a desktop control surface instead of only a route list plus header search

### Desktop Console Verification

- corepack pnpm --filter web typecheck passes.
- corepack pnpm --filter web build passes.

### Command Center Workbench

Date: 2026-04-04

The desktop-first Command Center has been reshaped into a more explicit workbench surface when no query is present.

Implemented changes:

- `/search` empty state now renders a `Desktop Workbench` layout instead of only a flat command grid
- command results are split into `Primary Launch`, `Desk Shortcuts`, `Context Rails`, `Replay Surface`, and `Workspace Navigation`
- the top lens-aware command is now treated as the primary launch card for the desk
- contextual commands remain visible as a dedicated rail so warm note/draft/task re-entry stays close
- existing search-result mode remains intact for non-empty queries

Primary file changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Workbench Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

A follow-up browser regression should confirm the new desktop workbench sections render in authenticated page HTML.

Live page regression completed on a local authenticated production instance.

- verified `/search` returned `200`
- confirmed `Desktop Workbench` rendered in page HTML
- confirmed `Primary Launch`, `Desk Shortcuts`, `Context Rails`, `Replay Surface`, and `Workspace Navigation`
- temporary regression log saved to `tmp-command-workbench-regression.txt`

### Command Center Aligned Module Rail

Date: 2026-04-04

The desktop Command Center now includes an `Aligned Module Rail` that reflects the current system posture instead of behaving like a generic command board.

Implemented changes:

- `/search` now reads the shared system posture snapshot alongside the replay re-entry state
- the empty-state workbench now includes an `Aligned Module Rail`
- the rail highlights the currently aligned module and surfaces up to three module-specific launch paths
- the header badges now show both `Last Replay Lens` and `Aligned Module`
- existing search-result mode remains unchanged for non-empty queries

Primary file changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Aligned Module Rail Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a fresh authenticated production instance (`3032`).

- verified `/search` returned `200`
- confirmed `Aligned Module Rail` rendered in page HTML
- confirmed aligned-module badge and rail copy appeared in the authenticated page
- temporary regression log saved to `tmp-command-rail-regression.txt`

### Command Center Module Command Stacks

Date: 2026-04-04

The desktop Command Center now includes module-specific action stacks so the desk can be entered by module posture instead of only by global command ordering.

Implemented changes:

- `/search` empty-state workbench now includes `Module Command Stacks`
- the desk surfaces dedicated stacks for `Planner`, `Knowledge`, `Writing`, and `Archive`
- each stack reuses existing command items and groups them by module launch path rather than introducing a separate command state source
- the new stacks preserve the desktop-workbench direction while making module-specific entry feel more intentional

Primary file changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Module Command Stacks Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a fresh authenticated production instance (`3033`).

- verified `/search` returned `200`
- confirmed `Module Command Stacks` rendered in page HTML
- confirmed `Planner Stack`, `Knowledge Stack`, `Writing Stack`, and `Archive Stack`
- temporary regression log saved to `tmp-command-stacks-regression.txt`

### Command Center Live Workspace Signals

Date: 2026-04-04

The desktop Command Center now includes a `Live Workspace Signals` strip so the desk can expose hot task, note, draft, and archive motion before any search begins.

Implemented changes:

- `/search` empty-state workbench now loads recent planner tasks, knowledge notes, writing drafts, and archive records
- the top of the desktop desk now renders `Live Workspace Signals`
- signals provide immediate re-entry actions such as `Open hottest task`, `Open freshest note`, and `Resume latest draft`
- this was implemented at the page layer by reusing existing module services instead of introducing a new signal service contract

Primary file changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Live Workspace Signals Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a fresh authenticated production instance (`3034`).

- verified `/search` returned `200`
- confirmed `Live Workspace Signals` rendered in page HTML
- confirmed `Execution Signal`, `Thinking Signal`, `Publishing Signal`, and `History Signal`
- temporary regression log saved to `tmp-command-signals-regression.txt`

Environment note:

- stale local `next start` instances exhausted PostgreSQL connections during the first regression pass
- stopping the old listeners on `3000`, `3032`, `3033`, and `3034` resolved the issue before rerunning the check

### Command Center Cross-Module Thread Picks

Date: 2026-04-04

The desktop Command Center now includes a `Cross-Module Thread Picks` strip so the desk can surface active work that already carries note and draft context.

Implemented changes:

- `/search` empty-state workbench now derives thread picks from linked planner tasks
- the desk surfaces up to three cross-module threads that already connect execution with knowledge or writing
- each thread card includes a task entry plus direct note and draft return links when present
- this was implemented at the page layer by reusing the existing linked-task data from `listPlannerTasks`

Primary file changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Cross-Module Thread Picks Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a fresh authenticated production instance (`3035`).

- verified `/search` returned `200`
- confirmed `Cross-Module Thread Picks` rendered in page HTML
- confirmed thread cards exposed `Open thread task`, `Note:`, and `Draft:` links
- temporary regression log saved to `tmp-command-threads-regression.txt`

### Command Center Focus Queue

Date: 2026-04-04

The desktop Command Center now includes a `Focus Queue` so the current replay lens can collapse the next few most relevant work items into a shorter decision surface.

Implemented changes:

- `/search` empty-state workbench now computes a lens-aware `Focus Queue`
- planner focus surfaces recent tasks, knowledge focus surfaces notes, writing focus surfaces drafts, archive focus surfaces durable records, and mixed focus prefers linked cross-module threads
- this was implemented at the page layer by reusing existing module summaries plus the already-derived cross-module thread picks

Primary file changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Focus Queue Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3040`).

- verified `/search` returned `200`
- confirmed `Focus Queue` rendered in page HTML
- confirmed queue heading, badge, queue label, and CTA content appeared in the authenticated page
- temporary regression log saved to `tmp-command-focus-regression.txt`

Environment note:

- repeated local `next start` instances again exhausted PostgreSQL connections during intermediate regression attempts
- stopping the listeners on `3037`, `3038`, and `3039` before starting a single clean `3040` instance resolved the issue

### Command Center Desk Briefing

Date: 2026-04-04

The desktop Command Center now includes a `Desk Briefing` so the current posture, queue pressure, live signals, and aligned module can be scanned as one high-level summary before diving into the lower sections.

Implemented changes:

- `/search` empty-state workbench now renders a top-level `Desk Briefing`
- the briefing summarizes the current replay lens, aligned module, focus queue pressure, live signals, and linked thread count
- the briefing surfaces one direct next-step CTA plus one aligned-module CTA so the desk can be used as a true launch surface
- this was implemented at the page layer by composing existing posture, queue, signal, and thread data

Primary file changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Desk Briefing Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a fresh authenticated production instance (`3041`).

- verified `/search` returned `200`
- confirmed `Desk Briefing` rendered in page HTML
- confirmed briefing title, status pills, and CTA content appeared in the authenticated page
- temporary regression log saved to `tmp-command-briefing-regression.txt`

### Command Center Desk Priority Ladder

Date: 2026-04-04

The desktop Command Center now includes a `Desk Priority Ladder` so the current replay lens can explicitly signal the order in which the desk should be read.

Implemented changes:

- `/search` empty-state workbench now renders a lens-aware `Desk Priority Ladder`
- the ladder ranks the most relevant surfaces for the current posture instead of leaving the desk layout visually flat
- this was implemented at the page layer by deriving an ordered list from the current replay lens

Primary file changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Desk Priority Ladder Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3043`).

- verified `/search` returned `200`
- confirmed `Desk Priority Ladder` rendered in page HTML
- confirmed ladder heading and priority guidance copy appeared in the authenticated page
- temporary regression log saved to `tmp-command-priority-regression.txt`

Environment note:

- stale local `next start` instances on `3040`, `3041`, and `3042` again exhausted PostgreSQL connections during the first regression attempt
- stopping them before running a single clean `3043` instance resolved the issue

### Command Center Section Priority Chips

Date: 2026-04-04

The desktop Command Center now carries section-level priority chips so the major desk surfaces visibly inherit the current `Desk Priority Ladder` instead of only being ranked in the summary block.

Implemented changes:

- `Focus Queue`, `Live Workspace Signals`, `Cross-Module Thread Picks`, `Aligned Module Rail`, and `Module Command Stacks` now render `Priority N` chips beside their section labels
- the ladder logic was expanded so these five core desk surfaces are always ranked, with the order still changing by replay lens
- this keeps the desktop workbench visually consistent and makes the desk order obvious without scanning the ladder first

Primary file changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Section Priority Chips Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3048`).

- verified `/search` returned `200`
- confirmed `Desk Priority Ladder` rendered in page HTML
- confirmed all five core desk sections rendered a nearby `Priority` chip in the authenticated page
- temporary regression log saved to `tmp-command-priority-chips-regression.txt`

### Command Center Desk Curation Hints

Date: 2026-04-04

The desktop Command Center now includes section-level curation hints so each major desk surface explains whether it belongs in the active reading lane or can stay in reserve.

Implemented changes:

- added a shared `getDeskSectionCurationCopy` helper in the `/search` page layer
- `Focus Queue`, `Live Workspace Signals`, `Cross-Module Thread Picks`, `Aligned Module Rail`, and `Module Command Stacks` now render a small posture-aware hint below the section header
- the hints translate the current replay lens into clearer desk-reading guidance without adding client-side state

Primary file changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Desk Curation Hints Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3049`).

- verified `/search` returned `200`
- confirmed all five core desk sections rendered a curation hint in the authenticated page HTML
- temporary regression log saved to `tmp-command-curation-regression.txt`

### Command Center Desk Density Control

Date: 2026-04-04

The desktop Command Center now supports a server-rendered `comfortable / compact` density switch so the desk can stay broad during exploration or tighten itself for denser workstation sessions.

Implemented changes:

- `/search` now reads a `density` query parameter and normalizes it into `comfortable` or `compact`
- the command desk header now exposes a `Desk Density` control with two server-rendered modes
- compact density trims the number of displayed items across `Focus Queue`, `Live Workspace Signals`, `Cross-Module Thread Picks`, `Desk Shortcuts`, `Context Rails`, `Aligned Module Rail`, and `Module Command Stacks`
- the density mode is preserved in the generated `/search` links so it can be re-entered directly

Primary file changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Desk Density Control Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3050`).

- verified `/search` returned `200` in comfortable mode
- verified `/search?density=compact` returned `200` in compact mode
- confirmed the `Desk Density` control rendered both `Comfortable` and `Compact`
- confirmed the compact-mode helper copy rendered in the authenticated page
- temporary regression log saved to `tmp-command-density-regression.txt`

### Command Center Density Memory

Date: 2026-04-04

The desktop Command Center now remembers the last chosen desk density instead of depending entirely on a `density` query parameter.

Implemented changes:

- added shared search-density helpers in `apps/web/src/lib/search-density.ts`
- `/search` now falls back to the persisted density cookie when no explicit `density` param is present
- added `GET /search/density` to explicitly write the density cookie and redirect back to `/search`
- the `Desk Density` control now uses the dedicated density route so compact/comfortable changes persist across later re-entry

Primary files changed:

- `apps/web/src/lib/search-density.ts`
- `apps/web/src/app/search/page.tsx`
- `apps/web/src/app/search/density/route.ts`
- `apps/web/middleware.ts`

### Command Center Density Memory Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3055`).

- verified visiting `/search/density?value=compact&next=/search` succeeded in the authenticated session
- verified a later plain `/search` request rendered the compact-density helper copy without needing a `density` query param
- temporary regression log saved to `tmp-command-density-memory-regression.txt`

### Command Center Module Stack Memory

Date: 2026-04-04

The desktop Command Center now remembers the last module command stack you pinned and surfaces it again on later `/search` re-entry.

Implemented changes:

- added shared module-stack helpers in `apps/web/src/lib/search-module-stack.ts`
- added `GET /search/stack` to explicitly persist the selected module stack and redirect back to `/search`
- `/search` now reads the remembered stack cookie and reorders `Module Command Stacks` so the remembered stack rises to the front
- the stack panel now shows a `Last Stack` control at the section header and a `Remembered Stack` badge on the remembered card
- each module stack card now exposes `Open ... Stack` and `Remember this stack` actions

Primary files changed:

- `apps/web/src/lib/search-module-stack.ts`
- `apps/web/src/app/search/stack/route.ts`
- `apps/web/src/app/search/page.tsx`

### Command Center Module Stack Memory Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3057`).

- verified pinning `Writing Stack` through `/search/stack?value=writing&next=/search` succeeded in the authenticated session
- verified a later plain `/search` request rendered both the top-level `Last Stack` control and the card-level `Remembered Stack` badge for `Writing Stack`
- verified the remembered stack rose to the front of the `Module Command Stacks` section
- temporary regression log saved to `tmp-command-stack-memory-regression.txt`

### Command Center Stack-Aware Launch

Date: 2026-04-04

The desktop Command Center now lets the remembered module stack shape the desk launch flow instead of only changing card order.

Implemented changes:

- extended the desk briefing so it explicitly reflects the remembered module stack and its warmest launch item
- let `Primary Launch` inherit the remembered stack's lead command when a stack has been pinned
- added a stack-aware secondary CTA so the launch hero can reopen the remembered stack directly
- pushed the remembered stack one step further into `Desk Shortcuts`, including a `Guided by ...` indicator and remembered-stack shortcut cards

Primary files changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Stack-Aware Launch Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3058`).

- verified pinning `Writing Stack` through `/search/stack?value=writing&next=/search` still succeeded in the authenticated session
- verified a later plain `/search` request rendered the `Remembered Writing Stack` briefing pill
- verified `Primary Launch` rendered `From Writing Stack` and a direct `Open Writing Stack` CTA
- verified the remembered stack now also guides `Desk Shortcuts`
- temporary regression log saved to `tmp-command-stack-launch-regression.txt`

### Command Center Remembered Stack Desk Shortcuts

Date: 2026-04-04

The desktop Command Center now lets the remembered module stack guide `Desk Shortcuts`, so a pinned workflow influences both the launch hero and the shortcut rail.

Implemented changes:

- added `buildRememberedStackShortcuts()` in `apps/web/src/app/search/page.tsx`
- dedupe desk shortcut entries by `href` before display so remembered-stack shortcuts can be merged in without noisy duplication
- surfaced a `Guided by ...` badge in the `Desk Shortcuts` panel
- promoted remembered stack shortcuts like `Open Writing Stack` into the desk shortcut lane

Primary files changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Remembered Stack Desk Shortcuts Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3066`).

- verified `/search` returned `200` after pinning `Writing Stack`
- verified the `Desk Shortcuts` panel rendered the `Guided by Writing Stack` chip
- verified remembered-stack shortcuts appeared in the shortcut lane, including `Open Writing Stack`
- verified the stack-aware desk state still rendered the `Remembered Writing Stack` briefing pill and the `From Writing Stack` primary-launch chip
- temporary regression logs saved to `tmp-command-shortcuts-stack-regression.txt` and `tmp-command-shortcuts-stack-snippets.txt`

### Command Center Remembered Workflow Strip

Date: 2026-04-04

The desktop Command Center now has a dedicated remembered-workflow strip near the top of `/search`, making the pinned module stack feel like a first-class re-entry lane instead of just a remembered preference.

Implemented changes:

- added a `Remembered Workflow` strip near the top of the no-query command desk in `apps/web/src/app/search/page.tsx`
- surfaced the remembered stack title, a direct `Open ... Stack` entry point, and a warm-action CTA for the remembered stack's lead command
- added a `Keep ... Stack` re-pin control so the workflow strip can reinforce the chosen module lane without sending the user down to the module stack section

Primary files changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Remembered Workflow Strip Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3068`).

- verified `/search` returned `200` after pinning `Writing Stack`
- verified the new `Remembered Workflow` section rendered near the top of the command desk
- verified the section rendered `Open Writing Stack`, `Keep Writing Stack`, and the remembered-workflow heading copy
- temporary regression logs saved to `tmp-command-remembered-workflow-regression.txt` and `tmp-command-remembered-workflow-snippets.txt`

### Command Center Remembered Workflow Priority

Date: 2026-04-04

The desktop Command Center now lets a pinned module stack influence the desk reading order instead of only affecting launch cards.

Implemented changes:

- expanded `buildDeskPriorityLadder()` in `apps/web/src/app/search/page.tsx` so it now accepts the remembered stack key and the aligned module key
- promoted `Module Command Stacks` higher in the desk priority order whenever a remembered workflow exists
- when the remembered workflow also matches the aligned module, the desk now lifts `Aligned Module Rail` and keeps both module-specific surfaces near the front of the reading lane
- wired the ladder call site to use the remembered stack cookie-derived module stack

Primary files changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Remembered Workflow Priority Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3069`).

- verified `/search` returned `200` after pinning `Writing Stack`
- verified the desk priority ladder promoted `Module Command Stacks` into the `Priority 2` lane
- verified the `Module Command Stacks` section copy moved into the active reading lane
- verified the `Aligned Module Rail` copy moved into reserve when the remembered workflow took precedence
- temporary regression log saved to `tmp-command-remembered-priority-regression.txt`

### Command Center Remembered Workflow Density Bias

Date: 2026-04-04

The desktop Command Center now lets the remembered workflow influence how dense or expansive the desk feels instead of treating density as a purely visual toggle.

Implemented changes:

- added a `densityCopy` branch in `apps/web/src/app/search/page.tsx` so the compact/comfortable helper text now reflects the remembered module stack when one is pinned
- expanded the remembered stack more aggressively inside `Module Command Stacks`, especially in comfortable mode, while compressing secondary stacks harder in compact mode
- widened `Desk Shortcuts` slightly when a remembered stack exists so the pinned workflow can keep more direct launch paths visible
- added stack-specific density guidance under `Module Command Stacks` to explain how compact versus comfortable mode is biasing the desk

Primary files changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Remembered Workflow Density Bias Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3070`).

- verified `/search` returned `200` in comfortable mode after pinning `Writing Stack`
- verified `/search?density=compact` returned `200` in compact mode after pinning `Writing Stack`
- verified the comfortable density helper copy now references the remembered stack
- verified the compact density helper copy now references the remembered stack
- verified the stack-lane bias copy rendered in both comfortable and compact modes
- temporary regression log saved to `tmp-command-density-bias-regression.txt`

### Command Center Remembered Workflow Carry-Through

Date: 2026-04-04

The desktop Command Center now carries the remembered workflow into the aligned rail itself instead of treating the pinned stack as a separate surface.

Implemented changes:

- expanded `getAlignedModuleRail()` in `apps/web/src/app/search/page.tsx` so it now accepts the remembered module stack
- when the aligned module matches the remembered workflow, the aligned rail now pulls remembered-stack actions in directly as `Remembered Lane` items
- when the aligned module differs from the remembered workflow, the aligned rail now adds a concrete re-entry path back into the pinned stack instead of silently dropping that context
- added an extra aligned-rail CTA so the user can jump back into the remembered stack without leaving the aligned rail surface

Primary files changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Remembered Workflow Carry-Through Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3072`).

- verified `/search` returned `200` after pinning `Writing Stack`
- verified `Aligned Module Rail` rendered `Remembered Lane` items
- verified the aligned rail rendered a `Re-enter Writing Stack` CTA
- verified the aligned rail description now explicitly mentions the remembered workflow return path
- temporary regression logs saved to `tmp-command-aligned-rail-carry-regression.txt` and `tmp-command-aligned-rail-carry-snippets.txt`

### Command Center Workflow Memory Briefing

Date: 2026-04-04

The desktop Command Center now surfaces the remembered workflow directly inside `Desk Briefing`, so the pinned stack is represented in the desk's high-level summary layer instead of only in lower launch surfaces.

Implemented changes:

- expanded `buildDeskBriefing()` in `apps/web/src/app/search/page.tsx` so it now carries remembered-workflow count and href metadata in addition to the title and warm action label
- added a `Workflow Memory` sub-card inside the `Desk Briefing` section
- surfaced the remembered stack title, warm action count, direct stack re-entry, and a `Resume warm action` CTA inside the desk briefing summary
- kept the implementation local to the command desk so the new remembered-workflow briefing rides on the same state source as the other desk surfaces

Primary files changed:

- `apps/web/src/app/search/page.tsx`

### Command Center Workflow Memory Briefing Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3073`).

- verified `/search` returned `200` after pinning `Writing Stack`
- verified the `Workflow Memory` section rendered inside `Desk Briefing`
- verified the remembered-workflow heading copy rendered correctly
- verified the briefing rendered both `Open Writing Stack` and `Resume warm action`
- temporary regression log saved to `tmp-command-briefing-memory-regression.txt`

### Remembered Workflow Echo Outside Command Center

Date: 2026-04-04

The remembered workflow now echoes outside `/search`, so the pinned stack stays visible even when the user re-enters through the shell or dashboard.

Implemented changes:

- added `getRememberedWorkflowSummary()` in `apps/web/src/server/search/preferences.ts`
- expanded `apps/web/src/lib/search-module-stack.ts` with shared metadata for each remembered stack so shell and dashboard surfaces can render the same title, href, and summary without duplicating mappings
- updated `apps/web/src/components/shell/shell-layout.tsx` so the desktop console and header posture chip now show the remembered workflow and provide an `Open Workflow` path
- updated `apps/web/src/app/page.tsx` so the dashboard now includes a `Remembered Workflow` card above `Quick Actions`

Primary files changed:

- `apps/web/src/server/search/preferences.ts`
- `apps/web/src/lib/search-module-stack.ts`
- `apps/web/src/components/shell/shell-layout.tsx`
- `apps/web/src/app/page.tsx`

### Remembered Workflow Echo Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3076`).

- verified dashboard `/` returned `200` after pinning `Writing Stack`
- verified the dashboard rendered `Remembered Workflow` and the heading `Writing Stack is still shaping the desk`
- verified the shell posture chip rendered `Workflow Writing Stack`
- verified both shell and dashboard rendered remembered-workflow re-entry paths including `Open Workflow`
- temporary regression log saved to `tmp-remembered-workflow-echo-regression.txt`

### Dashboard Workflow-Aware Quick Actions

Date: 2026-04-04

The dashboard quick-action lane now responds to the remembered workflow instead of staying in a fixed static order.

Implemented changes:

- added a local `DashboardQuickAction` model and `buildDashboardQuickActions()` helper in `apps/web/src/app/page.tsx`
- the dashboard now derives its quick-action order from the remembered workflow key, latest note slug, and latest draft id
- added a `Biased to ...` chip above `Quick Actions` so the current action ordering explains itself
- promoted the remembered workflow's most relevant action into the emphasized dashboard button slot while keeping the rest of the lane available for broader re-entry

Primary files changed:

- `apps/web/src/app/page.tsx`

### Dashboard Workflow-Aware Quick Actions Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3078`).

- verified dashboard `/` returned `200` after pinning `Writing Stack`
- verified the dashboard rendered the `Biased to Writing Stack` chip above `Quick Actions`
- verified `Create New Draft` rose into the emphasized quick-action slot for the remembered writing workflow
- verified the dashboard still rendered the separate `Remembered Workflow` card alongside the workflow-aware quick-action lane
- temporary regression logs saved to `tmp-dashboard-workflow-actions-regression.txt` and `tmp-dashboard-workflow-actions-snippets.txt`

### Dashboard Workflow-Aware Module Highlights

Date: 2026-04-04

The dashboard module-highlight rail now responds to the remembered workflow instead of leaving every module card equally weighted.

Implemented changes:

- added a local `DashboardHighlightCard` model and `buildDashboardHighlights()` helper in `apps/web/src/app/page.tsx`
- the dashboard now derives its highlight ordering from the remembered workflow key while still respecting enabled module state
- the remembered workflow's module now rises to the front of the highlight rail
- the leading card now switches its eyebrow from `Core Module` to `Workflow Bias` and explains that it is currently leading the remembered workflow lane

Primary files changed:

- `apps/web/src/app/page.tsx`

### Dashboard Workflow-Aware Module Highlights Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3079`).

- verified dashboard `/` returned `200` after pinning `Writing Stack`
- verified the highlight rail rendered a `Workflow Bias` card
- verified the leading card description mentioned the remembered workflow lane
- verified the writing module remained present and bias-aware inside the highlight surface
- temporary regression log saved to `tmp-dashboard-highlight-bias-regression.txt`

### Dashboard Workflow-Aware Recent Streams

Date: 2026-04-04

The dashboard's lower recent-work streams now react to the remembered workflow instead of keeping every stream in a neutral fixed position.

Implemented changes:

- added `DashboardStreamKey`, `getDashboardStreamOrderClass()`, and `isWorkflowBiasedStream()` in `apps/web/src/app/page.tsx`
- the `Recent Tasks / Recent Drafts / Recent Notes / Recent Writing / Recent Archive` streams now receive workflow-specific ordering classes at the desktop breakpoint
- the stream that matches the remembered workflow now renders a `Workflow Bias` chip in its header
- this keeps the lower dashboard streams consistent with the remembered-workflow behavior already present in highlights, quick actions, and command surfaces

Primary files changed:

- `apps/web/src/app/page.tsx`

### Dashboard Workflow-Aware Recent Streams Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3080`).

- verified dashboard `/` returned `200` after pinning `Writing Stack`
- verified the dashboard rendered workflow-bias chips in the stream section
- verified `Recent Drafts` and `Recent Writing` remained present alongside the rest of the stream surface
- temporary regression log saved to `tmp-dashboard-stream-bias-regression.txt`

### Activity Hub Remembered Workflow Echo

Date: 2026-04-04

The Activity Hub now acknowledges the remembered workflow instead of acting only as a replay-lens surface.

Implemented changes:

- imported `getRememberedWorkflowSummary()` into `apps/web/src/app/activity/page.tsx`
- added a dedicated `Remembered Workflow` strip near the top of the hub so the pinned stack stays visible even while switching replay lenses
- extended `Lens Snapshot` copy so it now reminds the user which workflow is still pinned underneath the active lens
- extended the `Lens Launch Surface` with a lightweight pinned-workflow chip and `Return to workflow` action

Primary files changed:

- `apps/web/src/app/activity/page.tsx`

### Activity Hub Remembered Workflow Echo Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3082`).

- verified `/activity` returned `200` after pinning `Writing Stack`
- verified the hub rendered the `Remembered Workflow` section
- verified the hub rendered the remembered-workflow heading and the `Pinned Writing Stack` chip
- verified the hub rendered the `Return to workflow` path inside the launch surface
- temporary regression logs saved to `tmp-activity-workflow-echo-regression.txt` and `tmp-activity-workflow-echo-snippets.txt`

### Settings And Modules Remembered Workflow Messaging

Date: 2026-04-04

The remembered workflow now reaches the system-layer pages, so Settings and Modules no longer speak only in terms of replay habit and module alignment.

Implemented changes:

- imported `getRememberedWorkflowSummary()` into both `apps/web/src/app/settings/page.tsx` and `apps/web/src/app/modules/page.tsx`
- added a `Remembered Workflow` section to Settings so preference changes can be read against the currently pinned workflow lane
- added a `Remembered Workflow` section to Modules so registry choices can be evaluated against the workflow the user is actively preserving
- updated module replay-fit messaging so the matching module can explicitly say `Matches remembered workflow`

Primary files changed:

- `apps/web/src/app/settings/page.tsx`
- `apps/web/src/app/modules/page.tsx`

### Settings And Modules Remembered Workflow Messaging Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3083`).

- verified `/settings` returned `200` after pinning `Writing Stack`
- verified `/settings` rendered the remembered-workflow heading `Writing Stack is still shaping system posture`
- verified `/modules` returned `200` after pinning `Writing Stack`
- verified `/modules` rendered the remembered-workflow heading `Writing Stack is still active in the registry`
- verified `/modules` rendered the `Matches remembered workflow` fit state
- temporary regression log saved to `tmp-system-workflow-echo-regression.txt`

### Workflow-Aware Search Results Posture

Date: 2026-04-04

The search results state now carries remembered-workflow posture instead of reserving all workflow awareness for the empty command-desk state.

Implemented changes:

- imported `SearchResultGroup` into `apps/web/src/app/search/page.tsx` and added `orderSearchGroupsByWorkflow()` to lightly bias module-group ordering toward the remembered workflow
- added `getSearchPostureCopy()` so the query state can explain how remembered workflow posture still relates to the current search
- added a `Search Posture` strip above query results whenever a search term is present
- added a `Workflow Bias` badge to the remembered-workflow module group in query results

Primary files changed:

- `apps/web/src/app/search/page.tsx`

### Workflow-Aware Search Results Posture Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3084`).

- verified `/search?q=draft` returned `200` after pinning `Writing Stack`
- verified the query results page rendered `Search Posture`
- verified the query results page rendered the remembered-workflow chip for `Writing Stack`
- verified the writing result group rendered `Workflow Bias`
- temporary regression log saved to `tmp-search-query-workflow-regression.txt`

### Settings And Modules Workflow Override

Date: 2026-04-04

The system-layer pages now let the user explicitly repin the remembered workflow instead of only observing whichever stack was last preserved elsewhere.

Implemented changes:

- expanded `apps/web/src/lib/search-module-stack.ts` with shared stack keys, stack-key guards, and `buildSearchModuleStackHref()` so system surfaces can generate workflow-pin links without duplicating route construction
- updated `apps/web/src/app/settings/page.tsx` with a dedicated `Workflow Override` section that lets the user pin any stack directly from Settings and optionally follow the currently aligned module stack
- updated `apps/web/src/app/modules/page.tsx` with a matching `Workflow Override` surface and per-module stack pin actions for `Planner`, `Knowledge`, `Writing`, and `Archive`
- this makes remembered workflow a first-class system control, not only a side effect of command-desk behavior

Primary files changed:

- `apps/web/src/lib/search-module-stack.ts`
- `apps/web/src/app/settings/page.tsx`
- `apps/web/src/app/modules/page.tsx`

### Settings And Modules Workflow Override Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live page regression completed on a clean authenticated production instance (`3085`).

- verified `/settings` returned `200`
- verified `/settings` rendered `Workflow Override`, `Pin workflow`, and `Keep pinned`
- verified `/modules` returned `200`
- verified `/modules` rendered `Workflow Override`, `Pin workflow`, and `Matches remembered workflow`
- temporary regression log saved to `tmp-system-workflow-override-regression.txt`

### Workflow Memory Reset And Clear State

Date: 2026-04-04

Remembered workflow can now be explicitly cleared, and the workstation now understands a true "no pinned workflow" state instead of silently falling back to planner bias.

Implemented changes:

- expanded `apps/web/src/lib/search-module-stack.ts` with nullable parsing, clear-cookie helpers, and `buildClearSearchModuleStackHref()`
- updated `apps/web/src/server/search/preferences.ts` so remembered workflow can now resolve to an inactive state with `No pinned workflow` copy instead of always normalizing to a stack key
- updated `apps/web/src/app/search/stack/route.ts` so `clear=1` removes workflow memory instead of re-pinning a fallback stack
- updated `Settings`, `Modules`, `Shell`, `Dashboard`, `Activity Hub`, and `/search` to render sensible copy and control paths when no workflow is pinned
- this turns workflow memory into a reversible system control instead of a one-way escalating bias

Primary files changed:

- `apps/web/src/lib/search-module-stack.ts`
- `apps/web/src/server/search/preferences.ts`
- `apps/web/src/app/search/stack/route.ts`
- `apps/web/src/app/settings/page.tsx`
- `apps/web/src/app/modules/page.tsx`
- `apps/web/src/components/shell/shell-layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/activity/page.tsx`
- `apps/web/src/app/search/page.tsx`

### Workflow Memory Reset And Clear State Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live regression completed on a clean authenticated production instance (`3086`).

- verified pinning `Writing Stack` from `/search/stack?value=writing&next=/settings`
- verified clearing workflow memory from `/search/stack?clear=1&next=/settings`
- verified `/settings` moved from the pinned writing heading to the no-pinned system-posture heading
- verified `/modules`, `/search`, `/`, and `/activity` all rendered their no-pinned workflow states after clearing
- temporary regression log saved to `tmp-workflow-clear-regression.txt`

### Workflow Memory Soft Suggestions

Date: 2026-04-04

The workstation now starts gently suggesting a workflow pin when no remembered workflow is active, instead of only dropping back to neutral posture with no guidance.

Implemented changes:

- updated `apps/web/src/app/search/page.tsx` so the command desk now shows a dedicated `Workflow Suggestion` surface whenever no workflow is pinned, including direct pin links for `Planner`, `Knowledge`, `Writing`, and `Archive`
- updated `apps/web/src/app/activity/page.tsx` so focused replay views can suggest pinning the current lens-aligned stack when that lens maps cleanly to a module lane
- updated `apps/web/src/app/page.tsx` so the dashboard keeps the neutral no-pinned state but exposes desk/open-command re-entry more clearly when workflow memory has been cleared
- updated `apps/web/src/app/settings/page.tsx` and `apps/web/src/app/modules/page.tsx` to surface a lightweight `Suggest ...` CTA when the current posture aligns cleanly to a stack lane

Primary files changed:

- `apps/web/src/app/search/page.tsx`
- `apps/web/src/app/activity/page.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/settings/page.tsx`
- `apps/web/src/app/modules/page.tsx`

### Workflow Memory Soft Suggestions Verification

Code-level verification completed:

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

Live regression completed on a clean authenticated production instance (`3088`).

- verified the no-pinned `/search` desk rendered `Workflow Suggestion`
- verified the no-pinned `/search` desk rendered explicit pin actions including `Pin Writing Stack`
- verified `/activity?focus=writing` rendered `Workflow Suggestion`
- verified the dashboard remained in the neutral no-pinned state with command-desk re-entry available
- note: `Settings` and `Modules` suggestion CTAs are posture-dependent and did not render under the current neutral seeded posture
- temporary regression log saved to `tmp-workflow-suggestions-regression.txt`

### Writing Delivery Polish
- Writing was reshaped from a module overview into a real writing control surface.
- The Writing index now distinguishes between the publish queue, live maintenance lane, and note-seeded source lane.
- Draft cards now expose live article links and source-note context directly.
- Published post cards now expose source draft management and version-memory context.
- Draft detail pages now include a Draft Control section covering save state, source context, and live article status.
- Published article pages now include a Published Management section with source draft/source note return paths and revision memory.

### Writing Delivery Polish Verification
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

### Planner Delivery Polish
- Planner now includes a real planning surface instead of only a recent-task feed.
- Added a Planning View with three lanes: Today, This Week, and Overdue pressure points.
- The planning lanes reuse live scheduling and due-date data, and keep note/draft context visible inside planning cards.
- This gives the planner a clearer daily and weekly planning role for the first deliverable.

### Planner Delivery Polish Verification
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

### Deliverable Regression Sweep
- Found and fixed a real desk-shell regression in `/search`: repeated `Suggested lane` UI fragments had been left behind by earlier command-desk iterations.
- Cleaned the duplicate JSX blocks in `Desk Shortcuts`, `Module Command Stacks`, and query-state `Search Posture` so each desk hint only renders once.

### Deliverable Regression Sweep Verification
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`
- Unified remembered-workflow CTA copy across Dashboard, Activity, Settings, Modules, and Shell so no-pinned states now consistently say `Open Command Desk` instead of leaving stale `Open Workflow` labels behind.

### Deliverable Mock Cleanup
- Writing mock content is no longer the implicit default path. Writing mocks now only appear when `USE_WRITING_MOCKS=true` is explicitly enabled.
- Updated Writing UI copy so the module now describes real database-backed publishing instead of mixing live delivery language with seeded mock references.
- Updated `.env.example`, local `.env`, and setup notes to default the workstation back to the real writing flow.

### Deliverable Mock Cleanup Verification
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`
- Cleaned delivery-facing copy in the sign-in and new-draft surfaces so they no longer speak in early-pass or development-shortcut language.
- Sign-in now describes the product as a private single-user workstation instead of a first-pass auth integration.
- New Draft now describes rich-media drafting and note-linked publishing directly, without calling itself an intentionally simple first surface.
- Fixed a Writing page regression where `Recent Entries` became an empty block whenever only the featured post existed; the page now shows a proper empty-state message in that case.
- Removed more delivery-facing roadmap language from user-visible writing surfaces, replacing `Phase 1` phrasing with product-facing descriptions.
- Smoothed delivery-facing empty-state copy across Dashboard, Planner, Knowledge, and Activity Hub so the app now speaks in more product-facing language instead of roadmap or activation metaphors.
- Kept the behavior unchanged while making first-run and low-data states feel less like internal development checkpoints.

### Deliverable Stability Follow-up
- Hardened the writing creation flow so malformed draft payloads no longer fall through to unhandled errors.
- `createWritingDraftAction` now redirects back to the draft form with a stable `create-failed` error instead of leaking validation failures into a server error state.
- `/api/writing/drafts` now parses JSON and multipart payloads inside a guarded `try/catch`, so malformed `content` JSON returns a controlled `400` response.
- Smoothed a few remaining delivery-facing strings: Writing live-feed empty state, Knowledge note creation copy, and media upload validation messages no longer speak in roadmap or internal milestone language.
- Renamed residual `/search` lane hints from `Suggested lane` to `Aligned lane` and removed the extra duplicate chip in the primary launch surface.

### Deliverable Stability Follow-up Verification
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`
- Fixed a real encoding regression in the published Writing detail page where a malformed apostrophe character leaked into the revision-memory card.
- Reworked the new-task entry surface so it no longer opens with canned demo content. It now starts clean, or seeds a concise task title/description only when entered from a linked note or draft.
- Smoothed remaining delivery-facing copy across Writing, Knowledge, and Planner so module descriptions no longer speak in terms of internal pipelines or verification steps.
- Fixed a real planner UI encoding regression in the Planning View `Today` lane.
- Reworked the new-draft entry surface so it no longer opens with demo media content. It now starts with a clean valid starter paragraph, or a note-derived seed when launched from Knowledge.
- This also removed a hidden form-validity problem where the default draft JSON contained an empty paragraph that failed validation on submit.
- Fixed a real new-draft failure feedback gap: `/writing/new` now surfaces `create-failed` instead of silently reloading after a rejected submission.
- Updated the writing draft API form branch to carry `sourceNoteSlug`, so note-origin context is preserved consistently across server actions and API submissions.
- Reworked the new-note entry surface so it now starts from a clean valid note seed instead of demo content, matching the more production-ready Planner and Writing entry flows.
- Added `activity` to the settings-module whitelist so module toggles and validation now match the real registered module set.
- Hardened `/search/stack` and `/search/density` by constraining `next` redirects to same-origin relative paths, removing an open-redirect edge in the command-desk preference routes.
- Replaced a few more user-facing technical phrasings in Planner, Writing, Knowledge, Activity Hub, and Settings so first-deliverable feedback no longer talks about raw database state or internal milestone language.
- Settings fallback profile text is now neutral (`Workspace Owner` / `Private Workstation`) instead of hard-coding a personal name when no explicit profile has been saved yet.
- Corrected the settings module-toggle whitelist so `activity` is now treated as a first-class registered module instead of being rejected by the settings action layer.
- Updated the app-wide metadata title from the old personal placeholder to `Komorebi Personal Workstation`.
- Fixed a real Dashboard delivery gap: the workflow-aware recent streams feature was previously only defined in helper functions, but never applied to the actual stream cards.
- Recent Tasks, Recent Drafts, Recent Notes, Recent Writing, and Recent Archive now use the remembered-workflow ordering classes and show a visible `Workflow Bias` chip when that stream is the active biased lane.
- This makes the dashboard's lower workspace streams finally behave consistently with the remembered-workflow bias already used in quick actions and highlight cards.

### Dashboard Workflow Stream Verification
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`
- Fixed a real authentication re-entry gap: unauthenticated page requests now preserve the intended in-app destination instead of always falling back to `/` after sign-in.
- Middleware now redirects protected page requests to `/sign-in?callbackUrl=...`, the sign-in form carries that callback forward, and successful or failed sign-in attempts both preserve the same safe relative callback path.
- The sign-in callback is constrained to same-origin relative paths, matching the earlier hardening work done for command-desk preference routes.

### Sign-In Re-entry Verification
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`
- Hardened the archive favorite action so the `collection` callback state is now normalized before redirecting back into `/archive`.
- This removes a parameter-reflection edge where arbitrary `collection` input could distort archive feedback and filter-state redirects even though the page itself already normalized the filter.

### Archive Favorite Action Verification
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`
- Fixed a real command-desk re-entry inconsistency: the `Workspace Navigation` surface in `/search` was still hard-coded to `/activity`, bypassing the saved replay re-entry path.
- That entry now follows `activityReentry.href`, so the command desk returns to the correct replay lens instead of silently dropping users back into the generic hub view.

### Search Re-entry Verification
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`
- Hardened module-toggle redirects in the settings action layer. `toggleModuleEnabledAction` no longer trusts arbitrary `returnTo` values and now only redirects back to `/settings` or `/modules`.
- This matches the callback hardening already applied to sign-in and command-desk preference routes, and removes another parameter-driven redirect edge from the system layer.

### Module Toggle Redirect Verification
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`
- Hardened `/modules` feedback handling so the page no longer reflects arbitrary `updated` query values back into the success banner.
- The modules registry now resolves the updated module label against the real per-user module snapshot before rendering feedback, and ignores unknown error values instead of surfacing them blindly.

### Modules Feedback Verification
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`
- Hardened `/settings` feedback handling to match `/modules`. The page no longer reflects arbitrary `updated` query values and now resolves module-update feedback against the real per-user module snapshot.
- Unknown `error` values are ignored instead of surfacing as generic system-change failures.

### Settings Feedback Verification
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`
- Replaced remaining internal navigation anchors in `/settings` and `/modules` with `next/link` links.
- Those pages were still using raw `<a>` tags for many in-app transitions, which caused full-page reloads and made system-control flows feel inconsistent with the rest of the App Router shell.

### System Navigation Consistency Verification
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`
- Hardened the sign-in page so it only reacts to the known `invalid-credentials` query state instead of treating any `error` value as an authentication failure.
- Tightened the new-task entry surface so invalid `note` or `draft` query values no longer flow back into hidden form fields. The task form now only keeps linked-note or linked-draft values when they resolve against the real planner link options.

### Entry Surface Input Verification
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`
- Normalized success-banner query handling across core module pages. Writing, Knowledge, and published-article pages now require explicit `=1` markers for create/save/publish banners instead of treating any truthy query value as success.
- Planner edit and status-update redirects now also use explicit `edited=1` and `updated=1` markers, so the planner page no longer treats arbitrary non-empty query values as valid success states.

### Core Feedback State Verification
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`
- Unified Archive search-result metadata with Archive page copy. Search results no longer expose raw enum values like `POST` / `NOTE`; they now use the same user-facing labels as the archive surface (`Writing` / `Knowledge`).
- Ran a data-layer core-chain regression against the live PostgreSQL workspace and confirmed a real end-to-end linked chain exists: one note currently fans into 5 drafts, 3 published posts, 1 linked planner task, and 1 archive record, with published-draft linkage, draft-linked task context, and post-to-archive propagation all present.
- Note: page-level regression on a fresh detached local `next start` instance is still unstable under the current Windows process model, so this pass validated the deliverable chain at the database/application-data level while continuing to use type/build as compile-time guards.

### Search Copy Alignment Verification
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`
- Search Archive results now use the same user-facing source labels as the Archive page instead of leaking raw persistence enums.
- Data-layer regression confirmed a real `note -> draft -> post -> archive -> task` chain exists in the live workspace database.

### Stable Regression Instance
- Added dedicated Windows-friendly regression scripts:
  - `scripts/start-regression-web.ps1`
  - `scripts/status-regression-web.ps1`
  - `scripts/stop-regression-web.ps1`
  - `scripts/run-regression-web.ps1`
- Added root package scripts:
  - `pnpm regression:web:start`
  - `pnpm regression:web:status`
  - `pnpm regression:web:stop`
- Regression instances now use a pid file plus per-port logs under `tmp/`, instead of ad-hoc detached shell commands.
- Verified the start/status/http/stop lifecycle on port `3092`:
  - `READY:8284:3092`
  - `/sign-in` returned `200`
  - `STOPPED:8284`
  - final status returned `NOT-RUNNING`
### Core Route Regression
- Verified the Windows regression instance can now stay alive across repeated checks instead of dying immediately after startup.
- `corepack pnpm regression:web:start` held `READY` status across repeated checks on port `3090`.
- Authenticated page regression succeeded for the core deliverable surfaces in one live session:
  - `/`
  - `/knowledge/<note-slug>`
  - `/writing/drafts/<draft-id>`
  - `/writing/<post-slug>`
  - `/planner/<task-id>/edit`
  - `/archive`
  - `/search?q=<post-slug>`
- Content-level assertions also passed for the same chain:
  - note page exposes `Start Draft from Note`
  - note page exposes `Create Task from Note`
  - draft page exposes `Source Note`
  - draft page exposes `Draft Control`
  - post page exposes `Published Management`
  - archive page exposes user-facing `Knowledge/Writing` labels
- Unauthenticated access to `/planner` resolves to `/sign-in` and preserves the callback state in the returned sign-in HTML.

### Creation Chain Regression
- Ran a mixed create-path regression using the live authenticated HTTP flow for Writing and data-layer setup for the modules that still expose server actions only.
- Created a fresh knowledge note (`core-regression-note-*`), created a fresh draft against that note through `POST /api/writing/drafts`, published it through `POST /api/writing/drafts/[id]/publish`, then attached a fresh planner task to the same note/draft chain.
- Verified the newly created chain reached the expected pages and returned `200`:
  - `/knowledge/<new-note-slug>`
  - `/writing/drafts/<new-draft-id>`
  - `/writing/<new-post-slug>`
  - `/planner/<new-task-id>/edit`
  - `/archive`
  - `/search?q=Core%20Regression`
- Verified content-level chain signals on the newly created records:
  - planner edit page shows the linked note and linked draft values
  - search results show the new Knowledge, Writing, Planner, and Archive entries
  - archive includes the newly published post
- Verified the new published post created an archive record (`sourceType: POST`) in the live database.

### Replay Re-entry Regression
- Verified the replay-facing system pages keep their intended sections and re-entry links in an authenticated live session.
- Dashboard assertions passed:
  - `Recent Activity`
  - `Cross-Module Threads`
  - `Archive Signals`
  - Activity-hub re-entry CTA present
- Activity Hub assertions passed:
  - `Lens Launch Surface`
  - `Recent Activity`
  - `Work Threads`
  - `History Timeline`
- Archive assertions passed:
  - `Replay Context`
  - `Dashboard Activity`
  - `Planner Threads`
  - `History Timeline`
- Link-target assertions passed:
  - dashboard still links into `/activity`
  - activity sections link to `#recent-activity`, `#work-threads`, `#history-timeline`
  - archive replay navigation points back into the same activity anchors

### Delivery Closeout Documents
- Added `README.md` release-oriented overview for the current single-user workstation state.
- Added `docs/FIRST_DELIVERABLE.md` to define what is included in the first deliverable and what verification has already been completed.
- Added `docs/V1_BOUNDARY.md` to separate first-deliverable scope from Phase 2 work.


## V2 Chinese UI

As of 2026-04-04, V2 has started with a Simplified Chinese desktop UI adaptation pass.

Completed in this pass:

- global metadata switched to Chinese
- Chinese-capable fonts enabled in the main layout
- module registry labels and descriptions translated
- shell, sign-in, dashboard, planner, knowledge, writing, activity, search, settings, and modules received a first-pass Chinese UI adaptation
- corepack pnpm --filter web typecheck passed
- corepack pnpm --filter web build passed

Remaining V2 Chinese UI work:

- secondary create/edit/detail pages still need a consistency pass
- server-generated search/meta copy still needs a deeper Chinese terminology review
- a live regression pass should be run against the Chinese desktop UI before calling V2 complete


### V2 Chinese UI Follow-up

A second-pass Simplified Chinese UI adaptation has been completed for the main create, edit, detail, and form surfaces:

- knowledge new/detail/edit pages and form
- planner new/edit pages and form
- writing new/draft/article pages and form

Validation:

- corepack pnpm --filter web typecheck passed
- corepack pnpm --filter web build passed

Remaining V2 work now centers on live regression and terminology consistency rather than broad page coverage.


### V2 Stable Chinese Baseline
- V2 has been closed as a stable Chinese baseline rather than a fully translated pass.
- Stable Chinese UI coverage now includes shell/sign-in, settings, modules, activity hub, and the main planner/knowledge/writing surfaces plus most create/edit/detail/form pages.
- `apps/web/src/app/page.tsx` and `apps/web/src/app/search/page.tsx` are intentionally held on stable repository baselines for later manual browser-side review or a dedicated translation pass.
- Reason: repeated write-back instability on those two files under the current Windows + PowerShell replacement workflow.
- Validation at closeout: `corepack pnpm --filter web typecheck` passed and `corepack pnpm --filter web build` passed.

### Planner Duplicate Render Fix
- Fixed a duplicated top block on `apps/web/src/app/planner/page.tsx` where the replay-context section, feedback banner, create-task CTA, and overview cards were rendered twice.
- Root cause: the same JSX block existed twice in sequence on the planner page.
- Resolution: removed the second duplicated block and kept the planning-view section intact.
- Validation: `corepack pnpm --filter web typecheck` passed and `corepack pnpm --filter web build` passed.

### 2026-04-05 Create Success False Failure Fix
- Fixed a shared server-action bug where edirect() was called inside 	ry/catch blocks for knowledge, planner, writing, archive, and settings actions.
- Because Next.js edirect() throws a control-flow exception, successful creates/updates were being caught and rewritten into create-failed / save-failed style redirects even after the data had already been saved.
- Moved post-success edirect() calls outside the 	ry/catch blocks so only the actual service call is guarded.
- Verified with corepack pnpm --filter web typecheck and corepack pnpm --filter web build.


### 2026-04-05 English UI Baseline Restored
- Rolled the workstation UI back to the stable English baseline from V1 while preserving post-V1 bug fixes, including the server-action redirect fix and the planner duplicate-section fix.
- Restored app pages, shell, forms, and module labels from the V1 English source instead of continuing the partial Chinese UI rollout.
- Verified with corepack pnpm --filter web typecheck and corepack pnpm --filter web build.

