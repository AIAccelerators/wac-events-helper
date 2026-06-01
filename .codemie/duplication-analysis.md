# GetEvents.user.js - Code and Style Duplications Analysis

**File:** GetEvents.user.js  
**Total Lines:** 945  
**Analysis Date:** 2026-05-29

---

## Executive Summary

This analysis identified **27 distinct duplication patterns** across 8 categories. The most critical duplications are:
- **HIGH severity:** 10 patterns (3+ occurrences each)
- **MEDIUM severity:** 12 patterns (2 occurrences)  
- **LOW severity:** 5 patterns (similar but contextually different)

Total instances analyzed: **89 duplicated code segments**

---

## 1. CSS/Styling Duplications

### 1.1 Input Date Field Styling (HIGH - 2 occurrences)

**Lines:** 272, 277  
**Context:** `createUI()` - Date input fields  
**Duplication:**
```javascript
// Line 272 - "From" date input
`padding:4px 6px;border:1px solid #ccc;border-radius:4px;font-size:12px;`

// Line 277 - "Till" date input  
`padding:4px 6px;border:1px solid #ccc;border-radius:4px;font-size:12px;`
```
**Impact:** Both date inputs use identical inline styles. Can be extracted to a CSS class.  
**Occurrences:** 2

---

### 1.2 Label Wrapper Styling (HIGH - 2 occurrences)

**Lines:** 271, 276  
**Context:** `createUI()` - Date input labels  
**Duplication:**
```javascript
// Line 271
{ display: 'flex', alignItems: 'center', gap: '4px', color: '#666' }

// Line 276
{ display: 'flex', alignItems: 'center', gap: '4px', color: '#666' }
```
**Severity:** MEDIUM  
**Occurrences:** 2 (identical patterns)

---

### 1.3 Button Group Display Styles (MEDIUM - 2 occurrences)

**Lines:** 283, 854  
**Context:** `createUI()` and `showModal()` - Button container styling  
**Duplication:**
```javascript
// Line 283 - Main UI button group
{ display: 'flex', gap: '6px', alignItems: 'center' }

// Line 854 - Modal button group
{ display: 'flex', gap: '6px' }
```
**Note:** Line 283 includes `alignItems: 'center'` but Line 854 doesn't - subtle difference.  
**Occurrences:** 2 (similar with minor variance)

---

### 1.4 Button Padding Pattern (HIGH - 4 occurrences)

**Lines:** 293, 310, 422-423 (2), 850  
**Context:** Button styling across UI, settings, and modal  
**Duplication:**
```javascript
// Line 293 - Main "Get schedule" button
padding: '6px 16px'

// Line 310 - "Settings" button
padding: '6px 12px'

// Lines 422, 423 - Save/Reset buttons (both)
style="padding:6px 12px;..."

// Line 850 - Modal button style (used for close/copy buttons)
padding: '2px 8px' (in btnStyle object)
```
**Severity:** HIGH  
**Pattern:** `6px` vertical padding repeated 4 times with varying horizontal values  
**Occurrences:** 4

---

### 1.5 Border-Radius 4px (HIGH - 8+ occurrences)

**Lines:** 272, 277, 299, 316, 401-402, 422-423, 468  
**Context:** Date inputs, buttons, dropdown, settings elements  
**Duplication:**
```javascript
border-radius: '4px'  // Object.assign
border-radius: '6px'  // Line 299 (inconsistent)
border-radius:4px     // Inline (various lines)
```
**Severity:** HIGH (inconsistent even within file - some use 4px, some 6px)  
**Standardization Needed:** Yes  
**Occurrences:** 8+

---

### 1.6 Border Color Pattern: #ccc / #ddd (HIGH - 9 occurrences)

**Lines:** 251, 272, 277, 315, 401-402, 423, 470  
**Context:** Borders across inputs, dropdowns, buttons  
**Duplication:**
```javascript
border: '1px solid #ddd'      // Lines 251, 402
border: '1px solid #ccc'      // Lines 272, 277, 315, 401, 423, 867
borderBottom: '1px solid #eee' // Line 470
```
**Severity:** HIGH  
**Pattern Variants:** `#ccc`, `#ddd`, `#eee`  
**Occurrences:** 9+

---

### 1.7 Color: #666 (Text Color) (MEDIUM - 4 occurrences)

**Lines:** 271, 276, 314, 858  
**Context:** Text color for labels, buttons, close button  
**Duplication:**
```javascript
color: '#666'  // Repeated 4 times
```
**Severity:** MEDIUM  
**Occurrences:** 4

---

### 1.8 Font Size: 13px (MEDIUM - 5 occurrences)

**Lines:** 257, 300, 401, 422, 423, 850  
**Context:** Default font size for UI elements  
**Duplication:**
```javascript
fontSize: '13px'  // Repeated 5+ times
```
**Severity:** MEDIUM  
**Occurrences:** 5+

---

### 1.9 Font Size: 12px (MEDIUM - 4 occurrences)

**Lines:** 272, 277, 390  
**Context:** Input fields, chip spans  
**Duplication:**
```javascript
font-size:12px  // Inline styles, repeated 4 times
```
**Severity:** MEDIUM  
**Occurrences:** 4

---

### 1.10 Chip/Tag Styling (MEDIUM - 1 occurrence, but reused pattern)

**Line:** 390  
**Context:** `chipHtml()` - Styled inline tag chips  
**Pattern:**
```javascript
style="display:inline-block;background:#e8f0fe;color:#1a56db;padding:4px 12px;margin:4px 4px 4px 0;border-radius:12px;font-size:12px;"
```
**Note:** This pattern appears only once but is constructed as a reusable inline template.  
**Severity:** LOW (single occurrence, but internally consistent)  
**Occurrences:** 1 (reused via function)

---

### 1.11 Horizontal Rule Styling (MEDIUM - 2 occurrences)

**Lines:** 674, 707  
**Context:** `renderEvents()` - Separator between event cards  
**Duplication:**
```javascript
// Line 674 (grouped mode)
.join('<hr style="border:none;border-top:1px solid #ddd;margin:10px 0">')

// Line 707 (ungrouped mode)
.join('<hr style="border:none;border-top:1px solid #ddd;margin:10px 0">')
```
**Severity:** MEDIUM  
**Occurrences:** 2 (identical)

---

### 1.12 Modal Content Padding (LOW - 2 variants)

**Line:** 890  
**Context:** `showModal()` - Ternary for different padding based on modal type  
**Pattern:**
```javascript
padding: type === 'settings' ? '16px 16px 12px 16px' : '10px 12px'
```
**Note:** Conditional, so justified but could be extracted to constants.  
**Severity:** LOW  
**Occurrences:** 2 (via ternary)

---

### 1.13 Button Hover State Styling (MEDIUM - 2 patterns)

**Lines:** 303-304, 320-327  
**Context:** `createUI()` - Button hover/out handlers  
**Pattern 1 - Get Schedule Button:**
```javascript
getBtn.onmouseover = () => { getBtn.style.background = '#0056cc'; };
getBtn.onmouseout = () => { getBtn.style.background = '#007bff'; };
```
**Pattern 2 - Settings Button:**
```javascript
settingsBtn.onmouseover = () => {
    settingsBtn.style.background = '#f5f5f5';
    settingsBtn.style.borderColor = '#999';
};
settingsBtn.onmouseout = () => {
    settingsBtn.style.background = '#fff';
    settingsBtn.style.borderColor = '#ccc';
};
```
**Severity:** MEDIUM  
**Issue:** Two different hover implementations (one for color, one for background+border)  
**Occurrences:** 2 (different implementations)

---

### 1.14 Color: #007bff (Primary Blue) (MEDIUM - 2 occurrences)

**Lines:** 296, 422  
**Context:** Main button and Save button backgrounds  
**Duplication:**
```javascript
background: '#007bff'  // Repeated 2 times
```
**Severity:** MEDIUM  
**Occurrences:** 2

---

### 1.15 Border-Radius: 8px (LOW - 3 occurrences)

**Lines:** 252, 819, 835  
**Context:** Panel, modal, and modal header  
**Duplication:**
```javascript
borderRadius: '8px'  // Repeated 3 times
```
**Severity:** LOW (larger component borders, consistent usage)  
**Occurrences:** 3

---

## 2. HTML Template Duplications

### 2.1 Settings Header Pattern (HIGH - 3 occurrences)

**Lines:** 400, 405, 411  
**Context:** `createSettingsUIHtml()` - Section headers  
**Duplication:**
```html
<!-- Line 400 -->
<h4 style="font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#999;margin:0 0 12px 0;padding-bottom:8px;border-bottom:1px solid #e8e8e8;">Select Tags</h4>

<!-- Line 405 -->
<h4 style="font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#999;margin:16px 0 12px 0;padding-bottom:8px;border-bottom:1px solid #e8e8e8;">Display Options</h4>

<!-- Line 411 -->
<h4 style="font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#999;margin:16px 0 12px 0;padding-bottom:8px;border-bottom:1px solid #e8e8e8;">Event Format</h4>
```
**Severity:** HIGH  
**Pattern:** Identical styling, only text content differs. Margin differs in first header (0 vs 16px).  
**Occurrences:** 3 (same structure, different content)

---

### 2.2 Checkbox Label Pattern (HIGH - 3 occurrences)

**Lines:** 407, 413, 417  
**Context:**
