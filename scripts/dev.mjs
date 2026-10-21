/* Local dev server, no dependencies:  node scripts/dev.mjs  (or npm run dev)
   Serves public/ and runs api/showrunner.js the way Vercel does.
   Reads .env (or .env.local) for ANTHROPIC_API_KEY. Without a key the app runs in demo mode. */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, ".."); const PUB = join(ROOT, "public");
for (const f of [".env.local", ".env"]) {
  const p = join(ROOT, f); if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}
const { default: handler } = await import("../api/showrunner.js");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".png": "image/png", ".ico": "image/x-icon" };
const PORT = +process.env.PORT || 5173;

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/showrunner") {
    let body = ""; for await (const c of req) body += c;
    req.body = body ? (() => { try { return JSON.parse(body); } catch { return {}; } })() : {};
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); };
    try { await handler(req, res); } catch (e) { console.error(e); res.status(500).json({ ok: false, error: "server" }); }
    return;
  }
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(PUB, p); if (!file.startsWith(PUB)) { res.statusCode = 403; return res.end(); }
  try { if ((await stat(file)).isDirectory()) file = join(file, "index.html"); } catch {}
  try { const data = await readFile(file); res.setHeader("content-type", TYPES[extname(file)] || "application/octet-stream"); res.setHeader("cache-control", "no-store"); res.end(data); }
  catch { res.statusCode = 404; res.end("Not found"); }
}).listen(PORT, () => console.log(`Webshow on http://localhost:${PORT}  ·  AI: ${process.env.ANTHROPIC_API_KEY ? "on (" + (process.env.SHOWRUNNER_MODEL || "claude-sonnet-5-5") + ")" : "off – demo mode (add ANTHROPIC_API_KEY to .env)"}`));
