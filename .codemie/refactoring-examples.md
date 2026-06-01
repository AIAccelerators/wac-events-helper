# GetEvents.user.js - Refactoring Examples

This document provides code examples showing how to eliminate the top duplications.

## 1. Color Palette Constants

### BEFORE (Current - scattered across file):
```javascript
// Line 31-32
border: 2px solid #ddd;
border-top-color: #0066cc;

// Line 249
background: '#fff',

// Line 251
border: '1px solid #ddd',

// Line 271, 276
color: '#666'

// ... 30+ more scattered color uses
```

### AFTER (Consolidated):
```javascript
// Add at top, after GM_addStyle()
const COLORS = {
    PRIMARY_BLUE: '#007bff',
    DARK_BLUE: '#0056cc',
    LINK_BLUE: '#0066cc',
    LIGHT_BLUE: '#e8f0fe',
    DARK_TEXT_BLUE: '#1a56db',
    
    WHITE: '#fff',
    OFF_WHITE: '#f9f9f9',
    LIGHT_GRAY: '#f5f5f5',
    MEDIUM_GRAY: '#e8e8e8',
    DARK_GRAY: '#999',
    TEXT_GRAY: '#666',
    BORDER_GRAY: '#e0e0e0',
    INPUT_BORDER: '#ccc',
    LIGHT_BORDER: '#ddd',
    VERY_LIGHT_BORDER: '#eee',
    
    ERROR_RED: 'red',
};

// Usage throughout:
Object.assign(panel.style, {
    background: COLORS.WHITE,
    border: `1px solid ${COLORS.LIGHT_BORDER}`,
});
```

**Impact:** Eliminates 40+ color string duplications. Single point of change for theme colors.

---

## 2. Input/Button Styling Constants

### BEFORE (Lines 272, 277, 292, 310, 422-423):
```javascript
// Date inputs (2 copies)
style="padding:4px 6px;border:1px solid #ccc;border-radius:4px;font-size:12px;"

// Buttons (multiple variants)
padding: '6px 16px'
padding: '6px 12px'
padding: '2px 8px'
border-radius: '6px' / '4px' / '8px' (inconsistent!)
```

### AFTER (Consolidated):
```javascript
const SPACING = {
    XS: '2px',
    SM: '4px',
    MD: '6px',
    LG: '8px',
    XL: '12px',
    XXL: '16px',
};

const BORDER_RADIUS = {
    SMALL: '4px',
    MEDIUM: '6px',
    LARGE: '8px',
};

const BUTTON_STYLES = {
    PRIMARY: {
        padding: `${SPACING.MD} ${SPACING.XL}`,
        background: COLORS.PRIMARY_BLUE,
        color: COLORS.WHITE,
        borderRadius: BORDER_RADIUS.MEDIUM,
        fontSize: '13px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: '600',
    },
    SECONDARY: {
        padding: `${SPACING.MD} ${SPACING.XL}`,
        background: COLORS.WHITE,
        color: COLORS.TEXT_GRAY,
        border: `1px solid ${COLORS.INPUT_BORDER}`,
        borderRadius: BORDER_RADIUS.MEDIUM,
        fontSize: '13px',
        cursor: 'pointer',
    },
    SMALL: {
        padding: `${SPACING.XS} ${SPACING.LG}`,
        borderRadius: BORDER_RADIUS.SMALL,
        background: COLORS.WHITE,
        cursor: 'pointer',
    },
};

const INPUT_STYLES = {
    DATE_INPUT: {
        padding: `${SPACING.XS} ${SPACING.SM}`,
        border: `1px solid ${COLORS.INPUT_BORDER}`,
        borderRadius: BORDER_RADIUS.SMALL,
        fontSize: '12px',
    },
    SEARCH: {
        padding: `${SPACING.MD} ${SPACING.LG}`,
        border: `1px solid ${COLORS.INPUT_BORDER}`,
        borderRadius: BORDER_RADIUS.SMALL,
        fontSize: '13px',
        boxSizing: 'border-box',
    },
};

// Usage:
Object.assign(getBtn.style, BUTTON_STYLES.PRIMARY);
Object.assign(settingsBtn.style, BUTTON_STYLES.SECONDARY);
fromLabel.innerHTML = `<span>Від:</span><input type="date" style="padding:${SPACING.XS} ${SPACING.SM};...">`;
```

**Impact:** Eliminates ~15 padding/radius/font-size duplications. Consistent spacing throughout.

---

## 3. Settings Header Template

### BEFORE (Lines 400, 405, 411 - 3 identical copies):
```javascript
// Line 400
<h4 style="font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#999;margin:0 0 12px 0;padding-bottom:8px;border-bottom:1px solid #e8e8e8;">Select Tags</h4>

// Line 405
<h4 style="font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#999;margin:16px 0 12px 0;padding-bottom:8px;border-bottom:1px solid #e8e8e8;">Display Options</h4>

// Line 411
<h4 style="font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#999;margin:16px 0 12px 0;padding-bottom:8px;border-bottom:1px solid #e8e8e8;">Event Format</h4>
```

### AFTER (Consolidated):
```javascript
// Add helper function
function settingsHeader(title, marginTop = '16px') {
    return `<h4 style="font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:${COLORS.DARK_GRAY};margin:${marginTop} 0 12px 0;padding-bottom:8px;border-bottom:1px solid ${COLORS.MEDIUM_GRAY};">${escHtml(title)}</h4>`;
}

// Usage in createSettingsUIHtml():
return `
    ${settingsHeader('Select Tags', '0')}
    <input id="tm-settings-search" type="text" ...>
    ...
    ${settingsHeader('Display Options')}
    <label>...</label>
    ...
    ${settingsHeader('Event Format')}
    <label>...</label>
`;
```

**Impact:** Eliminates 3 identical 110+ character HTML strings. Single point of styling.

---

## 4. Checkbox Label Template

### BEFORE (Lines 407, 413, 417 - 3 similar copies):
```javascript
// Line 407
<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:16px;">
    <input id="tm-settings-group-series" type="checkbox" ... style="cursor:pointer;">
    <span>Group series events</span>
</label>

// Line 413
<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:8px;">
    <input id="tm-format-online" type="checkbox" ... style="cursor:pointer;">
    <span>Тільки онлайн</span>
</label>

// Line 417
<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:16px;">
    <input id="tm-format-offline-stream" type="checkbox" ... style="cursor:pointer;">
    <span>Офлайн зі стрімом</span>
</label>
```

### AFTER (Consolidated):
```javascript
function checkboxLabel(text, id, isChecked, marginBottom = '16px') {
    return `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:${marginBottom};">
        <input id="${id}" type="checkbox" ${isChecked ? 'checked' : ''} style="cursor:pointer;">
        <span>${escHtml(text)}</span>
    </label>`;
}

// Usage:
return `
    ${settingsHeader('Select Tags', '0')}
    ...
    ${settingsHeader('Display Options')}
    ${checkboxLabel('Group series events', 'tm-settings-group-series', groupSeries)}
    
    ${settingsHeader('Event Format')}
    ${checkboxLabel('Тільки онлайн', 'tm-format-online', currentFormats.includes('Тільки онлайн'), '8px')}
    ${checkboxLabel('Офлайн зі стрімом', 'tm-format-offline-stream', currentFormats.includes('Офлайн зі стрімом'))}
`;
```

**Impact:** Eliminates 3 similar 200+ character HTML blocks. Consistency guaranteed.

---

## 5. Date Range Filter Helper

### BEFORE (Lines 642, 686 - exact duplicates):
```javascript
// Line 642 - Grouped mode
const talks = agendaData && agendaData.agenda && agendaData.agenda.items
    ? agendaData.agenda.items.filter(i => i.is_speech && i.date >= dateFromTs && i.date <= dateTillTs + 86400)
    : [];

// Line 686 - Ungrouped mode
const talks = items.filter(i => i.is_speech && i.date >= dateFromTs && i.date <= dateTillTs + 86400);
```

### AFTER (Consolidated):
```javascript
// Add helper constant for seconds-per-day
const SECONDS_PER_DAY = 86400;

// Add filter helper
function isValidSpeechInRange(talk, dateFromTs, dateTillTs) {
    return talk.is_speech && talk.date >= dateFromTs && talk.date <= dateTillTs + SECONDS_PER_DAY;
}

// Usage:
// Line 642 - Grouped mode
const talks = agendaData && agendaData.agenda && agendaData.agenda.items
    ? agendaData.agenda.items.filter(i => isValidSpeechInRange(i, dateFromTs, dateTillTs))
    : [];

// Line 686 - Ungrouped mode
const talks = items.filter(i => isValidSpeechInRange(i, dateFromTs, dateTillTs));
```

**Impact:** Eliminates duplicated filter logic. Bug fix only needed once. Named constant for magic number.

---

## 6. URL Parameter Mapper

### BEFORE (Lines 550, 556):
```javascript
// Line 550 - Tags
const tagParams = tags.map(t => `&tag%5B%5D=${encodeURIComponent(t)}`).join('');

// Line 556 - Formats
formatParams = formats.map(f => `&event_participation_format%5B%5D=${encodeURIComponent(f)}`).join('');
```

### AFTER (Consolidated):
```javascript
function buildArrayParam(para
