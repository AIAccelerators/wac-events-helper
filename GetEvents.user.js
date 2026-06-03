// ==UserScript==
// @name         GetEvents
// @namespace    http://tampermonkey.net/
// @version      0.3.3
// @description  Fetch and display AI events from wearecommunity.io via API
// @author       Oleksandr_Kovalenko2
// @connect      wearecommunity.io/api/v2
// @match        https://wearecommunity.io/events
// @match        https://wearecommunity.io/events?*
// @match        https://wearecommunity.io/events/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @updateURL    https://github.com/AIAccelerators/wac-events-helper/raw/main/GetEvents.user.js
// @downloadURL  https://github.com/AIAccelerators/wac-events-helper/raw/main/GetEvents.user.js
// @tag          utilities
// ==/UserScript==

// ─── Constants (Global Scope) ────────────────────────────────────────────────

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

const TIME_CONSTANTS = {
    SECONDS_PER_DAY: 86400,
    MS_PER_SECOND: 1000,
};

const LANGUAGE_FILTERS = {
    BLOCKED_LANGUAGES: ['Russian'],
    BLOCKED_CODES: ['Ru'],
};

// ─── Helper Functions (Global Scope) ─────────────────────────────────────────
/* eslint-disable no-unused-vars */

function buildArrayParam(paramName, values) {
    if (!values || values.length === 0) return '';
    return values.map(v => `&${paramName}%5B%5D=${encodeURIComponent(v)}`).join('');
}

function parseJSONSafe(jsonString, defaultValue, validator) {
    if (jsonString === undefined || jsonString === null || jsonString === '') {
        return defaultValue;
    }
    try {
        const parsed = JSON.parse(jsonString);
        return validator(parsed) ? parsed : defaultValue;
    } catch (_) {
        return defaultValue;
    }
}

function isValidSpeechInRange(talk, dateFromTs, dateTillTs) {
    return talk.is_speech && talk.date >= dateFromTs && talk.date <= dateTillTs + TIME_CONSTANTS.SECONDS_PER_DAY;
}

function isLanguageBlocked(language) {
    if (!language) return false;
    if (LANGUAGE_FILTERS.BLOCKED_LANGUAGES.includes(language)) return true;
    if (LANGUAGE_FILTERS.BLOCKED_CODES.includes(language)) return true;
    return false;
}

function settingsHeader(title, marginTop = '16px') {
    return `<h4 style="font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:${COLORS.DARK_GRAY};margin:${marginTop} 0 12px 0;padding-bottom:8px;border-bottom:1px solid ${COLORS.MEDIUM_GRAY};">${escHtml(title)}</h4>`;
}

function checkboxLabel(text, id, isChecked, marginBottom = '16px') {
    return `<label style="display:flex;align-items:center;gap:${SPACING.LG};cursor:pointer;margin-bottom:${marginBottom};">
        <input id="${id}" type="checkbox" ${isChecked ? 'checked' : ''} style="cursor:pointer;">
        <span>${escHtml(text)}</span>
    </label>`;
}

function createDateInput(label, id, value) {
    return `<label style="display:flex;align-items:center;gap:${SPACING.SM};color:${COLORS.TEXT_GRAY};">
        <span style="font-size:12px;font-weight:500;">${label}</span>
        <input id="${id}" type="date" value="${value}" style="padding:${SPACING.XS} ${SPACING.SM};border:1px solid ${COLORS.INPUT_BORDER};border-radius:${BORDER_RADIUS.SMALL};font-size:12px;">
    </label>`;
}

function formatTimeRange(startTs, endTs, separator = '-') {
    const t1 = fmtTime(startTs, ':');
    const t2 = fmtTime(endTs, ':');
    return `${t1} ${separator} ${t2}`;
}

function seriesEventLink(seriesLink, seriesTitle) {
    return `<div><b>Серія подій:</b> <a href="${escHtml(seriesLink)}" target="_blank">${escHtml(seriesTitle)}</a></div>`;
}

/* eslint-enable no-unused-vars */

(function () {
    'use strict';

    // ─── Styles ──────────────────────────────────────────────────────────────
    GM_addStyle(`
        @keyframes tm-spin {
            to { transform: rotate(360deg); }
        }
        .tm-spinner {
            display: inline-block;
            width: 16px; height: 16px;
            border: 2px solid ${COLORS.LIGHT_BORDER};
            border-top-color: ${COLORS.LINK_BLUE};
            border-radius: 50%;
            animation: tm-spin 0.7s linear infinite;
            vertical-align: middle;
            margin-right: ${SPACING.LG};
        }
        .tm-btn-primary {
            padding: ${SPACING.MD} ${SPACING.XL};
            background: ${COLORS.PRIMARY_BLUE};
            color: ${COLORS.WHITE};
            border: none;
            border-radius: ${BORDER_RADIUS.MEDIUM};
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        .tm-btn-primary:hover {
            background: ${COLORS.DARK_BLUE};
        }
        .tm-btn-secondary {
            padding: ${SPACING.MD} ${SPACING.XL};
            background: ${COLORS.WHITE};
            color: ${COLORS.TEXT_GRAY};
            border: 1px solid ${COLORS.INPUT_BORDER};
            border-radius: ${BORDER_RADIUS.MEDIUM};
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .tm-input-date {
            padding: ${SPACING.XS} ${SPACING.SM};
            border: 1px solid ${COLORS.INPUT_BORDER};
            border-radius: ${BORDER_RADIUS.SMALL};
            font-size: 12px;
        }
        .tm-input-search {
            width: 100%;
            padding: ${SPACING.MD} ${SPACING.LG};
            margin-bottom: ${SPACING.XL};
            border: 1px solid ${COLORS.INPUT_BORDER};
            border-radius: ${BORDER_RADIUS.SMALL};
            font-size: 13px;
            box-sizing: border-box;
        }
        .tm-label-flex {
            display: flex;
            align-items: center;
            gap: ${SPACING.LG};
            cursor: pointer;
        }
        .tm-checkbox {
            cursor: pointer;
        }
        .tm-chip {
            display: inline-block;
            background: #e8f0fe;
            color: #1a56db;
            padding: 4px 12px;
            margin: 4px 4px 4px 0;
            border-radius: 12px;
            font-size: 12px;
            position: relative;
            padding-right: 20px;
        }
        .chip-remove-btn {
            position: absolute;
            right: 2px;
            top: 0;
            bottom: 0;
            width: 18px;
            background: none;
            border: none;
            color: #1a56db;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            padding: 0;
            line-height: 1;
        }
    `);

    createUI();
})();

// ─── Settings Manager ────────────────────────────────────────────────────────

const SettingsManager = {
    STORAGE_KEY: 'tm_selected_tags',
    STORAGE_KEY_FORMATS: 'tm_event_formats',
    DEFAULT_FORMATS: ['Тільки онлайн', 'Офлайн зі стрімом'],
    DEFAULT_TAGS: [

        'AI',
        'AI & ML Strategy',
        'AI Agents',
        'AI Agents Testing',
        'AI Architecture',
        'AI Architectures',
        'AI DIAL',
        'AI Ethics',
        'AI Governance',
        'AI Platform Deep Learning Containers',
        'AI Platform Notebooks',
        'AI Platform Pipelines',
        'AI Platform Predictions',
        'AI Platform Training',
        'AI Pre-Sales',
        'AI Security',
        'AI Strategy',
        'AI Strategy and Leadership',
        'AI for Good',
        'AI in Design',
        'AI in Test Automation',
        'AI, Data Science, and Statistics',
        'AI/ML Testing',
        'AT/Generative AI',
        'AWS Copilot',
        'AWS.Machine Learning',
        'Additive Machine Learning Models',
        'Adoption of GenAI in SDLC',
        'Alita',
        'Amazon Augmented AI',
        'Amazon ML',
        'Apache Marvin-AI',
        'Apple Core ML',
        'Applied GenAI for SDLC Efficiency',
        'Artificial General Intelligence (AGI)',
        'Artificial Superintelligence (ASI)',
        'Artificial intelligence',
        'Artificial intelligence systems',
        'Azure AI + Machine Learning',
        'Azure AI Language',
        'Azure AI Search',
        'Azure Applied AI Services',
        'Azure Machine Learning Studio',
        'Azure OpenAI Service',
        'BI Analysis with AI',
        'BigQuery ML',
        'Business Prompt Engineering',
        'ChatGPT',
        'Classification Metrics for Machine Learning',
        'Conversational AI',
        'Create ML',
        'Data & AI Consulting',
        'Data & AI Strategy',
        'Data Visualization in ML',
        'Domain Cases for GenAI in Software Solutions',
        'ELITEA',
        'EPAM GenAI Offerings',
        'EPAM GenAI SDLC Offerings',
        'EPAM GenAI Solutions Offering',
        'Ethics of AI',
        'GCP AI and Machine Learning',
        'Gen AI Application Development',
        'Gen AI ROI',
        'Gen AI Solutions Development',
        'Gen AI in Management',
        'Gen AI in SDLC',
        'Gen AI in Test Automation',
        'GenAI Application Development',
        'GenAI Business Analysis',
        'GenAI Data Management',
        'GenAI Mastery for Management',
        'GenAI Model Systems Engineering',
        'GenAI Pair Programming',
        'GenAI Product Management',
        'GenAI Prototyping',
        'GenAI Solutions Development',
        'GenAI Tech Stack',
        'GenAI Technology Infrastructure',
        'GenAI Toolset for SDLC',
        'GenAI for BA Productivity',
        'GenAI for Requirement Management',
        'Generative AI',
        'Generative AI Fundamentals',
        'Generative AI Technologies',
        'Generative Pre-trained Transformers (GPT)',
        'GitHub Copilot (Tool)',
        'Github Copilot',
        'Google AI Hub',
        'Google Cloud AI Platform',
        'Google Cloud Auto ML',
        'Google Contact Center AI',
        'Google Document AI',
        'Google Vertex AI',
        'HCI AI',
        'Invocation of GenAI from Code',
        'Kontent.ai',
        'Kore.ai',
        'Large Language Model (LLM)',
        'ML Architecture',
        'ML.NET',
        'MLOps',
        'MLflow',
        'Machine Learning',
        'Machine Learning Bias',
        'Machine Learning Engineering',
        'Machine Learning Model Development',
        'Machine Learning Tools',
        'Machine Learning on Graph Data',
        'Machine Learning with Data',
        'Microsoft 365 Copilot',
        'Microsoft Copilot',
        'Microsoft Copilot Studio',
        'NVIDIA AI platform',
        'OpenAI API',
        'OpenAI GPT-4o',
        'Power Platform AI Builder',
        'Prompt Engineering',
        'Prompt Engineering for Dev Productivity',
        'Prompt Engineering for TA',
        'Quantum Machine Learning (QML)',
        'Regression Metrics for Machine Learning',
        'SAP AI',
        'SAP AI Core',
        'SAP Machine Learning',
        'Salesforce Einstein GPT',
        'Spark ML',
        'Spark MLlib',
        'Spring AI',
        'TONIC AI',
        'TelescopeAI',
        'TelescopeAI Perf',
        '[24]/7.ai',
        'boost.ai'
    ],

    getTags() {
        const stored = GM_getValue(this.STORAGE_KEY);
        return parseJSONSafe(stored, this.DEFAULT_TAGS, p => Array.isArray(p) && p.length > 0);
    },

    setTags(tags) {
        GM_setValue(this.STORAGE_KEY, JSON.stringify(tags));
    },

    getFormats() {
        const stored = GM_getValue(this.STORAGE_KEY_FORMATS);
        return parseJSONSafe(stored, this.DEFAULT_FORMATS, p => Array.isArray(p) && p.length > 0);
    },

    setFormats(formats) {
        GM_setValue(this.STORAGE_KEY_FORMATS, JSON.stringify(formats));
    },

    reset() {
        GM_setValue(this.STORAGE_KEY, '');
        GM_setValue(this.STORAGE_KEY_FORMATS, '');
    }
};

// ─── Tags Manager ────────────────────────────────────────────────────────────
/**
 * TagsManager: Centralized management of user-selected tags
 * Handles current selections, dropdown state, and merging of search results with selections
 */
const TagsManager = {
    // Current user selections in memory
    currentTags: [],

    // Checkboxes currently visible in dropdown
    tagCheckboxes: {},

    // All available tags (for when search is cleared)
    allOptions: [],

    /**
     * Initialize TagsManager with saved tags from storage
     */
    init() {
        this.currentTags = SettingsManager.getTags();
        this.allOptions = [...this.currentTags];
        this.tagCheckboxes = {};
    },

    /**
     * Get all currently selected tags
     * @returns {Array<string>} Array of selected tag names
     */
    getSelected() {
        return [...this.currentTags];
    },

    /**
     * Get tags that are checked in current dropdown view
     * @returns {Array<string>} Array of checked tag names
     */
    getCheckedInDropdown() {
        return Object.entries(this.tagCheckboxes)
            .filter(([_, cb]) => cb.checked)
            .map(([tag, _]) => tag);
    },

    /**
     * Get tags that are selected but NOT in current dropdown
     * (useful for preserving selections when searching)
     * @returns {Array<string>} Array of tag names outside dropdown
     */
    getTagsOutsideDropdown() {
        return this.currentTags.filter(tag => !this.tagCheckboxes[tag]);
    },

    /**
     * Merge checked dropdown items with tags outside dropdown
     * Preserves all selections while allowing new selections
     * @returns {Array<string>} Merged array of all selected tags
     */
    getMergedSelection() {
        const checkedInDropdown = this.getCheckedInDropdown();
        const tagsOutsideDropdown = this.getTagsOutsideDropdown();
        return [...new Set([...checkedInDropdown, ...tagsOutsideDropdown])];
    },

    /**
     * Update current selections in memory
     * @param {Array<string>} tags - New tag selections
     */
    setSelected(tags) {
        this.currentTags.length = 0;
        this.currentTags.push(...tags);
    },

    /**
     * Update dropdown options (for when search is cleared)
     * @param {Array<string>} options - Available options
     */
    setAllOptions(options) {
        this.allOptions = [...options];
    },

    /**
     * Clear all checkbox references (when dropdown is rerendered)
     */
    clearCheckboxes() {
        Object.keys(this.tagCheckboxes).forEach(k => { delete this.tagCheckboxes[k]; });
    },

    /**
     * Clear all selections (for "Unselect All" button)
     */
    clearAll() {
        this.currentTags.length = 0;
        this.allOptions = [];
        this.clearCheckboxes();
    },

    /**
     * Reset to default tags
     */
    resetToDefaults() {
        this.setSelected(SettingsManager.DEFAULT_TAGS);
        this.setAllOptions(SettingsManager.DEFAULT_TAGS);
    },

    /**
     * Check if tag exists in current dropdown view
     * @param {string} tag - Tag name
     * @returns {boolean}
     */
    isInDropdown(tag) {
        return tag in this.tagCheckboxes;
    },

    /**
     * Check if tag is currently selected
     * @param {string} tag - Tag name
     * @returns {boolean}
     */
    isSelected(tag) {
        return this.currentTags.includes(tag);
    },

    /**
     * Get count of selected tags
     * @returns {number}
     */
    getSelectedCount() {
        return this.currentTags.length;
    }
};

// ─── UI panel ────────────────────────────────────────────────────────────────

function createUI() {
    const today = new Date();
    const weekLater = new Date(today);
    weekLater.setDate(today.getDate() + 6);

    const panel = document.createElement('div');
    panel.id = 'tm-panel';
    Object.assign(panel.style, {
        position: 'fixed',
        top: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '99999',
        background: COLORS.WHITE,
        padding: `${SPACING.XL} ${SPACING.XXL}`,
        border: `1px solid ${COLORS.LIGHT_BORDER}`,
        borderRadius: BORDER_RADIUS.LARGE,
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.XL,
        fontFamily: 'sans-serif',
        fontSize: '13px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
    });

    const dateGroup = document.createElement('div');
    Object.assign(dateGroup.style, {
        display: 'flex',
        gap: SPACING.LG,
        alignItems: 'center',
        paddingRight: SPACING.XL,
        borderRight: `1px solid ${COLORS.BORDER_GRAY}`,
    });

    const fromLabel = document.createElement('label');
    Object.assign(fromLabel.style, { display: 'flex', alignItems: 'center', gap: SPACING.SM, color: COLORS.TEXT_GRAY });
    fromLabel.innerHTML = createDateInput('Від:', 'tm-from', toInputDate(today));
    dateGroup.appendChild(fromLabel);

    const tillLabel = document.createElement('label');
    Object.assign(tillLabel.style, { display: 'flex', alignItems: 'center', gap: SPACING.SM, color: COLORS.TEXT_GRAY });
    tillLabel.innerHTML = createDateInput('До:', 'tm-till', toInputDate(weekLater));
    dateGroup.appendChild(tillLabel);

    panel.appendChild(dateGroup);

    const btnGroup = document.createElement('div');
    Object.assign(btnGroup.style, {
        display: 'flex',
        gap: `${parseInt(SPACING.MD) - 2}px`,
        alignItems: 'center',
    });

    const getBtn = document.createElement('button');
    getBtn.id = 'tm-btn';
    getBtn.textContent = '▶ Get schedule';
    Object.assign(getBtn.style, {
        padding: `${SPACING.MD} ${SPACING.XXL}`,
        cursor: 'pointer',
        fontWeight: '600',
        background: COLORS.PRIMARY_BLUE,
        color: COLORS.WHITE,
        border: 'none',
        borderRadius: BORDER_RADIUS.MEDIUM,
        fontSize: '13px',
        transition: 'background 0.2s',
    });
    getBtn.onmouseover = () => { getBtn.style.background = COLORS.DARK_BLUE; };
    getBtn.onmouseout = () => { getBtn.style.background = COLORS.PRIMARY_BLUE; };

    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'tm-settings-btn';
    settingsBtn.textContent = '⚙ Settings';
    Object.assign(settingsBtn.style, {
        padding: `${SPACING.MD} ${SPACING.XL}`,
        cursor: 'pointer',
        fontWeight: '500',
        background: COLORS.WHITE,
        color: COLORS.TEXT_GRAY,
        border: `1px solid ${COLORS.INPUT_BORDER}`,
        borderRadius: BORDER_RADIUS.MEDIUM,
        fontSize: '13px',
        transition: 'all 0.2s',
    });
    settingsBtn.onmouseover = () => {
        settingsBtn.style.background = COLORS.LIGHT_GRAY;
        settingsBtn.style.borderColor = COLORS.DARK_GRAY;
    };
    settingsBtn.onmouseout = () => {
        settingsBtn.style.background = COLORS.WHITE;
        settingsBtn.style.borderColor = COLORS.INPUT_BORDER;
    };

    btnGroup.appendChild(getBtn);
    btnGroup.appendChild(settingsBtn);
    panel.appendChild(btnGroup);

    document.body.appendChild(panel);
    document.getElementById('tm-btn').addEventListener('click', onFetch);
    document.getElementById('tm-settings-btn').addEventListener('click', showSettingsModal);
}

function toInputDate(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n) {
    return String(n).padStart(2, '0');
}

// ─── Fetch logic ─────────────────────────────────────────────────────────────

async function onFetch() {
    const btn = document.getElementById('tm-btn');
    const dateFrom = document.getElementById('tm-from').value;
    const dateTill = document.getElementById('tm-till').value;
    if (!dateFrom || !dateTill) return;

    btn.disabled = true;
    btn.textContent = 'Loading…';
    showModal('<p><span class="tm-spinner"></span>Завантаження…</p>', 'events');

    try {
        const events = await fetchAllEvents(dateFrom, dateTill);
        const realEvents = events.filter(e => !e.is_ad && typeof e.id === 'number');

        const agendaMap = {};
        await Promise.all(
            realEvents
                .filter(e => e.size !== 's')
                .map(async e => {
                    try { agendaMap[e.id] = await fetchAgenda(e.id); }
                    catch (_) { /* eslint-disable-line no-unused-vars */ /* leave undefined — will fall back to date range */ }
                })
        );

        const dateFromTs = Math.floor(new Date(dateFrom).getTime() / 1000);
        const dateTillTs = Math.floor(new Date(dateTill).getTime() / 1000);
        updateModalContent(renderEvents(realEvents, agendaMap, dateFromTs, dateTillTs));
    } catch (err) {
        updateModalContent(`<p style="color:red">Помилка: ${escHtml(err.message)}</p>`);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Get schedule';
    }
}

async function showSettingsModal() {
    const html = createSettingsUIHtml();
    showModal(html, 'settings');
    attachSettingsHandlers();
}

function chipHtml(tags) {
    return tags.map(t => `<span class="tm-chip" data-tag="${escHtml(t)}"><span>${escHtml(t)}</span><button class="chip-remove-btn" title="Remove this tag">&times;</button></span>`).join('');
}

function createSettingsUIHtml() {
    const currentTags = SettingsManager.getTags();
    const currentFormats = SettingsManager.getFormats();
    const selectedHtml = chipHtml(currentTags);

    return `
        ${settingsHeader('Select Tags', '0')}
        <input id="tm-settings-search" type="text" placeholder="Search tags..." style="width:100%;padding:${SPACING.MD} ${SPACING.LG};margin-bottom:10px;border:1px solid ${COLORS.INPUT_BORDER};border-radius:${BORDER_RADIUS.SMALL};font-size:13px;box-sizing:border-box;">
        <div id="tm-settings-dropdown" style="max-height:200px;overflow-y:auto;border:1px solid ${COLORS.LIGHT_BORDER};border-radius:${BORDER_RADIUS.SMALL};margin-bottom:${SPACING.XL};"></div>
        <div id="tm-settings-selected" style="margin-bottom:${SPACING.XL};min-height:24px;">${selectedHtml}</div>

        ${settingsHeader('Event Format')}
        ${checkboxLabel('Тільки онлайн', 'tm-format-online', currentFormats.includes('Тільки онлайн'), SPACING.LG)}
        ${checkboxLabel('Офлайн зі стрімом', 'tm-format-offline-stream', currentFormats.includes('Офлайн зі стрімом'))}

        <div style="display:flex;gap:${SPACING.LG};padding-top:${SPACING.XL};border-top:1px solid ${COLORS.MEDIUM_GRAY};">
<button id="tm-settings-save" style="padding:${SPACING.MD} ${SPACING.XL};cursor:pointer;background:${COLORS.PRIMARY_BLUE};color:${COLORS.WHITE};border:none;border-radius:${BORDER_RADIUS.SMALL};font-size:13px;flex:1;" title="Save your selected tags and formats">Save</button>
<button id="tm-settings-defaults" style="padding:${SPACING.MD} ${SPACING.XL};cursor:pointer;background:${COLORS.WHITE};color:${COLORS.TEXT_GRAY};border:1px solid ${COLORS.INPUT_BORDER};border-radius:${BORDER_RADIUS.SMALL};font-size:13px;flex:1;" title="Restore default tags and formats">Defaults</button>
<button id="tm-settings-unselect-all" style="padding:${SPACING.MD} ${SPACING.XL};cursor:pointer;background:${COLORS.WHITE};color:${COLORS.TEXT_GRAY};border:1px solid ${COLORS.INPUT_BORDER};border-radius:${BORDER_RADIUS.SMALL};font-size:13px;flex:1;" title="Clear all selections">Unselect All</button>
        </div>
    `;
}

function attachSettingsHandlers() {
    TagsManager.init();
    const searchInput = document.getElementById('tm-settings-search');
    const dropdown = document.getElementById('tm-settings-dropdown');
    const selectedList = document.getElementById('tm-settings-selected');
    const saveBtn = document.getElementById('tm-settings-save');
    const defaultsBtn = document.getElementById('tm-settings-defaults');
    const unselectAllBtn = document.getElementById('tm-settings-unselect-all');
    const formatOnlineCheckbox = document.getElementById('tm-format-online');
    const formatOfflineStreamCheckbox = document.getElementById('tm-format-offline-stream');

    if (!searchInput || !dropdown || !saveBtn || !defaultsBtn || !unselectAllBtn || !formatOnlineCheckbox || !formatOfflineStreamCheckbox) return;

    // Track current search to prevent rendering stale API responses
    let currentSearchQuery = '';

    async function updateDropdown(query) {
        // Update current query before making request
        currentSearchQuery = query;
        const searchQuery = query; // Capture for comparison

        dropdown.innerHTML = '';
        TagsManager.clearCheckboxes();
        let options = [];

        if (query.trim()) {
            // Search mode: LEFT JOIN search results with current selections
            // Show search results, highlight those already selected
            try {
                const results = await gmGet(
                    `https://wearecommunity.io/api/v2/dictionaries/skills/search?search_query=${encodeURIComponent(query)}`
                );
                // Ignore response if user has typed a different query while we were fetching
                if (searchQuery !== currentSearchQuery) {
                    return;
                }
                if (Array.isArray(results)) {
                    // Display only search results; checked state determined by TagsManager.currentTags
                    options = [...new Set(results)];
                }
            } catch (err) {
                console.error('Tag search failed:', err);
                return;
            }
        } else {
            // Empty search: show all currently selected tags
            options = [...TagsManager.allOptions];
        }

        options = [...new Set(options)].sort();

        options.forEach(tag => {
            const label = document.createElement('label');
            Object.assign(label.style, {
                display: 'block',
                padding: `${SPACING.MD} ${SPACING.LG}`,
                cursor: 'pointer',
                borderBottom: `1px solid ${COLORS.VERY_LIGHT_BORDER}`,
            });

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = tag;
            // LEFT JOIN: Mark checked if tag already in user's current selections
            checkbox.checked = TagsManager.isSelected(tag);
            TagsManager.tagCheckboxes[tag] = checkbox;

            // Update save button state and chips on any change
            checkbox.addEventListener('change', () => {
                updateSaveButtonState();
                updateSelectedChips();
            });

            const span = document.createElement('span');
            span.textContent = escHtml(tag);
            Object.assign(span.style, { marginLeft: SPACING.LG });

            label.appendChild(checkbox);
            label.appendChild(span);
            dropdown.appendChild(label);
        });
        updateSaveButtonState();
        attachChipRemoveHandlers();
    }

    searchInput.addEventListener('input', e => updateDropdown(e.target.value));

    function updateSaveButtonState() {
        const selectedTags = Object.values(TagsManager.tagCheckboxes).filter(cb => cb.checked).length;
        const isValid = selectedTags > 0;

        if (isValid) {
            saveBtn.disabled = false;
            saveBtn.title = 'Save your selected tags and formats';
            saveBtn.style.opacity = '1';
            saveBtn.style.cursor = 'pointer';
        } else {
            saveBtn.disabled = true;
            saveBtn.title = 'Please select at least 1 tag';
            saveBtn.style.opacity = '0.5';
            saveBtn.style.cursor = 'not-allowed';
        }
    }

    function updateSelectedChips() {
        const allSelected = TagsManager.getMergedSelection();
        TagsManager.setSelected(allSelected);
        selectedList.innerHTML = chipHtml(allSelected);
        attachChipRemoveHandlers();
    }

    function attachChipRemoveHandlers() {
        const removeButtons = document.querySelectorAll('.chip-remove-btn');
        removeButtons.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const chip = btn.parentElement;
                const tagName = chip.getAttribute('data-tag');

                // Uncheck the checkbox if it exists in TagsManager
                if (TagsManager.isInDropdown(tagName)) {
                    TagsManager.tagCheckboxes[tagName].checked = false;
                }

                // Update both chips and button state
                updateSelectedChips();
                updateSaveButtonState();
            };
        });
    }

    saveBtn.onclick = () => {
        const selected = TagsManager.getMergedSelection();

        // Only allow save if at least one tag
        if (selected.length === 0) {
            return;
        }

        // Save tags to storage
        SettingsManager.setTags(selected);
        TagsManager.setSelected(selected);
        TagsManager.setAllOptions(selected);
        updateDropdown('');
        selectedList.innerHTML = chipHtml(selected);

        // Save format selections
        const selectedFormats = [];
        if (formatOnlineCheckbox.checked) selectedFormats.push('Тільки онлайн');
        if (formatOfflineStreamCheckbox.checked) selectedFormats.push('Офлайн зі стрімом');
        SettingsManager.setFormats(selectedFormats);

        // Show feedback
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✓ Saved';
        saveBtn.style.background = COLORS.DARK_BLUE;
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = COLORS.PRIMARY_BLUE;
        }, 1500);
    };

    defaultsBtn.onclick = () => {
        // Save defaults to storage immediately
        SettingsManager.setTags(SettingsManager.DEFAULT_TAGS);
        SettingsManager.setFormats(SettingsManager.DEFAULT_FORMATS);

        // Update TagsManager
        TagsManager.resetToDefaults();
        updateDropdown('');

        // Reset formats
        formatOnlineCheckbox.checked = true;
        formatOfflineStreamCheckbox.checked = true;
        selectedList.innerHTML = chipHtml(SettingsManager.DEFAULT_TAGS);

        // Confirmation feedback
        const originalText = defaultsBtn.textContent;
        defaultsBtn.textContent = '✓ Defaults Loaded';
        defaultsBtn.style.background = COLORS.LIGHT_BLUE;
        defaultsBtn.style.color = COLORS.DARK_TEXT_BLUE;
        setTimeout(() => {
            defaultsBtn.textContent = originalText;
            defaultsBtn.style.background = COLORS.WHITE;
            defaultsBtn.style.color = COLORS.TEXT_GRAY;
        }, 1500);
    };

    unselectAllBtn.onclick = () => {
        TagsManager.clearAll();
        formatOnlineCheckbox.checked = false;
        formatOfflineStreamCheckbox.checked = false;
        selectedList.innerHTML = '';
        searchInput.value = '';
        updateDropdown('');
        updateSaveButtonState();

        // Confirmation feedback
        const originalText = unselectAllBtn.textContent;
        unselectAllBtn.textContent = '✓ Cleared';
        unselectAllBtn.style.background = COLORS.LIGHT_BLUE;
        unselectAllBtn.style.color = COLORS.DARK_TEXT_BLUE;
        setTimeout(() => {
            unselectAllBtn.textContent = originalText;
            unselectAllBtn.style.background = COLORS.WHITE;
            unselectAllBtn.style.color = COLORS.TEXT_GRAY;
        }, 1500);
    };

    updateDropdown('');
    updateSaveButtonState();
}

function gmGet(url) {
    console.log('Fetching URL:', url);
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url,
            headers: { Accept: 'application/json' },
            onload: function (response) {
                try {
                    console.log("Status:", response.status);
                    console.log("Response Text:", response.responseText);
                    return resolve(JSON.parse(response.responseText));
                }
                catch (_) { /* eslint-disable-line no-unused-vars */ reject(new Error('JSON parse error: ' + url)); }
            },
             onerror: function () { reject(new Error('Network error: ' + url)); },
        });
    });
}

function toAPIDate(isoDate) {
    const [y, m, d] = isoDate.split('-');
    return `${m}/${d}/${y}`;
}

async function fetchAllEvents(dateFrom, dateTill) {
    const from = encodeURIComponent(toAPIDate(dateFrom));
    const till = encodeURIComponent(toAPIDate(dateTill));
    const tags = SettingsManager.getTags();
    const formats = SettingsManager.getFormats();

    const tagParams = buildArrayParam('tag', tags);
    const formatParams = buildArrayParam('event_participation_format', formats);

    const base =
        `https://wearecommunity.io/api/v2/events.json?period=upcoming` +
        tagParams +
        formatParams +
        `&date_from=${from}&date_till=${till}`;

    const first = await gmGet(`${base}&start=0`);
    const all = [...(first.events || [])];
    const limit = first.limit || 16;

    const extras = [];
    for (let start = limit; start < first.total; start += limit) {
        extras.push(gmGet(`${base}&start=${start}`));
    }
    const rest = await Promise.all(extras);
    rest.forEach(r => all.push(...(r.events || [])));

    return all;
}

async function fetchAgenda(eventId) {
    const cf = Math.floor(Date.now() / 1000);
    return gmGet(
        `https://wearecommunity.io/api/v2/events/${eventId}/agenda?cf=${cf}&collection_filter=false`
    );
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

const UA_DAYS = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'];
const UA_MONTHS = [
    'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
];

function tsDate(ts) { return new Date(ts * 1000); }

function fmtDate(ts) {
    const d = tsDate(ts);
    return `${UA_DAYS[d.getDay()]}, ${d.getDate()} ${UA_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtTime(ts, sep) {
    const d = tsDate(ts);
    return `${pad(d.getHours())}${sep}${pad(d.getMinutes())}`;
}

function escHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getLang(event) {
    if (Array.isArray(event.languages) && event.languages.length) return event.languages.join(', ');
    return event.language || '';
}

function eventPageUrl(event) {
    return `https://wearecommunity.io/events/${event.url}`;
}

// ─── Renderers ────────────────────────────────────────────────────────────────

function renderEvents(events, agendaMap, dateFromTs, dateTillTs) {
    if (!events.length) return '<p>Подій не знайдено.</p>';

    const filtered = events.filter(e => {
        if (e.size === 's') return e.time_stamp.start >= dateFromTs && e.time_stamp.start <= dateTillTs + TIME_CONSTANTS.SECONDS_PER_DAY;
        return true;
    });

    // Flatten all single events and talks for grouping
    const allItems = [];

    filtered.forEach(e => {
        if (e.size === 's') {
            allItems.push({ type: 'single', event: e, sortDate: e.time_stamp.start, title: e.title });
        } else {
            const agendaData = agendaMap[e.id];
            const items = agendaData && agendaData.agenda && agendaData.agenda.items;
            if (items) {
                const talks = items.filter(i => isValidSpeechInRange(i, dateFromTs, dateTillTs));
                talks.forEach(talk => {
                    allItems.push({ type: 'talk', event: e, talk: talk, sortDate: talk.date, title: talk.title });
                });
            }
        }
    });

    // Group by (date, series id)
    allItems.sort((a, b) => {
        if (a.sortDate !== b.sortDate) return a.sortDate - b.sortDate;
        return a.title.localeCompare(b.title, 'uk');
    });

    // Map: key = type=single then 'single_'+date, otherwise 'series_'+event.id+'_'+yyyymmdd
    function getDateKey(ts) {
        const d = tsDate(ts);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    const grouped = {};
    const singles = [];

    allItems.forEach(item => {
        if (item.type === 'single') {
            singles.push(item); // single day event, not a series
        } else {
            // group by series id and date
            const groupKey = item.event.id + '::' + getDateKey(item.talk.date);
            if (!grouped[groupKey]) grouped[groupKey] = { event: item.event, talks: [] };
            grouped[groupKey].talks.push(item.talk);
        }
    });

    // Merge all, sorted order
    const mergedBlocks = [];

    // singles sorted in - FILTER OUT BLOCKED LANGUAGES
    singles.forEach(item => {
        const eventLang = getLang(item.event);
        if (!isLanguageBlocked(eventLang)) {
            mergedBlocks.push({ type: 'single', event: item.event });
        }
    });
    // Flatten groups, order by min date - FILTER TALKS AND SKIP EMPTY SERIES
    Object.values(grouped)
        .sort((g1, g2) => g1.talks[0].date - g2.talks[0].date)
        .forEach(group => {
            // Filter out talks with blocked languages
            const allowedTalks = group.talks.filter(talk => {
                const talkLang = talk.short_language || getLang(group.event);
                return !isLanguageBlocked(talkLang);
            });

            // Skip entire series if no talks remain after filtering
            if (allowedTalks.length === 0) return;

            if (allowedTalks.length === 1) {
                // Render as single talk (series, but only one on this date)
                mergedBlocks.push({ type: 'singleTalk', event: group.event, talk: allowedTalks[0] });
            } else {
                // Render as series group
                mergedBlocks.push({ type: 'seriesGroup', event: group.event, talks: allowedTalks });
            }
        });

    // Sort all mergedBlocks by their primary timestamp for correct order.
    mergedBlocks.sort((a, b) => {
        const aTs = a.type === 'single' ? a.event.time_stamp.start : a.type === 'singleTalk' ? a.talk.date : a.talks[0].date;
        const bTs = b.type === 'single' ? b.event.time_stamp.start : b.type === 'singleTalk' ? b.talk.date : b.talks[0].date;
        return aTs - bTs;
    });

    return mergedBlocks
        .map(block => {
            if (block.type === 'single') {
                return renderCard(renderSingle(block.event), false);
            } else if (block.type === 'singleTalk') {
                return renderCard(renderTalk(block.event, block.talk), false);
            } else {
                return renderCard(renderSeriesGroup(block.event, block.talks), true);
            }
        })
        .join(`<hr style="border:none;border-top:1px solid ${COLORS.LIGHT_BORDER};margin:10px 0">`);
}


// ─── Card Wrapper ────────────────────────────────────────────────────────────

function renderCard(innerHtml, isSeries) {
    return `<div style="border-left: 3px solid transparent;padding: 10px 14px;margin-bottom: 6px;border-radius: ${BORDER_RADIUS.MEDIUM};background: ${COLORS.OFF_WHITE};border: 1px solid ${COLORS.MEDIUM_GRAY};border-left-width:3px;">${innerHtml}</div>`;
}

function renderSeriesGroup(event, talks) {
    const seriesLink = eventPageUrl(event);
    talks.sort((a, b) => a.date - b.date);

    const lines = [
        `<div>`,
        `<div>${fmtDate(talks[0].date)}</div>`,
        seriesEventLink(seriesLink, event.title),
    ];

    talks.forEach(talk => {
        const timeRange = formatTimeRange(talk.date, talk.date + talk.duration_min * 60);
        const talkUrl = `${eventPageUrl(event)}/talks/${talk.id}`;
        const talkLang = escHtml(talk.short_language || getLang(event));
        lines.push(
            `<div style="padding-left:16px"><b>•</b> ${timeRange}: <a href="${escHtml(talkUrl)}" target="_blank">${escHtml(talk.title)}</a> | ${talkLang}</div>`
        );
    });

    lines.push(`</div>`);
    return lines.join('\n');
}

function renderSingle(event) {
    const dateStr = fmtDate(event.time_stamp.start);
    const t1 = fmtTime(event.time_stamp.start, ':');
    const t2 = fmtTime(event.time_stamp.end, ':');
    const link = eventPageUrl(event);
    return [
        `<div>`,
        `<div>${dateStr}, ${t1} - ${t2}</div>`,
        `<div style="font-weight:600;margin-top:2px;"><a href="${link}" target="_blank">${escHtml(event.title)}</a></div>`,
        `<div>Мова: ${escHtml(getLang(event))}</div>`,
        `</div>`,
    ].join('\n');
}

function renderTalk(event, talk) {
    const seriesLink = eventPageUrl(event);
    const lang = escHtml(talk.short_language || getLang(event));
    const timeRange = formatTimeRange(talk.date, talk.date + talk.duration_min * 60);
    const talkUrl = `${eventPageUrl(event)}/talks/${talk.id}`;
    return [
        `<div>`,
        `<div>${fmtDate(talk.date)}, ${timeRange}</div>`,
        seriesEventLink(seriesLink, event.title),
        `<div style="font-weight:600;margin-top:2px;"><a href="${escHtml(talkUrl)}" target="_blank">${escHtml(talk.title)}</a></div>`,
        `<div>Мова: ${lang}</div>`,
        `</div>`,
    ].join('\n');
}


// ─── Modal ────────────────────────────────────────────────────────────────────

function showModal(html, type = 'events') {
    const existingModal = document.getElementById('tm-modal');
    const currentType = existingModal ? existingModal.getAttribute('data-modal-type') : null;

    // Only close and recreate if switching modal types (settings ↔ events)
    if (existingModal && currentType !== type) {
        const backdrop = document.getElementById('tm-backdrop');
        if (backdrop) backdrop.remove();
        existingModal.remove();
    } else if (existingModal) {
        // Same type - just update content
        updateModalContent(html);
        return;
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'tm-backdrop';
    Object.assign(backdrop.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.35)', zIndex: '99997',
    });
    // Close only when both mousedown and mouseup land on the backdrop,
    // so text selection that ends outside the modal doesn't dismiss it.
    backdrop.addEventListener('mousedown', e => {
        if (e.target !== backdrop) return;
        backdrop.addEventListener('mouseup', function onUp(e2) {
            backdrop.removeEventListener('mouseup', onUp);
            if (e2.target === backdrop) closeModal();
        });
    });
    document.body.appendChild(backdrop);

    // Modal window — fixed, initially centered
    const modal = document.createElement('div');
    modal.id = 'tm-modal';
    modal.setAttribute('data-modal-type', type);
    Object.assign(modal.style, {
        position: 'fixed',
        top: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '99998',
        background: '#fff',
        borderRadius: '8px',
        width: '740px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'sans-serif',
        fontSize: '13px',
        lineHeight: '1.7',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    });

    // Drag handle header
    const header = document.createElement('div');
    Object.assign(header.style, {
        background: '#e8e8e8',
        borderRadius: '8px 8px 0 0',
        padding: '7px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'move',
        userSelect: 'none',
        flexShrink: '0',
    });

    const dragHint = document.createElement('span');
    dragHint.textContent = type === 'settings' ? '⚙ Settings' : '⠿ Events';
    Object.assign(dragHint.style, { fontWeight: 'bold', fontSize: '13px', color: '#444' });

    const btnStyle = {
        cursor: 'pointer', padding: '2px 8px', borderRadius: '4px', background: '#fff', fontSize: '13px',
    };

    const btnGroup = document.createElement('div');
    Object.assign(btnGroup.style, { display: 'flex', gap: '6px' });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, { ...btnStyle, border: 'none', color: '#666' });
    closeBtn.onclick = closeModal;
    btnGroup.appendChild(closeBtn);

    // Add Copy button only for 'events' type
    let copyBtn = null;
    if (type === 'events') {
        copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 Copy';
        Object.assign(copyBtn.style, { ...btnStyle, border: '1px solid #ccc' });
        copyBtn.onclick = async () => {
            const html = content.innerHTML;
            const plain = content.innerText;
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html':  new Blob([html], { type: 'text/html' }),
                    'text/plain': new Blob([plain], { type: 'text/plain' }),
                }),
            ]);
            copyBtn.textContent = '✓ Copied!';
            setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1500);
        };
        btnGroup.insertBefore(copyBtn, closeBtn);
    }

    header.appendChild(dragHint);
    header.appendChild(btnGroup);

    // Scrollable content area
    const content = document.createElement('div');
    content.id = 'tm-modal-content';
    Object.assign(content.style, {
        padding: type === 'settings' ? '16px 16px 12px 16px' : '10px 12px',
        overflowY: 'auto',
        flexGrow: '1',
    });
    content.innerHTML = html;

    modal.appendChild(header);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // ── Drag logic ──
    let dragging = false, ox = 0, oy = 0;

    header.addEventListener('mousedown', e => {
        if (e.target === closeBtn || (type === 'events' && e.target === copyBtn)) return;
        // transform and left/top can't coexist — convert to pixel coords before dragging
        const rect = modal.getBoundingClientRect();
        modal.style.transform = 'none';
        modal.style.left = rect.left + 'px';
        modal.style.top = rect.top + 'px';

        dragging = true;
        ox = e.clientX - rect.left;
        oy = e.clientY - rect.top;
        e.preventDefault();
    });

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', escHandler);

    function onMouseUp() { dragging = false; }

    function onMove(e) {
        if (!dragging) return;
        modal.style.left = (e.clientX - ox) + 'px';
        modal.style.top = (e.clientY - oy) + 'px';
    }

    function closeModal() {
        modal.remove();
        backdrop.remove();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('keydown', escHandler);
    }

    function escHandler(e) {
        if (e.key === 'Escape') closeModal();
    }
}

function updateModalContent(html) {
    const content = document.getElementById('tm-modal-content');
    if (content) content.innerHTML = html;
}
