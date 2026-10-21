/* ============================================================
   Visual identity: design styles for the Style guide, a simple
   Colour palette block, and one colour per family of nodes
   ============================================================ */
const LOOKS = {
  webshow: { label: "Webshow", desc: "Dark, display headlines, soft glow", palette: ["#0a0b1b", "#6b7fff", "#aeb5ff", "#f4f8ff", "#fd4415"], fontPair: "pixel", mode: "dark", radius: "soft", vis: { btn: "pill", card: "outline", head: "", space: "", bg: "glow" } },
  swiss: { label: "Swiss minimal", desc: "Grid, white space, one sharp accent", palette: ["#111111", "#e63027", "#d9d9d9", "#ffffff", "#1f4fff"], fontPair: "swiss", mode: "light", radius: "sharp", vis: { btn: "square", card: "outline", head: "tight", space: "airy", bg: "" } },
  brutal: { label: "Brutalist", desc: "Raw borders, hard shadows, loud type", palette: ["#000000", "#ffe600", "#ff4fd8", "#f2f0e6", "#0047ff"], fontPair: "brutal", mode: "light", radius: "sharp", vis: { btn: "hard", card: "hard", head: "upper", space: "", bg: "" } },
  pop: { label: "Colour pop", desc: "Saturated, playful, big display type", palette: ["#1b1035", "#ff4d8d", "#ffd84d", "#fff7ec", "#36c5a0"], fontPair: "pop", mode: "light", radius: "round", vis: { btn: "pill", card: "color", head: "", space: "", bg: "dots" } },
  saas: { label: "Dark SaaS", desc: "Product-grade, glowing accents", palette: ["#07080f", "#7c6bff", "#3ad6ff", "#eef0ff", "#9bff8a"], fontPair: "saas", mode: "dark", radius: "soft", vis: { btn: "glow", card: "outline", head: "tight", space: "airy", bg: "glow" } },
  editorial: { label: "Editorial", desc: "Serif headlines, paper, quiet rules", palette: ["#1a1714", "#b8442e", "#e8dfd0", "#f7f2e9", "#2b4a6f"], fontPair: "editorial", mode: "light", radius: "sharp", vis: { btn: "outline", card: "none", head: "", space: "airy", bg: "grain" } },
  luxury: { label: "Quiet luxury", desc: "Warm neutrals, spaced capitals", palette: ["#22201c", "#8a6d4b", "#d8cbb8", "#f3eee6", "#4b5a4a"], fontPair: "elegant", mode: "light", radius: "sharp", vis: { btn: "outline", card: "none", head: "wide", space: "airy", bg: "grain" } },
  mono: { label: "Tech mono", desc: "Terminal green on black, grid lines", palette: ["#0b0f0c", "#38ff8b", "#1d3b2a", "#e6ffe9", "#ff5c39"], fontPair: "mono", mode: "dark", radius: "sharp", vis: { btn: "outline", card: "outline", head: "upper", space: "compact", bg: "grid" } },
  playful: { label: "Friendly round", desc: "Soft shapes, pastel, approachable", palette: ["#2a1b4d", "#6c5ce7", "#ffeaa7", "#fdfbff", "#ff7675"], fontPair: "round", mode: "light", radius: "round", vis: { btn: "pill", card: "shadow", head: "", space: "", bg: "" } },
  nordic: { label: "Nordic calm", desc: "Forest greens, linen, natural", palette: ["#1e2a2e", "#2f6f5e", "#e6d7bf", "#f8f4ec", "#c8643b"], fontPair: "grotesk", mode: "light", radius: "soft", vis: { btn: "", card: "", head: "", space: "", bg: "" } },
};
{ const f = NT.style.params; NT.style.params = () => ({ look: "webshow", vis: clone(LOOKS.webshow.vis), ...f() }); }
NT.style.inputs = [{ k: "image", t: "image", label: "Pick colours from" }, { k: "palette", t: "style", label: "Colours" }];
NT.style.label = "Style guide"; NT.style.desc = "Design style, type, colours and shapes";
NT.palette = {
  label: "Colour palette", cat: "content", icon: "palette", color: "#a3c493", desc: "Five colours for quick changes, no full style guide",
  inputs: [], outputs: [{ k: "style", t: "style", label: "Colours" }],
  params: () => ({ palette: PALETTES.webshow.c.slice(), mode: "light", base: "#6b7fff" }),
};
/* style value: a palette node gives colours only; a style guide can take its colours from a wired palette */
styleValue = function (n) {
  const p = n.p;
  if (n.type === "palette") return { palette: p.palette, fontPair: "grotesk", mode: p.mode || "light", radius: "soft", vis: {} };
  const pal = G.up(n.id, "palette")[0];
  return { palette: pal ? pal.p.palette : p.palette, fontPair: p.fontPair, mode: p.mode, radius: p.radius, vis: p.vis || {} };
};
/* palette from one colour (simple harmony) */
function hexToHsl(h) { let [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let hh = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh /= 6; } return [hh * 360, s, l]; }
function hslToHex(h, s, l) { h = ((h % 360) + 360) % 360 / 360; const f = (n) => { const k = (n + h * 12) % 12; const a = s * Math.min(l, 1 - l); return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255).toString(16).padStart(2, "0"); }; return "#" + f(0) + f(8) + f(4); }
function harmony(base) { const [h, s] = hexToHsl(base); return [hslToHex(h, Math.min(.45, s), .08), base, hslToHex(h + 18, Math.min(.85, s), .8), hslToHex(h, Math.min(.5, s), .97), hslToHex(h + 165, Math.max(.6, s), .55)]; }

/* ---------- inspector pieces ---------- */
function lookCard(k, L, on) {
  const dir = { palette: L.palette, fontPair: L.fontPair, mode: L.mode, radius: L.radius, vis: L.vis }; const fp = FONT_PAIRS[L.fontPair] || FONT_PAIRS.grotesk;
  return `<button class="look ${on ? "on" : ""}" data-act="lookset" data-k="${k}" aria-pressed="${on}" title="${esc(L.desc)}"><div class="sp look-sp" style="${pageTheme(dir)}"><b style="font-family:${fp.head};font-weight:${fp.w || 800}">Aa</b><span class="bt">Go</span><i class="cd"></i></div><span class="look-l"><b>${esc(L.label)}</b><small>${esc(L.desc)}</small></span></button>`;
}
function designStyleGroup(n) {
  return `<div class="grp"><h4>Design style</h4><div class="looks">${Object.entries(LOOKS).map(([k, L]) => lookCard(k, L, n.p.look === k)).join("")}</div><small class="faint">Sets colours, type, shapes, buttons, cards and background in one go. Fine-tune everything below.</small></div>`;
}
function lookTuneGroup(n) {
  const v = n.p.vis || {}; const seg = (k, opts) => `<div class="seg" style="justify-self:start;flex-wrap:wrap">${opts.map(([val, l]) => `<button data-act="visset" data-k="${k}" data-v="${val}" aria-pressed="${(v[k] || "") === val}">${l}</button>`).join("")}</div>`;
  return `<div class="grp"><h4>Look and feel</h4>
    <div class="fld"><span>Buttons</span>${seg("btn", [["", "Rounded"], ["pill", "Pill"], ["square", "Square"], ["outline", "Outline"], ["hard", "Hard shadow"], ["glow", "Glow"]])}</div>
    <div class="fld"><span>Cards</span>${seg("card", [["", "Filled"], ["outline", "Outline"], ["shadow", "Soft shadow"], ["hard", "Hard shadow"], ["color", "Tinted"], ["none", "None"]])}</div>
    <div class="fld"><span>Headings</span>${seg("head", [["", "Normal"], ["tight", "Tight"], ["upper", "Uppercase"], ["wide", "Spaced caps"]])}</div>
    <div class="fld"><span>Spacing</span>${seg("space", [["compact", "Compact"], ["", "Regular"], ["airy", "Airy"]])}</div>
    <div class="fld"><span>Background</span>${seg("bg", [["", "Plain"], ["grid", "Grid"], ["dots", "Dots"], ["glow", "Glow"], ["grain", "Paper grain"]])}</div></div>`;
}
const _ti3 = toolInspector, _tb3 = toolBody, _ts3 = toolStage;
toolInspector = function (n) {
  if (n.type !== "palette") return _ti3(n);
  const p = n.p; const users = G.edgesFrom(n.id).map(e => S.nodes[e.to]).filter(Boolean);
  return `<div class="grp"><h4>From one colour</h4><div class="swrow" style="gap:8px"><input type="color" id="pal_base_${n.id}" data-palbase="1" value="${esc(p.base || p.palette[1])}" aria-label="Base colour"><button class="btn sm" data-act="palgen">${ICON.sparkle} Make a palette</button></div><small class="faint">Pick your brand colour and get matching dark, light, soft and pop colours.</small></div>
    <div class="grp"><h4>Presets</h4><div class="swrow">${Object.entries(PALETTES).map(([k, v]) => `<button class="preset" title="${v.label}" data-act="palpreset" data-k="${k}">${v.c.map(c => `<i style="background:${c}"></i>`).join("")}</button>`).join("")}${Object.entries(LOOKS).map(([k, v]) => `<button class="preset" title="${v.label}" data-act="palpreset" data-l="${k}">${v.palette.map(c => `<i style="background:${c}"></i>`).join("")}</button>`).join("")}</div></div>
    <div class="grp"><h4>Colours</h4><div class="swrow">${p.palette.map((c, i) => `<label style="display:grid;gap:3px;justify-items:center;font-size:10.5px;color:var(--faint)"><input type="color" id="pp_${n.id}_${i}" data-p="palette.${i}" value="${c}">${["Ink", "Primary", "Second", "Paper", "Pop"][i]}</label>`).join("")}</div>
      ${fP(n, "mode", "Page mode", { sel: [["light", "Light"], ["dark", "Dark"]] })}</div>
    <div class="grp"><h4>Used by</h4>${users.map(x => `<div class="li" style="padding:3px 0"><span class="nico" style="--nc:${NT[x.type].color}">${ICON[NT[x.type].icon]}</span><span class="t"><b style="font-weight:500">${esc(x.title)}</b></span></div>`).join("") || `<small class="faint">Wire it into a Style guide's Colours input, or straight into a block's Style input.</small>`}</div>`;
};
toolBody = function (n) {
  if (n.type === "palette") return `<div class="pv-pal">${n.p.palette.map(c => `<i style="background:${c}"></i>`).join("")}</div><div class="pv-rule"><span class="chip">${n.p.mode === "dark" ? "Dark" : "Light"}</span></div>`;
  return _tb3(n);
};
toolStage = function (n) {
  if (n.type !== "style" && n.type !== "palette") return _ts3(n);
  const dir = styleValue(n); const b = briefOf({ id: "" }) || {};
  const secs = [{ type: "hero", layout: "center", eyebrow: cur()?.name || "Your brand", headline: "A headline set in your style", subhead: "This is how your pages, popups and posts look with this style guide.", cta: "Primary action", cta2: "Secondary" },
    { type: "benefits", title: "Cards and details", items: [{ title: "Clear offer", text: "Say what you do in one line." }, { title: "Real proof", text: "Numbers and quotes you can back up." }, { title: "One next step", text: "A single, obvious action." }] },
    { type: "cta", headline: "Ready when you are", text: "Buttons, colours and spacing follow the style.", button: "Book now" }];
  return `<div class="sty-stage"><div class="sty-pal">${dir.palette.map((c, i) => `<div style="background:${c};color:${lum(c) > .55 ? "#0a0b1b" : "#fff"}"><b>${["Ink", "Primary", "Secondary", "Paper", "Pop"][i]}</b><span class="mono">${c}</span></div>`).join("")}</div>
    <div class="pv-page sty-page"><div class="sp" style="${pageTheme(dir)}">${renderPage({ sections: secs }, { imgs: {} })}</div></div></div>`;
};
Object.assign(A, {
  lookset(b) { const n = selNode() || (S.nodeEd && S.nodes[S.nodeEd.id]); if (!n) return; const L = LOOKS[b.dataset.k]; Object.assign(n.p, { look: b.dataset.k, palette: L.palette.slice(), fontPair: L.fontPair, mode: L.mode, radius: L.radius, vis: clone(L.vis) }); hist(n, "Design style: " + L.label); commitNode(n); paintAll(); S.inspFor = null; paintInspector(); if (S.nodeEd) neRepaint(); },
  visset(b) { const n = selNode() || (S.nodeEd && S.nodes[S.nodeEd.id]); if (!n) return; n.p.vis = { ...(n.p.vis || {}), [b.dataset.k]: b.dataset.v }; hist(n, "Look adjusted"); commitNode(n); paintAll(); S.inspFor = null; paintInspector(); if (S.nodeEd) neRepaint(); },
  palpreset(b) { const n = selNode() || (S.nodeEd && S.nodes[S.nodeEd.id]); if (!n) return; n.p.palette = (b.dataset.k ? PALETTES[b.dataset.k].c : LOOKS[b.dataset.l].palette).slice(); if (b.dataset.l) n.p.mode = LOOKS[b.dataset.l].mode; hist(n, "Palette changed"); commitNode(n); paintAll(); S.inspFor = null; paintInspector(); if (S.nodeEd) neRepaint(); },
  palgen() { const n = selNode() || (S.nodeEd && S.nodes[S.nodeEd.id]); if (!n) return; const base = $(`#pal_base_${n.id}`)?.value || n.p.base; n.p.base = base; n.p.palette = harmony(base); hist(n, "Palette made from one colour"); commitNode(n); paintAll(); S.inspFor = null; paintInspector(); if (S.nodeEd) neRepaint(); },
});

/* ---------- one colour per family ---------- */
const NODE_GROUPS = [["text", "Text", "#a39cf4", ["brief", "text", "link"]], ["media", "Images & video", "#86b4e0", ["image"]], ["style", "Graphics & style", "#a3c493", ["style", "palette"]],
  ["web", "Website tools", "#6b7fff", ["page", "popup", "chatbot", "scheduler", "cookie"]], ["content", "Campaign content", "#d6bd85", ["carousel", "ad", "metaad"]], ["out", "Outputs", "#c9dc7c", ["publish", "social", "adchannel"]]];
NODE_GROUPS.forEach(([g, , c, types]) => types.forEach(t => { if (NT[t]) { NT[t].grp = g; NT[t].color = c; } }));
Object.entries(NT).forEach(([k, d]) => { if (!d.grp) { d.grp = d.cat === "output" ? "out" : d.cat === "block" ? "web" : "text"; d.color = NODE_GROUPS.find(x => x[0] === d.grp)[2]; } });
