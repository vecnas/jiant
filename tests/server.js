const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const root = path.resolve(__dirname, "..");
const port = process.env.PORT ? Number(process.env.PORT) : 8080;

const mimeByExt = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const rel = decoded.replace(/^\/+/, "");
  const full = path.resolve(root, rel);
  if (!full.startsWith(root)) {
    return null;
  }
  return full;
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  const corsHeaders = origin
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
      }
    : {"Access-Control-Allow-Origin": "*"};

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url || "/", `http://localhost:${port}`);
  if (reqUrl.pathname === "/tests/fixtures/echo" || reqUrl.pathname.startsWith("/tests/fixtures/echo/")) {
    const out = {};
    if (reqUrl.pathname.startsWith("/tests/fixtures/echo/")) {
      out.id = reqUrl.pathname.substring("/tests/fixtures/echo/".length);
    }
    reqUrl.searchParams.forEach((val, key) => {
      out[key] = val;
    });
    res.writeHead(200, {"Content-Type": "application/json; charset=utf-8", ...corsHeaders});
    res.end(JSON.stringify(out));
    return;
  }

  const fullPath = safePath(reqUrl.pathname || "/");
  if (!fullPath) {
    res.writeHead(403, corsHeaders);
    res.end("Forbidden");
    return;
  }

  let target = fullPath;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, "index.html");
  }

  fs.readFile(target, (err, data) => {
    if (err) {
      res.writeHead(404, corsHeaders);
      res.end("Not found");
      return;
    }
    const ext = path.extname(target).toLowerCase();
    const mime = mimeByExt[ext] || "application/octet-stream";
    res.writeHead(200, {"Content-Type": mime, ...corsHeaders});
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}/`);
  console.log(`Open http://localhost:${port}/tests/modules.html`);
});
