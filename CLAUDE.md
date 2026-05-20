# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A single-file **Tampermonkey userscript** (`GetEvents.user.js`) that runs on `wearecommunity.io/events` and fetches/renders a schedule of AI/ML community events in a draggable modal dialog.

No build system, no package manager, no dependencies. The `.user.js` file is installed directly into Tampermonkey by opening it in the browser.

## Development Workflow

- **Install/update:** Drag `GetEvents.user.js` into the Tampermonkey dashboard, or open it directly in Chrome/Firefox with Tampermonkey active.
- **Test:** Navigate to `https://wearecommunity.io/events` with Tampermonkey enabled.
- **Version:** Bump `@version` in the userscript header on each release.

## Architecture

Everything lives in a single IIFE in `GetEvents.user.js`. Execution flow:

1. `createUI()` — injects a fixed date-range panel into the page on load.
2. User clicks "Get schedule" → `onFetch()` reads dates, opens a loading modal, then:
   - `fetchAllEvents(from, till)` — paginates `wearecommunity.io/api/v2/events.json` (AI tag filter); strips ad entries (`is_ad`) and non-numeric IDs.
   - For each non-small event: `fetchAgenda(id)` in parallel — appends `cf=<timestamp>` to bust CDN cache.
3. `renderEvents(events, agendaMap)` — dispatches to `renderSingle` (size `'s'`) or `renderSeries` (multi-day/conference); falls back to event-level dates if agenda fetch failed silently.
4. Result injected into a draggable modal (`showModal` / `updateModalContent`).

### Key conventions

- `gmGet(url)` — wraps `GM_xmlhttpRequest` in a Promise; all network calls go through it.
- Dates displayed in Ukrainian locale using hard-coded day/month arrays (`DAYS_UK`, `MONTHS_UK`), not `Intl`.
- Drag logic resolves CSS `transform` to pixel coordinates on first drag to avoid accumulation errors.
- `initial-prompt.txt` contains the original Ukrainian-language spec with a sample API response — useful as a design reference.
