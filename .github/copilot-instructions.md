# Copilot Instructions for This Repository

## Build, Test, and Lint Commands
- **No build, test, or lint commands are present.**
- The project is a single-file Tampermonkey userscript (`GetEvents.user.js`).
- To update/test: Drag `GetEvents.user.js` into the Tampermonkey dashboard or open it in Chrome/Firefox with Tampermonkey enabled. Test at https://wearecommunity.io/events.
- Bump the `@version` in the userscript header for each release.

## High-Level Architecture
- **Single-file userscript**: All logic is in `GetEvents.user.js` as a self-invoking function.
- **Main UI Panel**: On page load, `createUI()` injects a fixed date-range panel (dates + "Get schedule" + "⚙ Settings" buttons) at the top center.
- **Two Modal Types**:
  - **Settings Modal** (type='settings'): Close button only (✕), header "⚙ Settings"
  - **Events Modal** (type='events'): Copy (📋) + Close buttons, header "⠿ Events"
- **Dynamic Tag Selection**: `SettingsManager` manages persistent tag selection via `GM_getValue`/`GM_setValue`. Default tags: `["AI", "Artificial intelligence"]`.
  - User clicks "⚙ Settings" → Settings modal opens
  - User searches tags via `/api/v2/dictionaries/skills/search?search_query={query}` endpoint
  - API returns array of strings: `["Ragas", "Ray", "GraphRAG", ...]`
  - User selects/saves → Persisted and used for event filtering
- **Event Flow**: Click "Get schedule" → Events modal opens with results, Copy button available
- **Network**: All API calls via `gmGet(url)` Promise wrapper for `GM_xmlhttpRequest`.
- **Rendering**: Events using Ukrainian locale day/month arrays (`UA_DAYS`, `UA_MONTHS`), not `Intl`.
- **Drag Logic**: Both modals draggable via header (except button areas). Converts CSS `transform` to pixel coords to avoid accumulation.

## Key Conventions

### Modal System
- **Type Tracking**: Each modal stores `data-modal-type` attribute ('settings' or 'events')
- **Smart Recreation**: 
  - Different type: Close old modal, recreate with new buttons/header
  - Same type: Update content only (preserves drag listeners)
- **Drag Implementation**:
  - Header has `cursor: 'move'` and `userSelect: 'none'`
  - Mousedown listener prevents drag on button targets
  - Fresh listeners for each modal instance (garbage collected when modal removed)
- **Button Logic**:
  - Close button: Always present
  - Copy button: Only for 'events' type
  - Buttons prevent drag when clicked: `if (e.target === closeBtn || (type === 'events' && e.target === copyBtn)) return;`

### Settings Manager (Reusable Pattern)
```js
SettingsManager.getTags()      // Returns saved tags or defaults
SettingsManager.setTags(array) // Persist tag selection
SettingsManager.reset()        // Revert to defaults
```
- Storage key: `'tm_selected_tags'` (JSON array)
- Default: `['AI', 'Artificial intelligence']`
- Ready for expansion: locations, languages, etc.

### Tag Search
- API endpoint: `https://wearecommunity.io/api/v2/dictionaries/skills/search`
- Response format: Direct array of strings (not nested object)
- Dropdown populates with checkboxes from response array

### Settings UI Generation
```js
createSettingsUIHtml()  // Returns HTML string (no listeners)
attachSettingsHandlers() // Attaches listeners after HTML injected (ensures functionality)
showModal(html, 'settings') // Opens modal with correct type/buttons
```

### Event Fetching
- `fetchAllEvents(from, till)` uses `SettingsManager.getTags()` for tag filtering
- Constructs dynamic tag parameters: `&tag%5B%5D=TagName`
- Paginates through API results

### Date/Locale
- Use hard-coded Ukrainian day/month arrays (`UA_DAYS`, `UA_MONTHS`)
- Format: `fmtDate(timestamp)` → "Понеділок, 24 травня 2026"

### Code Style
- No external dependencies, vanilla JS/CSS only
- All styles via `Object.assign(element.style, {...})` or inline
- No build system or package manager

## Testing & Maintenance
- **Manual testing**: Via Tampermonkey in browser at https://wearecommunity.io/events
- **Syntax check**: `node -c GetEvents.user.js`
- **UI/UX review**: Use `ui-ux-designer` Claude agent for modal dialogs, drag, micro-UI feedback
- **Reference**: `initial-prompt.txt` contains original Ukrainian spec and sample API responses

## AI Assistant Configs
- **Claude**: See `CLAUDE.md` for detailed project/architecture notes and conventions.
- **UI/UX agent**: `.claude/agents/ui-ux-designer.md` describes the UI/UX review workflow and constraints.

---

This file summarizes the architecture, workflow, and conventions for Copilot and other AI assistants. If you want to adjust these instructions or add coverage for other areas, let me know!