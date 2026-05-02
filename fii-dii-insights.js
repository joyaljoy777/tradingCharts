"use strict";

var FII_DII_INSIGHTS_SYMBOL = "FII_DII_ANALYTICS";
var FII_DII_INSIGHTS_FILES = [
  "charts/FII_DII/2022.json",
  "charts/FII_DII/2023.json",
  "charts/FII_DII/2024.json",
  "charts/FII_DII/2025.json",
  "charts/FII_DII/2026.json"
];

(function fiiDiiInsightsFeature() {
  var shell = document.getElementById("fiiDiiInsightsShell");
  var statusEl = document.getElementById("fiiDiiInsightsStatus");
  var kpisEl = document.getElementById("fiiDiiInsightsKpis");
  var emptyState = document.getElementById("fiiDiiInsightsEmptyState");
  var weekdayEl = document.getElementById("fiiDiiWeekdayChart");
  var monthEl = document.getElementById("fiiDiiMonthHeatmap");
  var forecastEl = document.getElementById("fiiDiiWeeklyForecastChart");
  var forecastTitleEl = document.getElementById("fiiDiiWeeklyForecastTitle");
  var forecastCopyEl = document.getElementById("fiiDiiWeeklyForecastCopy");
  var fromInput = document.getElementById("fiiDiiInsightsFromMonth");
  var toInput = document.getElementById("fiiDiiInsightsToMonth");
  var monthSelect = document.getElementById("fiiDiiInsightsMonthSelect");
  var topbarEl = shell.querySelector(".insights-topbar");
  var gridEl = shell.querySelector(".insights-grid");
  var amountFormatter = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  var compactFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  });
  var percentFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1
  });
  var monthFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
  var state = {
    activeSymbol: "",
    loading: false,
    hasLoadedData: false,
    errorMessage: "",
    rawData: [],
    filteredData: [],
    fromMonth: "",
    toMonth: "",
    minMonth: "",
    maxMonth: "",
    selectedMonthIndex: "all",
    charts: {
      weekday: null,
      month: null,
      forecast: null
    },
    resizeObserver: null
  };

  if (
    !shell ||
    !statusEl ||
    !kpisEl ||
    !emptyState ||
    !weekdayEl ||
    !monthEl ||
    !forecastEl ||
    !forecastTitleEl ||
    !forecastCopyEl ||
    !fromInput ||
    !toInput ||
    !monthSelect
  ) {
    return;
  }

  initialize();

  function initialize() {
    bindFilterEvents();

    window.addEventListener("trading-chart-selection-change", function onSelectionChange(event) {
      var detail = event && event.detail ? event.detail : {};
      state.activeSymbol = detail.symbol || "";
      syncViewState();
    });

    window.addEventListener("pagehide", disposeCharts);
    window.addEventListener("resize", scheduleResize);
    syncViewState();
  }

  function bindFilterEvents() {
    fromInput.addEventListener("change", function onFromChange(event) {
      applyFilters(event.target.value, state.toMonth || event.target.value, state.selectedMonthIndex);
    });

    toInput.addEventListener("change", function onToChange(event) {
      applyFilters(state.fromMonth || event.target.value, event.target.value, state.selectedMonthIndex);
    });

    monthSelect.addEventListener("change", function onMonthSelectChange(event) {
      applyFilters(state.fromMonth, state.toMonth, event.target.value);
    });
  }

  function syncViewState() {
    if (state.activeSymbol !== FII_DII_INSIGHTS_SYMBOL) {
      return;
    }

    ensureChartsReady();

    if (!state.hasLoadedData && !state.loading) {
      loadData();
      return;
    }

    render();
    scheduleResize();
  }

  function isVisible() {
    return !shell.classList.contains("is-hidden-view");
  }

  function ensureChartsReady() {
    if (!window.echarts || state.charts.weekday) {
      return;
    }

    state.charts.weekday = window.echarts.init(weekdayEl, null, { renderer: "canvas" });
    state.charts.month = window.echarts.init(monthEl, null, { renderer: "canvas" });
    state.charts.forecast = window.echarts.init(forecastEl, null, { renderer: "canvas" });

    if (window.ResizeObserver && !state.resizeObserver) {
      state.resizeObserver = new ResizeObserver(function onResize() {
        scheduleResize();
      });
      state.resizeObserver.observe(shell);
    }
  }

  function disposeCharts() {
    if (state.resizeObserver) {
      state.resizeObserver.disconnect();
      state.resizeObserver = null;
    }

    Object.keys(state.charts).forEach(function eachChart(key) {
      if (state.charts[key]) {
        state.charts[key].dispose();
        state.charts[key] = null;
      }
    });
  }

  function scheduleResize() {
    window.requestAnimationFrame(function onFrame() {
      if (!isVisible()) {
        return;
      }

      Object.keys(state.charts).forEach(function eachChart(key) {
        if (state.charts[key]) {
          state.charts[key].resize();
        }
      });
    });
  }

  async function loadData() {
    state.loading = true;
    state.errorMessage = "";
    render();

    try {
      var groups = await Promise.all(
        FII_DII_INSIGHTS_FILES.map(function eachFile(path) {
          return fetchJsonAsset(path).then(function onPayload(payload) {
            return normalizePayload(payload);
          });
        })
      );

      state.rawData = mergeRecords(groups);
      state.hasLoadedData = true;

      if (!state.rawData.length) {
        state.errorMessage = "No FII / DII records were found in the yearly JSON files.";
      } else {
        initializeFilterState();
      }
    } catch (error) {
      state.errorMessage = "Unable to load the FII / DII analytics dataset right now.";
      state.hasLoadedData = true;
    } finally {
      state.loading = false;
      render();
      scheduleResize();
    }
  }

  async function fetchJsonAsset(path) {
    if (window.location.protocol === "file:") {
      return null;
    }

    try {
      var response = await fetch(path + "?ts=" + Date.now(), {
        cache: "no-store"
      });
      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  function normalizePayload(payload) {
    var rows =
      payload &&
      payload.resultData &&
      Array.isArray(payload.resultData.fii_dii_data)
        ? payload.resultData.fii_dii_data
        : [];

    if (!rows.length && window.TRADING_CHART_FII_DII_DATA) {
      return getEmbeddedRecords();
    }

    return rows
      .map(function eachRow(row) {
        return normalizeRow(row);
      })
      .filter(Boolean);
  }

  function getEmbeddedRecords() {
    if (
      window.TRADING_CHART_FII_DII_DATA &&
      Array.isArray(window.TRADING_CHART_FII_DII_DATA.records)
    ) {
      return window.TRADING_CHART_FII_DII_DATA.records
        .map(function eachRecord(record) {
          return normalizeEmbeddedRecord(record);
        })
        .filter(Boolean);
    }

    return [];
  }

  function normalizeEmbeddedRecord(record) {
    var isoDate = parseIsoDate(record && record.isoDate);
    var date;

    if (!isoDate) {
      return null;
    }

    date = new Date(isoDate + "T00:00:00Z");

    return {
      isoDate: isoDate,
      monthKey: isoDate.slice(0, 7),
      dayOfMonth: date.getUTCDate(),
      weekday: date.getUTCDay(),
      monthIndex: date.getUTCMonth(),
      fiiNet: toFiniteNumber(record.fiiNet),
      diiNet: toFiniteNumber(record.diiNet),
      net: roundToTwo(toFiniteNumber(record.net)),
      niftyClose: toFiniteNumber(record.niftyClose)
    };
  }

  function normalizeRow(row) {
    var isoDate = parseIsoDate(row && row.created_at);
    var date;
    var fiiNet;
    var diiNet;
    var niftyClose;

    if (!isoDate) {
      return null;
    }

    date = new Date(isoDate + "T00:00:00Z");
    fiiNet = toFiniteNumber(row.fii_net_value);
    diiNet = toFiniteNumber(row.dii_net_value);
    niftyClose = toFiniteNumber(row.last_trade_price);

    return {
      isoDate: isoDate,
      monthKey: isoDate.slice(0, 7),
      dayOfMonth: date.getUTCDate(),
      weekday: date.getUTCDay(),
      monthIndex: date.getUTCMonth(),
      fiiNet: fiiNet,
      diiNet: diiNet,
      net: roundToTwo(fiiNet + diiNet),
      niftyClose: niftyClose
    };
  }

  function parseIsoDate(value) {
    var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    var year;
    var month;
    var day;
    var date;

    if (!match) {
      return "";
    }

    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
    date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day
    ) {
      return "";
    }

    return match[1] + "-" + match[2] + "-" + match[3];
  }

  function toFiniteNumber(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function roundToTwo(value) {
    return Math.round(value * 100) / 100;
  }

  function mergeRecords(groups) {
    var recordsByDate = {};

    (groups || []).forEach(function eachGroup(records) {
      (records || []).forEach(function eachRecord(record) {
        recordsByDate[record.isoDate] = record;
      });
    });

    return Object.keys(recordsByDate)
      .sort()
      .map(function eachDate(dateKey) {
        return recordsByDate[dateKey];
      });
  }

  function render() {
    if (state.loading) {
      statusEl.textContent = "Loading five yearly files and building summary views…";
      emptyState.hidden = true;
      if (topbarEl) {
        topbarEl.hidden = false;
      }
      if (gridEl) {
        gridEl.hidden = false;
      }
      kpisEl.innerHTML = "";
      clearCharts();
      return;
    }

    syncFilterControls();

    if (state.errorMessage || !state.rawData.length) {
      statusEl.textContent = state.errorMessage || "No analytics data is available.";
      emptyState.hidden = false;
      if (topbarEl) {
        topbarEl.hidden = true;
      }
      if (gridEl) {
        gridEl.hidden = true;
      }
      kpisEl.innerHTML = "";
      clearCharts();
      return;
    }

    if (!state.filteredData.length) {
      statusEl.textContent = "No records match the selected time range and calendar month.";
      emptyState.hidden = false;
      if (topbarEl) {
        topbarEl.hidden = false;
      }
      if (gridEl) {
        gridEl.hidden = false;
      }
      kpisEl.innerHTML = "";
      clearCharts();
      return;
    }

    emptyState.hidden = true;
    if (topbarEl) {
      topbarEl.hidden = false;
    }
    if (gridEl) {
      gridEl.hidden = false;
    }

    var summary = buildSummary(state.filteredData);
    renderKpis(summary);
    renderForecastContext(summary);
    statusEl.textContent = summary.statusLine;
    renderCharts(summary);
  }

  function clearCharts() {
    Object.keys(state.charts).forEach(function eachChart(key) {
      if (state.charts[key]) {
        state.charts[key].clear();
      }
    });
  }

  function buildSummary(records) {
    var monthQualifier = getSelectedMonthLabel();
    var rangeLabel;

    rangeLabel = monthFormatter.format(new Date(records[0].isoDate + "T00:00:00Z")) +
      " to " +
      monthFormatter.format(new Date(records[records.length - 1].isoDate + "T00:00:00Z"));

    return {
      records: records,
      sessions: records.length,
      startDate: records[0].isoDate,
      endDate: records[records.length - 1].isoDate,
      weekday: summarizeWeekdays(records),
      months: summarizeMonths(records),
      dayBuckets: summarizeDayBuckets(records),
      avgNet: average(records.map(function mapRecord(record) {
        return record.net;
      })),
      avgFii: average(records.map(function mapRecord(record) {
        return record.fiiNet;
      })),
      avgDii: average(records.map(function mapRecord(record) {
        return record.diiNet;
      })),
      positiveRate: computePositiveRate(records),
      forecastModel: buildForecastModel(records),
      monthQualifier: monthQualifier,
      rangeLabel: rangeLabel,
      statusLine: ""
    };
  }

  function renderKpis(summary) {
    var strongestWeekday = findTopBucket(summary.weekday, "avgNet");
    var strongestMonth = findTopBucket(summary.months, "avgNet");
    var strongestDom = findTopBucket(summary.dayBuckets, "avgNet");
    var dateNote = summary.rangeLabel;
    var strongestNote = "Day bucket " + strongestDom.label;

    if (summary.monthQualifier !== "All months") {
      dateNote += " · " + summary.monthQualifier + " only";
      strongestNote += " · " + summary.monthQualifier;
    }

    summary.statusLine =
      summary.sessions +
      " sessions analysed from " +
      summary.rangeLabel +
      (summary.monthQualifier !== "All months"
        ? " using " + summary.monthQualifier + " only"
        : "") +
      ". Descriptive browser-side analysis only.";

    kpisEl.innerHTML =
      createKpiMarkup(
        "Trading sessions",
        summary.sessions.toString(),
        dateNote
      ) +
      createKpiMarkup(
        "Average net / day",
        formatAmount(summary.avgNet) + " Cr",
        "FII " + formatAmount(summary.avgFii) + " · DII " + formatAmount(summary.avgDii)
      ) +
      createKpiMarkup(
        "Positive net days",
        percentFormatter.format(summary.positiveRate) + "%",
        Math.round((summary.positiveRate / 100) * summary.sessions) + " sessions"
      ) +
      createKpiMarkup(
        "Strongest pockets",
        strongestWeekday.label + " · " + strongestMonth.label,
        strongestNote
      );
  }

  function renderForecastContext(summary) {
    if (!summary.forecastModel) {
      forecastTitleEl.textContent = "Historical buy and sell probability by weekday";
      forecastCopyEl.textContent =
        "Need a slightly larger filtered sample to estimate the target trading week.";
      return;
    }

    forecastTitleEl.textContent = summary.forecastModel.title;
    forecastCopyEl.textContent = summary.forecastModel.copy;
  }

  function initializeFilterState() {
    state.minMonth = state.rawData[0].monthKey;
    state.maxMonth = state.rawData[state.rawData.length - 1].monthKey;
    state.fromMonth = state.minMonth;
    state.toMonth = state.maxMonth;
    state.selectedMonthIndex = "all";
    applyFilteredRecords();
    syncFilterControls();
  }

  function syncFilterControls() {
    fromInput.min = state.minMonth || "";
    fromInput.max = state.maxMonth || "";
    fromInput.value = state.fromMonth || "";
    toInput.min = state.minMonth || "";
    toInput.max = state.maxMonth || "";
    toInput.value = state.toMonth || "";
    monthSelect.value = state.selectedMonthIndex;
  }

  function applyFilters(nextFromMonth, nextToMonth, nextSelectedMonthIndex) {
    if (!state.rawData.length) {
      return;
    }

    var fromMonth = normalizeYearMonthValue(nextFromMonth, state.fromMonth || state.minMonth);
    var toMonth = normalizeYearMonthValue(nextToMonth, state.toMonth || state.maxMonth);

    if (compareYearMonths(fromMonth, toMonth) > 0) {
      if (nextFromMonth === fromInput.value) {
        toMonth = fromMonth;
      } else {
        fromMonth = toMonth;
      }
    }

    state.fromMonth = fromMonth;
    state.toMonth = toMonth;
    state.selectedMonthIndex = normalizeSelectedMonth(nextSelectedMonthIndex);
    applyFilteredRecords();
    render();
    scheduleResize();
  }

  function applyFilteredRecords() {
    state.filteredData = state.rawData.filter(function filterRecord(record) {
      if (state.fromMonth && compareYearMonths(record.monthKey, state.fromMonth) < 0) {
        return false;
      }

      if (state.toMonth && compareYearMonths(record.monthKey, state.toMonth) > 0) {
        return false;
      }

      if (
        state.selectedMonthIndex !== "all" &&
        String(record.monthIndex) !== String(state.selectedMonthIndex)
      ) {
        return false;
      }

      return true;
    });
  }

  function normalizeYearMonthValue(value, fallback) {
    var match = String(value || "").match(/^(\d{4})-(\d{2})$/);
    var normalized = match ? match[1] + "-" + match[2] : fallback;

    if (!normalized) {
      return "";
    }

    if (state.minMonth && compareYearMonths(normalized, state.minMonth) < 0) {
      return state.minMonth;
    }

    if (state.maxMonth && compareYearMonths(normalized, state.maxMonth) > 0) {
      return state.maxMonth;
    }

    return normalized;
  }

  function normalizeSelectedMonth(value) {
    if (String(value) === "all") {
      return "all";
    }

    return /^(0|1|2|3|4|5|6|7|8|9|10|11)$/.test(String(value))
      ? String(value)
      : "all";
  }

  function compareYearMonths(left, right) {
    return String(left || "").localeCompare(String(right || ""));
  }

  function getSelectedMonthLabel() {
    var labels = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];

    if (state.selectedMonthIndex === "all") {
      return "All months";
    }

    return labels[Number(state.selectedMonthIndex)] || "All months";
  }

  function createKpiMarkup(label, value, note) {
    return (
      '<article class="insight-kpi">' +
      '<p class="insight-kpi-label">' +
      escapeHtml(label) +
      "</p>" +
      '<p class="insight-kpi-value">' +
      escapeHtml(value) +
      "</p>" +
      '<p class="insight-kpi-note">' +
      escapeHtml(note) +
      "</p>" +
      "</article>"
    );
  }

  function summarizeWeekdays(records) {
    var labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var order = [1, 2, 3, 4, 5];
    var buckets = order.map(function eachWeekday(index) {
      return buildBucket(labels[index], records.filter(function filterRecord(record) {
        return record.weekday === index;
      }));
    });

    return buckets;
  }

  function summarizeMonths(records) {
    var labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return labels.map(function eachMonth(label, monthIndex) {
      return buildBucket(label, records.filter(function filterRecord(record) {
        return record.monthIndex === monthIndex;
      }));
    });
  }

  function summarizeDayBuckets(records) {
    var bucketDefs = [
      { label: "1-5", min: 1, max: 5 },
      { label: "6-10", min: 6, max: 10 },
      { label: "11-15", min: 11, max: 15 },
      { label: "16-20", min: 16, max: 20 },
      { label: "21-25", min: 21, max: 25 },
      { label: "26+", min: 26, max: 31 }
    ];

    return bucketDefs.map(function eachBucket(definition) {
      return buildBucket(definition.label, records.filter(function filterRecord(record) {
        return record.dayOfMonth >= definition.min && record.dayOfMonth <= definition.max;
      }));
    });
  }

  function buildBucket(label, records) {
    return {
      label: label,
      count: records.length,
      avgFii: average(records.map(function mapRecord(record) {
        return record.fiiNet;
      })),
      avgDii: average(records.map(function mapRecord(record) {
        return record.diiNet;
      })),
      avgNet: average(records.map(function mapRecord(record) {
        return record.net;
      })),
      positiveRate: computePositiveRateForAccessor(records, "net"),
      positiveRateFii: computePositiveRateForAccessor(records, "fiiNet"),
      positiveRateDii: computePositiveRateForAccessor(records, "diiNet"),
      positiveRateNet: computePositiveRateForAccessor(records, "net")
    };
  }

  function average(values) {
    if (!values.length) {
      return 0;
    }

    return roundToTwo(
      values.reduce(function add(sum, value) {
        return sum + value;
      }, 0) / values.length
    );
  }

  function computePositiveRate(records) {
    return computePositiveRateForAccessor(records, "net");
  }

  function computePositiveRateForAccessor(records, accessor) {
    if (!records.length) {
      return 0;
    }

    var positiveCount = records.filter(function filterRecord(record) {
      return toFiniteNumber(record[accessor]) > 0;
    }).length;

    return roundToTwo((positiveCount / records.length) * 100);
  }

  function findTopBucket(buckets, metric) {
    return buckets.reduce(function pickBest(best, bucket) {
      if (!bucket || !bucket.count) {
        return best;
      }

      if (!best || bucket[metric] > best[metric]) {
        return bucket;
      }

      return best;
    }, null) || buckets[0];
  }

  function buildForecastModel(records) {
    var weekContext;

    if (!records || records.length < 8) {
      return null;
    }

    weekContext = getTargetWeekContexts();

    return {
      title: weekContext.title,
      copy: weekContext.copy,
      contexts: weekContext.contexts,
      sources: {
        fiiNet: weekContext.contexts.map(function mapContext(context) {
          return estimatePositiveProbability(records, "fiiNet", context, "rgba(255, 122, 122, 0.92)");
        }),
        diiNet: weekContext.contexts.map(function mapContext(context) {
          return estimatePositiveProbability(records, "diiNet", context, "rgba(102, 224, 132, 0.94)");
        }),
        net: weekContext.contexts.map(function mapContext(context) {
          return estimatePositiveProbability(records, "net", context, "rgba(245, 209, 82, 0.92)");
        })
      }
    };
  }

  function estimatePositiveProbability(records, accessor, nextContext, color) {
    var overallRate = computePositiveRateForAccessor(records, accessor);
    var weekdayRecords = records.filter(function filterByWeekday(record) {
      return record.weekday === nextContext.weekday;
    });
    var monthIndexTarget =
      state.selectedMonthIndex === "all"
        ? nextContext.monthIndex
        : Number(state.selectedMonthIndex);
    var monthRecords = records.filter(function filterByMonth(record) {
      return record.monthIndex === monthIndexTarget;
    });
    var dayBucketLabel = getDayBucketLabel(nextContext.dayOfMonth);
    var dayBucketRecords = records.filter(function filterByBucket(record) {
      return getDayBucketLabel(record.dayOfMonth) === dayBucketLabel;
    });
    var weekdayRate = computeSmoothedRate(weekdayRecords, accessor, overallRate, 10);
    var monthRate = computeSmoothedRate(monthRecords, accessor, overallRate, 10);
    var dayBucketRate = computeSmoothedRate(dayBucketRecords, accessor, overallRate, 10);
    var blended = roundToTwo(
      overallRate * 0.2 +
      weekdayRate * 0.4 +
      monthRate * 0.25 +
      dayBucketRate * 0.15
    );

    return {
      buyProbability: clampProbability(blended),
      sellProbability: clampProbability(roundToTwo(100 - blended)),
      color: color,
      contextLabel:
        nextContext.weekdayLabel +
        " · " +
        getMonthLabel(monthIndexTarget) +
        " · " +
        dayBucketLabel,
      axisLabel: nextContext.weekdayLabel + "\n" + nextContext.dayLabel
    };
  }

  function computeSmoothedRate(records, accessor, fallbackRate, priorWeight) {
    if (!records.length) {
      return fallbackRate;
    }

    var sampleRate = computePositiveRateForAccessor(records, accessor);
    return roundToTwo(
      ((sampleRate * records.length) + (fallbackRate * priorWeight)) /
      (records.length + priorWeight)
    );
  }

  function getTargetWeekContexts() {
    var marketNow = getMarketNow();
    var currentDate = new Date(Date.UTC(marketNow.year, marketNow.month - 1, marketNow.day));
    var weekday = currentDate.getUTCDay();
    var mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    var monday = addUtcDays(currentDate, mondayOffset);
    var useNextWeek =
      weekday === 0 ||
      weekday === 6 ||
      (weekday === 5 && (marketNow.hour > 16 || (marketNow.hour === 16 && marketNow.minute >= 0)));
    var start = useNextWeek ? addUtcDays(monday, 7) : monday;
    var contexts = [];
    var index;
    var date;

    for (index = 0; index < 5; index += 1) {
      date = addUtcDays(start, index);
      contexts.push({
        monthIndex: date.getUTCMonth(),
        weekday: date.getUTCDay(),
        weekdayLabel: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getUTCDay()],
        dayOfMonth: date.getUTCDate(),
        dayLabel: String(date.getUTCDate()).padStart(2, "0") + " " + getMonthLabel(date.getUTCMonth())
      });
    }

    return {
      title: useNextWeek
        ? "Historical tendency for next trading week"
        : "Historical tendency for current trading week",
      copy: useNextWeek
        ? "Shown after Friday 4:00 PM IST and through the weekend, using the next Monday-Friday frame."
        : "Shown during the live Monday-Friday trading week, even for weekdays already passed.",
      contexts: contexts
    };
  }

  function getMarketNow() {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(new Date());
    var result = {};

    parts.forEach(function eachPart(part) {
      if (part.type !== "literal") {
        result[part.type] = Number(part.value);
      }
    });

    return {
      year: result.year,
      month: result.month,
      day: result.day,
      hour: result.hour,
      minute: result.minute
    };
  }

  function addUtcDays(date, days) {
    var next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  function getDayBucketLabel(dayOfMonth) {
    if (dayOfMonth <= 5) {
      return "1-5";
    }

    if (dayOfMonth <= 10) {
      return "6-10";
    }

    if (dayOfMonth <= 15) {
      return "11-15";
    }

    if (dayOfMonth <= 20) {
      return "16-20";
    }

    if (dayOfMonth <= 25) {
      return "21-25";
    }

    return "26+";
  }

  function getMonthLabel(monthIndex) {
    return [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ][monthIndex] || "Month";
  }

  function clampProbability(value) {
    return Math.max(0, Math.min(100, roundToTwo(value)));
  }

  function renderCharts(summary) {
    if (!state.charts.weekday || !state.charts.month || !state.charts.forecast) {
      return;
    }

    state.charts.weekday.setOption(buildWeekdayOption(summary.weekday), true);
    state.charts.month.setOption(buildMonthHeatmapOption(summary.months), true);
    state.charts.forecast.setOption(buildForecastOption(summary.forecastModel), true);
  }

  function buildWeekdayOption(buckets) {
    var sourceMeta = [
      {
        key: "FII",
        avgAccessor: "avgFii",
        rateAccessor: "positiveRateFii",
        lineColor: "rgba(255, 122, 122, 0.92)"
      },
      {
        key: "DII",
        avgAccessor: "avgDii",
        rateAccessor: "positiveRateDii",
        lineColor: "rgba(102, 224, 132, 0.94)"
      },
      {
        key: "Net",
        avgAccessor: "avgNet",
        rateAccessor: "positiveRateNet",
        lineColor: "rgba(245, 209, 82, 0.92)"
      }
    ];

    return {
      animationDuration: 220,
      grid: {
        left: 60,
        right: 56,
        top: 30,
        bottom: 42
      },
      legend: {
        top: 0,
        left: 0,
        selectedMode: "single",
        selected: {
          FII: false,
          DII: false,
          Net: true
        },
        itemWidth: 12,
        itemHeight: 12,
        textStyle: {
          color: "rgba(245, 240, 232, 0.78)"
        }
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(22, 25, 29, 0.96)",
        borderColor: "rgba(232, 224, 210, 0.14)",
        textStyle: {
          color: "#f5f0e8"
        },
        formatter: function formatter(items) {
          var bucket = buckets[items[0].dataIndex];
          var source = getWeekdayLegendSource(items);
          var sourceLabel = source.key;
          return [
            bucket.label + " · " + sourceLabel,
            "Average flow: " + formatAmount(bucket[source.avgAccessor]) + " Cr",
            "Buying days: " + percentFormatter.format(bucket[source.rateAccessor]) + "%",
            "Sessions: " + bucket.count
          ].join("<br>");
        }
      },
      xAxis: {
        type: "category",
        data: buckets.map(function mapBucket(bucket) {
          return bucket.label;
        }),
        axisLine: {
          lineStyle: {
            color: "rgba(232, 224, 210, 0.18)"
          }
        },
        axisLabel: {
          color: "rgba(245, 240, 232, 0.68)"
        }
      },
      yAxis: [
        {
          type: "value",
          name: "Average flow (Cr)",
          nameLocation: "middle",
          nameRotate: 90,
          nameGap: 38,
          nameTextStyle: {
            color: "rgba(245, 240, 232, 0.68)"
          },
          axisLabel: {
            color: "rgba(245, 240, 232, 0.62)",
            formatter: function axisFormatter(value) {
              return compactFormatter.format(value);
            }
          },
          splitLine: {
            lineStyle: {
              color: "rgba(232, 224, 210, 0.09)"
            }
          }
        },
        {
          type: "value",
          name: "Buying %",
          nameLocation: "middle",
          nameRotate: -90,
          nameGap: 34,
          min: 0,
          max: 100,
          nameTextStyle: {
            color: "rgba(245, 240, 232, 0.68)"
          },
          axisLabel: {
            color: "rgba(245, 240, 232, 0.62)",
            formatter: "{value}%"
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: sourceMeta.reduce(function buildSeries(series, source) {
        series.push({
          name: source.key,
          type: "bar",
          data: buckets.map(function mapBucket(bucket) {
            return bucket[source.avgAccessor];
          }),
          barWidth: 28,
          itemStyle: {
            color: function colorForBucket(params) {
              return params.value >= 0
                ? "rgba(102, 224, 132, 0.82)"
                : "rgba(224, 108, 108, 0.84)";
            },
            borderRadius: [8, 8, 0, 0]
          }
        });

        series.push({
          name: source.key,
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          data: buckets.map(function mapBucket(bucket) {
            return bucket[source.rateAccessor];
          }),
          symbol: "circle",
          symbolSize: 8,
          lineStyle: {
            width: 2,
            color: source.lineColor
          },
          itemStyle: {
            color: source.lineColor
          }
        });

        return series;
      }, [])
    };
  }

  function getWeekdayLegendSource(items) {
    var name = items && items[0] ? items[0].seriesName : "Net";

    if (name === "FII") {
      return {
        key: "FII",
        avgAccessor: "avgFii",
        rateAccessor: "positiveRateFii"
      };
    }

    if (name === "DII") {
      return {
        key: "DII",
        avgAccessor: "avgDii",
        rateAccessor: "positiveRateDii"
      };
    }

    return {
      key: "Net",
      avgAccessor: "avgNet",
      rateAccessor: "positiveRateNet"
    };
  }

  function buildMonthHeatmapOption(buckets) {
    var rowMeta = [
      {
        label: "Avg FII",
        accessor: "avgFii"
      },
      {
        label: "Avg DII",
        accessor: "avgDii"
      },
      {
        label: "Avg Net",
        accessor: "avgNet"
      },
      {
        label: "Pos %",
        accessor: "positiveRate"
      }
    ];
    var heatmapData = [];
    var scoreValues = [];

    rowMeta.forEach(function eachRow(row, rowIndex) {
      var rawValues = buckets.map(function mapBucket(bucket) {
        return bucket[row.accessor];
      });
      var min = Math.min.apply(Math, rawValues);
      var max = Math.max.apply(Math, rawValues);
      var spread = max - min || 1;

      buckets.forEach(function eachBucket(bucket, bucketIndex) {
        var score = ((bucket[row.accessor] - min) / spread) * 100;
        scoreValues.push(score);
        heatmapData.push({
          value: [bucketIndex, rowIndex, roundToTwo(score)],
          rawValue: bucket[row.accessor],
          count: bucket.count
        });
      });
    });

    return {
      animationDuration: 220,
      grid: {
        left: 68,
        right: 24,
        top: 18,
        bottom: 58
      },
      tooltip: {
        position: "top",
        backgroundColor: "rgba(22, 25, 29, 0.96)",
        borderColor: "rgba(232, 224, 210, 0.14)",
        textStyle: {
          color: "#f5f0e8"
        },
        formatter: function formatter(params) {
          var row = rowMeta[params.data.value[1]];
          var bucket = buckets[params.data.value[0]];
          var suffix = row.accessor === "positiveRate" ? "%" : " Cr";
          return [
            bucket.label + " · " + row.label,
            "Value: " + formatAmount(params.data.rawValue) + suffix,
            "Sessions: " + params.data.count
          ].join("<br>");
        }
      },
      xAxis: {
        type: "category",
        data: buckets.map(function mapBucket(bucket) {
          return bucket.label;
        }),
        splitArea: {
          show: true
        },
        axisLine: {
          lineStyle: {
            color: "rgba(232, 224, 210, 0.12)"
          }
        },
        axisLabel: {
          color: "rgba(245, 240, 232, 0.68)"
        }
      },
      yAxis: {
        type: "category",
        data: rowMeta.map(function mapRow(row) {
          return row.label;
        }),
        splitArea: {
          show: true
        },
        axisLine: {
          lineStyle: {
            color: "rgba(232, 224, 210, 0.12)"
          }
        },
        axisLabel: {
          color: "rgba(245, 240, 232, 0.68)"
        }
      },
      visualMap: {
        min: Math.min.apply(Math, scoreValues),
        max: Math.max.apply(Math, scoreValues),
        orient: "horizontal",
        left: "center",
        bottom: 6,
        textStyle: {
          color: "rgba(245, 240, 232, 0.62)"
        },
        inRange: {
          color: [
            "rgba(112, 72, 72, 0.9)",
            "rgba(121, 102, 71, 0.92)",
            "rgba(148, 134, 88, 0.94)",
            "rgba(97, 134, 112, 0.96)"
          ]
        }
      },
      series: [
        {
          type: "heatmap",
          data: heatmapData,
          label: {
            show: true,
            color: "#f5f0e8",
            fontSize: 10,
            formatter: function labelFormatter(params) {
              var row = rowMeta[params.data.value[1]];
              return row.accessor === "positiveRate"
                ? percentFormatter.format(params.data.rawValue) + "%"
                : compactFormatter.format(params.data.rawValue);
            }
          },
          itemStyle: {
            borderRadius: 10,
            borderColor: "rgba(14, 16, 19, 0.7)",
            borderWidth: 2
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 18,
              shadowColor: "rgba(0, 0, 0, 0.35)"
            }
          }
        }
      ]
    };
  }

  function buildForecastOption(forecastModel) {
    var sourceMeta = [
      {
        key: "FII",
        accessor: "fiiNet"
      },
      {
        key: "DII",
        accessor: "diiNet"
      },
      {
        key: "Net",
        accessor: "net"
      }
    ];

    if (!forecastModel) {
      return {
        animation: false,
        title: {
          text: "Not enough filtered history to estimate the target week yet.",
          left: "center",
          top: "middle",
          textStyle: {
            color: "rgba(245, 240, 232, 0.62)",
            fontSize: 14,
            fontWeight: 500
          }
        }
      };
    }

    return {
      animationDuration: 220,
      grid: {
        left: 54,
        right: 24,
        top: 36,
        bottom: 48
      },
      legend: {
        top: 0,
        left: 0,
        selectedMode: "single",
        selected: {
          FII: false,
          DII: false,
          Net: true
        },
        itemWidth: 12,
        itemHeight: 12,
        textStyle: {
          color: "rgba(245, 240, 232, 0.78)"
        }
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow"
        },
        backgroundColor: "rgba(22, 25, 29, 0.96)",
        borderColor: "rgba(232, 224, 210, 0.14)",
        textStyle: {
          color: "#f5f0e8"
        },
        formatter: function formatter(items) {
          var source = getForecastLegendSource(items);
          var entry = forecastModel.sources[source.accessor][items[0].dataIndex];
          return [
            entry.axisLabel.replace("\n", " · "),
            source.key + " buy: " + percentFormatter.format(entry.buyProbability) + "%",
            source.key + " sell: " + percentFormatter.format(entry.sellProbability) + "%",
            entry.contextLabel
          ].join("<br>");
        }
      },
      xAxis: {
        type: "category",
        data: forecastModel.contexts.map(function mapContext(context) {
          return context.weekdayLabel + "\n" + context.dayLabel;
        }),
        axisLine: {
          lineStyle: {
            color: "rgba(232, 224, 210, 0.18)"
          }
        },
        axisLabel: {
          color: "rgba(245, 240, 232, 0.68)",
          lineHeight: 16
        }
      },
      yAxis: {
        type: "value",
        name: "Probability",
        nameLocation: "middle",
        nameRotate: 90,
        nameGap: 36,
        min: 0,
        max: 100,
        nameTextStyle: {
          color: "rgba(245, 240, 232, 0.68)"
        },
        axisLabel: {
          color: "rgba(245, 240, 232, 0.62)",
          formatter: "{value}%"
        },
        splitLine: {
          lineStyle: {
            color: "rgba(232, 224, 210, 0.09)"
          }
        }
      },
      series: sourceMeta.reduce(function buildSeries(series, source) {
        series.push({
          name: source.key,
          type: "bar",
          data: forecastModel.sources[source.accessor].map(function mapEntry(entry) {
            return entry.buyProbability;
          }),
          barWidth: 16,
          barGap: "25%",
          itemStyle: {
            color: "rgba(102, 224, 132, 0.84)",
            borderRadius: [8, 8, 0, 0]
          }
        });

        series.push({
          name: source.key,
          type: "bar",
          data: forecastModel.sources[source.accessor].map(function mapEntry(entry) {
            return entry.sellProbability;
          }),
          barWidth: 16,
          itemStyle: {
            color: "rgba(224, 108, 108, 0.86)",
            borderRadius: [8, 8, 0, 0]
          }
        });

        return series;
      }, [])
    };
  }

  function getForecastLegendSource(items) {
    var name = items && items[0] ? items[0].seriesName : "Net";

    if (name === "FII") {
      return {
        key: "FII",
        accessor: "fiiNet"
      };
    }

    if (name === "DII") {
      return {
        key: "DII",
        accessor: "diiNet"
      };
    }

    return {
      key: "Net",
      accessor: "net"
    };
  }

  function formatAmount(value) {
    return amountFormatter.format(roundToTwo(value));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
