const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const chartsDir = path.join(ROOT, "charts");
const outputPath = path.join(ROOT, "chart-index.json");
const chartImagePattern = /\.(png|jpe?g)$/i;

function toPosixPath(value) {
  return value.split(path.sep).join("/");
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

const entries = [];

if (fs.existsSync(chartsDir)) {
  walk(chartsDir, (fullPath) => {
    const relativePath = toPosixPath(path.relative(ROOT, fullPath));
    if (!relativePath.startsWith("charts/") || !chartImagePattern.test(relativePath)) {
      return;
    }

    entries.push({
      path: relativePath,
      url: "./" + relativePath
    });
  });
}

entries.sort((left, right) =>
  left.path.localeCompare(right.path, undefined, { numeric: true, sensitivity: "base" })
);

const payload = {
  generatedAt: new Date().toISOString(),
  entries
};

fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + "\n");
