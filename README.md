# Trading Chart Calendar

A fully static calendar viewer for trading chart screenshots, event/news annotations, and holidays.

The app is designed primarily for GitHub Pages. You add screenshots and JSON data under `charts/`, push, refresh, and the site should reflect the changes without app-code edits.

## Stack

- HTML
- CSS
- Vanilla JavaScript
- GitHub Pages / Jekyll-compatible static hosting

## What the app does

- Shows screenshots in a monthly Sunday-first calendar
- Supports multiple symbols, currently including `NIFTY50`, `BANKNIFTY`, and `P_AND_L_AND_LEARNINGS`
- Opens a larger modal/lightbox when a chart thumbnail is clicked
- Uses a large image viewer with previous/next navigation across actual chart days only
- Shows subtle blue and yellow event markers on the day tiles
- Shows red/green P&L markers on the day tiles when monthly `pnl.json` data exists
- Opens an event popup for past or future items
- Opens a P&L popup for day P&L markers
- Shows centered holiday labels on empty holiday dates
- Shows a monthly P&L summary inside the last Saturday tile of the month
- Works on desktop and mobile

## Current UI behavior

- Default symbol: `NIFTY50`
- Default month: current month
- Blue marker: past events/news
- Yellow marker: future events/news
- Green marker: day profit from `pnl.json`
- Red marker: day loss from `pnl.json`
- Event popup shows:
  - impact and certainty bars
  - event status circles
  - sentiment emojis
  - hover text for the visual values
- Holiday text is shown only when the day has no chart thumbnail
- If a day has both a chart and an event, the event marker is shown in the top row beside the date
- If a day has both a chart and day P&L, the red/green P&L bar is shown in the top row beside the date
- The monthly P&L summary is shown on the last Saturday tile of the selected month
- If the last Saturday also has a chart, the monthly summary is overlaid inside that chart tile
- Clicking the monthly P&L summary opens a larger popup with the same Profit / Loss / Net breakdown

## Current screenshot viewer behavior

- A date can have multiple screenshots
- The tile uses the first image as the main thumbnail
- The tile shows a numeric count badge when that date has multiple images
- Opening a chart day shows the large image in a modal/lightbox
- Left/right modal navigation still moves across chart days, not across sibling images of the same day
- If that day has multiple images, small image tiles are shown at the bottom of the popup
- Clicking those bottom image tiles switches the large image for that same date
- The image popup keeps a large image area and bottom controls inside the same window without page scrolling
- `+` and `-` buttons zoom the image
- When zoomed in, the image can be dragged/panned inside the viewport

## Project files

- `index.html`: layout, controls, modal structure
- `styles.css`: calendar, modal, event marker, holiday, and viewer styling
- `script.js`: all runtime logic
- `chart-index.json`: Jekyll/Liquid image manifest for hosted use
- `event-data.js`: embedded data fallback, mainly for `file://`
- `schemas/eventsAndNewsSchema.json`: event/news schema reference
- `scripts/build-event-data.js`: rebuilds `event-data.js`
- `scripts/serve-local.js`: tiny local static server for local testing
- `charts/`: screenshots + data

## Data model

The app reads everything from `charts/`.

### Screenshot folders

Recommended:

```text
charts/
  SYMBOL/
    YEAR/
      MONTH/
        DD-MM-YYYY.png
```

Examples:

```text
charts/NIFTY50/2026/april/24-04-2026.png
charts/BANKNIFTY/2027/january/01-01-2027.png
```

Also supported:

```text
charts/
  SYMBOL/
    MONTH/
      DD-MM-YYYY.png
```

### Event and holiday JSON folders

Both symbol-level and year-level JSON are supported.

Supported:

```text
charts/SYMBOL/pastEventsAndNews.json
charts/SYMBOL/futureEventsAndNews.json
charts/SYMBOL/holiday.json

charts/SYMBOL/YEAR/pastEventsAndNews.json
charts/SYMBOL/YEAR/futureEventsAndNews.json
charts/SYMBOL/YEAR/holiday.json
```

At runtime, the app merges what exists for the selected `symbol + year`.

That means:

- symbol-level JSON can hold shared/default data for that symbol
- year-level JSON can hold year-specific data
- for a selected symbol/year, both sources are considered if both exist

### P&L JSON folders

P&L is month-specific.

Supported:

```text
charts/SYMBOL/YEAR/MONTH/pnl.json
```

Examples:

```text
charts/P_AND_L_AND_LEARNINGS/2026/march/pnl.json
charts/P_AND_L_AND_LEARNINGS/2026/april/pnl.json
charts/P_AND_L_AND_LEARNINGS/2026/may/pnl.json
```

Current runtime expectation:

- one `pnl.json` per month folder
- the month folder name should match the selected month name, for example `march`, `april`, `may`
- the app loads the month file for the currently selected `symbol + yearMonth`
- no app-code change is needed when adding a new month on GitHub Pages or the local server

Recommended P&L JSON shape:

```json
[
  {
    "date": "03-08-2026",
    "profit": 35000.0,
    "loss": 0
  },
  {
    "date": "04-08-2026",
    "profit": 0,
    "loss": 12500.0
  }
]
```

Practical meaning:

- `profit > 0` means that day gets a green P&L marker
- `loss > 0` means that day gets a red P&L marker
- if both are `0`, the runtime ignores that day for marker purposes
- for the current implementation, one entry per date is the intended shape

## Source-of-truth date rules

These rules are important.

### Screenshots

The screenshot filename date is authoritative, not the parent folder name.

Valid screenshot names:

- `DD-MM-YYYY.png`
- `DD-MM-YYYY.jpg`
- `DD-MM-YYYY.jpeg`
- `YYYY-MM-DD.png`
- `YYYY-MM-DD.jpg`
- `YYYY-MM-DD.jpeg`

Example:

- `charts/NIFTY50/2027/January/1-01-2026.png` will be treated as **January 1, 2026**, even if it lives inside a `2027` folder.

### Event/news JSON

The `date` field is authoritative.

Accepted format:

- `DD-MM-YYYY`
- single-digit day/month values are also tolerated by the runtime parser, for example `1-01-2027`

### Holiday JSON

The `date` field is authoritative.

Accepted format:

- `DD-MM-YYYY`
- single-digit day/month values are also tolerated by the runtime parser

### P&L JSON

The `date` field is authoritative.

Accepted format:

- `DD-MM-YYYY`
- single-digit day/month values are also tolerated by the runtime parser

Important implementation detail:

- the `date` inside `pnl.json` decides which calendar day gets the red/green day marker
- the month folder still matters because the runtime fetches `pnl.json` from the selected month folder
- the monthly summary is not shown on the entry date; it is shown on the last Saturday tile of that month

## P&L behavior

This section is important for future AI sessions.

### Day markers

- A green bar means the day P&L is profit
- A red bar means the day P&L is loss
- The bar is shown in the top row of the day tile, on the same row as the date number
- The bar is shorter than the full tile width and visually centered
- Clicking the day P&L bar opens a popup with the exact value

### Monthly summary tile

- The app computes:
  - total profit for the month
  - total loss for the month
  - net profit/loss for the month
- The summary is rendered in the last available Saturday tile of the selected month
- The tile background is lightly tinted:
  - light green if monthly net is positive
  - light red if monthly net is negative
- The summary text itself shows:
  - `Profit`
  - `Loss`
  - `Net`
- The net line color follows the monthly net result
- Clicking the monthly summary opens a larger popup with the same data

### Important monthly-summary rule

The summary tile is based on the month being viewed, not the trade date itself.

Example:

- a July entry with date `03-07-2026` still contributes to the July monthly summary
- the July monthly summary appears on the last Saturday of July 2026, not on July 3
- if the last Saturday already contains a chart image, the summary is overlaid inside that chart tile

## Event/news schema

Schema file:

- `schemas/eventsAndNewsSchema.json`

The app currently uses these practical fields:

- `date`
- `event_type` or `type`
- `content`
- `impact`
- `event_status`
- `certainty`
- `affected_indices`
- `sentiment`
- `notes`
- `source`

Important implementation note:

- `affected_indices` is display metadata in the popup
- it does **not** decide which symbol the record belongs to
- the symbol directory the JSON came from is what decides which symbol sees the data

So:

- data inside `charts/NIFTY50/...` is shown for `NIFTY50`
- data inside `charts/BANKNIFTY/...` is shown for `BANKNIFTY`

## Hosting behavior

### GitHub Pages

GitHub Pages is the intended environment.

Image loading:

- the app uses `chart-index.json`
- `chart-index.json` is generated by Jekyll/Liquid from the `charts/` folder

Event/news/holiday loading:

- the app prefers live JSON files from `charts/...`
- `event-data.js` is also applied as an immediate baseline/fallback
- once live JSON loads, the selected symbol-year data is replaced with the current JSON contents for that year

This setup is meant to allow:

1. add or edit screenshots / JSON
2. push to GitHub
3. refresh the site

For P&L month files specifically:

- adding `charts/SYMBOL/YEAR/june/pnl.json` or `charts/SYMBOL/YEAR/july/pnl.json` should work with no code changes
- adding a new month image folder also works with no code changes
- this is the preferred fully dynamic environment

### Local `file://`

Direct disk opening still works, but with limits:

- screenshot probing works
- live JSON fetching is limited by the browser on `file://`
- `event-data.js` exists mainly to support this mode
- local `fetch()` of new month `pnl.json` files does **not** work reliably on `file://`
- `event-data.js` is a snapshot, so new month P&L JSON added after the snapshot will not appear until the snapshot is rebuilt
- this is a browser security limitation, not an app logic preference

If you want local behavior closer to GitHub Pages, run:

```bash
node scripts/serve-local.js
```

Then open:

- `http://127.0.0.1:4173`

### Local server

Using the included server is the recommended local dynamic workflow.

Behavior:

- new screenshot folders are discovered dynamically
- new monthly `pnl.json` files are loaded dynamically
- no code changes are needed when adding future months like `june`, `july`, `august`
- this is the closest local behavior to GitHub Pages

## GitHub Pages setup

1. Push the project to GitHub
2. Open repository `Settings`
3. Open `Pages`
4. Choose `Deploy from a branch`
5. Select branch `main`
6. Select folder `/ (root)`
7. Save

Important:

- do **not** add `.nojekyll`
- `chart-index.json` contains Jekyll/Liquid and must be processed by GitHub Pages

## Updating content later

### Screenshots

1. Add screenshots to the correct symbol/year/month folder
2. Make sure the filename date is correct
3. Push
4. Refresh GitHub Pages

### Events and holidays

1. Add or edit:
   - `pastEventsAndNews.json`
   - `futureEventsAndNews.json`
   - `holiday.json`
2. Put them either at symbol level, year level, or both
3. Make sure the `date` values are correct
4. Push
5. Refresh GitHub Pages

For direct `file://` testing only, rebuild the embedded fallback after JSON changes:

```bash
node scripts/build-event-data.js
```

### P&L

1. Add or edit `pnl.json` inside the target month folder
2. Use one object per date with `date`, `profit`, and `loss`
3. Make sure the `date` values are correct
4. Push
5. Refresh GitHub Pages

Examples:

```text
charts/P_AND_L_AND_LEARNINGS/2026/june/pnl.json
charts/P_AND_L_AND_LEARNINGS/2026/july/pnl.json
charts/P_AND_L_AND_LEARNINGS/2026/august/pnl.json
```

For direct `file://` testing only, rebuild the embedded fallback after adding a new month or changing P&L JSON:

```bash
node scripts/build-event-data.js
```

If you want new month folders to appear dynamically during local testing without rebuilding fallback data, use:

```bash
node scripts/serve-local.js
```

## Troubleshooting

If something does not show, check these first:

- The screenshot filename date is correct
- The JSON `date` field is correct
- The file is under the intended symbol directory
- The file extension is `png`, `jpg`, or `jpeg`
- The month you are viewing matches the date inside the filename/JSON
- On GitHub Pages, hard refresh after pushing
- Do not use `.nojekyll`
- If the issue is with `pnl.json`, confirm the file lives inside the month folder, for example `charts/SYMBOL/2026/august/pnl.json`
- If using `file://`, remember that new month P&L JSON needs a rebuilt `event-data.js`
- If a monthly summary seems to be “missing”, check the last Saturday of the selected month
- If a month summary is expected on the entry date itself, that is not the current rule
- If a date has multiple screenshots, the date still has only one day-level P&L marker

Examples of easy-to-miss mistakes:

- a screenshot inside `2027/` named `1-01-2026.png`
- a holiday meant for January 26 entered as `1-01-2027`
- adding data under `NIFTY50` and expecting it to appear under `BANKNIFTY`
- expecting `july/pnl.json` to appear on raw `file://` without rebuilding `event-data.js`
- expecting the monthly summary to appear on the trade date instead of the month’s last Saturday
- visiting a month before adding its files, then testing again without refreshing the page/server

## Recent feature notes

These notes capture newer behavior that future AI sessions should understand quickly.

- `P_AND_L_AND_LEARNINGS` is a supported symbol
- same-day multi-image screenshot groups are supported
- same-day multi-image tiles show a count badge on the calendar tile
- the image modal shows sibling image thumbnails for the same date
- the image modal supports zoom in, zoom out, and drag-to-pan
- monthly P&L summary tiles are clickable and open a larger popup
- new month screenshot folders and `pnl.json` files are dynamically supported on GitHub Pages and the local server
- raw `file://` is intentionally treated as a limited fallback mode
- `event-data.js` is still needed only for `file://` fallback, not as the primary hosted source

## Developer notes

- The app is fully static
- No backend
- No framework
- No build pipeline is required for GitHub Pages runtime behavior
- `event-data.js` is generated fallback data, not the primary hosted source
- The runtime dedupes identical event items by signature
- Live JSON loading now replaces the selected symbol-year data instead of only appending, so stale entries should not survive when the JSON changes
- P&L data is month-level, not year-level
- P&L file path pattern is `charts/SYMBOL/YEAR/monthname/pnl.json`
- Monthly P&L totals are computed client-side from the loaded month JSON
- The monthly summary target tile is the last Saturday of the currently selected month
- The runtime was updated so “month not found” results are retried instead of being cached forever during the session
- Browser `file://` restrictions are the main reason fully dynamic local JSON loading is not reliable without the local server

## Quick resume notes for a future session

- Main runtime file: `script.js`
- Main style file: `styles.css`
- Image manifest: `chart-index.json`
- Embedded fallback data: `event-data.js`
- Rebuild fallback data: `node scripts/build-event-data.js`
- Local server: `node scripts/serve-local.js`
- Date in filename / JSON is the real source of truth
- Symbol directory decides ownership of event/news/holiday data
- P&L month file path: `charts/SYMBOL/YEAR/monthname/pnl.json`
- Red/green day bars come from `pnl.json`
- Monthly Profit / Loss / Net summary appears on the last Saturday tile
- GitHub Pages and the local server are the true dynamic modes
- `file://` is fallback-only for new JSON data
