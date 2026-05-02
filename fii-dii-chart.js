"use strict";

var FII_DII_ANALYTICS_SYMBOL = "FII_DII";
var FII_DII_DATA_FILES = [
  "charts/FII_DII/2022.json",
  "charts/FII_DII/2023.json",
  "charts/FII_DII/2024.json",
  "charts/FII_DII/2025.json",
  "charts/FII_DII/2026.json"
];
var FII_DII_DEFAULT_MA_COLORS = [
  "#64a7e8",
  "#45f278",
  "#d9ad67",
  "#ff925c",
  "#9d7eff",
  "#f5d152"
];
var FII_DII_SOURCE_LABELS = {
  fii: "FII only",
  dii: "DII only",
  net: "Net of both"
};
var FII_DII_FORECAST_LABEL = "Next working day";
var FII_DII_FORECAST_LABEL_PLUS_ONE = "Next working day + 1";
var FII_DII_FORECAST_SOURCE_FILLS = {
  fii: "rgba(201, 181, 255, 0.9)",
  dii: "rgba(255, 217, 120, 0.92)",
  net: "rgba(119, 216, 204, 0.9)"
};
var FII_BAR_COLOR = "rgba(157, 126, 255, 0.82)";
var DII_BAR_COLOR = "rgba(245, 209, 82, 0.86)";
var NIFTY_LINE_COLOR = "rgba(255, 92, 92, 0.96)";
var NET_POSITIVE_COLOR = "rgba(69, 242, 120, 0.88)";
var NET_NEGATIVE_COLOR = "rgba(255, 92, 92, 0.9)";
var NET_FORECAST_POSITIVE_COLOR = "rgba(111, 210, 135, 0.78)";
var NET_FORECAST_NEGATIVE_COLOR = "rgba(221, 110, 110, 0.8)";

(function fiiDiiChartFeature() {
  var analyticsShell = document.getElementById("analyticsShell");
  var chartEl = document.getElementById("fiiDiiChart");
  var symbolSelect = document.getElementById("symbolSelect");
  var fromInput = document.getElementById("fiiDiiFromMonth");
  var toInput = document.getElementById("fiiDiiToMonth");
  var addMaBtn = document.getElementById("fiiDiiAddMaBtn");
  var maList = document.getElementById("fiiDiiMaList");
  var maEditor = document.getElementById("fiiDiiMaEditor");
  var pairedStyleField = document.getElementById("fiiDiiPairedStyleField");
  var pairedStyleLabel = document.getElementById("fiiDiiPairedStyleLabel");
  var pairedStyleToggle = document.getElementById("fiiDiiPairedStyleToggle");
  var statusEl = document.getElementById("fiiDiiStatus");
  var emptyState = document.getElementById("fiiDiiEmptyState");
  var emptyTitle = emptyState ? emptyState.querySelector(".empty-title") : null;
  var emptyCopy = emptyState ? emptyState.querySelector(".empty-copy") : null;
  var modeButtons = Array.prototype.slice.call(
    document.querySelectorAll("[data-flow-mode]")
  );
  var amountFormatter = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  var niftyFormatter = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  var compactFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  });
  var shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC"
  });
  var longDateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
  var monthFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
  var state = {
    activeSymbol: symbolSelect ? symbolSelect.value : "",
    chart: null,
    resizeObserver: null,
    rawData: [],
    filteredData: [],
    fromMonth: "",
    toMonth: "",
    minMonth: "",
    maxMonth: "",
    mode: "paired",
    pairedStyle: "bar",
    overlays: [],
    maSeriesById: {},
    maForecastById: {},
    overlaySequence: 1,
    overlayDrafts: {},
    activeOverlayEditorId: null,
    maPanelMode: "",
    managerOverlayId: null,
    loading: false,
    errorMessage: "",
    hasLoadedData: false
  };

  if (
    !analyticsShell ||
    !chartEl ||
    !fromInput ||
    !toInput ||
    !addMaBtn ||
    !maList ||
    !maEditor ||
    !pairedStyleField ||
    !pairedStyleLabel ||
    !pairedStyleToggle ||
    !statusEl ||
    !emptyState
  ) {
    return;
  }

  initializeChartFeature();

  function initializeChartFeature() {
    bindUiEvents();
    syncViewState();
  }

  function bindUiEvents() {
    fromInput.addEventListener("change", function onFromChange(event) {
      applyMonthRange(event.target.value, state.toMonth || event.target.value);
    });

    toInput.addEventListener("change", function onToChange(event) {
      applyMonthRange(state.fromMonth || event.target.value, event.target.value);
    });

    modeButtons.forEach(function bindModeButton(button) {
      button.addEventListener("click", function onModeClick() {
        var nextMode = button.dataset.flowMode === "net" ? "net" : "paired";
        if (state.mode !== nextMode) {
          state.mode = nextMode;
          render();
        }
      });
    });

    pairedStyleToggle.addEventListener("click", function onPairedStyleToggleClick() {
      state.pairedStyle = state.pairedStyle === "bar" ? "line" : "bar";
      render();
    });

    addMaBtn.addEventListener("click", function onAddMaClick() {
      if (shouldUseMaManager()) {
        openMaManager();
        render();
        return;
      }

      var overlay = createMovingAverageOverlay();
      state.overlays.push(overlay);
      openOverlayEditor(overlay.id);
      render();
    });

    maList.addEventListener("click", function onMaListClick(event) {
      var actionTrigger = event.target.closest("[data-ma-action]");
      if (!actionTrigger || !maList.contains(actionTrigger)) {
        return;
      }

      event.stopPropagation();

      var overlayId = Number(actionTrigger.dataset.maId);
      var overlay = getOverlayById(overlayId);
      if (!overlay) {
        return;
      }

      if (actionTrigger.dataset.maAction === "open-manager") {
        openMaManager();
        render();
        return;
      }

      if (actionTrigger.dataset.maAction === "open") {
        if (state.activeOverlayEditorId === overlay.id) {
          closeOverlayEditor();
          render();
          return;
        }

        openOverlayEditor(overlay.id);
        render();
        return;
      }

      if (actionTrigger.dataset.maAction === "remove") {
        state.overlays = state.overlays.filter(function keepOverlay(item) {
          return item.id !== overlayId;
        });
        delete state.overlayDrafts[overlayId];
        delete state.maSeriesById[overlayId];
        delete state.maForecastById[overlayId];
        if (state.activeOverlayEditorId === overlayId) {
          closeOverlayEditor();
        }
        render();
      }
    });

    maEditor.addEventListener("input", function onMaEditorInput(event) {
      var field = event.target.dataset.maField;
      var overlayId = Number(event.target.dataset.maId);
      if (!field || !overlayId) {
        return;
      }

      var draft = ensureOverlayDraft(overlayId);
      if (!draft) {
        return;
      }

      if (field === "type") {
        draft.type = event.target.value === "EMA" ? "EMA" : "SMA";
      }

      if (field === "source") {
        draft.source = FII_DII_SOURCE_LABELS[event.target.value]
          ? event.target.value
          : "net";
      }

      if (field === "length") {
        draft.length = normalizeMovingAverageLength(event.target.value, draft.length);
      }

      if (field === "color") {
        draft.color = normalizeColorValue(event.target.value, draft.color);
      }
    });

    maEditor.addEventListener("change", function onMaEditorChange(event) {
      if (event.target.dataset.maField === "color") {
        var overlayId = Number(event.target.dataset.maId);
        var draft = ensureOverlayDraft(overlayId);
        if (draft) {
          draft.color = normalizeColorValue(event.target.value, draft.color);
          renderMovingAverageEditor();
          renderMovingAverageList();
        }
      }
    });

    maEditor.addEventListener("click", function onMaEditorClick(event) {
      event.stopPropagation();

      var managerTrigger = event.target.closest("[data-ma-manager-action]");
      var actionTrigger = event.target.closest("[data-ma-editor-action]");
      var overlayId;

      if (managerTrigger && maEditor.contains(managerTrigger)) {
        overlayId = Number(managerTrigger.dataset.maId);

        if (managerTrigger.dataset.maManagerAction === "close") {
          closeOverlayEditor();
          render();
          return;
        }

        if (managerTrigger.dataset.maManagerAction === "add") {
          var overlay = createMovingAverageOverlay();
          state.overlays.push(overlay);
          if (shouldUseMaManager()) {
            openMaManager(overlay.id);
          } else {
            openOverlayEditor(overlay.id);
          }
          render();
          return;
        }

        if (managerTrigger.dataset.maManagerAction === "clear-all") {
          state.overlays = [];
          state.overlayDrafts = {};
          state.maSeriesById = {};
          state.maForecastById = {};
          closeOverlayEditor();
          render();
          return;
        }

        if (managerTrigger.dataset.maManagerAction === "edit" && overlayId) {
          state.managerOverlayId = overlayId;
          ensureOverlayDraft(overlayId);
          render();
          return;
        }

        if (managerTrigger.dataset.maManagerAction === "remove" && overlayId) {
          removeOverlay(overlayId);
          if (!state.overlays.length) {
            closeOverlayEditor();
          } else if (shouldUseMaManager()) {
            state.maPanelMode = "manager";
            if (state.managerOverlayId === overlayId) {
              state.managerOverlayId = null;
            }
          } else {
            closeOverlayEditor();
          }
          render();
          return;
        }

        if (managerTrigger.dataset.maManagerAction === "close-detail") {
          if (state.managerOverlayId) {
            delete state.overlayDrafts[state.managerOverlayId];
          }
          state.managerOverlayId = null;
          render();
          return;
        }
      }

      if (!actionTrigger || !maEditor.contains(actionTrigger)) {
        return;
      }

      overlayId = Number(actionTrigger.dataset.maId);
      if (!overlayId) {
        return;
      }

      if (actionTrigger.dataset.maEditorAction === "cancel") {
        delete state.overlayDrafts[overlayId];
        closeOverlayEditor();
        render();
        return;
      }

      if (actionTrigger.dataset.maEditorAction === "remove") {
        state.overlays = state.overlays.filter(function keepOverlay(item) {
          return item.id !== overlayId;
        });
        delete state.overlayDrafts[overlayId];
        delete state.maSeriesById[overlayId];
        delete state.maForecastById[overlayId];
        closeOverlayEditor();
        render();
        return;
      }

      if (actionTrigger.dataset.maEditorAction === "apply") {
        applyOverlayDraft(overlayId);
        return;
      }
    });

    document.addEventListener("click", function onDocumentClick(event) {
      if (!state.activeOverlayEditorId) {
        return;
      }

      if (maEditor.contains(event.target) || maList.contains(event.target)) {
        return;
      }

      closeOverlayEditor();
      render();
    });

    document.addEventListener("keydown", function onDocumentKeyDown(event) {
      if (event.key !== "Escape" || !state.activeOverlayEditorId) {
        return;
      }

      closeOverlayEditor();
      render();
    });

    window.addEventListener("trading-chart-selection-change", function onSelectionChange(event) {
      var detail = event && event.detail ? event.detail : {};
      state.activeSymbol = detail.symbol || "";
      syncViewState();
    });

    window.addEventListener("pagehide", function onPageHide() {
      if (state.resizeObserver) {
        state.resizeObserver.disconnect();
        state.resizeObserver = null;
      }

      if (state.chart) {
        state.chart.dispose();
        state.chart = null;
      }
    });
  }

  function syncViewState() {
    var isActive = state.activeSymbol === FII_DII_ANALYTICS_SYMBOL;

    if (!isActive) {
      return;
    }

    ensureChartReady();

    if (!state.hasLoadedData && !state.loading) {
      loadFiiDiiData();
      return;
    }

    render();
    scheduleVisibleChartRefresh();
  }

  function ensureChartReady() {
    if (!window.echarts || state.chart) {
      return;
    }

    state.chart = window.echarts.init(chartEl, null, {
      renderer: "canvas"
    });

    if (window.ResizeObserver) {
      state.resizeObserver = new ResizeObserver(function onChartResize() {
        if (state.chart && isAnalyticsViewVisible()) {
          state.chart.resize();
        }
      });
      state.resizeObserver.observe(chartEl);
      return;
    }

    window.addEventListener("resize", function onWindowResize() {
      if (state.chart && isAnalyticsViewVisible()) {
        state.chart.resize();
      }
    });
  }

  function isAnalyticsViewVisible() {
    return !analyticsShell.classList.contains("is-hidden-view");
  }

  function scheduleVisibleChartRefresh() {
    window.requestAnimationFrame(function onNextFrame() {
      if (state.chart && isAnalyticsViewVisible()) {
        state.chart.resize();
        if (state.filteredData.length && !state.loading && !state.errorMessage) {
          state.chart.setOption(buildChartOption(), true);
        }
      }
    });
  }

  async function loadFiiDiiData() {
    state.loading = true;
    state.errorMessage = "";
    render();

    try {
      var mergedRecords = [];

      if (window.location.protocol === "file:") {
        mergedRecords = loadEmbeddedRecords();
      } else {
        mergedRecords = await loadRemoteRecords();
        if (!mergedRecords.length) {
          mergedRecords = loadEmbeddedRecords();
        }
      }

      if (!mergedRecords.length) {
        state.errorMessage = "No FII / DII records were found in the yearly JSON files.";
        return;
      }

      state.rawData = mergedRecords;
      state.minMonth = mergedRecords[0].monthKey;
      state.maxMonth = mergedRecords[mergedRecords.length - 1].monthKey;

      var defaultRange = buildDefaultMonthRange(state.minMonth, state.maxMonth);
      state.fromMonth = defaultRange.fromMonth;
      state.toMonth = defaultRange.toMonth;
      applyFilteredRange();
      state.hasLoadedData = true;
    } catch (error) {
      state.errorMessage = "Unable to load the FII / DII dataset right now.";
    } finally {
      state.loading = false;
      render();
    }
  }

  async function loadRemoteRecords() {
    var recordGroups = await Promise.all(
      FII_DII_DATA_FILES.map(function loadFile(path) {
        return fetchJsonAsset(path).then(function normalizePayload(payload) {
          return normalizeFiiDiiPayload(payload);
        });
      })
    );

    return mergeNormalizedRecords(recordGroups);
  }

  function loadEmbeddedRecords() {
    if (
      window.TRADING_CHART_FII_DII_DATA &&
      Array.isArray(window.TRADING_CHART_FII_DII_DATA.records)
    ) {
      return window.TRADING_CHART_FII_DII_DATA.records.slice();
    }

    return [];
  }

  async function fetchJsonAsset(path) {
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

  function normalizeFiiDiiPayload(payload) {
    var rows =
      payload &&
      payload.resultData &&
      Array.isArray(payload.resultData.fii_dii_data)
        ? payload.resultData.fii_dii_data
        : [];

    return rows
      .map(function mapRow(row) {
        return normalizeFiiDiiRow(row);
      })
      .filter(Boolean);
  }

  function normalizeFiiDiiRow(row) {
    var isoDate = parseIsoDate(row && row.created_at);
    if (!isoDate) {
      return null;
    }

    var fiiNet = toFiniteNumber(row.fii_net_value);
    var diiNet = toFiniteNumber(row.dii_net_value);
    var niftyClose = toFiniteNumber(row.last_trade_price);

    return {
      isoDate: isoDate,
      monthKey: isoDate.slice(0, 7),
      fiiNet: fiiNet,
      diiNet: diiNet,
      net: roundToTwo(fiiNet + diiNet),
      niftyClose: niftyClose
    };
  }

  function roundToTwo(value) {
    return Math.round(value * 100) / 100;
  }

  function mergeNormalizedRecords(recordGroups) {
    var recordsByDate = {};

    (recordGroups || []).forEach(function eachGroup(records) {
      (records || []).forEach(function eachRecord(record) {
        recordsByDate[record.isoDate] = record;
      });
    });

    return Object.keys(recordsByDate)
      .sort()
      .map(function mapDate(dateKey) {
        return recordsByDate[dateKey];
      });
  }

  function parseIsoDate(value) {
    var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
      return "";
    }

    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var date = new Date(Date.UTC(year, month - 1, day));

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

  function buildDefaultMonthRange(minMonth, maxMonth) {
    var recentStart = shiftYearMonth(maxMonth, -2);
    return {
      fromMonth: compareYearMonths(recentStart, minMonth) < 0 ? minMonth : recentStart,
      toMonth: maxMonth
    };
  }

  function shiftYearMonth(yearMonth, offset) {
    var match = String(yearMonth || "").match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      return "";
    }

    var date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + offset, 1));
    return date.getUTCFullYear() + "-" + padMonth(date.getUTCMonth() + 1);
  }

  function padMonth(value) {
    return String(value).padStart(2, "0");
  }

  function compareYearMonths(left, right) {
    return String(left || "").localeCompare(String(right || ""));
  }

  function applyMonthRange(nextFromMonth, nextToMonth) {
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
    applyFilteredRange();
    render();
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

  function applyFilteredRange() {
    state.filteredData = state.rawData.filter(function filterRecord(record) {
      if (state.fromMonth && compareYearMonths(record.monthKey, state.fromMonth) < 0) {
        return false;
      }

      if (state.toMonth && compareYearMonths(record.monthKey, state.toMonth) > 0) {
        return false;
      }

      return true;
    });
  }

  function createMovingAverageOverlay(config) {
    var options = config || {};
    var overlay = {
      id: state.overlaySequence,
      type: options.type === "EMA" ? "EMA" : options.type === "SMA" ? "SMA" : "SMA",
      length: normalizeMovingAverageLength(options.length, 5),
      color: normalizeColorValue(
        options.color,
        FII_DII_DEFAULT_MA_COLORS[
          (state.overlaySequence - 1) % FII_DII_DEFAULT_MA_COLORS.length
        ]
      ),
      source: FII_DII_SOURCE_LABELS[options.source]
        ? options.source
        : (state.overlaySequence - 1) % 3 === 0
          ? "net"
          : (state.overlaySequence - 1) % 3 === 1
            ? "fii"
            : "dii"
    };

    state.overlaySequence += 1;
    return overlay;
  }

  function getOverlayById(overlayId) {
    return state.overlays.find(function findOverlay(overlay) {
      return overlay.id === overlayId;
    });
  }

  function moveOverlayToEnd(overlayId) {
    var index = state.overlays.findIndex(function findIndex(overlay) {
      return overlay.id === overlayId;
    });
    var overlay;

    if (index === -1 || index === state.overlays.length - 1) {
      return;
    }

    overlay = state.overlays[index];
    state.overlays.splice(index, 1);
    state.overlays.push(overlay);
  }

  function shouldUseMaManager() {
    return state.overlays.length > 2;
  }

  function removeOverlay(overlayId) {
    state.overlays = state.overlays.filter(function keepOverlay(item) {
      return item.id !== overlayId;
    });
    delete state.overlayDrafts[overlayId];
    delete state.maSeriesById[overlayId];
    delete state.maForecastById[overlayId];
  }

  function ensureOverlayDraft(overlayId) {
    var overlay = getOverlayById(overlayId);

    if (!overlay) {
      return null;
    }

    if (!state.overlayDrafts[overlayId]) {
      state.overlayDrafts[overlayId] = {
        id: overlay.id,
        type: overlay.type,
        length: overlay.length,
        color: overlay.color,
        source: overlay.source
      };
    }

    return state.overlayDrafts[overlayId];
  }

  function openOverlayEditor(overlayId) {
    if (shouldUseMaManager()) {
      openMaManager(overlayId);
      return;
    }

    if (!getOverlayById(overlayId)) {
      return;
    }

    if (state.activeOverlayEditorId && state.activeOverlayEditorId !== overlayId) {
      delete state.overlayDrafts[state.activeOverlayEditorId];
    }

    ensureOverlayDraft(overlayId);
    state.maPanelMode = "overlay";
    state.activeOverlayEditorId = overlayId;
    state.managerOverlayId = null;
  }

  function openMaManager(overlayId) {
    var nextOverlayId = overlayId || state.managerOverlayId || null;

    if (state.activeOverlayEditorId && state.activeOverlayEditorId !== nextOverlayId) {
      delete state.overlayDrafts[state.activeOverlayEditorId];
    }

    if (nextOverlayId && getOverlayById(nextOverlayId)) {
      ensureOverlayDraft(nextOverlayId);
    }

    state.maPanelMode = "manager";
    state.activeOverlayEditorId = null;
    state.managerOverlayId = nextOverlayId;
  }

  function closeOverlayEditor() {
    if (state.activeOverlayEditorId) {
      delete state.overlayDrafts[state.activeOverlayEditorId];
    }
    if (state.managerOverlayId) {
      delete state.overlayDrafts[state.managerOverlayId];
    }
    state.maPanelMode = "";
    state.activeOverlayEditorId = null;
    state.managerOverlayId = null;
  }

  function applyOverlayDraft(overlayId) {
    var overlay = getOverlayById(overlayId);
    var draft = ensureOverlayDraft(overlayId);

    if (!overlay || !draft) {
      return;
    }

    overlay.type = draft.type === "EMA" ? "EMA" : "SMA";
    overlay.source = FII_DII_SOURCE_LABELS[draft.source] ? draft.source : "net";
    overlay.length = normalizeMovingAverageLength(draft.length, overlay.length);
    overlay.color = normalizeColorValue(draft.color, overlay.color);
    delete state.overlayDrafts[overlayId];
    if (state.maPanelMode === "manager") {
      state.managerOverlayId = null;
      render();
      return;
    }

    closeOverlayEditor();
    render();
  }

  function normalizeMovingAverageLength(value, fallback) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback || 20;
    }

    return Math.max(1, Math.round(parsed));
  }

  function normalizeColorValue(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback || "#64a7e8";
  }

  function render() {
    if (state.activeSymbol !== FII_DII_ANALYTICS_SYMBOL) {
      return;
    }

    refreshMovingAverageAnalysis();
    syncMonthInputs();
    syncModeButtons();
    syncPairedStyleButtons();
    renderMovingAverageList();
    renderMovingAverageEditor();
    renderStatus();
    renderChart();
  }

  function syncMonthInputs() {
    var isDisabled = state.loading || !!state.errorMessage || !state.rawData.length;

    fromInput.disabled = isDisabled;
    toInput.disabled = isDisabled;
    addMaBtn.disabled = isDisabled;
    addMaBtn.textContent = shouldUseMaManager() ? "Manage MAs" : "+ Add MA";
    fromInput.min = state.minMonth || "";
    fromInput.max = state.maxMonth || "";
    toInput.min = state.minMonth || "";
    toInput.max = state.maxMonth || "";
    fromInput.value = state.fromMonth || "";
    toInput.value = state.toMonth || "";
  }

  function syncModeButtons() {
    modeButtons.forEach(function updateButton(button) {
      var isActive = button.dataset.flowMode === state.mode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.disabled = state.loading || !!state.errorMessage || !state.rawData.length;
    });
  }

  function syncPairedStyleButtons() {
    var isDisabled = state.loading || !!state.errorMessage || !state.rawData.length;
    var isLine = state.pairedStyle === "line";

    pairedStyleLabel.textContent = isLine ? "Line" : "Bar";
    pairedStyleToggle.classList.toggle("is-line", isLine);
    pairedStyleToggle.setAttribute("aria-checked", isLine ? "true" : "false");
    pairedStyleToggle.setAttribute(
      "aria-label",
      "Chart style: " + (isLine ? "Line" : "Bar")
    );
    pairedStyleToggle.disabled = isDisabled;
  }

  function renderMovingAverageList() {
    if (!state.overlays.length) {
      maList.replaceChildren();
      return;
    }

    if (shouldUseMaManager()) {
      maList.innerHTML =
        '<article class="ma-chip ma-chip--manager' +
        (state.maPanelMode === "manager" ? " is-open" : "") +
        '">' +
        '<button class="ma-chip-button" type="button" data-ma-action="open-manager" data-ma-id="' +
        state.overlays[state.overlays.length - 1].id +
        '" aria-expanded="' +
        (state.maPanelMode === "manager" ? "true" : "false") +
        '">' +
        '<span class="ma-swatch" style="background:' +
        escapeHtml(state.overlays[state.overlays.length - 1].color) +
        ';"></span>' +
        '<span class="ma-chip-copy">' +
        '<span class="ma-chip-title">' +
        escapeHtml(state.overlays.length + " moving averages") +
        "</span>" +
        '<span class="ma-chip-forecast">Edit, remove, or add overlays</span>' +
        "</span>" +
        '<span class="ma-chip-caret" aria-hidden="true">' +
        (state.maPanelMode === "manager" ? "▲" : "▼") +
        "</span>" +
        "</button>" +
        "</article>";
      return;
    }

    maList.innerHTML = state.overlays
      .map(function buildMarkup(overlay) {
        var isOpen = state.activeOverlayEditorId === overlay.id;
        return (
          '<article class="ma-chip' +
          (isOpen ? " is-open" : "") +
          '" data-ma-chip-id="' +
          overlay.id +
          '">' +
          '<button class="ma-chip-button" type="button" data-ma-action="open" data-ma-id="' +
          overlay.id +
          '" aria-expanded="' +
          (isOpen ? "true" : "false") +
          '">' +
          '<span class="ma-swatch" style="background:' + escapeHtml(overlay.color) + ';"></span>' +
          '<span class="ma-chip-copy">' +
          '<span class="ma-chip-title">' +
          escapeHtml(describeOverlay(overlay)) +
          "</span>" +
          '<span class="ma-chip-forecast">' +
          escapeHtml(describeOverlayForecast(overlay)) +
          "</span>" +
          "</span>" +
          '<span class="ma-chip-caret" aria-hidden="true">' +
          (isOpen ? "▲" : "▼") +
          "</span>" +
          "</button>" +
          '<button class="ma-chip-remove" type="button" aria-label="Remove moving average" data-ma-action="remove" data-ma-id="' +
          overlay.id +
          '">×</button>' +
          "</article>"
        );
      })
      .join("");
  }

  function renderMovingAverageEditor() {
    var overlayId = state.maPanelMode === "manager"
      ? state.managerOverlayId
      : state.activeOverlayEditorId;
    var overlay;
    var draft;
    var chipEl;
    var shellRect;
    var chipRect;
    var maxLeft;
    var editorWidth;
    var left;

    if (!state.maPanelMode) {
      maEditor.hidden = true;
      maEditor.classList.remove("is-manager");
      maEditor.replaceChildren();
      maEditor.style.left = "";
      maEditor.style.right = "";
      maEditor.style.top = "";
      return;
    }

    maEditor.hidden = false;
    maEditor.classList.toggle("is-manager", state.maPanelMode === "manager");
    if (state.maPanelMode === "manager") {
      maEditor.innerHTML = buildMaManagerMarkup();
    } else {
      overlay = getOverlayById(overlayId);
      draft = ensureOverlayDraft(overlayId);

      if (!overlay || !draft) {
        closeOverlayEditor();
        maEditor.hidden = true;
        maEditor.classList.remove("is-manager");
        maEditor.replaceChildren();
        return;
      }

      maEditor.innerHTML = buildSingleOverlayEditorMarkup(overlay, draft);
    }

    if (state.maPanelMode === "manager") {
      chipEl = maList.querySelector(".ma-chip");
    } else {
      chipEl = maList.querySelector('[data-ma-chip-id="' + overlay.id + '"]');
    }

    if (chipEl) {
      shellRect = analyticsShell.getBoundingClientRect();
      chipRect = chipEl.getBoundingClientRect();
      editorWidth = maEditor.offsetWidth || 360;
      maxLeft = Math.max(12, analyticsShell.clientWidth - editorWidth - 12);
      left = chipRect.left - shellRect.left;
      maEditor.style.left = Math.min(Math.max(12, left), maxLeft) + "px";
      maEditor.style.right = "auto";
      maEditor.style.top = chipRect.bottom - shellRect.top + 8 + "px";
    } else {
      maEditor.style.left = "";
      maEditor.style.right = "";
      maEditor.style.top = "";
    }
  }

  function buildSingleOverlayEditorMarkup(overlay, draft) {
    return (
      '<div class="ma-popover-header">' +
      '<div class="ma-popover-title">' +
      '<span class="ma-swatch" style="background:' +
      escapeHtml(draft.color) +
      ';"></span>' +
      "<span>" +
      escapeHtml(describeOverlay(draft)) +
      "</span>" +
      "</div>" +
      '<button class="ma-chip-remove" type="button" aria-label="Remove moving average" data-ma-editor-action="remove" data-ma-id="' +
      overlay.id +
      '">×</button>' +
      "</div>" +
      '<div class="ma-popover-grid">' +
      buildOverlayFormFields(overlay.id, draft) +
      "</div>" +
      '<div class="ma-popover-actions">' +
      '<button class="ma-popover-button" type="button" data-ma-editor-action="cancel" data-ma-id="' +
      overlay.id +
      '">Cancel</button>' +
      '<button class="ma-popover-button ma-popover-button--primary" type="button" data-ma-editor-action="apply" data-ma-id="' +
      overlay.id +
      '">OK</button>' +
      "</div>"
    );
  }

  function buildMaManagerMarkup() {
    var detailOverlay = state.managerOverlayId ? getOverlayById(state.managerOverlayId) : null;
    var detailDraft = state.managerOverlayId ? ensureOverlayDraft(state.managerOverlayId) : null;

    return (
      '<div class="ma-popover-header">' +
      '<div class="ma-popover-title"><span>Manage moving averages</span></div>' +
      '<button class="ma-chip-remove" type="button" aria-label="Close moving average manager" data-ma-manager-action="close">×</button>' +
      "</div>" +
      '<div class="ma-manager-actions">' +
      '<button class="ma-popover-button ma-popover-button--primary" type="button" data-ma-manager-action="add">+ Add MA</button>' +
      '<button class="ma-popover-button ma-popover-button--danger" type="button" data-ma-manager-action="clear-all">Clear All</button>' +
      "</div>" +
      '<div class="ma-manager-list">' +
      state.overlays
        .map(function buildManagerRow(overlay) {
          var isEditing = state.managerOverlayId === overlay.id;
          return (
            '<div class="ma-manager-row' +
            (isEditing ? " is-active" : "") +
            '">' +
            '<div class="ma-manager-copy">' +
            '<span class="ma-swatch" style="background:' + escapeHtml(overlay.color) + ';"></span>' +
            '<div class="ma-manager-text">' +
            '<span class="ma-manager-title">' + escapeHtml(describeOverlay(overlay)) + "</span>" +
            '<span class="ma-manager-subtitle">' + escapeHtml(describeOverlayForecast(overlay)) + "</span>" +
            "</div>" +
            "</div>" +
            '<div class="ma-manager-row-actions">' +
            '<button class="ma-popover-button" type="button" data-ma-manager-action="edit" data-ma-id="' +
            overlay.id +
            '">' +
            (isEditing ? "Editing" : "Edit") +
            "</button>" +
            '<button class="ma-popover-button" type="button" data-ma-manager-action="remove" data-ma-id="' +
            overlay.id +
            '">Delete</button>' +
            "</div>" +
            "</div>"
          );
        })
        .join("") +
      "</div>" +
      (detailOverlay && detailDraft
        ? '<div class="ma-manager-detail">' +
          '<div class="ma-popover-header ma-popover-header--nested">' +
          '<div class="ma-popover-title">' +
          '<span class="ma-swatch" style="background:' +
          escapeHtml(detailDraft.color) +
          ';"></span>' +
          "<span>" +
          escapeHtml(describeOverlay(detailDraft)) +
          "</span>" +
          "</div>" +
          '<button class="ma-popover-button" type="button" data-ma-manager-action="close-detail">Done</button>' +
          "</div>" +
          '<div class="ma-popover-grid">' +
          buildOverlayFormFields(detailOverlay.id, detailDraft) +
          "</div>" +
          '<div class="ma-popover-actions">' +
          '<button class="ma-popover-button" type="button" data-ma-manager-action="close-detail">Cancel</button>' +
          '<button class="ma-popover-button ma-popover-button--primary" type="button" data-ma-editor-action="apply" data-ma-id="' +
          detailOverlay.id +
          '">OK</button>' +
          "</div>" +
          "</div>"
        : "")
    );
  }

  function buildOverlayFormFields(overlayId, overlayLike) {
    return (
      buildOverlayField(
        overlayId,
        "type",
        "Type",
        '<select data-ma-field="type" data-ma-id="' +
          overlayId +
          '">' +
          buildOptionMarkup("SMA", "SMA", overlayLike.type) +
          buildOptionMarkup("EMA", "EMA", overlayLike.type) +
          "</select>"
      ) +
      buildOverlayField(
        overlayId,
        "length",
        "Length",
        '<input type="number" min="1" step="1" value="' +
          escapeHtml(String(overlayLike.length)) +
          '" data-ma-field="length" data-ma-id="' +
          overlayId +
          '" />'
      ) +
      buildOverlayField(
        overlayId,
        "source",
        "Source",
        '<select data-ma-field="source" data-ma-id="' +
          overlayId +
          '">' +
          buildOptionMarkup("fii", FII_DII_SOURCE_LABELS.fii, overlayLike.source) +
          buildOptionMarkup("dii", FII_DII_SOURCE_LABELS.dii, overlayLike.source) +
          buildOptionMarkup("net", FII_DII_SOURCE_LABELS.net, overlayLike.source) +
          "</select>"
      ) +
      buildOverlayField(
        overlayId,
        "color",
        "Color",
        '<input class="ma-color-input" type="color" value="' +
          escapeHtml(overlayLike.color) +
          '" data-ma-field="color" data-ma-id="' +
          overlayId +
          '" />'
      )
    );
  }

  function buildOverlayField(overlayId, fieldName, label, controlMarkup) {
    return (
      '<label class="control-field" for="ma-' +
      overlayId +
      "-" +
      fieldName +
      '">' +
      '<span class="control-label">' +
      escapeHtml(label) +
      "</span>" +
      controlMarkup.replace(
        /^<(input|select)/,
        '<$1 id="ma-' + overlayId + "-" + fieldName + '"'
      ) +
      "</label>"
    );
  }

  function buildOptionMarkup(value, label, selectedValue) {
    return (
      '<option value="' +
      escapeHtml(value) +
      '"' +
      (value === selectedValue ? " selected" : "") +
      ">" +
      escapeHtml(label) +
      "</option>"
    );
  }

  function describeOverlay(overlay) {
    return overlay.type + " " + overlay.length + " · " + FII_DII_SOURCE_LABELS[overlay.source];
  }

  function describeOverlayWithForecast(overlay) {
    var parts = [describeOverlay(overlay)];
    var forecastSummary = describeOverlayForecast(overlay);

    if (forecastSummary) {
      parts.push(forecastSummary);
    }

    return parts.join(" · ");
  }

  function describeOverlayForecast(overlay) {
    var forecastValues = state.maForecastById[overlay.id] || [];
    var forecastValue = forecastValues[0];
    var forecastValuePlusOne = forecastValues[1];
    var parts = [];

    if (forecastValue != null) {
      parts.push("next: " + formatSignedCrore(forecastValue));
    }

    if (forecastValuePlusOne != null) {
      parts.push("+1: " + formatSignedCrore(forecastValuePlusOne));
    }

    return parts.join(" · ");
  }

  function renderStatus() {
    if (state.loading) {
      statusEl.textContent = "Loading FII / DII yearly data…";
      return;
    }

    if (state.errorMessage) {
      statusEl.textContent = state.errorMessage;
      return;
    }

    if (!state.rawData.length) {
      statusEl.textContent = "No FII / DII data is available.";
      return;
    }

    var filteredCount = state.filteredData.length;
    var rangeLabel = formatMonthRangeLabel(state.fromMonth, state.toMonth);
    var availableLabel = formatMonthRangeLabel(state.minMonth, state.maxMonth);
    var forecastCount = state.overlays.filter(function countForecasts(overlay) {
      var values = state.maForecastById[overlay.id] || [];
      return values[0] != null || values[1] != null;
    }).length;
    statusEl.textContent =
      filteredCount +
      " trading sessions · " +
      rangeLabel +
      " · available " +
      availableLabel +
      " · mode: " +
      (state.mode === "net"
        ? "net flow (" + state.pairedStyle + ")"
        : "paired FII / DII (" + state.pairedStyle + ")") +
      (forecastCount ? " · forecasts: " + forecastCount : "");
  }

  function formatMonthRangeLabel(fromMonth, toMonth) {
    if (!fromMonth || !toMonth) {
      return "Unknown range";
    }

    return formatMonthLabel(fromMonth) + " to " + formatMonthLabel(toMonth);
  }

  function formatMonthLabel(monthKey) {
    var match = String(monthKey || "").match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      return monthKey || "";
    }

    return monthFormatter.format(
      new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1))
    );
  }

  function renderChart() {
    if (!state.chart) {
      showEmptyState(
        "Chart library unavailable",
        "Apache ECharts could not be initialized for this panel."
      );
      chartEl.classList.add("is-hidden");
      return;
    }

    if (state.loading) {
      hideEmptyState();
      chartEl.classList.remove("is-hidden");
      state.chart.clear();
      state.chart.showLoading("default", {
        text: "Loading chart data",
        color: "#d9ad67",
        textColor: "rgba(245, 240, 232, 0.72)",
        maskColor: "rgba(15, 18, 21, 0.38)"
      });
      return;
    }

    state.chart.hideLoading();

    if (state.errorMessage) {
      chartEl.classList.add("is-hidden");
      showEmptyState("FII / DII data unavailable", state.errorMessage);
      state.chart.clear();
      return;
    }

    if (!state.filteredData.length) {
      chartEl.classList.add("is-hidden");
      showEmptyState(
        "No FII / DII data in this range",
        "Choose a wider month window to see available trading sessions."
      );
      state.chart.clear();
      return;
    }

    hideEmptyState();
    chartEl.classList.remove("is-hidden");
    state.chart.setOption(buildChartOption(), true);
    state.chart.resize();
  }

  function showEmptyState(title, copy) {
    if (emptyTitle) {
      emptyTitle.textContent = title;
    }

    if (emptyCopy) {
      emptyCopy.textContent = copy;
    }

    emptyState.hidden = false;
  }

  function hideEmptyState() {
    emptyState.hidden = true;
  }

  function refreshMovingAverageAnalysis() {
    var analysis = buildMovingAverageAnalysis(state.rawData, state.filteredData, state.overlays);
    state.maSeriesById = analysis.seriesById;
    state.maForecastById = analysis.forecastById;
  }

  function buildPaddedAxisRange(values, minimumPaddingRatio, minimumPaddingValue) {
    var finiteValues = (values || []).filter(function filterFiniteValue(value) {
      return Number.isFinite(value);
    });
    var minValue;
    var maxValue;
    var span;
    var padding;
    var niceStep;

    if (!finiteValues.length) {
      return null;
    }

    minValue = Math.min.apply(null, finiteValues);
    maxValue = Math.max.apply(null, finiteValues);
    span = maxValue - minValue;

    if (span === 0) {
      span = Math.max(Math.abs(minValue) * 0.02, minimumPaddingValue || 100);
    }

    padding = Math.max(span * (minimumPaddingRatio || 0.12), minimumPaddingValue || 100);
    niceStep = getNiceAxisStep((span + padding * 2) / 6);

    return {
      min: Math.floor((minValue - padding) / niceStep) * niceStep,
      max: Math.ceil((maxValue + padding) / niceStep) * niceStep
    };
  }

  function getNiceAxisStep(roughStep) {
    var safeStep = Math.max(roughStep || 1, 1);
    var magnitude = Math.pow(10, Math.floor(Math.log10(safeStep)));
    var normalized = safeStep / magnitude;

    if (normalized <= 1) {
      return magnitude;
    }

    if (normalized <= 2) {
      return 2 * magnitude;
    }

    if (normalized <= 5) {
      return 5 * magnitude;
    }

    return 10 * magnitude;
  }

  function buildMovingAverageAnalysis(allRecords, visibleRecords, overlays) {
    var seriesById = {};
    var forecastById = {};

    (overlays || []).forEach(function eachOverlay(overlay) {
      var sourceKey = overlay.source === "fii"
        ? "fiiNet"
        : overlay.source === "dii"
          ? "diiNet"
          : "net";
      var window = buildOverlayComputationWindow(allRecords, visibleRecords, overlay.length);
      var sourceValues = window.records.map(function mapSourceValue(record) {
        return record[sourceKey];
      });
      var series =
        overlay.type === "EMA"
          ? computeEma(sourceValues, overlay.length)
          : computeSma(sourceValues, overlay.length);
      seriesById[overlay.id] = series.slice(window.visibleOffset);
      forecastById[overlay.id] = computeForecastSteps(sourceValues, overlay, series);
    });

    return {
      seriesById: seriesById,
      forecastById: forecastById
    };
  }

  function buildOverlayComputationWindow(allRecords, visibleRecords, length) {
    var visibleStartIndex;
    var visibleEndIndex;
    var lookbackStartIndex;

    if (!visibleRecords.length) {
      return {
        records: [],
        visibleOffset: 0
      };
    }

    visibleStartIndex = findRecordIndexByDate(allRecords, visibleRecords[0].isoDate);
    visibleEndIndex = findRecordIndexByDate(
      allRecords,
      visibleRecords[visibleRecords.length - 1].isoDate
    );

    if (visibleStartIndex === -1 || visibleEndIndex === -1) {
      return {
        records: visibleRecords.slice(),
        visibleOffset: 0
      };
    }

    lookbackStartIndex = Math.max(0, visibleStartIndex - Math.max(1, length));

    return {
      records: allRecords.slice(lookbackStartIndex, visibleEndIndex + 1),
      visibleOffset: visibleStartIndex - lookbackStartIndex
    };
  }

  function findRecordIndexByDate(records, isoDate) {
    var index;

    for (index = 0; index < records.length; index += 1) {
      if (records[index].isoDate === isoDate) {
        return index;
      }
    }

    return -1;
  }

  function getLastDefinedValue(values) {
    var index;

    for (index = values.length - 1; index >= 0; index -= 1) {
      if (values[index] != null && Number.isFinite(values[index])) {
        return values[index];
      }
    }

    return null;
  }

  function computeForecastSteps(sourceValues, overlay, series) {
    var lastDefined;
    var lastActual;
    var multiplier;
    var history;
    var stepOne;
    var stepTwo;

    if (!sourceValues.length) {
      return [];
    }

    if (overlay.type === "EMA") {
      lastDefined = getLastDefinedValue(series);
      if (lastDefined == null) {
        return [];
      }

      lastActual = sourceValues[sourceValues.length - 1];
      multiplier = 2 / (overlay.length + 1);
      stepOne = roundToTwo(lastDefined);
      stepTwo = roundToTwo(multiplier * lastActual + (1 - multiplier) * stepOne);
      return [stepOne, stepTwo];
    }

    if (sourceValues.length < overlay.length) {
      return [];
    }

    history = sourceValues.slice();
    stepOne = roundToTwo(computeTailAverage(history, overlay.length));
    history.push(stepOne);
    stepTwo = roundToTwo(computeTailAverage(history, overlay.length));
    return [stepOne, stepTwo];
  }

  function computeTailAverage(values, length) {
    var startIndex = values.length - length;
    var sum = 0;
    var index;

    for (index = startIndex; index < values.length; index += 1) {
      sum += values[index];
    }

    return sum / length;
  }

  function computeSma(values, length) {
    var output = new Array(values.length);
    var windowSum = 0;

    values.forEach(function eachValue(value, index) {
      windowSum += value;

      if (index >= length) {
        windowSum -= values[index - length];
      }

      output[index] = index >= length - 1 ? windowSum / length : null;
    });

    return output;
  }

  function computeEma(values, length) {
    var output = new Array(values.length);
    var multiplier = 2 / (length + 1);
    var running = null;
    var initialWindowSum = 0;

    values.forEach(function eachValue(value, index) {
      if (index < length - 1) {
        initialWindowSum += value;
        output[index] = null;
        return;
      }

      if (index === length - 1) {
        initialWindowSum += value;
        running = initialWindowSum / length;
        output[index] = running;
        return;
      }

      running = value * multiplier + running * (1 - multiplier);
      output[index] = running;
    });

    return output;
  }

  function buildChartOption() {
    var hasForecasts = hasVisibleForecasts();
    var forecastBarSpec = getForecastBarSpec();
    var niftyAxisRange = buildPaddedAxisRange(
      state.filteredData.map(function mapNiftyRange(record) {
        return record.niftyClose;
      }),
      0.14,
      120
    );
    var categories = state.filteredData.map(function mapCategory(record) {
      return record.isoDate;
    });
    if (hasForecasts) {
      categories.push(FII_DII_FORECAST_LABEL);
      categories.push(FII_DII_FORECAST_LABEL_PLUS_ONE);
    }
    var legendData = [];
    var series = [];
    var shouldShowZoom = state.filteredData.length > 35;

    if (state.mode === "net") {
      legendData.push("Net");
      if (state.pairedStyle === "line") {
        series.push(buildNetLineSeries(hasForecasts));
      } else {
        series.push({
          name: "Net",
          type: "bar",
          yAxisIndex: 0,
          data: buildHistoricalBarData("net", hasForecasts, forecastBarSpec),
          barMaxWidth: 20,
          itemStyle: {
            borderRadius: 6,
            color: function netBarColor(params) {
              return params.value >= 0 ? NET_POSITIVE_COLOR : NET_NEGATIVE_COLOR;
            }
          }
        });
      }
    } else {
      legendData.push("FII", "DII");
      if (state.pairedStyle === "line") {
        series.push(
          buildPairedLineSeries("FII", "fii", FII_BAR_COLOR, hasForecasts),
          buildPairedLineSeries("DII", "dii", DII_BAR_COLOR, hasForecasts)
        );
      } else {
        series.push(
          {
            name: "FII",
            type: "bar",
            yAxisIndex: 0,
            data: buildHistoricalBarData("fii", hasForecasts, forecastBarSpec),
            barMaxWidth: 16,
            itemStyle: {
              color: FII_BAR_COLOR,
              borderRadius: 6
            }
          },
          {
            name: "DII",
            type: "bar",
            yAxisIndex: 0,
            data: buildHistoricalBarData("dii", hasForecasts, forecastBarSpec),
            barMaxWidth: 16,
            itemStyle: {
              color: DII_BAR_COLOR,
              borderRadius: 6
            }
          }
        );
      }
    }

    state.overlays.forEach(function addOverlaySeries(overlay) {
      var overlaySeries = state.maSeriesById[overlay.id] || [];
      var forecastValues = state.maForecastById[overlay.id] || [];
      legendData.push(describeOverlay(overlay));
      series.push({
        name: describeOverlay(overlay),
        type: "line",
        yAxisIndex: 0,
        data: appendForecastGap(overlaySeries, hasForecasts),
        symbol: "none",
        connectNulls: false,
        smooth: false,
        lineStyle: {
          width: 2,
          color: overlay.color
        },
        itemStyle: {
          color: overlay.color
        },
        emphasis: {
          focus: "series"
        }
      });

      if (hasForecasts && (forecastValues[0] != null || forecastValues[1] != null)) {
        series.push({
          name: "Forecast · " + describeOverlay(overlay),
          type: "line",
          yAxisIndex: 0,
          data: buildForecastLineData(overlaySeries, forecastValues, categories.length),
          symbol: "circle",
          showSymbol: true,
          symbolSize: function forecastSymbolSize(value, params) {
            return params.dataIndex >= state.filteredData.length ? 12 : 0;
          },
          connectNulls: false,
          lineStyle: {
            width: 2,
            type: "dashed",
            color: getForecastLineColor(overlay)
          },
          itemStyle: {
            color: getForecastFillColor(overlay),
            borderColor: overlay.color,
            borderWidth: 2
          },
          z: 7,
          emphasis: {
            focus: "series"
          }
        });
      }
    });

    if (forecastBarSpec && shouldUseStandaloneForecastSeries(forecastBarSpec)) {
      legendData.push(forecastBarSpec.label);
      series.push({
        name: forecastBarSpec.label,
        type: "bar",
        yAxisIndex: 0,
        data: buildStandaloneForecastBarData(categories.length, forecastBarSpec),
        barMaxWidth: 18,
        itemStyle: {
          color: forecastBarSpec.fillColor,
          borderRadius: 6,
          borderColor: forecastBarSpec.lineColor,
          borderWidth: 1.5
        },
        z: 5
      });
    }

    legendData.push("NIFTY 50");
    series.push({
      name: "NIFTY 50",
      type: "line",
      yAxisIndex: 1,
      data: appendForecastGap(state.filteredData.map(function mapNifty(record) {
        return record.niftyClose;
      }), hasForecasts),
      smooth: 0.18,
      symbol: state.filteredData.length <= 70 ? "circle" : "none",
      symbolSize: 7,
      lineStyle: {
        width: 2,
        color: NIFTY_LINE_COLOR
      },
      itemStyle: {
        color: "#15181b",
        borderColor: NIFTY_LINE_COLOR,
        borderWidth: 2
      }
    });

    return {
      backgroundColor: "transparent",
      animationDuration: 280,
      grid: {
        left: 34,
        right: 38,
        top: 74,
        bottom: shouldShowZoom ? 94 : 46,
        containLabel: true
      },
      legend: {
        type: "scroll",
        top: 14,
        left: 16,
        right: 16,
        itemWidth: 12,
        itemHeight: 12,
        textStyle: {
          color: "rgba(245, 240, 232, 0.76)"
        },
        pageIconColor: "#d9ad67",
        pageTextStyle: {
          color: "rgba(245, 240, 232, 0.62)"
        },
        data: legendData
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          crossStyle: {
            color: "rgba(245, 240, 232, 0.22)"
          },
          label: {
            backgroundColor: "rgba(21, 24, 27, 0.96)",
            color: "#f5f0e8"
          }
        },
        backgroundColor: "rgba(21, 24, 27, 0.96)",
        borderColor: "rgba(232, 224, 210, 0.14)",
        borderWidth: 1,
        padding: 12,
        textStyle: {
          color: "#f5f0e8"
        },
        extraCssText:
          "border-radius: 14px; box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28);",
        formatter: buildTooltipMarkup
      },
      dataZoom: shouldShowZoom
        ? [
            {
              type: "inside",
              xAxisIndex: 0,
              filterMode: "none"
            },
            {
              type: "slider",
              xAxisIndex: 0,
              filterMode: "none",
              height: 24,
              bottom: 24,
              borderColor: "rgba(232, 224, 210, 0.08)",
              backgroundColor: "rgba(255, 255, 255, 0.035)",
              fillerColor: "rgba(157, 126, 255, 0.2)",
              dataBackground: {
                lineStyle: {
                  color: "rgba(232, 224, 210, 0.28)"
                },
                areaStyle: {
                  color: "rgba(255, 255, 255, 0.06)"
                }
              },
              handleStyle: {
                color: "#d9ad67",
                borderColor: "#d9ad67"
              },
              textStyle: {
                color: "rgba(245, 240, 232, 0.58)"
              }
            }
          ]
        : [],
      xAxis: [
        {
          type: "category",
          data: categories,
          boundaryGap: true,
          axisTick: {
            alignWithLabel: true,
            lineStyle: {
              color: "rgba(232, 224, 210, 0.18)"
            }
          },
          axisLine: {
            lineStyle: {
              color: "rgba(232, 224, 210, 0.22)"
            }
          },
          axisLabel: {
            hideOverlap: true,
            color: "rgba(245, 240, 232, 0.62)",
            formatter: function formatAxisDate(value) {
              return formatShortDate(value);
            }
          }
        }
      ],
      yAxis: [
        {
          type: "value",
          name: "Amount (Cr.)",
          nameLocation: "middle",
          nameRotate: 90,
          nameGap: 46,
          nameTextStyle: {
            color: "rgba(245, 240, 232, 0.62)",
            align: "center",
            verticalAlign: "middle"
          },
          axisLabel: {
            color: "rgba(245, 240, 232, 0.62)",
            formatter: function formatAmountAxisLabel(value) {
              return value === 0 ? "0" : compactFormatter.format(value);
            }
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: "rgba(232, 224, 210, 0.2)"
            }
          },
          splitLine: {
            lineStyle: {
              color: "rgba(232, 224, 210, 0.08)"
            }
          }
        },
        {
          type: "value",
          name: "NIFTY 50",
          position: "right",
          nameLocation: "middle",
          nameRotate: -90,
          nameGap: 40,
          min: niftyAxisRange ? niftyAxisRange.min : null,
          max: niftyAxisRange ? niftyAxisRange.max : null,
          scale: true,
          nameTextStyle: {
            color: "rgba(245, 240, 232, 0.62)",
            align: "center",
            verticalAlign: "middle",
            padding: [0, 0, 0, 4]
          },
          axisLabel: {
            color: "rgba(245, 240, 232, 0.62)",
            formatter: function formatNiftyAxisLabel(value) {
              return compactFormatter.format(value);
            }
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: "rgba(232, 224, 210, 0.2)"
            }
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: series
    };
  }

  function buildTooltipMarkup(params) {
    if (!params || !params.length) {
      return "";
    }

    var dataIndex = params[0].dataIndex;
    var record = state.filteredData[dataIndex];
    var isForecastCategory = dataIndex >= state.filteredData.length;

    if (isForecastCategory) {
      return buildForecastTooltipMarkup(dataIndex - state.filteredData.length);
    }

    var sections = [
      '<div style="font-size:13px;font-weight:600;margin-bottom:8px;">' +
        escapeHtml(formatLongDate(record.isoDate)) +
        "</div>",
      buildTooltipRow("FII", FII_BAR_COLOR, formatSignedCrore(record.fiiNet)),
      buildTooltipRow("DII", DII_BAR_COLOR, formatSignedCrore(record.diiNet)),
      buildTooltipRow(
        "Net",
        record.net >= 0 ? NET_POSITIVE_COLOR : NET_NEGATIVE_COLOR,
        formatSignedCrore(record.net)
      ),
      buildTooltipRow("NIFTY 50", NIFTY_LINE_COLOR, niftyFormatter.format(record.niftyClose))
    ];

    state.overlays.forEach(function appendOverlayRow(overlay) {
      var values = state.maSeriesById[overlay.id] || [];
      var value = values[dataIndex];
      sections.push(
        buildTooltipRow(
          describeOverlay(overlay),
          overlay.color,
          value == null ? "n/a" : formatSignedCrore(value)
        )
      );
    });

    return sections.join("");
  }

  function buildForecastTooltipMarkup(forecastIndex) {
    var sections = [
      '<div style="font-size:13px;font-weight:600;margin-bottom:8px;">' +
        escapeHtml(
          forecastIndex === 0
            ? FII_DII_FORECAST_LABEL
            : FII_DII_FORECAST_LABEL_PLUS_ONE
        ) +
        "</div>"
    ];
    var forecastBarSpec = getForecastBarSpec();

    if (forecastBarSpec && forecastBarSpec.values[forecastIndex] != null) {
      sections.push(
        buildTooltipRow(
          forecastBarSpec.labelForIndex(forecastIndex),
          forecastBarSpec.lineColor,
          formatSignedCrore(forecastBarSpec.values[forecastIndex])
        )
      );
    }

    state.overlays.forEach(function appendForecastRow(overlay) {
      var forecastValues = state.maForecastById[overlay.id] || [];
      var forecastValue = forecastValues[forecastIndex];
      if (forecastValue == null) {
        return;
      }

      sections.push(
        buildTooltipRow(
          "Forecast · " + describeOverlay(overlay),
          getForecastLineColor(overlay),
          formatSignedCrore(forecastValue)
        )
      );
    });

    if (sections.length === 1) {
      sections.push(
        '<div style="font-size:12px;line-height:1.45;color:rgba(245, 240, 232, 0.72);">No forecast is available for the current overlays.</div>'
      );
    }

    return sections.join("");
  }

  function buildTooltipRow(label, color, value) {
    return (
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;font-size:12px;line-height:1.45;">' +
      '<span style="display:inline-flex;align-items:center;gap:8px;color:rgba(245, 240, 232, 0.78);">' +
      '<span style="width:10px;height:10px;border-radius:999px;background:' +
      escapeHtml(color) +
      ';display:inline-block;"></span>' +
      escapeHtml(label) +
      "</span>" +
      '<strong style="font-weight:600;color:#f5f0e8;">' +
      escapeHtml(value) +
      "</strong>" +
      "</div>"
    );
  }

  function formatSignedCrore(value) {
    var sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return sign + amountFormatter.format(Math.abs(value)) + " Cr";
  }

  function hasVisibleForecasts() {
    return state.overlays.some(function hasForecast(overlay) {
      var values = state.maForecastById[overlay.id] || [];
      return values[0] != null || values[1] != null;
    });
  }

  function appendForecastGap(values, hasForecasts) {
    return hasForecasts ? values.concat([null, null]) : values.slice();
  }

  function buildHistoricalBarData(source, hasForecasts, forecastBarSpec) {
    var values = state.filteredData.map(function mapValue(record) {
      return record[source === "fii" ? "fiiNet" : source === "dii" ? "diiNet" : "net"];
    });

    if (!hasForecasts) {
      return values;
    }

    if (forecastBarSpec && forecastBarSpec.source === source && forecastBarSpec.inline) {
      values.push(buildForecastBarDatum(forecastBarSpec, 0));
      values.push(buildForecastBarDatum(forecastBarSpec, 1));
      return values;
    }

    values.push(null, null);
    return values;
  }

  function buildHistoricalLineData(source, hasForecasts) {
    var values = state.filteredData.map(function mapValue(record) {
      return record[source === "fii" ? "fiiNet" : source === "dii" ? "diiNet" : "net"];
    });

    return appendForecastGap(values, hasForecasts);
  }

  function buildPairedLineSeries(label, source, color, hasForecasts) {
    return {
      name: label,
      type: "line",
      yAxisIndex: 0,
      data: buildHistoricalLineData(source, hasForecasts),
      smooth: 0.14,
      connectNulls: false,
      symbol: state.filteredData.length <= 70 ? "circle" : "none",
      symbolSize: 5,
      lineStyle: {
        width: 2,
        color: color
      },
      itemStyle: {
        color: "#15181b",
        borderColor: color,
        borderWidth: 2
      },
      emphasis: {
        focus: "series"
      }
    };
  }

  function buildNetLineSeries(hasForecasts) {
    return {
      name: "Net",
      type: "line",
      yAxisIndex: 0,
      data: buildHistoricalLineData("net", hasForecasts),
      smooth: 0.14,
      connectNulls: false,
      symbol: state.filteredData.length <= 70 ? "circle" : "none",
      symbolSize: 5,
      lineStyle: {
        width: 2,
        color: NET_POSITIVE_COLOR
      },
      itemStyle: {
        color: "#15181b",
        borderColor: NET_POSITIVE_COLOR,
        borderWidth: 2
      },
      emphasis: {
        focus: "series"
      }
    };
  }

  function buildStandaloneForecastBarData(totalLength, forecastBarSpec) {
    var values = new Array(totalLength).fill(null);
    values[totalLength - 2] = buildForecastBarDatum(forecastBarSpec, 0);
    values[totalLength - 1] = buildForecastBarDatum(forecastBarSpec, 1);
    return values;
  }

  function buildForecastBarDatum(forecastBarSpec, forecastIndex) {
    var value;
    var barColors;

    if (!forecastBarSpec || forecastBarSpec.values[forecastIndex] == null) {
      return null;
    }

    value = forecastBarSpec.values[forecastIndex];
    barColors = getForecastBarColors(forecastBarSpec, value);

    return {
      value: value,
      itemStyle: {
        color: barColors.fillColor,
        borderColor: barColors.lineColor,
        borderWidth: 1.5,
        borderType: "dashed",
        borderRadius: 6
      }
    };
  }

  function getForecastBarColors(forecastBarSpec, value) {
    if (forecastBarSpec && forecastBarSpec.source === "net") {
      return value >= 0
        ? {
            fillColor: NET_FORECAST_POSITIVE_COLOR,
            lineColor: NET_FORECAST_POSITIVE_COLOR
          }
        : {
            fillColor: NET_FORECAST_NEGATIVE_COLOR,
            lineColor: NET_FORECAST_NEGATIVE_COLOR
          };
    }

    return {
      fillColor: forecastBarSpec.fillColor,
      lineColor: forecastBarSpec.lineColor
    };
  }

  function buildForecastLineData(actualSeries, forecastValues, totalLength) {
    var output = new Array(totalLength).fill(null);
    var lastActualIndex = actualSeries.length - 1;

    output[lastActualIndex] = actualSeries[lastActualIndex];
    if (forecastValues[0] != null) {
      output[totalLength - 2] = forecastValues[0];
    }
    if (forecastValues[1] != null) {
      output[totalLength - 1] = forecastValues[1];
    }
    return output;
  }

  function getForecastFillColor(overlay) {
    return FII_DII_FORECAST_SOURCE_FILLS[overlay.source] || overlay.color;
  }

  function getForecastLineColor(overlay) {
    return overlay.color;
  }

  function getForecastBarSpec() {
    var overlay = getPrimaryForecastOverlay();
    var forecastValues;

    if (!overlay) {
      return null;
    }

    forecastValues = state.maForecastById[overlay.id] || [];
    if (forecastValues[0] == null && forecastValues[1] == null) {
      return null;
    }

    return {
      overlayId: overlay.id,
      source: overlay.source,
      values: forecastValues,
      label: "Forecast " + FII_DII_SOURCE_LABELS[overlay.source],
      labelForIndex: function labelForIndex(forecastIndex) {
        return (
          "Forecast " +
          FII_DII_SOURCE_LABELS[overlay.source] +
          (forecastIndex === 0 ? "" : " + 1")
        );
      },
      fillColor: getForecastFillColor(overlay),
      lineColor: getForecastLineColor(overlay),
      inline:
        (state.mode === "paired" && (overlay.source === "fii" || overlay.source === "dii")) ||
        (state.mode === "net" && overlay.source === "net")
    };
  }

  function getPrimaryForecastOverlay() {
    var index;
    var overlay;

    for (index = state.overlays.length - 1; index >= 0; index -= 1) {
      overlay = state.overlays[index];
      if ((state.maForecastById[overlay.id] || []).length) {
        return overlay;
      }
    }

    return null;
  }

  function shouldUseStandaloneForecastSeries(forecastBarSpec) {
    return !!forecastBarSpec && !forecastBarSpec.inline;
  }

  function formatShortDate(isoDate) {
    var date = createUtcDate(isoDate);
    return date ? shortDateFormatter.format(date) : isoDate;
  }

  function formatLongDate(isoDate) {
    var date = createUtcDate(isoDate);
    return date ? longDateFormatter.format(date) : isoDate;
  }

  function createUtcDate(isoDate) {
    var match = String(isoDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return null;
    }

    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
