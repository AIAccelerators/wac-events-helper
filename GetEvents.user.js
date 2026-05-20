// ==UserScript==
// @name         GetEvents
// @namespace    http://tampermonkey.net/
// @version      0.0.2
// @description  Fetch and display AI events from wearecommunity.io via API
// @author       You
// @match        https://wearecommunity.io/events
// @match        https://wearecommunity.io/events/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
    'use strict';
    createUI();
})();

// ─── UI panel ────────────────────────────────────────────────────────────────

function createUI() {
    const today = new Date();
    const weekLater = new Date(today);
    weekLater.setDate(today.getDate() + 7);

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
        `<button id="tm-btn" style="padding:4px 12px;cursor:pointer;font-weight:bold;">Get schedule</button>`;

    document.body.appendChild(panel);
    document.getElementById('tm-btn').addEventListener('click', onFetch);
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
    showModal('<p>Завантаження…</p>');

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

        updateModalContent(renderEvents(realEvents, agendaMap));
    } catch (err) {
        updateModalContent(`<p style="color:red">Помилка: ${escHtml(err.message)}</p>`);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Get schedule';
    }
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
    const base =
        `https://wearecommunity.io/api/v2/events.json?period=upcoming` +
        `&tag%5B%5D=AI&tag%5B%5D=Artificial%20intelligence` +
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
    return event.language || (Array.isArray(event.languages) && event.languages[0]) || '';
}

function eventPageUrl(event) {
    return `https://wearecommunity.io/events/${event.url}`;
}

// ─── Renderers ────────────────────────────────────────────────────────────────

function renderEvents(events, agendaMap) {
    if (!events.length) return '<p>Подій не знайдено.</p>';
    const divider = '<hr style="border:none;border-top:1px solid #ddd;margin:10px 0">';
    return events
        .map(e => e.size === 's' ? renderSingle(e) : renderSeries(e, agendaMap[e.id]))
        .join(divider);
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

function renderSeries(event, agendaData) {
    const link = eventPageUrl(event);
    const lines = [
        `<div>`,
        `<div><b>Серія подій:</b> <a href="${link}" target="_blank">${escHtml(event.title)}</a></div>`,
    ];

    const items = agendaData && agendaData.agenda && agendaData.agenda.items;
    if (items && items.length) {
        const byDay = new Map();
        items
            .filter(i => i.is_speech)
            .sort((a, b) => a.date - b.date)
            .forEach(item => {
                const d = tsDate(item.date);
                const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                if (!byDay.has(key)) byDay.set(key, { dayTs: item.date, speeches: [] });
                byDay.get(key).speeches.push(item);
            });

        for (const { dayTs, speeches } of byDay.values()) {
            lines.push(`<div>${fmtDate(dayTs)}:</div>`);
            speeches.forEach(item => {
                const t1 = fmtTime(item.date, '.');
                const t2 = fmtTime(item.date + item.duration_min * 60, '.');
                const streamUrl = item.is_link_to_stream && item.stream_struct && item.stream_struct.url;
                const linkPart = streamUrl
                    ? ` (<a href="${escHtml(streamUrl)}" target="_blank">+link</a>)`
                    : '';
                lines.push(
                    `<div style="padding-left:16px">* ${t1} - ${t2} ${escHtml(item.title)}${linkPart}</div>`
                );
            });
        }
    } else {
        lines.push(
            `<div>${fmtDate(event.time_stamp.start)} — ${fmtDate(event.time_stamp.end)}</div>`
        );
    }

    lines.push(`<div>Мова: ${escHtml(getLang(event))}</div>`);
    lines.push(`</div>`);
    return lines.join('\n');
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function showModal(html) {
    if (document.getElementById('tm-modal')) {
        updateModalContent(html);
        return;
    }

    // Semi-transparent backdrop — click to close
    const backdrop = document.createElement('div');
    backdrop.id = 'tm-backdrop';
    Object.assign(backdrop.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.35)', zIndex: '99997',
    });
    backdrop.addEventListener('click', closeModal);
    document.body.appendChild(backdrop);

    // Modal window — fixed, initially centered
    const modal = document.createElement('div');
    modal.id = 'tm-modal';
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
    dragHint.textContent = '⠿ Events';
    Object.assign(dragHint.style, { fontWeight: 'bold', fontSize: '13px', color: '#444' });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'cursor:pointer;padding:2px 8px;border:1px solid #aaa;border-radius:4px;background:#fff;font-size:13px;';
    closeBtn.onclick = closeModal;

    header.appendChild(dragHint);
    header.appendChild(closeBtn);

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
        if (e.target === closeBtn) return;
        // Resolve transform to pixel coords on first drag
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
    document.addEventListener('mouseup', () => { dragging = false; });

    function onMove(e) {
        if (!dragging) return;
        modal.style.left = (e.clientX - ox) + 'px';
        modal.style.top = (e.clientY - oy) + 'px';
    }

    function closeModal() {
        modal.remove();
        backdrop.remove();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('keydown', escHandler);
    }

    function escHandler(e) {
        if (e.key === 'Escape') closeModal();
    }
    document.addEventListener('keydown', escHandler);
}

function updateModalContent(html) {
    const content = document.getElementById('tm-modal-content');
    if (content) content.innerHTML = html;
}
