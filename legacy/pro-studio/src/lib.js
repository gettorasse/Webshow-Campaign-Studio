const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = (p = "") => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const clone = (o) => JSON.parse(JSON.stringify(o));
const now = () => Date.now();
const get = (o, path) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
const set = (o, path, v) => { const ks = path.split("."); let a = o; ks.slice(0, -1).forEach(k => { if (a[k] == null || typeof a[k] !== "object") a[k] = {}; a = a[k]; }); a[ks.at(-1)] = v; };
const arr = (v, n) => (Array.isArray(v) ? v : v ? [v] : []).slice(0, n ?? 99);
const str = (v, d = "") => (typeof v === "string" ? v : v == null ? d : String(v)).trim();
const slugify = (s) => str(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "show";
const ago = (t) => { const s = (now() - t) / 1000; if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + " min ago"; if (s < 86400) return Math.floor(s / 3600) + " h ago"; return new Date(t).toLocaleDateString(); };
/* calendar days in the viewer's local time: a lead at 01:30 in Helsinki belongs to that day, not to yesterday in UTC */
const localDayOf = (t = Date.now()) => Math.floor((t - new Date(t).getTimezoneOffset() * 6e4) / 864e5);
const localISO = (t = Date.now()) => new Date(localDayOf(t) * 864e5).toISOString().slice(0, 10);
const localDateTime = (t) => new Date(t - new Date(t).getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch {} };

/* ---------- catalogue ---------- */
const FONT_PAIRS = {
  pixel: { label: "Webshow display", head: "'Funnel Display', 'Geist', system-ui, sans-serif", body: "'Geist', system-ui, sans-serif", w: 600, w3: 500 },
  grotesk: { label: "Modern grotesk", head: "'Instrument Sans', system-ui, sans-serif", body: "'Geist', system-ui, sans-serif" },
  editorial: { label: "Editorial serif", head: "'Fraunces', Georgia, serif", body: "'Instrument Sans', system-ui, sans-serif" },
  brutal: { label: "Brutal mono", head: "'Archivo Black', Impact, sans-serif", body: "'IBM Plex Mono', ui-monospace, monospace" },
  elegant: { label: "Quiet luxury", head: "'Cormorant Garamond', Georgia, serif", body: "'Manrope', system-ui, sans-serif" },
  swiss: { label: "Swiss grotesk", head: "'Inter Tight', 'Inter', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif", w: 700, w3: 600 },
  pop: { label: "Expressive display", head: "'Syne', system-ui, sans-serif", body: "'DM Sans', system-ui, sans-serif", w: 800, w3: 700 },
  saas: { label: "Clean product", head: "'Geist', system-ui, sans-serif", body: "'Geist', system-ui, sans-serif", w: 600, w3: 600 },
  mono: { label: "Terminal mono", head: "'Space Mono', ui-monospace, monospace", body: "'IBM Plex Mono', ui-monospace, monospace", w: 700, w3: 700 },
  round: { label: "Friendly round", head: "'Fredoka', system-ui, sans-serif", body: "'Nunito', system-ui, sans-serif" },
};
const PALETTES = {
  webshow: { label: "Webshow", c: ["#0a0b1b", "#6b7fff", "#aeb5ff", "#f4f8ff", "#fd4415"] },
  nightshow: { label: "Night show", c: ["#15101f", "#7c4dff", "#ffd23f", "#f6f2ff", "#ff5d8f"] },
  nordic: { label: "Nordic wood", c: ["#1e2a2e", "#2f6f5e", "#e6d7bf", "#f8f4ec", "#c8643b"] },
  electric: { label: "Electric blue", c: ["#0b1633", "#2f63ff", "#ff7a45", "#f4f6ff", "#ffd166"] },
  sorbet: { label: "Sorbet", c: ["#3a1d2b", "#ff7aa2", "#ffd3a5", "#fff6ef", "#3fb8a8"] },
  ink: { label: "Ink & signal", c: ["#111111", "#2b2b2b", "#e9e7e2", "#ffffff", "#ff3b30"] },
};
const MOTIFS = ["spotlight", "orbs", "arcs", "horizon", "stripes", "grid", "blob", "halftone"];
const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c);
function dataUrlToBlob(u) { const [h, b] = u.split(","); const mime = h.match(/:(.*?);/)[1]; const bin = atob(b); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: mime }); }
/* ---------- visual renderer (concept frames) ---------- */
const VCACHE = new Map();
let NOISE = null;
function noise() {
  if (NOISE) return NOISE; const c = document.createElement("canvas"); c.width = c.height = 96; const x = c.getContext("2d"); const im = x.createImageData(96, 96);
  for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 40; }
  x.putImageData(im, 0, 0); NOISE = c; return c;
}
function rng(seed) { let s = hash(seed) || 7; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; }; }
function lum(hex) { const n = parseInt(hex.slice(1), 16); const r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
const ASPECT = { "16:9": [1280, 720], "4:5": [880, 1100], "1:1": [960, 960], "9:16": [720, 1280] };
function visualURL(item, pal, fontKey = "grotesk", scale = 1) {
  const key = [item.id, item.motif, item.seed, item.overlay, item.aspect, pal.join(), fontKey, scale].join("|");
  if (VCACHE.has(key)) return VCACHE.get(key);
  const [W0, H0] = ASPECT[item.aspect] || ASPECT["16:9"]; const W = Math.round(W0 * scale), H = Math.round(H0 * scale);
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  const R = rng(item.id + item.motif + item.seed + pal.join());
  const [ink, pri, sec, paper, pop] = pal; const M = Math.min(W, H);
  const dark = ["spotlight", "halftone"].includes(item.motif) || (item.motif === "horizon" && R() > .5);
  x.fillStyle = dark ? ink : paper; x.fillRect(0, 0, W, H);
  const circle = (cx, cy, r, col, a = 1) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, col + "00"); x.globalAlpha = a; x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.globalAlpha = 1; };
  switch (item.motif) {
    case "spotlight": {
      const cx = W * (.35 + R() * .3);
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, pri); g.addColorStop(1, ink); x.globalAlpha = .55; x.fillStyle = g;
      x.beginPath(); x.moveTo(cx - M * .06, 0); x.lineTo(cx + M * .06, 0); x.lineTo(cx + M * .45, H * .86); x.lineTo(cx - M * .45, H * .86); x.fill(); x.globalAlpha = 1;
      circle(cx, H * .86, M * .5, sec, .55); x.fillStyle = ink; x.globalAlpha = .9; x.fillRect(0, H * .88, W, H); x.globalAlpha = 1;
      x.fillStyle = pop; x.beginPath(); x.ellipse(cx, H * .87, M * .3, M * .035, 0, 0, 7); x.fill();
      break; }
    case "orbs": for (let i = 0; i < 6; i++) circle(R() * W, R() * H, M * (.3 + R() * .5), [pri, sec, pop, pri][i % 4], .85); break;
    case "arcs": {
      const cx = W * (.3 + R() * .4), cy = H * 1.05; const cols = [pri, sec, pop, ink];
      for (let i = 9; i > 0; i--) { x.fillStyle = cols[i % 4]; x.beginPath(); x.arc(cx, cy, M * .11 * i, Math.PI, 0); x.fill(); }
      break; }
    case "horizon": {
      const sky = x.createLinearGradient(0, 0, 0, H * .7); sky.addColorStop(0, dark ? ink : sec); sky.addColorStop(1, dark ? pri : paper); x.fillStyle = sky; x.fillRect(0, 0, W, H);
      circle(W * (.25 + R() * .5), H * .5, M * .35, pop, .9);
      [[.58, pri], [.68, ink], [.8, dark ? paper : ink]].forEach(([y, col], j) => { x.fillStyle = col; x.globalAlpha = j === 2 ? .9 : .85; x.beginPath(); x.moveTo(0, H); x.lineTo(0, H * y); let px = 0; while (px < W) { px += W * (.06 + R() * .1); x.lineTo(px, H * (y - .02 - R() * .1)); } x.lineTo(W, H); x.fill(); });
      x.globalAlpha = 1; break; }
    case "stripes": {
      x.save(); x.translate(W / 2, H / 2); x.rotate(-.5 + R() * .3); const cols = [pri, sec, pop, ink, paper]; const bw = M * (.08 + R() * .06);
      for (let i = -24; i < 24; i++) { x.fillStyle = cols[(i + 50) % 5]; x.fillRect(i * bw, -M * 2, bw, M * 4); } x.restore(); break; }
    case "grid": {
      const n = 4 + Math.floor(R() * 3), cw = W / n, ch = H / Math.round(n * H / W || n); const cols = [pri, sec, pop, ink, paper];
      for (let i = 0; i < n; i++) for (let j = 0; j * ch < H; j++) { x.fillStyle = cols[Math.floor(R() * 5)]; const r = R(); if (r < .3) { x.beginPath(); x.arc(i * cw + cw / 2, j * ch + ch / 2, Math.min(cw, ch) / 2, 0, 7); x.fill(); } else if (r < .8) x.fillRect(i * cw, j * ch, cw, ch); }
      break; }
    case "blob": {
      for (let b = 0; b < 3; b++) { const cx = R() * W, cy = R() * H, r = M * (.25 + R() * .25); x.fillStyle = [pri, sec, pop][b]; x.beginPath();
        const pts = 7; for (let i = 0; i <= pts; i++) { const a = i / pts * Math.PI * 2, rr = r * (.75 + R() * .5); const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; i ? x.quadraticCurveTo(cx + Math.cos(a - .45) * rr * 1.2, cy + Math.sin(a - .45) * rr * 1.2, px, py) : x.moveTo(px, py); } x.fill(); }
      break; }
    case "halftone": {
      const g = M / 26; for (let yy = 0; yy < H + g; yy += g) for (let xx = 0; xx < W + g; xx += g) { const d = Math.hypot(xx - W * .6, yy - H * .4) / M; const r = Math.max(0, g * .48 * (1 - d * .9)); x.fillStyle = d < .35 ? pop : pri; x.beginPath(); x.arc(xx, yy, r, 0, 7); x.fill(); }
      break; }
  }
  x.globalAlpha = .5; x.fillStyle = x.createPattern(noise(), "repeat"); x.fillRect(0, 0, W, H); x.globalAlpha = 1;
  if (item.overlay) {
    const fp = FONT_PAIRS[fontKey] || FONT_PAIRS.pixel; const fs = Math.round(M * .11);
    x.font = `${fp.w || 800} ${fs}px ${fp.head}`; x.textBaseline = "alphabetic";
    const words = item.overlay.toUpperCase().split(/\s+/); const lines = []; let line = "";
    words.forEach(w => { const t = line ? line + " " + w : w; if (x.measureText(t).width > W * .8 && line) { lines.push(line); line = w; } else line = t; }); lines.push(line);
    const pad = M * .07; let y = H - pad - (lines.length - 1) * fs * .98;
    const bgL = lum(dark ? ink : paper); x.fillStyle = bgL > .5 ? ink : paper;
    x.shadowColor = "rgba(0,0,0,.25)"; x.shadowBlur = bgL > .5 ? 0 : 18;
    lines.forEach(l => { x.fillText(l, pad, y); y += fs * .98; }); x.shadowBlur = 0;
  }
  const url = c.toDataURL("image/jpeg", .86); VCACHE.set(key, url); return url;
}
/* ---------- image overlays & gradients ---------- */
const OV_TOK = { ink: "--p-ink", pri: "--p-acc", sec: "--p-acc2", paper: "--p-paper", pop: "--p-pop" };
const OV_TOKS = ["ink", "pri", "sec", "paper", "pop"];
const ovHex = (c, pal) => { const i = OV_TOKS.indexOf(c); return i >= 0 ? (pal || PALETTES.webshow.c)[i] : (/^#[0-9a-f]{6}$/i.test(c || "") ? c : "#000000"); };
function ovColor(c, a) { const base = OV_TOK[c] ? `var(${OV_TOK[c]})` : (/^#[0-9a-f]{6}$/i.test(c || "") ? c : "#000000"); return `color-mix(in srgb,${base} ${Math.max(0, Math.min(100, Math.round(+a || 0)))}%,transparent)`; }
function ovStops(o) { return [...(o.stops || [])].sort((a, b) => a.p - b.p).map(x => `${ovColor(x.c, x.a)} ${x.p}%`).join(","); }
function ovCSS(o) {
  if (!o || !o.kind || o.kind === "none" || !o.stops?.length) return "";
  const s0 = o.stops[0]; const list = ovStops(o);
  const bg = o.kind === "solid" ? ovColor(s0.c, s0.a) : o.kind === "radial" ? `radial-gradient(circle at ${o.cx ?? 50}% ${o.cy ?? 50}%,${list})` : `linear-gradient(${o.angle ?? 180}deg,${list})`;
  return `background:${bg};${o.blend && o.blend !== "normal" ? `mix-blend-mode:${o.blend};` : ""}`;
}
const ovLayer = (o, cls = "sec") => `<i class="ov ${cls}" style="${ovCSS(o)}"></i>`;
const palVars = (pal) => { const [ink, pri, sec, paper, pop] = pal || PALETTES.webshow.c; return `--p-ink:${ink};--p-acc:${pri};--p-acc2:${sec};--p-paper:${paper};--p-pop:${pop};`; };
const OV_HERO_FULL = () => ({ kind: "linear", angle: 0, blend: "normal", stops: [{ c: "ink", a: 88, p: 0 }, { c: "ink", a: 0, p: 70 }] });
function secOv(s) { if (!s) return null; if (s.ov !== undefined) return s.ov; return s.type === "hero" && s.layout === "full" ? OV_HERO_FULL() : null; }
function slideOv(sl) {
  if (sl.ov) return sl.ov; const a = sl.shade ?? 45; const al = sl.align || "bottom";
  if (al === "center") return { kind: "solid", blend: "normal", stops: [{ c: "#000000", a: Math.round(a * .7), p: 0 }] };
  return { kind: "linear", angle: al === "top" ? 180 : 0, blend: "normal", stops: [{ c: "#000000", a, p: 0 }, { c: "#000000", a: Math.round(a * .55), p: 45 }, { c: "#000000", a: Math.round(a * .15), p: 100 }] };
}
/* ---------- appointment scheduler helpers ---------- */
function schedDays(c) {
  const out = []; const days = (c.days || [1, 2, 3, 4, 5]).map(Number); const ahead = Math.min(60, +c.ahead || 14); const t = new Date(); t.setHours(0, 0, 0, 0);
  for (let k = 0; k < ahead && out.length < 14; k++) { const d = new Date(t.getTime() + k * 864e5); if (!days.includes(d.getDay())) continue; if (k === 0 && !schedSlots(c, d).length) continue;
    out.push({ iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, wk: d.toLocaleDateString("en-GB", { weekday: "short" }), dd: d.getDate(), mon: d.toLocaleDateString("en-GB", { month: "short" }) }); }
  return out;
}
function schedSlots(c, day) {
  const d = typeof day === "string" ? new Date(day + "T00:00") : day; const [sh, sm] = String(c.start || "09:00").split(":").map(Number), [eh, em] = String(c.end || "16:00").split(":").map(Number);
  const step = Math.max(10, +c.duration || 30); const out = []; const nowT = Date.now() + 30 * 6e4;
  for (let m = sh * 60 + sm; m + step <= eh * 60 + em; m += step) { const at = new Date(d); at.setHours(Math.floor(m / 60), m % 60, 0, 0); if (at.getTime() < nowT) continue; out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`); }
  return out;
}
function schedTimesHTML(c, iso) { const sl = schedSlots(c, iso); return sl.length ? sl.map(t => `<button type="button" class="st" data-bk-time="${t}">${t}</button>`).join("") : `<p style="opacity:.7">No open times this day.</p>`; }
/* ---------- Show Page renderer (component library) ---------- */
function pageTheme(dir) {
  const [ink, pri, sec, paper, pop] = dir?.palette || PALETTES.webshow.c; const dark = dir?.mode === "dark";
  const bg = dark ? ink : paper, fg = dark ? paper : ink; const fp = FONT_PAIRS[dir?.fontPair] || FONT_PAIRS.grotesk;
  const r = { sharp: "0px", soft: "14px", round: "28px" }[dir?.radius || "soft"];
  return `--p-bg:${bg};--p-fg:${fg};--p-acc:${pri};--p-acc2:${sec};--p-pop:${pop};--p-ink:${ink};--p-paper:${paper};--p-on:${lum(pri) > .6 ? ink : "#ffffff"};--p-card:color-mix(in srgb,${fg} 6%,${bg});--p-line:color-mix(in srgb,${fg} 16%,${bg});--p-head:${fp.head};--p-body:${fp.body};--p-r:${r};--p-hw:${fp.w || 800};--p-hw3:${fp.w3 || 700}` + lookVars(dir);
}
/* visual identity: buttons, cards, headings, spacing and background */
function lookVars(dir) {
  const v = dir?.vis || {}; const [ink, pri, , paper, pop] = dir?.palette || PALETTES.webshow.c; let o = "";
  const btn = { pill: "--p-btn-r:999px;", square: "--p-btn-r:0px;", outline: "--p-btn-bg:transparent;--p-btn-fg:currentColor;--p-btn-bd:2px solid currentColor;", hard: `--p-btn-r:0px;--p-btn-bd:2px solid ${ink};--p-btn-sh:4px 4px 0 ${ink};`, glow: `--p-btn-r:999px;--p-btn-sh:0 10px 28px -6px ${pri}aa;` }[v.btn];
  const card = { outline: "--p-card-bg:transparent;--p-card-bd:1px solid color-mix(in srgb,currentColor 22%,transparent);", shadow: "--p-card-sh:0 18px 40px -18px rgba(0,0,0,.35);", hard: `--p-card-bd:2px solid ${ink};--p-card-sh:6px 6px 0 ${ink};`, color: `--p-card-bg:color-mix(in srgb,${pri} 16%,transparent);`, none: "--p-card-bg:transparent;" }[v.card];
  const head = { upper: "--p-hcase:uppercase;--p-htrack:.01em;", tight: "--p-htrack:-.045em;", wide: "--p-hcase:uppercase;--p-htrack:.12em;" }[v.head];
  const space = { compact: "--p-pad:48px;", airy: "--p-pad:112px;" }[v.space];
  const bg = { grid: "--p-bgimg:linear-gradient(color-mix(in srgb,currentColor 7%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,currentColor 7%,transparent) 1px,transparent 1px);--p-bgsize:44px 44px;",
    dots: "--p-bgimg:radial-gradient(color-mix(in srgb,currentColor 14%,transparent) 1.2px,transparent 1.6px);--p-bgsize:22px 22px;",
    glow: `--p-bgimg:radial-gradient(55% 45% at 78% 0%,${pri}55,transparent 70%),radial-gradient(45% 35% at 8% 18%,${pop}2e,transparent 70%);--p-bgsize:auto;`,
    grain: "--p-bgimg:url(data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27160%27%20height%3D%27160%27%3E%3Cfilter%20id%3D%27n%27%3E%3CfeTurbulence%20type%3D%27fractalNoise%27%20baseFrequency%3D%27.9%27%20numOctaves%3D%272%27%2F%3E%3CfeColorMatrix%20values%3D%270%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%20.07%200%27%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20filter%3D%27url%28%23n%29%27%2F%3E%3C%2Fsvg%3E);--p-bgsize:160px 160px;" }[v.bg];
  return ";" + [btn, card, head, space, bg].filter(Boolean).join("");
}
function renderPage(page, { imgs = {}, editing = false, live = false, href = "" } = {}) {
  const E = (i, p, v, tag = "span", cls = "") => `<${tag} ${cls ? `class="${cls}"` : ""} data-e="${i}:${p}" ${editing ? 'contenteditable="true" spellcheck="false"' : ""}>${esc(v)}</${tag}>`;
  const IMG = (id, s) => { const m = imgs[id] || imgs[Object.keys(imgs)[0]]; const pos = s && s.fx != null ? `;object-position:${s.fx}% ${s.fy ?? 50}%` : ""; return m ? `<div class="imw"><img alt="${esc(m.alt || "")}" src="${m.src}" style="${m.style || ""}${pos}" data-img-sec="${s ? 1 : 0}" draggable="false">${m.ov ? ovLayer(m.ov, "img") : ""}${s ? ovLayer(secOv(s)) : ""}</div>` : `<div class="noimg"></div>`; };
  const fieldLabel = { name: "Name", email: "Email", phone: "Phone", company: "Company", date: "Preferred date", message: "Message" };
  const one = (s, i) => {
    switch (s.type) {
      case "hero": return `<section class="s hero ${s.layout}${s.flip ? " flip" : ""}">${s.layout === "full" ? `${IMG(s.visualId, s)}` : ""}<div class="in"><div style="display:grid;gap:20px;justify-items:${s.layout === "center" ? "center" : "start"}">${s.eyebrow ? E(i, "eyebrow", s.eyebrow, "div", "eb") : ""}${E(i, "headline", s.headline, "h1")}${E(i, "subhead", s.subhead, "p", "sub")}<div class="row"><button class="bt" data-go="form">${E(i, "cta", s.cta)}</button>${s.cta2 ? `<button class="bt alt" data-go="next">${E(i, "cta2", s.cta2)}</button>` : ""}</div></div>${s.layout !== "full" ? `${IMG(s.visualId, s)}` : ""}</div></section>`;
      case "benefits": return `<section class="s"><div class="in">${E(i, "title", s.title, "h2")}<div class="cards">${arr(s.items).map((it, j) => `<div class="cd"><i class="k"></i>${E(i, `items.${j}.title`, it.title, "h3")}${E(i, `items.${j}.text`, it.text, "p")}</div>`).join("")}</div></div></section>`;
      case "features": return `<section class="s"><div class="in">${E(i, "title", s.title, "h2")}<div class="feat">${arr(s.items).map((it, j) => `<div>${E(i, `items.${j}.title`, it.title, "h3")}${E(i, `items.${j}.text`, it.text, "p")}</div>`).join("")}</div></div></section>`;
      case "image": return `<section class="s imgs"><div class="in"><figure>${IMG(s.visualId, s)}${s.caption || editing ? E(i, "caption", s.caption, "figcaption") : ""}</figure></div></section>`;
      case "stats": return `<section class="s"><div class="in"><div class="stats">${arr(s.items).map((it, j) => `<div><b>${E(i, `items.${j}.value`, it.value)}</b>${E(i, `items.${j}.label`, it.label)}</div>`).join("")}</div></div></section>`;
      case "proof": return `<section class="s proof"><div class="in"><blockquote>${E(i, "quote", s.quote)}</blockquote>${E(i, "author", s.author, "div", "eb")}</div></section>`;
      case "faq": return `<section class="s faq"><div class="in">${E(i, "title", s.title, "h2")}<div>${arr(s.items).map((it, j) => `<details ${editing ? "open" : ""}><summary>${E(i, `items.${j}.q`, it.q)}</summary>${E(i, `items.${j}.a`, it.a, "p")}</details>`).join("")}</div></div></section>`;
      case "form": return `<section class="s form" data-anchor="form"><div class="in"><div style="display:grid;gap:14px;align-content:start">${E(i, "title", s.title, "h2")}${E(i, "text", s.text, "p")}</div><form class="fm" data-live="${live ? 1 : 0}" novalidate>${arr(s.fields).map(f => `<label>${fieldLabel[f]}${f === "message" ? `<textarea name="${f}" id="f_${f}"></textarea>` : `<input name="${f}" id="f_${f}" type="${f === "email" ? "email" : f === "date" ? "date" : f === "phone" ? "tel" : "text"}" ${f === "email" || f === "name" ? "required" : ""}>`}</label>`).join("")}<button class="bt" type="submit">${E(i, "button", s.button)}</button><div class="err" hidden></div><div class="ok" hidden>${esc(s.success || "Thanks!")}</div></form></div></section>`;
      case "scheduler": { const c = s.tool || {}; const days = schedDays(c); const d0 = days[0];
        return `<section class="s sched" data-anchor="book"><div class="in"><div style="display:grid;gap:12px;align-content:start">${E(i, "title", s.title || c.title || "Book a time", "h2")}${E(i, "intro", s.intro ?? c.intro ?? "", "p")}<div class="sched-svc"><b>${esc(c.service || "Appointment")}</b><span>${+c.duration || 30} min</span></div></div>
          <div class="sched-card fm" data-sched="${esc(JSON.stringify({ start: c.start, end: c.end, duration: c.duration, service: c.service }))}" data-live="${live ? 1 : 0}">
            ${days.length ? `<div class="sched-days" role="group" aria-label="Choose a day">${days.map((d, k) => `<button type="button" class="sd" data-bk-day="${d.iso}" aria-pressed="${k === 0}"><span>${d.wk}</span><b>${d.dd}</b><small>${d.mon}</small></button>`).join("")}</div>
            <div class="sched-times" role="group" aria-label="Choose a time">${schedTimesHTML(c, d0.iso)}</div>
            <form class="sched-form" novalidate hidden><div class="sched-pick"></div><label>Name<input name="name" required autocomplete="name"></label><label>Email<input name="email" type="email" required autocomplete="email"></label><button class="bt" type="submit">Confirm booking</button><div class="err" hidden></div></form>
            <div class="ok" hidden>${esc(c.confirm || "Thanks! Your time is booked.")}</div>` : `<p>No bookable days set yet.</p>`}
          </div></div></section>`; }
      case "cta": return `<section class="s ctab"><div class="in">${E(i, "headline", s.headline, "h2")}${E(i, "text", s.text, "p")}<button class="bt" data-go="form">${E(i, "button", s.button)}</button></div></section>`;
      case "footer": return `<footer class="foot"><div class="in"><div>${E(i, "business", s.business, "b")}${s.note || editing ? " · " + E(i, "note", s.note) : ""}</div>${E(i, "contact", s.contact, "div")}</div></footer>`;
    }
    return "";
  };
  return page.sections.map((s, i) => { if (s.hidden) return ""; let h = one(s, i) || ""; if (editing) h = h.replace(/^<(section|footer)/, `<$1 data-sec="${i}"`); if (s.css) h = h.replace(/^<(section|footer)/, `<$1 style="${s.css}"`); if (href && !editing) h = h.replace(/<button class="bt" data-go="form">([\s\S]*?)<\/button>/g, `<a class="bt" href="${esc(href)}" target="_blank" rel="noopener">$1</a>`); return h; }).join("");
}


/* Showrunner always takes a short, natural pause before it answers, even when the answer is instant. */
const minWait = (t0, ms = 1100) => new Promise(ok => setTimeout(ok, Math.max(0, ms - (Date.now() - t0))));
