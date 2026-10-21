/* Photos from the phone, one per post. Kept on this device in IndexedDB (too big for localStorage),
   shrunk to 1600 px on the way in. Also draws the finished post: photo + text, at full size. */
import { fmtOf, lookOf } from "../shared/make.js";

const DB = "webshow-photos", STORE = "photos";
let dbp = null;
const db = () => dbp ??= new Promise((ok, no) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
const tx = async (mode, fn) => { const d = await db(); return new Promise((ok, no) => { const t = d.transaction(STORE, mode); const r = fn(t.objectStore(STORE)); t.oncomplete = () => ok(r?.result); t.onerror = () => no(t.error); }); };

const urls = new Map(); /* asset id → object URL, for previews */
export const photoURL = (id) => urls.get(id) || "";
export async function loadPhoto(id) {
  if (urls.has(id)) return urls.get(id);
  try { const b = await tx("readonly", s => s.get(id)); if (b) { urls.set(id, URL.createObjectURL(b)); return urls.get(id); } } catch {}
  return "";
}
export async function savePhoto(id, file) {
  const blob = await shrink(file, 1600);
  await tx("readwrite", s => s.put(blob, id));
  if (urls.has(id)) URL.revokeObjectURL(urls.get(id)); urls.set(id, URL.createObjectURL(blob));
}
export async function removePhoto(id) { try { await tx("readwrite", s => s.delete(id)); } catch {} if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); } }
export async function clearPhotos() { try { await tx("readwrite", s => s.clear()); } catch {} }

async function decode(src) { const img = new Image(); img.decoding = "async"; img.src = typeof src === "string" ? src : URL.createObjectURL(src); await img.decode(); return img; }
async function shrink(file, max) {
  const img = await decode(file); const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise(ok => c.toBlob(ok, "image/jpeg", .88));
}

/* ---------- the finished post, drawn the same way as the preview ---------- */
export const FONT_CSS = { bold: '700 1em "Funnel Display", "Geist", system-ui, sans-serif', clean: '600 1em "Geist", system-ui, sans-serif', serif: '600 1em Georgia, "Times New Roman", serif', hand: '600 1em "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive' };
export const SIZE_K = { s: .058, m: .075, l: .095 }; /* headline size as a share of the image width */
export async function renderPost(a) {
  const look = lookOf(a), fmt = fmtOf(a), W = fmt.w, H = fmt.h;
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  g.fillStyle = "#222"; g.fillRect(0, 0, W, H);
  const src = await loadPhoto(a.id);
  if (src) { const img = await decode(src); const k = Math.max(W / img.naturalWidth, H / img.naturalHeight); const w = img.naturalWidth * k, h = img.naturalHeight * k; g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); }
  try { await document.fonts.load(FONT_CSS[look.font].replace("1em", "64px")); } catch {}
  const pad = W * .06, fs = W * (SIZE_K[look.size] || SIZE_K.l), fs2 = fs * .48, lh = 1.08;
  const setFont = (px) => { g.font = (FONT_CSS[look.font] || FONT_CSS.bold).replace("1em", px + "px"); };
  const wrap = (t, px) => { setFont(px); const out = []; let line = ""; for (const w of String(t).split(/\s+/).filter(Boolean)) { const tryL = line ? line + " " + w : w; if (g.measureText(tryL).width > W - pad * 2 && line) { out.push(line); line = w; } else line = tryL; } if (line) out.push(line); return out; };
  const L1 = wrap(look.headline, fs), L2 = look.sub ? wrap(look.sub, fs2) : [];
  const blockH = L1.length * fs * lh + (L2.length ? fs2 * .6 + L2.length * fs2 * 1.25 : 0);
  const safeTop = H > W * 1.5 ? H * .14 : pad, safeBot = H > W * 1.5 ? H * .2 : pad;
  const y0 = look.pos === "top" ? safeTop + pad * .3 : look.pos === "middle" ? (H - blockH) / 2 : H - safeBot - pad * .3 - blockH;
  /* behind the text */
  if (look.bg === "shade") { const top = look.pos === "top"; const gr = g.createLinearGradient(0, top ? 0 : H, 0, top ? y0 + blockH + pad * 2 : y0 - pad * 2); gr.addColorStop(0, "rgba(0,0,0,.62)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; if (look.pos === "middle") { g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, y0 - pad, W, blockH + pad * 2); } else g.fillRect(0, top ? 0 : y0 - pad * 2, W, top ? y0 + blockH + pad * 2 : H - y0 + pad * 2); }
  const contrast = isLight(look.color) ? "rgba(11,11,16,.92)" : "rgba(255,255,255,.94)";
  if (look.bg === "band") { g.fillStyle = contrast; g.fillRect(0, y0 - pad * .7, W, blockH + pad * 1.4); }
  if (look.bg === "box") { const bw = Math.max(...[...L1.map(l => (setFont(fs), g.measureText(l).width)), ...L2.map(l => (setFont(fs2), g.measureText(l).width))]) + pad; g.fillStyle = contrast.replace(/[\d.]+\)$/, ".82)"); roundRect(g, pad * .5, y0 - pad * .5, bw, blockH + pad, W * .025); g.fill(); }
  /* the words */
  g.fillStyle = look.color; g.textBaseline = "top"; let y = y0;
  if (look.bg === "none" || look.bg === "shade") { g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = fs * .25; }
  setFont(fs); for (const l of L1) { g.fillText(l, pad, y); y += fs * lh; }
  if (L2.length) { y += fs2 * .6; setFont(fs2); for (const l of L2) { g.fillText(l, pad, y); y += fs2 * 1.25; } }
  return new Promise(ok => c.toBlob(ok, "image/jpeg", .92));
}
export const isLight = (hex) => { const n = parseInt(String(hex).slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150; };
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
