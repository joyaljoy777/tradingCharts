const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const chartsDir = path.join(ROOT, "charts");
const schemaPath = path.join(ROOT, "schemas", "eventsAndNewsSchema.json");
const outputPath = path.join(ROOT, "event-data.js");
const fileToKind = {
  "pastEventsAndNews.json": "past",
  "futureEventsAndNews.json": "future",
  "holiday.json": "holiday"
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function walk(dirPath, visit) {
  fs.readdirSync(dirPath, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, visit);
      return;
    }

    visit(fullPath);
  });
}

const payload = {
  schemaProperties: readJson(schemaPath).items.properties,
  resources: {}
};

if (fs.existsSync(chartsDir)) {
  walk(chartsDir, (fullPath) => {
    const basename = path.basename(fullPath);
    const kind = fileToKind[basename];
    if (!kind) {
      return;
    }

    const relativePath = path.relative(chartsDir, fullPath).split(path.sep);
    const symbol = relativePath[0];
    if (!symbol) {
      return;
    }

    payload.resources[symbol] = payload.resources[symbol] || {
      root: {},
      years: {}
    };

    if (relativePath.length === 2) {
      payload.resources[symbol].root[kind] = readJson(fullPath);
      return;
    }

    if (relativePath.length !== 3) {
      return;
    }

    const year = relativePath[1];
    if (!year) {
      return;
    }

    payload.resources[symbol].years[year] = payload.resources[symbol].years[year] || {};
    payload.resources[symbol].years[year][kind] = readJson(fullPath);
  });
}

fs.writeFileSync(
  outputPath,
  "window.TRADING_CHART_EMBEDDED_DATA = " + JSON.stringify(payload, null, 2) + ";\n"
);
