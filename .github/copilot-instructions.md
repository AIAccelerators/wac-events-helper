# Copilot Instructions for This Repository

## Build, Test, and Lint Commands
- No build, lint, or automated test suite is defined (single-file userscript project).
- Syntax check:
  - `node -c GetEvents.user.js`
- Single-test command:
  - Not applicable (no test runner or test files exist).
- Manual verification flow:
  1. Install/update by opening or dragging `GetEvents.user.js` into Tampermonkey.
  2. Open `https://wearecommunity.io/events`.
  3. Validate both flows: `Settings` (tag search/save/reset, group-series toggle) and `Get schedule` (fetch + modal render + copy).
- For releases, bump `@version` in the userscript header.

## High-Level Architecture
- Everything runs in one IIFE in `GetEvents.user.js` and initializes by calling `createUI()`.
- `createUI()` injects a fixed top panel with date range controls and two entry points:
  - `Settings` button -> settings modal
  - `Get schedule` button -> events modal and fetch pipeline
- Settings flow:
  - `createSettingsUIHtml()` renders markup only
  - `attachSettingsHandlers()` wires behavior after injection
  - `SettingsManager` persists values using Tampermonkey storage (`GM_getValue`/`GM_setValue`)
- Event flow:
  - `onFetch()` reads date inputs and opens a loading events modal
  - `fetchAllEvents()` paginates `/api/v2/events.json` using selected tags
  - `fetchAgenda()` fetches agenda per non-small event in parallel
  - `renderEvents()` chooses grouped vs ungrouped rendering and writes HTML to the events modal
- Modal subsystem:
  - `showModal(html, type)` handles modal creation, mode-specific header/buttons, drag behavior, and backdrop behavior
  - `updateModalContent()` updates content without rebuilding when modal type is unchanged

## Key Conventions

### API and data handling
- Use `gmGet(url)` for all network calls (Promise wrapper over `GM_xmlhttpRequest`).
- Tag search endpoint returns a plain array of strings, not an object.
- Event list pagination is controlled by API `limit`/`total` and `start` offsets.
- Talks are filtered to `is_speech` and bounded by selected date range.

### Rendering conventions
- Locale/date text uses hard-coded Ukrainian arrays (`UA_DAYS`, `UA_MONTHS`) and helper formatters; do not switch to `Intl`.
- Escape user/API-provided text with `escHtml()` before interpolation into HTML strings.
- Rendering is split by event type:
  - `renderSingle` for `size === 's'`
  - `renderTalk` / `renderSeriesGroup` for series agenda items
- Grouping behavior is user-configurable via `SettingsManager.getGroupSeries()`.

### Modal and UI behavior
- Modal type is tracked through `data-modal-type` (`settings` or `events`).
- If modal type changes, recreate modal; if type stays the same, update only content.
- Drag starts only from header non-button area; drag logic converts initial transform-based position to pixel `left/top`.
- Backdrop closes modal only when both mousedown and mouseup occur on backdrop (prevents accidental close during text selection).
- Copy button exists only in `events` modal and copies both `text/html` and `text/plain`.

### Project constraints and assistant context
- No package manager or framework; keep changes in vanilla JS/CSS inside `GetEvents.user.js`.
- Styling is done via `Object.assign(element.style, ...)` and `GM_addStyle`.
- Relevant assistant configs to align with:
  - `README.md` (installation/usage expectations)
  - `CLAUDE.md` (architecture and flow details)
  - `.claude/agents/ui-ux-designer.md` (UI/UX review expectations for modals and interactions)