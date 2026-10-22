/* ============================================================
   Build: a creative asset builder.
   A Show has a shared foundation (its DNA and main style) and assets made from it. Assets are the
   studio's nodes; Build, Assets and Timeline all read the same S.nodes, never copies.

   Relationships. Every wire is one of four kinds, stored on the edge (e.rel, e.role):
     use     a source contributes to an asset      (Image → page: Hero image; Text → page: Copy)
     create  a new asset was made from a source    (Page → carousel: Created from)
     place   an interactive asset sits inside a page (Form → page: Embedded form)
     link    a destination                          (Page → ad: CTA destination; Page → Publish)
   Wires are still the studio's typed ports underneath, so builders keep working.

   This file: block families and names, the Multi-step form and Reference blocks, relationships,
   one-dot connecting, Create from, the foundation panel, change tracking, responses,
   remove-from-canvas vs delete, undo/redo and the library drawer. Styles in build.css.
   ============================================================ */

/* ---------- block families, familiar names ---------- */
ICON.form = ICON.form || P('<rect x="2.5" y="2" width="11" height="12" rx="2"/><path d="M5 5.5h6M5 8h6M5 10.5h3.5"/>');
ICON.ref = P('<path d="M4 2h6l3 3v9H4z"/><path d="M10 2v3h3M6 8.5h5M6 11h3.5"/>');
ICON.undo = P('<path d="M6 4 3 7l3 3"/><path d="M3.5 7H10a3 3 0 0 1 0 6H8"/>');
ICON.redo = P('<path d="m10 4 3 3-3 3"/><path d="M12.5 7H6a3 3 0 0 0 0 6h2"/>');
ICON.wand = ICON.wand || P('<path d="m3 13 7-7M9.5 3.5l.5-1.5.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5L8 4zM12.5 7.5l.3-.9.3.9.9.3-.9.3-.3.9-.3-.9-.9-.3z"/>');
ICON.tray = P('<path d="M2.5 9h3.2l1 1.8h2.6l1-1.8h3.2"/><path d="M4.3 3.5h7.4L13.5 9v3.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V9z"/>');
ICON.connect = P('<circle cx="4" cy="8" r="2"/><circle cx="12" cy="8" r="2"/><path d="M6 8h4"/>');
ICON.check = ICON.check || P('<path d="m3 8.5 3 3 7-7"/>');

NT.form = {
  label: "Multi-step form", cat: "block", icon: "form", color: "#0d9488", desc: "A few easy steps that end in name and email. Place it on a page.",
  inputs: [{ k: "text", t: "text", label: "Brief", multi: true }, { k: "style", t: "style", label: "Style" }],
  outputs: [{ k: "tool", t: "overlay", label: "Place on a page" }],
  params: () => ({ title: "Tell us what you need", intro: "Three quick steps. We'll get back to you within a day.", steps: [], button: "Send", success: "Thanks! We'll be in touch soon." }),
};
NT.ref = {
  label: "Reference", cat: "content", icon: "ref", color: "#0ea5e9", desc: "Facts, FAQs, product info, testimonials or a link to use as source material",
  inputs: [], outputs: [{ k: "text", t: "text", label: "Reference" }],
  params: () => ({ kind: "facts", url: "", text: "" }),
};
const REF_KINDS = [["facts", "Approved facts"], ["faq", "FAQ"], ["product", "Product information"], ["testimonial", "Testimonial"], ["doc", "Document or URL"]];
BUILDABLE.add("form");
if (!NT.quiz.outputs.some(o => o.k === "tool")) NT.quiz.outputs = [...NT.quiz.outputs, { k: "tool", t: "overlay", label: "Place on a page" }];
const FROM_IN = { k: "from", t: "page", label: "Created from" };
["carousel", "ad", "metaad", "quiz", "page"].forEach(k => { if (NT[k] && !NT[k].inputs.some(i => i.k === "from")) NT[k].inputs = [...NT[k].inputs, FROM_IN]; });
Object.assign(NT.carousel, { label: "Instagram carousel" }); Object.assign(NT.ad, { label: "Search ad variations" }); Object.assign(NT.metaad, { label: "Facebook & Instagram ad" });
Object.assign(NT.scheduler, { label: "Booking calendar" }); if (NT.cookie) NT.cookie.label = "Cookie banner"; Object.assign(NT.publish, { label: "Publish page" });
Object.assign(NT.social, { label: "Social posting" }); Object.assign(NT.adchannel, { label: "Ad campaigns" }); Object.assign(NT.page, { label: "Landing page" });
NODE_GROUPS.splice(0, NODE_GROUPS.length,
  ["brief", "Brief", "#5b6cff", ["brief"]], ["style", "Style", "#22b07d", ["style", "palette"]], ["ref", "Reference", "#0ea5e9", ["ref"]], ["text", "Text", "#8b5cf6", ["text"]],
  ["media", "Media", "#ff7a3d", ["image"]], ["page", "Page", "#7c5cf0", ["page"]], ["inter", "Interactive", "#14b8a6", ["form", "quiz", "poll", "chatbot", "scheduler", "popup", "cookie"]],
  ["content", "Content sets", "#f59e0b", ["carousel", "metaad", "ad"]], ["out", "Publishing & links", "#3b82f6", ["publish", "link", "social", "adchannel"]]);
Object.entries(NT).forEach(([k, d]) => { const g = NODE_GROUPS.find(x => x[3].includes(k)); d.grp = g ? g[0] : "out"; });
Object.assign(PL_NODE_C, { form: "#0d9488", ref: "#0ea5e9" }); Object.entries(PL_NODE_C).forEach(([k, c]) => { if (NT[k]) NT[k].color = c; });
for (let i = LIB_SOON.length - 1; i >= 0; i--) if (["quiz", "form"].includes(LIB_SOON[i][0])) LIB_SOON.splice(i, 1);
if (!LIB_SOON.some(x => x[0] === "mail")) LIB_SOON.push(["mail", "Email", "Soon", "Launch emails and sequences"]);

/* the Reference block reads like text to every builder */
{ const _tv = textValue; textValue = function (n) { if (n.type !== "ref") return _tv(n); const k = REF_KINDS.find(x => x[0] === n.p.kind)?.[1] || "Reference"; return [`${k}${n.p.url ? ` (${n.p.url})` : ""}:`, n.p.text].filter(Boolean).join("\n"); }; }

/* ---------- relationships ---------- */
const REL_KINDS = { use: "Use in", create: "Create from", place: "Place inside", link: "Link to" };
function relLabel(a, b, o, i) {
  if (i.k === "from") return "Created from";
  if (i.t === "overlay") return { form: "Embedded form", quiz: "Embedded quiz", chatbot: "Embedded chatbot", popup: "Embedded popup", scheduler: "Embedded booking", cookie: "Cookie banner" }[a.type] || "Placed inside";
  if (i.t === "link") return "CTA destination";
  if (b.type === "link") return "Link to";
  if (b.type === "publish") return "Publishes";
  if (b.type === "social") return "Posts to";
  if (b.type === "adchannel") return i.k === "boost" ? "Boosted" : "Runs as ad";
  if (i.t === "style") return b.type === "image" ? "Palette" : b.type === "style" ? "Colours" : "Style override";
  if (i.t === "image") { if (b.type === "style") return "Colours from"; if (b.type === "page") return G.edgesTo(b.id, "images").length ? "Page image" : "Hero image"; if (b.type === "carousel") return "Slide image"; return "Image"; }
  if (i.t === "text") { if (b.type === "chatbot") return "Knowledge"; if (a.type === "brief") return "Brief override"; if (a.type === "ref") return "Reference"; return b.type === "page" ? "Copy" : "Copy"; }
  return i.label;
}
const relKindOf = (label) => label === "Created from" ? "create" : /^Embedded|^Placed|^Cookie/.test(label) ? "place" : /CTA|Link to|Publishes|Posts to|Runs as|Boosted/.test(label) ? "link" : "use";
function edgeLabel(e) {
  if (e.role) return e.role; const a = S.nodes[e.from], b = S.nodes[e.to]; if (!a || !b) return "";
  const o = G.outDef(a, e.fromPort), i = G.inDef(b, e.toPort); return o && i ? relLabel(a, b, o, i) : "";
}
/* creation dependencies must not loop; destination links may go both ways */
function upstreamHas(startId, targetId) {
  const seen = new Set(); const st = [startId];
  while (st.length) { const id = st.pop(); if (id === targetId) return true; if (seen.has(id)) continue; seen.add(id);
    Object.values(S.edges).filter(e => e.to === id && relKindOf(edgeLabel(e)) !== "link").forEach(e => st.push(e.from)); }
  return false;
}
function relOptions(a, b) {
  if (!a || !b || a.id === b.id || !NT[a.type] || !NT[b.type]) return [];
  const out = [];
  for (const o of NT[a.type].outputs) for (const i of NT[b.type].inputs) {
    if (o.t !== i.t) continue;
    if (Object.values(S.edges).some(e => e.from === a.id && e.to === b.id && e.toPort === i.k)) continue;
    const label = relLabel(a, b, o, i); const kind = relKindOf(label);
    if (kind !== "link" && upstreamHas(a.id, b.id)) continue;
    if (out.some(x => x.label === label)) continue;
    out.push({ o, i, label, kind });
  }
  return out;
}
const TAKES = { text: "text", image: "images", style: "a style", page: "a page", overlay: "forms, quizzes, chatbots, popups or bookings", post: "posts", link: "a destination", ad: "ads" };
function whyNot(a, b) {
  if (a.id === b.id) return "That's the same block.";
  if (!NT[a.type].outputs.length) return `${NT[a.type].label} is an end point. Nothing is made from it on the canvas.`;
  if (Object.values(S.edges).some(e => e.from === a.id && e.to === b.id)) return `“${a.title}” is already connected to “${b.title}”.`;
  if (NT[a.type].outputs.some(o => NT[b.type].inputs.some(i => i.t === o.t)) && upstreamHas(a.id, b.id)) return `That would make a loop: “${b.title}” already feeds “${a.title}”.`;
  const takes = [...new Set(NT[b.type].inputs.map(i => TAKES[i.t]).filter(Boolean))];
  const tip = a.type === "page" && ["carousel", "ad", "metaad", "quiz"].includes(b.type) ? "" : a.type === "page" ? " To make something new from a page, use Create from." : "";
  return takes.length ? `A ${NT[b.type].label.toLowerCase()} takes ${takes.join(", ")}, not a ${NT[a.type].label.toLowerCase()}.${tip}` : `Nothing plugs into a ${NT[b.type].label.toLowerCase()}.`;
}
function applyRel(a, b, op, { quiet } = {}) {
  undoMark();
  const e = connect(a.id, op.o.k, b.id, op.i.k); if (!e) { plToast(whyNot(a, b)); return null; }
  e.rel = op.kind; e.role = op.label; if (!isEx()) Store.put("edges", S.showId, e);
  hist(b, `${op.label}: “${a.title}”`); if (b.type === "page") syncToolSections(b); commitNode(b);
  paintWorld(); S.inspFor = null; paintInspector();
  if (!quiet) plToast(`${op.label} · ${a.title} → ${b.title}`, true);
  return e;
}
function relate(a, b, pt) {
  const opts = relOptions(a, b);
  if (!opts.length) return plToast(whyNot(a, b));
  if (opts.length === 1) return applyRel(a, b, opts[0]);
  S.plRel = { a: a.id, b: b.id, opts };
  plPop(pt.x, pt.y, `<div class="plp-h">How should “${esc(a.title)}” be used?</div>${opts.map((o, k) => `<button class="plp-i" data-act="plrelpick" data-k="${k}"><span class="pl-kind k-${o.kind}">${REL_KINDS[o.kind]}</span><b>${esc(o.label)}</b></button>`).join("")}`);
}
A.plrelpick = (b) => { const r = S.plRel; plPopClose(); if (!r) return; applyRel(S.nodes[r.a], S.nodes[r.b], r.opts[+b.dataset.k]); };

/* ---------- small UI helpers: toast with undo, popover ---------- */
function plToast(msg, undo) {
  let box = $("#pltoast"); if (!box) { box = document.createElement("div"); box.id = "pltoast"; document.body.append(box); }
  box.innerHTML = `<div class="plt" role="status"><span>${esc(msg)}</span>${undo ? `<button data-act="plundo">Undo</button>` : ""}</div>`;
  clearTimeout(plToast.t); plToast.t = setTimeout(() => (box.innerHTML = ""), undo ? 6000 : 4200);
}
function plPop(x, y, html, cls = "") {
  plPopClose(); const el = document.createElement("div"); el.id = "plpop"; el.className = "plpop " + cls; el.innerHTML = html; el.setAttribute("role", "menu"); document.body.append(el);
  const w = el.offsetWidth, h = el.offsetHeight; el.style.left = Math.max(12, Math.min(x, innerWidth - w - 12)) + "px"; el.style.top = Math.max(12, Math.min(y, innerHeight - h - 12)) + "px";
  setTimeout(() => el.querySelector("button:not([disabled])")?.focus(), 0);
}
function plPopClose() { $("#plpop")?.remove(); }
document.addEventListener("pointerdown", (e) => { if ($("#plpop") && !e.target.closest("#plpop")) plPopClose(); }, true);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#plpop")) { plPopClose(); e.stopPropagation(); } }, true);
document.addEventListener("click", () => { /* menu items close themselves */ });

/* ---------- one dot in, one dot out; drag to connect, click to Create from ---------- */
{ const _nh3 = nodeHTML; nodeHTML = function (n) {
  if (n.off) return "";
  const d = NT[n.type]; let h = _nh3(n); if (!d) return h;
  h = h.replace(/<button class="pl-next"[\s\S]*?<\/button>/, "");
  const inT = d.inputs[0]?.t, outT = d.outputs[0]?.t; const multi = S.plMulti?.has(n.id);
  const acts = cfItems(n).length ? `<button data-act="plcfopen" data-id="${n.id}">${ICON.wand} Create from</button>` : "";
  const bar = `<div class="pl-actbar" role="toolbar" aria-label="Actions for ${esc(n.title)}">${acts}${d.outputs.length ? `<button data-act="plconnect" data-id="${n.id}">${ICON.connect} Connect to…</button>` : ""}<button data-act="plmulti" data-id="${n.id}" aria-pressed="${!!multi}">${ICON.check} ${multi ? "Selected" : "Select"}</button><button data-act="plremove" data-id="${n.id}" title="Remove from the canvas (the asset stays in Assets)">${ICON.x} Remove</button></div>`;
  const dots = `${d.inputs.length ? `<span class="pl-dot in" style="--pc:var(--pt-${inT})" aria-hidden="true"></span>` : ""}${d.outputs.length ? `<button class="pl-dot out" data-plout="${n.id}" style="--pc:var(--pt-${outT})" aria-label="Connect or create from ${esc(n.title)}" title="Drag to connect · click to create from it"></button>` : ""}`;
  h = h.replace(/^(\s*<div class="nd[^"]*)"/, `$1${multi ? " pl-multi" : ""}${n.src?.length ? " pl-derived" : ""}"`);
  return h.replace(/<\/div>\s*$/, `${dots}${bar}</div>`);
}; }
let plDrag = null;
document.addEventListener("pointerdown", (e) => {
  const dot = e.target.closest?.(".pl-dot.out"); if (!dot || S.view !== "canvas") return;
  e.stopPropagation(); e.preventDefault();
  const n = S.nodes[dot.dataset.plout]; if (!n) return; const r = dot.getBoundingClientRect();
  plDrag = { id: n.id, sx: e.clientX, sy: e.clientY, moved: false, a: (() => { const [x, y] = toWorld(r.left + r.width / 2, r.top + r.height / 2); return [x, y]; })(), t: NT[n.type].outputs[0].t };
}, true);
window.addEventListener("pointermove", (e) => {
  if (!plDrag) return; if (Math.abs(e.clientX - plDrag.sx) + Math.abs(e.clientY - plDrag.sy) > 5) plDrag.moved = true; if (!plDrag.moved) return;
  drawWires({ a: plDrag.a, b: toWorld(e.clientX, e.clientY), t: plDrag.t });
  const over = document.elementFromPoint(e.clientX, e.clientY)?.closest(".nd"); $$("#nodes .nd.pl-ok,#nodes .nd.pl-no").forEach(x => x.classList.remove("pl-ok", "pl-no"));
  if (over && over.dataset.id !== plDrag.id) over.classList.add(relOptions(S.nodes[plDrag.id], S.nodes[over.dataset.id]).length ? "pl-ok" : "pl-no");
});
window.addEventListener("pointerup", (e) => {
  if (!plDrag) return; const d = plDrag; plDrag = null; $$("#nodes .nd.pl-ok,#nodes .nd.pl-no").forEach(x => x.classList.remove("pl-ok", "pl-no")); drawWires();
  const a = S.nodes[d.id]; if (!a) return;
  if (!d.moved) return openCreateFrom(a, { x: e.clientX + 12, y: e.clientY - 20 });
  const over = document.elementFromPoint(e.clientX, e.clientY)?.closest(".nd");
  if (over && over.dataset.id !== a.id) return relate(a, S.nodes[over.dataset.id], { x: e.clientX + 10, y: e.clientY + 10 });
  const [wx, wy] = toWorld(e.clientX, e.clientY); openCreateFrom(a, { x: e.clientX + 12, y: e.clientY - 20 }, { wx, wy });
});
/* the same without dragging: pick a target from a list (click, keyboard, touch) */
A.plconnect = (b) => {
  const a = S.nodes[b.dataset.id]; if (!a) return; const r = b.getBoundingClientRect();
  const list = Object.values(S.nodes).filter(x => !x.off && x.id !== a.id).map(x => ({ x, o: relOptions(a, x) })).filter(z => z.o.length).sort((p, q) => p.x.title.localeCompare(q.x.title));
  S.plConn = { a: a.id, list: list.flatMap(z => z.o.map(o => ({ b: z.x.id, o }))) };
  plPop(r.left, r.bottom + 8, `<div class="plp-h">Connect “${esc(a.title)}” to…</div>${S.plConn.list.length ? S.plConn.list.map((z, k) => `<button class="plp-i" data-act="plconnpick" data-k="${k}"><span class="pl-kind k-${z.o.kind}">${REL_KINDS[z.o.kind]}</span><b>${esc(S.nodes[z.b].title)}</b><small>${esc(z.o.label)}</small></button>`).join("") : `<p class="plp-note">Nothing on the canvas can take a ${esc(NT[a.type].label.toLowerCase())} yet. Use Create from to make something new.</p>`}`, "wide");
};
A.plconnpick = (b) => { const c = S.plConn; plPopClose(); const z = c?.list[+b.dataset.k]; if (z) applyRel(S.nodes[c.a], S.nodes[z.b], z.o); };

/* wire labels for the selected asset, and its related sources and outputs highlighted */
{ const _dw3 = drawWires; drawWires = function (ghost) {
  _dw3(ghost); const world = $("#world"); if (!world) return;
  let box = $("#pl-elabels"); if (!box) { box = document.createElement("div"); box.id = "pl-elabels"; world.append(box); }
  const sel = S.sel, se = S.selEdge; const rel = new Set();
  box.innerHTML = Object.values(S.edges).filter(e => sel ? e.from === sel || e.to === sel : se === e.id).map(e => {
    rel.add(e.from); rel.add(e.to); const p = $(`#wires path[data-edge="${e.id}"]:not(.hit)`); if (!p) return "";
    let m; try { m = p.getPointAtLength(p.getTotalLength() / 2); } catch { return ""; }
    const lb = edgeLabel(e); return lb ? `<span class="pl-elabel k-${relKindOf(lb)}" style="left:${m.x}px;top:${m.y}px">${esc(lb)}</span>` : "";
  }).join("");
  $$("#nodes .nd").forEach(el => { el.classList.toggle("pl-rel", !!sel && rel.has(el.dataset.id) && el.dataset.id !== sel); el.classList.toggle("pl-dim", !!sel && !rel.has(el.dataset.id) && el.dataset.id !== sel); });
}; }

/* ---------- Create from ---------- */
const ON = () => Object.values(S.nodes).filter(n => !n.off);
const W0 = (n) => (document.querySelector(`#nodes .nd[data-id="${n.id}"]`)?.offsetWidth || nodeW(n));
function placeAfter(sources) {
  if (!sources.length) { const cv = $("#cv"); const [x, y] = cv ? toWorld(cv.getBoundingClientRect().left + cv.clientWidth / 2, cv.getBoundingClientRect().top + cv.clientHeight / 3) : [0, 0]; return [x, y]; }
  return [Math.max(...sources.map(s => s.x + W0(s))) + 120, Math.round(sources.reduce((t, s) => t + s.y, 0) / sources.length)];
}
const srcStamp = (list) => list.map(s => ({ id: s.id, v: s.updatedAt || 0, title: s.title }));
/* what this asset can become */
function cfItems(n) {
  const t = n.type; const L = []; const mk = (label, sub, fn, soon) => L.push({ label, sub, fn, soon });
  if (n.off) return L;
  if (t === "page") {
    mk("Instagram carousel", "Slides from this page's headline, benefits and offer", () => fromPage(n, "carousel"));
    mk("Search ad variations", "Headlines and descriptions from the page", () => fromPage(n, "ad"));
    mk("Facebook & Instagram ad", "Primary text and headline from the page", () => fromPage(n, "metaad"));
    mk("Quiz", "A lead quiz that sends people to this page", () => fromPage(n, "quiz"));
    mk("Alternative page version", "The same materials, a different take", () => fromPage(n, "page"));
    mk("Extract the copy", "The page's words as a reusable Text block", () => extractCopy(n));
    mk("Launch email", "Email isn't part of Webshow yet", null, true);
  } else if (["text", "brief", "ref", "image"].includes(t)) {
    mk("Landing page", "A page draft that uses this", () => createWith("page", [n]));
    mk("Instagram carousel", "Slides that use this", () => createWith("carousel", [n]));
    mk("Facebook & Instagram ad", "An ad that uses this", () => createWith("metaad", [n]));
    if (t !== "image") { mk("Search ad variations", "Headlines from this", () => createWith("ad", [n])); mk("Multi-step form", "Steps that fit this", () => createWith("form", [n])); mk("Chatbot", "Answers from this as its knowledge", () => createWith("chatbot", [n])); mk("Popup", "An offer popup from this", () => createWith("popup", [n])); }
    if (t === "image") mk("Style guide", "Colours picked from this image", () => createWith("style", [n]));
  } else if (["form", "quiz", "chatbot", "popup", "scheduler"].includes(t)) {
    const pg = mainPage();
    if (pg && !G.edgesTo(pg.id, "overlays").some(e => e.from === n.id)) mk(`Place it on “${pg.title}”`, "Embedded on the page, still one asset", () => placeOn(n, pg));
    if (!pg) mk("Landing page with it", "A new page draft with this embedded", () => { const p = outcome("page"); if (p) placeOn(n, p); });
    if (t === "quiz") mk("Instagram post promoting it", "An image post that invites people to take it", () => quizPost(n));
  } else if (["carousel", "ad", "metaad"].includes(t)) {
    mk("Variation", "Same sources, a fresh take", () => variation(n));
  }
  return L;
}
function openCreateFrom(n, pt, at) {
  const items = cfItems(n); if (!items.length) return plToast(`Nothing is made from a ${NT[n.type].label.toLowerCase()} yet.`);
  S.plCF = { id: n.id, items, at };
  plPop(pt.x, pt.y, `<div class="plp-h">${ICON.wand} Create from “${esc(n.title)}”</div>${items.map((it, k) => `<button class="plp-i ${it.soon ? "soon" : ""}" data-act="plcf" data-k="${k}" ${it.soon ? "disabled" : ""}><b>${esc(it.label)}${it.soon ? ` <span class="pl-soon">Soon</span>` : ""}</b><small>${esc(it.sub)}</small></button>`).join("")}<p class="plp-note">Showrunner makes an editable draft and connects it. The original stays as it is.</p>`, "wide");
}
A.plcfopen = (b) => { const n = S.nodes[b.dataset.id]; const r = b.getBoundingClientRect(); openCreateFrom(n, { x: r.left, y: r.bottom + 8 }); };
A.plcf = (b) => { const c = S.plCF; plPopClose(); const it = c?.items[+b.dataset.k]; if (it?.fn) it.fn(); };

/* make an asset, connect its sources with the right relationship, and draft it */
function createWith(type, sources, { at, note } = {}) {
  undoMark();
  const [x, y] = at ? [at.wx, at.wy] : placeAfter(sources);
  const n = addNode(type, x, y, at ? { exact: true } : {});
  n.src = srcStamp(sources);
  for (const s of sources) { const ops = relOptions(s, n); const op = ops.find(o => o.kind !== "create") || ops[0]; if (op) applyRel(s, n, op, { quiet: true }); }
  hist(n, sources.length ? `Created from ${sources.map(s => `“${s.title}”`).join(", ")}` : "Created for the show"); commitNode(n);
  paintWorld(); selectNode(n.id, "settings"); centerOn(n.id);
  if (BUILDABLE.has(n.type)) draft(n, note);
  else plToast(`${NT[type].label} added${sources.length ? ` from ${sources.length === 1 ? "“" + sources[0].title + "”" : sources.length + " blocks"}` : ""}.`, true);
  return n;
}
async function draft(n, note) {
  plToast(`Drafting “${n.title}”${AI.fn ? "" : " from a template (the AI writer runs inside Claude)"}…`);
  await buildNode(n); if (note) plToast(note, true);
}
/* a page's content, read section by section */
function pageParts(pg) {
  const s = pg.p.sections || []; const hero = s.find(x => x.type === "hero") || {}; const ben = s.find(x => x.type === "benefits" || x.type === "features") || {};
  const cta = s.find(x => x.type === "cta") || {}; const form = s.find(x => x.type === "form") || {}; const faq = s.find(x => x.type === "faq") || {};
  const b = briefOf(pg) || {};
  return { headline: hero.headline || b.offer || pg.title, sub: hero.subhead || b.offer || "", eyebrow: hero.eyebrow || b.business || "", items: (ben.items || []).filter(i => i.title), cta: hero.cta || cta.button || form.button || b.cta || "Find out more", ctaText: cta.text || form.text || "", faq: faq.items || [], business: b.business || cur()?.name || "" };
}
function fromPage(pg, type) {
  if (!pg.p.sections?.length) return plToast("Build the page first, then create from it.");
  undoMark();
  const [x, y] = placeAfter([pg]); const n = addNode(type, x, y);
  const op = relOptions(pg, n).find(o => o.kind === "create"); if (op) applyRel(pg, n, op, { quiet: true });
  n.src = srcStamp([pg]); n.title = { carousel: `${pg.title} · carousel`, ad: `${pg.title} · search ads`, metaad: `${pg.title} · Meta ad`, quiz: `Quiz for ${pg.title}`, page: `${pg.title} · version B` }[type] || n.title;
  if (type === "page") G.edgesTo(pg.id).filter(e => ["text", "images", "style"].includes(e.toPort)).forEach(e => { const ed = connect(e.from, e.fromPort, n.id, e.toPort); if (ed) { ed.rel = "use"; ed.role = edgeLabel(ed); if (!isEx()) Store.put("edges", S.showId, ed); } });
  hist(n, `Created from “${pg.title}”`); commitNode(n); paintWorld(); selectNode(n.id, "settings"); centerOn(n.id);
  /* with the AI the builders read the page's copy (see textsInto below); without it, the draft is made directly from the page's sections */
  if (AI.fn || ["quiz", "page"].includes(type)) { draft(n, type === "page" ? "Version B drafted. Compare it with the original before choosing." : null); return n; }
  const P0 = pageParts(pg); const cut = (s, k) => String(s || "").replace(/\s+/g, " ").trim().slice(0, k);
  if (type === "carousel") {
    const slides = [{ title: cut(P0.headline, 60), text: cut(P0.sub, 120) }, ...P0.items.slice(0, 3).map(i => ({ title: cut(i.title, 60), text: cut(i.text, 120) })), { title: cut(P0.cta, 60), text: "Link in bio." }];
    Object.assign(n.p, { slides, count: slides.length, caption: cut(`${P0.headline}. ${P0.sub}`, 300), hashtags: [slugify(P0.business).replace(/-/g, "")].filter(Boolean) });
  } else if (type === "ad") {
    const hs = [P0.headline, P0.cta, ...P0.items.map(i => i.title), P0.business].map(h => cut(h, 30)).filter(Boolean);
    Object.assign(n.p, { headlines: [...new Set(hs)].slice(0, 8), descriptions: [P0.sub, ...P0.items.map(i => i.text), P0.ctaText].map(d => cut(d, 90)).filter(Boolean).slice(0, 4) });
  } else if (type === "metaad") {
    Object.assign(n.p, { primary: cut([P0.sub, P0.items[0]?.text].filter(Boolean).join(" "), 125), headline: cut(P0.headline, 40), desc: cut(P0.business, 30) });
  }
  n.status = "ready"; n.builtAt = now(); n.found = foundSnap(); hist(n, "Drafted from the page's sections"); commitNode(n); paintAll(); selectNode(n.id, "settings");
  plToast(`${NT[type].label} drafted from “${pg.title}”. Edit it freely; the page stays as it is.`, true);
  return n;
}
function extractCopy(pg) {
  undoMark(); const [x, y] = placeAfter([pg]); const n = addNode("text", x, y, { title: `Copy from ${pg.title}`, p: { text: pageCopy(pg.p.sections) } });
  n.src = srcStamp([pg]); hist(n, `Extracted from “${pg.title}”`); commitNode(n); paintWorld(); selectNode(n.id, "settings"); centerOn(n.id);
  plToast("The page's copy is now a Text block you can reuse.", true);
}
function placeOn(n, pg) { const op = relOptions(n, pg).find(o => o.kind === "place"); if (!op) return plToast(whyNot(n, pg)); applyRel(n, pg, op); }
function quizPost(q) {
  undoMark(); const [x, y] = placeAfter([q]); const title = q.p.title || q.title;
  const n = addNode("image", x, y, { title: `Post: ${title}`, p: { overlay: `${title} · take the quiz`, alt: title } }); n.lane = "hook"; n.src = srcStamp([q]);
  hist(n, `Created from “${q.title}”`); commitNode(n); paintWorld(); selectNode(n.id, "settings"); centerOn(n.id);
  plToast("Image post added with the quiz as its headline. It links to the show's page.", true);
}
function variation(n) {
  const ups = G.edgesTo(n.id).map(e => S.nodes[e.from]).filter(Boolean);
  const v = createWith(n.type, ups.filter(u => u.type !== "page"), {}); const pg = ups.find(u => u.type === "page");
  if (pg) { const op = relOptions(pg, v).find(o => o.kind === "create"); if (op) applyRel(pg, v, op, { quiet: true }); }
  v.title = `${n.title} · variation`; commitNode(v); paintNode(v.id);
}
/* builders read a source page's current copy and images */
{ const _ti = textsInto; textsInto = function (n, port = "text") { const r = _ti(n, port); if (port !== "text" || !n) return r; G.edgesTo(n.id, "from").map(e => S.nodes[e.from]).filter(p => p?.type === "page").forEach(pg => r.push({ title: pg.title, type: "text", text: pageCopy(pg.p.sections) })); return r; }; }
INHERIT.images = ((_ii) => (n) => { const pg = G.edgesTo(n.id, "from").map(e => S.nodes[e.from]).find(p => p?.type === "page"); return pg && ["carousel", "metaad", "page"].includes(n.type) ? G.up(pg.id, "images") : _ii(n); })(INHERIT.images);

/* ---------- start from the outcome: "a landing page for this show" ---------- */
const OUTCOMES = [["page", "Landing page"], ["form", "Multi-step form"], ["quiz", "Quiz"], ["chatbot", "Chatbot"], ["carousel", "Instagram carousel"], ["ad", "Search ad variations"], ["metaad", "Facebook & Instagram ad"], ["popup", "Popup"]];
function materials(type) {
  const m = ON().filter(n => ["text", "ref"].includes(n.type) || (n.type === "brief" && ["chatbot", "form"].includes(type)));
  return type === "chatbot" ? m.filter(n => n.type !== "brief" || true) : m;
}
function outcome(type) {
  const pg = mainPage();
  if (["carousel", "ad", "metaad", "quiz"].includes(type) && pg?.p.sections?.length && !pg.off) return fromPage(pg, type);
  const mats = materials(type); const imgs = ["page", "carousel", "metaad"].includes(type) ? kitImages().length : 0;
  const why = [dnaBrief() ? "the show foundation" : "", mats.length ? `${mats.length} text block${mats.length > 1 ? "s" : ""}` : "", imgs ? `${imgs} kit image${imgs > 1 ? "s" : ""}` : ""].filter(Boolean).join(", ");
  return createWith(type, mats, { note: `${NT[type].label} drafted from ${why || "what the show has so far"}.` });
}
A.plcreate = (b) => { const r = b.getBoundingClientRect();
  plPop(r.left, r.bottom + 8, `<div class="plp-h">${ICON.wand} Create for this show</div>${OUTCOMES.map(([k, l]) => `<button class="plp-i" data-act="ploutcome" data-t="${k}"><b>${l}</b><small>${k === "page" ? "Showrunner picks your texts and images" : ["carousel", "ad", "metaad", "quiz"].includes(k) && mainPage()?.p.sections?.length ? "Made from your landing page" : "From the show foundation"}</small></button>`).join("")}<button class="plp-i soon" disabled><b>Launch email <span class="pl-soon">Soon</span></b><small>Email isn't part of Webshow yet</small></button>`, "wide"); };
A.ploutcome = (b) => { plPopClose(); outcome(b.dataset.t); };

/* ---------- several blocks at once ---------- */
S.plMulti = new Set();
A.plmulti = (b) => { const id = b.dataset.id; S.plMulti.has(id) ? S.plMulti.delete(id) : S.plMulti.add(id); paintWorld(); paintMultiBar(); };
document.addEventListener("pointerdown", (e) => {
  if (!e.shiftKey || S.view !== "canvas") return; const nd = e.target.closest?.(".nd"); if (!nd || e.target.closest("button,input,textarea,select")) return;
  e.stopPropagation(); e.preventDefault(); if (S.sel && !S.plMulti.size && S.sel !== nd.dataset.id) S.plMulti.add(S.sel);
  const id = nd.dataset.id; S.plMulti.has(id) ? S.plMulti.delete(id) : S.plMulti.add(id); paintWorld(); paintMultiBar();
}, true);
function paintMultiBar() {
  let bar = $("#plmulti"); const cv = $("#cv"); if (!cv) return;
  const sel = [...S.plMulti].map(id => S.nodes[id]).filter(n => n && !n.off); if (!sel.length) { bar?.remove(); return; }
  if (!bar) { bar = document.createElement("div"); bar.id = "plmulti"; bar.className = "pl-multibar"; cv.append(bar); }
  const types = [["page", "Landing page"], ["carousel", "Instagram carousel"], ["metaad", "Facebook & Instagram ad"], ["ad", "Search ads"], ["form", "Multi-step form"], ["chatbot", "Chatbot"]].filter(([k]) => sel.some(s => relOptions(s, { id: "__probe", type: k, x: 0, y: 0, p: {} }).length));
  bar.innerHTML = `<b>${sel.length} selected</b><span>Create from the selection:</span>${types.map(([k, l]) => `<button class="btn sm" data-act="plmultigo" data-t="${k}">${l}</button>`).join("")}<button class="btn sm ghost" data-act="plmulticlear">Clear</button>`;
}
A.plmultigo = (b) => { const sel = [...S.plMulti].map(id => S.nodes[id]).filter(Boolean); S.plMulti.clear(); paintMultiBar(); createWith(b.dataset.t, sel); };
A.plmulticlear = () => { S.plMulti.clear(); paintWorld(); paintMultiBar(); };

/* ---------- the show foundation, pinned on the canvas ---------- */
const FKEYS = [["goal", "Goal"], ["audience", "Audience"], ["offer", "Offer"], ["idea", "Key message"], ["cta", "Main action"], ["facts", "Approved facts"], ["tone", "Tone of voice"], ["business", "Business"]];
const foundSnap = () => { const d = dnaOf(); return Object.fromEntries(FKEYS.map(([k]) => [k, String(d[k] ?? "")])); };
/* an asset follows the foundation unless a Brief is wired into it */
const ownsBrief = (n) => G.edgesTo(n.id, "text").some(e => S.nodes[e.from]?.type === "brief");
function foundDiff(n) {
  if (!n?.found || ownsBrief(n) || !BUILDABLE.has(n.type)) return [];
  const d = foundSnap(); return FKEYS.filter(([k]) => (n.found[k] ?? "") !== d[k]).map(([k, l]) => ({ k, l, from: n.found[k] ?? "", to: d[k] }));
}
function stampFound() { if (!cur()) return; ON().forEach(n => { if (BUILDABLE.has(n.type) && n.builtAt && !n.found) n.found = foundSnap(); }); }
{ const _bn = buildNode; buildNode = async function (n) { await _bn(n); if (n.status !== "failed" && n.builtAt) { n.found = foundSnap(); n.src = (n.src || []).map(s => ({ ...s, v: S.nodes[s.id]?.updatedAt || s.v })); commitNode(n); paintNode(n.id); } }; }
{ const _r = render; render = function () { stampFound(); _r(); }; }
{ const _sd = saveDna; saveDna = function (patch, now0) { stampFound(); _sd(patch, now0); clearTimeout(saveDna.t); saveDna.t = setTimeout(() => { if (S.view === "canvas") { paintWorld(); paintFoundation(); } }, 500); }; }
function foundationHTML() {
  const s = cur(); if (!s) return ""; const d = dnaOf(); const st = mainStyle(); const pal = st ? styleValue(st).palette : PALETTES.webshow.c; const open = !!S.plFoundOpen;
  const affected = ON().filter(n => foundDiff(n).length).length;
  const fld = (k, l, ph, ta) => `<label class="pf-f"><span>${l}</span>${ta ? `<textarea data-found="${k}" rows="2" placeholder="${esc(ph)}">${esc(d[k] || "")}</textarea>` : `<input data-found="${k}" value="${esc(d[k] || "")}" placeholder="${esc(ph)}">`}</label>`;
  return `<section class="pl-found${open ? " open" : ""}" aria-label="Show foundation">
    <button class="pf-h" data-act="plfound" aria-expanded="${open}"><span class="pf-av"><img src="../art/${artOf(s)}.webp" alt=""></span><span class="pf-t"><b>Show foundation</b><small>${esc(GOAL_OPTS.find(g => g[0] === d.goal)?.[1] || "Set a goal")}${d.offer ? " · " + esc(d.offer.slice(0, 38)) + (d.offer.length > 38 ? "…" : "") : ""}</small></span><span class="pf-pal">${pal.slice(0, 5).map(c => `<i style="background:${c}"></i>`).join("")}</span>${affected ? `<span class="pf-badge" title="${affected} asset${affected > 1 ? "s" : ""} use an older version">${affected}</span>` : ""}</button>
    ${open ? `<div class="pf-b">
      <p class="pf-note">Every new asset uses this automatically. Start rough; you can fill it in as you go. To override it for one asset, wire a Brief or a Style into that asset.</p>
      <label class="pf-f"><span>Goal</span><select data-found="goal">${GOAL_OPTS.map(([k, l]) => `<option value="${k}" ${d.goal === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      ${fld("audience", "Audience", "Who it's for", 1)}${fld("offer", "Offer", "What you're promoting", 1)}${fld("idea", "Key message", "The one thing people should remember", 1)}${fld("cta", "Main action", "e.g. Book a sauna")}
      ${fld("facts", "Approved facts and references", "Prices, opening hours, guarantees. Only true ones.", 1)}${fld("tone", "Tone of voice", "e.g. warm, plain-spoken, a little playful")}
      <div class="pf-f"><span>Visual style</span><div class="pf-style"><span class="pf-pal big">${pal.map(c => `<i style="background:${c}"></i>`).join("")}</span>${st ? `<button class="btn sm" data-act="gonode" data-id="${st.id}">Edit style guide</button>` : `<button class="btn sm" data-act="ploutstyle">Add a style guide</button>`}</div></div>
      <div class="pf-f"><span>Mascot</span><div class="pf-style"><img class="pf-mascot" src="../art/${artOf(s)}.webp" alt=""><button class="btn sm" data-act="plart">Try another</button></div></div>
      ${affected ? `<div class="pf-aff"><b>${affected} asset${affected > 1 ? "s" : ""} made with an older version</b><span>They're marked “Update available”. Nothing changes until you update them.</span></div>` : ""}
    </div>` : ""}
  </section>`;
}
function paintFoundation() { const el = $("#plfound"); if (!el || el.contains(document.activeElement) && document.activeElement.matches("input,textarea,select")) return; el.innerHTML = foundationHTML(); }
A.plfound = () => { S.plFoundOpen = !S.plFoundOpen; paintFoundation(); };
A.plart = () => { const s = cur(); const keys = ["starburst", "snowflake", "leaf", "sun"]; s.art = keys[(keys.indexOf(artOf(s)) + 1) % keys.length]; if (!isEx()) Store.putShow(s); paintFoundation(); renderSidebarOnly(); };
A.ploutstyle = () => { const n = addNode("style", -320, 0); n.p.main = true; commitNode(n); paintWorld(); selectNode(n.id, "settings"); centerOn(n.id); paintFoundation(); };
document.addEventListener("input", (e) => { const k = e.target.dataset?.found; if (!k || !cur()) return; saveDna({ [k]: e.target.value }); });
document.addEventListener("change", (e) => { const k = e.target.dataset?.found; if (!k || !cur() || e.target.tagName !== "SELECT") return; saveDna({ [k]: e.target.value }, true); });

/* ---------- change tracking: never overwrite silently ---------- */
{ const _ns = nodeStatus; nodeStatus = function (n) {
  if (n.status === "building") return `<span class="chip st-building"><i></i>Drafting</span>`;
  if (n.status !== "failed" && foundDiff(n).length) return `<span class="chip st-stale">Update available</span>`;
  if (n.type === "publish" && n.p.live) { const pg = G.up(n.id, "page")[0]; if (pg && (pg.updatedAt || 0) > (n.p.at || 0)) return `<span class="chip st-stale">Page changed · publish to update</span>`; }
  return _ns(n).replace("Needs update", "Source changed");
}; }
const changedSources = (n) => !BUILDABLE.has(n.type) || !n.builtAt ? [] : G.edgesTo(n.id).filter(e => n.type !== "popup" || e.toPort === "text").map(e => S.nodes[e.from]).filter(u => u && (u.updatedAt || 0) > n.builtAt && !["popup", "chatbot", "scheduler", "form", "quiz"].includes(u.type));
function changeGroup(n) {
  const diff = foundDiff(n), srcs = changedSources(n); if (!diff.length && !srcs.length) return "";
  const pub = n.type === "page" && Object.values(S.nodes).some(x => x.type === "publish" && x.p.live && G.up(x.id, "page")[0]?.id === n.id);
  return `<div class="grp pl-chg"><h4>${diff.length ? "Update available" : "Source changed"}</h4>
    ${diff.map(x => `<div class="pl-chg-r"><b>${x.l}</b><span><s>${esc(x.from || "(empty)")}</s> → ${esc(x.to || "(empty)")}</span></div>`).join("")}
    ${srcs.map(u => `<div class="pl-chg-r"><b>${esc(u.title)}</b><span>was edited after this was made</span></div>`).join("")}
    <div class="swrow">${diff.length ? `<button class="btn sm primary" data-act="plupdate">Update the changed parts</button>` : ""}<button class="btn sm" data-act="plrebuild">${AI.fn ? "Rewrite with Showrunner" : "Redraft from template"}</button><button class="btn sm ghost" data-act="plkeep">Keep as it is</button></div>
    <small class="faint">${diff.length ? "Update changes only the words that came from the old version. Your other edits stay. " : ""}${AI.fn ? "" : "Redrafting replaces the content with a new template draft. "}${pub ? "The published page stays as it is until you publish again." : ""}</small></div>`;
}
/* replace the old foundation wording with the new, everywhere in the asset's own content, and nothing else */
function swapText(obj, from, to) {
  let n0 = 0; const SKIP = new Set(["src", "id", "toolId", "visualId", "slug", "img", "assetId", "seed", "motif"]);
  const walk = (o) => { for (const k of Object.keys(o)) { if (SKIP.has(k)) continue; const v = o[k];
    if (typeof v === "string" && from && v.includes(from)) { o[k] = v.split(from).join(to); n0++; } else if (v && typeof v === "object") walk(v); } };
  walk(obj); return n0;
}
A.plupdate = () => {
  const n = selNode(); if (!n) return; undoMark(); const diff = foundDiff(n); let changed = 0; const missing = [];
  diff.forEach(x => { const c = x.from ? swapText(n.p, x.from, x.to) : 0; if (c) { changed += c; n.found[x.k] = x.to; } else if (!x.from || ["goal", "tone"].includes(x.k)) n.found[x.k] = x.to; else missing.push(x.l.toLowerCase()); });
  hist(n, `Updated to the new ${diff.map(x => x.l.toLowerCase()).join(", ")}`); commitNode(n); paintNode(n.id); S.inspFor = null; paintInspector(); paintFoundation();
  plToast(missing.length ? `${changed ? `Updated ${changed} place${changed > 1 ? "s" : ""}. ` : ""}The old ${missing.join(" and ")} wasn't used word for word here: redraft it, edit by hand, or keep it.` : `Updated ${changed} place${changed === 1 ? "" : "s"}. Your other edits are untouched.`, true);
};
A.plrebuild = async () => { const n = selNode(); if (!n) return; undoMark(); await draft(n); S.inspFor = null; paintInspector(); paintFoundation(); };
A.plkeep = () => { const n = selNode(); if (!n) return; undoMark(); n.found = foundSnap(); if (n.builtAt) n.builtAt = now(); hist(n, "Reviewed: kept as it is"); commitNode(n); paintNode(n.id); S.inspFor = null; paintInspector(); paintFoundation(); };
/* exports go out of date too */
{ const _ek = A.exportkit; A.exportkit = function (b) { const s = cur(); if (s) { s.exportedAt = now(); if (!isEx()) Store.putShow(s); } return _ek(b); }; }

/* ---------- Multi-step form ---------- */
const MF_KINDS = [["choice", "Pick one"], ["text", "Short answer"], ["contact", "Name and email"]];
const mfOpts = (s) => String(s.opts || "").split(",").map(x => x.trim()).filter(Boolean);
const mfNorm = (steps) => { const out = arr(steps, 6).map(s => ({ q: str(s.q, "Question").slice(0, 120), kind: MF_KINDS.some(k => k[0] === s.kind) ? s.kind : "text", opts: Array.isArray(s.opts) ? s.opts.map(x => str(x)).filter(Boolean).slice(0, 6).join(", ") : str(s.opts) })); if (!out.some(s => s.kind === "contact")) out.push({ q: "Where can we reach you?", kind: "contact", opts: "" }); return out; };
BUILD_OFF.form = (n) => { const b = briefOf(n) || {}; const g = b.goal || "leads";
  return { p: { title: n.p.title && n.p.title !== NT.form.params().title ? n.p.title : (b.cta || "Tell us what you need").slice(0, 60), intro: b.offer ? `About ${b.offer.slice(0, 80)}. Three quick steps.` : NT.form.params().intro,
    steps: mfNorm([{ q: g === "bookings" ? "What would you like to book?" : "What are you interested in?", kind: "choice", opts: [b.offer && b.offer.slice(0, 40), "Something else", "Just looking for now"].filter(Boolean) },
      { q: "When would suit you?", kind: "choice", opts: ["This week", "This month", "Later"] }, { q: "Where can we reach you?", kind: "contact" }]), button: (b.cta || "Send").slice(0, 30) } }; };
BUILD_AI.form = async (n) => { const r = await AI.json(`Write a short multi-step lead form (3-4 steps) for a landing page. Each step asks one easy thing; the last step asks for name and email.\n${RULES}\n${inputsBlock(n)}\n\nReply with ONLY JSON: {"title":string,"intro":string,"steps":[{"q":string,"kind":"choice"|"text"|"contact","opts":[2-4 short options, only for choice]}],"button":string,"success":string}`);
  if (!arr(r?.steps).length) return BUILD_OFF.form(n); return { p: { title: str(r.title, n.p.title), intro: str(r.intro, n.p.intro), steps: mfNorm(r.steps), button: str(r.button, "Send").slice(0, 30), success: str(r.success, n.p.success) } }; };
{ const _nb = nodeBody; nodeBody = function (n) {
  if (n.type === "form") { const st = n.p.steps || []; return st.length ? `<div class="pv-mf"><b>${esc(n.p.title)}</b><ol>${st.map(s => `<li><span>${esc(s.q)}</span><small>${esc(MF_KINDS.find(k => k[0] === s.kind)?.[1] || "")}</small></li>`).join("")}</ol></div>` : `<div class="pv-text">Steps appear here when the form is drafted.</div>`; }
  if (n.type === "ref") return `<div class="pv-text"><b>${esc(REF_KINDS.find(k => k[0] === n.p.kind)?.[1] || "Reference")}</b>${n.p.url ? `\n${esc(n.p.url)}` : ""}${n.p.text ? `\n${esc(n.p.text.slice(0, 220))}` : "\nPaste facts, an FAQ, product details or a testimonial."}</div>`;
  return _nb(n);
}; }
{ const _ib3 = inspectorBody; inspectorBody = function (n) {
  let h = "";
  if (n.type === "form") {
    const st = n.p.steps || [];
    h = `<div class="grp">${fP(n, "title", "Title")}${fP(n, "intro", "Intro", { ta: 1 })}</div>
      <div class="grp"><h4>Steps</h4>${st.map((s, i) => `<div class="mf-ed"><div class="row"><b>Step ${i + 1}</b><span class="grow"></span>${i ? `<button class="ib" data-act="mfmove" data-i="${i}" aria-label="Move up">${ICON.up || "↑"}</button>` : ""}<button class="ib" data-act="mfdel" data-i="${i}" aria-label="Remove step">${ICON.x}</button></div>${fP(n, `steps.${i}.q`, "Question")}${fP(n, `steps.${i}.kind`, "Answer", { sel: MF_KINDS })}${s.kind === "choice" ? fP(n, `steps.${i}.opts`, "Options", { hint: "Separate with commas" }) : ""}</div>`).join("")}
      <button class="btn sm" data-act="mfadd">${ICON.plus} Add a step</button></div>
      <div class="grp">${fP(n, "button", "Button")}${fP(n, "success", "After sending", { ta: 1 })}</div>`;
  } else if (n.type === "ref") {
    h = `<div class="grp">${fP(n, "kind", "Kind", { sel: REF_KINDS })}${fP(n, "url", "Link (optional)", { ph: "https://" })}${fP(n, "text", "Content", { ta: 1, rows: 8, ph: "Only things you can stand behind. Showrunner uses this word for word." })}</div>`;
  } else h = _ib3(n);
  return changeGroup(n) + h + responsesGroup(n) + assetGroup(n);
}; }
Object.assign(A, {
  mfadd() { const n = selNode(); undoMark(); const st = n.p.steps ||= []; const ci = st.findIndex(s => s.kind === "contact"); st.splice(ci < 0 ? st.length : ci, 0, { q: "New question", kind: "choice", opts: "Yes, No" }); commitNode(n); paintNode(n.id); S.inspFor = null; paintInspector(); },
  mfdel(b) { const n = selNode(); undoMark(); n.p.steps.splice(+b.dataset.i, 1); commitNode(n); paintNode(n.id); S.inspFor = null; paintInspector(); },
  mfmove(b) { const n = selNode(); undoMark(); const i = +b.dataset.i; const st = n.p.steps; [st[i - 1], st[i]] = [st[i], st[i - 1]]; commitNode(n); paintNode(n.id); S.inspFor = null; paintInspector(); },
});
/* the form and an embedded quiz become page sections, keeping their own identity (toolId) */
{ const _sts = syncToolSections; syncToolSections = function (pg) {
  let ch = _sts(pg); if (!pg || pg.type !== "page" || !pg.p.sections?.length) return ch;
  const tools = G.up(pg.id, "overlays").filter(u => ["form", "quiz"].includes(u.type)); const typeOf = { form: "mform", quiz: "quizcard" };
  const keep = pg.p.sections.filter(s => !["mform", "quizcard"].includes(s.type) || tools.some(t => t.id === s.toolId)); if (keep.length !== pg.p.sections.length) ch = true;
  tools.forEach(t => { if (keep.some(s => s.toolId === t.id)) return; const sec = { type: typeOf[t.type], toolId: t.id };
    /* an embedded form takes the place of the page's simple form, which is hidden (not deleted) and can be shown again */
    const simple = t.type === "form" ? keep.findIndex(s => s.type === "form" && !s.hidden) : -1;
    if (simple >= 0) { keep[simple] = { ...keep[simple], hidden: true }; keep.splice(simple, 0, sec); hist(pg, "The simple form is hidden; the embedded form replaces it"); }
    else { const fi = keep.findIndex(s => s.type === "footer"); fi >= 0 ? keep.splice(fi, 0, sec) : keep.push(sec); } ch = true; });
  if (ch) pg.p.sections = keep; return ch;
}; }
{ const _pv = pageValue; pageValue = function (n, scale) {
  const v = _pv(n, scale);
  v.sections = v.sections.map(x => { if (!["mform", "quizcard"].includes(x.type)) return x; const t = S.nodes[x.toolId]; if (!t || !G.up(n.id, "overlays").some(u => u.id === t.id)) return { ...x, hidden: true };
    return x.type === "mform" ? { ...x, tool: { title: t.p.title, intro: t.p.intro, steps: t.p.steps || [], button: t.p.button, success: t.p.success } } : { ...x, tool: { title: t.p.title || t.title, intro: t.p.intro || "", n: (t.p.questions || []).length, slug: t.p.slug || "", live: !!t.p.live } }; });
  v.overlays = v.overlays.filter(o => !["form", "quiz"].includes(o.type)); return v;
}; }
{ const _rp = renderPage; renderPage = function (page, opts = {}) {
  const special = []; const secs = (page.sections || []).map((s, i) => { if (!["mform", "quizcard"].includes(s.type)) return s; special.push([i, s]); return { type: "proof", quote: `@@PL${i}@@`, author: "" }; });
  let h = _rp({ ...page, sections: secs }, opts);
  special.forEach(([i, s]) => { if (s.hidden) { h = h.replace(new RegExp(`<section[^>]*>(?:(?!<section)[\\s\\S])*?@@PL${i}@@[\\s\\S]*?</section>`), ""); return; }
    const html = s.type === "mform" ? mformHTML(s, i, opts) : quizcardHTML(s, opts);
    h = h.replace(new RegExp(`<section([^>]*)>(?:(?!<section)[\\s\\S])*?@@PL${i}@@[\\s\\S]*?</section>`), (m, attrs) => html.replace(/^<section class="([^"]*)"/, `<section class="$1"${/data-sec="\d+"/.test(attrs) ? ` data-sec="${i}"` : ""}`)); });
  return h;
}; }
function mformHTML(s, i, { live } = {}) {
  const c = s.tool || {}; const steps = c.steps?.length ? c.steps : [{ q: "Where can we reach you?", kind: "contact" }]; const N = steps.length;
  return `<section class="s form mform" data-anchor="form"><div class="in"><div style="display:grid;gap:14px;align-content:start"><h2>${esc(c.title || "Tell us what you need")}</h2>${c.intro ? `<p>${esc(c.intro)}</p>` : ""}</div>
    <div class="fm"><form class="mf" novalidate data-live="${live ? 1 : 0}" data-asset="${esc(s.toolId || "")}" data-n="${N}">
      <div class="mf-prog" aria-hidden="true"><i style="width:${Math.round(100 / N)}%"></i></div><small class="mf-count">Step 1 of ${N}</small>
      ${steps.map((st, k) => `<div class="mf-step" data-k="${k}" ${k ? "hidden" : ""}><b class="mf-q">${esc(st.q)}</b>${st.kind === "choice" ? `<div class="mf-opts" role="group">${mfOpts(st).map(o => `<button type="button" class="mf-o" data-mfpick="${esc(o)}">${esc(o)}</button>`).join("")}</div><input type="hidden" name="q${k}" data-q="${esc(st.q)}">` : st.kind === "contact" ? `<label>Name<input name="name" autocomplete="name" required></label><label>Email<input name="email" type="email" autocomplete="email" required></label>` : `<input name="q${k}" data-q="${esc(st.q)}" aria-label="${esc(st.q)}">`}</div>`).join("")}
      <div class="mf-nav"><button type="button" class="bt alt mf-back" hidden>Back</button><button type="button" class="bt mf-next" ${N === 1 ? "hidden" : ""}>Next</button><button type="submit" class="bt mf-send" ${N > 1 ? "hidden" : ""}>${esc(c.button || "Send")}</button></div>
      <div class="err" hidden></div><div class="ok" hidden>${esc(c.success || "Thanks! We'll be in touch soon.")}</div>
    </form></div></div></section>`;
}
function quizcardHTML(s, { live } = {}) {
  const c = s.tool || {}; if (live && !c.live) return `<section class="s" hidden></section>`;
  return `<section class="s ctab quizcard"><div class="in"><h2>${esc(c.title || "Take the quiz")}</h2><p>${esc(c.intro || `${c.n || 3} quick questions and a recommendation made for you.`)}</p>${c.live && c.slug ? `<a class="bt" href="#p-${esc(c.slug)}">Take the quiz</a>` : `<span class="bt" aria-disabled="true">Take the quiz</span><small class="mf-note">Publish the quiz to make this button work.</small>`}</div></section>`;
}
/* the form works on the published page; in previews it explains instead of saving */
document.addEventListener("click", (e) => {
  const f = e.target.closest?.("form.mf"); if (!f) return; const steps = $$(".mf-step", f); const cur0 = steps.findIndex(x => !x.hidden);
  const show = (k) => { steps.forEach((x, j) => (x.hidden = j !== k)); f.querySelector(".mf-back").hidden = k === 0; f.querySelector(".mf-next").hidden = k === steps.length - 1; f.querySelector(".mf-send").hidden = k !== steps.length - 1; f.querySelector(".mf-prog i").style.width = Math.round((k + 1) / steps.length * 100) + "%"; f.querySelector(".mf-count").textContent = `Step ${k + 1} of ${steps.length}`; f.querySelector(".err").hidden = true; steps[k].querySelector("button,input")?.focus(); };
  const pick = e.target.closest(".mf-o");
  if (pick) { const st = pick.closest(".mf-step"); $$(".mf-o", st).forEach(b => b.setAttribute("aria-pressed", b === pick)); st.querySelector("input[type=hidden]").value = pick.dataset.mfpick; if (cur0 < steps.length - 1) setTimeout(() => show(cur0 + 1), 160); return; }
  if (e.target.closest(".mf-next")) { const st = steps[cur0]; const inp = st.querySelector("input"); if (inp && inp.type === "hidden" && !inp.value) { const er = f.querySelector(".err"); er.textContent = "Pick one to continue."; er.hidden = false; return; } show(cur0 + 1); }
  if (e.target.closest(".mf-back")) show(Math.max(0, cur0 - 1));
});
document.addEventListener("submit", async (e) => {
  const f = e.target; if (!f.classList?.contains("mf")) return; e.preventDefault(); const er = f.querySelector(".err");
  const fd = new FormData(f); const name = str(fd.get("name")), email = str(fd.get("email"));
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) { er.textContent = "Add your name and a valid email address."; er.hidden = false; return; }
  if (f.dataset.live !== "1" || !S.pub?.slug) { er.textContent = "Preview only: nothing was saved. On the published page this form saves the response to the show."; er.hidden = false; return; }
  const answers = $$("input[data-q]", f).map(i => `${i.dataset.q}: ${str(i.value) || "–"}`).join("\n");
  try { await Store.addLead(S.pub.slug, { name: name.slice(0, 200), email: email.slice(0, 200), message: answers.slice(0, 2000), asset: f.dataset.asset, kind: "form" }); $$(".mf-step,.mf-nav,.mf-prog,.mf-count", f).forEach(x => (x.hidden = true)); f.querySelector(".mf-prog").style.display = "none"; er.hidden = true; f.querySelector(".ok").hidden = false; }
  catch { er.textContent = "Couldn't send just now. Try again."; er.hidden = false; }
}, true);
/* every response belongs to the show and the asset that collected it; repeat contacts stay separate entries */
{ const _al2 = Store.addLead.bind(Store); Store.addLead = (slug, lead) => _al2(slug, { id: uid("l"), show: S.pub?.data?.showId || S.showId || "", ...lead }); }

/* ---------- responses: saved to the show's audience ---------- */
const COLLECTS = new Set(["form", "quiz", "poll", "popup", "chatbot", "scheduler", "page"]);
function responsesGroup(n) {
  if (!COLLECTS.has(n.type) || (n.type === "page" && !(n.p.sections || []).some(s => ["form", "mform"].includes(s.type)))) return "";
  const s = cur(); if (!S.live || S.liveFor !== S.showId) { if (!S.plLiveLoading) { S.plLiveLoading = true; Store.liveStats().then(r => { S.live = r; S.liveFor = S.showId; }).catch(() => {}).finally(() => { S.plLiveLoading = false; S.inspFor = null; paintInspector(); }); } }
  const slugs = n.type === "quiz" || n.type === "poll" ? [n.p.slug] : Object.values(S.nodes).filter(x => x.type === "publish" && x.p.slug).map(x => x.p.slug);
  const mine = (S.live?.leads || []).filter(l => l.asset === n.id || (n.type === "page" && !l.asset && slugs.includes(l.slug)) || ((n.type === "quiz" || n.type === "poll") && l.slug === n.p.slug)).sort((a, b) => b.at - a.at);
  return `<div class="grp pl-resp"><h4>Responses</h4><div class="pl-resp-r"><span>Responses saved to</span><b>${esc(s?.name || "This show")} audience</b></div>
    ${mine.length ? `<div class="pl-resp-list">${mine.slice(0, 4).map(l => `<div><b>${esc(l.name || l.email || "Anonymous")}</b><small>${esc(l.email || "")} · ${new Date(l.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small></div>`).join("")}</div><small class="faint">${mine.length} response${mine.length > 1 ? "s" : ""} from this ${n.type === "page" ? "page" : NT[n.type].label.toLowerCase()}. All of them are in Results.</small>` : `<small class="faint">${n.type === "form" ? "Place the form on a page and publish it; responses arrive here." : "No responses yet."}</small>`}
    <small class="faint">Send them on to HubSpot or Mailchimp in <button class="linkbtn" data-act="view" data-v="connectors">Connectors</button>.</small></div>`;
}

/* ---------- an asset is not its card: remove from the canvas, or delete on purpose ---------- */
function assetGroup(n) {
  const src = (n.src || []).map(s => ({ ...s, n: S.nodes[s.id] }));
  return `<div class="grp pl-asset"><h4>Asset</h4>
    ${src.length ? `<div class="pl-srcs"><span class="faint">Made from</span>${src.map(s => `<button class="chip" ${s.n ? `data-act="gonode" data-id="${s.id}"` : "disabled"}>${esc(s.n?.title || s.title || "a deleted block")}${s.n && (s.n.updatedAt || 0) > s.v ? " · changed since" : ""}</button>`).join("")}</div>` : ""}
    <div class="swrow"><button class="btn sm" data-act="plremove" data-id="${n.id}">Remove from canvas</button><button class="btn sm ghost pl-danger" data-act="pldelete" data-id="${n.id}">${S.plDelArm === n.id ? "Click again to delete for good" : "Delete asset"}</button></div>
    <small class="faint">Removing only takes the card off the canvas; it stays in Assets and Timeline and can be put back. Deleting removes the asset and its connections.</small></div>`;
}
A.delnode = function () { const n = selNode(); if (n) A.plremove({ dataset: { id: n.id } }); };
A.plremove = (b) => { const n = S.nodes[b.dataset.id]; if (!n) return; undoMark(); n.off = true; hist(n, "Removed from the canvas"); commitNode(n); if (S.sel === n.id) S.sel = null; S.plMulti.delete(n.id); paintWorld(); render(); plToast(`“${n.title}” is off the canvas. It's still in Assets.`, true); };
A.pldelete = (b) => { const n = S.nodes[b.dataset.id]; if (!n) return; if (S.plDelArm !== n.id) { S.plDelArm = n.id; S.inspFor = null; paintInspector(); paintTray(); setTimeout(() => { if (S.plDelArm === n.id) { S.plDelArm = null; S.inspFor = null; paintInspector(); paintTray(); } }, 4000); return; }
  S.plDelArm = null; undoMark(); if (n.type === "publish" && n.p.live) Store.unpublish(n.p.slug).catch(() => {}); const t = n.title; delNode(n.id); Room.set({ sel: null }); plPopClose(); paintAll(); render(); plToast(`Deleted “${t}”.`, true); };
A.plputback = (b) => { const n = S.nodes[b.dataset.id]; if (!n) return; undoMark(); const cv = $("#cv"); if (cv) { const r = cv.getBoundingClientRect(); [n.x, n.y] = toWorld(r.left + r.width / 2 - 120, r.top + r.height / 3); } n.off = false; hist(n, "Put back on the canvas"); commitNode(n); plPopClose(); paintWorld(); selectNode(n.id, "settings"); paintTray(); };
A.pltray = (b) => { const r = b.getBoundingClientRect(); const off = Object.values(S.nodes).filter(n => n.off);
  plPop(r.left, r.bottom + 8, `<div class="plp-h">${ICON.tray} Off the canvas</div>${off.map(n => `<div class="plp-row"><span class="nico" style="--nc:${NT[n.type]?.color}">${ICON[NT[n.type]?.icon] || ""}</span><b>${esc(n.title)}</b><button class="btn sm" data-act="plputback" data-id="${n.id}">Put back</button><button class="btn sm ghost pl-danger" data-act="pldelete" data-id="${n.id}">${S.plDelArm === n.id ? "Again to delete" : "Delete"}</button></div>`).join("") || `<p class="plp-note">Nothing here.</p>`}`, "wide"); };
function paintTray() { const b = $("#pltray"); if (!b) return; const k = Object.values(S.nodes).filter(n => n.off).length; b.hidden = !k; b.querySelector("b").textContent = k; if ($("#plpop") && $("#plpop .plp-h")?.textContent.includes("Off the canvas")) A.pltray(b); }
/* cards that are off the canvas don't count for layout, frames or fitting */
const withoutOff = (fn) => function (...a) { const off = Object.values(S.nodes).filter(n => n.off); off.forEach(n => delete S.nodes[n.id]); try { return fn.apply(this, a); } finally { off.forEach(n => (S.nodes[n.id] = n)); } };
bounds = withoutOff(bounds); paintJourney = withoutOff(paintJourney);

/* ---------- undo / redo for everything on the canvas ---------- */
const UNDO = { stack: [], redo: [], last: null, show: null, t: 0, busy: false };
const snapState = () => ({ nodes: structuredClone(S.nodes), edges: structuredClone(S.edges), show: cur() ? structuredClone({ dna: cur().dna, art: cur().art }) : null });
function undoReset() { UNDO.stack = []; UNDO.redo = []; UNDO.show = S.showId; UNDO.last = cur() ? snapState() : null; paintUndo(); }
/* call before a change; changes inside a short window form one step */
function undoMark() { if (UNDO.busy || !cur()) return; if (UNDO.show !== S.showId || !UNDO.last) undoReset(); if (!UNDO.open) { UNDO.stack.push(UNDO.last); if (UNDO.stack.length > 60) UNDO.stack.shift(); UNDO.redo = []; UNDO.open = true; } clearTimeout(UNDO.t); UNDO.t = setTimeout(() => { UNDO.open = false; UNDO.last = snapState(); paintUndo(); }, 700); }
{ const _cn = commitNode; commitNode = function (n, d) { if (!UNDO.busy && cur() && !n?.status?.startsWith?.("build")) undoMark(); return _cn(n, d); }; }
{ const _de = delEdge; delEdge = function (id) { undoMark(); return _de(id); }; }
function undoApply(state) {
  UNDO.busy = true; const ex = isEx();
  for (const id of new Set([...Object.keys(S.nodes), ...Object.keys(state.nodes)])) { const a = S.nodes[id], b = state.nodes[id]; if (!b) { delete S.nodes[id]; if (!ex) Store.del("nodes", S.showId, id); } else if (JSON.stringify(a) !== JSON.stringify(b)) { S.nodes[id] = structuredClone(b); if (!ex) Store.put("nodes", S.showId, S.nodes[id]); } }
  for (const id of new Set([...Object.keys(S.edges), ...Object.keys(state.edges)])) { const a = S.edges[id], b = state.edges[id]; if (!b) { delete S.edges[id]; if (!ex) Store.del("edges", S.showId, id); } else if (JSON.stringify(a) !== JSON.stringify(b)) { S.edges[id] = structuredClone(b); if (!ex) Store.put("edges", S.showId, S.edges[id]); } }
  if (state.show && cur()) { const s = cur(); if (JSON.stringify({ dna: s.dna, art: s.art }) !== JSON.stringify(state.show)) { s.dna = structuredClone(state.show.dna); s.art = state.show.art; if (!ex) Store.putShow(s); } }
  if (S.sel && !S.nodes[S.sel]) S.sel = null; UNDO.last = snapState(); UNDO.busy = false;
  S.inspFor = null; render();
}
A.plundo = () => { clearTimeout(UNDO.t); if (UNDO.open) { UNDO.open = false; UNDO.last = snapState(); } const st = UNDO.stack.pop(); if (!st) return plToast("Nothing to undo."); UNDO.redo.push(snapState()); undoApply(st); plToast("Undone."); };
A.plredo = () => { const st = UNDO.redo.pop(); if (!st) return plToast("Nothing to redo."); UNDO.stack.push(snapState()); undoApply(st); plToast("Redone."); };
function paintUndo() { const u = $("#plundo"), r = $("#plredo"); if (u) u.disabled = !UNDO.stack.length && !UNDO.open; if (r) r.disabled = !UNDO.redo.length; }
document.addEventListener("keydown", (e) => {
  if (!(e.metaKey || e.ctrlKey) || !["canvas", "timeline", "assets"].includes(S.view) || e.target.matches?.("input,textarea,select,[contenteditable=true]")) return;
  if (e.key.toLowerCase() === "z") { e.preventDefault(); e.stopPropagation(); e.shiftKey ? A.plredo() : A.plundo(); } else if (e.key.toLowerCase() === "y") { e.preventDefault(); e.stopPropagation(); A.plredo(); }
}, true);
{ const _os2 = openShow; openShow = function (...a) { const r = _os2.apply(this, a); setTimeout(undoReset, 0); return r; }; }

/* ---------- the Build workspace: tabs, Create, undo, off-canvas tray, the foundation, the library drawer ---------- */
{ const _cv3 = canvasView; canvasView = () => {
  let h = _cv3();
  h = h.replace('<button role="tab" aria-selected="true">Canvas</button>', '<button role="tab" aria-selected="true">Build</button>');
  h = h.replace('<div class="rail"', `<div class="pl-cvtools"><button class="btn primary sm" data-act="plcreate">${ICON.wand} Create</button><button class="pl-round sm" id="plundo" data-act="plundo" title="Undo (Ctrl+Z)" aria-label="Undo">${ICON.undo}</button><button class="pl-round sm" id="plredo" data-act="plredo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo">${ICON.redo}</button><button class="btn sm" id="pltray" data-act="pltray" hidden title="Cards removed from the canvas">${ICON.tray} Off canvas <b>0</b></button></div><div id="plfound"></div><div class="rail"`);
  return h.replace(/<button class="ib" data-act="openlib"[^>]*>/, (m) => m.replace('title="Add node (N)"', 'title="Library (N)"'));
}; }
{ const _mc2 = mountCanvas; mountCanvas = function () { _mc2(); if (UNDO.show !== S.showId) undoReset(); paintFoundation(); paintUndo(); paintTray(); paintMultiBar(); }; }
{ const _pw2 = paintWorld; paintWorld = function () { _pw2(); paintTray(); paintUndo(); }; }
{ const _lp2 = libraryPop; libraryPop = function () {
  const h = _lp2(); const L = S.lib; if (!L || L.wireFrom || L.dbl) return h;
  return h.replace('class="pop lib"', 'class="pop lib pl-drawer"').replace(/style="left:[^"]*"/, "").replace('aria-label="Add a node"', 'aria-label="Library"').replace(/(<label class="sb-search")/, `<div class="pl-dr-h"><b>Library</b><button class="ib" data-act="closelib" aria-label="Close the library">${ICON.x}</button></div>$1`);
}; }
/* Build gets the room: the Showrunner opens there only when asked */
{ const _sp = A.srpanel; A.srpanel = function (b) { if (S.view === "canvas") { S.srCanvas = !(S.srCanvas && S.srOpen); S.srOpen = true; render(); window.dispatchEvent(new Event("resize")); return; } return _sp(b); }; }
{ const _ms = mountSRP; mountSRP = function () { const o = S.srOpen; if (S.view === "canvas" && !S.srCanvas) S.srOpen = false; try { _ms(); } finally { S.srOpen = o; } }; }
{ const _tb2 = topbar; topbar = function () { const h = _tb2(); return S.view === "canvas" ? h.replace(/(class="btn sm srp-btn" data-act="srpanel" aria-pressed=")[^"]*"/, `$1${!!S.srCanvas}"`) : h; }; }
/* a renamed card shows its new name right away */
document.addEventListener("input", (e) => { if (e.target.dataset?.title && S.sel) { const el = $(`#nodes .nd[data-id="${S.sel}"] .pl-nhd b`); if (el) el.textContent = e.target.value; } });
/* Assets: the export goes out of date when anything changes after it */
{ const _vb2 = viewBody; viewBody = function () { const h = _vb2(); const s = cur(); if (S.view !== "assets" || !s?.exportedAt) return h; const later = Object.values(S.nodes).some(n => (n.updatedAt || 0) > s.exportedAt);
  return later ? h.replace(/(<button class="btn" data-act="exportkit">[\s\S]*?<\/button>)/, `$1<span class="pl-expold">Changed since your last export</span>`) : h; }; }
/* the canvas's own panels take clicks, typing and scrolling for themselves */
const PL_UI = ".pl-found,.pl-cvtools,.pl-cvtabs,.pl-multibar,.pl-actbar,.pl-zoom";
document.addEventListener("pointerdown", (e) => { if (e.target.closest?.(PL_UI) && e.target.closest(".cv")) e.stopPropagation(); }, true);
document.addEventListener("wheel", (e) => { if (e.target.closest?.(".pl-found")) e.stopPropagation(); }, true);
{ const _op = openPublic; openPublic = function (slug) { plPopClose(); const t = $("#pltoast"); if (t) t.innerHTML = ""; return _op(slug); }; }
