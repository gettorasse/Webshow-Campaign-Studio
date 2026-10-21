/* ============================================================
   State, data flow, actions
   ============================================================ */
const S = {
  view: "home", shows: {}, showId: null, nodes: {}, edges: {}, threads: {},
  sel: null, selEdge: null, tool: "select", vp: { x: 80, y: 60, k: .8 }, vpFor: null,
  insp: innerWidth > 760, inspTab: "settings", thread: null, tfilter: "all", tq: "",
  effort: "balanced", proposal: null, askBusy: false, askText: "", homeText: "", homeBusy: false,
  modal: null, lib: null, sbOpen: false, sbHidden: false, pub: null, preview: null, live: null,
  dirty: new Set(), unsub: null, example: null, find: "", thOpen: lsGet("wss.thOpen", false), con: null, typing: new Set(),
};
const cur = () => S.shows[S.showId];
const isEx = () => S.showId === "example";
const tintOf = (show) => TINTS[show?.tint] || TINTS.periwinkle;

/* ---------- show loading ---------- */
function openShow(id, view = "canvas") {
  if (S.showId !== id) {
    S.unsub?.(); S.unsub = null; S.sel = null; S.selEdge = null; S.thread = null; S.proposal = null;
    S.showId = id; S.nodes = {}; S.edges = {}; S.threads = {}; S.vpFor = null;
    if (id === "example") { const ex = S.example || (S.example = exampleShow()); S.nodes = ex.nodes; S.edges = ex.edges; S.threads = ex.threads; }
    else if (id) {
      S.unsub = Store.watchShow(id, {
        nodes: (list) => { applySnap("nodes", list); syncCounts(); if (S.nodeEd) neRepaint(); if (S.view === "timeline" && !document.querySelector(".tl-bar.drag")) repaintTL(); clearTimeout(S.schedT); S.schedT = setTimeout(() => runSchedules(), 1500); if (S.view === "canvas") paintAll(); else if (S.view !== "public") renderSidebarOnly(); },
        edges: (list) => { applySnap("edges", list); clearTimeout(S.migT); S.migT = setTimeout(migrateEdges, 800); if (S.view === "canvas") paintAll(); },
        threads: (list) => { applySnap("threads", list); People.resolve(list.flatMap(t => t.messages.map(m => m.by))).then(() => { if (["threads", "home", "canvas"].includes(S.view)) softRender(); }); syncCounts(); softRender(); },
      });
    }
  }
  S.view = view; Room.set({ s: id, v: view, c: null, sel: null }); render();
}
function applySnap(kind, list) {
  const next = {}; list.forEach(x => { next[x.id] = (kind === "nodes" && S.dirty.has(x.id) && S[kind][x.id]) ? S[kind][x.id] : x; });
  if (kind === "nodes") S.dirty.forEach(id => { if (!next[id] && S.nodes[id]) next[id] = S.nodes[id]; });
  S[kind] = next;
  if (S.sel && !S.nodes[S.sel]) S.sel = null;
}
function softRender() { if (S.view === "canvas") { renderSidebarOnly(); paintInspector(); paintWorld(); } else render(); }
function showStateOf(ns) {
  const day = localISO(); const inW = (p) => (!p.start || day >= p.start) && (!p.end || day <= p.end);
  const page = ns.some(n => n.type === "publish" && n.p.live && inW(n.p)); const ads = ns.some(n => n.type === "adchannel" && n.p.launched && inW(n.p));
  const posts = ns.filter(n => ["carousel", "image"].includes(n.type)).flatMap(n => n.p.posts || []); const sched = posts.filter(p => p.at > Date.now()).length;
  const parts = []; if (page) parts.push("Page live"); if (ads) parts.push("Ads running"); if (sched) parts.push(`${sched} post${sched > 1 ? "s" : ""} scheduled`);
  if (parts.length) return { state: "active", note: parts.join(" · ") };
  const ran = ns.some(n => (n.type === "publish" && n.p.at) || (n.type === "adchannel" && n.p.launched)) || posts.length;
  return { state: ran ? "stopped" : "draft", note: ran ? "" : "" };
}
function syncCounts() {
  const show = cur(); if (!show || isEx()) return;
  const needs = typeof needsList === "function" ? needsList().length : Object.values(S.threads).filter(t => t.status === "needs").length;
  const building = Object.values(S.nodes).filter(n => n.status === "building").length;
  const st = showStateOf(Object.values(S.nodes));
  if (show.needs !== needs || show.building !== building || show.nodeCount !== Object.keys(S.nodes).length || show.state !== st.state || show.liveNote !== st.note) { show.needs = needs; show.building = building; show.nodeCount = Object.keys(S.nodes).length; show.state = st.state; show.liveNote = st.note; Store.putShow(show); }
}

/* ---------- node writes ---------- */
const wTimers = {};
function hist(n, note) { n.hist = [{ at: now(), by: note.startsWith("Built by Showrunner") ? "ai" : Store.me.id, note }, ...(n.hist || [])].slice(0, 14); }
function setNode(n, patch, save = true) { Object.assign(n, patch); if (save) commitNode(n); }
function commitNode(n, delay = 350) {
  n.updatedAt = now(); n.by = Store.me.id; S.nodes[n.id] = n;
  if (isEx()) return;
  S.dirty.add(n.id); clearTimeout(wTimers[n.id]);
  wTimers[n.id] = setTimeout(() => Store.put("nodes", S.showId, n).catch(e => { console.warn(e); toast(e?.code === "invalid_argument" ? "You can view this show but not edit it." : "Couldn't save just now."); }).finally(() => setTimeout(() => S.dirty.delete(n.id), 400)), delay);
  syncCounts();
}
function addNodes(nodes, edges = []) {
  nodes.forEach(n => { S.nodes[n.id] = n; if (!isEx()) Store.put("nodes", S.showId, n); });
  edges.forEach(e => { S.edges[e.id] = e; if (!isEx()) Store.put("edges", S.showId, e); });
  syncCounts();
}
function freeSpot(x, y, w = 270, h = 260) {
  const hit = (px, py) => Object.values(S.nodes).some(n => px < n.x + (NT[n.type]?.wide ? 300 : 260) && px + w > n.x && py < n.y + 300 && py + h > n.y);
  for (let i = 0; i < 40; i++) { const px = x + (i % 5) * 60 + Math.floor(i / 5) * 300, py = y + (i % 5) * 70; if (!hit(px, py)) return [px, py]; }
  return [x, y];
}
function addNode(type, x, y, extra = {}) {
  if (!extra.exact) [x, y] = freeSpot(x, y);
  const def = NT[type]; const n = { id: uid("n"), type, x: Math.round(x), y: Math.round(y), title: extra.title || def.label, p: { ...def.params(), ...(extra.p || {}) }, status: "idle", hist: [{ at: now(), by: Store.me.id, note: "Added" }], updatedAt: now(), by: Store.me.id };
  addNodes([n]); return n;
}
function delNode(id) {
  const rm = Object.values(S.edges).filter(e => e.from === id || e.to === id);
  rm.forEach(e => { delete S.edges[e.id]; if (!isEx()) Store.del("edges", S.showId, e.id); });
  delete S.nodes[id]; if (!isEx()) Store.del("nodes", S.showId, id);
  rm.filter(e => e.toPort === "overlays").forEach(e => { const pg = S.nodes[e.to]; if (pg && syncToolSections(pg)) commitNode(pg); });
  if (S.sel === id) S.sel = null; syncCounts();
}
function connect(from, fromPort, to, toPort) {
  const a = S.nodes[from], b = S.nodes[to]; if (!a || !b || from === to) return null;
  const o = G.outDef(a, fromPort), i = G.inDef(b, toPort); if (!o || !i || o.t !== i.t) return null;
  if (Object.values(S.edges).some(e => e.from === from && e.to === to && e.toPort === toPort)) return null;
  if (!i.multi) G.edgesTo(to, toPort).forEach(e => { delete S.edges[e.id]; if (!isEx()) Store.del("edges", S.showId, e.id); });
  const e = { id: uid("e"), from, fromPort, to, toPort }; S.edges[e.id] = e; if (!isEx()) Store.put("edges", S.showId, e);
  if (b.type === "page" && toPort === "overlays" && syncToolSections(b)) commitNode(b);
  b.updatedAt = now(); return e;
}
function delEdge(id) { const ed = S.edges[id]; delete S.edges[id]; const pg = ed && S.nodes[ed.to]; if (pg?.type === "page" && ed.toPort === "overlays" && syncToolSections(pg)) commitNode(pg); if (!isEx()) Store.del("edges", S.showId, id); if (S.selEdge === id) S.selEdge = null; }

/* ---------- threads ---------- */
function threadFor(nodeId) { return Object.values(S.threads).find(t => t.nodeId === nodeId); }
function putThread(t) { t.updatedAt = now(); S.threads[t.id] = t; if (!isEx()) Store.put("threads", S.showId, t); syncCounts(); }
function newThread(title, nodeId = null) { const t = { id: uid("t"), title, nodeId, status: "open", createdAt: now(), updatedAt: now(), by: Store.me.id, messages: [] }; putThread(t); return t; }
async function postDecision(n, d) {
  const t = threadFor(n.id) || newThread(n.title, n.id);
  t.messages.push({ id: uid("m"), by: "ai", kind: "ai", text: d.body, at: now() }, { id: uid("m"), by: "ai", kind: "decision", text: d.title, options: d.options, apply: d.apply, picked: null, at: now() });
  t.status = "needs"; putThread(t);
}
function decide(tid, mid, pick, extra) {
  const t = S.threads[tid]; const m = t?.messages.find(x => x.id === mid); if (!m || m.picked) return;
  m.picked = pick; m.pickedBy = Store.me.id;
  if (m.apply === "hero.headline" && t.nodeId && S.nodes[t.nodeId]) { const n = S.nodes[t.nodeId]; const hero = n.p.sections?.find(s => s.type === "hero"); if (hero) { hero.headline = pick; hist(n, "Headline chosen in thread"); commitNode(n); } }
  if (extra) t.messages.push({ id: uid("m"), by: Store.me.id, kind: "msg", text: extra, at: now() });
  t.status = t.messages.some(x => x.kind === "decision" && !x.picked) ? "needs" : "done"; putThread(t);
}
function typingHTML(label = "is writing a reply") {
  return `<div class="msg ai typing" role="status" aria-live="polite"><div class="mh"><span class="ty-av">${People.avatar("ai")}</span><b>Showrunner</b><span class="ty-l">${label}</span></div><div class="tdots" aria-hidden="true"><i></i><i></i><i></i></div></div>`;
}
async function sendInThread(t, text, toAI) {
  t.messages.push({ id: uid("m"), by: Store.me.id, kind: "msg", text, at: now() });
  if (t.status === "done") t.status = "open"; putThread(t);
  if (toAI) S.typing.add(t.id);
  S.inspFor = null; if (S.view === "threads") render(); else softRender();
  if (!toAI) return;
  const n = t.nodeId ? S.nodes[t.nodeId] : null;
  let reply;
  if (!AI.fn) reply = "AI isn't connected in this view, so I can't answer here. Open Studio inside Claude to talk to Showrunner.";
  else {
    try {
      const ctx = n ? `NODE: ${n.title} (${NT[n.type].label})\nPARAMS: ${JSON.stringify(n.p).slice(0, 6000)}\n${inputsBlock(n)}` : `SHOW: ${cur()?.name}\nNODES: ${Object.values(S.nodes).map(x => x.title + " (" + x.type + ")").join(", ")}`;
      reply = await AI.text(`You are Showrunner, the production assistant in Webshow Studio, replying in a team thread. Be brief, concrete and helpful. If a change is needed, say exactly what to change on which node.\n${RULES}\n${ctx}\n\nTHREAD:\n${t.messages.slice(-12).map(m => `${m.by === "ai" ? "Showrunner" : "Teammate"}: ${m.text}`).join("\n")}\n\nReply as Showrunner:`);
    } catch (e) { reply = errCopy(e); }
  }
  S.typing.delete(t.id);
  t.messages.push({ id: uid("m"), by: "ai", kind: "ai", text: reply, at: now() }); S.freshMsg = t.messages.at(-1).id; S.inspFor = null; putThread(t); if (S.view === "threads" || S.inspTab === "comments") softRender();
  if (S.view === "threads") { const m = $(".msgs"); if (m) m.scrollTop = m.scrollHeight; }
}

/* ---------- shows ---------- */
function createShow({ name, tint, client = "" }) {
  const show = { id: uid("show_"), name: name || "Untitled show", tint: tint || Object.keys(TINTS)[Object.keys(S.shows).length % 6], client, createdAt: now(), updatedAt: now(), by: Store.me.id, needs: 0, building: 0, nodeCount: 0 };
  S.shows[show.id] = show; Store.putShow(show); return show;
}
async function deleteShow(id) {
  const pubs = Object.values(S.nodes).filter(n => n.type === "publish" && n.p.live);
  for (const p of pubs) await Store.unpublish(p.p.slug).catch(() => {});
  delete S.shows[id]; await Store.delShow(id).catch(() => {});
  if (S.showId === id) { S.unsub?.(); S.showId = null; S.view = "home"; }
  render(); toast("Show deleted");
}
function duplicateExample() {
  const ex = S.example || exampleShow(); const show = createShow({ name: ex.show.name + " (copy)", tint: ex.show.tint });
  const map = {}; const nodes = Object.values(ex.nodes).map(n => { const c = clone(n); c.id = uid("n"); map[n.id] = c.id; return c; });
  const edges = Object.values(ex.edges).map(e => ({ ...e, id: uid("e"), from: map[e.from], to: map[e.to] }));
  nodes.filter(n => n.type === "publish").forEach(n => { n.p.live = false; n.p.slug = n.p.slug + "-" + Math.random().toString(36).slice(2, 5); });
  openShow(show.id); addNodes(nodes, edges); fitSoon(); toast("Duplicated. This copy is saved and shared with your team.");
}

/* ---------- AI: create a show from one sentence ---------- */
async function showFromPrompt(text) {
  S.homeBusy = true; render();
  let plan = null;
  if (AI.fn) {
    try {
      plan = await AI.json(`You are Showrunner in Webshow Studio. A business owner describes what they want. Plan a campaign "show" as a node graph.\n${RULES}\n\n<input>${text}</input>\n\nReply with ONLY JSON:
{"name": business or campaign name (max 4 words),
 "tint": one of ${Object.keys(TINTS).filter(k => k !== "slate").map(k => `"${k}"`).join("|")},
 "brief": {"business": string, "offer": string, "audience": string, "goal": one of ${GOAL_OPTS.map(g => `"${g[0]}"`).join("|")}, "cta": string max 4 words, "facts": string — ONLY facts stated in the input, else ""},
 "copy": string — 2-3 sentences of offer copy,
 "style": {"palette": [5 hex: ink, primary, secondary, paper, pop], "fontPair": one of ${Object.keys(FONT_PAIRS).map(k => `"${k}"`).join("|")}, "mode": "light"|"dark", "radius": "sharp"|"soft"|"round"},
 "images": [2 {"title": string, "motif": one of ${MOTIFS.map(m => `"${m}"`).join("|")}, "alt": string describing the ideal photo}],
 "blocks": subset of ["page","popup","carousel","ad"] that fits the request (include "page" unless clearly not needed),
 "popup": {"trigger": "load"|"delay"|"scroll"|"exit", "headline": string, "body": string, "cta": string}}`, { modelTier: AI.tier(S.effort) });
    } catch (e) { toast(errCopy(e)); }
  }
  if (!plan) plan = { name: text.split(/[.,\n]/)[0].slice(0, 32) || "New show", brief: { business: "", offer: text, audience: "", goal: "leads", cta: "Get in touch", facts: "" }, copy: text, blocks: ["page", "popup"], images: [], popup: {} };
  const show = createShow({ name: str(plan.name, "New show"), tint: TINTS[plan.tint] ? plan.tint : undefined });
  const want = new Set(arr(plan.blocks, 4).filter(b => ["page", "popup", "carousel", "ad"].includes(b))); if (!want.size) want.add("page");
  const tpl = TEMPLATES.full.graph(); const drop = { page: ["page", "pub"], popup: ["popup"], carousel: ["car"], ad: ["ad"] };
  const keep = new Set(tpl.nodes.map(n => n.ref)); Object.entries(drop).forEach(([b, refs]) => { if (!want.has(b)) refs.forEach(r => keep.delete(r)); });
  const graph = { nodes: tpl.nodes.filter(n => keep.has(n.ref)), edges: tpl.edges.filter(([a, , b]) => keep.has(a) && keep.has(b)) };
  const st = plan.style || {}; const im = arr(plan.images, 2);
  const g = instantiate(graph, 0, 0, {
    brief: { business: str(plan.brief?.business) || show.name, offer: str(plan.brief?.offer), audience: str(plan.brief?.audience), goal: GOAL_OPTS.some(x => x[0] === plan.brief?.goal) ? plan.brief.goal : "leads", cta: str(plan.brief?.cta, "Get in touch"), facts: str(plan.brief?.facts) },
    copy: { text: str(plan.copy) },
    style: { palette: arr(st.palette, 5).filter(isHex).length === 5 ? st.palette : PALETTES.webshow.c.slice(), fontPair: FONT_PAIRS[st.fontPair] ? st.fontPair : "pixel", mode: st.mode === "light" ? "light" : "dark", radius: ["sharp", "soft", "round"].includes(st.radius) ? st.radius : "soft" },
    hero: { motif: MOTIFS.includes(im[0]?.motif) ? im[0].motif : "horizon", alt: str(im[0]?.alt), __title: str(im[0]?.title, "Hero visual") },
    detail: { motif: MOTIFS.includes(im[1]?.motif) ? im[1].motif : "arcs", alt: str(im[1]?.alt), __title: str(im[1]?.title, "Detail visual") },
    popup: { trigger: TRIGGERS.some(t => t[0] === plan.popup?.trigger) ? plan.popup.trigger : "exit", headline: str(plan.popup?.headline), body: str(plan.popup?.body), cta: str(plan.popup?.cta) },
    page: { goal: str(plan.brief?.offer) },
    pub: { slug: slugify(show.name) },
  });
  S.homeBusy = false; S.homeText = "";
  openShow(show.id); addNodes(g.nodes, g.edges); fitSoon();
  const blocks = g.nodes.filter(n => ["page", "ad", "popup", "carousel"].includes(n.type));
  const first = blocks.filter(n => ["page", "ad"].includes(n.type)), second = blocks.filter(n => ["popup", "carousel"].includes(n.type));
  await Promise.all(second.map(n => buildNode(n))); await Promise.all(first.map(n => buildNode(n)));
}

/* ---------- AI: canvas operations ---------- */
function graphSummary() {
  return JSON.stringify({
    nodes: Object.values(S.nodes).map(n => ({ id: n.id, type: n.type, title: n.title, built: !!n.builtAt })),
    edges: Object.values(S.edges).map(e => ({ from: e.from, fromPort: e.fromPort, to: e.to, toPort: e.toPort })),
  });
}
const typeCatalog = () => Object.entries(NT).map(([k, d]) => `${k}: inputs ${JSON.stringify(d.inputs.map(i => i.k + ":" + i.t))}, outputs ${JSON.stringify(d.outputs.map(o => o.k + ":" + o.t))}, params ${Object.keys(d.params()).join(",")}`).join("\n");
async function askCanvas(text) {
  S.askBusy = true; S.proposal = null; paintAsk();
  let r = null;
  if (AI.fn) {
    try {
      r = await AI.json(`You edit a marketing campaign node graph in Webshow Studio. Turn the user's request into graph operations.\n${RULES}\nNODE TYPES (ports are key:type; connect only matching types; output→input):\n${typeCatalog()}\n\nCURRENT GRAPH:\n${graphSummary()}\n\n<input>${text}</input>\n\nReply with ONLY JSON: {"summary": one sentence, "ops": [
 {"op":"add","ref":"new1","type":<type>,"title":string,"params":{...}},
 {"op":"connect","from":<id or ref>,"fromPort":string,"to":<id or ref>,"toPort":string},
 {"op":"set","id":<existing id>,"params":{...}},
 {"op":"build","id":<id or ref>} ]}
Reuse existing nodes when possible. Wire new blocks to the existing brief/text/images/style. Popups, chatbots and appointment schedulers are tools: connect their tool output (popup: "overlay", chatbot/scheduler: "tool") → a page's "overlays" input. Carousels and image nodes have a "post" output → a "social" node's "posts" (or an "adchannel" node's "boost"). Google ads ("ad" type) and metaad nodes → an "adchannel" node's "ads". Ads, carousels, image posts and a page's buttons get their destination from a "link" node (wire a page's "page" output into the link's "page" input, or set its url). Dates are YYYY-MM-DD. Add "build" for every new or changed block.`);
    } catch (e) { toast(errCopy(e)); }
  }
  if (!r) r = offlineOps(text);
  S.proposal = { text, summary: str(r.summary, "Here's what I'd change"), ops: arr(r.ops, 30) };
  S.askBusy = false; S.askText = ""; paintAsk();
}
function offlineOps(text) {
  const t = text.toLowerCase(); const ops = []; const all = Object.values(S.nodes);
  const page = all.find(n => n.type === "page"); const brief = all.find(n => n.type === "brief"); const style = all.find(n => n.type === "style");
  const imgs = all.filter(n => n.type === "image"); const copy = all.find(n => n.type === "text");
  let ref = 0; const add = (type, title, params = {}) => { const r = "new" + ++ref; ops.push({ op: "add", ref: r, type, title, params }); return r; };
  if (/popup|pop-up|modal|exit/.test(t)) { const r = add("popup", "Popup", { trigger: /exit|leav/.test(t) ? "exit" : /scroll/.test(t) ? "scroll" : "delay" }); if (copy || brief) ops.push({ op: "connect", from: (copy || brief).id, fromPort: "text", to: r, toPort: "text" }); if (page) ops.push({ op: "connect", from: r, fromPort: "overlay", to: page.id, toPort: "overlays" }); ops.push({ op: "build", id: r }); }
  if (/carousel|instagram|slides/.test(t)) { const r = add("carousel", "Social carousel"); if (brief) ops.push({ op: "connect", from: brief.id, fromPort: "text", to: r, toPort: "text" }); imgs.forEach(i => ops.push({ op: "connect", from: i.id, fromPort: "image", to: r, toPort: "images" })); if (style) ops.push({ op: "connect", from: style.id, fromPort: "style", to: r, toPort: "style" }); ops.push({ op: "build", id: r }); }
  if (/google|search ad|\bads?\b/.test(t)) { const r = add("ad", "Search ad"); if (brief) ops.push({ op: "connect", from: brief.id, fromPort: "text", to: r, toPort: "text" }); ops.push({ op: "build", id: r }); }
  if (/landing|page|website|site/.test(t) && !page) { const r = add("page", "Landing page"); [brief, copy].filter(Boolean).forEach(x => ops.push({ op: "connect", from: x.id, fromPort: "text", to: r, toPort: "text" })); imgs.forEach(i => ops.push({ op: "connect", from: i.id, fromPort: "image", to: r, toPort: "images" })); if (style) ops.push({ op: "connect", from: style.id, fromPort: "style", to: r, toPort: "style" }); ops.push({ op: "build", id: r }); }
  if (/image|visual|photo/.test(t)) { const r = add("image", "New visual"); if (style) ops.push({ op: "connect", from: style.id, fromPort: "style", to: r, toPort: "style" }); }
  return { summary: ops.length ? "Offline draft: I matched your request to these nodes. Connect AI for smarter plans." : "I couldn't match that offline. Try mentioning a popup, carousel, ad, page or image.", ops };
}
function opLabel(o) {
  const name = (id) => S.nodes[id]?.title || (S.proposal?.ops.find(x => x.ref === id)?.title) || id;
  if (o.op === "add") return `Add <b>${esc(NT[o.type]?.label || o.type)}</b> “${esc(o.title || "")}”`;
  if (o.op === "connect") return `Wire <b>${esc(name(o.from))}</b> → <b>${esc(name(o.to))}</b> ${o.toPort ? `<span class="faint">(${esc(o.toPort)})</span>` : ""}`;
  if (o.op === "set") return `Update <b>${esc(name(o.id))}</b>: ${esc(Object.keys(o.params || {}).join(", "))}`;
  if (o.op === "build") return `Build <b>${esc(name(o.id))}</b>`;
  return esc(o.op);
}
async function applyProposal() {
  const pr = S.proposal; if (!pr) return; S.proposal = null; paintAsk();
  const refs = {}; const res = (id) => refs[id] || id; const builds = [];
  const b = bounds(); let placed = 0;
  for (const o of pr.ops) {
    if (o.op === "add" && NT[o.type]) {
      const target = pr.ops.find(c => c.op === "connect" && c.from === o.ref && S.nodes[res(c.to)]);
      const source = pr.ops.find(c => c.op === "connect" && c.to === o.ref && S.nodes[res(c.from)]);
      let x, y;
      if (target) { const t = S.nodes[res(target.to)]; x = t.x - 340; y = t.y + 260 + placed * 40; }
      else if (source) { const s = S.nodes[res(source.from)]; x = s.x + 360; y = s.y + placed * 40; }
      else { x = (b ? b.x1 : 0) + 80; y = (b ? b.y0 : 0) + placed * 300; }
      const safeP = {}; const defP = NT[o.type].params(); Object.entries(o.params || {}).forEach(([k, v]) => { if (k in defP) safeP[k] = v; });
      const n = addNode(o.type, x, y, { title: str(o.title, NT[o.type].label), p: safeP }); refs[o.ref] = n.id; placed++;
    } else if (o.op === "connect") {
      const from = S.nodes[res(o.from)], to = S.nodes[res(o.to)]; if (!from || !to) continue;
      let fp = o.fromPort && G.outDef(from, o.fromPort) ? o.fromPort : NT[from.type].outputs[0]?.k;
      const t = G.outDef(from, fp)?.t; let tp = o.toPort && G.inDef(to, o.toPort)?.t === t ? o.toPort : NT[to.type].inputs.find(i => i.t === t)?.k;
      if (fp && tp) connect(from.id, fp, to.id, tp);
    } else if (o.op === "set") {
      const n = S.nodes[res(o.id)]; if (!n) continue; const defP = NT[n.type].params();
      Object.entries(o.params || {}).forEach(([k, v]) => { if (k in defP) n.p[k] = v; }); hist(n, "Changed by Showrunner"); commitNode(n);
    } else if (o.op === "build") { const n = S.nodes[res(o.id)]; if (n) builds.push(n); }
  }
  paintAll(); toast("Applied");
  for (const n of builds) await buildNode(n);
}
async function rewriteText(n, how) {
  if (!AI.fn || !n.p.text) return toast(n.p.text ? errCopy({ code: "unavailable" }) : "Write something first");
  toast("Rewriting…");
  try { const t = await AI.text(`Rewrite this marketing text. Instruction: ${how}. Keep facts unchanged; never add new claims or numbers. Reply with only the rewritten text.\n<input>${n.p.text}</input>`, { modelTier: "quick" }); n.p.text = t.replace(/^"|"$/g, ""); hist(n, "Rewritten: " + how); commitNode(n); paintNode(n.id); paintInspector(); }
  catch (e) { toast(errCopy(e)); }
}
async function describeImage(n) {
  try {
    const lim = await AI.fn.limits().catch(() => null); if (!lim?.images) return toast("Image understanding isn't available in this view.");
    const blob = await srcToBlob(n.p.src);
    const r = await AI.json(`Describe this marketing image for a campaign team. Reply with ONLY JSON: {"alt": one sentence alt text, "title": max 4 words, "palette": [5 dominant hex colours]}`, { images: [blob], modelTier: "quick" });
    n.p.alt = str(r.alt); if (r.title) n.title = str(r.title); hist(n, "Described by Showrunner"); commitNode(n); paintNode(n.id); paintInspector();
  } catch (e) { toast(errCopy(e)); }
}
function extractPalette(n) {
  const src = G.up(n.id, "image")[0]; if (!src) return;
  const v = imageValue(src, .3); const im = new Image(); im.crossOrigin = "anonymous";
  im.onload = () => {
    const c = document.createElement("canvas"); c.width = 48; c.height = 48; const x = c.getContext("2d"); x.drawImage(im, 0, 0, 48, 48);
    let d; try { d = x.getImageData(0, 0, 48, 48).data; } catch { return toast("Couldn't read that image's colours."); }
    const buckets = {}; for (let i = 0; i < d.length; i += 4) { const k = [d[i] >> 5, d[i + 1] >> 5, d[i + 2] >> 5].join(); (buckets[k] = buckets[k] || { n: 0, r: 0, g: 0, b: 0 }); const B = buckets[k]; B.n++; B.r += d[i]; B.g += d[i + 1]; B.b += d[i + 2]; }
    const cols = Object.values(buckets).sort((a, b) => b.n - a.n).slice(0, 12).map(B => [B.r / B.n, B.g / B.n, B.b / B.n]);
    const hex = (c) => "#" + c.map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
    const L = (c) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; const sat = (c) => Math.max(...c) - Math.min(...c);
    const byL = [...cols].sort((a, b) => L(a) - L(b)); const bySat = [...cols].sort((a, b) => sat(b) - sat(a));
    n.p.palette = [hex(byL[0].map(v => v * .55)), hex(bySat[0]), hex(bySat[1] || byL[Math.floor(byL.length / 2)]), hex(byL.at(-1).map(v => Math.min(255, v * .3 + 178))), hex(bySat[2] || bySat[0])];
    hist(n, "Palette picked from " + src.title); commitNode(n); paintAll();
  };
  im.src = v.src;
}

/* ---------- publish ---------- */
async function publishNode(n) {
  const pg = G.up(n.id, "page")[0]; if (!pg?.p.sections?.length) return toast("Build the landing page first.");
  const slug = slugify(n.p.slug || cur()?.name); n.p.slug = slug;
  const existing = await Store.getPublished(slug).catch(() => null);
  if (existing && existing.nodeId !== n.id) return toast(`/${slug} is already used by another show. Change the address.`);
  const v = pageValue(pg, .7);
  for (const k of Object.keys(v.imgs)) { const s = v.imgs[k].src; if (s.startsWith("data:") && s.length > 90000) v.imgs[k].src = await shrinkData(s, 760, .7); }
  for (const o of v.overlays) { const s = o.pimg?.src; if (s && s.startsWith("data:") && s.length > 90000) o.pimg.src = await shrinkData(s, 760, .7); }
  const payload = { slug, nodeId: n.id, showId: S.showId, page: { sections: v.sections }, imgs: v.imgs, theme: v.theme, overlays: v.overlays, href: v.href || "", seo: { title: n.p.title || pg.title, description: n.p.desc }, from: n.p.start || "", until: n.p.end || "", at: now() };
  try { await Store.publish(slug, payload); } catch (e) { console.warn(e); return toast(e?.code === "invalid_argument" ? "The page is too large to publish. Use fewer or smaller uploaded images." : "Couldn't publish just now."); }
  n.p.live = true; n.p.at = now(); hist(n, "Published /" + slug); commitNode(n); pg.status = "approved"; commitNode(pg); paintAll(); toast("Live at /" + slug);
}
function shrinkData(src, max, q) { return new Promise(res => { const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement("canvas"); c.width = im.width * k; c.height = im.height * k; c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", q)); }; im.onerror = () => res(src); im.src = src; }); }
async function unpublishNode(n) { await Store.unpublish(n.p.slug).catch(() => {}); n.p.live = false; hist(n, "Unpublished"); commitNode(n); paintAll(); toast("Unpublished"); }

/* ---------- export ---------- */
function exportKit() {
  const s = cur(); const all = Object.values(S.nodes); const L = [];
  L.push(`# ${s?.name || "Show"}\n`);
  all.filter(n => n.type === "brief").forEach(n => L.push(`## Brief\n${textValue(n)}\n`));
  all.filter(n => n.type === "text").forEach(n => L.push(`## ${n.title}\n${n.p.text}\n`));
  all.filter(n => n.type === "style").forEach(n => L.push(`## ${n.title}\n| Role | Colour |\n|---|---|\n${n.p.palette.map((c, i) => `| ${["Ink", "Primary", "Secondary", "Paper", "Pop"][i]} | ${c} |`).join("\n")}\n\nType: ${FONT_PAIRS[n.p.fontPair]?.label} · Mode: ${n.p.mode} · Corners: ${n.p.radius}\n`));
  all.filter(n => n.type === "page" && n.p.sections?.length).forEach(n => L.push(`## ${n.title}\n${n.p.sections.filter(x => !x.hidden).map(x => `### [${x.type}]\n${Object.entries(x).filter(([k]) => !["id", "type", "hidden", "visualId", "layout"].includes(k)).map(([k, v]) => Array.isArray(v) ? v.map(i => "- " + (typeof i === "object" ? Object.values(i).join(" — ") : i)).join("\n") : `**${k}:** ${v}`).join("\n")}`).join("\n\n")}\n`));
  all.filter(n => n.type === "popup").forEach(n => L.push(`## ${n.title}\n**${n.p.headline}**\n${n.p.body}\nButton: ${n.p.cta}\nRules: ${n.p.trigger}, ${n.p.freq}${n.p.start ? ", from " + n.p.start : ""}${n.p.end ? " until " + n.p.end : ""}\n`));
  all.filter(n => n.type === "carousel" && n.p.slides?.length).forEach(n => L.push(`## ${n.title}\n${n.p.slides.map((x, i) => `${i + 1}. **${x.title}** ${x.text}`).join("\n")}\n\n${n.p.caption}\n${n.p.hashtags.map(h => "#" + h).join(" ")}\n`));
  all.filter(n => n.type === "ad" && n.p.headlines?.length).forEach(n => L.push(`## ${n.title}\n**Headlines**\n${n.p.headlines.map(h => "- " + h).join("\n")}\n\n**Descriptions**\n${n.p.descriptions.map(h => "- " + h).join("\n")}\n`));
  return L.join("\n");
}
async function saveFile(filename, data) {
  if (!S.dl) { if (typeof data === "string") { copyText(data, "Downloads aren't available here, so it was copied instead"); } else toast("Downloads aren't available in this view."); return; }
  try { const r = await S.dl.save({ filename, data }); if (r.status === "saved") toast("Saved " + filename); } catch (e) { if (!["cancelled", "declined"].includes(e?.code)) toast("Couldn't save the file."); }
}
async function copyText(t, msg) { try { await navigator.clipboard.writeText(t); toast(msg || "Copied"); } catch { toast("Copy isn't available here."); } }
let toastT; function toast(m) { const b = $("#toastbox"); if (!b) return; b.innerHTML = `<div class="toast" role="status">${esc(m)}</div>`; clearTimeout(toastT); toastT = setTimeout(() => (b.innerHTML = ""), 2800); }
