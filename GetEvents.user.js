// ==UserScript==
// @name         GetEvents
// @namespace    http://tampermonkey.net/
// @version      0.0.16
// @description  Fetch and display AI events from wearecommunity.io via API
// @author       You
// @match        https://wearecommunity.io/events
// @match        https://wearecommunity.io/events?*
// @match        https://wearecommunity.io/events/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';
    createUI();
})();

// ─── Settings Manager ────────────────────────────────────────────────────────

const SettingsManager = {
    STORAGE_KEY: 'tm_selected_tags',
    STORAGE_KEY_GROUP_SERIES: 'tm_group_series',
    DEFAULT_TAGS: ['AI', 'Artificial intelligence'],
    DEFAULT_GROUP_SERIES: true,

    getTags() {
        const stored = GM_getValue(this.STORAGE_KEY);
        if (!stored) return this.DEFAULT_TAGS;
        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) && parsed.length > 0 ? parsed : this.DEFAULT_TAGS;
        } catch (_) {
            return this.DEFAULT_TAGS;
        }
    },

    setTags(tags) {
        GM_setValue(this.STORAGE_KEY, JSON.stringify(tags));
    },

    getGroupSeries() {
        const stored = GM_getValue(this.STORAGE_KEY_GROUP_SERIES);
        if (stored === undefined || stored === null || stored === '') return this.DEFAULT_GROUP_SERIES;
        return stored === 'true' || stored === true;
    },

    setGroupSeries(value) {
        GM_setValue(this.STORAGE_KEY_GROUP_SERIES, String(value));
    },

    reset() {
        GM_setValue(this.STORAGE_KEY, '');
        GM_setValue(this.STORAGE_KEY_GROUP_SERIES, '');
    }
};

// ─── UI panel ────────────────────────────────────────────────────────────────

function createUI() {
    const today = new Date();
    const weekLater = new Date(today);
    weekLater.setDate(today.getDate() + 5);

    const panel = document.createElement('div');
    panel.id = 'tm-panel';
    Object.assign(panel.style, {
        position: 'fixed',
        top: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '99999',
        background: '#fff',
        padding: '7px 14px',
        border: '1px solid #555',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: 'sans-serif',
        fontSize: '13px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
        whiteSpace: 'nowrap',
    });

    panel.innerHTML =
        `<label>Від: <input id="tm-from" type="date" value="${toInputDate(today)}"></label>` +
        `<label>До:&nbsp; <input id="tm-till" type="date" value="${toInputDate(weekLater)}"></label>` +
        `<button id="tm-btn" style="padding:4px 12px;cursor:pointer;font-weight:bold;">Get schedule</button>` +
        `<button id="tm-settings-btn" style="padding:4px 12px;cursor:pointer;font-weight:bold;">⚙ Settings</button>`;

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
    showModal('<p>Завантаження…</p>', 'events');

    try {
        const events = await fetchAllEvents(dateFrom, dateTill);
        const realEvents = events.filter(e => !e.is_ad && typeof e.id === 'number');

        const agendaMap = {};
        await Promise.all(
            realEvents
                .filter(e => e.size !== 's')
                .map(async e => {
                    try { agendaMap[e.id] = await fetchAgenda(e.id); }
                    catch (_) { /* leave undefined — will fall back to date range */ }
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

function createSettingsUIHtml() {
    const currentTags = SettingsManager.getTags();
    const groupSeries = SettingsManager.getGroupSeries();
    const selectedHtml = currentTags.map(t => `<span style="display:inline-block;background:#ddd;padding:2px 6px;margin:2px 2px 2px 0;border-radius:3px;">${escHtml(t)}</span>`).join('');

    return `
        <h4>Select Tags</h4>
        <input id="tm-settings-search" type="text" placeholder="Search tags..." style="width:100%;padding:6px 8px;margin-bottom:10px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;">
        <div id="tm-settings-dropdown" style="max-height:200px;overflow-y:auto;border:1px solid #ddd;border-radius:4px;margin-bottom:10px;"></div>
        <div id="tm-settings-selected" style="margin-bottom:10px;padding:8px;background:#f5f5f5;border-radius:4px;min-height:24px;"><strong>Selected (${currentTags.length}):</strong><br>${selectedHtml}</div>

        <h4 style="margin-top:16px;">Display Options</h4>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:10px;">
            <input id="tm-settings-group-series" type="checkbox" ${groupSeries ? 'checked' : ''} style="cursor:pointer;">
            <span>Group series events</span>
        </label>

        <button id="tm-settings-save" style="padding:6px 12px;cursor:pointer;background:#007bff;color:#fff;border:none;border-radius:4px;font-size:13px;margin-top:10px;">Save</button>
        <button id="tm-settings-reset" style="padding:6px 12px;cursor:pointer;background:#6c757d;color:#fff;border:none;border-radius:4px;font-size:13px;margin-left:6px;margin-top:10px;">Reset to Defaults</button>
    `;
}

function attachSettingsHandlers() {
    const currentTags = SettingsManager.getTags();
    const searchInput = document.getElementById('tm-settings-search');
    const dropdown = document.getElementById('tm-settings-dropdown');
    const selectedList = document.getElementById('tm-settings-selected');
    const saveBtn = document.getElementById('tm-settings-save');
    const resetBtn = document.getElementById('tm-settings-reset');
    const groupSeriesCheckbox = document.getElementById('tm-settings-group-series');

    if (!searchInput || !dropdown || !saveBtn || !resetBtn || !groupSeriesCheckbox) return;

    const tagCheckboxes = {};
    let allOptions = [...currentTags];

    async function updateDropdown(query) {
        dropdown.innerHTML = '';
        let options = allOptions;

        if (query.trim()) {
            try {
                const results = await gmGet(
                    `https://wearecommunity.io/api/v2/dictionaries/skills/search?search_query=${encodeURIComponent(query)}`
                );
                if (Array.isArray(results)) {
                    options = results;
                    allOptions = [...new Set([...allOptions, ...options])];
                }
            } catch (err) {
                console.error('Tag search failed:', err);
            }
        }

        options = [...new Set(options)].sort();

        options.forEach(tag => {
            const label = document.createElement('label');
            Object.assign(label.style, {
                display: 'block',
                padding: '6px 8px',
                cursor: 'pointer',
                borderBottom: '1px solid #eee',
            });

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = tag;
            checkbox.checked = currentTags.includes(tag);
            tagCheckboxes[tag] = checkbox;

            const span = document.createElement('span');
            span.textContent = escHtml(tag);
            Object.assign(span.style, { marginLeft: '6px' });

            label.appendChild(checkbox);
            label.appendChild(span);
            dropdown.appendChild(label);
        });
    }

    searchInput.addEventListener('input', e => updateDropdown(e.target.value));

    saveBtn.onclick = () => {
        const selected = Object.entries(tagCheckboxes)
            .filter(([_, cb]) => cb.checked)
            .map(([tag, _]) => tag);
        if (selected.length > 0) {
            SettingsManager.setTags(selected);
            currentTags.length = 0;
            currentTags.push(...selected);
            updateDropdown('');
            selectedList.innerHTML = `<strong>Selected (${selected.length}):</strong><br>${selected.map(t => `<span style="display:inline-block;background:#ddd;padding:2px 6px;margin:2px 2px 2px 0;border-radius:3px;">${escHtml(t)}</span>`).join('')}`;
        }
        SettingsManager.setGroupSeries(groupSeriesCheckbox.checked);
    };

    resetBtn.onclick = () => {
        SettingsManager.reset();
        currentTags.length = 0;
        currentTags.push(...SettingsManager.DEFAULT_TAGS);
        updateDropdown('');
        selectedList.innerHTML = `<strong>Selected (${SettingsManager.DEFAULT_TAGS.length}):</strong><br>${SettingsManager.DEFAULT_TAGS.map(t => `<span style="display:inline-block;background:#ddd;padding:2px 6px;margin:2px 2px 2px 0;border-radius:3px;">${escHtml(t)}</span>`).join('')}`;
        groupSeriesCheckbox.checked = SettingsManager.DEFAULT_GROUP_SERIES;
    };

    updateDropdown('');
}

function gmGet(url) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url,
            headers: { Accept: 'application/json' },
            onload(r) {
                try { resolve(JSON.parse(r.responseText)); }
                catch (e) { reject(new Error('JSON parse error: ' + url)); }
            },
            onerror() { reject(new Error('Network error: ' + url)); },
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
    const tagParams = tags.map(t => `&tag%5B%5D=${encodeURIComponent(t)}`).join('');
    const base =
        `https://wearecommunity.io/api/v2/events.json?period=upcoming` +
        tagParams +
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
    const divider = '<hr style="border:none;border-top:1px solid #ddd;margin:10px 0">';
    const groupSeries = SettingsManager.getGroupSeries();

    const filtered = events.filter(e => {
        if (e.size === 's') return e.time_stamp.start >= dateFromTs && e.time_stamp.start < dateTillTs;
        return true;
    });

    if (groupSeries) {
        // Grouped mode: sort series/singles together by earliest date
        const sortKeys = filtered.map(e => {
            if (e.size === 's') {
                return e.time_stamp.start;
            }
            const agendaData = agendaMap[e.id];
            const items = agendaData && agendaData.agenda && agendaData.agenda.items;
            if (items) {
                const filteredTalks = items.filter(i => i.is_speech && i.date >= dateFromTs && i.date < dateTillTs);
                if (filteredTalks.length > 0) {
                    return Math.min(...filteredTalks.map(t => t.date));
                }
            }
            return e.time_stamp.start;
        });

        const indexed = filtered.map((e, i) => ({ event: e, sortKey: sortKeys[i] }));
        indexed.sort((a, b) => {
            if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
            return a.event.title.localeCompare(b.event.title, 'uk');
        });

        return indexed
            .map(({ event: e }) => e.size === 's' ? renderSingle(e) : renderSeries(e, agendaMap[e.id], dateFromTs, dateTillTs, true))
            .join(divider);
    } else {
        // Ungrouped mode: flatten all talks and sort globally by date
        const allItems = [];

        filtered.forEach(e => {
            if (e.size === 's') {
                allItems.push({ type: 'single', event: e, sortDate: e.time_stamp.start, title: e.title });
            } else {
                const agendaData = agendaMap[e.id];
                const items = agendaData && agendaData.agenda && agendaData.agenda.items;
                if (items) {
                    const talks = items.filter(i => i.is_speech && i.date >= dateFromTs && i.date < dateTillTs);
                    talks.forEach(talk => {
                        allItems.push({ type: 'talk', event: e, talk: talk, sortDate: talk.date, title: talk.title });
                    });
                }
            }
        });

        allItems.sort((a, b) => {
            if (a.sortDate !== b.sortDate) return a.sortDate - b.sortDate;
            return a.title.localeCompare(b.title, 'uk');
        });

        return allItems
            .map(item => {
                if (item.type === 'single') {
                    return renderSingle(item.event);
                } else {
                    return renderTalk(item.event, item.talk);
                }
            })
            .join(divider);
    }
}

function renderSingle(event) {
    const dateStr = fmtDate(event.time_stamp.start);
    const t1 = fmtTime(event.time_stamp.start, ':');
    const t2 = fmtTime(event.time_stamp.end, ':');
    const link = eventPageUrl(event);
    return [
        `<div>`,
        `<div>${dateStr}, ${t1} - ${t2}</div>`,
        `<div>TALK: <a href="${link}" target="_blank">${escHtml(event.title)}</a></div>`,
        `<div>Мова: ${escHtml(getLang(event))}</div>`,
        `</div>`,
    ].join('\n');
}

function renderTalk(event, talk) {
    const seriesLink = eventPageUrl(event);
    const lang = escHtml(getLang(event));
    const t1 = fmtTime(talk.date, ':');
    const t2 = fmtTime(talk.date + talk.duration_min * 60, ':');
    const talkUrl = `${eventPageUrl(event)}/talks/${talk.id}`;
    return [
        `<div>`,
        `<div>${fmtDate(talk.date)}, ${t1} - ${t2}</div>`,
        `<div><b>Серія подій:</b> <a href="${escHtml(seriesLink)}" target="_blank">${escHtml(event.title)}</a></div>`,
        `<div>TALK: <a href="${escHtml(talkUrl)}" target="_blank">${escHtml(talk.title)}</a></div>`,
        `<div>Мова: ${lang}</div>`,
        `</div>`,
    ].join('\n');
}

function renderSeries(event, agendaData, dateFromTs, dateTillTs, groupSeries = true) {
    const seriesLink = eventPageUrl(event);
    const lang = escHtml(getLang(event));
    const divider = '<hr style="border:none;border-top:1px solid #ddd;margin:10px 0">';

    const items = agendaData && agendaData.agenda && agendaData.agenda.items;
    const speeches = items
        ? items.filter(i => i.is_speech && i.date >= dateFromTs && i.date < dateTillTs).sort((a, b) => a.date - b.date)
        : [];

    if (!speeches.length) {
        return [
            `<div>`,
            `<div><b>Серія подій:</b> <a href="${escHtml(seriesLink)}" target="_blank">${escHtml(event.title)}</a></div>`,
            `<div>${fmtDate(event.time_stamp.start)} — ${fmtDate(event.time_stamp.end)}</div>`,
            `<div>Мова: ${lang}</div>`,
            `</div>`,
        ].join('\n');
    }

    if (groupSeries) {
        // Group all talks together under the series name
        const uniqueDays = new Set(speeches.map(item => {
            const d = tsDate(item.date);
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        }));

        if (uniqueDays.size === 1) {
            // All talks on one day — grouped bullet list
            const lines = [
                `<div>`,
                `<div>${fmtDate(speeches[0].date)}</div>`,
                `<div><b>Серія подій:</b> <a href="${escHtml(seriesLink)}" target="_blank">${escHtml(event.title)}</a>:</div>`,
            ];
            speeches.forEach(item => {
                const t1 = fmtTime(item.date, ':');
                const t2 = fmtTime(item.date + item.duration_min * 60, ':');
                const talkUrl = `${eventPageUrl(event)}/talks/${item.id}`;
                lines.push(
                    `<div style="padding-left:16px"><b>•</b> ${t1} \u2013 ${t2}: <a href="${escHtml(talkUrl)}" target="_blank">${escHtml(item.title)}</a></div>`
                );
            });
            lines.push(`<div>Мова: ${lang}</div>`, `</div>`);
            return lines.join('\n');
        } else {
            // Talks spread across days — grouped with series header followed by all talks
            const lines = [
                `<div>`,
                `<div><b>Серія подій:</b> <a href="${escHtml(seriesLink)}" target="_blank">${escHtml(event.title)}</a></div>`,
            ];
            speeches.forEach(item => {
                const t1 = fmtTime(item.date, ':');
                const t2 = fmtTime(item.date + item.duration_min * 60, ':');
                const talkUrl = `${eventPageUrl(event)}/talks/${item.id}`;
                lines.push(
                    `<div style="padding-left:16px"><b>•</b> ${fmtDate(item.date)}, ${t1} - ${t2}: <a href="${escHtml(talkUrl)}" target="_blank">${escHtml(item.title)}</a></div>`
                );
            });
            lines.push(`<div>Мова: ${lang}</div>`, `</div>`);
            return lines.join('\n');
        }
    } else {
        // Ungrouped mode: each talk as its own flat entry with series reference
        return speeches.map(item => {
            const t1 = fmtTime(item.date, ':');
            const t2 = fmtTime(item.date + item.duration_min * 60, ':');
            const talkUrl = `${eventPageUrl(event)}/talks/${item.id}`;
            return [
                `<div>`,
                `<div>${fmtDate(item.date)}, ${t1} - ${t2}</div>`,
                `<div><b>Серія подій:</b> <a href="${escHtml(seriesLink)}" target="_blank">${escHtml(event.title)}</a></div>`,
                `<div>TALK: <a href="${escHtml(talkUrl)}" target="_blank">${escHtml(item.title)}</a></div>`,
                `<div>Мова: ${lang}</div>`,
                `</div>`,
            ].join('\n');
        }).join(divider);
    }
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
        top: '60px',
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
        cursor: 'pointer', padding: '2px 8px', border: '1px solid #aaa',
        borderRadius: '4px', background: '#fff', fontSize: '13px',
    };

    const btnGroup = document.createElement('div');
    Object.assign(btnGroup.style, { display: 'flex', gap: '6px' });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, btnStyle);
    closeBtn.onclick = closeModal;
    btnGroup.appendChild(closeBtn);

    // Add Copy button only for 'events' type
    let copyBtn = null;
    if (type === 'events') {
        copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 Copy';
        Object.assign(copyBtn.style, btnStyle);
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
        padding: '12px 16px',
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
