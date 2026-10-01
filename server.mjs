import { createHash, randomBytes } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const PRIVATE = new Set(["server.mjs", "package.json", "package-lock.json", "railway.toml"]);
const PAGES = new Set([
  "/",
  "/about.html",
  "/priorities.html",
  "/debt-clock.html",
  "/get-involved.html",
  "/contact.html",
]);
const HOSTS = new Set([
  "chris4bps.com",
  "www.chris4bps.com",
  "chris4bps-production.up.railway.app",
]);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const BOT = /bot|spider|crawl|slurp|preview|facebookexternalhit|facebot|whatsapp|telegram|slackbot|discord|twitterbot|linkedinbot|pinterest|applebot|bingbot|googlebot|petalbot|ahrefs|semrush|headless|wget|curl|python-requests|go-http-client|monitoring|uptimerobot/i;

let writeChain = Promise.resolve();

function dayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function emptyStore() {
  return { salt: randomBytes(16).toString("hex"), days: {} };
}

function dataFile() {
  if (process.env.VIEW_DATA) return process.env.VIEW_DATA;
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "views.json");
  }
  return "/data/views.json";
}

export function loadStore(file = dataFile()) {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (!parsed || typeof parsed !== "object" || !parsed.days) return emptyStore();
    if (!parsed.salt) parsed.salt = randomBytes(16).toString("hex");
    return parsed;
  } catch {
    return emptyStore();
  }
}

function saveStore(store, file = dataFile()) {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(store));
  try {
    renameSync(tmp, file);
  } catch (err) {
    if (process.platform !== "win32") throw err;
    rmSync(file, { force: true });
    renameSync(tmp, file);
  }
}

export function isBot(userAgent) {
  const ua = String(userAgent || "").trim();
  if (ua.length < 12) return true;
  return BOT.test(ua);
}

export function normalizePage(raw) {
  let page = String(raw || "").split("?")[0].split("#")[0];
  if (!page.startsWith("/")) page = `/${page}`;
  if (page.length > 1 && page.endsWith("/")) page = page.slice(0, -1);
  if (page === "/index.html") page = "/";
  return PAGES.has(page) ? page : "";
}

function clientAddress(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket?.remoteAddress || "";
}

function allowedHost(req) {
  const origin = String(req.headers.origin || "");
  if (!origin) return false;
  try {
    return HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function personHash(store, day, address, userAgent) {
  return createHash("sha256")
    .update(`${store.salt}|${day}|${address}|${userAgent}`)
    .digest("hex")
    .slice(0, 20);
}

export function recordView({ store, page, userAgent, address, now, prefetch }) {
  if (prefetch || isBot(userAgent)) return { store, counted: false };
  const clean = normalizePage(page);
  if (!clean) return { store, counted: false };
  const day = dayKey(now);
  const person = personHash(store, day, address, userAgent);
  const days = store.days;
  if (!days[day]) days[day] = { people: [], pages: {} };
  const bucket = days[day];
  if (!bucket.pages[clean]) bucket.pages[clean] = { views: 0, seen: [] };
  const pageBucket = bucket.pages[clean];
  if (!pageBucket.seen.includes(person)) {
    if (pageBucket.seen.length < 5000) pageBucket.seen.push(person);
    pageBucket.views += 1;
  }
  if (!bucket.people.includes(person) && bucket.people.length < 5000) bucket.people.push(person);
  return { store, counted: true };
}

export function summarize(store, day = dayKey()) {
  const bucket = store.days[day] || { people: [], pages: {} };
  const pages = {};
  for (const [page, info] of Object.entries(bucket.pages)) {
    pages[page] = info.views;
  }
  return { day, people: bucket.people.length, pages };
}

function queueSave(mutate) {
  const run = writeChain.then(async () => {
    const store = loadStore();
    const result = mutate(store);
    if (result.counted) saveStore(store);
    return result;
  });
  writeChain = run.then(() => {}, () => {});
  return run;
}

function readJson(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 2000) req.destroy();
      else chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

async function handleView(req, res) {
  const body = await readJson(req);
  const prefetch = req.headers["sec-purpose"] === "prefetch" || req.headers.purpose === "prefetch";
  if (!allowedHost(req)) {
    res.writeHead(204);
    res.end();
    return;
  }
  await queueSave((store) => recordView({
    store,
    page: body.page,
    userAgent: req.headers["user-agent"],
    address: clientAddress(req),
    now: new Date(),
    prefetch,
  }));
  res.writeHead(204, { "cache-control": "no-store" });
  res.end();
}

function safeFile(urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]);
  if (rel === "/") rel = "/index.html";
  rel = rel.replace(/^\/+/, "");
  if (!rel || rel.includes("\0")) return null;
  const parts = rel.split("/");
  if (parts.some((part) => part.startsWith("."))) return null;
  if (PRIVATE.has(rel) || rel.startsWith("test/") || rel.startsWith("data/")) return null;
  const file = path.resolve(ROOT, rel);
  if (path.resolve(file) === path.resolve(dataFile())) return null;
  const root = path.resolve(ROOT);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  if (rel.split("/").includes("..")) return null;
  return file;
}

function serveStatic(urlPath, req, res) {
  const file = safeFile(urlPath);
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, {
    "content-type": type,
    "cache-control": "no-cache",
    "content-security-policy": "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:; connect-src 'self' https:; media-src 'self' https:; object-src 'none'; frame-src 'self' https:",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
}

export function start(port = process.env.PORT || 3000) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://localhost");
    if (url.pathname === "/api/view") {
      if (req.method === "POST") {
        handleView(req, res).catch(() => {
          if (!res.headersSent) {
            res.writeHead(204);
            res.end();
          }
        });
        return;
      }
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    serveStatic(url.pathname, req, res);
  });
  return new Promise((resolve) => {
    server.listen(port, "0.0.0.0", () => resolve(server));
  });
}

const ranDirect = process.argv[1]
  && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (ranDirect) {
  start().then((server) => {
    console.log(`chris4bps listening on ${server.address().port}`);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
