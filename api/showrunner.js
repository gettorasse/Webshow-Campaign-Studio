/* POST /api/showrunner  { task: "chat" | "strategy" | "assets", input: {...} }
   Builds the prompt on the server (from public/shared/prompts.js), calls Claude,
   and returns { ok: true, data } with the parsed JSON.
   GET /api/showrunner  → { ok: true, ai: true|false } so the app knows if AI is on.

   Env: ANTHROPIC_API_KEY (required for AI), SHOWRUNNER_MODEL, SHOWRUNNER_DAILY_LIMIT. */
import { TASKS } from "../public/shared/prompts.js";
import { parseJSON } from "../public/shared/util.js";

const MODEL = process.env.SHOWRUNNER_MODEL || "claude-sonnet-5-5";
const DAILY_LIMIT = +process.env.SHOWRUNNER_DAILY_LIMIT || 80;
/* A simple per-IP daily counter. It resets when the function cold-starts, so it is a
   speed bump, not a real limit. Move it to a KV store (e.g. Upstash) before going public. */
const counts = new Map();
function allow(ip) {
  const day = new Date().toISOString().slice(0, 10); const k = ip + day; const n = (counts.get(k) || 0) + 1;
  counts.set(k, n); if (counts.size > 5000) counts.clear(); return n <= DAILY_LIMIT;
}

export async function callClaude(prompt, maxTokens) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system: "You reply with a single JSON value and nothing else.", messages: [{ role: "user", content: prompt }] }),
  });
  if (!r.ok) { const t = await r.text(); throw Object.assign(new Error(`Claude API ${r.status}: ${t.slice(0, 300)}`), { status: r.status }); }
  const j = await r.json();
  return (j.content || []).filter(b => b.type === "text").map(b => b.text).join("");
}

export default async function handler(req, res) {
  if (req.method === "GET") return res.status(200).json({ ok: true, ai: !!process.env.ANTHROPIC_API_KEY, model: MODEL });
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ ok: false, error: "no_key" });
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  if (!allow(ip)) return res.status(429).json({ ok: false, error: "rate_limited" });
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const build = TASKS[body.task];
  if (!build) return res.status(400).json({ ok: false, error: "task" });
  if (JSON.stringify(body.input || {}).length > 60000) return res.status(413).json({ ok: false, error: "too_large" });
  try {
    const { prompt, maxTokens } = build(body.input || {});
    const text = await callClaude(prompt, maxTokens);
    const data = parseJSON(text);
    if (data == null) return res.status(502).json({ ok: false, error: "invalid_json" });
    return res.status(200).json({ ok: true, data });
  } catch (e) {
    return res.status(e.status === 429 ? 429 : 502).json({ ok: false, error: e.status === 429 ? "rate_limited" : "upstream", detail: String(e.message).slice(0, 200) });
  }
}
