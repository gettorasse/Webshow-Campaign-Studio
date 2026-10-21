/* DOM helpers, toasts, clipboard, local storage, icons. */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
export const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export function toast(msg, ms = 2600) {
  const box = $("#toasts"); if (!box) return; box.replaceChildren(); /* one message at a time */ const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; box.append(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, ms);
}
/* Synchronous copy, for when the page is about to lose focus (e.g. opening ChatGPT right after). */
export function copyNow(text) {
  const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px"; document.body.append(ta);
  ta.select(); ta.setSelectionRange(0, text.length); let ok = false; try { ok = document.execCommand("copy"); } catch {} ta.remove();
  if (!ok) navigator.clipboard?.writeText(text).catch(() => {}); return ok;
}
/* Must be called inside the click handler. Falls back to a select-and-copy box. */
export async function copyText(text, label = "Copied") {
  try { await navigator.clipboard.writeText(text); toast(label); return true; }
  catch {
    const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0"; document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch {} ta.remove();
    if (ok) toast(label); else toast("Copying was blocked. Long-press the text to copy it.");
    return ok;
  }
}

/* ---------- icons: one stroke set, 16px grid ---------- */
const P = (d, extra = "") => `<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const IC = {
  spark: P('<path d="M8 1.8l1.5 4.2 4.2 1.5-4.2 1.5L8 13.2 6.5 9 2.3 7.5 6.5 6z"/>'),
  copy: P('<rect x="5.2" y="5.2" width="8.3" height="8.3" rx="1.8"/><path d="M10.8 5.2V3.6a1.3 1.3 0 0 0-1.3-1.3H3.6a1.3 1.3 0 0 0-1.3 1.3v5.9a1.3 1.3 0 0 0 1.3 1.3h1.6"/>'),
  redo: P('<path d="M13.2 7.2A5.2 5.2 0 1 0 12 11"/><path d="M13.6 3.4v3.9H9.7"/>'),
  down: P('<path d="M8 2.5v8"/><path d="M4.5 7.2 8 10.7l3.5-3.5"/><path d="M2.8 13.3h10.4"/>'),
  plus: P('<path d="M8 3v10M3 8h10"/>'),
  x: P('<path d="m4 4 8 8M12 4l-8 8"/>'),
  check: P('<path d="m3.2 8.4 3 3 6.6-6.8"/>'),
  more: P('<circle cx="3.5" cy="8" r=".6" fill="currentColor"/><circle cx="8" cy="8" r=".6" fill="currentColor"/><circle cx="12.5" cy="8" r=".6" fill="currentColor"/>'),
  target: P('<circle cx="8" cy="8" r="5.6"/><circle cx="8" cy="8" r="2.6"/><circle cx="8" cy="8" r=".5" fill="currentColor"/>'),
  people: P('<circle cx="6" cy="5.6" r="2.3"/><path d="M1.9 13.2c.5-2.3 2.1-3.6 4.1-3.6s3.6 1.3 4.1 3.6"/><path d="M10.6 3.6a2.2 2.2 0 0 1 0 4.2M12.3 9.9c1 .6 1.6 1.7 1.9 3.3"/>'),
  megaphone: P('<path d="M2.4 6.4v3.2h2.3l5.6 3V3.4l-5.6 3z"/><path d="M12.2 6a2.6 2.6 0 0 1 0 4"/><path d="M5 9.6 6 13h1.7"/>'),
  cursor: P('<path d="m3 2.6 9.6 4-4.1 1.5-1.5 4.1z"/><path d="m8.6 8.2 3.6 3.6"/>'),
  palette: P('<path d="M8 2.2a5.8 5.8 0 1 0 0 11.6c1 0 1.4-.6 1.4-1.3 0-.9-.8-1.2-.8-2 0-.7.6-1.2 1.4-1.2h1.4a2.6 2.6 0 0 0 2.6-2.6c0-2.6-2.7-4.5-6-4.5z"/><circle cx="5" cy="7" r=".7" fill="currentColor"/><circle cx="7.5" cy="4.9" r=".7" fill="currentColor"/><circle cx="10.4" cy="5.5" r=".7" fill="currentColor"/>'),
  cal: P('<rect x="2.3" y="3.2" width="11.4" height="10.4" rx="2"/><path d="M2.3 6.6h11.4M5.4 1.8v2.6M10.6 1.8v2.6"/>'),
  grid: P('<rect x="2.3" y="2.3" width="4.6" height="4.6" rx="1.2"/><rect x="9.1" y="2.3" width="4.6" height="4.6" rx="1.2"/><rect x="2.3" y="9.1" width="4.6" height="4.6" rx="1.2"/><rect x="9.1" y="9.1" width="4.6" height="4.6" rx="1.2"/>'),
  doc: P('<path d="M4 1.8h5.2l3 3v8.8a.7.7 0 0 1-.7.7H4a.7.7 0 0 1-.7-.7V2.5a.7.7 0 0 1 .7-.7z"/><path d="M9 1.9v3h3M5.5 8.2h5M5.5 10.8h3.6"/>'),
  image: P('<rect x="2" y="2.6" width="12" height="10.8" rx="2"/><circle cx="5.7" cy="6.2" r="1.2"/><path d="m2.4 11.6 3.5-3.2 2.6 2.3 2-1.7 3.2 2.8"/>'),
  figma: P('<path d="M6 1.8h2v4.1H6a2 2 0 0 1 0-4.1zM8 1.8h2a2 2 0 0 1 0 4.1H8zM6 5.9h2V10H6a2 2 0 0 1 0-4.1zM10 5.9a2 2 0 1 1 0 4.1 2 2 0 0 1 0-4.1zM6 10h2v2.1a2 2 0 1 1-2-2.1z"/>'),
  table: P('<rect x="2.2" y="2.6" width="11.6" height="10.8" rx="1.6"/><path d="M2.2 6.2h11.6M2.2 9.8h11.6M6.4 6.2v7.2"/>'),
  zip: P('<path d="M4 1.8h5.2l3 3v8.8a.7.7 0 0 1-.7.7H4a.7.7 0 0 1-.7-.7V2.5a.7.7 0 0 1 .7-.7z"/><path d="M6.6 2v1.2M6.6 4.4v1.2M6.6 6.8V8"/><rect x="5.6" y="9" width="2" height="2.6" rx=".5"/>'),
  arrow: P('<path d="M3 8h10M9 4l4 4-4 4"/>'),
  back: P('<path d="M13 8H3M7 4 3 8l4 4"/>'),
  wand: P('<path d="m2.4 13.6 8-8M9.2 4.2l2.6 2.6"/><path d="M12.4 1.6v2.2M11.3 2.7h2.2M13.8 6.2v1.6M13 7h1.6"/>'),
  sun: P('<circle cx="8" cy="8" r="3"/><path d="M8 1.6v1.3M8 13.1v1.3M1.6 8h1.3M13.1 8h1.3M3.5 3.5l.9.9M11.6 11.6l.9.9M3.5 12.5l.9-.9M11.6 4.4l.9-.9"/>'),
  moon: P('<path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8z"/>'),
  trash: P('<path d="M2.8 4.4h10.4M6.4 4.4V2.8h3.2v1.6M4.2 4.4l.6 8.8h6.4l.6-8.8"/>'),
  edit: P('<path d="M10.6 2.6 13.4 5.4 5.6 13.2H2.8v-2.8z"/>'),
  folder: P('<path d="M2 4.2a1 1 0 0 1 1-1h3.3l1.4 1.6H13a1 1 0 0 1 1 1v6.9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/>'),
  bolt: P('<path d="M9 1.6 3.6 9h4l-1 5.4L12.4 7h-4z"/>'),
  menu: P('<path d="M2.6 4.5h10.8M2.6 8h10.8M2.6 11.5h10.8"/>'),
  brain: P('<path d="M6 2.6a2 2 0 0 0-2 2 2 2 0 0 0-1.4 3.4A2.2 2.2 0 0 0 4.5 12a2 2 0 0 0 3.5 1V3.6A1.6 1.6 0 0 0 6 2.6z"/><path d="M10 2.6a2 2 0 0 1 2 2 2 2 0 0 1 1.4 3.4 2.2 2.2 0 0 1-1.9 4 2 2 0 0 1-3.5 1V3.6A1.6 1.6 0 0 1 10 2.6z"/>'),
  lock: P('<rect x="3.4" y="7" width="9.2" height="6.6" rx="1.6"/><path d="M5.4 7V5.2a2.6 2.6 0 0 1 5.2 0V7"/><circle cx="8" cy="10.3" r=".6" fill="currentColor"/>'),
  plug: P('<path d="M5.6 2v3M10.4 2v3M3.8 5h8.4v2.4a4.2 4.2 0 0 1-8.4 0zM8 11.6V14"/>'),
  chart: P('<path d="M2.5 13.5h11M4.5 11V8.5M7 11V6.5M9.5 11V8M12 11V4"/>'),
  clap: P('<rect x="2.4" y="6.4" width="11.2" height="7.2" rx="1.6"/><path d="m2.6 6.2 10.2-2.9-.6-2-10.1 2.9z"/><path d="m5.4 3.6 1.4 2M8.8 2.6l1.4 2"/>'),
  up: P('<path d="M8 12.6V3.6M4.4 7.2 8 3.6l3.6 3.6"/>'),
  chat: P('<path d="M2.6 4.2a1.6 1.6 0 0 1 1.6-1.6h7.6a1.6 1.6 0 0 1 1.6 1.6v5.2a1.6 1.6 0 0 1-1.6 1.6H7l-3 2.4V11H4.2a1.6 1.6 0 0 1-1.6-1.6z"/>'),
  home: P('<path d="M2.6 7.2 8 2.8l5.4 4.4V13a.8.8 0 0 1-.8.8H9.8V10H6.2v3.8H3.4a.8.8 0 0 1-.8-.8z"/>'),
  user: P('<circle cx="8" cy="5.4" r="2.6"/><path d="M3 13.6c.6-2.5 2.6-4 5-4s4.4 1.5 5 4"/>'),
  bell: P('<path d="M4 11.2V7.4a4 4 0 0 1 8 0v3.8l1.2 1.2H2.8z"/><path d="M6.6 13.8a1.5 1.5 0 0 0 2.8 0"/>'),
  send: P('<path d="M8 12.6V3.6M4.4 7.2 8 3.6l3.6 3.6"/>'),
  layers: P('<path d="m8 2.4 5.6 3-5.6 3-5.6-3z"/><path d="m2.4 8.4 5.6 3 5.6-3"/><path d="m2.4 11.2 5.6 3 5.6-3" opacity=".5"/>'),
  desktop: P('<rect x="1.8" y="2.6" width="12.4" height="8.4" rx="1.4"/><path d="M5.6 13.6h4.8M8 11v2.6"/>'),
  clock: P('<circle cx="8" cy="8" r="5.8"/><path d="M8 4.8V8l2.2 1.4"/>'),
};
