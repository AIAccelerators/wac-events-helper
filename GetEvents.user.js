// ==UserScript==
// @name         GetEvents
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  try to take over the world!
// @author       You
// @match        https://wearecommunity.io/events
// @match        https://wearecommunity.io/events/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    const customButton = createCustomButton();
    customButton.addEventListener('click', function() {
        // const panelWrapper = document.querySelector('.evnt-panel-wrapper');
        // if (panelWrapper) {
        //     const agendaData = new AgendaData(panelWrapper).extractData();
        //     console.log(agendaData); // або інша дія з даними
        // } else {
        //     console.log('Елемент .evnt-panel-wrapper не знайдено');
        // }
        readEventViaAPI(new Date('05-19-2026'), new Date('05-31-2026'));
    });
    document.body.appendChild(customButton);



})();

function readEventViaAPI(dateFrom, dateTill)
{
    // Форматуємо дати у MM/DD/YYYY
    function formatDate(date) {
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${mm}/${dd}/${yyyy}`;
    }

    const from = new Date(dateFrom);
    const till = new Date(dateTill);

    const url = `https://wearecommunity.io/api/v2/events.json?start=0&period=upcoming&tag%5B%5D=AI&tag%5B%5D=Artificial%20intelligence&date_from=${encodeURIComponent(formatDate(from))}&date_till=${encodeURIComponent(formatDate(till))}`;

    GM_xmlhttpRequest({
        method: "GET",
        url: url,
        headers: {
            "Accept": "application/json"
        },
        onload: function(response) {
            // Парсимо JSON
            const data = JSON.parse(response.responseText);
            console.log("Response data:\r\n");
            console.log(data); // Далі працюйте з даними
        },
        onerror: function(error) {
            console.error("API error:", error);
        }
    });
}

/**
* @typeof {Object} eventData
* @property {string} title
* @property {Date} startTime
* @property {Date} duration
*/
/** @type {eventData} */


function getSeriesTitle()
{
    return document.querySelector('h1').textContent
};

function createCustomButton()
{
    const el = document.createElement('div');
    el.textContent = 'Get schedule';
    el.style.position = 'fixed';
    el.style.top = '5px'; // Відступ від верхнього краю (можна змінити)
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.zIndex = 99999; // Щоб був поверх інших елементів
    el.style.background = '#fff';
    el.style.padding = '15px 40px';
    el.style.border = '1px solid #333';
    el.style.borderRadius = '8px';
    el.style.fontWeight = 'bold';

    return el;
};

class AgendaData {
    constructor(panelWrapper) {
        this.panelWrapper = panelWrapper;
    }

    extractData() {
        // Ваша логіка витягування даних
        const dayTab = this.panelWrapper.querySelector('.evnt-agenda-days-tabs-nav li.evnt-day-tab span');
        let eventDate = null;
        if (dayTab) {
            const monthMap = {
                'Січ': 'Jan', 'Лют': 'Feb', 'Бер': 'Mar', 'Кві': 'Apr', 'Тра': 'May',
                'Чер': 'Jun', 'Лип': 'Jul', 'Сер': 'Aug', 'Вер': 'Sep', 'Жов': 'Oct',
                'Лис': 'Nov', 'Гру': 'Dec'
            };
            const dateParts = dayTab.textContent.trim().split(' ');
            if (dateParts.length === 2) {
                const day = dateParts[0];
                const month = monthMap[dateParts[1]];
                const year = new Date().getFullYear();
                eventDate = new Date(`${day} ${month} ${year}`);
            }
        }

        const agendaContents = this.panelWrapper.querySelectorAll('.evnt-agenda-timeline-container .evnt-timeline-table');
        const result = [];

        agendaContents.forEach(table => {
            const timeCell = table.querySelector('.evnt-timeline-cell.agenda-time span');
            let startTime = null;
            if (timeCell && eventDate) {
                const timeParts = timeCell.textContent.trim().split(':');
                if (timeParts.length === 2) {
                    const dateCopy = new Date(eventDate);
                    dateCopy.setHours(parseInt(timeParts[0], 10));
                    dateCopy.setMinutes(parseInt(timeParts[1], 10));
                    dateCopy.setSeconds(0);
                    startTime = dateCopy;
                }
            }

            const titleSpan = table.querySelector('.evnt-talk-name h2 span');
            const title = titleSpan ? titleSpan.textContent.trim() : '';

            const durationP = table.querySelector('p.duration');
            let duration = null;
            if (durationP) {
                const match = durationP.textContent.match(/(\d+)\s*хв/);
                if (match) {
                    duration = new Date(0, 0, 0, 0, parseInt(match[1], 10), 0, 0);
                }
            }

            if (title) {
                result.push({
                    title,
                    date: eventDate,
                    startTime,
                    duration
                });
            }
        });

        return result;
    }
}