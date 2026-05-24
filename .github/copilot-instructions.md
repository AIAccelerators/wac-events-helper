# Copilot Instructions for This Repository

## Build, Test, and Lint Commands
- **No build, test, or lint commands are present.**
- The project is a single-file Tampermonkey userscript (`GetEvents.user.js`).
- To update/test: Drag `GetEvents.user.js` into the Tampermonkey dashboard or open it in Chrome/Firefox with Tampermonkey enabled. Test at https://wearecommunity.io/events.
- Bump the `@version` in the userscript header for each release.

## High-Level Architecture
- **Single-file userscript**: All logic is in `GetEvents.user.js` as a self-invoking function.
- **UI Injection**: On page load, `createUI()` injects a fixed date-range panel (dates + "Get schedule" + "⚙ Settings" buttons) at the top center.
- **Settings**: `SettingsManager` manages persistent tag selection via `GM_getValue`/`GM_setValue`. Default tags: `["AI", "Artificial intelligence"]`.
- **User Flow**: 
  - Click "⚙ Settings" → Opens modal with tag search + dropdown with checkboxes → Save changes
  - Click "Get schedule" → Fetches events using selected tags, displays results in draggable modal
- **Network**: All API calls use `gmGet(url)`, a Promise wrapper for `GM_xmlhttpRequest`. Tag search uses `/api/v2/dictionaries/skills/search`.
- **Rendering**: Events are rendered using Ukrainian locale day/month arrays, not `Intl`.
- **Drag Logic**: Modal drag uses pixel coordinates resolved from CSS `transform` to avoid accumulation errors.

## Key Conventions
- **No dependencies or build system**: All code is vanilla JS/CSS in a single file.
- **All UI/UX logic is inline**: No external CSS, all styles are set via JS or inline.
- **Settings Manager**: Reusable pattern for persistent user settings. Currently used for tag selection; ready for locations, etc.
  - Access current tags: `SettingsManager.getTags()` (returns array or defaults)
  - Save tags: `SettingsManager.setTags(array)`
  - Reset to defaults: `SettingsManager.reset()`
- **Settings Modal Pattern**: Split functions for modal UI:
  - `createSettingsUIHtml()` generates HTML string
  - `attachSettingsHandlers()` attaches event listeners after DOM injection (ensures buttons work)
- **Date/locale**: Use hard-coded Ukrainian day/month arrays for display.
- **Testing**: Manual, via Tampermonkey in browser.
- **UI/UX review**: Use the `ui-ux-designer` Claude agent for expert feedback on modal dialogs, drag, and micro-UI.
- **Spec reference**: `initial-prompt.txt` contains the original Ukrainian-language requirements and a sample API response.

## AI Assistant Configs
- **Claude**: See `CLAUDE.md` for detailed project/architecture notes and conventions.
- **UI/UX agent**: `.claude/agents/ui-ux-designer.md` describes the UI/UX review workflow and constraints.

---

This file summarizes the architecture, workflow, and conventions for Copilot and other AI assistants. If you want to adjust these instructions or add coverage for other areas, let me know!