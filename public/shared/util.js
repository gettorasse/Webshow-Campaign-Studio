/* Small helpers shared by the app and the server. No DOM here. */
export const str = (v, d = "") => (typeof v === "string" ? v : v == null ? d : String(v)).trim();
export const arr = (v, n) => (Array.isArray(v) ? v : v ? [v] : []).slice(0, n ?? 99);
export const clip = (s, n) => { s = str(s); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };
export const uid = (p = "") => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
export const slug = (s) => str(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "show";
export const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/* Calendar days as ISO strings (yyyy-mm-dd) in local time. */
const pad = (n) => String(n).padStart(2, "0");
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (iso) => { const [y, m, d] = String(iso).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
export const todayISO = () => toISO(new Date());
export const addDays = (iso, n) => { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
export const daysBetween = (a, b) => Math.round((fromISO(b) - fromISO(a)) / 864e5);
export const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(str(s));
export const nextMonday = () => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return toISO(d); };
export const fmtDate = (iso, o = { day: "numeric", month: "short" }) => isISO(iso) ? fromISO(iso).toLocaleDateString("en-GB", o) : "";
export const fmtDay = (iso) => fmtDate(iso, { weekday: "short", day: "numeric", month: "short" });

/* Pull the first JSON object or array out of a model reply. */
export function parseJSON(text) {
  const t = str(text); try { return JSON.parse(t); } catch {}
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const a = t.search(/[{[]/), b = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  return null;
}
