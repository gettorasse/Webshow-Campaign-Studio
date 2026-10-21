/* ============================================================
   Node registry: types, ports, previews, inspectors, builders
   ============================================================ */
const P = (d) => `<svg class="icon" viewBox="0 0 16 16">${d}</svg>`;
const ICON = {
  spark: `<svg class="icon" viewBox="0 0 16 16" style="fill:currentColor;stroke:none"><path d="M8 1.5 9.4 6.6 14.5 8 9.4 9.4 8 14.5 6.6 9.4 1.5 8 6.6 6.6Z"/></svg>`,
  grid: P('<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>'),
  nodes: P('<rect x="1.5" y="2" width="5" height="4" rx="1"/><rect x="9.5" y="10" width="5" height="4" rx="1"/><path d="M6.5 4h2a2 2 0 0 1 2 2v4"/>'),
  chat: P('<path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z"/>'),
  image: P('<rect x="2" y="2.5" width="12" height="11" rx="1.5"/><circle cx="6" cy="6.5" r="1.2"/><path d="m2.5 12 4-4 3 3 2-2 2.5 2.5"/>'),
  signal: P('<path d="M8 9.5v4M5 7a4.2 4.2 0 0 1 6 0M3 5a7 7 0 0 1 10 0"/><circle cx="8" cy="9" r=".8"/>'),
  sliders: P('<path d="M3 4h10M3 8h10M3 12h10"/><circle cx="6" cy="4" r="1.3" style="fill:var(--chrome)"/><circle cx="10" cy="8" r="1.3" style="fill:var(--chrome)"/><circle cx="5" cy="12" r="1.3" style="fill:var(--chrome)"/>'),
  search: P('<circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/>'),
  plus: P('<path d="M8 3v10M3 8h10"/>'),
  x: P('<path d="m4 4 8 8M12 4l-8 8"/>'),
  back: P('<path d="M10 3 5 8l5 5"/>'),
  chev: P('<path d="m6 4 4 4-4 4"/>'),
  down: P('<path d="m4 6 4 4 4-4"/>'),
  up: P('<path d="m4 10 4-4 4 4"/>'),
  text: P('<path d="M3 4V3h10v1M8 3v10M6 13h4"/>'),
  palette: P('<path d="M8 2a6 6 0 1 0 0 12c1 0 1.5-.6 1.5-1.4 0-1.2-1-1.3-1-2.3 0-.8.6-1.3 1.4-1.3H12a2 2 0 0 0 2-2C14 4.4 11.3 2 8 2Z"/><circle cx="5" cy="7" r=".8"/><circle cx="7.5" cy="4.8" r=".8"/><circle cx="10.5" cy="5.3" r=".8"/>'),
  doc: P('<path d="M4 1.8h5.5L12.5 5v9.2H4z"/><path d="M9.5 1.8V5h3M6 8h4.5M6 10.5h4.5"/>'),
  layout: P('<rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 6h12M6.5 6v7.5"/>'),
  popup: P('<rect x="2" y="2.5" width="12" height="11" rx="1.5"/><rect x="5" y="5.5" width="6" height="5" rx="1"/>'),
  slides: P('<rect x="4" y="3" width="8" height="10" rx="1"/><path d="M2 5v6M14 5v6"/>'),
  ad: P('<path d="M2.5 3.5h11v9h-11z"/><path d="M5 9.5l1.5-4 1.5 4M5.4 8.4h2.2M10 5.5v4M10 7.5h2"/>'),
  rocket: P('<path d="M9.5 2.5c2 0 4 2 4 4L8 12 4 8z"/><path d="M5.5 9.5 3 12.5M4 8 2.5 7.5 5 5h3M8 12l.5 1.5L11 11V8"/>'),
  cursor: P('<path d="M3.5 2.5 12 8l-4 1-1.5 4z"/>'),
  hand: P('<path d="M5.5 8V4a1 1 0 0 1 2 0v3.5M7.5 7V3a1 1 0 0 1 2 0v4M9.5 7V4a1 1 0 0 1 2 0v5.5a4 4 0 0 1-4 4h-.5a4 4 0 0 1-3.2-1.6L2.5 9.8a1 1 0 0 1 1.5-1.3L5.5 10"/>'),
  comment: P('<path d="M8 13.5a5.5 5.5 0 1 0-4.8-2.8L2.5 13.5l2.8-.7A5.5 5.5 0 0 0 8 13.5Z"/>'),
  fit: P('<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/>'),
  minus: P('<path d="M3 8h10"/>'),
  eye: P('<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z"/><circle cx="8" cy="8" r="2"/>'),
  share: P('<circle cx="4" cy="8" r="1.8"/><circle cx="12" cy="4" r="1.8"/><circle cx="12" cy="12" r="1.8"/><path d="m5.6 7.1 4.8-2.3M5.6 8.9l4.8 2.3"/>'),
  menu: P('<path d="M2.5 4h11M2.5 8h11M2.5 12h11"/>'),
  plug: P('<path d="M6 1.5v3M10 1.5v3M3.5 4.5h9v2.5a4.5 4.5 0 0 1-9 0zM8 11.5v3"/>'),
  ext: P('<path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M12 9.5v4H2.5V4h4"/>'),
  sidebar: P('<rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M6 2.5v11"/>'),
  inspector: P('<rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M10 2.5v11"/>'),
  check: P('<path d="m3 8.5 3 3 7-7"/>'),
  send: P('<path d="M8 13V3M4 7l4-4 4 4"/>'),
  trash: P('<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 9h5.6l.7-9"/>'),
  copy: P('<rect x="5" y="5" width="8.5" height="8.5" rx="1.2"/><path d="M11 5V3.5A1 1 0 0 0 10 2.5H3.5a1 1 0 0 0-1 1V10a1 1 0 0 0 1 1H5"/>'),
  upload: P('<path d="M8 10.5V2.5M5 5.5l3-3 3 3M2.5 10v3.5h11V10"/>'),
  play: P('<path d="M4.5 3 12.5 8l-8 5z"/>'),
  video: P('<rect x="1.5" y="3.5" width="9.5" height="9" rx="1.5"/><path d="m11 7 3.5-2v6L11 9"/>'),
  quiz: P('<circle cx="8" cy="8" r="6"/><path d="M6.3 6.3a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1v.4M8 11.6v.1"/>'),
  form: P('<rect x="2.5" y="2.5" width="11" height="3" rx="1"/><rect x="2.5" y="7" width="11" height="3" rx="1"/><path d="M2.5 12.5h6"/>'),
  calc: P('<rect x="3" y="1.5" width="10" height="13" rx="1.5"/><path d="M5.5 4.5h5M5.5 8h.1M8 8h.1M10.5 8h.1M5.5 11h.1M8 11h.1M10.5 11h.1"/>'),
  table: P('<rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M2 10h12M6 6.5v7M10 6.5v7"/>'),
  bot: P('<rect x="2.5" y="5" width="11" height="8" rx="2"/><path d="M8 5V2.5M6 9h.1M10 9h.1"/>'),
  mail: P('<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="m2.5 4.5 5.5 4 5.5-4"/>'),
  game: P('<path d="M4.5 5h7a3 3 0 0 1 3 3.2l-.2 2.3a1.6 1.6 0 0 1-2.8.9L10 10H6l-1.5 1.4a1.6 1.6 0 0 1-2.8-.9l-.2-2.3A3 3 0 0 1 4.5 5Z"/><path d="M5 7.2v1.6M4.2 8h1.6M10.5 7.5h.1M11.5 8.6h.1"/>'),
  motion: P('<path d="M2 11c2-6 4-6 6 0s4 6 6 0"/>'),
  meta: P('<path d="M2 10.5C2 7 3.5 4.5 5.2 4.5c2.4 0 3.2 7 5.6 7 1.4 0 2.7-1.6 2.7-3.8S12.3 4.5 10.8 4.5C8.4 4.5 7.6 11.5 5.2 11.5 3.6 11.5 2 10.5 2 10.5"/>'),
  sparkle: `<svg class="icon" viewBox="0 0 16 16" style="fill:currentColor;stroke:none"><path d="M8 1.5 9.4 6.6 14.5 8 9.4 9.4 8 14.5 6.6 9.4 1.5 8 6.6 6.6Z"/></svg>`,
};
const PT_LABEL = { text: "Text", image: "Image", style: "Style", page: "Page", overlay: "Tool", post: "Post" };
ASPECT["4:3"] = [1200, 900];

const GOAL_OPTS = [["leads", "Generate leads"], ["bookings", "Drive bookings"], ["sell", "Sell a product"], ["launch", "Launch something new"], ["event", "Promote an event"], ["awareness", "Increase awareness"]];
const TRIGGERS = [["load", "On page load"], ["delay", "After a delay"], ["scroll", "After scrolling"], ["exit", "On exit intent"]];
const FREQS = [["always", "Every visit"], ["session", "Once per session"], ["once", "Only once"]];

const NT = {
  brief: {
    label: "Brief", cat: "content", icon: "doc", color: "#a39cf4", desc: "Business, offer, audience and the one action",
    inputs: [], outputs: [{ k: "text", t: "text", label: "Brief" }],
    params: () => ({ business: "", offer: "", audience: "", goal: "leads", cta: "", facts: "" }),
  },
  text: {
    label: "Text", cat: "content", icon: "text", color: "#a39cf4", desc: "Copy, notes or an offer, editable with AI",
    inputs: [], outputs: [{ k: "text", t: "text", label: "Text" }],
    params: () => ({ text: "" }),
  },
  image: {
    label: "Image", cat: "content", icon: "image", color: "#86b4e0", desc: "Upload, adjust or make concept art",
    inputs: [{ k: "style", t: "style", label: "Palette" }], outputs: [{ k: "image", t: "image", label: "Image" }],
    params: () => ({ source: "concept", src: "", assetId: "", alt: "", prompt: "", motif: MOTIFS[Math.floor(Math.random() * MOTIFS.length)], seed: 0, overlay: "", aspect: "4:3", adj: { b: 100, c: 100, s: 100, w: 0, h: 0, blur: 0 }, fx: 50, fy: 50 }),
  },
  style: {
    label: "Style guide", cat: "content", icon: "palette", color: "#a3c493", desc: "Palette, type pair, corners and mode",
    inputs: [{ k: "image", t: "image", label: "Pick colours from" }], outputs: [{ k: "style", t: "style", label: "Style" }],
    params: () => ({ palette: PALETTES.webshow.c.slice(), fontPair: "pixel", mode: "dark", radius: "soft" }),
  },
  page: {
    label: "Landing page", cat: "block", icon: "layout", color: "#6b7fff", wide: true, desc: "A publishable page from proven sections",
    inputs: [{ k: "text", t: "text", label: "Copy & brief", multi: true }, { k: "images", t: "image", label: "Images", multi: true }, { k: "style", t: "style", label: "Style" }, { k: "overlays", t: "overlay", label: "Tools", multi: true }],
    outputs: [{ k: "page", t: "page", label: "Page" }],
    params: () => ({ goal: "", hero: "auto", sections: [], options: [] }),
  },
  popup: {
    label: "Popup", cat: "block", icon: "popup", color: "#dc9ab4", desc: "Overlay with trigger, frequency and dates",
    inputs: [{ k: "text", t: "text", label: "Offer copy", multi: true }, { k: "image", t: "image", label: "Image" }, { k: "style", t: "style", label: "Style" }], outputs: [{ k: "overlay", t: "overlay", label: "Overlay" }],
    params: () => ({ headline: "", body: "", cta: "", email: true, success: "Thanks! Check your inbox.", position: "center", trigger: "exit", delay: 8, scroll: 50, freq: "session", start: "", end: "" }),
  },
  carousel: {
    label: "Social carousel", cat: "block", icon: "slides", color: "#d6bd85", desc: "Swipeable post with slides and caption",
    inputs: [{ k: "text", t: "text", label: "Copy & brief", multi: true }, { k: "images", t: "image", label: "Images", multi: true }, { k: "style", t: "style", label: "Style" }], outputs: [],
    params: () => ({ platform: "Instagram", count: 5, slides: [], caption: "", hashtags: [] }),
  },
  ad: {
    label: "Google ad", cat: "block", icon: "ad", color: "#a3a9bf", desc: "Responsive search ad with limits checked",
    inputs: [{ k: "text", t: "text", label: "Copy & brief", multi: true }], outputs: [],
    params: () => ({ headlines: [], descriptions: [], url: "", keywords: "" }),
  },
  publish: {
    label: "Publish", cat: "output", icon: "rocket", color: "#c9dc7c", desc: "Put a page live and collect leads",
    inputs: [{ k: "page", t: "page", label: "Page" }], outputs: [],
    params: () => ({ slug: "", title: "", desc: "", live: false, at: 0 }),
  },
};
const BUILDABLE = new Set(["page", "popup", "carousel", "ad"]);
const LIB_SOON = [
  ["video", "Video", "Soon", "AI video and uploads"], ["motion", "Motion", "Soon", "Scroll and hover animation presets"], ["quote", "Testimonials", "Soon", "Customer reviews as a page section"],
  ["quiz", "Quiz", "Soon", "Lead quiz with scoring"], ["form", "Multi-step form", "Soon", "Qualify leads step by step"], ["calc", "Calculator", "Soon", "Price or savings calculator"],
  ["table", "Comparison table", "Soon", "Plans side by side"], ["mail", "Email", "Soon", "Follow-up sequence"], ["game", "Mini game", "Soon", "Playful lead capture"],
];

/* ---------- graph helpers ---------- */
const G = {
  nodes: () => Object.values(S.nodes),
  edgesTo: (id, port) => Object.values(S.edges).filter(e => e.to === id && (!port || e.toPort === port)),
  edgesFrom: (id) => Object.values(S.edges).filter(e => e.from === id),
  up(id, port) { return this.edgesTo(id, port).map(e => S.nodes[e.from]).filter(Boolean).sort((a, b) => a.y - b.y || a.x - b.x); },
  inDef(n, port) { return NT[n.type].inputs.find(p => p.k === port); },
  outDef(n, port) { return NT[n.type].outputs.find(p => p.k === port); },
  stale(n) {
    if (!BUILDABLE.has(n.type) || !n.builtAt) return false;
    const ups = this.edgesTo(n.id).filter(e => n.type !== "popup" || e.toPort === "text").map(e => S.nodes[e.from]).filter(Boolean);
    return ups.some(u => (u.updatedAt || 0) > n.builtAt && !["popup", "chatbot", "scheduler"].includes(u.type));
  },
};
function styleOf(n) {
  const s = G.up(n.id, "style")[0];
  return s ? styleValue(s) : null;
}
function styleValue(n) { const p = n.p; return { palette: p.palette, fontPair: p.fontPair, mode: p.mode, radius: p.radius }; }
function imgFilter(p) { const a = p.adj || {}; return `filter:brightness(${(a.b ?? 100) / 100}) contrast(${(a.c ?? 100) / 100}) saturate(${(a.s ?? 100) / 100}) sepia(${(a.w ?? 0) / 100}) hue-rotate(${a.h ?? 0}deg) blur(${a.blur ?? 0}px);object-position:${p.fx ?? 50}% ${p.fy ?? 50}%`; }
function imageValue(n, scale = .55) {
  const p = n.p;
  let src = p.src;
  if (p.source === "concept" || !src) { const st = styleOf(n); src = visualURL({ id: n.id, motif: p.motif, seed: p.seed, overlay: p.overlay, aspect: p.aspect || "4:3" }, st?.palette || PALETTES.webshow.c, st?.fontPair || "pixel", scale); }
  return { src, style: imgFilter(p), alt: p.alt || n.title, ov: p.ov && p.ov.kind !== "none" ? p.ov : null };
}
function textValue(n) {
  if (n.type === "brief") { const p = n.p; const g = GOAL_OPTS.find(x => x[0] === p.goal)?.[1] || p.goal; return [p.business && `Business: ${p.business}`, p.offer && `Offer: ${p.offer}`, p.audience && `Audience: ${p.audience}`, g && `Goal: ${g}`, p.cta && `Main action: ${p.cta}`, p.facts && `Facts we can back up: ${p.facts}`].filter(Boolean).join("\n"); }
  return n.p.text || "";
}
function textsInto(n, port = "text") { return G.up(n.id, port).map(u => ({ title: u.title, type: u.type, text: textValue(u) })).filter(t => t.text); }
function factsInto(n) { return G.up(n.id, "text").filter(u => u.type === "brief").map(u => u.p.facts).join(" "); }
function briefOf(n) { return G.up(n.id, "text").find(u => u.type === "brief")?.p || null; }
function imgsInto(n, port = "images", scale = .6) { const m = {}; G.up(n.id, port).forEach((u, i) => (m["i" + i] = imageValue(u, scale))); return m; }
function pageImgId(n, vid) { const ups = G.up(n.id, "images"); if (!vid) return ""; if (/^i\d+$/.test(vid)) return ups[+vid.slice(1)]?.id || ups[0]?.id || ""; return ups.some(u => u.id === vid) ? vid : ups[0]?.id || ""; }
function pageValue(n, scale = .6) {
  const st = styleOf(n); const ups = G.up(n.id, "images");
  const tools = G.up(n.id, "overlays");
  const overlays = tools.map(u => ({ id: u.id, title: u.title, type: u.type, ...u.p, css: toolCss(u, n), ...(u.type === "popup" ? { pimg: popupImgOf(u, scale) } : {}), ...(u.type === "chatbot" ? { kb: botKnowledge(u, n), biz: briefOf(u)?.business || briefOf(n)?.business || cur()?.name || "" } : {}) }));
  const imgs = {}; ups.forEach(u => (imgs[u.id] = imageValue(u, scale)));
  const sections = (n.p.sections || []).map(x => x.visualId ? { ...x, visualId: pageImgId(n, x.visualId) } : x.type === "scheduler" ? (tools.some(t => t.id === x.toolId) && S.nodes[x.toolId] ? { ...x, tool: { ...S.nodes[x.toolId].p }, hidden: x.hidden || !popupActive({ start: S.nodes[x.toolId].p.from, end: S.nodes[x.toolId].p.until }) } : { ...x, hidden: true }) : x).map(x => x.sty ? { ...x, css: sectionCss(n, x) } : x);
  return { sections, imgs, theme: pageTheme(st || { palette: PALETTES.webshow.c, fontPair: "pixel", mode: "dark", radius: "soft" }), overlays, href: linkInfo(n, "")?.url || "" };
}
function pagesFeedingPopup(n) { return G.edgesFrom(n.id).map(e => S.nodes[e.to]).filter(x => x?.type === "page"); }

/* ---------- node previews (inside the card) ---------- */
function nodeBody(n) {
  const p = n.p;
  switch (n.type) {
    case "brief": return p.business || p.offer ? `<div class="pv-text"><b>${esc(p.business || "Untitled business")}</b>\n${esc(p.offer)}${p.cta ? "\n→ " + esc(p.cta) : ""}</div>` : `<div class="pv-text">Add the business, offer and the one action.</div>`;
    case "text": return `<div class="pv-text">${p.text ? esc(p.text) : "Write copy or ask AI to draft it."}</div>`;
    case "image": { const v = imageValue(n, .3); return `<div class="pv-imw" style="${palVars(styleOf(n)?.palette)}"><img class="pv-img" alt="" src="${v.src}" style="${v.style}" draggable="false">${v.ov ? ovLayer(v.ov, "img") : ""}${imgTextHTML(n)}</div>`; }
    case "style": { const f = FONT_PAIRS[p.fontPair] || FONT_PAIRS.pixel; return `<div class="pv-pal">${styleValue(n).palette.map(c => `<i style="background:${c}"></i>`).join("")}</div><div class="pv-font"><b style="font-family:${f.head};font-weight:${f.w || 700}">Aa</b><span class="faint" style="font-size:11.5px">${esc(LOOKS[p.look]?.label || "Custom")} · ${esc(f.label)} · ${p.mode}</span></div>`; }
    case "page": {
      if (!p.sections?.length) return `<div class="pv-text">Wire in copy, images and a style, then Build.</div>`;
      const v = pageValue(n, .35); return `<div class="pv-page"><div class="sp" style="${v.theme}">${renderPage({ sections: v.sections.slice(0, 3) }, { imgs: v.imgs })}</div></div>`;
    }
    case "popup": {
      const st = pagesFeedingPopup(n).map(pg => styleOf(pg)).find(Boolean) || { palette: PALETTES.webshow.c };
      const [ink, pri, , paper] = st.palette; const dark = st.mode === "dark";
      return `<div class="pv-pop" style="background:color-mix(in srgb,${dark ? ink : paper} 70%,#000)"><div class="card" style="background:${dark ? ink : paper};color:${dark ? paper : ink}">${(() => { const im = popupImgOf(n, .25); return im && popLayout({ ...p, pimg: im }) !== "none" ? `<span class="pim" style="background-image:url(${im.src})"></span>` : ""; })()}<b>${esc(p.headline || "Popup headline")}</b><span style="opacity:.75">${esc((p.body || "Short offer text").slice(0, 70))}</span><i style="background:${pri};color:${lum(pri) > .6 ? ink : "#fff"}">${esc(p.cta || "Claim")}</i></div></div><div class="pv-rule">${ruleChips(p)}</div>`;
    }
    case "carousel": {
      if (!p.slides?.length) return `<div class="pv-text">Wire in copy and images, then Build ${p.count} slides.</div>`;
      const st = styleOf(n) || { palette: PALETTES.webshow.c };
      return `<div class="pv-car">${p.slides.slice(0, 4).map((s, i) => { const id = slideImg(n, s, i); const im = id && S.nodes[id] ? imageValue(S.nodes[id], .25) : null; const so = s.ov || (im ? slideOv(s) : null); return `<div class="slide ${im ? "" : "txt"} has-ov" style="${palVars(st.palette)}${im ? `background-image:url(${im.src});background-position:${s.fx ?? 50}% ${s.fy ?? 50}%` : `background:${st.palette[i % 2 ? 1 : 0]}`};color:#fff">${im?.ov ? ovLayer(im.ov, "img") : ""}${ovLayer(so)}<span>${esc(s.title)}</span></div>`; }).join("")}</div>`;
    }
    case "ad": {
      if (!p.headlines?.length) return `<div class="pv-text">Wire in a brief, then Build headlines and descriptions.</div>`;
      return `<div class="pv-ad"><small>Sponsored · ${esc(linkDomain(n) || p.url || "yourdomain.fi")}</small><b>${esc(p.headlines.slice(0, 3).join(" | "))}</b><span class="muted">${esc(p.descriptions[0] || "")}</span></div>`;
    }
    case "publish": {
      const pg = G.up(n.id, "page")[0];
      return `<div class="pv-pub">${p.live ? `<span class="chip st-live"><i></i>Live</span><span class="mono" style="font-size:11.5px;overflow-wrap:anywhere">/${esc(p.slug)}</span>` : `<span class="chip"><i></i>Draft</span><span class="muted" style="font-size:12px">${pg ? "Ready to publish " + esc(pg.title) : "Wire in a landing page"}</span>`}</div>`;
    }
  }
  return toolBody(n);
}
function ruleChips(p) {
  const t = { load: "On load", delay: `After ${p.delay}s`, scroll: `At ${p.scroll}% scroll`, exit: "Exit intent" }[p.trigger];
  const f = { always: "Every visit", session: "Once per session", once: "Only once" }[p.freq];
  const fmt = (d) => d ? new Date(d + "T00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";
  const win = p.start || p.end ? `${fmt(p.start) || "Now"}–${fmt(p.end) || "ongoing"}` : "Always on";
  const active = popupActive(p);
  return `<span class="chip">${t}</span><span class="chip">${f}</span><span class="chip ${active ? "st-approved" : "st-stale"}">${win}</span>`;
}
function popupActive(p, d = new Date()) {
  const day = localISO(d.getTime());
  if (p.start && day < p.start) return false;
  if (p.end && day > p.end) return false;
  return true;
}
function nodeStatus(n) {
  if (n.status === "building") return `<span class="chip st-building"><i></i>Building</span>`;
  if (n.status === "failed") return `<span class="chip st-failed"><i></i>Failed</span>`;
  if (G.stale(n)) return `<span class="chip st-stale">Needs update</span>`;
  if (n.type === "publish" && n.p.live) return `<span class="chip st-live"><i></i>Live</span>`;
  if (n.status === "approved") return `<span class="chip st-approved"><i></i>Approved</span>`;
  if (n.status === "ready") return `<span class="chip st-ready"><i></i>Review</span>`;
  return "";
}

/* ---------- inspector bodies ---------- */
const fP = (n, path, label, opt = {}) => {
  const v = get(n.p, path); const id = `p_${n.id}_${path.replace(/\./g, "_")}`;
  if (opt.ta) return `<label class="fld"><span>${label}</span><textarea class="ta" id="${id}" data-p="${path}" placeholder="${esc(opt.ph || "")}" ${opt.rows ? `style="min-height:${opt.rows * 20}px"` : ""}>${esc(v)}</textarea>${opt.hint ? `<small>${opt.hint}</small>` : ""}</label>`;
  if (opt.sel) return `<label class="fld"><span>${label}</span><select class="sel" id="${id}" data-p="${path}">${opt.sel.map(([k, l]) => `<option value="${esc(k)}" ${String(v) === String(k) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
  if (opt.check) return `<label class="check"><input type="checkbox" id="${id}" data-p="${path}" ${v ? "checked" : ""}> ${label}</label>`;
  return `<label class="fld"><span>${label}</span><input class="inp ${opt.max && String(v || "").length > opt.max ? "warn" : ""}" id="${id}" data-p="${path}" type="${opt.type || "text"}" value="${esc(v)}" placeholder="${esc(opt.ph || "")}" ${opt.min != null ? `min="${opt.min}"` : ""} ${opt.maxv != null ? `max="${opt.maxv}"` : ""}>${opt.hint ? `<small>${opt.hint}</small>` : ""}</label>`;
};
function inspectorBody(n) {
  const p = n.p; const ai = !!AI.fn;
  switch (n.type) {
    case "brief": return `${briefFillBox(n)}<div class="grp">${fP(n, "business", "Business", { ph: "Kivi Sauna Co." })}${fP(n, "offer", "What we're promoting", { ta: 1, ph: "Weekend sauna rental, delivered and set up" })}${fP(n, "audience", "Who it's for", { ta: 1 })}${fP(n, "goal", "Goal", { sel: GOAL_OPTS })}${fP(n, "cta", "The one action", { ph: "Book a weekend" })}${fP(n, "facts", "Facts we can back up", { ta: 1, hint: "Only these can appear as numbers, prices or claims." })}</div>`;
    case "text": return `<div class="grp">${fP(n, "text", "Text", { ta: 1, rows: 8, ph: "Write the copy, or ask AI below." })}</div>
      <div class="grp"><h4>Rewrite with AI</h4><div class="swrow">${["Shorter", "Punchier", "More premium", "In Finnish", "In English"].map(t => `<button class="btn sm" data-act="rewrite" data-t="${t}" ${ai ? "" : "disabled"}>${t}</button>`).join("")}</div>
      <div style="display:flex;gap:6px"><input class="inp" id="rw_${n.id}" placeholder="${ai ? "Or say how to change it…" : "Connect AI to rewrite"}" ${ai ? "" : "disabled"}><button class="btn" data-act="rewrite" ${ai ? "" : "disabled"}>${ICON.sparkle}</button></div></div>`;
    case "image": {
      const a = p.adj; const sl = (k, l, min, max, unit = "") => `<label class="adj"><span>${l}</span><input type="range" id="adj_${n.id}_${k}" min="${min}" max="${max}" data-p="adj.${k}" value="${a[k]}"><output>${a[k]}${unit}</output></label>`;
      return `<div class="grp"><div class="seg"><button data-act="imgsrc" data-v="concept" aria-pressed="${p.source === "concept"}">Concept art</button><button data-act="imgsrc" data-v="ai" aria-pressed="${p.source === "ai"}">AI image</button><button data-act="imgsrc" data-v="upload" aria-pressed="${p.source === "upload"}">Upload</button></div>
      ${p.source === "ai" ? `${fP(n, "prompt", "Describe the image", { ta: 1, ph: "e.g. A wood-fired sauna on a lakeshore at dusk, steam rising" })}<button class="btn primary" style="justify-self:start" data-act="genimg" ${AI.fn ? "" : "disabled"}>${ICON.sparkle} ${p.src ? "Regenerate" : "Generate"}</button><small class="faint">${AI.fn ? "Showrunner draws an original illustration in the wired style's palette. Photo-real image models plug in during the alpha." : "Open Studio in Claude to generate images with AI."}</small>` : p.source === "upload" ? `<label class="btn" style="justify-self:start" for="up_${n.id}">${ICON.upload} ${p.src ? "Replace image" : "Upload image"}</label><input type="file" id="up_${n.id}" accept="image/*" hidden data-change="upload">` : `<div class="g2">${fP(n, "motif", "Composition", { sel: MOTIFS.map(m => [m, m[0].toUpperCase() + m.slice(1)]) })}${fP(n, "aspect", "Aspect", { sel: [["4:3", "4:3"], ["16:9", "16:9"], ["4:5", "4:5"], ["1:1", "1:1"], ["9:16", "9:16"]] })}</div><button class="btn" style="justify-self:start" data-act="reroll">${ICON.spark} New variation</button><small class="faint">Concept frames use the wired style's palette. Image models plug in during the alpha.</small>`}</div>
      ${imageTextGroup(n)}<div class="grp"><h4>Adjust</h4>${sl("b", "Brightness", 40, 160)}${sl("c", "Contrast", 40, 180)}${sl("s", "Saturation", 0, 200)}${sl("w", "Warmth", 0, 80)}${sl("h", "Hue", -180, 180, "°")}${sl("blur", "Blur", 0, 8, "px")}
      <label class="adj"><span>Focus X</span><input type="range" id="fx_${n.id}" min="0" max="100" data-p="fx" value="${p.fx}"><output>${p.fx}%</output></label><label class="adj"><span>Focus Y</span><input type="range" id="fy_${n.id}" min="0" max="100" data-p="fy" value="${p.fy}"><output>${p.fy}%</output></label>
      <button class="btn sm ghost" style="justify-self:start" data-act="adjreset">Reset adjustments</button></div>
      <div class="grp"><h4>Description</h4>${fP(n, "alt", "Alt text", { ta: 1, ph: "Describe what's in the image" })}${p.source === "upload" && p.src && ai ? `<button class="btn sm" style="justify-self:start" data-act="describe">${ICON.sparkle} Describe with AI</button>` : ""}</div>`;
    }
    case "style": {
      const f = FONT_PAIRS[p.fontPair] || FONT_PAIRS.pixel; const up = G.up(n.id, "image")[0];
      return `${designStyleGroup(n)}<div class="grp"><h4>Colour presets</h4><div class="swrow">${Object.entries(PALETTES).map(([k, v]) => `<button class="preset" title="${v.label}" data-act="preset" data-k="${k}">${v.c.map(c => `<i style="background:${c}"></i>`).join("")}</button>`).join("")}</div>
      ${up ? `<button class="btn sm" style="justify-self:start" data-act="extract">${ICON.palette} Pick colours from “${esc(up.title)}”</button>` : `<small class="faint">Wire an image into this node to pick colours from it.</small>`}</div>
      <div class="grp"><h4>Palette</h4><div class="swrow">${p.palette.map((c, i) => `<label style="display:grid;gap:3px;justify-items:center;font-size:10.5px;color:var(--faint)"><input type="color" id="pc_${n.id}_${i}" data-p="palette.${i}" value="${c}">${["Ink", "Primary", "Second", "Paper", "Pop"][i]}</label>`).join("")}</div></div>
      <div class="grp"><h4>Type & shape</h4>${fP(n, "fontPair", "Type pair", { sel: Object.entries(FONT_PAIRS).map(([k, v]) => [k, v.label]) })}<div style="font:${f.w || 700} 26px/1.1 ${f.head}">The quick show</div><div class="g2">${fP(n, "mode", "Page mode", { sel: [["dark", "Dark"], ["light", "Light"]] })}${fP(n, "radius", "Corners", { sel: [["sharp", "Sharp"], ["soft", "Soft"], ["round", "Round"]] })}</div></div>${G.up(n.id, "palette")[0] ? `<small class="faint">Colours come from the wired “${esc(G.up(n.id, "palette")[0].title)}”.</small>` : ""}${lookTuneGroup(n)}`;
    }
    case "page": {
      const ins = { t: G.up(n.id, "text").length, i: G.up(n.id, "images").length, s: G.up(n.id, "style").length, o: G.up(n.id, "overlays").length };
      return `<div class="grp">${fP(n, "goal", "What should this page do?", { ta: 1, ph: "e.g. Get summer weekend bookings from friend groups" })}${fP(n, "hero", "Hero layout", { sel: [["auto", "Let AI choose"], ["split", "Split"], ["center", "Centered"], ["full", "Full image"]] })}
      <small class="faint">Using ${ins.t} text, ${ins.i} image${ins.i === 1 ? "" : "s"}, ${ins.s ? "1 style" : "no style"}${ins.o ? `, ${ins.o} tool${ins.o === 1 ? "" : "s"}` : ""}.</small></div>
      ${p.sections?.length ? `<div class="grp"><h4>Sections</h4>${p.sections.map((s, i) => `<div class="secrow ${s.hidden ? "off" : ""}"><b>${s.type}${s.type === "hero" ? " · " + s.layout : ""}</b><button class="ib" data-act="secmove" data-i="${i}" data-d="-1" aria-label="Move up" ${i === 0 ? "disabled" : ""}>${ICON.up}</button><button class="ib" data-act="secmove" data-i="${i}" data-d="1" aria-label="Move down" ${i === p.sections.length - 1 ? "disabled" : ""}>${ICON.down}</button><button class="ib" data-act="sechide" data-i="${i}" aria-label="${s.hidden ? "Show" : "Hide"} section">${ICON.eye}</button>${s.visualId ? `<button class="ib" data-act="secimg" data-i="${i}" aria-label="Switch image" title="Switch image" style="font-size:11px;width:auto;max-width:90px;padding:0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(S.nodes[pageImgId(n, s.visualId)]?.title || "Image")}</button>` : ""}</div>`).join("")}
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn primary" data-act="preview" data-mode="edit">${ICON.sliders} Open page editor</button><button class="btn" data-act="preview">${ICON.eye} Preview</button></div></div>` : ""}
      ${customBox(n)}`;
    }
    case "popup": {
      const pages = pagesFeedingPopup(n);
      return `<div class="grp">${fP(n, "headline", "Headline", { ph: "Book this week, get 10% off" })}${fP(n, "body", "Body", { ta: 1 })}<div class="g2">${fP(n, "cta", "Button")}${fP(n, "position", "Position", { sel: [["center", "Centered modal"], ["bottom", "Bottom bar"], ["corner", "Corner card"]] })}</div>${fP(n, "email", "Collect an email address", { check: 1 })}${p.email ? fP(n, "success", "Thank-you message") : ""}</div>
      <div class="grp"><h4>When it shows</h4>${fP(n, "trigger", "Trigger", { sel: TRIGGERS })}${p.trigger === "delay" ? fP(n, "delay", "Delay in seconds", { type: "number", min: 1, maxv: 120 }) : ""}${p.trigger === "scroll" ? fP(n, "scroll", "Scroll depth %", { type: "number", min: 10, maxv: 100 }) : ""}${fP(n, "freq", "Frequency", { sel: FREQS })}
      <div class="g2">${fP(n, "start", "Active from", { type: "date" })}${fP(n, "end", "Active until", { type: "date" })}</div><div class="swrow">${ruleChips(p)}</div>
      ${pages.length ? `<small class="faint">Layered on ${pages.map(x => "“" + esc(x.title) + "”").join(", ")}.</small><button class="btn" style="justify-self:start" data-act="previewpop">${ICON.eye} Preview on page</button>` : `<small class="faint">Wire this node's Overlay output into a landing page's Popups input.</small>`}</div>
      ${popupImageGroup(n)}${toolStyleGroup(n)}${customBox(n)}`;
    }
    case "carousel": return `${p.slides?.length ? `<div class="grp"><h4>Social</h4><button class="btn" style="justify-self:start" data-act="socopen" data-id="${n.id}">${ICON.share} Publish to social</button>${(p.posts || []).length ? `<small class="faint">${p.posts.filter(x => x.at <= Date.now()).length} published · ${p.posts.filter(x => x.at > Date.now()).length} scheduled. See them in Live.</small>` : ""}</div>` : ""}<div class="grp"><div class="g2">${fP(n, "platform", "Platform", { sel: [["Instagram", "Instagram"], ["LinkedIn", "LinkedIn"], ["Facebook", "Facebook"]] })}${fP(n, "count", "Slides", { sel: [3, 4, 5, 6, 7].map(x => [x, x]) })}</div></div>
      ${p.slides?.length ? `<div class="grp"><h4>Slides</h4>${p.slides.map((s, i) => `<div class="wellbox" style="padding:8px;gap:6px"><span class="faint" style="font-size:11px">Slide ${i + 1}</span><input class="inp" id="sl_${n.id}_${i}_t" data-p="slides.${i}.title" value="${esc(s.title)}"><textarea class="ta" style="min-height:44px" id="sl_${n.id}_${i}_x" data-p="slides.${i}.text">${esc(s.text)}</textarea></div>`).join("")}${fP(n, "caption", "Caption", { ta: 1 })}<div class="faint" style="font-size:12px">${(p.hashtags || []).map(h => "#" + esc(h)).join(" ")}</div></div>` : ""}${customBox(n)}`;
    case "ad": return `<div class="grp">${(() => { const li = linkInfo(n, "google"); return li ? `<div class="li" style="padding:2px 0"><span class="nico" style="--nc:${NT.link.color}">${ICON.link}</span><span class="t"><b style="font-weight:500">Final URL: ${esc(li.display)}</b><span>${li.live ? "Tracked as google / paid" : "Not live yet: publish the page before the ad runs"}</span></span></div>` : `<small class="faint">Wire a Link node into this ad to set its final URL.</small>`; })()}${fP(n, "keywords", "Keywords", { ph: "mobile sauna rental, sauna hire uusimaa" })}</div>
      ${p.headlines?.length ? `<div class="grp"><h4>Headlines · max 30</h4>${p.headlines.map((h, i) => `<div style="display:grid;grid-template-columns:minmax(0,1fr) 30px;gap:6px;align-items:center"><input class="inp ${h.length > 30 ? "warn" : ""}" id="ah_${n.id}_${i}" data-p="headlines.${i}" value="${esc(h)}"><span class="cnt ${h.length > 30 ? "over" : ""}">${h.length}</span></div>`).join("")}</div>
      <div class="grp"><h4>Descriptions · max 90</h4>${p.descriptions.map((h, i) => `<div style="display:grid;grid-template-columns:minmax(0,1fr) 30px;gap:6px;align-items:start"><textarea class="ta ${h.length > 90 ? "warn" : ""}" style="min-height:44px" id="ad_${n.id}_${i}" data-p="descriptions.${i}">${esc(h)}</textarea><span class="cnt ${h.length > 90 ? "over" : ""}">${h.length}</span></div>`).join("")}</div>` : ""}${customBox(n)}`;
    case "publish": {
      const pg = G.up(n.id, "page")[0];
      return `<div class="grp"><h4>Schedule</h4><div class="g2">${fP(n, "start", "Goes live", { type: "date" })}${fP(n, "end", "Taken down after", { type: "date" })}</div><small class="faint">Visitors see the page only between these dates. Plan everything together on the Timeline.</small><button class="btn sm ghost" style="justify-self:start" data-act="view" data-v="timeline">${ICON.timeline} Open timeline</button></div><div class="grp">${fP(n, "slug", "Page address", { ph: "kivi-sauna", hint: "Served from this Studio page in the prototype; customer.webshow.ai/… in production." })}${fP(n, "title", "SEO title")}${fP(n, "desc", "SEO description", { ta: 1 })}</div>
      <div class="grp">${!pg ? `<small class="faint">Wire a landing page's Page output into this node.</small>` : !pg.p.sections?.length ? `<small class="faint">Build “${esc(pg.title)}” first.</small>` : p.live ? `<div class="wellbox"><span class="chip st-live" style="justify-self:start"><i></i>Live since ${ago(p.at)}</span><span class="mono" style="font-size:12px;overflow-wrap:anywhere">/${esc(p.slug)}</span><div class="swrow"><button class="btn" data-act="openlive">${ICON.eye} Open live page</button><button class="btn" data-act="publish">Republish</button><button class="btn danger" data-act="unpublish">Unpublish</button></div></div>` : `<button class="btn cta" style="justify-self:start" data-act="publish">Publish “${esc(pg.title)}”</button>`}</div>`;
    }
  }
  return toolInspector(n);
}
function customBox(n) {
  return `<div class="grp"><h4>Make it custom</h4><div class="custom">
    <button data-act="build"><span class="nico" style="--nc:var(--brand)">${ICON.sparkle}</span><span><b>Showrunner does it</b><span>Rebuild from what's wired in</span></span><span class="faint">Credits</span></button>
    <button data-act="editself"><span class="nico" style="background:var(--raised);color:var(--ink);box-shadow:var(--ring)">${ICON.sliders}</span><span><b>Do it yourself</b><span>Edit every field and section here</span></span><span class="faint">Free</span></button>
    <button data-act="order"><span class="nico" style="--nc:#c3a0d8">${ICON.hand}</span><span><b>Our pros do it</b><span>A Webshow designer finishes it for you</span></span><span class="faint">from €490</span></button>
  </div></div>`;
}

/* ---------- builders ---------- */
async function buildNode(n) {
  if (!NT[n.type] || !BUILDABLE.has(n.type)) return;
  setNode(n, { status: "building" }, false); paintNode(n.id);
  try {
    const out = AI.fn ? await BUILD_AI[n.type](n) : BUILD_OFF[n.type](n);
    if (n.type === "carousel" && n.p.slides?.length && out.p.slides) out.p.slides = out.p.slides.map((x, i) => { const o = n.p.slides[i]; if (!o) return x; const keep = {}; ["img", "fx", "fy", "align", "shade", "ov"].forEach(k => o[k] != null && (keep[k] = o[k])); return { ...keep, ...x }; });
    Object.assign(n.p, out.p); n.status = "ready"; n.builtAt = now(); if (n.type === "page") syncToolSections(n);
    hist(n, AI.fn ? "Built by Showrunner" : "Built from template (offline)");
    commitNode(n);
    if (out.decision) await postDecision(n, out.decision);
    toast(`${n.title} built`);
  } catch (e) {
    console.warn(e); n.status = n.p.sections?.length || n.p.headlines?.length || n.p.slides?.length || n.p.headline ? "ready" : "failed"; commitNode(n);
    toast(errCopy(e));
  }
  paintAll();
}
function inputsBlock(n) {
  const t = textsInto(n); const imgs = G.up(n.id, "images");
  return `<input>\n${t.map(x => `[${x.type === "brief" ? "BRIEF" : "TEXT"}: ${x.title}]\n${x.text}`).join("\n\n") || "(no text wired in)"}\n${imgs.length ? "\nIMAGES:\n" + imgs.map((u, i) => `i${i}: ${u.p.alt || u.title}`).join("\n") : ""}\n</input>`;
}
const PAGE_SPEC = `{"sections": 5-8 objects in order, choose from:
 {"type":"hero","layout":"split"|"center"|"full","eyebrow":string,"headline":string,"subhead":string,"cta":string,"cta2":string or "","visualId":"i0"}
 {"type":"benefits","title":string,"items":[3 {"title","text"}]}
 {"type":"features","title":string,"items":[4 {"title","text"}]}
 {"type":"image","visualId":"i1","caption":string}
 {"type":"stats","items":[2-3 {"value","label"}]}  ONLY with numbers from the facts
 {"type":"faq","title":string,"items":[3-5 {"q","a"}]}
 {"type":"form","title":string,"text":string,"fields":subset of ["name","email","phone","company","date","message"],"button":string,"success":string}
 {"type":"cta","headline":string,"text":string,"button":string}
 {"type":"footer","business":string,"contact":string,"note":string}
 Start with hero, end with footer. Only use visualIds that exist in IMAGES. Move the visitor toward the main action.,
 "headlineOptions": [3 alternative hero headlines, max 9 words]}`;
const BUILD_AI = {
  async page(n) {
    const r = await AI.json(`You build a landing page for Webshow Studio by filling a section schema.\n${RULES}\n\nPAGE GOAL: ${n.p.goal || "(use the brief's goal)"}\nHERO LAYOUT: ${n.p.hero === "auto" ? "choose" : n.p.hero}\n${inputsBlock(n)}\n\nReply with ONLY JSON: ${PAGE_SPEC}`);
    const imgCount = G.up(n.id, "images").length;
    const sections = normSections(r.sections, n, imgCount);
    return { p: { sections, options: arr(r.headlineOptions, 3).map(x => str(x)).filter(Boolean) }, decision: arr(r.headlineOptions, 3).length ? { title: "Which headline leads the page?", body: "Three directions for the hero. Pick one and I'll set it on the page.", options: [sections[0]?.headline, ...arr(r.headlineOptions, 3)].map(x => str(x)).filter((x, i, a) => x && a.indexOf(x) === i).slice(0, 4), apply: "hero.headline" } : null };
  },
  async popup(n) {
    const r = await AI.json(`Write a popup for a landing page.\n${RULES}\nPOSITION: ${n.p.position}; TRIGGER: ${n.p.trigger}; COLLECT EMAIL: ${n.p.email}\n${inputsBlock(n)}\nReply with ONLY JSON: {"headline": string max 8 words, "body": string max 22 words, "cta": string max 4 words, "success": string max 10 words}`);
    return { p: { headline: str(r.headline), body: str(r.body), cta: str(r.cta, "Claim it"), success: str(r.success, n.p.success) } };
  },
  async carousel(n) {
    const c = +n.p.count || 5;
    const r = await AI.json(`Write a ${n.p.platform} carousel post with exactly ${c} slides that tells one story and ends on the main action.\n${RULES}\n${inputsBlock(n)}\nReply with ONLY JSON: {"slides":[${c} {"title": string max 6 words, "text": string max 18 words}], "caption": string max 300 chars, "hashtags": [3-5 strings without #]}`);
    return { p: { slides: arr(r.slides, c).map(s => ({ title: str(s?.title), text: str(s?.text) })), caption: str(r.caption), hashtags: arr(r.hashtags, 6).map(h => str(h).replace(/^#/, "")) } };
  },
  async ad(n) {
    const r = await AI.json(`Write a Google responsive search ad.\n${RULES}\nKEYWORDS: ${n.p.keywords || "(infer)"}\n${inputsBlock(n)}\nReply with ONLY JSON: {"headlines":[6 strings, each max 30 characters], "descriptions":[3 strings, each max 90 characters], "keywords": string comma-separated}`);
    return { p: { headlines: arr(r.headlines, 8).map(h => str(h)), descriptions: arr(r.descriptions, 4).map(h => str(h)), keywords: n.p.keywords || str(r.keywords) } };
  },
};
function normSections(list, n, imgCount) {
  const ok = ["hero", "benefits", "features", "image", "stats", "faq", "form", "cta", "footer"];
  const facts = factsInto(n);
  let secs = arr(list, 10).filter(s => ok.includes(s?.type)).map(s => {
    const o = { id: uid("s"), hidden: false }; Object.entries(s).forEach(([k, v]) => { o[k] = Array.isArray(v) ? v.map(x => (x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([a, b]) => [a, str(b)])) : str(x))) : typeof v === "string" ? v.trim() : v; });
    if (o.visualId && !(+String(o.visualId).slice(1) < imgCount)) o.visualId = imgCount ? "i0" : "";
    if (o.type === "hero") { o.layout = ["split", "center", "full"].includes(o.layout) ? o.layout : "split"; if (n.p.hero !== "auto") o.layout = n.p.hero; if (!imgCount && o.layout !== "center") o.layout = "center"; }
    if (o.type === "image" && !imgCount) return null;
    if (o.type === "stats" && !(facts && arr(o.items).every(i => facts.includes((str(i.value).match(/\d+/) || ["§"])[0])))) return null;
    if (o.type === "form") o.fields = arr(o.fields, 6).filter(f => ["name", "email", "phone", "company", "date", "message"].includes(f));
    return o;
  }).filter(Boolean);
  if (!secs.length || secs[0].type !== "hero") secs.unshift({ id: uid("s"), type: "hero", layout: imgCount ? "split" : "center", eyebrow: "", headline: "Your headline", subhead: "", cta: "Get started", cta2: "", visualId: imgCount ? "i0" : "", hidden: false });
  if (!secs.some(s => s.type === "footer")) secs.push({ id: uid("s"), type: "footer", business: briefOf(n)?.business || "", contact: "", note: "", hidden: false });
  return secs;
}
const BUILD_OFF = {
  page(n) {
    const b = briefOf(n) || {}; const t = textsInto(n).find(x => x.type === "text")?.text || ""; const ic = G.up(n.id, "images").length; const cta = b.cta || "Get in touch";
    const first = (t.split(/\n|\.\s/)[0] || b.offer || "Your offer, made simple").slice(0, 70);
    return { p: { sections: normSections([
      { type: "hero", layout: ic ? "split" : "center", eyebrow: b.business || "", headline: first, subhead: b.offer || t.slice(0, 140), cta, cta2: "", visualId: "i0" },
      { type: "benefits", title: `Why ${b.business || "us"}`, items: [{ title: "Made for you", text: b.audience || "Built around what you need." }, { title: "Clear offer", text: b.offer || "One simple offer." }, { title: "Easy next step", text: cta + "." }] },
      ic > 1 ? { type: "image", visualId: "i1", caption: "" } : null,
      { type: "faq", title: "Good to know", items: [{ q: "How do I get started?", a: cta + "." }, { q: "Who is this for?", a: b.audience || "Anyone who needs it." }] },
      { type: "form", title: cta, text: b.offer || "", fields: ["name", "email", "message"], button: cta, success: "Thanks! We'll be in touch soon." },
      { type: "footer", business: b.business || "", contact: "", note: "" },
    ].filter(Boolean), n, ic) } };
  },
  popup(n) { const b = G.up(n.id, "text").map(u => u.type === "brief" ? u.p : null).find(Boolean) || {}; const t = textsInto(n)[0]?.text || ""; return { p: { headline: n.p.headline || (t.split("\n")[0] || "Before you go").slice(0, 60), body: n.p.body || (b.offer || "Leave your email and we'll send you the details.").slice(0, 140), cta: n.p.cta || b.cta || "Send it to me" } }; },
  carousel(n) { const b = briefOf(n) || {}; const c = +n.p.count || 5; const lines = [b.offer, b.audience, ...(b.facts || "").split(/\.\s|\n/)].filter(Boolean); return { p: { slides: Array.from({ length: c }, (_, i) => ({ title: i === 0 ? (b.business || "New") : i === c - 1 ? (b.cta || "Learn more") : (lines[i - 1] || "Slide " + (i + 1)).slice(0, 40), text: i === c - 1 ? "Link in bio." : "" })), caption: `${b.business || ""} — ${b.offer || ""}`.trim(), hashtags: [slugify(b.business || "webshow").replace(/-/g, "")] } }; },
  ad(n) { const b = briefOf(n) || {}; const h = [b.business, b.offer, b.cta, "Book online today", "Delivered and set up"].filter(Boolean).map(x => x.slice(0, 30)); return { p: { headlines: h.slice(0, 6), descriptions: [(b.offer || "").slice(0, 90), (b.facts || b.audience || "").slice(0, 90)].filter(Boolean) } }; },
};
