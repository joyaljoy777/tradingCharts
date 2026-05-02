# Trading Chart Calendar

This repository is a fully static trading dashboard site hosted on GitHub Pages.

It started as a calendar viewer for chart screenshots and now includes three different symbol-driven view types inside the same single-page app:

- calendar views for screenshot-based symbols like `NIFTY50`, `BANKNIFTY`, and `P_AND_L_AND_LEARNINGS`
- the `FII_DII` analytics chart view
- the `FII_DII_ANALYTICS` dashboard view
- the `MARKET_SENTIMENT` dashboard view

Future AI sessions should treat this README as the primary orientation document for the project.

## Stack

- HTML
- CSS
- Vanilla JavaScript
- Static JSON / generated JS fallback data
- GitHub Pages
- GitHub Actions for Pages deployment and Market Sentiment snapshot refresh

## High-level architecture

The app is a **single-page application without a framework**.

There is only one HTML page:

- `index.html`

That page contains multiple view shells:

- the main screenshot calendar
- the FII/DII flow chart shell
- the FII/DII insights dashboard shell
- the Market Sentiment dashboard shell

The runtime shows or hides those shells based on the selected symbol.

Core idea:

- the **symbol dropdown is the main navigation**
- different symbols can represent either:
  - a normal calendar symbol
  - a non-calendar analytics/dashboard symbol

## Current symbols

### Calendar symbols

- `NIFTY50`
- `BANKNIFTY`
- `P_AND_L_AND_LEARNINGS`

These render the month calendar and load screenshots, events, holidays, and monthly P&L data.

### Non-calendar symbols

- `FII_DII`
- `FII_DII_ANALYTICS`
- `MARKET_SENTIMENT`

These hide the calendar and show a dedicated full-width analytics/dashboard view instead.

## Navigation and routing model

There is **no URL router**.

Navigation flow is:

1. user changes the symbol dropdown
2. `script.js` updates central state
3. `script.js` decides whether the selected symbol is:
   - a calendar symbol
   - a non-calendar symbol
4. the correct shell is shown
5. feature-specific scripts listen for the selection-change event and render their own view

Important implementation details:

- main selection event: `trading-chart-selection-change`
- `script.js` owns the shared app state for selected symbol and month
- month navigation is disabled for non-calendar symbols

## Main files

### App shell and shared runtime

- `index.html`: all shared controls, all view shells, lightbox markup
- `styles.css`: global theme, calendar styles, analytics styles, Market Sentiment styles
- `script.js`: main SPA controller, symbol dropdown population, month navigation, calendar rendering, modal/lightbox behavior, event/holiday/P&L loading

### Calendar support

- `chart-index.json`: generated image manifest used on hosted/static environments
- `event-data.js`: embedded event/holiday/P&L fallback for `file://`
- `schemas/eventsAndNewsSchema.json`: event/news schema reference

### FII / DII views

- `fii-dii-chart.js`: flow chart runtime for `FII_DII`
- `fii-dii-insights.js`: analytics dashboard runtime for `FII_DII_ANALYTICS`
- `fii-dii-data.js`: embedded fallback for `file://`

### Market Sentiment view

- `market-sentiment.js`: Market Sentiment dashboard runtime
- `data/market-sentiment.json`: local/deployed Market Sentiment snapshot used by the frontend
- `scripts/build-market-sentiment-data.js`: fetches Yahoo Finance data and rebuilds `data/market-sentiment.json`

### Utility scripts

- `scripts/build-chart-index.js`: rebuilds `chart-index.json`
- `scripts/build-event-data.js`: rebuilds `event-data.js`
- `scripts/build-fii-dii-data.js`: rebuilds `fii-dii-data.js`
- `scripts/build-market-sentiment-data.js`: refreshes Market Sentiment JSON snapshot
- `scripts/prepare-commit.js`: runs all `build-*.js` generators and core syntax checks
- `scripts/serve-local.js`: local static server for realistic testing

## Project structure

```text
.
├── index.html
├── styles.css
├── script.js
├── market-sentiment.js
├── fii-dii-chart.js
├── fii-dii-insights.js
├── chart-index.json
├── event-data.js
├── fii-dii-data.js
├── data/
│   └── market-sentiment.json
├── charts/
│   ├── NIFTY50/
│   ├── BANKNIFTY/
│   ├── P_AND_L_AND_LEARNINGS/
│   └── FII_DII/
├── scripts/
│   ├── build-chart-index.js
│   ├── build-event-data.js
│   ├── build-fii-dii-data.js
│   ├── build-market-sentiment-data.js
│   ├── prepare-commit.js
│   └── serve-local.js
└── .github/
    └── workflows/
        └── pages.yml
```

## Styling system

The site uses a **single global stylesheet** with CSS custom properties at the top of `styles.css`.

Theme characteristics:

- dark UI
- warm gold accent
- soft borders
- glassy/panel surfaces
- compact spacing
- all major views share the same panel language

Key style patterns:

- shell containers use rounded bordered panels
- labels use uppercase compact eyebrow text
- cards use subtle gradient surfaces
- hover states brighten borders instead of radically changing layouts

Important for future edits:

- do not redesign the UI from scratch
- preserve the dark neutral theme and gold accent
- prefer reusing the existing panel/card vocabulary
- new views should look like they belong beside the existing calendar and analytics views

## Naming conventions

### Symbols

- symbol IDs are uppercase underscore-separated strings in the main app state
- examples:
  - `NIFTY50`
  - `BANKNIFTY`
  - `P_AND_L_AND_LEARNINGS`
  - `FII_DII`
  - `FII_DII_ANALYTICS`
  - `MARKET_SENTIMENT`

### Runtime JS

- plain functions
- mostly `var`, not `const`/`let`, in browser runtime files
- IIFE wrappers around major runtime modules
- DOM is built manually with `document.createElement`
- helper functions are preferred over inline logic

### Generated/build scripts

- Node scripts use `const`
- generator scripts follow the `build-*.js` naming pattern
- `scripts/prepare-commit.js` auto-discovers that pattern

## Shared JS patterns

Common runtime patterns used throughout the project:

- central app state in `script.js`
- hidden/show view shells by toggling `.is-hidden-view`
- render by replacing DOM nodes instead of diffing
- fallback-friendly fetch helpers
- normalize external data before rendering
- use browser `CustomEvent` to notify view-specific modules of selection changes

Important example:

- `script.js` dispatches `trading-chart-selection-change`
- feature modules listen for it and render only when their symbol is active

## Calendar view behavior

The calendar is the default view for calendar symbols.

It supports:

- screenshot thumbnails
- same-day multiple screenshots
- image count badges
- image lightbox
- left/right navigation across chart days
- zoom in/out
- drag-to-pan when zoomed
- event markers
- holiday labels
- daily P&L markers
- monthly P&L summary on the last Saturday tile

### Screenshot naming rules

Accepted screenshot filename formats:

- `DD-MM-YYYY.png`
- `DD-MM-YYYY.jpg`
- `DD-MM-YYYY.jpeg`
- `YYYY-MM-DD.png`
- `YYYY-MM-DD.jpg`
- `YYYY-MM-DD.jpeg`

The date in the filename is the true source of truth, not the folder name.

### Screenshot folder shape

Recommended:

```text
charts/
  SYMBOL/
    YEAR/
      monthname/
        DD-MM-YYYY.png
```

Examples:

```text
charts/NIFTY50/2026/april/24-04-2026.png
charts/BANKNIFTY/2026/May/4-05-2026.jpeg
```

Also tolerated:

```text
charts/
  SYMBOL/
    monthname/
      DD-MM-YYYY.png
```

### Dynamic screenshot discovery

Hosted/static environments use `chart-index.json`.

That file is built by:

```bash
node scripts/build-chart-index.js
```

Direct `file://` mode uses image probing as a fallback.

## Events, holidays, and P&L

### Supported files

```text
charts/SYMBOL/pastEventsAndNews.json
charts/SYMBOL/futureEventsAndNews.json
charts/SYMBOL/holiday.json

charts/SYMBOL/YEAR/pastEventsAndNews.json
charts/SYMBOL/YEAR/futureEventsAndNews.json
charts/SYMBOL/YEAR/holiday.json

charts/SYMBOL/YEAR/monthname/pnl.json
```

### Rules

- symbol directory decides ownership
- JSON `date` field decides target day
- month folder matters for `pnl.json` loading
- P&L summary is shown on the last Saturday of the selected month, not the trade date itself

### Accepted `date` format

- `DD-MM-YYYY`
- single-digit day/month values are tolerated by runtime parsing

### P&L runtime behavior

- green bar: profit day
- red bar: loss day
- clicking the day bar opens a popup
- month totals are computed client-side from the loaded month `pnl.json`
- monthly summary popup shows `Profit`, `Loss`, and `Net`

## FII / DII flow chart

Symbol:

- `FII_DII`

This is not a calendar view. It opens a dedicated analytics shell.

Current features:

- `From` / `To` month range filters
- `Paired` mode
- `Net` mode
- chart-style switch
- multiple moving averages
- moving-average manager when overlay count grows
- forecast extensions for moving averages

Data source:

- yearly JSON files under `charts/FII_DII/YYYY.json`

Runtime fields currently used from each row:

- `created_at`
- `fii_net_value`
- `dii_net_value`
- `last_trade_price`

Fallback for `file://` only:

- `fii-dii-data.js`

## FII / DII analytics dashboard

Symbol:

- `FII_DII_ANALYTICS`

This is also a non-calendar dashboard view.

Current features:

- `From` / `To` month filters
- optional calendar-month filter across years
- KPI cards
- weekday pattern chart
- weekly tendency chart
- full-width heatmap

Important note:

- all summary logic is computed in-browser
- there is no precomputed analytics JSON

## Market Sentiment dashboard

Symbol:

- `MARKET_SENTIMENT`

This is a non-calendar dashboard view.

### Current UI behavior

- top header/status block
- summary KPI cards
- compact symbol sentiment tiles
- links section
- no duplicate summary table
- optimized desktop layout to reduce page scrolling

### Current tracked instruments

- `GIFT NIFTY(NIFTY NSE)` using Yahoo symbol `^NSEI`
- `S&P 500`
- `Nasdaq Composite`
- `Nikkei 225`
- `Hang Seng`
- `Crude Oil (WTI)`

### Sentiment logic

- `pct > 0.5` -> `Strong Bullish`
- `0 < pct <= 0.5` -> `Mild Bullish`
- `-0.5 <= pct < 0` -> `Mild Bearish`
- `pct < -0.5` -> `Strong Bearish`
- effectively zero -> `Neutral`

### Data source strategy

The browser does **not** fetch Yahoo directly anymore as the primary path.

Primary runtime source:

- `data/market-sentiment.json`

That JSON is refreshed by GitHub Actions using:

- `scripts/build-market-sentiment-data.js`

### Embedded fallback behavior

`market-sentiment.js` includes an embedded manual seed snapshot.

This exists so the dashboard can still render useful values when:

- the deployed JSON is missing
- the JSON fetch fails
- the JSON fetch returns no usable rows
- the user is still on an older deployment

The Market Sentiment runtime fallback order is:

1. try `data/market-sentiment.json`
2. if fetch fails or data is unusable, use the embedded fallback snapshot

### Generated JSON shape

`data/market-sentiment.json` currently stores:

- `generatedAt`
- `source`
- `successCount`
- `staleCount`
- `errorMessage`
- `records`

Each record includes:

- `key`
- `label`
- `quoteUrl`
- `chartUrl`
- `current`
- `previousClose`
- `change`
- `pct`
- `sentiment`
- `trendGroup`
- `arrow`
- `isAvailable`
- `isStale`
- `fetchedAt`
- `errorMessage`

### Important Yahoo parsing note

The Market Sentiment build script must handle both:

- `meta.previousClose`
- `meta.chartPreviousClose`

Yahoo responses seen in this project used `chartPreviousClose`, so the script was updated to fall back to that field.

## Hosting and deployment

### GitHub Pages

This project is intended to be deployed with **GitHub Actions Pages deployment**, not branch-based Pages publishing.

Current workflow file:

- `.github/workflows/pages.yml`

Current default branch:

- `master`

### Pages deployment model

The workflow:

1. checks out `master`
2. runs `node scripts/build-market-sentiment-data.js`
3. uploads the whole repo as a Pages artifact
4. deploys that artifact using `actions/deploy-pages`

This avoids commit spam from scheduled Market Sentiment refreshes.

### Current scheduled Market Sentiment refresh window

Target requirement:

- weekdays only
- every 5 minutes
- from `09:00 AM IST` through `09:30 AM IST`

UTC conversion used in the workflow:

```yaml
on:
  schedule:
    - cron: "30,35,40,45,50,55 3 * * 1-5"
    - cron: "0 4 * * 1-5"
```

That means:

- `03:30 UTC`
- `03:35 UTC`
- `03:40 UTC`
- `03:45 UTC`
- `03:50 UTC`
- `03:55 UTC`
- `04:00 UTC`

which equals:

- `09:00 IST`
- `09:05 IST`
- `09:10 IST`
- `09:15 IST`
- `09:20 IST`
- `09:25 IST`
- `09:30 IST`

### Reliability note about Yahoo

The GitHub Actions Market Sentiment flow is more reliable than browser-side Yahoo `fetch()`, but it is **not guaranteed**.

Possible failure reasons:

- Yahoo rate-limits or blocks the runner
- network failures
- temporary bad payloads

Current mitigation:

- retry logic in `scripts/build-market-sentiment-data.js`
- spacing between requests
- last-good snapshot preservation if a record already had good data
- embedded manual seed fallback inside `market-sentiment.js`

## Local development

### Recommended local mode

Use the local server:

```bash
node scripts/serve-local.js
```

Then open:

- `http://127.0.0.1:4173`

This is the closest local behavior to hosted Pages.

### `file://` mode

Direct disk opening still works, but it is intentionally limited.

Important limitations:

- browser security limits live JSON loading
- `event-data.js` and `fii-dii-data.js` exist mainly for fallback in this mode
- Market Sentiment will use the embedded fallback if JSON fetches fail

## Updating content

### Screenshots

1. add screenshot files under the correct symbol/year/month folder
2. rebuild the chart index:

```bash
node scripts/build-chart-index.js
```

3. commit and push the screenshots plus updated `chart-index.json`

### Events / holidays / P&L

1. edit the JSON files under `charts/`
2. push changes
3. for `file://` fallback mode only, rebuild:

```bash
node scripts/build-event-data.js
```

### FII / DII yearly data

1. edit the relevant `charts/FII_DII/YYYY.json`
2. push changes
3. for `file://` fallback mode only, rebuild:

```bash
node scripts/build-fii-dii-data.js
```

### Market Sentiment manual refresh

To rebuild the Market Sentiment snapshot locally:

```bash
node scripts/build-market-sentiment-data.js
```

That writes:

- `data/market-sentiment.json`

Note:

- Yahoo may still block local refresh attempts depending on environment/IP

## Pre-commit workflow

Preferred command:

```bash
node scripts/prepare-commit.js
```

That script:

- runs all `scripts/build-*.js` generators
- runs core syntax checks

Useful explicit commands:

```bash
node scripts/build-chart-index.js
node scripts/build-event-data.js
node scripts/build-fii-dii-data.js
node scripts/build-market-sentiment-data.js
node --check script.js
node --check fii-dii-chart.js
node --check fii-dii-insights.js
node --check market-sentiment.js
```

## Adding a new symbol or view

### Add a new calendar symbol

Usually required:

1. add the symbol ID to `DEFAULT_SYMBOLS` in `script.js`
2. add screenshots and optional JSON under `charts/SYMBOL/...`
3. rebuild `chart-index.json`

### Add a new non-calendar dashboard symbol

Usually required:

1. add the symbol ID to `DEFAULT_SYMBOLS` in `script.js`
2. if it should hide the calendar, include it in the non-calendar symbol logic
3. add a new shell to `index.html`
4. add runtime logic in a dedicated JS file
5. add matching styles in `styles.css`
6. if it has generated data, add a build script and deploy/runtime source

## Troubleshooting

If something does not show, check these first:

- symbol dropdown actually changed to the intended symbol
- screenshot filename date is correct
- JSON `date` field is correct
- file is under the correct symbol directory
- month being viewed matches the data you expect
- `chart-index.json` was rebuilt after adding screenshots
- hard refresh after a GitHub Pages deployment
- local server is preferred over raw `file://`

### Market Sentiment-specific checks

- confirm `MARKET_SENTIMENT` is selected
- confirm the deployed page includes the latest `market-sentiment.js`
- confirm `data/market-sentiment.json` is being served by the deployment
- if the JSON is stale/missing, the embedded fallback should still show usable values
- if the UI still shows placeholder-only content, the deployed JS is probably older than the local workspace

### FII / DII-specific checks

- `FII_DII` and `FII_DII_ANALYTICS` both depend on yearly files under `charts/FII_DII/`
- `file://` mode may require rebuilding `fii-dii-data.js`

### Easy-to-miss mistakes

- adding screenshots without rebuilding `chart-index.json`
- expecting the folder year to override the filename date
- adding data under one symbol and expecting it to appear under another
- expecting the monthly P&L summary to appear on the trade date instead of the last Saturday
- expecting branch-based GitHub Pages behavior while the project is configured for GitHub Actions Pages deployment

## Developer notes for future AI sessions

- This is a SPA with symbol-driven view switching, not multiple HTML pages.
- The symbol dropdown is the main router.
- `script.js` is the central controller and owns visibility of calendar vs non-calendar views.
- `FII_DII`, `FII_DII_ANALYTICS`, and `MARKET_SENTIMENT` are non-calendar symbols.
- `market-sentiment.js` now contains an embedded fallback snapshot on purpose.
- `data/market-sentiment.json` is the primary Market Sentiment runtime source on hosted/static environments.
- `.github/workflows/pages.yml` deploys the full site from `master` using GitHub Actions artifacts.
- The Pages deployment is intentionally no-commit for scheduled data refreshes.
- Yahoo parsing must tolerate `chartPreviousClose`.
- New visual work should preserve the existing dark/gold panel language instead of redesigning the app.

## Quick resume notes

- Main runtime: `script.js`
- Main styles: `styles.css`
- App shell: `index.html`
- FII/DII flow view: `fii-dii-chart.js`
- FII/DII analytics view: `fii-dii-insights.js`
- Market Sentiment view: `market-sentiment.js`
- Image manifest: `chart-index.json`
- Event fallback: `event-data.js`
- FII/DII fallback: `fii-dii-data.js`
- Market Sentiment runtime JSON: `data/market-sentiment.json`
- Market Sentiment builder: `scripts/build-market-sentiment-data.js`
- Pages workflow: `.github/workflows/pages.yml`
- Pre-commit prep: `node scripts/prepare-commit.js`
- Local server: `node scripts/serve-local.js`
