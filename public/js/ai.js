/* Where the AI comes from, in this order:
   1. Inside Claude (artifact preview): the page's "sample" capability.
   2. On your server: POST /api/showrunner (api/showrunner.js, your ANTHROPIC_API_KEY).
   3. Neither: demo mode. Callers catch the "offline" error and use offline.js. */
import { TASKS } from "../shared/prompts.js";

let mode = "offline"; let sample = null;
export const aiMode = () => mode;
export async function initAI() {
  try { if (window.claude?.use) { sample = await window.claude.use("sample"); if (sample) { mode = "claude"; return mode; } } } catch {}
  try { const r = await fetch("/api/showrunner", { cache: "no-store" }); const j = await r.json(); if (j.ok && j.ai) mode = "api"; } catch {}
  return mode;
}
export async function ask(task, input) {
  if (mode === "claude") { const { prompt, tier } = TASKS[task](input); return sample.json(prompt, { modelTier: tier, cache: false }); }
  if (mode === "api") {
    const r = await fetch("/api/showrunner", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task, input }) });
    const j = await r.json().catch(() => ({ ok: false, error: "network" })); if (!j.ok) throw { code: j.error || "upstream" }; return j.data;
  }
  throw { code: "offline" };
}
export const errText = (e) => ({ rate_limited: "Your Showrunner needs a breather. Try again in a minute.", invalid_json: "The answer came back broken. Try again.", not_granted: "AI access wasn't allowed here.", network: "No connection. Check your internet." }[e?.code] || "Something went wrong. Try again.");
