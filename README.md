# WeAreCommunity Events Helper

A Tampermonkey userscript that gathers community events from [wearecommunity.io/events](https://wearecommunity.io/events) and prepares them for announcements.

## Description

This script runs on the WAC Events page and provides a convenient interface to:

- Filter events by date range
- Search and select event tags (e.g., "AI", "Artificial intelligence")
- Fetch detailed event information and agendas
- Copy formatted event schedules for announcements

## Requirements

- Installed browser's extension/add-on: **Tampermonkey** — [Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) | [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

## Installation

1. **Open the RAW script file** — Navigate to the [GetEvents.user.js raw file on GitHub](https://github.com/AIAccelerators/wac-events-helper/raw/refs/heads/main/GetEvents.user.js)
   - Tampermonkey will automatically detect it and prompt you to install

2. **Confirm installation** — Click **Install** in the Tampermonkey dialog

3. **Grant permissions** — Allow the following when prompted:
   - ✅ **Allow User Scripts** — required to run userscripts
   - ✅ **Allow access to file URLs** — required if accessing local files

## Update

The script automatically checks for updates through Tampermonkey:

- **Automatic checks** — Tampermonkey periodically checks the `@updateURL` for newer versions
- **Manual update** — Right-click the Tampermonkey icon → **Find updates** to check immediately
- **Apply update** — When a new version is found, Tampermonkey will prompt you to install it

No manual reinstallation is needed — updates are handled entirely by Tampermonkey.

## Usage

1. Navigate to [https://wearecommunity.io/events](https://wearecommunity.io/events)
2. A **date-range panel** will appear at the top of the page
3. Enter start and end dates
4. Click **⚙ Settings** to select event tags (filters which events are fetched)
5. Click **Get schedule** to fetch and display events
6. Click the **copy icon (📋)** to copy the event schedule for announcements

## Troubleshooting

- **Script not running?** — Ensure Tampermonkey is enabled and the extension has permission to run on `wearecommunity.io`
- **Can't copy events?** — Check that your browser allows clipboard access
- **Missing events?** — Verify the selected tags match the event categories on the site
