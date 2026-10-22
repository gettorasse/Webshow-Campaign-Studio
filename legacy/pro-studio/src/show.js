/* ============================================================
   The show: one idea, one goal, one show.
   Show DNA, the show's lifecycle, HOOK / SHOW / CONVERT lanes,
   and inheritance (blocks read the show instead of needing wires)
   ============================================================ */
ICON.target = P('<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r=".7" fill="currentColor"/>');
ICON.onair = P('<circle cx="8" cy="8" r="1.6"/><path d="M5.2 5.2a4 4 0 0 0 0 5.6M10.8 5.2a4 4 0 0 1 0 5.6M3.1 3.1a7 7 0 0 0 0 9.8M12.9 3.1a7 7 0 0 1 0 9.8"/>');
ICON.trophy = P('<path d="M5 2.5h6v3.5a3 3 0 0 1-6 0zM5 3.5H3a2 2 0 0 0 2 3M11 3.5h2a2 2 0 0 1-2 3M8 9v3M5.5 13.5h5"/>');
ICON.more = P('<circle cx="3.5" cy="8" r="1.15" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1.15" fill="currentColor" stroke="none"/><circle cx="12.5" cy="8" r="1.15" fill="currentColor" stroke="none"/>');
ICON.lock = P('<rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>');

const GOAL_UNIT = { leads: ["lead", "leads"], bookings: ["booking", "bookings"], sell: ["sale", "sales"], launch: ["sign-up", "sign-ups"], event: ["registration", "registrations"], awareness: ["visit", "visits"] };
const unitOf = (g, n) => (GOAL_UNIT[g] || GOAL_UNIT.leads)[+n === 1 ? 0 : 1];
const DNA_DEF = () => ({ goal: "leads", target: 0, idea: "", business: "", offer: "", audience: "", cta: "", facts: "", start: "", end: "", budget: "" });
const todayISO = () => localISO();
const addDays = (iso, d) => isoOf(dayIx(iso) + d);
const fmtISO = (iso, o = { day: "numeric", month: "short" }) => iso ? fmtDay(dayIx(iso), o) : "";

/* ---------- Show DNA ---------- */
function dnaOf(s = cur()) {
  if (!s) return DNA_DEF();
  if (s.dna) return { ...DNA_DEF(), ...s.dna };
  const b = s.id === S.showId ? Object.values(S.nodes).find(n => n.type === "brief") : null;
  return { ...DNA_DEF(), business: s.name || "", ...(b ? { business: b.p.business || s.name, offer: b.p.offer, audience: b.p.audience, goal: b.p.goal || "leads", cta: b.p.cta, facts: b.p.facts } : {}) };
}
let dnaT;
function saveDna(patch, now0) {
  const s = cur(); if (!s) return; s.dna = { ...dnaOf(s), ...patch };
  /* briefs that are still wired keep saying the same thing */
  const bk = ["business", "offer", "audience", "goal", "cta", "facts"].filter(k => k in patch);
  if (bk.length) Object.values(S.nodes).filter(n => n.type === "brief").forEach(n => { bk.forEach(k => (n.p[k] = patch[k])); commitNode(n, 800); });
  if (isEx()) return; clearTimeout(dnaT); dnaT = setTimeout(() => Store.putShow(s), now0 ? 0 : 450);
}
function dnaBrief() { const d = dnaOf(); return d.business || d.offer || d.idea ? { business: d.business || cur()?.name || "", offer: d.offer, audience: d.audience, goal: d.goal, cta: d.cta, facts: d.facts, idea: d.idea } : null; }
function dnaText() {
  const d = dnaOf(); if (!d.business && !d.offer && !d.idea) return ""; const g = GOAL_OPTS.find(x => x[0] === d.goal)?.[1] || d.goal;
  return [d.business && `Business: ${d.business}`, d.idea && `Big idea of the show: ${d.idea}`, d.offer && `Offer: ${d.offer}`, d.audience && `Audience: ${d.audience}`, g && `Goal: ${g}${+d.target ? ` (${d.target} ${unitOf(d.goal, d.target)})` : ""}`, d.cta && `Main action: ${d.cta}`, d.start && `Show runs ${d.start} to ${d.end || "open-ended"}`, d.facts && `Facts we can back up: ${d.facts}`].filter(Boolean).join("\n");
}

/* every block reads the show's DNA when no brief is wired */
{ const _b = briefOf; briefOf = (n) => _b(n) || dnaBrief(); }
{ const _t = textsInto; textsInto = (n, port = "text") => { const r = _t(n, port); if (port === "text" && !r.some(x => x.type === "brief")) { const t = dnaText(); if (t) r.unshift({ title: "Show DNA", type: "brief", text: t }); } return r; }; }
{ const _f = factsInto; factsInto = (n) => _f(n) || dnaOf().facts || ""; }

/* ---------- lanes ---------- */
const LANES = [["kit", "Kit", "Text, images and style. Everything to the right inherits them.", -1e9, 600], ["hook", "Hook", "Wakes up interest", 600, 1320], ["show", "Show", "Deepens and proves", 1320, 2040], ["convert", "Convert", "Turns visitors into results", 2040, 1e9]];
const LANE_X = { kit: 0, hook: 640, show: 1360, convert: 2080 };
const KIT_TYPES = new Set(["brief", "text", "style", "palette", "link"]);
const CONVERT_TYPES = new Set(["page", "publish", "popup", "chatbot", "scheduler", "cookie"]);
const nodeW = (n) => NT[n.type]?.wide ? 300 : 248;
function laneAt(x) { return (LANES.find(l => x >= l[3] && x < l[4]) || LANES[0])[0]; }
function laneOf(n) {
  if (!n) return "kit"; if (KIT_TYPES.has(n.type)) return "kit"; if (CONVERT_TYPES.has(n.type)) return "convert";
  const l = laneAt(n.x + nodeW(n) / 2);
  if (n.type === "image") return l;
  return l === "kit" ? "hook" : l;
}
function paintLanes() {
  const box = $("#lanes"); if (!box) return; const ns = Object.values(S.nodes);
  if (!ns.length) { box.innerHTML = ""; return; }
  const y0 = Math.min(...ns.map(n => n.y)) - 170, y1 = Math.max(...ns.map(n => n.y)) + 620;
  const x0 = Math.min(-60, ...ns.map(n => n.x - 60)), x1 = Math.max(2780, ...ns.map(n => n.x + nodeW(n) + 60));
  box.innerHTML = LANES.map(([k, l, d, a, b]) => {
    const L = Math.max(a, x0), R = Math.min(b, x1); const eps = k === "kit" ? 0 : ns.filter(n => typeof isEpisode === "function" && isEpisode(n) && laneOf(n) === k).length;
    return `<div class="lane lane-${k}" style="left:${L}px;top:${y0}px;width:${R - L}px;height:${y1 - y0}px"><div class="lane-h"><b>${l}</b><span>${d}</span>${eps ? `<i>${eps} episode${eps > 1 ? "s" : ""}</i>` : ""}</div></div>`;
  }).join("");
}
const EST_H = { brief: 230, text: 170, image: 330, style: 230, palette: 210, link: 190, page: 440, publish: 200, popup: 330, chatbot: 230, scheduler: 230, cookie: 210, carousel: 330, ad: 290, metaad: 430, quiz: 310, poll: 270, social: 230, adchannel: 250 };
const KIT_ORDER = ["brief", "text", "style", "palette", "link"];
/* lay the canvas out as Kit → Hook → Show → Convert */
function arrangeLanes(nodes = Object.values(S.nodes), save = true) {
  const lane = new Map(nodes.map(n => [n.id, laneOf(n)])); const col = {};
  const put = (n, x, key) => { col[key] = col[key] ?? 0; n.x = x; n.y = col[key]; col[key] += (EST_H[n.type] || 270) + 44; };
  const byDate = (a, b) => (a.p.start || "9999").localeCompare(b.p.start || "9999") || a.y - b.y;
  nodes.filter(n => lane.get(n.id) === "kit" && n.type !== "image").sort((a, b) => KIT_ORDER.indexOf(a.type) - KIT_ORDER.indexOf(b.type) || a.y - b.y).forEach(n => put(n, 0, "k0"));
  nodes.filter(n => lane.get(n.id) === "kit" && n.type === "image").sort((a, b) => a.y - b.y).forEach(n => put(n, 300, "k1"));
  ["hook", "show"].forEach(l => { const eps = nodes.filter(n => lane.get(n.id) === l && !["social", "adchannel"].includes(n.type)).sort(byDate); eps.forEach((n, i) => put(n, LANE_X[l] + (i % 2) * 340, l + (i % 2)));
    nodes.filter(n => lane.get(n.id) === l && ["social", "adchannel"].includes(n.type)).forEach(n => put(n, LANE_X[l] + 340, l + "1")); });
  placeConvert(nodes, lane, put);
  if (save) nodes.forEach(n => commitNode(n, 60));
}
/* Convert lane: last-chance episodes on the left, then the Engine (landing page and its tools), which every episode points to */
const ENGINE_X = LANE_X.convert + 340;
const TOOL_ORDER = ["publish", "popup", "scheduler", "chatbot", "cookie"];
function placeConvert(nodes, lane, put) {
  const byDate = (a, b) => (a.p.start || "9999").localeCompare(b.p.start || "9999") || a.y - b.y;
  nodes.filter(n => lane.get(n.id) === "convert" && !CONVERT_TYPES.has(n.type)).sort(byDate).forEach(n => put(n, LANE_X.convert, "c0"));
  nodes.filter(n => n.type === "page").forEach(n => put(n, ENGINE_X, "e0"));
  nodes.filter(n => TOOL_ORDER.includes(n.type)).sort((a, b) => TOOL_ORDER.indexOf(a.type) - TOOL_ORDER.indexOf(b.type)).forEach(n => put(n, ENGINE_X + 360, "e1"));
}
/* shows laid out before the Engine existed: move only Convert-lane nodes, leave everything else where it is */
function arrangeConvertOnly() {
  const nodes = Object.values(S.nodes).filter(n => laneOf(n) === "convert"); if (!nodes.length) return;
  const y0 = Math.min(...nodes.map(n => n.y)); const lane = new Map(nodes.map(n => [n.id, "convert"])); const col = {};
  const put = (n, x, key) => { col[key] = col[key] ?? y0; n.x = x; n.y = col[key]; col[key] += (EST_H[n.type] || 270) + 44; };
  placeConvert(nodes, lane, put); nodes.forEach(n => commitNode(n, 60));
}

/* ---------- inheritance: what a block gets from the show when nothing is wired ---------- */
function mainStyle() { const ss = Object.values(S.nodes).filter(n => n.type === "style"); return ss.find(n => n.p.main) || ss.sort((a, b) => a.y - b.y || a.x - b.x)[0] || null; }
function mainPage() { const ps = Object.values(S.nodes).filter(n => n.type === "page"); return ps.find(n => n.p.main) || ps.sort((a, b) => a.y - b.y || a.x - b.x)[0] || null; }
function kitImages() { return Object.values(S.nodes).filter(n => n.type === "image" && laneOf(n) === "kit").sort((a, b) => a.y - b.y || a.x - b.x); }
const VLINK = { id: "__link", type: "link", title: "Show landing page", p: { url: "", utm: true, campaign: "" }, x: 0, y: 0, auto: true };
const INHERIT = {
  style: (n) => !["style", "palette"].includes(n.type) && mainStyle() ? [mainStyle()] : [],
  images: (n) => ["page", "carousel", "metaad"].includes(n.type) ? kitImages() : [],
  link: (n) => n.type !== "page" && mainPage() ? [VLINK] : [],
};
{ const _up = G.up;
  G.up = function (id, port) {
    if (id === "__link") return port === "page" && mainPage() ? [mainPage()] : [];
    const r = _up.call(this, id, port); if (r.length || !port || !INHERIT[port]) return r;
    const n = S.nodes[id]; if (!n || !NT[n.type]?.inputs.some(i => i.k === port)) return r;
    return INHERIT[port](n).filter(x => x.id !== id);
  }; }
const inherits = (n, port) => NT[n.type]?.inputs.some(i => i.k === port) && !G.edgesTo(n.id, port).length && G.up(n.id, port).length > 0;
function inheritGroup(n) {
  const rows = [];
  if (NT[n.type].inputs.some(i => i.t === "text") && !G.up(n.id, "text").some(u => u.type === "brief") && dnaBrief()) rows.push(["target", "Show DNA", "Goal, idea, offer and audience"]);
  if (inherits(n, "style")) rows.push(["palette", mainStyle().title, "The show's visual identity"]);
  if (inherits(n, "images")) rows.push(["image", `${G.up(n.id, "images").length} kit image${G.up(n.id, "images").length > 1 ? "s" : ""}`, "Every image in the Kit"]);
  if (inherits(n, "link")) { const pg = mainPage(); rows.push(["link", pg.title, pubFor(pg)?.p.live ? "Tracked per episode" : "Goes live with the show"]); }
  if (!rows.length) return "";
  return `<div class="grp"><h4>From the show</h4><div class="inh">${rows.map(([ic, b, s]) => `<div class="inh-r"><span class="nico" style="--nc:var(--brand)">${ICON[ic]}</span><span class="t"><b>${esc(b)}</b><span>${esc(s)}</span></span><span class="chip">auto</span></div>`).join("")}</div><small class="faint">Wire something into a port to override it for this block only.</small></div>`;
}
/* episodes link back with their own id so Live can tell which episode brought the lead */
{ const _li = linkInfo;
  linkInfo = function (n, source) {
    const r = _li(n, source); if (!r || !r.url || !source || !n || !S.nodes[n.id] || n.type === "page") return r;
    const [b, h] = r.url.split("#"); r.url = `${b}${b.includes("?") ? "&" : "?"}utm_content=${encodeURIComponent(n.id)}${h != null ? "#" + h : ""}`; return r;
  }; }
{ const _al = Store.addLead.bind(Store);
  Store.addLead = (slug, lead) => { try { const q = new URLSearchParams(location.search); const src = q.get("utm_source"), ep = q.get("utm_content"); if (src && !lead.src) lead = { ...lead, src: src.slice(0, 40) }; if (ep && !lead.ep) lead = { ...lead, ep: ep.slice(0, 40) }; } catch {} return _al(slug, lead); }; }

/* ---------- lifecycle and progress ---------- */
const LIFE = { draft: ["Draft", "Plan and build. Nothing is public yet."], paused: ["Paused", "Nothing new is scheduled until you resume."], scheduled: ["Scheduled", "Everything is set to start"], live: ["On air", "Episodes are going out"], ended: ["Ended", "The report is ready"], results: ["Results", "Report saved"] };
function lifeOf(s = cur()) {
  if (!s) return "draft"; const d = s.dna || {};
  if (!s.launched) return s.paused && d.start ? "paused" : !d.start && s.state === "active" ? "live" : !d.start && s.state === "stopped" ? "ended" : "draft";
  if (!d.start) return "live";
  const t = todayISO(); if (t < d.start) return "scheduled"; if (!d.end || t <= d.end) return "live"; return s.report ? "results" : "ended";
}
function showSlugs() { return new Set(Object.values(S.nodes).filter(n => ["publish", "quiz", "poll"].includes(n.type) && n.p.slug).map(n => n.p.slug)); }
function resultLeads() { const d = dnaOf(); const sl = showSlugs(); const t0 = d.start ? new Date(d.start + "T00:00:00").getTime() : 0; return (S.live?.leads || []).filter(l => sl.has(l.slug) && !(l.message || "").startsWith("Vote:") && l.at >= t0); }
function elapsedFrac(d) { if (!d.start || !d.end) return 0; const t = todayIx(), a = dayIx(d.start), b = dayIx(d.end); return Math.max(0, Math.min(1, (t - a + 1) / (b - a + 1))); }
/* Spend counts only campaigns launched on a connected ad account. Demo accounts give sample numbers and say so.
   Episode boosts are planned money until an ad channel actually runs them. */
function spendOf() {
  let spent = 0, demo = false; const t = todayIx();
  Object.values(S.nodes).forEach(n => {
    if (n.type !== "adchannel" || !n.p.launched || !S.con) return;
    (n.p.platforms || []).filter(conOn).forEach(k => { if (S.con.conns[k]?.demo) demo = true; for (let d0 = Math.max(localDayOf(n.p.launched), t - 90); d0 <= t; d0++) spent += sampleDay(S.showId, k, d0).spend; });
  });
  const planned = Object.values(S.nodes).filter(n => typeof isEpisode === "function" && isEpisode(n)).reduce((a, n) => a + (+n.p.boost || 0), 0);
  return { spent: Math.round(spent), demo, planned };
}
const spentOf = () => spendOf().spent;
function progressOf(s = cur()) {
  const d = dnaOf(s);
  if (s?.example) { const f = elapsedFrac(d); return { res: Math.round((+d.target || 40) * f * .78), spent: Math.round((+d.budget || 0) * f * .86), planned: +d.budget || 0, sample: true, demo: true, frac: f }; }
  if (!s || s.id !== S.showId) return { res: s?.prog?.res || 0, spent: s?.prog?.spent || 0, planned: s?.prog?.planned || 0, demo: !!s?.prog?.demo, frac: elapsedFrac(d) };
  const res = d.goal === "awareness" ? [...showSlugs()].reduce((a, x) => a + (S.live?.visits?.[x] || 0), 0) : resultLeads().length;
  const sp = spendOf(); return { res, spent: sp.spent, planned: sp.planned, demo: sp.demo, frac: elapsedFrac(d), sample: false };
}
async function loadShowStats(force) {
  if (!cur() || isEx() || (!force && S.live && S.liveFor === S.showId)) return; S.liveFor = S.showId;
  try { S.live = await Store.liveStats(); } catch { S.live = { leads: [], visits: {} }; }
  paintDnaBar(); if (S.view === "plan") rerenderBody(); syncCounts();
}
function rerenderBody() { const b = $("#body"); if (!b) return; const h0 = b.querySelector(".home"); const sc = h0?.scrollTop; b.innerHTML = viewBody(); const h = b.querySelector(".home"); if (h && sc) h.scrollTop = sc; }
{ const _sc = syncCounts;
  syncCounts = function () {
    _sc(); const s = cur(); if (!s || isEx()) return; const life = lifeOf(s); const pr = progressOf(s); const air = onAirNow(s); const pj = [life, pr.res, pr.spent, pr.planned, air].join("|");
    if (s.pj !== pj) { s.pj = pj; s.life = life; s.onAir = air; s.prog = { res: pr.res, spent: pr.spent, planned: pr.planned, demo: pr.demo }; Store.putShow(s); }
  }; }
/* "On air" only when something is really out there: the landing page is published or an episode actually went out */
function onAirNow(s = cur()) {
  if (!s) return false; if (s.example) return true; if (s.id !== S.showId) return !!s.onAir;
  const pg = mainPage(); if (pg && pubFor(pg)?.p.live) return true;
  return typeof deliveryOf === "function" && epList().some(n => ["posted", "running", "live"].includes(deliveryOf(n).k));
}
function lifeChip(life, s = cur()) { if (life === "live" && !onAirNow(s)) return `<span class="chip life-started" title="The show has started, but the landing page isn't published and no episode has gone out"><i></i>Not live yet</span>`; return `<span class="chip life-${life}"><i></i>${LIFE[life][0]}</span>`; }
function lifeNote(life, s = cur()) { return life === "live" && !onAirNow(s) ? "The show has started, but nothing is public yet. Publish the landing page or send the first episode." : LIFE[life][1]; }
/* budget line: real or demo spend when campaigns run, otherwise what's planned */
function budgetLine(pr, d) { if (d.budget === "") return ""; return pr.spent ? `€${num(pr.spent)} spent${pr.sample || pr.demo ? " · demo" : ""} / €${num(+d.budget || 0)}` : `€${num(pr.planned || 0)} planned / €${num(+d.budget || 0)}`; }
function goalLine(s = cur()) { const d = dnaOf(s); return +d.target ? `${num(+d.target)} ${unitOf(d.goal, d.target)}${d.end ? ` by ${fmtISO(d.end, { day: "numeric", month: "long" })}` : ""}` : "No goal yet"; }

/* ---------- canvas: lanes + the DNA bar ---------- */
{ const _cv = canvasView; canvasView = () => (innerWidth <= 760 && !S.nodes[S.sel] ? _cv().replace(/<aside class="insp" id="insp"><\/aside>/, "") : _cv()).replace('<svg class="wires"', '<div id="lanes"></div><div id="journey"></div><svg class="wires"').replace('<div class="rail"', `<div class="lanechips" id="lanechips">${laneChipsHTML()}</div><div class="rail"`).replace('<button class="ib" data-act="fit"', `<button class="ib" data-act="wirestoggle" aria-pressed="${!!S.wiresAll}" aria-label="${S.wiresAll ? "Fade wiring" : "Show all wiring"}" title="${S.wiresAll ? "Fade wiring" : "Show all wiring"}">${ICON.link}</button><button class="ib" data-act="fit"`); }
{ const _pw = paintWorld; paintWorld = function () { _pw(); paintLanes(); paintDnaBar(); }; }
{ const _mc = mountCanvas; mountCanvas = function () { const s = cur(); const first = S.vpFor !== S.showId;
    if (s && !isEx() && !s.laned && Object.keys(S.nodes).length >= 3) { arrangeLanes(); s.laned = true; s.laneV = 2; Store.putShow(s); S.vpFor = null; }
    else if (s && !isEx() && s.laned && (s.laneV || 1) < 2) { arrangeConvertOnly(); s.laneV = 2; Store.putShow(s); S.vpFor = null; }
    _mc(); loadShowStats();
    if (first && innerWidth <= 760 && Object.keys(S.nodes).length) requestAnimationFrame(() => requestAnimationFrame(() => laneFocus(Object.values(S.nodes).some(n => laneOf(n) === "hook") ? "hook" : "convert")));
  }; }
{ const _an = addNodes; addNodes = function (nodes, edges = []) { _an(nodes, edges); const s = cur(); if (s && !s.laned && Object.keys(S.nodes).length >= 3) { arrangeLanes(); s.laned = true; s.laneV = 2; if (!isEx()) Store.putShow(s); if (S.view === "canvas") { paintAll(); fitSoon(); } } }; }
function dnaBarHTML() {
  const s = cur(); if (!s) return ""; const d = dnaOf(s); const life = lifeOf(s);
  if (!+d.target && !s.launched) return `<button class="dnab cta" data-act="view" data-v="plan">${ICON.target}<b>Set the show's goal</b><span class="muted">One goal, one idea, dates and budget</span></button>`;
  const pr = progressOf(s); const pc = +d.target ? Math.min(100, pr.res / +d.target * 100) : 0; const left = d.end ? dayIx(d.end) - todayIx() : null; const sug = typeof needsList === "function" ? needsList().length : 0;
  return `<button class="dnab" data-act="view" data-v="plan" title="Open the plan">${lifeChip(life)}
    <span class="dnab-goal"><b class="px">${num(pr.res)}</b><span>/ ${num(+d.target)}<span class="u"> ${unitOf(d.goal, d.target)}</span></span></span><span class="dnab-bar" aria-hidden="true"><i style="width:${pc}%"></i></span>
    ${left != null ? `<span class="dnab-x">${life === "draft" ? `${fmtISO(d.start)} → ${fmtISO(d.end)}` : life === "scheduled" ? `starts in ${dayIx(d.start) - todayIx()} d` : left >= 0 ? `${left} d left` : "ended"}</span>` : ""}
    ${d.budget !== "" ? `<span class="dnab-x">${budgetLine(pr, d)}</span>` : ""}</button>
    ${sug ? `<button class="dnab sug needs" data-act="view" data-v="needs" aria-label="${sug} waiting on you">${ICON.inbox}<span class="nb">${sug}</span><span class="sl"> need${sug > 1 ? "" : "s"} you</span></button>` : ""}`;
}
function paintDnaBar() { const el = $("#goalpill"); if (el) el.innerHTML = dnaBarHTML(); const lc = $("#lanechips"); if (lc) lc.innerHTML = laneChipsHTML(); }

/* ---------- navigation: Plan → Build → On air → Results ---------- */
const VIEW_LABEL = { plan: "Plan", canvas: "Build", timeline: "Timeline", live: "Results", threads: "Threads", assets: "Assets", needs: "Needs you" };
{ const _vb = viewBody; viewBody = function () { if (S.view === "plan" && cur()) return planView(); return _vb(); }; }
sidebar = function () {
  const show = cur(); const shows = Object.values(S.shows).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const f = S.find.toLowerCase(); const list = shows.filter(s => !f || s.name.toLowerCase().includes(f));
  const th = Object.values(S.threads); const nUnread = th.filter(t => Reads.unread(t)).length; const nNeeds = th.filter(t => t.status === "needs").length, nOpen = th.filter(t => t.status === "open").length, nDone = th.filter(t => t.status === "done").length;
  const anyNeeds = shows.some(s => s.id !== S.showId && s.needs) || (S.showId && nNeeds);
  const row = (act, ic, label, extra = "", on = false, attrs = "", cls = "") => `<button class="srow ${cls}" data-act="${act}" ${attrs} aria-current="${on}"><span class="ic">${ic}</span><span class="lbl">${label}</span>${extra}</button>`;
  const dot = (c) => `<span style="width:7px;height:7px;border-radius:50%;background:${c}"></span>`;
  const life = show ? lifeOf(show) : "draft";
  return `<div class="sb-top"><button class="wordmark" data-act="home" aria-label="Webshow Campaign Studio home">webshow<i>.ai</i></button><button class="ib" data-act="sbtoggle" aria-label="Hide sidebar">${ICON.sidebar}</button></div>
  <div class="sb-scroll">
    <label class="sb-search">${ICON.search}<input id="findshow" placeholder="Find a show" value="${esc(S.find)}" autocomplete="off"></label>
    ${row("home", ICON.spark, "Showrunner", anyNeeds ? dot("var(--cta)") : "", S.view === "home", "", "brand")}
    ${row("templates", ICON.grid, "Show formats", "", false, "", "brand")}
    ${row("view", ICON.plug, "Connectors", Object.values(S.con?.conns || {}).some(c => c.on) ? dot("var(--live)") : "", S.view === "connectors", 'data-v="connectors"', "brand")}
    <div class="sb-sep"></div>
    ${show ? `<div class="sb-show" style="--st:${tintOf(show)}"><button class="sb-head srow" data-act="settings" style="font-weight:600"><span class="av" style="--nc:${tintOf(show)}">${esc((show.name || "?")[0].toUpperCase())}</span><span class="lbl">${esc(show.name)}</span>${lifeChip(life)}</button>
      ${typeof needsList === "function" ? (() => { const c = needsList().length; return row("view", ICON.inbox, "Needs you", c ? `<span class="badge" title="${c} waiting on you">${c}</span>` : `<span class="ct">0</span>`, S.view === "needs", 'data-v="needs"', "needs-row"); })() : ""}
      <div class="sb-flow">
      ${row("view", ICON.timeline, "Timeline", life === "live" && onAirNow(show) ? dot("var(--live)") : "", S.view === "timeline", 'data-v="timeline"')}
      ${row("view", ICON.nodes, "Build", `<span class="ct">${Object.keys(S.nodes).length}</span>`, S.view === "canvas", 'data-v="canvas"')}
      ${row("view", ICON.image, "Assets", `<span class="ct">${Object.values(S.nodes).filter(n => n.type === "image").length}</span>`, S.view === "assets", 'data-v="assets"')}
      ${row("view", ICON.trophy, "Results", "", S.view === "live", 'data-v="live"')}
      ${row("view", ICON.target, "Plan", +dnaOf(show).target ? "" : `<span class="ct">set goal</span>`, S.view === "plan", 'data-v="plan"')}</div>
      ${row("threadsnav", ICON.chat, "Threads", `${nUnread ? `<span class="badge" title="${nUnread} unread">${nUnread}</span>` : ""}<span class="ct">${th.length}</span>`, S.view === "threads" && S.tfilter === "all", `aria-expanded="${!!S.thOpen}"`)}
      ${S.thOpen ? `<div class="sb-subs">
      <button class="srow sub ${nNeeds ? "needs" : ""}" data-act="view" data-v="threads" data-f="needs" aria-current="${S.view === "threads" && S.tfilter === "needs"}"><span class="ic">${ICON.hand}</span><span class="lbl">Decisions</span><span class="ct">${nNeeds}</span></button>
      <button class="srow sub" data-act="view" data-v="threads" data-f="open" aria-current="${S.view === "threads" && S.tfilter === "open"}"><span class="ic">${ICON.chat}</span><span class="lbl">Open</span><span class="ct">${nOpen}</span></button>
      <button class="srow sub" data-act="view" data-v="threads" data-f="done" aria-current="${S.view === "threads" && S.tfilter === "done"}"><span class="ic">${ICON.check}</span><span class="lbl">Done</span><span class="ct">${nDone}</span></button></div>` : ""}
      ${row("settings", ICON.sliders, "Show settings")}</div>
      <div class="sb-sep"></div>` : ""}
    ${list.filter(s => s.id !== S.showId).slice(0, 8).map(s => `<button class="srow" data-act="open" data-id="${s.id}"><span class="av" style="--nc:${tintOf(s)}">${esc((s.name || "?")[0].toUpperCase())}</span><span class="lbl">${esc(s.name)}</span>${lifeOf(s) === "live" && onAirNow(s) ? dot("var(--live)") : ""}${s.needs ? `<span class="badge">${s.needs}</span>` : ""}</button>`).join("")}
    ${shows.length > 9 ? row("home", ICON.grid, "All shows…") : ""}
  </div>
  <div class="sb-foot">
    ${typeof tierFootHTML === "function" ? tierFootHTML() : ""}
    ${row("newshow", ICON.plus, "Start new show", "", false, "", "brand")}
    ${row("share", ICON.share, "Invite your team", "", false, "", "brand")}
    <div class="me">${People.avatar(Store.me.id, `<i class="on"></i>`)}<b style="font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(Store.me.name || "You")}</b><button class="ib" data-act="theme" aria-label="Switch light or dark">${P('<path d="M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5Z"/>')}</button></div>
  </div>`;
};
topbar = function () {
  const show = cur(); let t = "";
  if (S.view === "connectors") t = `<b class="px" style="font-size:15px">Connectors</b>`;
  else if (S.view === "home" || !show) t = `<b class="px" style="font-size:15px">Showrunner</b>`;
  else t = `${show.example ? `<span class="tag">${esc(show.name)}</span>` : `<button class="tag tag-btn" data-act="rename" title="Rename show">${esc(show.name)} ${P('<path d="M10.5 2.5l3 3L6 13H3v-3z"/>').replace('class="icon"', 'class="icon sm"')}</button>`}<b class="bar-view">${VIEW_LABEL[S.view] || ""}</b>${show.example ? `<span class="muted bar-note" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">· Example: edits aren't saved</span><button class="btn sm bar-dup" data-act="dupex">Duplicate to keep</button>` : ""}`;
  return `<header class="bar">
    <button class="ib only-m" data-act="sbopen" aria-label="Open sidebar">${ICON.menu}</button>
    ${S.sbHidden ? `<button class="ib" data-act="sbtoggle" aria-label="Show sidebar">${ICON.sidebar}</button>` : ""}
    <div class="title">${t}</div>
    ${show && !["home", "connectors", "plan"].includes(S.view) ? `<div class="goalpill" id="goalpill">${dnaBarHTML()}</div>` : ""}
    <div class="peers" id="peers"></div>
    ${show && !["home", "connectors"].includes(S.view) ? `<button class="btn sm bar-share" data-act="share">${ICON.share} Share</button><button class="ib bar-more" data-act="moreopen" aria-label="More actions" aria-haspopup="menu" aria-expanded="${!!S.more}">${ICON.more}</button>` : ""}
    ${S.view === "canvas" && show ? `<button class="ib bar-insp" data-act="insp" aria-pressed="${S.insp}" aria-label="Toggle inspector">${ICON.inspector}</button>` : ""}
  </header>`;
};

/* ---------- home: shows grouped by where they are in their life ---------- */
homeView = function () {
  const shows = Object.values(S.shows).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const building = Object.values(S.nodes).filter(n => n.status === "building");
  const withL = shows.map(s => ({ s, life: lifeOf(s) }));
  const running = withL.filter(x => ["live", "scheduled"].includes(x.life)); const rest = withL.filter(x => !["live", "scheduled"].includes(x.life));
  const showRow = ({ s, life }) => { const d = dnaOf(s); const pr = progressOf(s); const pc = +d.target ? Math.min(100, pr.res / +d.target * 100) : 0;
    const note = life === "live" && !onAirNow(s) ? `Started · nothing public yet · ${num(pr.res)} / ${num(+d.target)} ${unitOf(d.goal, d.target)}` : life === "paused" ? `Paused · ${num(pr.res)} / ${num(+d.target)} ${unitOf(d.goal, d.target)}` : life === "live" ? `<i class="livedot"></i>${num(pr.res)} / ${num(+d.target)} ${unitOf(d.goal, d.target)}${d.end ? ` · ${Math.max(0, dayIx(d.end) - todayIx())} d left` : ""}` : life === "scheduled" ? `Starts ${fmtISO(d.start, { weekday: "short", day: "numeric", month: "short" })} · ${goalLine(s)}` : life === "draft" ? (+d.target ? `Draft · goal ${goalLine(s)}` : "Draft · no goal yet") : `${LIFE[life][0]} · ${num(pr.res)} / ${num(+d.target || 0)} ${unitOf(d.goal, d.target)}`;
    return `<button class="li" data-act="open" data-id="${s.id}" data-v="${life === "draft" && !+d.target ? "plan" : life === "live" || life === "scheduled" ? "timeline" : life === "draft" ? "canvas" : "live"}"><span class="av" style="--nc:${tintOf(s)}">${esc((s.name || "?")[0].toUpperCase())}</span><span class="t"><b>${esc(s.name)}</b><span>${note}</span>${["live", "ended", "results"].includes(life) && +d.target ? `<span class="hprog"><i style="width:${pc}%"></i></span>` : ""}</span>${s.needs ? `<span class="chip st-needs"><i></i>${s.needs} needs you</span>` : ""}</button>`; };
  return `<div class="home-dots"><div data-dots-canvas-init="" class="interactive-dots-grid" data-dots-color-inactive="var(--dots-off)" data-dots-color-active="var(--dots-on)"></div><div class="home"><div class="home-in">
    ${obStartHTML()}
    <div class="sec-h" style="margin-bottom:-14px"><span>Or start from a show format</span><button class="btn sm ghost" data-act="templates">${ICON.grid} All formats</button></div>
    <div class="sugg">${Object.entries(SHOW_FORMATS).slice(0, 3).map(([k, f]) => `<button data-act="fmtnew" data-k="${k}"><b>${esc(f.label)}</b><span>${esc(f.desc)}</span></button>`).join("")}</div>
    <div class="hgrid">
      <div>
        <div class="sec-h"><span>On air &amp; scheduled<span class="n">${running.length}</span></span></div>
        <div style="display:grid;gap:2px">${running.map(showRow).join("") || `<p class="muted" style="padding:6px 8px">No show is on air. Set a goal and dates in Plan, then schedule the show.</p>`}</div>
        ${building.length ? `<div class="sec-h" style="margin-top:18px"><span>In production<span class="n">${building.length}</span></span></div>${building.map(n => `<button class="li" data-act="gonode" data-id="${n.id}"><span class="nico" style="--nc:${NT[n.type].color}">${ICON[NT[n.type].icon]}</span><span class="t"><b>${esc(n.title)}</b><span>Showrunner is building</span></span></button>`).join("")}` : ""}
      </div>
      <div>
        <div class="sec-h"><span>Drafts &amp; finished<span class="n">${rest.length}</span></span><button class="btn sm ghost" data-act="newshow">${ICON.plus} New</button></div>
        <div style="display:grid;gap:2px">${rest.map(showRow).join("") || `<p class="muted" style="padding:6px 8px">Nothing here.</p>`}</div>
      </div>
    </div>
  </div></div></div>`;
};

/* ---------- new shows start with a plan ---------- */
{ const _cs = createShow; createShow = function (o) { const s = _cs(o); s.dna = { ...DNA_DEF(), business: o?.name || "" }; s.laned = false; s.fresh = true; Store.putShow(s); return s; }; }
{ const _os = openShow; openShow = function (id, view = "canvas") { const s = S.shows[id]; if (view === "canvas" && innerWidth <= 760 && S.showId !== id) view = "timeline"; if (s?.fresh) { delete s.fresh; if (!isEx()) Store.putShow(s); view = "plan"; } _os(id, view); if (view === "plan" || view === "timeline" || view === "live") loadShowStats(); }; }

/* ---------- Plan view ---------- */
const fD = (k, label, opt = {}) => {
  const v = dnaOf()[k] ?? ""; const id = "dna_" + k;
  if (opt.ta) return `<label class="fld ${opt.cls || ""}"><span>${label}</span><textarea class="ta" id="${id}" data-dna="${k}" placeholder="${esc(opt.ph || "")}" style="min-height:${(opt.rows || 2) * 22}px">${esc(v)}</textarea>${opt.hint ? `<small>${opt.hint}</small>` : ""}</label>`;
  if (opt.sel) return `<label class="fld"><span>${label}</span><select class="sel" id="${id}" data-dna="${k}">${opt.sel.map(([a, b]) => `<option value="${esc(a)}" ${String(v) === String(a) ? "selected" : ""}>${esc(b)}</option>`).join("")}</select></label>`;
  return `<label class="fld ${opt.cls || ""}"><span>${label}</span><input class="inp" id="${id}" data-dna="${k}" type="${opt.type || "text"}" value="${esc(v)}" placeholder="${esc(opt.ph || "")}" ${opt.min != null ? `min="${opt.min}"` : ""} ${opt.type === "number" ? 'inputmode="numeric"' : ""}>${opt.hint ? `<small>${opt.hint}</small>` : ""}</label>`;
};
function readiness() {
  const s = cur(); const d = dnaOf(s); const ns = Object.values(S.nodes); const pg = mainPage(); const eps = typeof epList === "function" ? epList() : [];
  return [
    ["Goal and target", +d.target > 0, `${goalLine(s)}`, true],
    ["Dates", !!(d.start && d.end && d.end >= d.start), d.start ? `${fmtISO(d.start)} → ${fmtISO(d.end) || "?"}` : "Start and end", true],
    ["Budget", d.budget !== "", d.budget !== "" ? `€${num(+d.budget)}` : "0 is fine for an organic show", true],
    ["Big idea", !!str(d.idea), str(d.idea) ? `“${str(d.idea).slice(0, 60)}”` : "One sentence the whole show is built around", false],
    ["Visual identity", !!mainStyle(), mainStyle() ? (LOOKS[mainStyle().p.look]?.label || "Custom style") : "Pick a design style", false],
    ["Landing page", !!pg?.p.sections?.length, pg ? (pg.p.sections?.length ? "Built" : "Not built yet") : "Not added yet", false],
    ["Episodes", eps.length > 0 && eps.every(n => n.p.start), eps.length ? `${eps.length} episode${eps.length > 1 ? "s" : ""}${eps.some(n => !n.p.start) ? `, ${eps.filter(n => !n.p.start).length} without a date` : ", all dated"}` : "Plan the season below", false],
  ];
}
function goalCardHTML() {
  const s = cur(); const d = dnaOf(s); const life = lifeOf(s); const pr = progressOf(s); const pc = +d.target ? Math.min(100, pr.res / +d.target * 100) : 0; const R = readiness(); const must = R.filter(r => r[3]).every(r => r[1]);
  const exp = +d.target ? Math.round(+d.target * pr.frac) : 0;
  return `<div class="goal-top"><div style="display:grid;gap:6px;min-width:0"><span class="dk-l">${lifeNote(life, s)}</span><h2 class="goal-h">${+d.target ? esc(goalLine(s)) : "What's the one goal?"}</h2>${str(d.idea) ? `<p class="goal-idea">“${esc(d.idea)}”</p>` : `<p class="muted">Write the one idea the whole show is built around.</p>`}</div>
      <div class="goal-act">${lifeChip(life)}${["draft", "paused"].includes(life) ? `<button class="btn primary" data-act="launchshow" ${must ? "" : "disabled"} title="${must ? (life === "paused" ? "Resume the show" : "Schedule the show") : "Add a goal, dates and budget first"}">${ICON.rocket} ${life === "paused" ? "Resume the show" : "Schedule the show"}</button>` : ["live", "scheduled"].includes(life) ? `<button class="btn" data-act="unlaunch">Pause</button>` : `<button class="btn" data-act="view" data-v="live">${ICON.trophy} See the report</button>`}</div></div>
    ${life !== "draft" ? `<div class="goal-prog"><div class="gp-bar"><i style="width:${pc}%"></i>${pr.frac > 0 && pr.frac < 1 ? `<b style="left:${Math.min(100, exp / +d.target * 100)}%" title="Where the show should be today"></b>` : ""}</div><span><b class="px">${num(pr.res)}</b> of ${num(+d.target)} ${unitOf(d.goal, d.target)}${pr.frac > 0 && pr.frac < 1 ? ` · on pace for ${num(Math.round(pr.res / pr.frac))}` : ""}${pr.sample ? " · sample" : ""}</span></div>` : ""}
    ${readyHTML(R, life)}`;
}
function forecast(b) { b = +b || 0; return { lo: Math.round(b / 1.2 * .02), hi: Math.round(b / .5 * .06), clicksLo: Math.round(b / 1.2), clicksHi: Math.round(b / .5) }; }
function planView() {
  const s = cur(); const d = dnaOf(s); const ms = mainStyle(); const fc = forecast(d.budget);
  return `<div class="home" style="background:var(--canvas)"><div class="home-in plan-in">
    <div class="dash-h"><div style="display:grid;gap:4px"><span class="px vt" style="font-size:24px">Plan</span><span class="muted">One idea. One goal. One show. Everything you build reads this page.</span></div>
      <div class="swrow"><button class="btn sm" data-act="view" data-v="canvas">${ICON.nodes} Build</button><button class="btn sm" data-act="view" data-v="timeline">${ICON.onair} On air</button></div></div>
    <section class="goalcard" id="plangoal">${goalCardHTML()}</section>
    <div class="plan-grid">
      <section class="dcard"><div class="dcard-h"><b>Show DNA</b><span class="muted" style="font-size:12px">Blocks read this automatically</span></div>
        <div class="g2">${fD("goal", "Goal", { sel: GOAL_OPTS })}${fD("target", `Target, ${unitOf(d.goal, 2)}`, { type: "number", min: 0, ph: "e.g. 40" })}</div>
        ${fD("idea", "The big idea", { ta: 1, rows: 2, ph: "e.g. Any shore is sauna shore", hint: "One sentence. Every episode is a variation of it." })}
        ${fD("offer", "Offer", { ta: 1, rows: 2, ph: "What exactly are you selling, and why now?" })}
        ${fD("audience", "Audience", { ph: "Who it's for" })}
        <div class="g2">${fD("business", "Business")}${fD("cta", "Main action", { ph: "e.g. Book a weekend" })}</div>
        ${fD("facts", "Facts we can back up", { ta: 1, rows: 2, ph: "Prices, guarantees, numbers. Showrunner only uses facts written here." })}
        <div class="g3">${fD("start", "Starts", { type: "date" })}${fD("end", "Ends", { type: "date" })}${fD("budget", "Budget, €", { type: "number", min: 0, ph: "0 = organic" })}</div>
      </section>
      <div style="display:grid;gap:12px;align-content:start">
        <section class="dcard"><div class="dcard-h"><b>Visual identity</b>${ms ? `<button class="btn sm ghost" data-act="gonode" data-id="${ms.id}">Edit style guide</button>` : ""}</div>
          <div class="plooks">${Object.entries(LOOKS).map(([k, L]) => `<button class="plook" data-act="planlook" data-k="${k}" aria-pressed="${ms?.p.look === k}" title="${esc(L.desc)}"><span class="pl-sw">${L.palette.map(c => `<i style="background:${c}"></i>`).join("")}</span><span>${esc(L.label)}</span></button>`).join("")}</div>
          <small class="faint">One style guide for the whole show. Every page, post and ad inherits it.</small></section>
        <section class="dcard"><div class="dcard-h"><b>Budget and forecast</b></div>
          ${+d.budget ? `<div class="fc"><b class="px">${num(fc.lo)}–${num(fc.hi)}</b><span>${unitOf(d.goal, 2)} from paid traffic, roughly</span></div>
          <small class="faint">Assumes €0.50–1.20 per click and 2–6 % of visitors taking the main action. ${+d.target ? (+d.target > fc.hi ? `Your target of ${num(+d.target)} needs organic episodes or a bigger budget.` : +d.target < fc.lo ? `Your target looks safe with this budget.` : `Your target of ${num(+d.target)} is within reach.`) : ""}</small>
          ${s.plan?.split ? `<div class="split">${Object.entries(s.plan.split).filter(([, v]) => +v > 0).map(([k, v]) => `<span><b>€${num(+v)}</b>${esc({ meta: "Meta ads", google: "Google Ads", boost: "Boosted posts", organic: "Organic" }[k] || k)}</span>`).join("")}</div>` : ""}`
          : `<p class="muted" style="font-size:13px">No paid budget: the show runs on organic episodes. Add a budget to boost episodes and run ads.</p>`}</section>
      </div>
    </div>
    ${typeof seasonCard === "function" ? seasonCard() : ""}
  </div></div>`;
}
function repaintPlanGoal() { const g = $("#plangoal"); if (g) g.innerHTML = goalCardHTML(); }
document.addEventListener("input", (e) => {
  const t = e.target; const k = t.dataset?.dna; if (!k || !cur()) return;
  saveDna({ [k]: ["target"].includes(k) ? Math.max(0, +t.value || 0) : k === "budget" ? (t.value === "" ? "" : Math.max(0, +t.value || 0)) : t.value });
  repaintPlanGoal(); renderSidebarOnly();
  if (["target", "start", "end", "budget"].includes(k) && typeof seasonCard === "function") { const sc = $(".season"); if (sc) sc.outerHTML = seasonCard(); }
});
document.addEventListener("change", (e) => { const t = e.target; if (!t.dataset?.dna || !cur()) return; if (t.tagName === "SELECT" || t.type === "date") { if (t.type === "date" && t.dataset.dna === "end" && dnaOf().start && t.value && t.value < dnaOf().start) { saveDna({ end: dnaOf().start }); toast("The show can't end before it starts."); } rerenderBody(); } });
Object.assign(A, {
  planlook(b) {
    let n = mainStyle(); if (!n) { n = addNode("style", 0, -300, { title: "Style guide", exact: true }); n.p.main = true; }
    const L = LOOKS[b.dataset.k]; Object.assign(n.p, { look: b.dataset.k, palette: L.palette.slice(), fontPair: L.fontPair, mode: L.mode, radius: L.radius, vis: clone(L.vis) }); hist(n, "Design style: " + L.label); commitNode(n); rerenderBody(); toast(`${L.label} is now the show's look`);
  },
  launchshow() {
    const s = cur(); const d = dnaOf(s); if (!readiness().filter(r => r[3]).every(r => r[1])) return toast("Add a target, dates and a budget first.");
    const resumed = !!s.paused; s.launched = now(); s.report = null; s.paused = 0;
    Object.values(S.nodes).forEach(n => {
      if (n.type === "publish") { n.p.start = n.p.start || d.start; n.p.end = n.p.end || d.end; hist(n, "Follows the show's dates"); commitNode(n); }
      if (n.type === "adchannel" && (n.p.platforms || []).length) { n.p.start = n.p.start || d.start; n.p.end = n.p.end || d.end; n.p.launched = n.p.launched || now(); commitNode(n); }
    });
    if (!isEx()) Store.putShow(s); runSchedules(); render();
    toast(todayISO() < d.start ? `Scheduled. It starts ${fmtISO(d.start, { weekday: "long", day: "numeric", month: "long" })}.` : onAirNow(s) ? (resumed ? "Resumed. The show is on air." : "The show is on air.") : "The show has started. Publish the landing page or send the first episode to go live.");
  },
  unlaunch() { const s = cur(); s.launched = 0; s.paused = now(); if (!isEx()) Store.putShow(s); render(); toast("Paused. Nothing new is scheduled; published pages and running ads stay as they are."); },
});

/* ---------- the example show becomes a real show ---------- */
{ const _ex = exampleShow;
  exampleShow = function () {
    const ex = _ex(); const t = todayISO(); const by = (type) => Object.values(ex.nodes).find(n => n.type === type);
    ex.show.dna = { ...DNA_DEF(), goal: "bookings", target: 40, idea: "Any shore is sauna shore", business: "Kivi Sauna Co.", offer: "Weekend rental of a wood-fired trailer sauna, delivered and set up anywhere in Uusimaa", audience: "Friend groups and families planning a summer cabin weekend or a party", cta: "Book a weekend", facts: by("brief").p.facts, start: addDays(t, -12), end: addDays(t, 16), budget: 1200 };
    ex.show.launched = now() - 13 * DAY; ex.show.laned = true;
    ex.show.plan = { format: "booking", strategy: { who: "Friend groups who already rented a cabin for a summer weekend", message: "Your weekend gets a sauna, wherever it is", whyNow: "June weekends book out first; the hot tub add-on is included this month", oneLiner: "We show the sauna turning up at shores people know, then make booking a weekend the obvious next step." }, split: { meta: 650, google: 350, boost: 200 }, at: now() - 14 * DAY };
    return ex;
  }; }

/* pages only go live on their own once the show is scheduled */
{ const _rs = runSchedules; runSchedules = async function () { const s = cur(); if (s?.dna?.start && !s.launched) return; return _rs(); }; }

/* overflow menu: the things you don't need every minute */
function moreMenu() {
  const s = cur(); if (!S.more || !s) return "";
  const item = (act, ic, label, extra = "") => `<button class="mi" data-act="${act}" role="menuitem" ${extra}>${ic}<span>${label}</span></button>`;
  return `<div class="scrim" style="background:transparent;display:block" data-act="moreclose"><div class="pop more-pop" data-stop="1" role="menu" aria-label="More actions">
    ${s.example ? item("dupex", ICON.copy, "Duplicate to keep") : item("morerename", P('<path d="M10.5 2.5l3 3L6 13H3v-3z"/>'), "Rename show")}
    ${item("share", ICON.share, "Share and invite")}
    ${item("settings", ICON.sliders, "Show settings")}
    ${item("tplsaveopen", ICON.grid, "Save as a show format")}
    ${item("theme", P('<path d="M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5Z"/>'), "Light or dark")}</div></div>`;
}
{ const _cl = conLayer; conLayer = () => _cl() + moreMenu(); }
{ const wrap = (k) => { const f = A[k]; A[k] = function (...a) { if (S.more) { S.more = false; paintLayer(); } return f.apply(this, a); }; }; ["dupex", "share", "settings", "tplsaveopen", "theme"].forEach(wrap); }
Object.assign(A, {
  moreopen() { S.more = !S.more; paintLayer(); },
  moreclose(t, e) { if (e && e.target !== t) return; S.more = false; paintLayer(); },
  morerename() { S.more = false; paintLayer(); const b = $(".tag-btn"); if (b) A.rename(b); },
});
/* phone: the inspector sheet appears when a node is picked */
{ const _sn = selectNode; selectNode = function (id, tab) { _sn(id, tab); if (S.view === "canvas" && !$("#insp")) { S.insp = true; render(); } }; }

/* ---------- Batch 2: the canvas reads as a funnel ---------- */
S.wiresAll = lsGet("wss.wiresAll", false);
const nodeBox = (n) => { const el = $(`#nodes .nd[data-id="${n.id}"]`); return { x: n.x, y: n.y, w: el?.offsetWidth || nodeW(n), h: el?.offsetHeight || (EST_H[n.type] || 260) }; };
function engineNodes() { return Object.values(S.nodes).filter(n => CONVERT_TYPES.has(n.type)); }
function engineBox() { const ns = engineNodes(); if (!ns.length) return null; const bs = ns.map(nodeBox); const x0 = Math.min(...bs.map(b => b.x)) - 24, y0 = Math.min(...bs.map(b => b.y)) - 64, x1 = Math.max(...bs.map(b => b.x + b.w)) + 24, y1 = Math.max(...bs.map(b => b.y + b.h)) + 24; return { x0, y0, x1, y1 }; }
/* the Engine frame, and a light arrow from every episode into it: the customer's path */
function paintJourney() {
  const box = $("#journey"); if (!box) return; const E = engineBox(); if (!E) { box.innerHTML = ""; return; }
  const pg = mainPage(); const pb = pg ? nodeBox(pg) : null; const ty = pb ? pb.y + Math.min(120, pb.h / 2) : (E.y0 + E.y1) / 2;
  const eps = Object.values(S.nodes).filter(n => typeof isEpisode === "function" && isEpisode(n) && linkInfo(n)?.page);
  const paths = eps.map(n => { const b = nodeBox(n); const a = [b.x + b.w, b.y + 44]; const z = [E.x0, ty]; const on = S.sel === n.id || S.sel === pg?.id;
    return `<path class="jpath ${on ? "on" : ""}" d="${curve(a, z)}" marker-end="url(#jarrow)"/>`; }).join("");
  const live = pg && pubFor(pg)?.p.live;
  box.innerHTML = `<div class="engine ${live ? "live" : ""}" style="left:${E.x0}px;top:${E.y0}px;width:${E.x1 - E.x0}px;height:${E.y1 - E.y0}px"><div class="engine-h"><b>Engine</b><span>${live ? "Always on · every episode sends people here" : "Every episode sends people here · not published yet"}</span></div></div>
    <svg class="jsvg" width="1" height="1" aria-hidden="true"><defs><marker id="jarrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs>${paths}</svg>`;
}
{ const _dw = drawWires; drawWires = function (ghost) { _dw(ghost); $$("#wires path[data-edge]:not(.hit)").forEach(p => { const e = S.edges[p.dataset.edge]; if (!e) return; const on = S.wiresAll || S.selEdge === e.id || (S.sel && (e.from === S.sel || e.to === S.sel)); p.style.opacity = on ? (S.selEdge && S.selEdge !== e.id ? .5 : .95) : .13; }); paintJourney(); }; }
/* lane chips: zoom to one lane at a time (on phones the canvas opens on a readable lane) */
function laneChipsHTML() {
  if (!cur()) return ""; const ns = Object.values(S.nodes); if (!ns.length) return "";
  const cnt = (k) => ns.filter(n => laneOf(n) === k).length; const f = S.laneF || "all";
  return `<div class="seg lchips" role="group" aria-label="Focus a lane"><button data-act="lanefocus" data-l="all" aria-pressed="${f === "all"}">All</button>${LANES.map(([k, l]) => cnt(k) ? `<button data-act="lanefocus" data-l="${k}" aria-pressed="${f === k}">${l}<span class="lc-n">${k === "kit" ? "" : ns.filter(n => typeof isEpisode === "function" && isEpisode(n) && laneOf(n) === k).length || ""}</span></button>` : "").join("")}</div>`;
}
function laneFocus(k) {
  const cv = $("#cv"); if (!cv) return; S.laneF = k; const lc = $("#lanechips"); if (lc) lc.innerHTML = laneChipsHTML();
  if (k === "all") return fit();
  let ns = Object.values(S.nodes).filter(n => laneOf(n) === k); if (k === "convert") ns = [...ns, ...engineNodes()];
  if (!ns.length) return fit(); const bs = ns.map(nodeBox);
  const b = { x0: Math.min(...bs.map(q => q.x)) - 30, y0: Math.min(...bs.map(q => q.y)) - 150, x1: Math.max(...bs.map(q => q.x + q.w)) + 30, y1: Math.max(...bs.map(q => q.y + q.h)) + 30 };
  const W = cv.clientWidth, H = cv.clientHeight - (innerWidth <= 760 ? 150 : 110), minK = innerWidth <= 760 ? .78 : .5;
  const k0 = Math.min(1.1, Math.max(minK, Math.min((W - 32) / (b.x1 - b.x0), (H - 70) / (b.y1 - b.y0))));
  S.vp = { k: k0, x: Math.max(16 - b.x0 * k0, (W - (b.x1 - b.x0) * k0) / 2 - b.x0 * k0), y: (innerWidth <= 760 ? 58 : 50) - b.y0 * k0 }; applyVp();
}
Object.assign(A, {
  lanefocus(b) { laneFocus(b.dataset.l); },
  wirestoggle(b) { S.wiresAll = !S.wiresAll; lsSet("wss.wiresAll", S.wiresAll); b.setAttribute("aria-pressed", S.wiresAll); b.title = b.ariaLabel = S.wiresAll ? "Fade wiring" : "Show all wiring"; drawWires(); toast(S.wiresAll ? "Showing all wiring" : "Wiring fades unless you select a node"); },
});
{ const _f = fit; fit = function () { _f(); if (S.laneF && S.laneF !== "all") { S.laneF = "all"; const lc = $("#lanechips"); if (lc) lc.innerHTML = laneChipsHTML(); } }; }

/* Plan: the next step first, finished items folded away */
function nextStepOf(label) {
  const pg = mainPage(); const eps = epList();
  return { "Goal and target": ["Set the target", "focus", "target"], "Dates": ["Pick the dates", "focus", "start"], "Budget": ["Set a budget", "focus", "budget"], "Big idea": ["Write the big idea", "focus", "idea"],
    "Visual identity": ["Pick a design style", "scroll", ".plooks"],
    "Landing page": pg ? ["Build the landing page", "buildpage", ""] : ["Plan the season", "scroll", ".season"],
    "Episodes": eps.length ? ["Give them dates", "view", "timeline"] : ["Plan the season", "scroll", ".season"] }[label] || ["Open", "scroll", ".plan-grid"];
}
function readyHTML(R, life) {
  const todo = R.filter(r => !r[1]), done = R.filter(r => r[1]); const tile = ([l, ok, v, req]) => `<div class="rd ${ok ? "ok" : req ? "req" : ""}"><span class="rd-i">${ok ? ICON.check : ""}</span><span class="t"><b>${l}</b><span>${esc(v)}</span></span></div>`;
  const n0 = todo[0]; const ns = n0 ? nextStepOf(n0[0]) : null; const mustLeft = todo.some(r => r[3]);
  return `<div class="ready2">${n0 ? `<div class="next-step ${n0[3] ? "req" : ""}"><span class="t"><span class="dk-l">Next step${n0[3] ? " · needed to schedule" : ""}</span><b>${esc(n0[0])}</b><span>${esc(n0[2])}</span></span><button class="btn ${mustLeft || life !== "draft" ? "primary" : ""} sm" data-act="plannext" data-k="${ns[1]}" data-v="${esc(ns[2])}">${esc(ns[0])}</button></div>` : ""}
    ${todo.length > 1 ? `<div class="ready">${todo.slice(1).map(tile).join("")}</div>` : ""}
    ${done.length ? `<details class="ready-done" ${todo.length ? "" : "open"}><summary>${ICON.check} ${done.length} of ${R.length} ready</summary><div class="ready">${done.map(tile).join("")}</div></details>` : ""}</div>`;
}
A.plannext = function (b) {
  const k = b.dataset.k, v = b.dataset.v;
  if (k === "focus") { const el = $("#dna_" + v); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => el.focus(), 250); } }
  else if (k === "scroll") $(v)?.scrollIntoView({ behavior: "smooth", block: "start" });
  else if (k === "buildpage") { const pg = mainPage(); if (pg) { buildNode(pg); toast("Showrunner is building the landing page"); } }
  else if (k === "view") { S.view = v; render(); }
};
