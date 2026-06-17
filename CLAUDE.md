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

Everything lives in a single IIFE in `GetEvents.user.js`. On load, execution flows:

1. **UI Panel** (`createUI()`) — injects a fixed date-range panel at page top (stays visible during scroll).
   - Displays date inputs, "Get schedule" button, and "⚙ Settings" button.

2. **Settings Flow** — click "⚙ Settings":
   - Opens a draggable modal with tag search and selection checkboxes.
   - `SettingsManager` persists tag selection via `GM_getValue`/`GM_setValue` (key: `tm_selected_tags`).
   - Default tags: `["AI", "Artificial intelligence"]`.
   - Tag search queries `/api/v2/dictionaries/skills/search?search_query={query}` (returns array of strings).

3. **Events Flow** — click "Get schedule":
   - Opens a loading modal, then:
   - `fetchAllEvents(from, till)` — paginates `/api/v2/events.json` with user-selected tags; strips ad entries (`is_ad`) and non-numeric IDs.
   - For each non-small event: `fetchAgenda(id)` in parallel — appends `cf=<timestamp>` to bust CDN cache.
   - `renderEvents(events, agendaMap)` — dispatches to `renderSingle` (size `'s'`) or `renderSeries` (multi-day/conference).
   - Results rendered in an events modal with Copy (📋) and Close buttons.

### Modal System

- **Type tracking**: Each modal stores `data-modal-type` attribute (`'settings'` or `'events'`).
- **Smart recreation**: Same type updates content only (preserves drag listeners); different type closes and recreates with appropriate buttons/header.
- **Drag implementation**: Header draggable except on button areas. Converts CSS `transform` to pixel coords on first drag to avoid accumulation errors.
- **Button logic**: Close button always present; Copy button only for events modal. Drag prevents on button targets.

### Key conventions

- `gmGet(url)` — wraps `GM_xmlhttpRequest` in a Promise; all network calls go through it.
- Dates displayed in Ukrainian locale using hard-coded day/month arrays (`UA_DAYS`, `UA_MONTHS`), not `Intl`.
- HTML generation separated from listener attachment (e.g., `createSettingsUIHtml()` + `attachSettingsHandlers()`).
- Rendering functions return HTML as array of strings, joined at the end with `\n` (e.g., `renderSeriesGroup()`, `renderSingle()`, `renderTalk()`).
- Language fallback: `talk.short_language || getLang(event)` (prefer talk's language, fall back to event's language).
- **Security:** All user content (titles, URLs, language values) must be escaped with `escHtml()` to prevent XSS.
- Helper functions that support rendering should be defined immediately before the rendering function that uses them.
- For conditional display logic (e.g., same language vs. mixed): use `if/else` branches within the rendering function, not separate render functions.
