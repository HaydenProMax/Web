# Current Release Status

## Release Line

- Historical sealed baseline: `V6.1.0`
- Latest tagged stable release: `V9.0.0`
- Current post-release posture: stabilize production, keep UX light, and prepare the next iteration

## Current Product State

Hayden Garden is now in a stable single-user production state for desktop web usage.

Core modules in regular use:

- Planner / Todo
- Knowledge
- Writing
- Archive
- Search
- Settings

## Delivered Through V9.0.0

### Writing

- draft archive / restore support
- published article delete flow
- Markdown block support in the editor and preview
- better cover-image selection from uploaded media
- writing list cleanup and lighter overview cards
- draft and article management aligned with the published flow

### Planner / Todo

- Today / Upcoming / Done homepage structure
- quick add flow on the planner homepage
- direct task actions: Done, Start, Pause, Reopen
- archived task view
- active-task delete and archived-task permanent delete
- lighter task create / edit forms
- Done section collapsed by default
- focus filters: All / High / Doing
- simplified task card hierarchy and lighter completed-task presentation

### Knowledge

- knowledge list/detail/new/edit pages redesigned for a calmer document flow
- note editor is now Markdown-first instead of small-card first
- document-style editing replaces the earlier cramped block editing experience
- right-side preview is shorter and easier to scan
- fenced Mermaid blocks now render inline in preview

### Settings / Shell

- sidebar brand and identity flow refined around Hayden Garden
- profile editing now supports avatar upload and display-name updates
- workspace motto remains configurable and visible in the shell

### Product / Shell

- shell brand updated to Hayden Garden
- sidebar and shell copy simplified
- sign out moved into the shell navigation area
- Linux production deployment path verified

## Current Strengths

- end-to-end note -> draft -> publish flow is usable
- todo flow is practical for daily personal use
- Linux production deployment is running
- knowledge authoring is now much closer to real daily use
- the app now behaves like a real personal workstation rather than a prototype

## Current Priority Areas

- search depth and result ergonomics
- backup / restore posture
- cross-module linking polish
- production stability hardening

## Next In Line

- `V10.0` is planned around a new `Daily Check-in` module for repeatable habits
- architecture notes are tracked in `docs/V10_DAILY_CHECKIN_ARCHITECTURE.md`

## Recommended Re-entry Order

1. `README.md`
2. `docs/CURRENT_RELEASE_STATUS.md`
3. `docs/PROJECT_OVERVIEW.md`
4. `docs/FIRST_DELIVERABLE.md`
