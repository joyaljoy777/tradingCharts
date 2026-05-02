const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const dataDir = path.join(ROOT, "charts", "FII_DII");
const outputPath = path.join(ROOT, "fii-dii-data.js");

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRow(row) {
  const isoDate = String(row.created_at || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return null;
  }

  const fiiNet = toFiniteNumber(row.fii_net_value);
  const diiNet = toFiniteNumber(row.dii_net_value);
  const niftyClose = toFiniteNumber(row.last_trade_price);

  return {
    isoDate,
    monthKey: isoDate.slice(0, 7),
    fiiNet,
    diiNet,
    net: Math.round((fiiNet + diiNet) * 100) / 100,
    niftyClose
  };
}

const files = fs
  .readdirSync(dataDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

const recordsByDate = {};

files.forEach((file) => {
  const fullPath = path.join(dataDir, file);
  const payload = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  const rows =
    payload &&
    payload.resultData &&
    Array.isArray(payload.resultData.fii_dii_data)
      ? payload.resultData.fii_dii_data
      : [];

  rows.forEach((row) => {
    const normalized = normalizeRow(row);
    if (normalized) {
      recordsByDate[normalized.isoDate] = normalized;
    }
  });
});

const records = Object.keys(recordsByDate)
  .sort()
  .map((key) => recordsByDate[key]);

const payload = {
  generatedAt: new Date().toISOString(),
  files,
  records
};

fs.writeFileSync(
  outputPath,
  "window.TRADING_CHART_FII_DII_DATA = " + JSON.stringify(payload, null, 2) + ";\n"
);
