const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const chartsDir = path.join(rootDir, "charts");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};
const chartImagePattern = /\.(png|jpe?g)$/i;

function send(res, statusCode, headers, body) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function getSafePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, `http://${host}:${port}`).pathname);
  const normalizedPath = pathname === "/" ? "/index.html" : pathname;
  const fullPath = path.normalize(path.join(rootDir, normalizedPath));

  if (!fullPath.startsWith(rootDir + path.sep) && fullPath !== rootDir) {
    return null;
  }

  return fullPath;
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function collectChartEntries(dirPath, entries) {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  items.forEach((item) => {
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      collectChartEntries(fullPath, entries);
      return;
    }

    const relativePath = toPosixPath(path.relative(rootDir, fullPath));
    if (!relativePath.startsWith("charts/") || !chartImagePattern.test(relativePath)) {
      return;
    }

    entries.push({
      path: relativePath,
      url: `/${relativePath}`
    });
  });
}

function buildChartIndexPayload() {
  const entries = [];

  if (fs.existsSync(chartsDir)) {
    collectChartEntries(chartsDir, entries);
  }

  entries.sort((left, right) => left.path.localeCompare(right.path, undefined, { numeric: true }));

  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      entries
    },
    null,
    2
  );
}

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url || "/", `http://${host}:${port}`).pathname);
  if (pathname === "/chart-index.json") {
    send(
      res,
      200,
      {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        "Access-Control-Allow-Origin": "*"
      },
      buildChartIndexPayload()
    );
    return;
  }

  const fullPath = getSafePath(req.url || "/");
  if (!fullPath) {
    send(res, 403, { "Content-Type": "text/plain; charset=utf-8" }, "Forbidden");
    return;
  }

  fs.stat(fullPath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found");
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";
    const stream = fs.createReadStream(fullPath);

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store, max-age=0",
      "Access-Control-Allow-Origin": "*"
    });

    stream.on("error", () => {
      if (!res.headersSent) {
        send(res, 500, { "Content-Type": "text/plain; charset=utf-8" }, "Server error");
      } else {
        res.destroy();
      }
    });

    stream.pipe(res);
  });
});

server.listen(port, host, () => {
  process.stdout.write(`Trading Charts local server: http://${host}:${port}\n`);
});
