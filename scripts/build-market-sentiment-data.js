const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT, "data", "market-sentiment.json");
const FETCH_RETRY_LIMIT = 3;
const FETCH_RETRY_BASE_MS = 1200;
const REQUEST_SPACING_MS = 900;
const MARKET_SENTIMENT_ITEMS = [
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

async function main() {
  const existingPayload = readExistingPayload();
  const existingByKey = indexExistingRecords(existingPayload.records || []);
  const generatedAt = new Date().toISOString();
  const records = [];
  let successCount = 0;
  let staleCount = 0;

  for (const item of MARKET_SENTIMENT_ITEMS) {
    try {
      const payload = await fetchWithRetry(item.quoteUrl);
      const record = buildLiveRecord(item, payload, generatedAt);
      records.push(record);
      successCount += 1;
    } catch (error) {
      const fallbackRecord = buildFallbackRecord(item, existingByKey[item.key], error);
      if (fallbackRecord.isStale) {
        staleCount += 1;
      }
      records.push(fallbackRecord);
    }

    await sleep(REQUEST_SPACING_MS);
  }

  const output = {
    generatedAt,
    source: successCount ? "yahoo-finance-chart" : "seed-placeholder",
    successCount,
    staleCount,
    errorMessage: successCount
      ? ""
      : "Yahoo Finance refresh failed for all symbols. Preserving the last good snapshot or placeholder values.",
    records
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");

  process.stdout.write(
    "Wrote market sentiment snapshot with " +
      successCount +
      " live record(s) and " +
      staleCount +
      " cached fallback record(s).\n"
  );
}

function readExistingPayload() {
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
  } catch (error) {
    return { records: [] };
  }
}

function indexExistingRecords(records) {
  return (records || []).reduce((accumulator, record) => {
    if (record && record.key) {
      accumulator[record.key] = record;
    }
    return accumulator;
  }, {});
}

async function fetchWithRetry(url) {
  let lastError = null;

  for (let attempt = 1; attempt <= FETCH_RETRY_LIMIT; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/json,text/plain,*/*",
          "user-agent": "Mozilla/5.0 (compatible; GitHubActions MarketSentimentBot/1.0)"
        }
      });

      if (!response.ok) {
        throw new Error("Request failed with status " + response.status + ".");
      }

      return await response.json();
    } catch (error) {
      lastError = error;

      if (attempt < FETCH_RETRY_LIMIT) {
        await sleep(FETCH_RETRY_BASE_MS * attempt);
      }
    }
  }

  throw lastError || new Error("Unknown Yahoo Finance fetch failure.");
}

function buildLiveRecord(item, payload, generatedAt) {
  const meta = getMarketMeta(payload);
  const current = toFiniteNumber(meta && meta.regularMarketPrice);
  const previousClose = toFiniteNumber(
    meta && (meta.previousClose != null ? meta.previousClose : meta.chartPreviousClose)
  );

  if (!Number.isFinite(current) || !Number.isFinite(previousClose) || !previousClose) {
    throw new Error("Yahoo Finance returned incomplete market metadata.");
  }

  const change = current - previousClose;
  const pct = (change / previousClose) * 100;

  return {
    key: item.key,
    label: item.label,
    quoteUrl: item.quoteUrl,
    chartUrl: item.chartUrl,
    current,
    previousClose,
    change,
    pct,
    sentiment: getSentimentLabel(pct),
    trendGroup: getTrendGroup(pct),
    arrow: getTrendArrow(pct),
    isAvailable: true,
    isStale: false,
    fetchedAt: generatedAt,
    errorMessage: ""
  };
}

function buildFallbackRecord(item, existingRecord, error) {
  const message = getErrorMessage(error);

  if (
    existingRecord &&
    existingRecord.isAvailable &&
    Number.isFinite(Number(existingRecord.current)) &&
    Number.isFinite(Number(existingRecord.previousClose))
  ) {
    return {
      key: item.key,
      label: item.label,
      quoteUrl: item.quoteUrl,
      chartUrl: item.chartUrl,
      current: Number(existingRecord.current),
      previousClose: Number(existingRecord.previousClose),
      change: Number(existingRecord.change),
      pct: Number(existingRecord.pct),
      sentiment: existingRecord.sentiment || getSentimentLabel(Number(existingRecord.pct)),
      trendGroup: existingRecord.trendGroup || getTrendGroup(Number(existingRecord.pct)),
      arrow: existingRecord.arrow || getTrendArrow(Number(existingRecord.pct)),
      isAvailable: true,
      isStale: true,
      fetchedAt: existingRecord.fetchedAt || "",
      errorMessage: message
    };
  }

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
    arrow: "→",
    isAvailable: false,
    isStale: false,
    fetchedAt: "",
    errorMessage: message
  };
}

function getMarketMeta(payload) {
  return (
    payload &&
    payload.chart &&
    payload.chart.result &&
    payload.chart.result[0] &&
    payload.chart.result[0].meta
  ) || null;
}

function toFiniteNumber(value) {
  const parsed = Number(value);
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
    return "↑";
  }

  if (pct < 0) {
    return "↓";
  }

  return "→";
}

function getErrorMessage(error) {
  if (error && error.message) {
    return error.message;
  }

  return "Unable to refresh Yahoo Finance data.";
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main().catch((error) => {
  process.stderr.write(getErrorMessage(error) + "\n");
  process.exitCode = 1;
});
