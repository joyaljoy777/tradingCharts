"use strict";

var IMAGE_PATTERN = /\.(png|jpe?g)$/i;
var DEFAULT_SYMBOLS = ["NIFTY50", "BANKNIFTY"];

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
  var isoMatch = basename.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return validateDateParts(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3])
    );
  }

  var dayFirstMatch = basename.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dayFirstMatch) {
    return validateDateParts(
      Number(dayFirstMatch[3]),
      Number(dayFirstMatch[2]),
      Number(dayFirstMatch[1])
    );
  }

  return null;
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

    var existing = imageBuckets[asset.symbol][asset.monthKey][asset.isoDate];
    if (!existing || asset.rawPath.localeCompare(existing.rawPath) < 0) {
      imageBuckets[asset.symbol][asset.monthKey][asset.isoDate] = asset;
    }
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
          var item = monthMap[monthKey][isoDate];
          dayMap[pad(item.day)] = {
            src: item.src,
            isoDate: item.isoDate,
            day: item.day,
            ext: item.ext
          };
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

(function tradingChartCalendar() {
  var chartIndex = buildChartIndex([], DEFAULT_SYMBOLS);

  var monthFormatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });

  var symbolSelect = document.getElementById("symbolSelect");
  var monthPicker = document.getElementById("monthPicker");
  var prevMonthBtn = document.getElementById("prevMonthBtn");
  var nextMonthBtn = document.getElementById("nextMonthBtn");
  var calendarGrid = document.getElementById("calendarGrid");
  var monthStatus = document.getElementById("monthStatus");
  var emptyState = document.getElementById("emptyState");
  var lightbox = document.getElementById("lightbox");
  var lightboxBody = document.getElementById("lightboxBody");
  var lightboxMeta = document.getElementById("lightboxMeta");

  var state = {
    symbol: "NIFTY50",
    yearMonth: null,
    activeMonthEntries: {},
    liveThumbs: new Set(),
    modalImage: null,
    renderToken: 0,
    probing: {},
    probed: {}
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

  function getMonthsForSymbol(symbol) {
    return (chartIndex.monthsBySymbol[symbol] || []).slice();
  }

  function getAllSymbols() {
    return chartIndex.symbols.slice();
  }

  function getEntriesForMonth(symbol, yearMonth) {
    return (chartIndex.images[symbol] && chartIndex.images[symbol][yearMonth]) || {};
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
    chartIndex.images[symbol] = chartIndex.images[symbol] || {};
    chartIndex.images[symbol][yearMonth] = entries;
    chartIndex.monthsBySymbol[symbol] = chartIndex.monthsBySymbol[symbol] || [];

    if (Object.keys(entries).length && chartIndex.monthsBySymbol[symbol].indexOf(yearMonth) === -1) {
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

    lightboxBody.replaceChildren();
    lightboxMeta.textContent = "";
    lightbox.hidden = true;
    document.body.style.overflow = "";
  }

  function renderLightboxError(message) {
    lightboxBody.replaceChildren();

    var error = document.createElement("p");
    error.className = "lightbox-message";
    error.textContent = message;
    lightboxBody.appendChild(error);
  }

  function openLightbox(src, label) {
    closeLightbox();

    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightboxMeta.textContent = label;

    var image = document.createElement("img");
    image.className = "lightbox-image";
    image.alt = label;
    image.decoding = "async";
    image.onerror = function onError() {
      if (state.modalImage !== image) {
        return;
      }

      image.onload = null;
      image.onerror = null;
      image.removeAttribute("src");
      image.remove();
      state.modalImage = null;
      renderLightboxError("Unable to load this screenshot.");
    };

    state.modalImage = image;
    lightboxBody.replaceChildren(image);
    image.src = src;
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
        tasks.push(
          probeFirstAvailable(buildPathCandidates(symbol, yearMonth, day)).then(function onFound(src) {
            if (!src) {
              return;
            }

            results[pad(day)] = {
              src: src,
              isoDate: yearMonth + "-" + pad(day),
              day: day
            };
          })
        );
      }

      for (var day = 1; day <= totalDays; day += 1) {
        scheduleDay(day);
      }

      await Promise.all(tasks);
      state.probed[probeKey] = true;
      markMonthCached(symbol, yearMonth, results);

      if (
        state.renderToken === renderToken &&
        state.symbol === symbol &&
        state.yearMonth === yearMonth
      ) {
        renderCalendar();
      }
    } finally {
      delete state.probing[probeKey];
    }
  }

  function createThumbnail(cell, entry, symbol, renderToken) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "thumb-button";
    button.dataset.fullsrc = entry.src;
    button.dataset.label = symbol + " · " + entry.isoDate;
    button.setAttribute("aria-label", "Open chart for " + entry.isoDate);

    var skeleton = document.createElement("span");
    skeleton.className = "thumb-skeleton";

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

  function renderCalendar() {
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

    calendarGrid.style.gridTemplateRows = "repeat(" + weekCount + ", minmax(0, 1fr))";

    cells.forEach(function renderCell(model) {
      var cell = document.createElement("article");
      cell.className = "day-card";

      if (!model.isCurrentMonth) {
        cell.classList.add("is-outside");
        fragment.appendChild(cell);
        return;
      }

      var dayNumber = document.createElement("span");
      dayNumber.className = "day-number";
      dayNumber.textContent = String(model.dayNumber);
      cell.appendChild(dayNumber);

      var entry = entries[model.dayKey];
      if (entry) {
        cell.classList.add("has-chart");
        hasCharts = true;
        createThumbnail(cell, entry, symbol, renderToken);
      }

      fragment.appendChild(cell);
    });

    calendarGrid.appendChild(fragment);
    updateEmptyState(hasCharts);

    if (!state.probed[getProbeKey(symbol, yearMonth)]) {
      discoverMonthEntries(symbol, yearMonth, renderToken);
    }
  }

  function syncControls() {
    symbolSelect.value = state.symbol;
    monthPicker.value = state.yearMonth;
  }

  function setState(nextSymbol, nextYearMonth) {
    state.symbol = nextSymbol;
    state.yearMonth = nextYearMonth;
    syncControls();
    renderCalendar();
  }

  function populateSymbolSelect() {
    var fragment = document.createDocumentFragment();

    getAllSymbols().forEach(function addOption(symbol) {
      var option = document.createElement("option");
      option.value = symbol;
      option.textContent = symbol;
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
        chartIndex.images[symbol][monthKey] = nextChartIndex.images[symbol][monthKey];
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

  async function loadChartIndex() {
    if (window.location.protocol === "file:") {
      return null;
    }

    var response = await fetch("chart-index.json?ts=" + Date.now(), {
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    var payload = await response.json();
    return buildChartIndex(payload.entries || [], DEFAULT_SYMBOLS);
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

  calendarGrid.addEventListener("click", function onGridClick(event) {
    var trigger = event.target.closest("[data-fullsrc]");
    if (!trigger || !calendarGrid.contains(trigger)) {
      return;
    }

    openLightbox(trigger.dataset.fullsrc, trigger.dataset.label || "Chart screenshot");
  });

  lightbox.addEventListener("click", function onLightboxClick(event) {
    var closeTrigger = event.target.closest("[data-close-modal]");
    if (closeTrigger) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", function onKeyDown(event) {
    if (event.key === "Escape" && !lightbox.hidden) {
      closeLightbox();
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
})();
