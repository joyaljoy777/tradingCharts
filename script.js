"use strict";

var IMAGE_PATTERN = /\.(png|jpe?g)$/i;
var DEFAULT_SYMBOLS = [
  "NIFTY50",
  "BANKNIFTY",
  "P_AND_L_AND_LEARNINGS",
  "FII_DII",
  "FII_DII_ANALYTICS",
  "MARKET_SENTIMENT"
];
var ANALYTICS_SYMBOLS = ["FII_DII", "FII_DII_ANALYTICS"];
var NON_CALENDAR_SYMBOLS = ANALYTICS_SYMBOLS.concat(["MARKET_SENTIMENT"]);
var MIN_LIGHTBOX_ZOOM = 1;
var MAX_LIGHTBOX_ZOOM = 4;
var LIGHTBOX_ZOOM_STEP = 0.25;
var LOCAL_MULTI_IMAGE_SUFFIX_LIMIT = 9;
var SCHEMA_RESOURCE_PATH = "schemas/eventsAndNewsSchema.json";
var TEMPORAL_DATA_FILENAMES = {
  past: "pastEventsAndNews.json",
  future: "futureEventsAndNews.json",
  holiday: "holiday.json",
  pnl: "pnl.json"
};
var EVENT_KIND_LABELS = {
  past: "Past Events",
  future: "Future Events"
};
var PNL_KIND_LABEL = "Total P&L";
var PNL_VALUE_DISPLAY_STORAGE_KEY = "tradingCharts.pnlValueDisplayMode";
var PNL_VALUE_DISPLAY_MODES = {
  compact: "compact",
  full: "full"
};
var PNL_SUMMARY_STATEMENT_MODES = {
  monthly: "monthly",
  calendarYear: "calendar-year",
  financialYear: "financial-year"
};
var PNL_SUMMARY_STATEMENT_OPTIONS = [
  {
    key: PNL_SUMMARY_STATEMENT_MODES.monthly,
    label: "Monthly statement"
  },
  {
    key: PNL_SUMMARY_STATEMENT_MODES.calendarYear,
    label: "Yearly statement"
  },
  {
    key: PNL_SUMMARY_STATEMENT_MODES.financialYear,
    label: "Financial year"
  }
];
var PNL_WIN_RATE_MODES = {
  days: "days",
  amount: "amount"
};
var PNL_WIN_RATE_OPTIONS = [
  {
    key: PNL_WIN_RATE_MODES.days,
    label: "Days"
  },
  {
    key: PNL_WIN_RATE_MODES.amount,
    label: "Amount"
  }
];
var LEVEL_META = {
  low: {
    percent: 33,
    title: "low"
  },
  medium: {
    percent: 66,
    title: "medium"
  },
  high: {
    percent: 100,
    title: "high"
  }
};
var STATUS_META = {
  actual: {
    title: "actual",
    className: "is-actual"
  },
  scheduled: {
    title: "scheduled",
    className: "is-scheduled"
  },
  expected: {
    title: "expected",
    className: "is-expected"
  }
};
var SENTIMENT_META = {
  bullish: {
    title: "bullish",
    emoji: "🟢⬆️"
  },
  bearish: {
    title: "bearish",
    emoji: "🔴⬇️"
  },
  neutral: {
    title: "neutral",
    emoji: "🟡➖"
  },
  unknown: {
    title: "unknown",
    emoji: "❓"
  }
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function validateDateParts(year, month, day) {
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  var date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    year: year,
    month: month,
    day: day,
    isoDate: year + "-" + pad(month) + "-" + pad(day),
    monthKey: year + "-" + pad(month)
  };
}

function parseDateFromFilename(filename) {
  var basename = filename.replace(/\.[^.]+$/, "");
  var isoMatch = basename.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[_-].+)?$/);
  if (isoMatch) {
    return validateDateParts(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3])
    );
  }

  var dayFirstMatch = basename.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:[_-].+)?$/);
  if (dayFirstMatch) {
    return validateDateParts(
      Number(dayFirstMatch[3]),
      Number(dayFirstMatch[2]),
      Number(dayFirstMatch[1])
    );
  }

  return null;
}

function parseDateFromEventValue(value) {
  var match = String(value || "").match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) {
    return null;
  }

  return validateDateParts(
    Number(match[3]),
    Number(match[2]),
    Number(match[1])
  );
}

function normalizeLevel(value) {
  var key = String(value || "").toLowerCase();
  return LEVEL_META[key] ? key : "low";
}

function normalizeStatus(value) {
  var key = String(value || "").toLowerCase();
  return STATUS_META[key] ? key : "expected";
}

function normalizeSentiment(value) {
  var key = String(value || "").toLowerCase();
  return SENTIMENT_META[key] ? key : "unknown";
}

function normalizeAsset(entry) {
  var parts = String(entry.path || "").split("/").filter(Boolean);
  if (parts.length < 4 || parts[0] !== "charts" || !parts[1]) {
    return null;
  }

  var symbol = parts[1];
  var filename = parts[parts.length - 1];
  if (!IMAGE_PATTERN.test(filename)) {
    return null;
  }

  var dateInfo = parseDateFromFilename(filename);
  if (!dateInfo) {
    return null;
  }

  var extMatch = filename.match(/\.([^.]+)$/);
  var ext = extMatch ? extMatch[1].toLowerCase() : "";

  return {
    symbol: symbol,
    isoDate: dateInfo.isoDate,
    monthKey: dateInfo.monthKey,
    day: dateInfo.day,
    ext: ext,
    src: entry.url || entry.path,
    rawPath: entry.path
  };
}

function compareAssetPaths(left, right) {
  return String(left.rawPath || left.src || "").localeCompare(
    String(right.rawPath || right.src || ""),
    undefined,
    {
      numeric: true,
      sensitivity: "base"
    }
  );
}

function normalizeImageItem(image) {
  if (!image || !image.src) {
    return null;
  }

  return {
    src: image.src,
    ext: image.ext || "",
    rawPath: image.rawPath || image.src
  };
}

function buildDayEntryFromAssets(assets, fallbackIsoDate, fallbackDay) {
  var normalizedAssets = (assets || [])
    .map(function mapAsset(asset) {
      return normalizeImageItem(asset);
    })
    .filter(Boolean)
    .sort(compareAssetPaths);

  if (!normalizedAssets.length) {
    return null;
  }

  var sample = assets && assets[0] ? assets[0] : {};
  var isoDate = sample.isoDate || fallbackIsoDate || "";
  var day = sample.day || fallbackDay || 0;
  var primary = normalizedAssets[0];

  return {
    src: primary.src,
    isoDate: isoDate,
    day: day,
    ext: primary.ext,
    stackSrc: normalizedAssets[1] ? normalizedAssets[1].src : "",
    imageCount: normalizedAssets.length,
    images: normalizedAssets
  };
}

function normalizeDayEntry(entry, fallbackIsoDate, fallbackDay) {
  if (!entry) {
    return null;
  }

  if (Array.isArray(entry.images) && entry.images.length) {
    return buildDayEntryFromAssets(entry.images, entry.isoDate || fallbackIsoDate, entry.day || fallbackDay);
  }

  if (!entry.src) {
    return null;
  }

  return buildDayEntryFromAssets(
    [
      {
        src: entry.src,
        ext: entry.ext || "",
        rawPath: entry.rawPath || entry.src,
        isoDate: entry.isoDate || fallbackIsoDate || "",
        day: entry.day || fallbackDay || 0
      }
    ],
    entry.isoDate || fallbackIsoDate,
    entry.day || fallbackDay
  );
}

function normalizeMonthEntries(entries) {
  var normalized = {};

  Object.keys(entries || {}).forEach(function eachEntry(dayKey) {
    var entry = entries[dayKey];
    var dayNumber = entry && entry.day ? entry.day : Number(dayKey);
    var isoDate = entry && entry.isoDate ? entry.isoDate : "";
    var normalizedEntry = normalizeDayEntry(entry, isoDate, dayNumber);

    if (normalizedEntry) {
      normalized[dayKey] = normalizedEntry;
    }
  });

  return normalized;
}

function buildEventSignature(eventItem) {
  return [
    eventItem.kind,
    eventItem.sourceSymbol,
    eventItem.isoDate,
    eventItem.eventType,
    eventItem.content,
    eventItem.impact,
    eventItem.eventStatus,
    eventItem.certainty,
    eventItem.affectedIndices.join("|"),
    eventItem.sentiment,
    eventItem.notes,
    eventItem.source
  ].join("::");
}

function sortEventItems(left, right) {
  return (
    left.isoDate.localeCompare(right.isoDate) ||
    left.eventType.localeCompare(right.eventType) ||
    left.content.localeCompare(right.content)
  );
}

function normalizeEventEntry(entry, kind, symbol) {
  var dateInfo = parseDateFromEventValue(entry.date);
  var affectedIndices = Array.isArray(entry.affected_indices)
    ? entry.affected_indices.filter(function keepIndex(value) {
        return typeof value === "string" && value;
      })
    : [];
  var content = String(entry.content || "").trim();
  var eventType = String(entry.event_type || entry.type || "Other").trim() || "Other";

  if (!dateInfo || !content || !symbol) {
    return null;
  }

  if (!affectedIndices.length) {
    affectedIndices = [symbol];
  }

  var normalized = {
    kind: kind,
    sourceSymbol: symbol,
    isoDate: dateInfo.isoDate,
    monthKey: dateInfo.monthKey,
    dayKey: pad(dateInfo.day),
    dateLabel: String(entry.date || ""),
    eventType: eventType,
    content: content,
    impact: normalizeLevel(entry.impact),
    eventStatus: normalizeStatus(entry.event_status),
    certainty: normalizeLevel(entry.certainty),
    affectedIndices: affectedIndices,
    sentiment: normalizeSentiment(entry.sentiment),
    notes: entry.notes ? String(entry.notes).trim() : "",
    source: entry.source ? String(entry.source).trim() : ""
  };

  normalized.signature = buildEventSignature(normalized);
  return normalized;
}

function normalizeHolidayEntry(entry, symbol) {
  var dateInfo = parseDateFromEventValue(entry.date);
  var name = String(entry.name || "").trim();
  if (!dateInfo || !name) {
    return null;
  }

  return {
    symbol: symbol,
    isoDate: dateInfo.isoDate,
    monthKey: dateInfo.monthKey,
    dayKey: pad(dateInfo.day),
    dateLabel: String(entry.date || ""),
    name: name
  };
}

function normalizeAmount(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  var normalized = String(value || "")
    .replace(/[^0-9.+-]/g, "")
    .trim();
  if (!normalized) {
    return 0;
  }

  var parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeOptionalAmount(entry, fieldName) {
  if (!entry || !Object.prototype.hasOwnProperty.call(entry, fieldName)) {
    return null;
  }

  if (typeof entry[fieldName] === "number") {
    return Number.isFinite(entry[fieldName]) ? entry[fieldName] : null;
  }

  var normalized = String(entry[fieldName] || "")
    .replace(/[^0-9.+-]/g, "")
    .trim();
  if (!normalized) {
    return null;
  }

  var parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePnlEntry(entry, symbol) {
  var dateInfo = parseDateFromEventValue(entry.date);
  if (!dateInfo) {
    return null;
  }

  var profit = Math.max(0, normalizeAmount(entry.profit));
  var loss = Math.max(0, normalizeAmount(entry.loss));
  var net = profit > 0 ? profit : loss > 0 ? -loss : 0;
  var brokerageAndNetCharges = normalizeOptionalAmount(entry, "brokerage_and_net_charges");
  var totalTradedValue = normalizeOptionalAmount(entry, "total_traded_value");
  var totalTradesTook = normalizeOptionalAmount(entry, "total_trades_took");
  var maximumCapitalDeployed = normalizeOptionalAmount(entry, "maximum_capital_deployed");

  return {
    symbol: symbol,
    isoDate: dateInfo.isoDate,
    monthKey: dateInfo.monthKey,
    dayKey: pad(dateInfo.day),
    dateLabel: String(entry.date || ""),
    profit: profit,
    loss: loss,
    net: net,
    brokerageAndNetCharges: brokerageAndNetCharges,
    totalTradedValue: totalTradedValue,
    totalTradesTook: totalTradesTook,
    maximumCapitalDeployed: maximumCapitalDeployed
  };
}

function buildTemporalResourcePath(symbol, year, kind) {
  var filename = TEMPORAL_DATA_FILENAMES[kind];
  if (!symbol || !filename) {
    return null;
  }

  if (year) {
    return "charts/" + symbol + "/" + year + "/" + filename;
  }

  return "charts/" + symbol + "/" + filename;
}

function buildChartIndex(entries, defaultSymbols) {
  var symbolSet = new Set(defaultSymbols || []);
  var imageBuckets = {};

  (entries || []).forEach(function collect(entry) {
    var parts = String(entry.path || "").split("/").filter(Boolean);
    if (parts[0] === "charts" && parts[1]) {
      symbolSet.add(parts[1]);
    }

    var asset = normalizeAsset(entry);
    if (!asset) {
      return;
    }

    imageBuckets[asset.symbol] = imageBuckets[asset.symbol] || {};
    imageBuckets[asset.symbol][asset.monthKey] =
      imageBuckets[asset.symbol][asset.monthKey] || {};
    imageBuckets[asset.symbol][asset.monthKey][asset.isoDate] =
      imageBuckets[asset.symbol][asset.monthKey][asset.isoDate] || [];
    imageBuckets[asset.symbol][asset.monthKey][asset.isoDate].push(asset);
  });

  var symbols = Array.from(symbolSet).sort(function sortSymbols(left, right) {
    return left.localeCompare(right);
  });

  var monthsBySymbol = {};
  var images = {};

  symbols.forEach(function finalizeSymbol(symbol) {
    var monthMap = imageBuckets[symbol] || {};
    var monthKeys = Object.keys(monthMap).sort();

    monthsBySymbol[symbol] = monthKeys;
    images[symbol] = {};

    monthKeys.forEach(function finalizeMonth(monthKey) {
      var dayMap = {};

      Object.keys(monthMap[monthKey])
        .sort()
        .forEach(function finalizeDay(isoDate) {
          var assets = monthMap[monthKey][isoDate];
          var entry = buildDayEntryFromAssets(assets, isoDate);
          if (!entry) {
            return;
          }

          dayMap[pad(entry.day)] = entry;
        });

      images[symbol][monthKey] = dayMap;
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    symbols: symbols,
    monthsBySymbol: monthsBySymbol,
    images: images
  };
}

function buildEventIndex(entries, kind, symbol) {
  var index = {};

  (entries || []).forEach(function collect(entry) {
    var normalized = normalizeEventEntry(entry, kind, symbol);
    if (!normalized) {
      return;
    }

    index[symbol] = index[symbol] || {};
    index[symbol][normalized.monthKey] = index[symbol][normalized.monthKey] || {};
    index[symbol][normalized.monthKey][normalized.dayKey] =
      index[symbol][normalized.monthKey][normalized.dayKey] || [];
    index[symbol][normalized.monthKey][normalized.dayKey].push(normalized);
  });

  Object.keys(index).forEach(function sortSymbol(symbol) {
    Object.keys(index[symbol]).forEach(function sortMonth(monthKey) {
      Object.keys(index[symbol][monthKey]).forEach(function sortDay(dayKey) {
        index[symbol][monthKey][dayKey].sort(sortEventItems);
      });
    });
  });

  return index;
}

function buildHolidayIndex(entries, symbol) {
  var index = {};

  (entries || []).forEach(function collect(entry) {
    var normalized = normalizeHolidayEntry(entry, symbol);
    if (!normalized) {
      return;
    }

    index[symbol] = index[symbol] || {};
    index[symbol][normalized.monthKey] = index[symbol][normalized.monthKey] || {};
    index[symbol][normalized.monthKey][normalized.dayKey] = normalized;
  });

  return index;
}

function buildPnlIndex(entries, symbol) {
  var index = {};

  (entries || []).forEach(function collect(entry) {
    var normalized = normalizePnlEntry(entry, symbol);
    if (
      !normalized ||
      (!normalized.net &&
        normalized.brokerageAndNetCharges === null &&
        normalized.totalTradedValue === null &&
        normalized.totalTradesTook === null &&
        normalized.maximumCapitalDeployed === null)
    ) {
      return;
    }

    index[symbol] = index[symbol] || {};
    index[symbol][normalized.monthKey] = index[symbol][normalized.monthKey] || {};
    index[symbol][normalized.monthKey][normalized.dayKey] = normalized;
  });

  return index;
}

function mergeEventIndexInto(target, source) {
  Object.keys(source || {}).forEach(function eachSymbol(symbol) {
    target[symbol] = target[symbol] || {};

    Object.keys(source[symbol]).forEach(function eachMonth(monthKey) {
      target[symbol][monthKey] = target[symbol][monthKey] || {};

      Object.keys(source[symbol][monthKey]).forEach(function eachDay(dayKey) {
        var existing = target[symbol][monthKey][dayKey] || [];
        var merged = existing.concat(source[symbol][monthKey][dayKey]);
        var seen = new Set();

        target[symbol][monthKey][dayKey] = merged.filter(function keepUnique(eventItem) {
          var signature = eventItem.signature || buildEventSignature(eventItem);
          if (seen.has(signature)) {
            return false;
          }

          seen.add(signature);
          return true;
        });
        target[symbol][monthKey][dayKey].sort(sortEventItems);
      });
    });
  });
}

function mergeHolidayIndexInto(target, source) {
  Object.keys(source || {}).forEach(function eachSymbol(symbol) {
    target[symbol] = target[symbol] || {};

    Object.keys(source[symbol]).forEach(function eachMonth(monthKey) {
      target[symbol][monthKey] = target[symbol][monthKey] || {};

      Object.keys(source[symbol][monthKey]).forEach(function eachDay(dayKey) {
        target[symbol][monthKey][dayKey] = source[symbol][monthKey][dayKey];
      });
    });
  });
}

function mergePnlIndexInto(target, source) {
  Object.keys(source || {}).forEach(function eachSymbol(symbol) {
    target[symbol] = target[symbol] || {};

    Object.keys(source[symbol]).forEach(function eachMonth(monthKey) {
      target[symbol][monthKey] = target[symbol][monthKey] || {};

      Object.keys(source[symbol][monthKey]).forEach(function eachDay(dayKey) {
        target[symbol][monthKey][dayKey] = source[symbol][monthKey][dayKey];
      });
    });
  });
}

function filterIndexByYear(source, symbol, year) {
  var filtered = {};
  if (!source || !source[symbol] || !year) {
    return filtered;
  }

  Object.keys(source[symbol]).forEach(function eachMonth(monthKey) {
    if (monthKey.slice(0, 4) !== year) {
      return;
    }

    filtered[symbol] = filtered[symbol] || {};
    filtered[symbol][monthKey] = source[symbol][monthKey];
  });

  return filtered;
}

function clearIndexYear(target, symbol, year) {
  if (!target || !target[symbol] || !year) {
    return;
  }

  Object.keys(target[symbol]).forEach(function eachMonth(monthKey) {
    if (monthKey.slice(0, 4) === year) {
      delete target[symbol][monthKey];
    }
  });
}

function clearIndexMonth(target, symbol, yearMonth) {
  if (!target || !target[symbol] || !yearMonth) {
    return;
  }

  delete target[symbol][yearMonth];
}

(function tradingChartCalendar() {
  var chartIndex = buildChartIndex([], DEFAULT_SYMBOLS);

  function readPnlValueDisplayMode() {
    try {
      return window.localStorage.getItem(PNL_VALUE_DISPLAY_STORAGE_KEY) === PNL_VALUE_DISPLAY_MODES.full
        ? PNL_VALUE_DISPLAY_MODES.full
        : PNL_VALUE_DISPLAY_MODES.compact;
    } catch (error) {
      return PNL_VALUE_DISPLAY_MODES.compact;
    }
  }

  function writePnlValueDisplayMode(mode) {
    try {
      window.localStorage.setItem(PNL_VALUE_DISPLAY_STORAGE_KEY, mode);
    } catch (error) {
      // Storage can be unavailable in private or file contexts; the in-memory state still works.
    }
  }

  var monthFormatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
  var pnlFormatter = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  var countFormatter = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2
  });

  var symbolSelect = document.getElementById("symbolSelect");
  var monthPicker = document.getElementById("monthPicker");
  var prevMonthBtn = document.getElementById("prevMonthBtn");
  var todayMonthBtn = document.getElementById("todayMonthBtn");
  var nextMonthBtn = document.getElementById("nextMonthBtn");
  var calendarShell = document.querySelector(".calendar-shell");
  var analyticsShell = document.getElementById("analyticsShell");
  var analyticsInsightsShell = document.getElementById("fiiDiiInsightsShell");
  var marketSentimentShell = document.getElementById("marketSentimentShell");
  var calendarGrid = document.getElementById("calendarGrid");
  var monthStatus = document.getElementById("monthStatus");
  var emptyState = document.getElementById("emptyState");
  var lightbox = document.getElementById("lightbox");
  var lightboxTitle = document.getElementById("lightboxTitle");
  var lightboxBody = document.getElementById("lightboxBody");
  var lightboxMeta = document.getElementById("lightboxMeta");

  var state = {
    symbol: "NIFTY50",
    yearMonth: null,
    pnlValueDisplayMode: readPnlValueDisplayMode(),
    pnlSummaryStatementMode: PNL_SUMMARY_STATEMENT_MODES.monthly,
    pnlWinRateMode: PNL_WIN_RATE_MODES.days,
    pnlSummaryRenderToken: 0,
    activeMonthEntries: {},
    liveThumbs: new Set(),
    modalImage: null,
    modalImageCanvas: null,
    modalImageViewport: null,
    modalImageIsoDate: null,
    modalImageEntries: [],
    modalImageIndex: 0,
    modalImageLabelBase: "",
    modalZoom: MIN_LIGHTBOX_ZOOM,
    modalZoomInButton: null,
    modalZoomOutButton: null,
    modalPan: {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      scrollLeft: 0,
      scrollTop: 0
    },
    renderToken: 0,
    probing: {},
    probed: {},
    eventSchema: {},
    events: {
      past: {},
      future: {}
    },
    pnl: {},
    holidays: {},
    temporalDataLoaded: {},
    temporalDataLoading: {},
    pnlDataLoaded: {},
    pnlDataLoading: {},
    embeddedTemporalDataApplied: false
  };

  function parseYearMonth(value) {
    var match = String(value || "").match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      return null;
    }

    return {
      year: Number(match[1]),
      month: Number(match[2])
    };
  }

  function getYearFromYearMonth(value) {
    var parsed = parseYearMonth(value);
    return parsed ? String(parsed.year) : "";
  }

  function formatYearMonth(year, month) {
    return year + "-" + pad(month);
  }

  function shiftYearMonth(yearMonth, offset) {
    var parsed = parseYearMonth(yearMonth);
    if (!parsed) {
      return null;
    }

    var date = new Date(Date.UTC(parsed.year, parsed.month - 1 + offset, 1));
    return formatYearMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
  }

  function compareYearMonths(left, right) {
    var leftParsed = parseYearMonth(left);
    var rightParsed = parseYearMonth(right);
    if (!leftParsed || !rightParsed) {
      return 0;
    }

    return (leftParsed.year - rightParsed.year) || (leftParsed.month - rightParsed.month);
  }

  function buildYearMonthRange(start, end) {
    var months = [];
    var parsedStart = parseYearMonth(start);
    var parsedEnd = parseYearMonth(end);
    if (!parsedStart || !parsedEnd || compareYearMonths(start, end) > 0) {
      return months;
    }

    var cursor = start;
    while (compareYearMonths(cursor, end) <= 0) {
      months.push(cursor);
      cursor = shiftYearMonth(cursor, 1);
    }

    return months;
  }

  function describeYearMonth(yearMonth) {
    var parsed = parseYearMonth(yearMonth);
    if (!parsed) {
      return "Unknown month";
    }

    return monthFormatter.format(new Date(Date.UTC(parsed.year, parsed.month - 1, 1)));
  }

  function getCurrentYearMonth() {
    var today = new Date();
    return today.getFullYear() + "-" + pad(today.getMonth() + 1);
  }

  function getMonthNameLower(monthNumber) {
    return [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december"
    ][monthNumber - 1];
  }

  function getAllSymbols() {
    return chartIndex.symbols.slice();
  }

  function isAnalyticsSymbol(symbol) {
    return ANALYTICS_SYMBOLS.indexOf(symbol) !== -1;
  }

  function isNonCalendarSymbol(symbol) {
    return NON_CALENDAR_SYMBOLS.indexOf(symbol) !== -1;
  }

  function getSymbolLabel(symbol) {
    if (symbol === "FII_DII") {
      return "FII / DII Flow";
    }

    if (symbol === "FII_DII_ANALYTICS") {
      return "FII & DII Analytics";
    }

    if (symbol === "MARKET_SENTIMENT") {
      return "Market Sentiment";
    }

    return symbol;
  }

  function getEntriesForMonth(symbol, yearMonth) {
    return normalizeMonthEntries(
      (chartIndex.images[symbol] && chartIndex.images[symbol][yearMonth]) || {}
    );
  }

  function getDayEvents(kind, symbol, yearMonth, dayKey) {
    return (
      (state.events[kind] &&
        state.events[kind][symbol] &&
        state.events[kind][symbol][yearMonth] &&
        state.events[kind][symbol][yearMonth][dayKey]) ||
      []
    );
  }

  function getEventsForIsoDate(kind, symbol, isoDate) {
    var match = String(isoDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return [];
    }

    return getDayEvents(kind, symbol, match[1] + "-" + match[2], match[3]);
  }

  function getHolidayForDay(symbol, yearMonth, dayKey) {
    return (
      (state.holidays[symbol] &&
        state.holidays[symbol][yearMonth] &&
        state.holidays[symbol][yearMonth][dayKey]) ||
      null
    );
  }

  function getPnlForDay(symbol, yearMonth, dayKey) {
    return (
      (state.pnl[symbol] &&
        state.pnl[symbol][yearMonth] &&
        state.pnl[symbol][yearMonth][dayKey]) ||
      null
    );
  }

  function getPnlForIsoDate(symbol, isoDate) {
    var match = String(isoDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return null;
    }

    return getPnlForDay(symbol, match[1] + "-" + match[2], match[3]);
  }

  function getMonthlyPnlSummary(symbol, yearMonth) {
    return getPnlSummaryForMonths(symbol, [yearMonth]);
  }

  function getPnlSummaryForMonths(symbol, yearMonths) {
    if (!symbol || !Array.isArray(yearMonths) || !yearMonths.length) {
      return null;
    }

    var totalProfit = 0;
    var totalLoss = 0;
    var totalBrokerageAndNetCharges = 0;
    var hasBrokerageAndNetCharges = false;
    var hasEntries = false;
    var tradedDays = 0;
    var winningDays = 0;
    var losingDays = 0;
    var flatDays = 0;
    var winningNetTotal = 0;
    var losingNetTotal = 0;

    yearMonths.forEach(function eachMonth(yearMonth) {
      var monthEntries = (state.pnl[symbol] && state.pnl[symbol][yearMonth]) || null;
      if (!monthEntries) {
        return;
      }

      Object.keys(monthEntries).forEach(function eachDay(dayKey) {
        var entry = monthEntries[dayKey];
        var profit = Math.max(0, Number(entry && entry.profit) || 0);
        var loss = Math.max(0, Number(entry && entry.loss) || 0);
        var brokerage = entry && entry.brokerageAndNetCharges !== null
          ? Math.max(0, Number(entry.brokerageAndNetCharges) || 0)
          : 0;
        var dayNet = profit - loss - brokerage;

        hasEntries = true;
        tradedDays += 1;
        totalProfit += profit;
        totalLoss += loss;
        if (entry && entry.brokerageAndNetCharges !== null) {
          hasBrokerageAndNetCharges = true;
          totalBrokerageAndNetCharges += brokerage;
        }

        if (dayNet > 0) {
          winningDays += 1;
          winningNetTotal += dayNet;
        } else if (dayNet < 0) {
          losingDays += 1;
          losingNetTotal += Math.abs(dayNet);
        } else {
          flatDays += 1;
        }
      });
    });

    if (!hasEntries) {
      return null;
    }

    var net = totalProfit - totalLoss - totalBrokerageAndNetCharges;

    return {
      totalProfit: totalProfit,
      totalLoss: totalLoss,
      totalBrokerageAndNetCharges: totalBrokerageAndNetCharges,
      hasBrokerageAndNetCharges: hasBrokerageAndNetCharges,
      tradedDays: tradedDays,
      winningDays: winningDays,
      losingDays: losingDays,
      flatDays: flatDays,
      winningNetTotal: winningNetTotal,
      losingNetTotal: losingNetTotal,
      dayWinRate: tradedDays ? (winningDays / tradedDays) * 100 : null,
      amountWinRate: winningNetTotal + losingNetTotal > 0
        ? (winningNetTotal / (winningNetTotal + losingNetTotal)) * 100
        : null,
      net: net,
      tone: getPnlTone(net)
    };
  }

  function getPnlSummaryStatementConfig(mode, yearMonth) {
    var parsed = parseYearMonth(yearMonth);
    if (!parsed) {
      return null;
    }

    var normalizedMode = PNL_SUMMARY_STATEMENT_OPTIONS.some(function hasMode(option) {
      return option.key === mode;
    })
      ? mode
      : state.pnlSummaryStatementMode;

    if (normalizedMode === PNL_SUMMARY_STATEMENT_MODES.calendarYear) {
      var calendarStart = formatYearMonth(parsed.year, 1);
      var calendarEnd = yearMonth;

      return {
        mode: normalizedMode,
        title: "Yearly P&L Summary",
        label: "Calendar year through selected month",
        rangeLabel: String(parsed.year),
        months: buildYearMonthRange(calendarStart, calendarEnd)
      };
    }

    if (normalizedMode === PNL_SUMMARY_STATEMENT_MODES.financialYear) {
      var financialStartYear = parsed.month >= 4 ? parsed.year : parsed.year - 1;
      var financialStart = formatYearMonth(financialStartYear, 4);
      var financialEnd = yearMonth;

      return {
        mode: normalizedMode,
        title: "Financial Year P&L Summary",
        label: "Financial year through selected month",
        rangeLabel: "FY " + financialStartYear + "-" + String(financialStartYear + 1).slice(2),
        months: buildYearMonthRange(financialStart, financialEnd)
      };
    }

    return {
      mode: PNL_SUMMARY_STATEMENT_MODES.monthly,
      title: "Monthly P&L Summary",
      label: "Monthly statement",
      rangeLabel: describeYearMonth(yearMonth),
      months: [yearMonth]
    };
  }

  function getLastSaturdayDayKey(yearMonth) {
    var parsed = parseYearMonth(yearMonth);
    if (!parsed) {
      return null;
    }

    for (
      var day = new Date(Date.UTC(parsed.year, parsed.month, 0)).getUTCDate();
      day >= 1;
      day -= 1
    ) {
      if (new Date(Date.UTC(parsed.year, parsed.month - 1, day)).getUTCDay() === 6) {
        return pad(day);
      }
    }

    return null;
  }

  function getSchemaDescription(fieldName) {
    return (state.eventSchema[fieldName] && state.eventSchema[fieldName].description) || "";
  }

  function formatPnlValue(value) {
    return formatPnlMoney(value, true);
  }

  function formatPnlMoney(value, signed, displayMode) {
    var numeric = Number(value || 0);
    var sign = signed && numeric > 0 ? "+" : numeric < 0 ? "-" : "";
    var mode = displayMode || state.pnlValueDisplayMode;
    if (mode === PNL_VALUE_DISPLAY_MODES.full) {
      return sign + "₹" + pnlFormatter.format(Math.abs(numeric));
    }

    return sign + formatCompactPnlMoney(Math.abs(numeric));
  }

  function formatCompactPnlMoney(absValue) {
    var value = Number(absValue || 0);
    var unit = "";
    var scaled = value;

    if (value >= 10000000) {
      scaled = value / 10000000;
      unit = "Cr";
    } else if (value >= 100000) {
      scaled = value / 100000;
      unit = "L";
    } else if (value >= 1000) {
      scaled = value / 1000;
      unit = "K";
    }

    return "₹" + countFormatter.format(roundToPrecision(scaled, 2)) + unit;
  }

  function roundToPrecision(value, digits) {
    var multiplier = Math.pow(10, digits);
    return Math.round(value * multiplier) / multiplier;
  }

  function formatOptionalAmount(value, displayMode) {
    if (value === null || !Number.isFinite(Number(value))) {
      return "Unavailable";
    }

    return formatPnlMoney(value, false, displayMode);
  }

  function formatOptionalCount(value) {
    if (value === null || !Number.isFinite(Number(value))) {
      return "Unavailable";
    }

    return countFormatter.format(Number(value));
  }

  function formatPercent(value) {
    if (value === null || !Number.isFinite(Number(value))) {
      return "Unavailable";
    }

    return countFormatter.format(roundToPrecision(Number(value), 1)) + "%";
  }

  function getDailyNetAfterCharges(pnlEntry) {
    var profit = Math.max(0, Number(pnlEntry && pnlEntry.profit) || 0);
    var loss = Math.max(0, Number(pnlEntry && pnlEntry.loss) || 0);
    var brokerage = pnlEntry && pnlEntry.brokerageAndNetCharges !== null
      ? Math.max(0, Number(pnlEntry.brokerageAndNetCharges) || 0)
      : 0;

    return profit - loss - brokerage;
  }

  function formatDailyGainPercentage(pnlEntry) {
    var capital = Number(pnlEntry && pnlEntry.maximumCapitalDeployed);
    if (!Number.isFinite(capital) || capital <= 0) {
      return "Unavailable";
    }

    return formatPercent((getDailyNetAfterCharges(pnlEntry) / capital) * 100);
  }

  function getPnlTone(net) {
    if (net > 0) {
      return "profit";
    }

    if (net < 0) {
      return "loss";
    }

    return "flat";
  }

  function createPnlDisplayToggle() {
    var button = document.createElement("button");
    var isFullMode = state.pnlValueDisplayMode === PNL_VALUE_DISPLAY_MODES.full;
    button.type = "button";
    button.className = "pnl-display-toggle";
    button.dataset.pnlDisplayToggle = "true";
    button.setAttribute("aria-pressed", String(isFullMode));
    button.setAttribute(
      "aria-label",
      isFullMode ? "Show compact P&L values" : "Show full P&L values"
    );
    button.title = isFullMode
      ? "Show compact P&L values"
      : "Show full P&L values";
    button.textContent = isFullMode ? "123" : "K/L";
    return button;
  }

  function createPnlSummaryStatementControls(activeMode) {
    var controls = document.createElement("div");
    controls.className = "pnl-summary-mode-control";
    controls.setAttribute("role", "tablist");
    controls.setAttribute("aria-label", "P&L summary statement type");

    PNL_SUMMARY_STATEMENT_OPTIONS.forEach(function addOption(option) {
      var button = document.createElement("button");
      var isActive = option.key === activeMode;
      button.type = "button";
      button.className = "pnl-summary-mode-button";
      button.dataset.pnlSummaryMode = option.key;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(isActive));
      button.textContent = option.label;
      controls.appendChild(button);
    });

    return controls;
  }

  function createPnlWinRateControls(activeMode) {
    var controls = document.createElement("div");
    controls.className = "pnl-win-rate-mode-control";
    controls.setAttribute("role", "tablist");
    controls.setAttribute("aria-label", "P&L win rate calculation type");

    PNL_WIN_RATE_OPTIONS.forEach(function addOption(option) {
      var button = document.createElement("button");
      var isActive = option.key === activeMode;
      button.type = "button";
      button.className = "pnl-win-rate-mode-button";
      button.dataset.pnlWinRateMode = option.key;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(isActive));
      button.textContent = option.label;
      controls.appendChild(button);
    });

    return controls;
  }

  function createPnlWinRateSummary(summary) {
    var mode = state.pnlWinRateMode;
    var value = mode === PNL_WIN_RATE_MODES.amount
      ? summary.amountWinRate
      : summary.dayWinRate;
    var detail = mode === PNL_WIN_RATE_MODES.amount
      ? formatPnlMoney(summary.winningNetTotal, false) +
        " wins / " +
        formatPnlMoney(summary.winningNetTotal + summary.losingNetTotal, false) +
        " total movement"
      : summary.winningDays +
        " wins / " +
        summary.tradedDays +
        " traded days" +
        (summary.flatDays ? " / " + summary.flatDays + " flat" : "");

    var wrapper = document.createElement("div");
    wrapper.className = "pnl-win-rate-summary";

    var header = document.createElement("div");
    header.className = "pnl-win-rate-header";

    var label = document.createElement("span");
    label.className = "pnl-win-rate-label";
    label.textContent = mode === PNL_WIN_RATE_MODES.amount ? "Profit share" : "Win rate";

    var controls = createPnlWinRateControls(mode);

    header.appendChild(label);
    header.appendChild(controls);

    var percent = document.createElement("p");
    percent.className = "pnl-win-rate-value";
    percent.textContent = formatPercent(value);

    var note = document.createElement("p");
    note.className = "pnl-win-rate-note";
    note.textContent = detail;

    wrapper.appendChild(header);
    wrapper.appendChild(percent);
    wrapper.appendChild(note);
    return wrapper;
  }

  function createMonthlyPnlSummary(summary, symbol, yearMonth, options) {
    var config = options || {};
    var displayMode = config.displayMode || state.pnlValueDisplayMode;
    var wrapper = document.createElement("div");
    wrapper.className =
      "monthly-pnl-summary monthly-pnl-summary--" +
      summary.tone +
      " monthly-pnl-summary--" +
      displayMode;
    if (symbol && yearMonth) {
      wrapper.dataset.monthlyPnlSymbol = symbol;
      wrapper.dataset.monthlyPnlMonth = yearMonth;
      wrapper.setAttribute("role", "button");
      wrapper.setAttribute("tabindex", "0");
      wrapper.setAttribute(
        "aria-label",
        "Open monthly P&L summary for " + symbol + " " + describeYearMonth(yearMonth)
      );
    }

    var profit = document.createElement("p");
    profit.className = "monthly-pnl-line";
    var profitLabel = document.createElement("span");
    profitLabel.className = "monthly-pnl-label";
    profitLabel.textContent = "Profit";
    var profitValue = document.createElement("span");
    profitValue.className = "monthly-pnl-value monthly-pnl-value--profit";
    profitValue.textContent = formatPnlMoney(summary.totalProfit, true, displayMode);
    profit.appendChild(profitLabel);
    profit.appendChild(profitValue);

    var loss = document.createElement("p");
    loss.className = "monthly-pnl-line";
    var lossLabel = document.createElement("span");
    lossLabel.className = "monthly-pnl-label";
    lossLabel.textContent = "Loss";
    var lossValue = document.createElement("span");
    lossValue.className = "monthly-pnl-value monthly-pnl-value--loss";
    lossValue.textContent = formatPnlMoney(-summary.totalLoss, true, displayMode);
    loss.appendChild(lossLabel);
    loss.appendChild(lossValue);

    var brokerage = document.createElement("p");
    brokerage.className = "monthly-pnl-line";
    var brokerageLabel = document.createElement("span");
    brokerageLabel.className = "monthly-pnl-label";
    brokerageLabel.textContent = "Brokerage";
    var brokerageValue = document.createElement("span");
    brokerageValue.className =
      "monthly-pnl-value" +
      (summary.hasBrokerageAndNetCharges ? "" : " monthly-pnl-value--muted");
    brokerageValue.textContent = summary.hasBrokerageAndNetCharges
      ? formatPnlMoney(summary.totalBrokerageAndNetCharges, false, displayMode)
      : "Unavailable";
    brokerage.appendChild(brokerageLabel);
    brokerage.appendChild(brokerageValue);

    var net = document.createElement("p");
    net.className = "monthly-pnl-line monthly-pnl-line--net";
    var netLabel = document.createElement("span");
    netLabel.className = "monthly-pnl-label";
    netLabel.textContent = "Net";
    var netValue = document.createElement("span");
    netValue.className =
      "monthly-pnl-value monthly-pnl-value--net monthly-pnl-value--" + summary.tone;
    netValue.textContent = formatPnlMoney(summary.net, true, displayMode);
    net.appendChild(netLabel);
    net.appendChild(netValue);

    wrapper.appendChild(profit);
    wrapper.appendChild(loss);
    wrapper.appendChild(brokerage);
    wrapper.appendChild(net);
    return wrapper;
  }

  function openMonthlyPnlSummaryModal(symbol, yearMonth) {
    state.pnlSummaryStatementMode = PNL_SUMMARY_STATEMENT_MODES.monthly;
    openModalFrame("Monthly P&L Summary", symbol + " · " + describeYearMonth(yearMonth), "pnl-summary");
    lightbox.dataset.pnlSymbol = symbol;
    lightbox.dataset.pnlMonth = yearMonth;
    renderPnlSummaryStatementModal(symbol, yearMonth, state.pnlSummaryStatementMode);
  }

  async function renderPnlSummaryStatementModal(symbol, yearMonth, mode) {
    var config = getPnlSummaryStatementConfig(mode, yearMonth);
    if (!config) {
      renderLightboxError("No P&L summary range is available.");
      return;
    }

    var renderToken = state.pnlSummaryRenderToken + 1;
    state.pnlSummaryRenderToken = renderToken;
    state.pnlSummaryStatementMode = config.mode;
    lightboxTitle.textContent = config.title;
    lightboxMeta.textContent = symbol + " · " + config.rangeLabel;

    if (config.mode !== PNL_SUMMARY_STATEMENT_MODES.monthly) {
      renderPnlSummaryLoading(config.mode);
      await loadPnlDataForSummaryRange(symbol, config.months);
      if (renderToken !== state.pnlSummaryRenderToken || lightbox.hidden) {
        return;
      }
    }

    var summary = getPnlSummaryForMonths(symbol, config.months);
    if (!summary) {
      renderLightboxError("No P&L data is available for this summary range.");
      return;
    }

    var card = document.createElement("div");
    card.className = "pnl-card pnl-card--summary pnl-card--" + summary.tone;
    card.appendChild(createPnlSummaryToolbar(config.mode));
    card.appendChild(createMonthlyPnlSummary(summary));
    card.appendChild(createPnlWinRateSummary(summary));
    lightboxBody.replaceChildren(card);
  }

  function renderPnlSummaryLoading(activeMode) {
    var card = document.createElement("div");
    card.className = "pnl-card pnl-card--summary pnl-card--flat";
    card.appendChild(createPnlSummaryToolbar(activeMode));

    var message = document.createElement("p");
    message.className = "pnl-summary-loading";
    message.textContent = "Loading P&L summary...";
    card.appendChild(message);
    lightboxBody.replaceChildren(card);
  }

  function createPnlSummaryToolbar(activeMode) {
    var toolbar = document.createElement("div");
    toolbar.className = "pnl-summary-toolbar";
    toolbar.appendChild(createPnlSummaryStatementControls(activeMode));
    toolbar.appendChild(createPnlDisplayToggle());
    return toolbar;
  }

  function buildCalendarCells(yearMonth) {
    var parsed = parseYearMonth(yearMonth);
    if (!parsed) {
      return [];
    }

    var year = parsed.year;
    var month = parsed.month;
    var firstDay = new Date(Date.UTC(year, month - 1, 1));
    var totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
    var startOffset = firstDay.getUTCDay();
    var totalCells = Math.ceil((startOffset + totalDays) / 7) * 7;
    var cells = [];

    for (var index = 0; index < totalCells; index += 1) {
      var dayNumber = index - startOffset + 1;
      var isCurrentMonth = dayNumber >= 1 && dayNumber <= totalDays;
      cells.push({
        dayNumber: isCurrentMonth ? dayNumber : null,
        dayKey: isCurrentMonth ? pad(dayNumber) : null,
        isCurrentMonth: isCurrentMonth
      });
    }

    return cells;
  }

  function getProbeKey(symbol, yearMonth) {
    return symbol + "::" + yearMonth;
  }

  function markMonthCached(symbol, yearMonth, entries) {
    var normalizedEntries = normalizeMonthEntries(entries);
    chartIndex.images[symbol] = chartIndex.images[symbol] || {};
    chartIndex.images[symbol][yearMonth] = normalizedEntries;
    chartIndex.monthsBySymbol[symbol] = chartIndex.monthsBySymbol[symbol] || [];

    if (
      Object.keys(normalizedEntries).length &&
      chartIndex.monthsBySymbol[symbol].indexOf(yearMonth) === -1
    ) {
      chartIndex.monthsBySymbol[symbol].push(yearMonth);
      chartIndex.monthsBySymbol[symbol].sort();
    }

    if (chartIndex.symbols.indexOf(symbol) === -1) {
      chartIndex.symbols.push(symbol);
      chartIndex.symbols.sort();
    }
  }

  function releaseThumbnailReferences() {
    state.liveThumbs.forEach(function cleanup(img) {
      img.onload = null;
      img.onerror = null;
      img.removeAttribute("src");
    });
    state.liveThumbs.clear();
    state.activeMonthEntries = {};
  }

  function closeLightbox() {
    if (state.modalImage) {
      state.modalImage.onload = null;
      state.modalImage.onerror = null;
      state.modalImage.removeAttribute("src");
      state.modalImage.remove();
      state.modalImage = null;
    }
    state.modalImageCanvas = null;
    state.modalImageViewport = null;
    state.modalImageIsoDate = null;
    state.modalImageEntries = [];
    state.modalImageIndex = 0;
    state.modalImageLabelBase = "";
    state.modalZoom = MIN_LIGHTBOX_ZOOM;
    state.modalZoomInButton = null;
    state.modalZoomOutButton = null;
    state.modalPan.active = false;
    state.modalPan.pointerId = null;

    lightboxBody.replaceChildren();
    lightboxTitle.textContent = "Chart screenshot";
    lightboxMeta.textContent = "";
    lightbox.hidden = true;
    lightbox.removeAttribute("data-mode");
    lightbox.removeAttribute("data-pnl-symbol");
    lightbox.removeAttribute("data-pnl-date");
    lightbox.removeAttribute("data-pnl-month");
    document.body.style.overflow = "";
  }

  function openModalFrame(title, meta, mode) {
    closeLightbox();
    lightbox.hidden = false;
    lightbox.dataset.mode = mode;
    lightboxTitle.textContent = title;
    lightboxMeta.textContent = meta || "";
    document.body.style.overflow = "hidden";
  }

  function renderLightboxError(message) {
    lightboxBody.replaceChildren();

    var error = document.createElement("p");
    error.className = "lightbox-message";
    error.textContent = message;
    lightboxBody.appendChild(error);
  }

  function getEntryImages(entry) {
    var normalizedEntry = normalizeDayEntry(entry);
    return normalizedEntry ? normalizedEntry.images.slice() : [];
  }

  function updateLightboxMeta() {
    if (!state.modalImageLabelBase) {
      lightboxMeta.textContent = "";
      return;
    }

    if (state.modalImageEntries.length > 1) {
      lightboxMeta.textContent =
        state.modalImageLabelBase +
        " · image " +
        String(state.modalImageIndex + 1) +
        " of " +
        String(state.modalImageEntries.length);
      return;
    }

    lightboxMeta.textContent = state.modalImageLabelBase;
  }

  function clampLightboxZoom(value) {
    return Math.max(MIN_LIGHTBOX_ZOOM, Math.min(MAX_LIGHTBOX_ZOOM, value));
  }

  function syncLightboxZoomControls() {
    if (state.modalZoomOutButton) {
      state.modalZoomOutButton.disabled = state.modalZoom <= MIN_LIGHTBOX_ZOOM;
    }

    if (state.modalZoomInButton) {
      state.modalZoomInButton.disabled = state.modalZoom >= MAX_LIGHTBOX_ZOOM;
    }
  }

  function syncLightboxViewportInteraction() {
    if (!state.modalImageViewport) {
      return;
    }

    var canPan = state.modalZoom > MIN_LIGHTBOX_ZOOM;
    state.modalImageViewport.dataset.pannable = canPan ? "true" : "false";

    if (!canPan) {
      state.modalPan.active = false;
      state.modalPan.pointerId = null;
      state.modalImageViewport.removeAttribute("data-dragging");
    }
  }

  function updateLightboxImageSizing() {
    if (
      !state.modalImage ||
      !state.modalImageViewport ||
      !state.modalImageCanvas ||
      !state.modalImage.naturalWidth ||
      !state.modalImage.naturalHeight
    ) {
      return;
    }

    var viewport = state.modalImageViewport;
    var previousWidth = Math.max(viewport.scrollWidth, 1);
    var previousHeight = Math.max(viewport.scrollHeight, 1);
    var ratioX = (viewport.scrollLeft + viewport.clientWidth / 2) / previousWidth;
    var ratioY = (viewport.scrollTop + viewport.clientHeight / 2) / previousHeight;
    var availableWidth = Math.max(viewport.clientWidth, 1);
    var availableHeight = Math.max(viewport.clientHeight, 1);
    var naturalWidth = state.modalImage.naturalWidth;
    var naturalHeight = state.modalImage.naturalHeight;
    var scale = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight);
    var baseWidth = Math.max(1, Math.round(naturalWidth * scale));
    var baseHeight = Math.max(1, Math.round(naturalHeight * scale));
    var zoomedWidth = Math.round(baseWidth * state.modalZoom);
    var zoomedHeight = Math.round(baseHeight * state.modalZoom);

    state.modalImage.style.width = zoomedWidth + "px";
    state.modalImage.style.height = zoomedHeight + "px";
    state.modalImageCanvas.style.width = zoomedWidth + "px";
    state.modalImageCanvas.style.height = zoomedHeight + "px";
    viewport.dataset.zoomed = state.modalZoom > MIN_LIGHTBOX_ZOOM ? "true" : "false";
    syncLightboxViewportInteraction();

    requestAnimationFrame(function onFrame() {
      var maxScrollLeft = Math.max(viewport.scrollWidth - viewport.clientWidth, 0);
      var maxScrollTop = Math.max(viewport.scrollHeight - viewport.clientHeight, 0);
      viewport.scrollLeft = Math.round(maxScrollLeft * Math.min(Math.max(ratioX, 0), 1));
      viewport.scrollTop = Math.round(maxScrollTop * Math.min(Math.max(ratioY, 0), 1));
    });
  }

  function setLightboxZoom(nextZoom) {
    state.modalZoom = clampLightboxZoom(nextZoom);
    syncLightboxZoomControls();
    updateLightboxImageSizing();
  }

  function stopLightboxPan() {
    if (!state.modalImageViewport) {
      state.modalPan.active = false;
      state.modalPan.pointerId = null;
      return;
    }

    if (
      state.modalPan.pointerId !== null &&
      state.modalImageViewport.hasPointerCapture &&
      state.modalImageViewport.hasPointerCapture(state.modalPan.pointerId)
    ) {
      state.modalImageViewport.releasePointerCapture(state.modalPan.pointerId);
    }

    state.modalPan.active = false;
    state.modalPan.pointerId = null;
    state.modalImageViewport.removeAttribute("data-dragging");
  }

  function handleLightboxViewportPointerDown(event) {
    if (
      !state.modalImageViewport ||
      event.currentTarget !== state.modalImageViewport ||
      state.modalZoom <= MIN_LIGHTBOX_ZOOM
    ) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    state.modalPan.active = true;
    state.modalPan.pointerId = event.pointerId;
    state.modalPan.startX = event.clientX;
    state.modalPan.startY = event.clientY;
    state.modalPan.scrollLeft = state.modalImageViewport.scrollLeft;
    state.modalPan.scrollTop = state.modalImageViewport.scrollTop;
    state.modalImageViewport.dataset.dragging = "true";

    if (state.modalImageViewport.setPointerCapture) {
      state.modalImageViewport.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
  }

  function handleLightboxViewportPointerMove(event) {
    if (
      !state.modalPan.active ||
      !state.modalImageViewport ||
      event.currentTarget !== state.modalImageViewport ||
      state.modalPan.pointerId !== event.pointerId
    ) {
      return;
    }

    state.modalImageViewport.scrollLeft =
      state.modalPan.scrollLeft - (event.clientX - state.modalPan.startX);
    state.modalImageViewport.scrollTop =
      state.modalPan.scrollTop - (event.clientY - state.modalPan.startY);
    event.preventDefault();
  }

  function handleLightboxViewportPointerUp(event) {
    if (state.modalPan.pointerId !== event.pointerId) {
      return;
    }

    stopLightboxPan();
  }

  function getActiveImageSequence() {
    return Object.keys(state.activeMonthEntries)
      .sort()
      .map(function toEntry(dayKey) {
        return state.activeMonthEntries[dayKey];
      })
      .filter(Boolean);
  }

  function getAdjacentImageEntry(offset, baseIsoDate) {
    var referenceIsoDate = baseIsoDate || state.modalImageIsoDate;
    if (!referenceIsoDate) {
      return null;
    }

    var sequence = getActiveImageSequence();
    var currentIndex = sequence.findIndex(function findEntry(entry) {
      return entry.isoDate === referenceIsoDate;
    });

    if (currentIndex === -1) {
      return null;
    }

    return sequence[currentIndex + offset] || null;
  }

  function moveLightboxImage(offset) {
    var target = getAdjacentImageEntry(offset);
    if (!target) {
      return;
    }

    openLightbox(target, 0);
  }

  function createLightboxNavButton(direction, disabled) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "lightbox-nav-button lightbox-nav-button--" + direction;
    button.dataset.imageNav = direction;
    button.disabled = disabled;
    button.setAttribute(
      "aria-label",
      direction === "prev" ? "Show previous chart day" : "Show next chart day"
    );
    button.textContent = direction === "prev" ? "\u2190" : "\u2192";
    return button;
  }

  function createLightboxZoomButton(direction) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "lightbox-zoom-button";
    button.dataset.imageZoom = direction;
    button.setAttribute("aria-label", direction === "in" ? "Zoom in" : "Zoom out");
    button.textContent = direction === "in" ? "+" : "\u2212";
    return button;
  }

  function createLightboxThumbButton(imageItem, imageIndex, activeIndex, label) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "lightbox-thumb-button";
    button.dataset.modalImageIndex = String(imageIndex);
    button.setAttribute("aria-label", label);
    if (imageIndex === activeIndex) {
      button.classList.add("is-active");
      button.setAttribute("aria-current", "true");
    }

    var img = document.createElement("img");
    img.className = "lightbox-thumb-image";
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.src = imageItem.src;

    button.appendChild(img);
    return button;
  }

  function syncLightboxThumbStrip() {
    var buttons = lightboxBody.querySelectorAll("[data-modal-image-index]");
    buttons.forEach(function eachButton(button) {
      var isActive = Number(button.dataset.modalImageIndex) === state.modalImageIndex;
      button.classList.toggle("is-active", isActive);
      if (isActive) {
        button.setAttribute("aria-current", "true");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  }

  function showLightboxImageAt(index) {
    if (!state.modalImageEntries.length || !state.modalImage) {
      return;
    }

    var nextIndex = Math.max(0, Math.min(state.modalImageEntries.length - 1, index));
    var imageItem = state.modalImageEntries[nextIndex];
    var modalImage = state.modalImage;

    state.modalImageIndex = nextIndex;
    state.modalZoom = MIN_LIGHTBOX_ZOOM;
    syncLightboxZoomControls();
    syncLightboxThumbStrip();
    updateLightboxMeta();

    modalImage.onload = function onLoad() {
      if (state.modalImage !== modalImage) {
        return;
      }

      updateLightboxImageSizing();
    };
    modalImage.onerror = function onError() {
      if (state.modalImage !== modalImage) {
        return;
      }

      renderLightboxError("Unable to load this screenshot.");
      state.modalImage = null;
      state.modalImageCanvas = null;
      state.modalImageViewport = null;
      state.modalImageEntries = [];
      state.modalImageIndex = 0;
      state.modalZoomInButton = null;
      state.modalZoomOutButton = null;
    };

    if (modalImage.getAttribute("src") === imageItem.src) {
      updateLightboxImageSizing();
      return;
    }

    modalImage.src = imageItem.src;
  }

  function openLightbox(entry, imageIndex) {
    var normalizedEntry = normalizeDayEntry(entry);
    if (!normalizedEntry) {
      return;
    }

    var entryImages = getEntryImages(normalizedEntry);
    var label = state.symbol + " · " + normalizedEntry.isoDate;

    openModalFrame("Chart screenshot", label, "image");

    var shell = document.createElement("div");
    shell.className = "lightbox-image-shell";
    shell.style.setProperty("--lightbox-gallery-count", String(entryImages.length));

    var stage = document.createElement("div");
    stage.className = "lightbox-stage";

    var previousEntry = normalizedEntry.isoDate ? getAdjacentImageEntry(-1, normalizedEntry.isoDate) : null;
    var nextEntry = normalizedEntry.isoDate ? getAdjacentImageEntry(1, normalizedEntry.isoDate) : null;

    stage.appendChild(createLightboxNavButton("prev", !previousEntry));

    var viewer = document.createElement("div");
    viewer.className = "lightbox-image-viewer";

    var viewport = document.createElement("div");
    viewport.className = "lightbox-image-viewport";

    var canvas = document.createElement("div");
    canvas.className = "lightbox-image-canvas";

    var image = document.createElement("img");
    image.className = "lightbox-image";
    image.alt = label;
    image.decoding = "async";
    image.draggable = false;

    var zoomOutButton = createLightboxZoomButton("out");
    var zoomInButton = createLightboxZoomButton("in");

    state.modalImage = image;
    state.modalImageCanvas = canvas;
    state.modalImageViewport = viewport;
    state.modalImageIsoDate = normalizedEntry.isoDate || null;
    state.modalImageEntries = entryImages;
    state.modalImageIndex = 0;
    state.modalImageLabelBase = label;
    state.modalZoomInButton = zoomInButton;
    state.modalZoomOutButton = zoomOutButton;

    canvas.appendChild(image);
    viewport.appendChild(canvas);
    viewport.addEventListener("pointerdown", handleLightboxViewportPointerDown);
    viewport.addEventListener("pointermove", handleLightboxViewportPointerMove);
    viewport.addEventListener("pointerup", handleLightboxViewportPointerUp);
    viewport.addEventListener("pointercancel", handleLightboxViewportPointerUp);
    viewport.addEventListener("lostpointercapture", handleLightboxViewportPointerUp);
    viewer.appendChild(viewport);
    stage.appendChild(viewer);
    stage.appendChild(createLightboxNavButton("next", !nextEntry));
    shell.appendChild(stage);

    var footer = document.createElement("div");
    footer.className = "lightbox-footer";

    var gallery = document.createElement("div");
    gallery.className = "lightbox-gallery";

    if (entryImages.length > 1) {
      var thumbStrip = document.createElement("div");
      thumbStrip.className = "lightbox-thumb-strip";

      entryImages.forEach(function eachImage(imageItem, index) {
        thumbStrip.appendChild(
          createLightboxThumbButton(
            imageItem,
            index,
            imageIndex || 0,
            "Show image " + (index + 1) + " of " + entryImages.length
          )
        );
      });

      gallery.appendChild(thumbStrip);
    }

    var controls = document.createElement("div");
    controls.className = "lightbox-zoom-controls";
    controls.appendChild(zoomOutButton);
    controls.appendChild(zoomInButton);

    footer.appendChild(gallery);
    footer.appendChild(controls);
    shell.appendChild(footer);

    lightboxBody.replaceChildren(shell);
    showLightboxImageAt(imageIndex || 0);
  }

  function createFactLabel(label, description) {
    var node = document.createElement("span");
    node.className = "event-fact-label";
    node.textContent = label;
    if (description) {
      node.title = description;
    }
    return node;
  }

  function createMeterFact(label, value, description) {
    var meta = LEVEL_META[value] || LEVEL_META.low;
    var wrapper = document.createElement("div");
    wrapper.className = "event-fact";
    var hoverValue = meta.title + " (" + meta.percent + "%)";

    var meter = document.createElement("div");
    meter.className = "event-meter event-meter--" + value;
    meter.title = hoverValue;
    meter.setAttribute("aria-label", label + ": " + hoverValue);

    var fill = document.createElement("span");
    fill.className = "event-meter-fill event-meter-fill--" + value;
    fill.style.width = meta.percent + "%";
    fill.title = hoverValue;
    fill.setAttribute("aria-label", label + ": " + hoverValue);

    meter.appendChild(fill);
    wrapper.appendChild(createFactLabel(label, description));
    wrapper.appendChild(meter);
    return wrapper;
  }

  function createStatusFact(label, value, description) {
    var meta = STATUS_META[value] || STATUS_META.expected;
    var wrapper = document.createElement("div");
    wrapper.className = "event-fact";

    var indicator = document.createElement("span");
    indicator.className = "event-indicator " + meta.className;
    indicator.title = meta.title;
    indicator.setAttribute("aria-label", label + ": " + meta.title);

    wrapper.appendChild(createFactLabel(label, description));
    wrapper.appendChild(indicator);
    return wrapper;
  }

  function createSentimentFact(label, value, description) {
    var meta = SENTIMENT_META[value] || SENTIMENT_META.unknown;
    var wrapper = document.createElement("div");
    wrapper.className = "event-fact";

    var sentiment = document.createElement("span");
    sentiment.className = "event-sentiment";
    sentiment.textContent = meta.emoji;
    sentiment.title = meta.title;
    sentiment.setAttribute("aria-label", label + ": " + meta.title);

    wrapper.appendChild(createFactLabel(label, description));
    wrapper.appendChild(sentiment);
    return wrapper;
  }

  function createDetailRow(label, value, description) {
    var row = document.createElement("div");
    row.className = "event-detail-block";

    var labelNode = document.createElement("span");
    labelNode.className = "event-fact-label";
    labelNode.textContent = label;
    if (description) {
      labelNode.title = description;
    }

    var valueNode = document.createElement("span");
    valueNode.className = "event-detail-value";
    valueNode.textContent = value;

    row.appendChild(labelNode);
    row.appendChild(valueNode);
    return row;
  }

  function createEventCard(eventItem) {
    var card = document.createElement("article");
    card.className = "event-card";

    var header = document.createElement("div");
    header.className = "event-card-header";

    var typeBadge = document.createElement("span");
    typeBadge.className = "event-type-badge";
    typeBadge.textContent = eventItem.eventType;
    typeBadge.title = getSchemaDescription("event_type");

    var dateChip = document.createElement("span");
    dateChip.className = "event-date-chip";
    dateChip.textContent = eventItem.dateLabel;
    dateChip.title = getSchemaDescription("date");

    header.appendChild(typeBadge);
    header.appendChild(dateChip);
    card.appendChild(header);

    var content = document.createElement("p");
    content.className = "event-content";
    content.textContent = eventItem.content;
    content.title = getSchemaDescription("content");
    card.appendChild(content);

    var facts = document.createElement("div");
    facts.className = "event-facts";
    facts.appendChild(createMeterFact("Impact", eventItem.impact, getSchemaDescription("impact")));
    facts.appendChild(
      createStatusFact("Status", eventItem.eventStatus, getSchemaDescription("event_status"))
    );
    facts.appendChild(
      createMeterFact("Certainty", eventItem.certainty, getSchemaDescription("certainty"))
    );
    facts.appendChild(
      createSentimentFact("Sentiment", eventItem.sentiment, getSchemaDescription("sentiment"))
    );
    card.appendChild(facts);

    var details = document.createElement("div");
    details.className = "event-details";
    details.appendChild(
      createDetailRow(
        "Affected",
        eventItem.affectedIndices.join(", "),
        getSchemaDescription("affected_indices")
      )
    );

    if (eventItem.notes) {
      details.appendChild(createDetailRow("Notes", eventItem.notes, getSchemaDescription("notes")));
    }

    if (eventItem.source) {
      details.appendChild(
        createDetailRow("Source", eventItem.source, getSchemaDescription("source"))
      );
    }

    card.appendChild(details);
    return card;
  }

  function openEventsModal(kind, symbol, isoDate) {
    var events = getEventsForIsoDate(kind, symbol, isoDate);
    var title = EVENT_KIND_LABELS[kind] || "Events";
    var itemLabel = events.length === 1 ? "item" : "items";

    openModalFrame(title, symbol + " · " + isoDate + " · " + events.length + " " + itemLabel, "events");

    if (!events.length) {
      renderLightboxError("No event data is available for this day.");
      return;
    }

    var list = document.createElement("div");
    list.className = "event-list";

    events.forEach(function renderEvent(eventItem) {
      list.appendChild(createEventCard(eventItem));
    });

    lightboxBody.replaceChildren(list);
  }

  function openPnlModal(symbol, isoDate) {
    var pnlEntry = getPnlForIsoDate(symbol, isoDate);

    openModalFrame(PNL_KIND_LABEL, symbol + " · " + isoDate, "pnl");
    lightbox.dataset.pnlSymbol = symbol;
    lightbox.dataset.pnlDate = isoDate;

    if (!pnlEntry) {
      renderLightboxError("No P&L data is available for this day.");
      return;
    }

    var card = document.createElement("div");
    card.className = "pnl-card pnl-card--" + getPnlTone(pnlEntry.net);
    card.appendChild(createPnlDisplayToggle());

    var label = document.createElement("p");
    label.className = "pnl-card-label";
    label.textContent = pnlEntry.net > 0 ? "Profit" : "Loss";

    var value = document.createElement("p");
    value.className = "pnl-card-value";
    value.textContent = formatPnlValue(pnlEntry.net);

    var details = document.createElement("div");
    details.className = "pnl-card-details";
    [
      {
        label: "Brokerage & Net Charges",
        value: formatOptionalAmount(pnlEntry.brokerageAndNetCharges)
      },
      {
        label: "Total Traded Value",
        value: formatOptionalAmount(pnlEntry.totalTradedValue)
      },
      {
        label: "Maximum Capital Deployed",
        value: formatOptionalAmount(pnlEntry.maximumCapitalDeployed)
      },
      {
        label: "Gains Percentage",
        value: formatDailyGainPercentage(pnlEntry)
      },
      {
        label: "Total Trades Took",
        value: formatOptionalCount(pnlEntry.totalTradesTook)
      }
    ].forEach(function appendDetail(detail) {
      var row = document.createElement("p");
      row.className = "pnl-card-detail";

      var detailLabel = document.createElement("span");
      detailLabel.className = "pnl-card-detail-label";
      detailLabel.textContent = detail.label;

      var detailValue = document.createElement("span");
      detailValue.className =
        "pnl-card-detail-value" +
        (detail.value === "Unavailable" ? " pnl-card-detail-value--muted" : "");
      detailValue.textContent = detail.value;

      row.appendChild(detailLabel);
      row.appendChild(detailValue);
      details.appendChild(row);
    });

    card.appendChild(label);
    card.appendChild(value);
    card.appendChild(details);
    lightboxBody.replaceChildren(card);
  }

  function refreshOpenPnlSurface() {
    if (lightbox.hidden) {
      return;
    }

    if (lightbox.dataset.mode === "pnl" && lightbox.dataset.pnlDate) {
      openPnlModal(lightbox.dataset.pnlSymbol || state.symbol, lightbox.dataset.pnlDate);
      return;
    }

    if (lightbox.dataset.mode === "pnl-summary" && lightbox.dataset.pnlMonth) {
      renderPnlSummaryStatementModal(
        lightbox.dataset.pnlSymbol || state.symbol,
        lightbox.dataset.pnlMonth,
        state.pnlSummaryStatementMode
      );
    }
  }

  function togglePnlValueDisplayMode() {
    state.pnlValueDisplayMode =
      state.pnlValueDisplayMode === PNL_VALUE_DISPLAY_MODES.full
        ? PNL_VALUE_DISPLAY_MODES.compact
        : PNL_VALUE_DISPLAY_MODES.full;
    writePnlValueDisplayMode(state.pnlValueDisplayMode);
    renderCalendar();
    refreshOpenPnlSurface();
  }

  function updateEmptyState(hasCharts) {
    emptyState.hidden = hasCharts;
  }

  function syncEmptyStateFromGrid() {
    updateEmptyState(Boolean(calendarGrid.querySelector("[data-fullsrc]")));
  }

  function buildPathCandidates(symbol, yearMonth, day) {
    var parsed = parseYearMonth(yearMonth);
    if (!parsed) {
      return [];
    }

    var year = String(parsed.year);
    var monthName = getMonthNameLower(parsed.month);
    var monthNumber = pad(parsed.month);
    var dayNumber = String(day);
    var dayPadded = pad(day);
    var filenameSet = new Set([
      dayNumber + "-" + monthNumber + "-" + year,
      dayPadded + "-" + monthNumber + "-" + year,
      year + "-" + monthNumber + "-" + dayPadded
    ]);
    var folderVariants = [monthName, monthNumber];
    var baseVariants = [
      "charts/" + symbol + "/" + year,
      "charts/" + symbol
    ];
    var extensions = ["png", "jpg", "jpeg"];
    var candidates = [];

    baseVariants.forEach(function eachBase(basePath) {
      folderVariants.forEach(function eachFolder(folder) {
        filenameSet.forEach(function eachFilename(filename) {
          extensions.forEach(function eachExt(ext) {
            candidates.push(basePath + "/" + folder + "/" + filename + "." + ext);
          });
        });
      });
    });

    return candidates;
  }

  function buildLocalMultiImageCandidates(symbol, yearMonth, day) {
    var parsed = parseYearMonth(yearMonth);
    if (!parsed) {
      return [];
    }

    var year = String(parsed.year);
    var monthName = getMonthNameLower(parsed.month);
    var monthNumber = pad(parsed.month);
    var dayNumber = String(day);
    var dayPadded = pad(day);
    var baseNames = [
      dayNumber + "-" + monthNumber + "-" + year,
      dayPadded + "-" + monthNumber + "-" + year,
      year + "-" + monthNumber + "-" + dayPadded
    ];
    var folderVariants = [monthName, monthNumber];
    var baseVariants = [
      "charts/" + symbol + "/" + year,
      "charts/" + symbol
    ];
    var extensions = ["png", "jpg", "jpeg"];
    var candidates = [];

    baseVariants.forEach(function eachBase(basePath) {
      folderVariants.forEach(function eachFolder(folder) {
        baseNames.forEach(function eachBaseName(baseName) {
          extensions.forEach(function eachExt(ext) {
            candidates.push(basePath + "/" + folder + "/" + baseName + "." + ext);

            for (var suffix = 1; suffix <= LOCAL_MULTI_IMAGE_SUFFIX_LIMIT; suffix += 1) {
              candidates.push(basePath + "/" + folder + "/" + baseName + "_" + suffix + "." + ext);
            }
          });
        });
      });
    });

    return candidates;
  }

  function probeImage(src) {
    return new Promise(function executor(resolve) {
      var image = new Image();
      image.onload = function onLoad() {
        image.onload = null;
        image.onerror = null;
        resolve(src);
      };
      image.onerror = function onError() {
        image.onload = null;
        image.onerror = null;
        resolve(null);
      };
      image.src = src;
    });
  }

  async function probeFirstAvailable(candidates) {
    for (var index = 0; index < candidates.length; index += 1) {
      var resolved = await probeImage(candidates[index]);
      if (resolved) {
        return resolved;
      }
    }

    return null;
  }

  async function probeAllAvailable(candidates) {
    var results = [];
    var seen = new Set();

    for (var index = 0; index < candidates.length; index += 1) {
      var candidate = candidates[index];
      if (seen.has(candidate)) {
        continue;
      }

      seen.add(candidate);

      var resolved = await probeImage(candidate);
      if (resolved) {
        results.push(resolved);
      }
    }

    return results;
  }

  async function discoverMonthEntries(symbol, yearMonth, renderToken) {
    var probeKey = getProbeKey(symbol, yearMonth);
    if (state.probed[probeKey] || state.probing[probeKey]) {
      return;
    }

    state.probing[probeKey] = true;

    try {
      var parsed = parseYearMonth(yearMonth);
      if (!parsed) {
        return;
      }

      var totalDays = new Date(Date.UTC(parsed.year, parsed.month, 0)).getUTCDate();
      var results = {};
      var tasks = [];

      function scheduleDay(day) {
        var useLocalMultiImageProbe = window.location.protocol === "file:";
        var probeTask = useLocalMultiImageProbe
          ? probeAllAvailable(buildLocalMultiImageCandidates(symbol, yearMonth, day)).then(
              function onFoundMany(srcList) {
                if (!srcList.length) {
                  return;
                }

                results[pad(day)] = buildDayEntryFromAssets(
                  srcList.map(function toAsset(src) {
                    return {
                      src: src,
                      rawPath: src,
                      isoDate: yearMonth + "-" + pad(day),
                      day: day
                    };
                  }),
                  yearMonth + "-" + pad(day),
                  day
                );
              }
            )
          : probeFirstAvailable(buildPathCandidates(symbol, yearMonth, day)).then(function onFound(src) {
              if (!src) {
                return;
              }

              results[pad(day)] = {
                src: src,
                isoDate: yearMonth + "-" + pad(day),
                day: day,
                imageCount: 1,
                images: [
                  {
                    src: src,
                    rawPath: src
                  }
                ]
              };
            });

        tasks.push(probeTask);
      }

      for (var day = 1; day <= totalDays; day += 1) {
        scheduleDay(day);
      }

      await Promise.all(tasks);
      var foundEntries = Object.keys(results).length > 0;
      if (foundEntries) {
        state.probed[probeKey] = true;
        markMonthCached(symbol, yearMonth, results);
      } else {
        delete state.probed[probeKey];
      }

      if (state.symbol === symbol && state.yearMonth === yearMonth) {
        renderCalendar();
      }
    } finally {
      delete state.probing[probeKey];
    }
  }

  function createThumbnail(cell, entry, symbol, renderToken) {
    var images = getEntryImages(entry);
    var button = document.createElement("button");
    button.type = "button";
    button.className = "thumb-button";
    button.dataset.fullsrc = entry.src;
    button.dataset.dayKey = pad(entry.day);
    button.dataset.isoDate = entry.isoDate;
    button.setAttribute("aria-label", "Open chart for " + entry.isoDate);
    if (images.length > 1) {
      button.classList.add("has-multiple");
      button.dataset.imageCount = String(images.length);
    }

    var skeleton = document.createElement("span");
    skeleton.className = "thumb-skeleton";

    if (images.length > 1) {
      var badge = document.createElement("span");
      badge.className = "thumb-count-badge";
      badge.textContent = String(images.length);
      badge.setAttribute("aria-hidden", "true");
      button.appendChild(badge);
    }

    var img = document.createElement("img");
    img.className = "thumb-frame";
    img.alt = symbol + " chart for " + entry.isoDate;
    img.loading = "lazy";
    img.decoding = "async";

    img.onload = function onLoad() {
      if (state.renderToken !== renderToken || !img.isConnected) {
        return;
      }

      img.classList.add("is-visible");
      if (skeleton.isConnected) {
        skeleton.remove();
      }
    };

    img.onerror = function onError() {
      if (state.renderToken !== renderToken) {
        return;
      }

      state.liveThumbs.delete(img);
      img.onload = null;
      img.onerror = null;
      img.removeAttribute("src");
      button.remove();
      cell.classList.remove("has-chart");
      syncEmptyStateFromGrid();
    };

    button.appendChild(skeleton);
    button.appendChild(img);
    cell.appendChild(button);

    state.liveThumbs.add(img);
    img.src = entry.src;
  }

  function createEventMarker(kind, symbol, isoDate, count) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "event-marker event-marker--" + kind;
    button.dataset.eventKind = kind;
    button.dataset.symbol = symbol;
    button.dataset.isoDate = isoDate;
    button.title =
      (EVENT_KIND_LABELS[kind] || "Events") +
      " · " +
      count +
      " " +
      (count === 1 ? "item" : "items");
    button.setAttribute("aria-label", button.title);

    var hint = document.createElement("span");
    hint.className = "sr-only";
    hint.textContent = button.title;
    button.appendChild(hint);

    return button;
  }

  function createPnlMarker(symbol, isoDate, pnlEntry) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "event-marker event-marker--pnl-" + getPnlTone(pnlEntry.net);
    button.dataset.pnlDate = isoDate;
    button.dataset.symbol = symbol;
    button.title = PNL_KIND_LABEL + " · " + formatPnlValue(pnlEntry.net);
    button.setAttribute("aria-label", button.title);

    var hint = document.createElement("span");
    hint.className = "sr-only";
    hint.textContent = button.title;
    button.appendChild(hint);

    return button;
  }

  function createEventRail(symbol, isoDate, pastEvents, futureEvents, pnlEntry) {
    var rail = document.createElement("div");
    rail.className = "event-rail";

    if (pnlEntry && pnlEntry.net) {
      rail.classList.add("has-pnl");
      rail.appendChild(createPnlMarker(symbol, isoDate, pnlEntry));
    }

    if (pastEvents.length) {
      rail.appendChild(createEventMarker("past", symbol, isoDate, pastEvents.length));
    }

    if (futureEvents.length) {
      rail.appendChild(createEventMarker("future", symbol, isoDate, futureEvents.length));
    }

    return rail;
  }

  function createHolidayNote(holiday) {
    var note = document.createElement("div");
    note.className = "holiday-note";
    note.title = holiday.name;

    var prefix = document.createElement("span");
    prefix.className = "holiday-note-prefix";
    prefix.textContent = "Holiday";

    var name = document.createElement("span");
    name.className = "holiday-note-name";
    name.textContent = holiday.name;

    note.appendChild(prefix);
    note.appendChild(name);
    return note;
  }

  function renderCalendar() {
    if (isNonCalendarSymbol(state.symbol)) {
      showNonCalendarView();
      return;
    }

    state.renderToken += 1;
    var renderToken = state.renderToken;

    releaseThumbnailReferences();
    calendarGrid.replaceChildren();

    var symbol = state.symbol;
    var yearMonth = state.yearMonth;
    var entries = getEntriesForMonth(symbol, yearMonth);
    state.activeMonthEntries = entries;

    monthStatus.textContent = describeYearMonth(yearMonth) + " · " + symbol;

    var fragment = document.createDocumentFragment();
    var cells = buildCalendarCells(yearMonth);
    var hasCharts = false;
    var weekCount = Math.max(1, cells.length / 7);
    var monthPnlSummary = getMonthlyPnlSummary(symbol, yearMonth);
    var lastSaturdayDayKey = monthPnlSummary ? getLastSaturdayDayKey(yearMonth) : null;

    calendarGrid.style.gridTemplateRows = "repeat(" + weekCount + ", minmax(0, 1fr))";

    cells.forEach(function renderCell(model) {
      var cell = document.createElement("article");
      cell.className = "day-card";

      if (!model.isCurrentMonth) {
        cell.classList.add("is-outside");
        fragment.appendChild(cell);
        return;
      }

      var dayMeta = document.createElement("div");
      dayMeta.className = "day-meta";

      var dayNumber = document.createElement("span");
      dayNumber.className = "day-number";
      dayNumber.textContent = String(model.dayNumber);
      dayMeta.appendChild(dayNumber);

      var isoDate = yearMonth + "-" + model.dayKey;
      var pastEvents = getDayEvents("past", symbol, yearMonth, model.dayKey);
      var futureEvents = getDayEvents("future", symbol, yearMonth, model.dayKey);
      var pnlEntry = getPnlForDay(symbol, yearMonth, model.dayKey);
      var eventRail = createEventRail(symbol, isoDate, pastEvents, futureEvents, pnlEntry);
      var isSummaryCell = monthPnlSummary && model.dayKey === lastSaturdayDayKey;

      if (pastEvents.length || futureEvents.length || (pnlEntry && pnlEntry.net)) {
        cell.classList.add("has-event-signals");
      }
      if (pnlEntry && pnlEntry.net) {
        cell.classList.add("has-pnl-signal");
      }
      if (isSummaryCell) {
        cell.classList.add("has-monthly-pnl-summary");
        cell.classList.add("has-monthly-pnl-summary--" + monthPnlSummary.tone);
      }
      dayMeta.appendChild(eventRail);
      cell.appendChild(dayMeta);

      var entry = entries[model.dayKey];
      if (entry) {
        cell.classList.add("has-chart");
        hasCharts = true;
        createThumbnail(cell, entry, symbol, renderToken);
      } else {
        var holiday = getHolidayForDay(symbol, yearMonth, model.dayKey);
        if (holiday && !isSummaryCell) {
          cell.classList.add("has-holiday-note");
          cell.appendChild(createHolidayNote(holiday));
        }
      }

      if (isSummaryCell) {
        cell.appendChild(createMonthlyPnlSummary(monthPnlSummary, symbol, yearMonth, {
          displayMode: PNL_VALUE_DISPLAY_MODES.full
        }));
      }

      fragment.appendChild(cell);
    });

    calendarGrid.appendChild(fragment);
    updateEmptyState(hasCharts);

    loadTemporalDataForSelection(symbol, yearMonth);
    loadPnlDataForSelection(symbol, yearMonth);

    if (!state.probed[getProbeKey(symbol, yearMonth)]) {
      discoverMonthEntries(symbol, yearMonth, renderToken);
    }
  }

  function showNonCalendarView() {
    releaseThumbnailReferences();
    calendarGrid.replaceChildren();
    state.activeMonthEntries = {};
    monthStatus.textContent = "";
    updateContentView();
    updateEmptyState(true);
  }

  function updateContentView() {
    var nonCalendarMode = isNonCalendarSymbol(state.symbol);
    var flowMode = state.symbol === "FII_DII";
    var insightsMode = state.symbol === "FII_DII_ANALYTICS";
    var marketMode = state.symbol === "MARKET_SENTIMENT";

    if (calendarShell) {
      calendarShell.classList.toggle("is-hidden-view", nonCalendarMode);
    }

    if (analyticsShell) {
      analyticsShell.classList.toggle("is-hidden-view", !flowMode);
    }

    if (analyticsInsightsShell) {
      analyticsInsightsShell.classList.toggle("is-hidden-view", !insightsMode);
    }

    if (marketSentimentShell) {
      marketSentimentShell.classList.toggle("is-hidden-view", !marketMode);
    }

    if (monthStatus) {
      monthStatus.hidden = nonCalendarMode;
    }
  }

  function syncControls() {
    symbolSelect.value = state.symbol;
    monthPicker.value = state.yearMonth;
    var nonCalendarMode = isNonCalendarSymbol(state.symbol);
    monthPicker.disabled = nonCalendarMode;
    prevMonthBtn.disabled = nonCalendarMode;
    todayMonthBtn.disabled = nonCalendarMode || state.yearMonth === getCurrentYearMonth();
    nextMonthBtn.disabled = nonCalendarMode;
    updateContentView();
  }

  function dispatchSelectionChange() {
    window.dispatchEvent(new CustomEvent("trading-chart-selection-change", {
      detail: {
        symbol: state.symbol,
        yearMonth: state.yearMonth
      }
    }));
  }

  function setState(nextSymbol, nextYearMonth) {
    state.symbol = nextSymbol;
    state.yearMonth = nextYearMonth;
    syncControls();
    renderCalendar();
    dispatchSelectionChange();
  }

  function populateSymbolSelect() {
    var fragment = document.createDocumentFragment();

    getAllSymbols().forEach(function addOption(symbol) {
      var option = document.createElement("option");
      option.value = symbol;
      option.textContent = getSymbolLabel(symbol);
      fragment.appendChild(option);
    });

    symbolSelect.replaceChildren(fragment);
  }

  function applyChartIndex(nextChartIndex) {
    chartIndex = buildChartIndex([], DEFAULT_SYMBOLS);

    nextChartIndex.symbols.forEach(function mergeSymbol(symbol) {
      if (chartIndex.symbols.indexOf(symbol) === -1) {
        chartIndex.symbols.push(symbol);
      }
    });
    chartIndex.symbols.sort();

    Object.keys(nextChartIndex.images).forEach(function mergeSymbolImages(symbol) {
      chartIndex.images[symbol] = chartIndex.images[symbol] || {};
      chartIndex.monthsBySymbol[symbol] = chartIndex.monthsBySymbol[symbol] || [];

      Object.keys(nextChartIndex.images[symbol]).forEach(function mergeMonth(monthKey) {
        chartIndex.images[symbol][monthKey] = normalizeMonthEntries(
          nextChartIndex.images[symbol][monthKey]
        );
        if (chartIndex.monthsBySymbol[symbol].indexOf(monthKey) === -1) {
          chartIndex.monthsBySymbol[symbol].push(monthKey);
        }
        state.probed[getProbeKey(symbol, monthKey)] = true;
      });

      chartIndex.monthsBySymbol[symbol].sort();
    });

    populateSymbolSelect();
    syncControls();
    renderCalendar();
  }

  async function fetchJsonAsset(path, options) {
    try {
      var url = path + "?ts=" + Date.now();
      var response = await fetch(url, options || { cache: "no-store" });
      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async function loadChartIndex() {
    if (window.location.protocol === "file:") {
      return null;
    }

    var payload = await fetchJsonAsset("chart-index.json", { cache: "no-store" });
    if (!payload) {
      return null;
    }

    return buildChartIndex(payload.entries || [], DEFAULT_SYMBOLS);
  }

  function applyEmbeddedTemporalData() {
    if (state.embeddedTemporalDataApplied || !window.TRADING_CHART_EMBEDDED_DATA) {
      return state.embeddedTemporalDataApplied;
    }

    state.eventSchema = window.TRADING_CHART_EMBEDDED_DATA.schemaProperties || {};

    var resources = window.TRADING_CHART_EMBEDDED_DATA.resources || {};
    Object.keys(resources).forEach(function eachSymbol(symbol) {
      var symbolResources = resources[symbol] || {};
      var rootBucket = symbolResources.root || {};
      var years = symbolResources.years || {};

      mergeEventIndexInto(state.events.past, buildEventIndex(rootBucket.past, "past", symbol));
      mergeEventIndexInto(state.events.future, buildEventIndex(rootBucket.future, "future", symbol));
      mergeHolidayIndexInto(state.holidays, buildHolidayIndex(rootBucket.holiday, symbol));
      mergePnlIndexInto(state.pnl, buildPnlIndex(rootBucket.pnl, symbol));

      Object.keys(years).forEach(function eachYear(year) {
        var bucket = years[year] || {};
        mergeEventIndexInto(state.events.past, buildEventIndex(bucket.past, "past", symbol));
        mergeEventIndexInto(state.events.future, buildEventIndex(bucket.future, "future", symbol));
        mergeHolidayIndexInto(state.holidays, buildHolidayIndex(bucket.holiday, symbol));
        mergePnlIndexInto(state.pnl, buildPnlIndex(bucket.pnl, symbol));
      });
    });

    state.embeddedTemporalDataApplied = true;
    return true;
  }

  async function loadTemporalDataForSelection(symbol, yearMonth) {
    if (isNonCalendarSymbol(symbol)) {
      return;
    }

    var hadEmbeddedData = state.embeddedTemporalDataApplied;
    if (applyEmbeddedTemporalData()) {
      if (!hadEmbeddedData && state.symbol === symbol && state.yearMonth === yearMonth) {
        renderCalendar();
      }
    }

    if (window.location.protocol === "file:") {
      return;
    }

    var year = getYearFromYearMonth(yearMonth);
    var loadKey = symbol + "::" + year;
    if (!symbol || !year || state.temporalDataLoaded[loadKey] || state.temporalDataLoading[loadKey]) {
      return;
    }

    state.temporalDataLoading[loadKey] = true;

    try {
      var schemaPromise = state.eventSchema && Object.keys(state.eventSchema).length
        ? Promise.resolve(null)
        : fetchJsonAsset(SCHEMA_RESOURCE_PATH, { cache: "no-store" });

      var loaded = await Promise.all([
        schemaPromise,
        fetchJsonAsset(buildTemporalResourcePath(symbol, null, "past"), { cache: "no-store" }),
        fetchJsonAsset(buildTemporalResourcePath(symbol, year, "past"), { cache: "no-store" }),
        fetchJsonAsset(buildTemporalResourcePath(symbol, null, "future"), { cache: "no-store" }),
        fetchJsonAsset(buildTemporalResourcePath(symbol, year, "future"), { cache: "no-store" }),
        fetchJsonAsset(buildTemporalResourcePath(symbol, null, "holiday"), { cache: "no-store" }),
        fetchJsonAsset(buildTemporalResourcePath(symbol, year, "holiday"), { cache: "no-store" })
      ]);

      var schema = loaded[0];
      var rootPastEntries = loaded[1];
      var yearPastEntries = loaded[2];
      var rootFutureEntries = loaded[3];
      var yearFutureEntries = loaded[4];
      var rootHolidayEntries = loaded[5];
      var yearHolidayEntries = loaded[6];

      if (schema && schema.items && schema.items.properties) {
        state.eventSchema = schema.items.properties;
      }

      var livePastIndex = buildEventIndex(
        (rootPastEntries || []).concat(yearPastEntries || []),
        "past",
        symbol
      );
      var liveFutureIndex = buildEventIndex(
        (rootFutureEntries || []).concat(yearFutureEntries || []),
        "future",
        symbol
      );
      var liveHolidayIndex = buildHolidayIndex(
        (rootHolidayEntries || []).concat(yearHolidayEntries || []),
        symbol
      );

      clearIndexYear(state.events.past, symbol, year);
      clearIndexYear(state.events.future, symbol, year);
      clearIndexYear(state.holidays, symbol, year);

      mergeEventIndexInto(state.events.past, filterIndexByYear(livePastIndex, symbol, year));
      mergeEventIndexInto(state.events.future, filterIndexByYear(liveFutureIndex, symbol, year));
      mergeHolidayIndexInto(state.holidays, filterIndexByYear(liveHolidayIndex, symbol, year));
      state.temporalDataLoaded[loadKey] = true;

      if (state.symbol === symbol && getYearFromYearMonth(state.yearMonth) === year) {
        renderCalendar();
      }
    } finally {
      delete state.temporalDataLoading[loadKey];
    }
  }

  async function loadPnlDataForSelection(symbol, yearMonth) {
    if (isNonCalendarSymbol(symbol)) {
      return;
    }

    var hadEmbeddedData = state.embeddedTemporalDataApplied;
    if (applyEmbeddedTemporalData()) {
      if (!hadEmbeddedData && state.symbol === symbol && state.yearMonth === yearMonth) {
        renderCalendar();
      }
    }

    if (window.location.protocol === "file:") {
      return;
    }

    var parsed = parseYearMonth(yearMonth);
    if (!parsed || !symbol) {
      return;
    }

    await loadPnlDataForMonth(symbol, yearMonth, true);
  }

  async function loadPnlDataForSummaryRange(symbol, yearMonths) {
    if (isNonCalendarSymbol(symbol) || !Array.isArray(yearMonths) || !yearMonths.length) {
      return;
    }

    applyEmbeddedTemporalData();

    if (window.location.protocol === "file:") {
      return;
    }

    await Promise.all(yearMonths.map(function loadMonth(yearMonth) {
      return loadPnlDataForMonth(symbol, yearMonth, false);
    }));
  }

  async function loadPnlDataForMonth(symbol, yearMonth, shouldRenderSelection) {
    var parsed = parseYearMonth(yearMonth);
    if (!parsed || !symbol) {
      return;
    }

    var loadKey = symbol + "::" + yearMonth;
    if (state.pnlDataLoaded[loadKey] || state.pnlDataLoading[loadKey]) {
      return;
    }

    state.pnlDataLoading[loadKey] = true;

    try {
      var monthName = getMonthNameLower(parsed.month);
      var entries = await fetchJsonAsset(
        "charts/" + symbol + "/" + parsed.year + "/" + monthName + "/" + TEMPORAL_DATA_FILENAMES.pnl,
        { cache: "no-store" }
      );
      var hasPnlFile = Array.isArray(entries);
      var livePnlIndex = buildPnlIndex(entries || [], symbol);

      clearIndexMonth(state.pnl, symbol, yearMonth);
      mergePnlIndexInto(state.pnl, livePnlIndex);
      if (hasPnlFile) {
        state.pnlDataLoaded[loadKey] = true;
      } else {
        delete state.pnlDataLoaded[loadKey];
      }

      if (shouldRenderSelection && state.symbol === symbol && state.yearMonth === yearMonth) {
        renderCalendar();
      }
    } finally {
      delete state.pnlDataLoading[loadKey];
    }
  }

  symbolSelect.addEventListener("change", function onSymbolChange(event) {
    setState(event.target.value, state.yearMonth);
  });

  monthPicker.addEventListener("change", function onMonthChange(event) {
    if (!event.target.value) {
      syncControls();
      return;
    }

    setState(state.symbol, event.target.value);
  });

  prevMonthBtn.addEventListener("click", function onPreviousMonth() {
    var previous = shiftYearMonth(state.yearMonth, -1);
    if (previous) {
      setState(state.symbol, previous);
    }
  });

  nextMonthBtn.addEventListener("click", function onNextMonth() {
    var next = shiftYearMonth(state.yearMonth, 1);
    if (next) {
      setState(state.symbol, next);
    }
  });

  todayMonthBtn.addEventListener("click", function onTodayMonth() {
    setState(state.symbol, getCurrentYearMonth());
  });

  calendarGrid.addEventListener("click", function onGridClick(event) {
    var pnlDisplayToggle = event.target.closest("[data-pnl-display-toggle]");
    if (pnlDisplayToggle && calendarGrid.contains(pnlDisplayToggle)) {
      event.preventDefault();
      togglePnlValueDisplayMode();
      return;
    }

    var monthlyPnlTrigger = event.target.closest("[data-monthly-pnl-month]");
    if (monthlyPnlTrigger && calendarGrid.contains(monthlyPnlTrigger)) {
      openMonthlyPnlSummaryModal(
        monthlyPnlTrigger.dataset.monthlyPnlSymbol || state.symbol,
        monthlyPnlTrigger.dataset.monthlyPnlMonth || state.yearMonth
      );
      return;
    }

    var eventTrigger = event.target.closest("[data-event-kind]");
    if (eventTrigger && calendarGrid.contains(eventTrigger)) {
      openEventsModal(
        eventTrigger.dataset.eventKind,
        eventTrigger.dataset.symbol || state.symbol,
        eventTrigger.dataset.isoDate
      );
      return;
    }

    var pnlTrigger = event.target.closest("[data-pnl-date]");
    if (pnlTrigger && calendarGrid.contains(pnlTrigger)) {
      openPnlModal(
        pnlTrigger.dataset.symbol || state.symbol,
        pnlTrigger.dataset.pnlDate
      );
      return;
    }

    var trigger = event.target.closest("[data-fullsrc]");
    if (!trigger || !calendarGrid.contains(trigger)) {
      return;
    }

    openLightbox(
      state.activeMonthEntries[trigger.dataset.dayKey],
      0
    );
  });

  lightboxBody.addEventListener("click", function onLightboxBodyClick(event) {
    var pnlDisplayToggle = event.target.closest("[data-pnl-display-toggle]");
    if (pnlDisplayToggle && lightboxBody.contains(pnlDisplayToggle)) {
      event.preventDefault();
      togglePnlValueDisplayMode();
      return;
    }

    var pnlSummaryModeTrigger = event.target.closest("[data-pnl-summary-mode]");
    if (pnlSummaryModeTrigger && lightboxBody.contains(pnlSummaryModeTrigger)) {
      event.preventDefault();
      renderPnlSummaryStatementModal(
        lightbox.dataset.pnlSymbol || state.symbol,
        lightbox.dataset.pnlMonth || state.yearMonth,
        pnlSummaryModeTrigger.dataset.pnlSummaryMode
      );
      return;
    }

    var pnlWinRateModeTrigger = event.target.closest("[data-pnl-win-rate-mode]");
    if (pnlWinRateModeTrigger && lightboxBody.contains(pnlWinRateModeTrigger)) {
      event.preventDefault();
      state.pnlWinRateMode = pnlWinRateModeTrigger.dataset.pnlWinRateMode === PNL_WIN_RATE_MODES.amount
        ? PNL_WIN_RATE_MODES.amount
        : PNL_WIN_RATE_MODES.days;
      renderPnlSummaryStatementModal(
        lightbox.dataset.pnlSymbol || state.symbol,
        lightbox.dataset.pnlMonth || state.yearMonth,
        state.pnlSummaryStatementMode
      );
      return;
    }

    var zoomTrigger = event.target.closest("[data-image-zoom]");
    if (zoomTrigger && lightboxBody.contains(zoomTrigger) && !zoomTrigger.disabled) {
      setLightboxZoom(
        state.modalZoom +
          (zoomTrigger.dataset.imageZoom === "in" ? LIGHTBOX_ZOOM_STEP : -LIGHTBOX_ZOOM_STEP)
      );
      return;
    }

    var thumbTrigger = event.target.closest("[data-modal-image-index]");
    if (thumbTrigger && lightboxBody.contains(thumbTrigger)) {
      showLightboxImageAt(Number(thumbTrigger.dataset.modalImageIndex));
      return;
    }

    var navTrigger = event.target.closest("[data-image-nav]");
    if (!navTrigger || !lightboxBody.contains(navTrigger) || navTrigger.disabled) {
      return;
    }

    moveLightboxImage(navTrigger.dataset.imageNav === "prev" ? -1 : 1);
  });

  lightbox.addEventListener("click", function onLightboxClick(event) {
    var closeTrigger = event.target.closest("[data-close-modal]");
    if (closeTrigger) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", function onKeyDown(event) {
    if (
      (event.key === "Enter" || event.key === " ") &&
      document.activeElement &&
      document.activeElement.dataset &&
      document.activeElement.dataset.monthlyPnlMonth
    ) {
      openMonthlyPnlSummaryModal(
        document.activeElement.dataset.monthlyPnlSymbol || state.symbol,
        document.activeElement.dataset.monthlyPnlMonth || state.yearMonth
      );
      event.preventDefault();
      return;
    }

    if (event.key === "Escape" && !lightbox.hidden) {
      closeLightbox();
      return;
    }

    if (lightbox.hidden || lightbox.dataset.mode !== "image") {
      return;
    }

    if (event.key === "ArrowLeft") {
      moveLightboxImage(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      moveLightboxImage(1);
      return;
    }

    if (event.key === "+" || event.key === "=") {
      setLightboxZoom(state.modalZoom + LIGHTBOX_ZOOM_STEP);
      return;
    }

    if (event.key === "-") {
      setLightboxZoom(state.modalZoom - LIGHTBOX_ZOOM_STEP);
    }
  });

  window.addEventListener("resize", function onResize() {
    if (!lightbox.hidden && lightbox.dataset.mode === "image") {
      updateLightboxImageSizing();
    }
  });

  window.addEventListener("pagehide", function onPageHide() {
    closeLightbox();
    releaseThumbnailReferences();
    calendarGrid.replaceChildren();
  });

  populateSymbolSelect();
  state.yearMonth = getCurrentYearMonth();
  syncControls();
  renderCalendar();

  loadChartIndex().then(function handleLoadedIndex(nextChartIndex) {
    if (nextChartIndex) {
      applyChartIndex(nextChartIndex);
    }
  });

  loadTemporalDataForSelection(state.symbol, state.yearMonth);
})();
