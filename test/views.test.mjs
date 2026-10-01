import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isBot, loadStore, normalizePage, recordView, start, summarize } from "../server.mjs";

function dayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

process.env.VIEW_DATA = path.join(mkdtempSync(path.join(tmpdir(), "bps-views-")), "views.json");

assert.equal(normalizePage("/index.html"), "/");
assert.equal(normalizePage("/about.html"), "/about.html");
assert.equal(normalizePage("/secret"), "");
assert.equal(isBot("curl/8.0"), true);
assert.equal(isBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"), false);

const now = new Date("2026-10-01T18:00:00Z");
let store = loadStore();
store = recordView({
  store,
  page: "/",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  address: "203.0.113.8",
  now,
}).store;
store = recordView({
  store,
  page: "/",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  address: "203.0.113.8",
  now,
}).store;
store = recordView({
  store,
  page: "/about.html",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  address: "203.0.113.8",
  now,
}).store;
store = recordView({
  store,
  page: "/",
  userAgent: "facebookexternalhit/1.1",
  address: "203.0.113.9",
  now,
}).store;

const totals = summarize(store, "2026-10-01");
assert.equal(totals.people, 1);
assert.equal(totals.pages["/"], 1);
assert.equal(totals.pages["/about.html"], 1);

const server = await start(0);
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
const home = await fetch(base + "/");
assert.equal(home.status, 200);
assert.match(await home.text(), /Chris Faucher/);
const hidden = await fetch(base + "/api/view");
assert.equal(hidden.status, 404);
const ignored = await fetch(base + "/api/view", {
  method: "POST",
  headers: { origin: "https://chris4bps.com", "content-type": "application/json", "user-agent": "curl/8.0" },
  body: JSON.stringify({ page: "/" }),
});
assert.equal(ignored.status, 204);
assert.equal(loadStore().days[dayKey()]?.pages?.["/"]?.views, undefined);

const browser = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
const counted = await fetch(base + "/api/view", {
  method: "POST",
  headers: { origin: "https://chris4bps.com", "content-type": "application/json", "user-agent": browser },
  body: JSON.stringify({ page: "/" }),
});
assert.equal(counted.status, 204);
const repeat = await fetch(base + "/api/view", {
  method: "POST",
  headers: { origin: "https://www.chris4bps.com", "content-type": "application/json", "user-agent": browser },
  body: JSON.stringify({ page: "/index.html" }),
});
assert.equal(repeat.status, 204);
const outside = await fetch(base + "/api/view", {
  method: "POST",
  headers: { origin: "https://example.com", "content-type": "application/json", "user-agent": browser },
  body: JSON.stringify({ page: "/about.html" }),
});
assert.equal(outside.status, 204);

const saved = summarize(loadStore());
assert.equal(saved.people, 1);
assert.equal(saved.pages["/"], 1);
assert.equal(saved.pages["/about.html"], undefined);
assert.equal((await fetch(base + "/server.mjs")).status, 404);
assert.equal((await fetch(base + "/package.json")).status, 404);
assert.equal((await fetch(base + "/api/view")).status, 404);
await new Promise((resolve) => server.close(resolve));
console.log("view counter ok");
