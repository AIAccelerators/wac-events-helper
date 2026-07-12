# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A single-file **Tampermonkey userscript** (`GetEvents.user.js`) that runs on `wearecommunity.io/events` and fetches/renders a schedule of AI/ML community events in a draggable modal dialog.

No build system, no package manager, no dependencies. The `.user.js` file is installed directly into Tampermonkey by opening it in the browser.

## Development Workflow

- **Install/update:** Drag `GetEvents.user.js` into the Tampermonkey dashboard, or open it directly in Chrome/Firefox with Tampermonkey active.
- **Test:** Navigate to `https://wearecommunity.io/events` with Tampermonkey enabled.
- **Lint:** `npx eslint GetEvents.user.js` (flat config in `eslint.config.js`; the legacy `.eslintrc.json` is unused but kept in sync).
- **Version:** Bump `@version` in the userscript header when shipping a release — not for every individual fix or commit.
- **`@connect` directive:** Any new API domain must be added to `@connect` in the userscript header or `GM_xmlhttpRequest` calls to it will be blocked.

## Architecture

Everything lives in a single IIFE in `GetEvents.user.js`. On load, execution flows:

1. **UI Panel** (`createUI()`) — injects a fixed date-range panel at page top (stays visible during scroll).
   - Displays date inputs, "Get schedule" button, and "⚙ Settings" button.

2. **Settings Flow** — click "⚙ Settings":
   - Opens a draggable modal with tag search and selection checkboxes.
   - `SettingsManager` persists tag selection via `GM_getValue`/`GM_setValue` (key: `tm_selected_tags`).
   - Default tags: `["AI", "Artificial intelligence"]`.
   - Tag search queries `/api/v2/dictionaries/skills/search?search_query={query}` (returns array of strings).
   - Format selection also persisted via `GM_getValue`/`GM_setValue` (key: `tm_event_formats`); stored as key strings (e.g., `["ONLINE_ONLY"]`), not display strings.

3. **Events Flow** — click "Get schedule":
   - Opens a loading modal, then:
   - `fetchAllEvents(from, till)` — paginates `/api/v2/events.json` with user-selected tags; strips ad entries (`is_ad`) and non-numeric IDs.
   - For each non-small event: `fetchAgenda(id)` in parallel — appends `cf=<timestamp>` to bust CDN cache.
   - `renderEvents(events, agendaMap)` — dispatches to `renderSingle` (size `'s'`) or `renderSeries` (multi-day/conference). Event size dispatch: `event.size === 's'` → `renderSingle`; any other size → `renderSeries`.
   - Results rendered in an events modal with Copy (📋) and Close buttons.

### Modal System

- **Type tracking**: Each modal stores `data-modal-type` attribute (`'settings'` or `'events'`).
- **Smart recreation**: Same type updates content only (preserves drag listeners); different type closes and recreates with appropriate buttons/header.
- **Drag implementation**: Header draggable except on button areas. Converts CSS `transform` to pixel coords on first drag to avoid accumulation errors.
- **Button logic**: Close button always present; Copy button only for events modal. Drag prevents on button targets.

### Key conventions

- Code structure: constants + helper functions (lines ~1–150) live in **global scope** before the IIFE; everything else is inside `(function() { ... })()`. New helpers go in global scope; feature logic goes inside the IIFE.
- All inline styles must use `COLORS`, `SPACING`, and `BORDER_RADIUS` constants — never hardcode color/size values.
- All CSS classes injected via `GM_addStyle` use the `tm-` prefix (e.g., `tm-btn-primary`, `tm-spinner`) to avoid collisions with page styles.
- `LANGUAGE_FILTERS` — `BLOCKED_LANGUAGES` / `BLOCKED_CODES` constants control which events/talks are silently dropped (currently blocks Russian). The filter only applies when `_locale === 'uk'` and `SettingsManager.getIgnoreRussian()` is `true`; gate any new `isLanguageBlocked()` call site with `_locale !== 'uk' || !SettingsManager.getIgnoreRussian() || !isLanguageBlocked(...)`.
- `gmGet(url)` — wraps `GM_xmlhttpRequest` in a Promise; all network calls go through it.
- `parseTagCsv(text)` — global-scope helper; detects `tag` column (RFC 4180), falls back to one-per-line; returns deduplicated sorted `string[]`. Defined immediately before `createImportUIHtml()`.
- `updateModalContent(html)` — replaces `#tm-modal-content` innerHTML; use to swap in sub-modal views (e.g. import flow) while preserving the outer modal and its drag handler. Always call the matching `attach*Handlers()` immediately after.
- **File download pattern:** `Blob + URL.createObjectURL` + temp `<a>.click()` works in Tampermonkey for triggering CSV/file downloads; `URL.revokeObjectURL` immediately after.
- `buildArrayParam(name, values)` — encodes an array into repeated `&name%5B%5D=value` query params.
- `parseJSONSafe(stored, default, validator)` — safe JSON parse with fallback; used by `SettingsManager` getters.
- **`SettingsManager` defaults pattern:** `defaultsBtn.onclick` persists all settings to storage immediately (no Save click required) — any new setting added to the defaults handler must call `SettingsManager.setX(DEFAULT_X)` directly there, not just update the checkbox visual state.
- Date arrays (`UA_DAYS`/`UA_MONTHS`, `EN_DAYS`/`EN_MONTHS`) are hardcoded — `Intl` was rejected because Ukrainian requires genitive case. `fmtDate()` selects the pair via `_locale`.
- HTML generation separated from listener attachment (e.g., `createSettingsUIHtml()` + `attachSettingsHandlers()`).
- Avoid alignment-padded `=` (multiple spaces before `=` to align columns) — the IDE ESLint plugin (`.eslintrc.json`) flags `no-multi-spaces` even though the CLI flat config (`eslint.config.js`) does not. Use single spaces consistently.
- Rendering functions return HTML as array of strings, joined at the end with `\n` (e.g., `renderSeriesGroup()`, `renderSingle()`, `renderTalk()`).
- Language fallback: `talk.short_language || getLang(event)` (prefer talk's language, fall back to event's language).
- **Security:** All user content (titles, URLs, language values) must be escaped with `escHtml()` to prevent XSS.
- Helper functions that support rendering should be defined immediately before the rendering function that uses them.
- For conditional display logic (e.g., same language vs. mixed): use `if/else` branches within the rendering function, not separate render functions.

### Locale / i18n

- `_locale` — module-level `let` (`'en'|'uk'`), defaults to `'en'`. Set by `setLocale()` which reads `#languageDropdown` (`'Укр'` → `'uk'`, anything else → `'en'`).
- `setLocale()` must be the first call in every entry point (`createUI`, `onFetch`, `showSettingsModal`) before any rendering or label use.
- `STRINGS` constant holds all translatable UI strings under `en` and `uk` keys — both must have identical key sets. `t(key)` returns `STRINGS[_locale][key]` with `en` fallback.
- To add a new label: add it to **both** locale keys in `STRINGS`, then call `t('your_key')` at the use site.
- Avoid naming callback parameters `t` — it shadows the global `t()` helper (e.g. use `tag`, not `t`, in `.map()` callbacks).

### Format Constants (`EVENT_FORMATS` / `LEGACY_FORMAT_MAP`)

- `EVENT_FORMATS` keys (e.g., `'ONLINE_ONLY'`) are what gets stored and compared; values are locale string arrays (UA/EN/RU) used for API calls (`flatMap(key => EVENT_FORMATS[key])`). Include ALL locale variants — the WAC API filters by exact locale strings, so missing a language variant means no results when the site is in that language.
- Format display labels in the settings UI use `t('onlineOnly')` / `t('offlineWithStream')` — not `EVENT_FORMATS[KEY].at(0)` (which always returns the Ukrainian string). To add a new format, add its display label to `STRINGS` (both locales) and call `t()` at the checkbox site.
- `LEGACY_FORMAT_MAP` migrates old stored locale strings to key strings on first read in `getFormats()`.
- Co-locate `LEGACY_FORMAT_MAP` immediately after `EVENT_FORMATS` so migration stays near the definition.
- To add a new format: add a key/value to `EVENT_FORMATS` and extend `DEFAULT_FORMATS`.
