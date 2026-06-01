# AGENTS.md — Guide for Agentic Coders

This repository is a **single-file Tampermonkey userscript** (`GetEvents.user.js`, 1,061 lines) with refactored constants, helpers, and modular structure for maintainability.

---

## File Structure

```
GetEvents.user.js
├── Userscript Header (lines 1–18)
│   └── @version, @grant directives
│
├── GLOBAL SCOPE (lines 20–181) ⭐ IMPORTANT FOR SCOPE
│   ├── Constants (lines 20–60)
│   │   ├── COLORS (16 UI colors)
│   │   ├── SPACING (semantic token sizes)
│   │   ├── BORDER_RADIUS (radius values)
│   │   └── TIME_CONSTANTS (time calculations)
│   │
│   └── Helper Functions (lines 63–181)
│       ├── buildArrayParam() - URL encoding
│       ├── parseJSONSafe() - JSON with fallback
│       ├── isValidSpeechInRange() - date filtering
│       ├── settingsHeader() - template generator
│       ├── checkboxLabel() - template generator
│       ├── createDateInput() - template generator
│       ├── formatTimeRange() - time formatting
│       └── seriesEventLink() - template generator
│
├── IIFE Initialization (lines 183–211)
│   ├── GM_addStyle() - applies CSS using constants
│   └── createUI() - bootstraps the UI
│
├── SettingsManager (lines 213–361)
│   └── Persists user settings to GM storage
│
└── Module Functions (lines 363–1,061)
    ├── UI creation: createUI(), createSettingsUIHtml(), attachSettingsHandlers()
    ├── Data fetching: fetchAllEvents(), fetchAgenda(), gmGet()
    ├── Rendering: renderEvents(), renderCard(), renderSeriesGroup(), renderTalk()
    ├── Formatting: fmtDate(), fmtTime(), toInputDate(), escHtml()
    ├── Modal management: showModal(), updateModalContent(), closeModal()
    └── Utilities: toAPIDate(), pad(), getLang(), eventPageUrl()
```

---

## Build, Test, and Lint Commands

### Linting with ESLint ⭐ MANDATORY

```bash
# Install ESLint (one-time setup)
npm install eslint @eslint/js --save-dev

# Lint the script (run before commits)
npx eslint GetEvents.user.js

# Expected result: 0 errors, 0 warnings
```

**Critical ESLint Rules:**
- `no-unused-vars`: Catches scope issues and undefined references
- `no-dupe-keys`: Prevents duplicate object properties
- `no-undef`: Detects missing global constants
- All violations must be fixed BEFORE deployment

### Syntax Check

```bash
node -c GetEvents.user.js
```
Validates JavaScript syntax without execution.

### Manual Testing

1. **Install/update**: Drag `GetEvents.user.js` into Tampermonkey dashboard
2. **Navigate** to `https://wearecommunity.io/events`
3. **Validate flows**:
   - Settings: Click "⚙ Settings" → verify tag search, checkboxes, format filters
   - Get schedule: Enter dates → click "Get schedule" → verify events render
   - Copy: Click 📋 to copy formatted schedule
4. **Check browser console** for JavaScript errors
5. **Bump version** in `@version` header when releasing

---

## Preventing Scope Errors

### ⚠️ Common Mistake: Constants Inside IIFE

**❌ WRONG - Constants unreachable:**
```javascript
(function() {
    'use strict';
    const COLORS = { /* ... */ };  // ← Scoped to IIFE only!
    createUI();
})();

function createUI() {
    // ❌ ReferenceError: COLORS is not defined
    background: COLORS.WHITE
}
```

**✅ CORRECT - Constants in global scope:**
```javascript
// Global scope - accessible to all functions
const COLORS = { /* ... */ };
const SPACING = { /* ... */ };

// Helper functions in global scope
function buildArrayParam(name, values) { /* ... */ }

// IIFE for initialization only
(function() {
    'use strict';
    GM_addStyle(`...${COLORS.WHITE}...`);
    createUI();
})();

// Module functions - access global constants
function createUI() {
    // ✅ COLORS.WHITE is accessible
    background: COLORS.WHITE
}
```

### Scope Rules

1. **Global Scope** (outside IIFE):
   - All constants (COLORS, SPACING, etc.)
   - All helper functions
   - All main module functions (createUI, fetchAllEvents, etc.)
   - SettingsManager object

2. **IIFE Scope** (inside self-executing function):
   - Only `GM_addStyle()` call
   - Only `createUI()` initialization call
   - **Nothing else** – all other code must be global

3. **Why This Matters**:
   - Tampermonkey injects the script into page context
   - All functions must be accessible throughout script lifetime
   - Constants must be defined before helper functions that reference them
   - IIFE should only handle initialization, not contain business logic

---

## Code Style Guidelines

### JavaScript Conventions

- **Strict mode**: `'use strict';` in IIFE only
- **No external dependencies**: Vanilla JavaScript only
- **Indentation**: Tabs (not spaces)
- **Line length**: Keep under 100 chars when possible
- **Comments**: Use `// ─── Section ───` headers to separate logical blocks

### Naming Conventions

| Type | Pattern | Examples |
|------|---------|----------|
| Constants | `UPPER_SNAKE_CASE` | `COLORS`, `SPACING`, `TIME_CONSTANTS` |
| Functions | `camelCase` | `createUI()`, `buildArrayParam()` |
| Objects | `camelCase` | `SettingsManager`, `agendaMap` |
| CSS classes | `kebab-case` | `.tm-btn-primary`, `.tm-input-date` |
| IDs | `kebab-case` | `tm-panel`, `tm-settings-search` |
| Unused vars | `_` | `catch (_) { ... }` |

### Constants Organization

Always define constants before their usage:

```javascript
// 1. Define basic values
const COLORS = { /* ... */ };
const SPACING = { /* ... */ };
const BORDER_RADIUS = { /* ... */ };
const TIME_CONSTANTS = { /* ... */ };

// 2. Define helper functions that use constants
function settingsHeader(title) {
    return `<h4 style="color:${COLORS.DARK_GRAY};">...</h4>`;
}

// 3. IIFE initialization
(function() { /* ... */ })();

// 4. Main functions
function createUI() { /* ... */ }
```

### HTML & Styling

- **Color references**: Always use `COLORS.{NAME}`
- **Spacing references**: Always use `SPACING.{NAME}`
- **Border radius**: Always use `BORDER_RADIUS.{NAME}`
- **Time constants**: Always use `TIME_CONSTANTS.SECONDS_PER_DAY`

Example:
```javascript
// ✅ GOOD - Uses constants
const style = {
    color: COLORS.TEXT_GRAY,
    padding: `${SPACING.MD} ${SPACING.XL}`,
    borderRadius: BORDER_RADIUS.MEDIUM
};

// ❌ BAD - Hardcoded values
const style = {
    color: '#666',
    padding: '6px 16px',
    borderRadius: '6px'
};
```

### Error Handling

- **Network errors**: Wrap `gmGet()` calls in `.catch()`
- **JSON parsing**: Use `parseJSONSafe(value, defaultValue, validator)`
- **DOM queries**: Check element exists before accessing
- **HTML escaping**: Always use `escHtml()` for user/API text

Example:
```javascript
// ✅ GOOD - Proper error handling
const tags = parseJSONSafe(stored, DEFAULT_TAGS, p => Array.isArray(p));

// ❌ BAD - Uncaught exception risk
const tags = JSON.parse(stored);
```

---

## ESLint Configuration

### File: `.eslintrc.json` (if exists) or `eslint.config.js`

**Purpose**: Validate code structure and catch scope errors

**Critical Rules**:
- `no-unused-vars`: Must pass (constants/functions must be used)
- `no-dupe-keys`: Must pass (no duplicate object properties)
- `no-undef`: Must pass (all references must be defined)

**Pre-commit Checklist**:

```bash
# 1. Run ESLint
npx eslint GetEvents.user.js

# 2. Run syntax check
node -c GetEvents.user.js

# 3. Manual test in browser
# - Open https://wearecommunity.io/events
# - Check browser console for errors
```

**If ESLint fails**: Do NOT commit. Fix errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `is not defined` | Missing constant in global scope | Move constant outside IIFE |
| `is defined but never used` | Unused function/variable | Remove or suppress with comment |
| Duplicate key | Property defined twice | Remove duplicate |

---

## Refactoring & Maintenance

### Adding New Constants

1. Add to appropriate constant object near top of file
2. Update ESLint config if new global variable
3. Reference in functions via dot notation
4. Run `npx eslint` to verify

Example:
```javascript
const COLORS = {
    // ...existing colors...
    NEW_COLOR: '#xxx',  // ← Add here
};

// Reference in code
background: COLORS.NEW_COLOR
```

### Adding New Helper Functions

1. Define in global scope (lines 63–181 section)
2. Use existing constants if needed
3. Add comprehensive function signature
4. Reference from module functions
5. Run `npx eslint` to verify

Example:
```javascript
// ✅ Good location - global scope
function myNewHelper(param1, param2) {
    return `result with ${COLORS.WHITE}`;
}

// Use in module functions
function createUI() {
    const result = myNewHelper('a', 'b');
}
```

### Adding New Module Functions

1. Define after IIFE (lines 363+ section)
2. Can safely reference all global constants and helpers
3. Keep functions focused and reusable
4. Add JSDoc comments for clarity

Example:
```javascript
/**
 * Fetches and processes data
 * @param {string} url - The API endpoint
 * @returns {Promise<Object>} Processed data
 */
function fetchAndProcess(url) {
    return gmGet(url).then(data => {
        return parseJSONSafe(data, {}, v => !!v);
    });
}
```

---

## Key Functions and Responsibilities

| Function | Scope | Role |
|----------|-------|------|
| `COLORS` | Global | UI color palette (16 colors) |
| `SPACING` | Global | Semantic spacing tokens |
| `buildArrayParam()` | Global | URL parameter encoding helper |
| `parseJSONSafe()` | Global | Resilient JSON parsing |
| `isValidSpeechInRange()` | Global | Date range filtering |
| `SettingsManager` | Global | User preferences persistence |
| `createUI()` | Module | Main UI panel creation |
| `createSettingsUIHtml()` | Module | Settings modal markup |
| `attachSettingsHandlers()` | Module | Settings event wiring |
| `fetchAllEvents()` | Module | API events pagination |
| `renderEvents()` | Module | Event rendering dispatch |
| `showModal()` | Module | Modal creation & management |

---

### Event Grouping Behavior (Series Events)

**Goal**: Render series events with multiple talks on the same day as grouped blocks, not individually.

**Grouping Rules**:
1. **Single events (size 's')**: Always rendered as individual cards.
2. **Series events**: Grouped by (date, seriesId).
   - **1 talk from the series on a date:** Rendered as a single talk card (`renderTalk`).
   - **2+ talks from the series on the same date:** Rendered as grouped series card (`renderSeriesGroup`).
   - **Series on multiple dates:** Each (series,date) group renders separately.

**Example**:
- Series "AI Day" with 3 talks on June 3, 1 talk on June 4, 2 talks on June 6:
  - June 3: 1 group block with 3 bullet points
  - June 4: 1 single-talk card
  - June 6: 1 group block with 2 bullet points
  - All other events (or series with just 1 talk on a date) appear as individual cards.

**Output Format**:
- **Single talk:** `<date, time> | <series> | <talk title> | <language>`
- **Multiple talks:** `<date> | <series> | • <time>: <talk 1> | • <time>: <talk 2> | ... | <language>`

---

## Version Management

- **Current**: 0.2.0
- **Bump rules**:
  - Major (0.x.0): Breaking changes, full UI redesign
  - Minor (x.1.0): New features, refactoring
  - Patch (x.x.1): Bug fixes, style updates
- **Location**: Line 4 in userscript header (`@version`)

---

## Common Pitfalls to Avoid

| ❌ Mistake | ✅ Solution |
|-----------|----------|
| Defining constants inside IIFE | Define at global scope before IIFE |
| Hardcoded colors instead of COLORS.* | Always use constant references |
| Duplicate code between functions | Extract to helper function |
| Not running ESLint before commit | Make it part of pre-commit workflow |
| Missing HTML escaping | Always use `escHtml()` for user input |
| Comparing dates with `<` instead of `<=` | Use `TIME_CONSTANTS.SECONDS_PER_DAY` offset |
| Not checking element existence | Always null-check DOM queries |

---

## Useful References

- **ESLint Docs**: https://eslint.org/docs/latest/rules/
- **MDN**: JavaScript references for vanilla JS patterns
- **CLAUDE.md**: Architecture overview
- **README.md**: User-facing documentation
- **Tampermonkey API**: https://www.tampermonkey.net/documentation.php

