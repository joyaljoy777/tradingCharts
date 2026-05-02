"use strict";

var MARKET_SENTIMENT_SYMBOL = "MARKET_SENTIMENT";
var MARKET_SENTIMENT_REFRESH_MS = 2 * 60 * 1000;
var MARKET_SENTIMENT_DATA_PATH = "data/market-sentiment.json";
var MARKET_SENTIMENT_ITEMS = [
  {
    key: "gift-nifty",
    label: "GIFT NIFTY(NIFTY NSE)",
    quoteUrl: "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?range=1d&interval=1d",
    chartUrl: "https://www.investing.com/indices/gift-nifty-50-c1-futures-chart"
  },
  {
    key: "sp500",
    label: "S&P 500",
    quoteUrl: "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=1d&interval=1d",
    chartUrl: "https://www.investing.com/indices/us-spx-500-chart"
  },
  {
    key: "nasdaq",
    label: "Nasdaq Composite",
    quoteUrl: "https://query1.finance.yahoo.com/v8/finance/chart/%5EIXIC?range=1d&interval=1d",
    chartUrl: "https://www.investing.com/indices/nasdaq-composite-chart"
  },
  {
    key: "nikkei",
    label: "Nikkei 225",
    quoteUrl: "https://query1.finance.yahoo.com/v8/finance/chart/%5EN225?range=1d&interval=1d",
    chartUrl: "https://www.investing.com/indices/japan-ni225-chart"
  },
  {
    key: "hang-seng",
    label: "Hang Seng",
    quoteUrl: "https://query1.finance.yahoo.com/v8/finance/chart/%5EHSI?range=1d&interval=1d",
    chartUrl: "https://www.investing.com/indices/hang-sen-40-chart"
  },
  {
    key: "crude-oil",
    label: "Crude Oil (WTI)",
    quoteUrl: "https://query1.finance.yahoo.com/v8/finance/chart/CL=F?range=1d&interval=1d",
    chartUrl: "https://www.investing.com/commodities/crude-oil-streaming-chart"
  }
];
var MARKET_SENTIMENT_LINKS = [
  {
    label: "PCR Ratio (Upstox)",
    url: "https://upstox.com/fno-discovery/open-interest-analysis/nifty-pcr/"
  },
  {
    label: "PCR Ratio (Sensibull)",
    url: "https://web.sensibull.com/live-options-charts?tradingsymbol=NIFTY&utm_source=chatgpt.com"
  }
];
var MARKET_SENTIMENT_EMBEDDED_FALLBACK = {
  generatedAt: "2026-05-02T13:27:00.000Z",
  source: "embedded-manual-seed",
  successCount: 6,
  staleCount: 0,
  errorMessage: "",
  records: [
    {
      key: "gift-nifty",
      current: 23997.55,
      previousClose: 24177.65,
      change: -180.1,
      pct: -0.744903,
      sentiment: "Strong Bearish",
      trendGroup: "bearish",
      arrow: "\u2193",
      isAvailable: true,
      isStale: false,
      errorMessage: ""
    },
    {
      key: "sp500",
      current: 7230.12,
      previousClose: 7209.01,
      change: 21.11,
      pct: 0.292828,
      sentiment: "Mild Bullish",
      trendGroup: "bullish",
      arrow: "\u2191",
      isAvailable: true,
      isStale: false,
      errorMessage: ""
    },
    {
      key: "nasdaq",
      current: 25114.443,
      previousClose: 24892.312,
      change: 222.131,
      pct: 0.892368,
      sentiment: "Strong Bullish",
      trendGroup: "bullish",
      arrow: "\u2191",
      isAvailable: true,
      isStale: false,
      errorMessage: ""
    },
    {
      key: "nikkei",
      current: 59513.12,
      previousClose: 59284.92,
      change: 228.2,
      pct: 0.384921,
      sentiment: "Mild Bullish",
      trendGroup: "bullish",
      arrow: "\u2191",
      isAvailable: true,
      isStale: false,
      errorMessage: ""
    },
    {
      key: "hang-seng",
      current: 25776.53,
      previousClose: 26111.84,
      change: -335.31,
      pct: -1.28413,
      sentiment: "Strong Bearish",
      trendGroup: "bearish",
      arrow: "\u2193",
      isAvailable: true,
      isStale: false,
      errorMessage: ""
    },
    {
      key: "crude-oil",
      current: 101.94,
      previousClose: 105.07,
      change: -3.13,
      pct: -2.978966,
      sentiment: "Strong Bearish",
      trendGroup: "bearish",
      arrow: "\u2193",
      isAvailable: true,
      isStale: false,
      errorMessage: ""
    }
  ]
};

(function marketSentimentFeature() {
  var shell = document.getElementById("marketSentimentShell");
  var statusEl = document.getElementById("marketSentimentStatus");
  var emptyState = document.getElementById("marketSentimentEmptyState");
  var summaryEl = document.getElementById("marketSentimentSummary");
  var tilesEl = document.getElementById("marketSentimentTiles");
  var linksEl = document.getElementById("marketSentimentLinks");
  var symbolSelect = document.getElementById("symbolSelect");
  var priceFormatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  var percentFormatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  var updatedAtFormatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
  var state = {
    activeSymbol: symbolSelect ? symbolSelect.value : "",
    loading: false,
    hasLoadedData: false,
    lastLoadedAt: 0,
    generatedAt: String(MARKET_SENTIMENT_EMBEDDED_FALLBACK.generatedAt || ""),
    staleCount: 0,
    successCount: Number(MARKET_SENTIMENT_EMBEDDED_FALLBACK.successCount || 0),
    source: String(MARKET_SENTIMENT_EMBEDDED_FALLBACK.source || "embedded-manual-seed"),
    records: buildDefaultRecords(),
    lastErrorMessage: ""
  };

  if (
    !shell ||
    !statusEl ||
    !emptyState ||
    !summaryEl ||
    !tilesEl ||
    !linksEl
  ) {
    return;
  }

  initialize();

  function initialize() {
    renderLinks();

    window.addEventListener("trading-chart-selection-change", function onSelectionChange(event) {
      var detail = event && event.detail ? event.detail : {};
      state.activeSymbol = detail.symbol || "";
      syncViewState();
    });

    document.addEventListener("visibilitychange", function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        syncViewState();
      }
    });

    syncViewState();
  }

  function buildDefaultRecords() {
    return normalizePayloadRecords(MARKET_SENTIMENT_EMBEDDED_FALLBACK.records);
  }

  function syncViewState() {
    if (state.activeSymbol !== MARKET_SENTIMENT_SYMBOL) {
      return;
    }

    if (shouldRefreshData() && !state.loading) {
      loadData();
      return;
    }

    render();
  }

  function shouldRefreshData() {
    if (!state.hasLoadedData || !state.lastLoadedAt) {
      return true;
    }

    return Date.now() - state.lastLoadedAt > MARKET_SENTIMENT_REFRESH_MS;
  }

  async function loadData() {
    state.loading = true;
    state.lastErrorMessage = "";
    render();

    try {
      var payload = await fetchMarketSentimentPayload();
      applyPayload(payload);
    } catch (error) {
      applyEmbeddedFallback(getErrorMessage(error));
    } finally {
      state.loading = false;
      render();
    }
  }

  async function fetchMarketSentimentPayload() {
    if (window.location.protocol === "file:") {
      throw new Error("Local file mode cannot fetch market sentiment JSON. Use the local server or GitHub Pages.");
    }

    var response = await fetch(MARKET_SENTIMENT_DATA_PATH + "?ts=" + Date.now(), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Market sentiment JSON request failed with status " + response.status + ".");
    }

    return response.json();
  }

  function applyPayload(payload) {
    var nextRecords = normalizePayloadRecords(payload && payload.records);
    var payloadGeneratedAt = payload && payload.generatedAt ? String(payload.generatedAt) : "";
    var hasAnyData = getAvailableRecords(nextRecords).length > 0;

    if (!hasAnyData) {
      applyEmbeddedFallback(
        String((payload && payload.errorMessage) || "Using embedded fallback snapshot because the fetched JSON has no usable market values.")
      );
      return;
    }

    state.records = nextRecords;
    state.generatedAt = payloadGeneratedAt;
    state.staleCount = Math.max(0, Number(payload && payload.staleCount) || 0);
    state.successCount = Math.max(0, Number(payload && payload.successCount) || 0);
    state.source = String((payload && payload.source) || "seed-placeholder");
    state.hasLoadedData = true;
    state.lastLoadedAt = Date.now();
    state.lastErrorMessage = String((payload && payload.errorMessage) || "");
  }

  function applyEmbeddedFallback(reason) {
    var fallback = MARKET_SENTIMENT_EMBEDDED_FALLBACK;

    state.records = normalizePayloadRecords(fallback.records);
    state.generatedAt = String(fallback.generatedAt || "");
    state.staleCount = Math.max(0, Number(fallback.staleCount) || 0);
    state.successCount = Math.max(0, Number(fallback.successCount) || 0);
    state.source = String(fallback.source || "embedded-manual-seed");
    state.hasLoadedData = true;
    state.lastLoadedAt = Date.now();
    state.lastErrorMessage = reason
      ? reason + " Showing the embedded seed snapshot."
      : "Showing the embedded seed snapshot.";
  }

  function normalizePayloadRecords(records) {
    var recordMap = {};

    (records || []).forEach(function eachRecord(record) {
      if (record && record.key) {
        recordMap[record.key] = normalizeRecord(record);
      }
    });

    return MARKET_SENTIMENT_ITEMS.map(function mapItem(item) {
      return recordMap[item.key] || createUnavailableRecord(item, "No market data found in the local JSON snapshot.");
    });
  }

  function normalizeRecord(record) {
    var item = getItemByKey(record.key);
    var pct = toFiniteNumber(record.pct);
    var current = toFiniteNumber(record.current);
    var previousClose = toFiniteNumber(record.previousClose);
    var change = toFiniteNumber(record.change);
    var isAvailable = Boolean(record && record.isAvailable && Number.isFinite(current) && Number.isFinite(previousClose));

    if (!item) {
      return null;
    }

    if (!isAvailable) {
      return createUnavailableRecord(item, String(record && record.errorMessage ? record.errorMessage : ""));
    }

    return {
      key: item.key,
      label: item.label,
      quoteUrl: item.quoteUrl,
      chartUrl: item.chartUrl,
      current: current,
      previousClose: previousClose,
      change: Number.isFinite(change) ? change : current - previousClose,
      pct: Number.isFinite(pct) ? pct : ((current - previousClose) / previousClose) * 100,
      sentiment: String(record.sentiment || getSentimentLabel(pct)),
      trendGroup: String(record.trendGroup || getTrendGroup(pct)),
      arrow: String(record.arrow || getTrendArrow(pct)),
      isAvailable: true,
      isStale: Boolean(record.isStale),
      errorMessage: String(record.errorMessage || "")
    };
  }

  function getItemByKey(key) {
    return MARKET_SENTIMENT_ITEMS.find(function findItem(item) {
      return item.key === key;
    }) || null;
  }

  function toFiniteNumber(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function getSentimentLabel(pct) {
    if (Math.abs(pct) < 0.0001) {
      return "Neutral";
    }

    if (pct > 0.5) {
      return "Strong Bullish";
    }

    if (pct > 0) {
      return "Mild Bullish";
    }

    if (pct < -0.5) {
      return "Strong Bearish";
    }

    if (pct < 0) {
      return "Mild Bearish";
    }

    return "Neutral";
  }

  function getTrendGroup(pct) {
    if (pct > 0) {
      return "bullish";
    }

    if (pct < 0) {
      return "bearish";
    }

    return "neutral";
  }

  function getTrendArrow(pct) {
    if (pct > 0) {
      return "\u2191";
    }

    if (pct < 0) {
      return "\u2193";
    }

    return "\u2192";
  }

  function createUnavailableRecord(item, errorMessage) {
    return {
      key: item.key,
      label: item.label,
      quoteUrl: item.quoteUrl,
      chartUrl: item.chartUrl,
      current: null,
      previousClose: null,
      change: null,
      pct: null,
      sentiment: "Data unavailable",
      trendGroup: "unavailable",
      arrow: "\u2192",
      isAvailable: false,
      isStale: false,
      errorMessage: errorMessage || ""
    };
  }

  function getErrorMessage(error) {
    if (error && error.message) {
      return error.message;
    }

    return "Unable to load market sentiment data.";
  }

  function getAvailableRecords(records) {
    return (records || []).filter(function keepRecord(record) {
      return record && record.isAvailable;
    });
  }

  function buildSummary(records) {
    var availableRecords = getAvailableRecords(records);
    var bullishCount = 0;
    var bearishCount = 0;
    var neutralCount = 0;

    availableRecords.forEach(function countRecord(record) {
      if (record.trendGroup === "bullish") {
        bullishCount += 1;
        return;
      }

      if (record.trendGroup === "bearish") {
        bearishCount += 1;
        return;
      }

      neutralCount += 1;
    });

    return {
      bullishCount: bullishCount,
      bearishCount: bearishCount,
      neutralCount: neutralCount,
      availableCount: availableRecords.length,
      unavailableCount: Math.max((records || []).length - availableRecords.length, 0),
      overallSentiment: getOverallSentimentLabel(bullishCount, bearishCount)
    };
  }

  function getOverallSentimentLabel(bullishCount, bearishCount) {
    if (bullishCount > bearishCount) {
      return "Bullish";
    }

    if (bearishCount > bullishCount) {
      return "Bearish";
    }

    return "Neutral";
  }

  function render() {
    var summary = buildSummary(state.records);
    var hasAnyData = summary.availableCount > 0;

    renderSummary(summary);
    renderTiles(state.records);
    renderStatus(summary, hasAnyData);

    emptyState.hidden = hasAnyData || state.loading;
  }

  function renderStatus(summary, hasAnyData) {
    if (state.loading) {
      statusEl.textContent = "Loading the latest deployed market sentiment snapshot…";
      return;
    }

    if (!hasAnyData) {
      statusEl.textContent =
        state.lastErrorMessage ||
        "Seed placeholder data is loaded. The first GitHub Actions refresh will replace it with live values.";
      return;
    }

    if (state.generatedAt) {
      statusEl.textContent =
        "Updated " +
        formatGeneratedAt(state.generatedAt) +
        " · " +
        state.successCount +
        " live symbol" +
        (state.successCount === 1 ? "" : "s") +
        " loaded" +
        (state.source === "embedded-manual-seed" ? " · embedded fallback snapshot" : "") +
        (state.staleCount ? " · " + state.staleCount + " using last good snapshot" : "") +
        ".";
      return;
    }

    statusEl.textContent = "Market sentiment snapshot loaded.";
  }

  function formatGeneratedAt(value) {
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : updatedAtFormatter.format(date);
  }

  function renderSummary(summary) {
    summaryEl.replaceChildren(
      createSummaryCard(
        "Bullish symbols",
        String(summary.bullishCount),
        summary.availableCount
          ? "Strong + mild bullish"
          : "Awaiting first successful refresh"
      ),
      createSummaryCard(
        "Bearish symbols",
        String(summary.bearishCount),
        summary.availableCount
          ? "Strong + mild bearish"
          : "Awaiting first successful refresh"
      ),
      createSummaryCard(
        "Neutral symbols",
        String(summary.neutralCount),
        summary.availableCount
          ? "Near-flat sessions"
          : "Awaiting first successful refresh"
      ),
      createSummaryCard(
        "Overall sentiment",
        summary.overallSentiment,
        summary.unavailableCount
          ? summary.unavailableCount + " symbol" + (summary.unavailableCount === 1 ? "" : "s") + " unavailable"
          : "All symbols loaded"
      )
    );
  }

  function createSummaryCard(label, value, note) {
    var card = document.createElement("article");
    card.className = "insight-kpi market-sentiment-kpi";

    var labelEl = document.createElement("p");
    labelEl.className = "insight-kpi-label";
    labelEl.textContent = label;

    var valueEl = document.createElement("p");
    valueEl.className = "insight-kpi-value";
    valueEl.textContent = value;

    var noteEl = document.createElement("p");
    noteEl.className = "insight-kpi-note";
    noteEl.textContent = note;

    card.appendChild(labelEl);
    card.appendChild(valueEl);
    card.appendChild(noteEl);
    return card;
  }

  function renderTiles(records) {
    var fragment = document.createDocumentFragment();

    (records || []).forEach(function appendRecord(record) {
      fragment.appendChild(createTile(record));
    });

    tilesEl.replaceChildren(fragment);
  }

  function createTile(record) {
    var tile = document.createElement("a");
    var heading = document.createElement("div");
    var label = document.createElement("p");
    var price = document.createElement("p");
    var changeRow = document.createElement("div");
    var arrow = document.createElement("span");
    var changePct = document.createElement("span");
    var sentiment = document.createElement("p");

    tile.className =
      "market-sentiment-tile market-sentiment-tile--" + record.trendGroup;
    tile.href = record.chartUrl;
    tile.target = "_blank";
    tile.rel = "noreferrer noopener";
    tile.setAttribute("aria-label", "Open chart for " + record.label + " in a new tab");

    heading.className = "market-sentiment-tile-head";

    label.className = "market-sentiment-tile-label";
    label.textContent = record.label;
    heading.appendChild(label);

    price.className = "market-sentiment-price";
    price.textContent = record.isAvailable ? formatPrice(record.current) : "Data unavailable";

    changeRow.className = "market-sentiment-change-row";

    arrow.className = "market-sentiment-arrow";
    arrow.textContent = record.arrow;

    changePct.className = "market-sentiment-change";
    changePct.textContent = record.isAvailable ? formatPct(record.pct) : "Data unavailable";

    sentiment.className = "market-sentiment-label";
    sentiment.textContent = record.isAvailable && record.isStale
      ? record.sentiment + " (Cached)"
      : record.sentiment;

    changeRow.appendChild(arrow);
    changeRow.appendChild(changePct);

    tile.appendChild(heading);
    tile.appendChild(price);
    tile.appendChild(changeRow);
    tile.appendChild(sentiment);

    if (record.errorMessage) {
      tile.title = record.errorMessage;
    }

    return tile;
  }

  function formatPrice(value) {
    return priceFormatter.format(value);
  }

  function formatPct(value) {
    var numeric = Number(value || 0);
    var sign = numeric > 0 ? "+" : "";
    return sign + percentFormatter.format(numeric) + "%";
  }

  function renderLinks() {
    var fragment = document.createDocumentFragment();

    MARKET_SENTIMENT_LINKS.forEach(function appendLink(item) {
      var link = document.createElement("a");
      var label = document.createElement("span");
      var arrow = document.createElement("span");

      link.className = "market-sentiment-link-card";
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noreferrer noopener";
      link.setAttribute("aria-label", "Open " + item.label + " in a new tab");

      label.textContent = item.label;
      arrow.className = "market-sentiment-link-arrow";
      arrow.textContent = "\u2197";

      link.appendChild(label);
      link.appendChild(arrow);
      fragment.appendChild(link);
    });

    linksEl.replaceChildren(fragment);
  }
})();
