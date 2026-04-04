# First Deliverable

## V1 Seal Status

V1 is sealed.

This means the first deliverable is now treated as feature-complete for the single-user desktop web goal, and no further feature work should be added to V1 unless it is required to preserve stability or close a release-blocking defect.

## Definition

This first deliverable is the desktop web version of a private single-user workstation.

It is considered complete when the workstation supports the core personal loops below without breaking module boundaries:

1. capture a note
2. turn a note into a draft
3. publish writing from a draft
4. let published writing and notes enter the archive
5. create planner tasks from notes and drafts
6. re-enter work through search, dashboard, archive, and activity hub

## Included Modules

- Dashboard
- Activity Hub
- Planner
- Knowledge
- Writing
- Archive
- Search / Command Center
- Settings
- Modules
- Auth

## Included Capability Set

### Auth and Shell

- single-user sign-in via Auth.js credentials
- protected routes
- sign-out
- request-scoped session access
- shell navigation
- desktop console
- system posture display

### Planner

- create task
- edit task
- status transitions
- planning view for today, this week, overdue
- link task to note
- link task to draft

### Knowledge

- create note
- edit note
- note detail page
- domains and tags
- filtered library views
- links into writing and planner
- archive linkage

### Writing

- create draft
- edit draft
- structured rich content
- image upload
- video embed blocks
- publish draft to post
- republish existing post
- source note linkage
- archive linkage

### Archive

- note-backed archive records
- post-backed archive records
- favorites
- history timeline
- links back to source pages

### Search and Replay

- global grouped search
- command center on empty query
- activity hub lenses
- dashboard recent activity
- work threads
- history timeline
- replay re-entry across dashboard, archive, and activity hub

## Verification Already Completed

### Compile-Time

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web build`

### Route and Flow Regression

- authenticated route regression for dashboard, knowledge, writing, planner, archive, activity, and search
- creation-chain regression for:
  - note -> draft
  - draft -> post
  - post -> archive
  - note/draft -> task
- replay re-entry regression for dashboard, activity hub, and archive
- unauthenticated redirect regression for protected pages and sign-in callback preservation

## Not Included In This Deliverable

- multi-user account system
- mobile-specific or narrow-screen polish
- advanced calendar scheduling UI
- reminders / notifications
- full rich editor ergonomics
- writing SEO / publication management suite
- backlinks graph and advanced knowledge tooling
- plugin marketplace / external module install flow

## Release Position

This deliverable is feature-complete for the single-user desktop web goal.

The remaining work is release hygiene:

- final documentation clarity
- final low-risk cleanup
- optional UX polish that does not change core behavior

From this point forward:

- V1 remains the frozen baseline
- bug fixes and regression fixes may still be applied to V1
- new feature depth should default to Phase 2
