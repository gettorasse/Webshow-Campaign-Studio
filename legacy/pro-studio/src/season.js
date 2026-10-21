/* ============================================================
   Season: Showrunner plans the whole show from the DNA, keeps
   running it (weekly check) and writes the end report.
   ============================================================ */
const SHOW_FORMATS = {
  launch: { label: "4-week launch", desc: "Tease, reveal, prove, close. For something new.", weeks: 4, eps: [[0, "hook", "teaser", "image"], [.1, "hook", "teaser", "poll"], [.25, "hook", "launch", "carousel"], [.27, "hook", "launch", "metaad"], [.45, "show", "proof", "quiz"], [.6, "show", "proof", "carousel"], [.78, "convert", "urgency", "metaad"], [.93, "convert", "last", "image"]] },
  booking: { label: "Booking show", desc: "Steady proof and an easy way to book. For services.", weeks: 6, eps: [[0, "hook", "launch", "carousel"], [0, "hook", "teaser", "ad"], [.12, "hook", "teaser", "poll"], [.3, "show", "proof", "image"], [.45, "show", "proof", "quiz"], [.6, "show", "proof", "carousel"], [.8, "convert", "urgency", "metaad"], [.94, "convert", "last", "image"]] },
  countdown: { label: "Event countdown", desc: "Build up to one date and fill the room.", weeks: 3, eps: [[0, "hook", "teaser", "image"], [.15, "hook", "launch", "carousel"], [.18, "hook", "launch", "metaad"], [.4, "show", "proof", "poll"], [.6, "show", "proof", "image"], [.8, "convert", "urgency", "metaad"], [.97, "convert", "last", "image"]] },
  seasonal: { label: "Seasonal campaign", desc: "Ride a season or holiday with a clear end date.", weeks: 5, eps: [[0, "hook", "teaser", "image"], [.08, "hook", "launch", "carousel"], [.1, "hook", "launch", "metaad"], [.35, "show", "proof", "quiz"], [.55, "show", "proof", "carousel"], [.75, "convert", "urgency", "metaad"], [.92, "convert", "last", "image"]] },
};
const EP_TITLE = { teaser: "Teaser", launch: "Launch", proof: "Proof", urgency: "Urgency", last: "Last chance" };
const tierAllows = (type) => typeof nodeAllowed !== "function" || nodeAllowed(type);
function showLen(d) { const a = dayIx(d.start), b = dayIx(d.end); return a != null && b != null && b >= a ? b - a + 1 : null; }

/* ---------- planning ---------- */
function formatPlan(k, d) {
  const f = SHOW_FORMATS[k] || SHOW_FORMATS.launch; const L = showLen(d) || f.weeks * 7; const budget = +d.budget || 0;
  let eps = f.eps.map(([fr, lane, arc, type]) => ({ lane, arc, type, day: Math.min(L - 1, Math.round(fr * (L - 1))), title: `${EP_TITLE[arc]} ${EP_FMT[type].toLowerCase()}`, angle: "", channels: (EP_DEF_CH[type] || []).slice(), boost: 0, on: true }))
    .filter(e => tierAllows(e.type)).filter(e => budget || !["metaad", "ad"].includes(e.type));
  if (budget) { const paid = eps.filter(e => ["metaad", "ad"].includes(e.type)); const boosted = eps.filter(e => ["carousel", "quiz"].includes(e.type));
    paid.forEach(e => (e.boost = e.type === "ad" ? 0 : Math.round(budget * .55 / Math.max(1, paid.filter(x => x.type === "metaad").length) / 10) * 10));
    boosted.forEach(e => (e.boost = Math.round(budget * .3 / Math.max(1, boosted.length) / 10) * 10)); }
  const split = budget ? { meta: eps.filter(e => e.type === "metaad").reduce((a, e) => a + e.boost, 0), google: eps.some(e => e.type === "ad") ? Math.round(budget * .15) : 0, boost: eps.filter(e => ["carousel", "quiz"].includes(e.type)).reduce((a, e) => a + e.boost, 0) } : { organic: 0 };
  const b = d; return { format: k, eps, split, look: null,
    strategy: { who: b.audience || "The people most likely to say yes", message: b.idea || b.offer || "One clear promise", whyNow: d.end ? `The show ends ${fmtISO(d.end, { day: "numeric", month: "long" })}; the last episodes say so.` : "A clear end date gives people a reason to act.", oneLiner: `Hook people with ${eps.filter(e => e.lane === "hook").length} short episodes, prove it with ${eps.filter(e => e.lane === "show").length}, and close with ${eps.filter(e => e.lane === "convert").length} that point at the deadline.` } };
}
async function planSeason() {
  const s = cur(); if (!s) return; const d = dnaOf(s); const k = S.seasonFmt || s.plan?.format || "launch";
  if (!+d.target || !d.start || !d.end) return toast("Set the goal, target and dates first. The plan is built around them.");
  S.seasonBusy = true; rerenderBody(); let plan = null;
  if (AI.fn) {
    try {
      const L = showLen(d); const allowed = ["image", "carousel", "poll", "quiz", "metaad", "ad"].filter(tierAllows);
      const r = await AI.json(`You are Showrunner, planning a marketing campaign "show" for a small business. A show has ONE goal and ONE big idea and runs as a season of episodes. Hook episodes wake up interest, Show episodes deepen and prove, Convert episodes push the main action before the deadline. Every episode points people to the same landing page.\n${RULES}\nSHOW DNA:\n${dnaText()}\nRuns ${L} days (day 0 = ${d.start}). Budget: €${+d.budget || 0} (0 means organic only: no paid ads, no boosts).\nFORMAT: ${SHOW_FORMATS[k].label} — ${SHOW_FORMATS[k].desc}\nAllowed episode types: ${allowed.join(", ")} (image = single image post with text on it, carousel = swipeable post, poll = one-tap poll, quiz = 3-question quiz with a personal result, metaad = Facebook & Instagram ad, ad = Google search ad).\n\nReply with ONLY JSON: {"strategy": {"who": string, "message": string, "whyNow": string, "oneLiner": string max 200 chars}, "look": one of ${Object.keys(LOOKS).map(x => `"${x}"`).join("|")} that fits the business, "episodes": 6-9 {"lane": "hook"|"show"|"convert", "arc": "teaser"|"launch"|"proof"|"urgency"|"last", "type": one of the allowed types, "title": max 34 chars, "day": integer 0-${L - 1}, "angle": one line, how this episode varies the big idea, "boost": euros (0 if organic)}, "split": {"meta": euros, "google": euros, "boost": euros}}. The boosts plus split must not exceed the budget.`, { modelTier: AI.tier(S.effort) });
      const eps = arr(r?.episodes, 10).filter(e => allowed.includes(e.type)).map(e => ({ lane: ["hook", "show", "convert"].includes(e.lane) ? e.lane : "hook", arc: ARCS.some(a => a[0] === e.arc) ? e.arc : "teaser", type: e.type, title: str(e.title, EP_FMT[e.type]).slice(0, 40), day: Math.max(0, Math.min(L - 1, Math.round(+e.day || 0))), angle: str(e.angle).slice(0, 140), boost: +d.budget ? Math.max(0, Math.round(+e.boost || 0)) : 0, channels: (EP_DEF_CH[e.type] || []).slice(), on: true }));
      if (eps.length >= 3) plan = { format: k, eps, strategy: { who: str(r.strategy?.who), message: str(r.strategy?.message), whyNow: str(r.strategy?.whyNow), oneLiner: str(r.strategy?.oneLiner) }, look: LOOKS[r.look] ? r.look : null, split: r.split && typeof r.split === "object" ? { meta: +r.split.meta || 0, google: +r.split.google || 0, boost: +r.split.boost || 0 } : null };
    } catch (e) { toast(errCopy(e)); }
  }
  if (!plan) plan = formatPlan(k, d);
  plan.eps.sort((a, b) => a.day - b.day || LANE_ORD[a.lane] - LANE_ORD[b.lane]);
  S.season = { showId: S.showId, ...plan }; S.seasonBusy = false; if (S.view === "plan") rerenderBody();
}
function seasonCard() {
  const s = cur(); const d = dnaOf(s); const sd = S.season?.showId === S.showId ? S.season : null; const eps = epList(); const k = S.seasonFmt || s.plan?.format || "launch";
  const fmts = `<div class="fmts">${Object.entries(SHOW_FORMATS).map(([fk, f]) => `<button class="fmt" data-act="seasonfmt" data-k="${fk}" aria-pressed="${k === fk}"><b>${esc(f.label)}</b><span>${esc(f.desc)}</span></button>`).join("")}</div>`;
  const strat = (st) => st ? `<div class="strat"><div><span class="dk-l">Who</span><p>${esc(st.who)}</p></div><div><span class="dk-l">Message</span><p>${esc(st.message)}</p></div><div><span class="dk-l">Why now</span><p>${esc(st.whyNow)}</p></div>${st.oneLiner ? `<p class="strat-1">${esc(st.oneLiner)}</p>` : ""}</div>` : "";
  if (S.seasonBusy) return `<section class="dcard season"><div class="dcard-h"><b>Season</b></div>${typingHTML("is planning the season")}</section>`;
  if (sd) { const on = sd.eps.filter(e => e.on); const boost = on.reduce((a, e) => a + (+e.boost || 0), 0);
    return `<section class="dcard season"><div class="dcard-h"><b>Season plan · ${esc(SHOW_FORMATS[sd.format]?.label || "")}</b><span class="muted" style="font-size:12px">Draft from Showrunner. Untick what you don't want.</span></div>${strat(sd.strategy)}
      <div class="sp-list">${sd.eps.map((e, i) => `<label class="sp-ep ${e.on ? "" : "off"}"><input type="checkbox" data-sepick="${i}" ${e.on ? "checked" : ""}><span class="sp-day"><b>${d.start ? fmtISO(addDays(d.start, e.day), { weekday: "short", day: "numeric", month: "short" }) : "Day " + (e.day + 1)}</b><span>Day ${e.day + 1}</span></span><span class="nico" style="--nc:${NT[e.type].color}">${ICON[NT[e.type].icon]}</span><span class="t"><b>${esc(e.title)}</b><span>${esc(e.angle || ARCS.find(a => a[0] === e.arc)?.[2] || "")}</span></span><span class="chip lane-c lane-${e.lane}">${esc(LANES.find(l => l[0] === e.lane)[1])}</span><span class="chip">${esc(EP_TITLE[e.arc])}</span>${+e.boost ? `<span class="chip">€${num(+e.boost)}</span>` : `<span class="chip">organic</span>`}</label>`).join("")}</div>
      <div class="swrow"><button class="btn primary" data-act="seasonbuild" ${on.length ? "" : "disabled"}>${ICON.sparkle} Build the show · ${on.length} episode${on.length === 1 ? "" : "s"}</button><button class="btn" data-act="seasonplan">Plan again</button><button class="btn ghost" data-act="seasondiscard">Discard</button><span class="muted" style="font-size:12px">${boost ? `€${num(boost)} of €${num(+d.budget || 0)} in boosts and ads` : "Organic only"}</span></div></section>`; }
  if (eps.length) { const next = eps.find(n => n.p.start && n.p.start >= todayISO());
    return `<section class="dcard season"><div class="dcard-h"><b>Season · ${eps.length} episode${eps.length === 1 ? "" : "s"}</b><span class="swrow"><button class="btn sm" data-act="view" data-v="timeline">${ICON.onair} On air</button><button class="btn sm ghost" data-act="seasonplan">Plan more episodes</button></span></div>${strat(s.plan?.strategy)}
      <div class="sp-list">${eps.map(n => `<button class="sp-ep" data-act="gonode" data-id="${n.id}"><span class="sp-day"><b>${n.p.start ? fmtISO(n.p.start, { weekday: "short", day: "numeric", month: "short" }) : "No date"}</b><span>Ep ${epNo(n)}</span></span><span class="nico" style="--nc:${NT[n.type].color}">${ICON[NT[n.type].icon]}</span><span class="t"><b>${esc(n.title)}</b><span>${esc(n.p.angle || EP_FMT[n.type])}</span></span><span class="chip lane-c lane-${laneOf(n)}">${esc(LANES.find(l => l[0] === laneOf(n))[1])}</span>${n.p.arc ? `<span class="chip">${esc(EP_TITLE[n.p.arc])}</span>` : ""}${nodeStatus(n).replace(/<span class="chip ep"[^]*?<\/span>/, "")}</button>`).join("")}</div>
      ${next ? `<small class="faint">Next out: ${esc(next.title)}, ${fmtISO(next.p.start, { weekday: "long", day: "numeric", month: "long" })}.</small>` : ""}</section>`; }
  return `<section class="dcard season"><div class="dcard-h"><b>Season</b><span class="muted" style="font-size:12px">Pick a format. Showrunner plans the episodes, the dates and the budget split.</span></div>${fmts}
    <div class="swrow"><button class="btn primary" data-act="seasonplan" ${+d.target && d.start && d.end ? "" : "disabled"}>${ICON.sparkle} Plan the season with Showrunner</button>${+d.target && d.start && d.end ? "" : `<span class="muted" style="font-size:12px">Needs a target and dates first.</span>`}</div></section>`;
}
async function buildSeason() {
  const sd = S.season; const s = cur(); if (!sd || sd.showId !== S.showId) return; const d = dnaOf(s); const on = sd.eps.filter(e => e.on); if (!on.length) return;
  S.season = null; s.plan = { format: sd.format, strategy: sd.strategy, split: sd.split || null, at: now() }; if (!isEx()) Store.putShow(s);
  let st = mainStyle(); if (!st) { st = addNode("style", 0, 0, { title: "Style guide", exact: true }); st.p.main = true; const L = LOOKS[sd.look || "webshow"]; Object.assign(st.p, { look: sd.look || "webshow", palette: L.palette.slice(), fontPair: L.fontPair, mode: L.mode, radius: L.radius, vis: clone(L.vis) }); commitNode(st); }
  if (!kitImages().length) { addNode("image", 300, 0, { title: "Hero visual", exact: true, p: { motif: "horizon", aspect: "4:3" } }); addNode("image", 300, 380, { title: "Detail visual", exact: true, p: { motif: "arcs", aspect: "1:1" } }); }
  let pg = mainPage(); if (!pg) { pg = addNode("page", LANE_X.convert, 0, { title: "Landing page", exact: true }); pg.p.main = true; }
  let pub = pubFor(pg); if (!pub) { pub = addNode("publish", LANE_X.convert + 360, 0, { title: "Publish", exact: true, p: { slug: slugify(s.name) } }); connect(pg.id, "page", pub.id, "page"); }
  const made = on.map(e => addNode(e.type, LANE_X[e.lane], 0, { exact: true, title: e.title, p: { start: addDays(d.start, e.day), arc: e.arc, angle: e.angle, channels: e.channels, boost: +e.boost || 0, ...(e.type === "image" ? { motif: MOTIFS[hash(e.title) % MOTIFS.length], aspect: "4:5", txt: { headline: e.angle ? e.angle.slice(0, 60) : (d.idea || e.title), sub: d.cta || "", cta: "", pos: "bottom", align: "left", size: "m", tone: "light", shade: true }, caption: e.angle || "" } : {}) } }));
  arrangeLanes(); S.view = "canvas"; S.vpFor = null; render(); toast(`Building ${made.length} episodes…`);
  /* store snapshots replace node objects while we add them; always build the current copy */
  const pgNow = S.nodes[pg.id]; if (pgNow && !pgNow.p.sections?.length) await buildNode(pgNow);
  for (const id of made.map(n => n.id)) { const n = S.nodes[id]; if (n && BUILDABLE.has(n.type)) await buildNode(n); }
  paintAll(); toast("The season is built. Review it, then schedule the show in Plan.");
}
Object.assign(A, {
  seasonfmt(b) { S.seasonFmt = b.dataset.k; $$('[data-act="seasonfmt"]').forEach(x => x.setAttribute("aria-pressed", x.dataset.k === S.seasonFmt)); },
  seasonplan() { planSeason(); },
  seasonbuild() { buildSeason(); },
  seasondiscard() { S.season = null; rerenderBody(); },
  fmtnew(b) { const f = SHOW_FORMATS[b.dataset.k]; const s = createShow({ name: "New " + f.label.toLowerCase() }); const st = todayISO(); s.dna = { ...s.dna, start: addDays(st, 3), end: addDays(st, 3 + f.weeks * 7 - 1) }; Store.putShow(s); S.seasonFmt = b.dataset.k; S.modal = null; paintLayer(); openShow(s.id, "plan"); toast(`${f.label}: fill in the DNA, then plan the season.`); },
});
document.addEventListener("change", (e) => { const t = e.target; if (t.dataset?.sepick == null || !S.season) return; S.season.eps[+t.dataset.sepick].on = t.checked; rerenderBody(); });
/* templates modal: show formats first */
{ const _tm = templatesModal; templatesModal = function () {
  return _tm().replace("<h3>Templates</h3>", "<h3>Show formats &amp; templates</h3>").replace('<div class="tabs tl-tabs"', `<div class="modal-b" style="padding-bottom:0"><div class="sec-h"><span>Show formats</span><span class="muted" style="font-size:12px;font-weight:400">A season plan Showrunner fills in from your DNA</span></div><div class="fmts">${Object.entries(SHOW_FORMATS).map(([k, f]) => `<button class="fmt" data-act="fmtnew" data-k="${k}"><b>${esc(f.label)}</b><span>${esc(f.desc)} ${f.weeks} weeks, ${f.eps.length} episodes.</span></button>`).join("")}</div></div><div class="tabs tl-tabs"`); }; }

/* ---------- one sentence → DNA → season draft ---------- */
showFromPrompt = async function (text) {
  S.homeBusy = true; render(); let r = null;
  if (AI.fn) { try { r = await AI.json(`You are Showrunner in Webshow Studio. A small-business owner describes an idea. Turn it into the DNA of ONE campaign show: one goal, one big idea.\n${RULES}\n<input>${text}</input>\nReply with ONLY JSON: {"name": max 4 words, "tint": one of ${Object.keys(TINTS).filter(k => k !== "slate").map(k => `"${k}"`).join("|")}, "format": one of ${Object.keys(SHOW_FORMATS).map(k => `"${k}"`).join("|")}, "weeks": 2-8, "dna": {"goal": one of ${GOAL_OPTS.map(g => `"${g[0]}"`).join("|")}, "target": a realistic number for a small business or 0 if unknowable, "idea": one sentence big idea, "business": string, "offer": string, "audience": string, "cta": max 4 words, "facts": ONLY facts stated in the input, else ""}}`, { modelTier: AI.tier(S.effort) }); } catch (e) { toast(errCopy(e)); } }
  const dn = r?.dna || {}; const k = SHOW_FORMATS[r?.format] ? r.format : "launch"; const weeks = Math.max(2, Math.min(8, Math.round(+r?.weeks || SHOW_FORMATS[k].weeks))); const st = addDays(todayISO(), 3);
  const s = createShow({ name: str(r?.name) || text.split(/[.,\n]/)[0].slice(0, 32) || "New show", tint: TINTS[r?.tint] ? r.tint : undefined });
  s.dna = { ...DNA_DEF(), goal: GOAL_OPTS.some(g => g[0] === dn.goal) ? dn.goal : "leads", target: Math.max(0, Math.round(+dn.target || 0)), idea: str(dn.idea), business: str(dn.business) || s.name, offer: str(dn.offer) || (r ? "" : text), audience: str(dn.audience), cta: str(dn.cta), facts: str(dn.facts), start: st, end: addDays(st, weeks * 7 - 1) };
  Store.putShow(s); S.homeBusy = false; S.homeText = ""; S.seasonFmt = k; openShow(s.id, "plan");
  if (+s.dna.target) planSeason(); else toast("Set a target, then let Showrunner plan the season.");
};

/* ---------- weekly check: suggestions with one-click fixes ---------- */
function suggestions() {
  const s = cur(); if (!s) return []; const life = lifeOf(s); const d = dnaOf(s); const out = []; const dis = s.dismissed || {}; const eps = epList(); const t = todayIx(); const pr = progressOf(s); const U = (n) => unitOf(d.goal, n);
  if (!["live", "scheduled"].includes(life)) return [];
  const missed = eps.filter(n => deliveryOf(n).k === "missed"); if (missed.length) out.push({ id: "missed" + missed.map(n => n.id).join(""), t: `${missed.length} episode${missed.length > 1 ? "s" : ""} didn't go out`, b: `${missed.map(n => "“" + n.title + "”").slice(0, 3).join(", ")}: the date passed and nothing was posted. Post now or give ${missed.length > 1 ? "them" : "it"} a new date.`, act: "sugmissed", btn: "Open On air" });
  const undated = eps.filter(n => !n.p.start); if (undated.length) out.push({ id: "undated", t: `${undated.length} episode${undated.length > 1 ? "s have" : " has"} no date`, b: "Spread them over the days that are left so something goes out every few days.", act: "sugspread", btn: "Spread them out" });
  const pg = mainPage(); const pub = pg && pubFor(pg);
  if (!pg?.p.sections?.length) out.push({ id: "nopage", t: "The landing page isn't built", b: "Every episode points to it. Build it before people arrive.", act: "sugbuildpage", btn: "Build it" });
  else if (life === "live" && !pub?.p.live && !isEx()) out.push({ id: "notlive", t: "The landing page isn't live", b: "Episodes are sending people to a page that isn't published yet.", act: "sugpublish", btn: "Publish now" });
  if (life === "live") {
    if (pr.frac >= .2 && pr.frac < .97 && +d.target && pr.res < +d.target * pr.frac * .85) out.push({ id: "pace" + Math.floor(pr.frac * 5), t: `Behind pace: ${num(pr.res)} of ${num(+d.target)} ${U(2)}`, b: `At this pace the show ends near ${num(Math.round(pr.res / Math.max(.05, pr.frac)))} ${U(2)}. An urgency episode for the last ${Math.max(1, dayIx(d.end) - t)} days usually lifts the end of a show.`, act: "sugurgency", btn: "Draft an urgency episode" });
    if (!eps.some(n => { const w = epWin(n); return w.s != null && w.s >= t && w.s <= t + 6; }) && dayIx(d.end) - t > 6) out.push({ id: "gap" + Math.floor(t / 7), t: "Nothing goes out this week", b: "Shows lose momentum without a steady rhythm. Add a proof episode for the next few days?", act: "sugproof", btn: "Draft a proof episode" });
    const run = eps.filter(n => +n.p.boost > 0 && epWin(n).s != null && epWin(n).s <= t - 3 && ["posted", "running", "ended", "live"].includes(deliveryOf(n).k));
    if (run.length >= 2) { const days = Array.from({ length: 30 }, (_, i) => t - 29 + i); const sc = run.map(n => { const m = epMetric(n, days); const l = epLeads(n).length; return { n, l, v: l * 1e4 + (m?.value || 0) / (+n.p.boost || 1), sample: !l }; }).sort((a, b) => b.v - a.v);
      const best = sc[0], worst = sc.at(-1); const amt = Math.round((+worst.n.p.boost || 0) / 2 / 10) * 10;
      if (best.n !== worst.n && amt >= 30 && best.v > worst.v) out.push({ id: `move-${worst.n.id}-${best.n.id}`, t: `Move €${amt} to “${best.n.title}”`, b: `It ${best.l ? `brings ${best.l} lead${best.l > 1 ? "s" : ""}` : "reaches more people per euro"} while “${worst.n.title}” ${worst.l ? `brings ${worst.l}` : "brings no leads"}${best.sample && worst.sample ? " (sample reach)" : ""}.`, act: "sugmove", btn: `Move €${amt}`, data: { from: worst.n.id, to: best.n.id, amt } });
    }
  }
  return out.filter(x => !dis[x.id]);
}
function sugDone(id, msg) { const s = cur(); s.dismissed = { ...(s.dismissed || {}), [id]: now() }; if (!isEx()) Store.putShow(s); if (msg) toast(msg); if (S.view === "live") rerenderBody(); else render(); }
function addEpisode(type, lane, arc, title, start, extra = {}) {
  const d = dnaOf(); const n = addNode(type, LANE_X[lane], 0, { exact: true, title, p: { start, arc, angle: extra.angle || "", boost: extra.boost || 0, ...(type === "image" ? { motif: "spotlight", aspect: "4:5", txt: { headline: extra.angle || d.idea || title, sub: d.cta || "", cta: "", pos: "bottom", align: "left", size: "m", tone: "light", shade: true } } : {}) } });
  const col = Object.values(S.nodes).filter(x => x.id !== n.id && Math.abs(x.x - n.x) < 160); n.y = col.length ? Math.max(...col.map(x => x.y + (EST_H[x.type] || 270))) + 44 : 0; commitNode(n); return n;
}
Object.assign(A, {
  sug(b) { const s = suggestions().find(x => x.id === b.dataset.id); if (!s) return; A[s.act]?.(s); },
  sugmissed() { S.view = "timeline"; render(); },
  sugdismiss(b) { sugDone(b.dataset.id, "Dismissed"); },
  async sugurgency(sg) { const d = dnaOf(); const t = todayISO(); const left = Math.max(1, dayIx(d.end) - todayIx()); const type = tierAllows("metaad") && +d.budget ? "metaad" : "image";
    const n = addEpisode(type, "convert", "urgency", "Before it's gone", addDays(t, 1), { angle: `Only ${left} days left: ${d.cta || "act now"}`, boost: type === "metaad" ? Math.min(200, Math.max(50, Math.round((+d.budget - spentOf()) * .3 / 10) * 10)) : 0 });
    if (left > 1) { n.p.end = d.end; commitNode(n); } sugDone(sg.id, "Urgency episode added. Showrunner is building it."); if (BUILDABLE.has(n.type)) await buildNode(n); },
  async sugproof(sg) { const t = todayISO(); const type = tierAllows("quiz") ? "carousel" : "image"; const n = addEpisode(type, "show", "proof", "Proof: real weekends", addDays(t, 2), { angle: "Show it working for someone like the viewer" }); sugDone(sg.id, "Proof episode added for the day after tomorrow."); if (BUILDABLE.has(n.type)) await buildNode(n); },
  sugspread(sg) { const d = dnaOf(); const und = epList().filter(n => !n.p.start); const a = Math.max(todayIx() + 1, dayIx(d.start)), b = Math.max(a, dayIx(d.end) - 1); und.forEach((n, i) => { n.p.start = isoOf(Math.round(a + (b - a) * (i + 1) / (und.length + 1))); hist(n, "Dated by Showrunner"); commitNode(n); }); sugDone(sg.id, `${und.length} episode${und.length > 1 ? "s" : ""} dated`); },
  async sugbuildpage(sg) { const pg = mainPage(); sugDone(sg.id); if (pg) await buildNode(pg); else toast("Add a landing page on the canvas first."); },
  async sugpublish(sg) { const pg = mainPage(); let pub = pg && pubFor(pg); if (!pub) { pub = addNode("publish", LANE_X.convert + 360, 0, { title: "Publish", exact: true, p: { slug: slugify(cur().name) } }); connect(pg.id, "page", pub.id, "page"); } await publishNode(pub); sugDone(sg.id); },
  sugmove(sg) { const { from, to, amt } = sg.data; const a = S.nodes[from], b = S.nodes[to]; if (!a || !b) return; a.p.boost = Math.max(0, +a.p.boost - amt); b.p.boost = (+b.p.boost || 0) + amt; hist(a, `€${amt} moved to ${b.title}`); hist(b, `€${amt} moved from ${a.title}`); commitNode(a); commitNode(b); sugDone(sg.id, `€${amt} moved to “${b.title}”`); },
});

/* ---------- Results: goal, weekly check, episodes, and the end report ---------- */
function epTable() {
  const eps = epList(); if (!eps.length) return ""; const d = dnaOf(); const a = dayIx(d.start) ?? todayIx() - 30; const days = Array.from({ length: Math.max(1, Math.min(todayIx(), dayIx(d.end) ?? todayIx()) - a + 1) }, (_, i) => a + i);
  return `<div class="sec-h" style="margin-top:4px"><span>Episodes<span class="n">${eps.length}</span></span><span class="muted" style="font-size:12px;font-weight:400">Leads are real and tracked per episode. Reach shows only for demo accounts, as sample data.</span></div>
    <div class="ept"><div class="ept-r ept-h"><span>Episode</span><span>Date · status</span><span>Leads</span><span>Reach</span><span>Boost, planned</span></div>${eps.map(n => { const l = epLeads(n).length; const m = epMetric(n, days); const reach = m?.kind === "reach" ? m.value : null; const b = +n.p.boost || 0;
      return `<button class="ept-r" data-act="gonode" data-id="${n.id}"><span class="t"><span class="nico" style="--nc:${NT[n.type].color}">${ICON[NT[n.type].icon]}</span><span><b>Ep ${epNo(n)} · ${esc(n.title)}</b><small>${esc(LANES.find(x => x[0] === laneOf(n))[1])} · ${esc(EP_FMT[n.type])}${n.p.arc ? " · " + esc(EP_TITLE[n.p.arc]) : ""}</small></span></span><span class="ept-out">${n.p.start ? fmtISO(n.p.start) : "—"}<small class="${["missed", "due"].includes(deliveryOf(n).k) ? "dlv-warn" : ""}">${esc(dlvLabel(deliveryOf(n)))}</small></span><span><b>${l}</b></span><span>${reach != null ? num(reach) + "<small> sample</small>" : "—"}</span><span>${b ? "€" + num(b) : "organic"}</span></button>`; }).join("")}</div>`;
}
function weeklyCheck() {
  const sg = suggestions(); const life = lifeOf();
  if (!["live", "scheduled"].includes(life)) return "";
  return `<section class="dcard wk"><div class="dcard-h"><b>${ICON.spark} Showrunner's weekly check</b><span class="muted" style="font-size:12px">${sg.length ? "Approve a change and it happens on the canvas and timeline" : "Nothing needs you right now"}</span></div>
    ${sg.length ? sg.map(x => `<div class="sug"><span class="t"><b>${esc(x.t)}</b><span>${esc(x.b)}</span></span><span class="swrow"><button class="btn sm primary" data-act="sug" data-id="${esc(x.id)}">${esc(x.btn)}</button><button class="btn sm ghost" data-act="sugdismiss" data-id="${esc(x.id)}">Not now</button></span></div>`).join("") : `<p class="muted" style="font-size:13px">The show is on pace and every episode has a date. Showrunner checks again as results come in.</p>`}</section>`;
}
function reportData() {
  const s = cur(); const d = dnaOf(s); const pr = progressOf(s); const a = dayIx(d.start) ?? todayIx() - 30, b = Math.min(todayIx(), dayIx(d.end) ?? todayIx()); const days = Array.from({ length: Math.max(1, b - a + 1) }, (_, i) => a + i);
  const sc = epList().filter(n => n.p.start && n.p.start <= todayISO()).map(n => ({ n, l: epLeads(n).length, r: epMetric(n, days)?.value || 0, paid: +n.p.boost > 0 || ["ad", "metaad"].includes(n.type) })).sort((x, y) => y.l - x.l || y.r - x.r);
  const leadsAll = sc.reduce((x, e) => x + e.l, 0); const paidL = sc.filter(e => e.paid).reduce((x, e) => x + e.l, 0);
  return { d, pr, sc, best: sc[0], worst: sc.length > 1 ? sc.at(-1) : null, cpr: pr.res && pr.spent ? pr.spent / pr.res : null, pctTarget: +d.target ? Math.round(pr.res / +d.target * 100) : 0, leadsAll, paidShare: leadsAll ? Math.round(paidL / leadsAll * 100) : null };
}
function offlineLearnings(r) {
  const L = []; const U = unitOf(r.d.goal, 2);
  L.push(r.pctTarget >= 100 ? `The show reached its goal: ${num(r.pr.res)} ${U}, ${r.pctTarget} % of the target.` : `The show reached ${r.pctTarget} % of its goal (${num(r.pr.res)} of ${num(+r.d.target)} ${U}).`);
  if (r.best) { const a = arcOf(r.best.n); L.push(`“${r.best.n.title}” worked best${r.best.l ? ` with ${r.best.l} leads` : " by reach"}${a ? `, a ${a[1].toLowerCase()} episode` : ""}. Start the next season with more of its kind.`); }
  if (r.worst && r.worst.n !== r.best?.n) L.push(`“${r.worst.n.title}” did the least. Change its angle or format before running it again.`);
  if (r.paidShare != null) L.push(`${r.paidShare} % of tracked leads came from paid episodes, ${100 - r.paidShare} % from organic ones.`);
  if (r.cpr != null) L.push(`Each ${unitOf(r.d.goal, 1)} cost about €${num(r.cpr)}${r.pr.sample ? " (sample)" : ""}.`);
  return L;
}
function reportHTML() {
  const s = cur(); const r = reportData(); const U = unitOf(r.d.goal, 2); const learn = s.report?.learnings || offlineLearnings(r);
  return `<section class="report"><div class="rep-h"><span class="dk-l">End report · ${fmtISO(r.d.start)} → ${fmtISO(r.d.end)}${r.pr.sample ? " · sample numbers" : ""}</span><h2 class="goal-h">${num(r.pr.res)} ${U} <span class="muted">of ${num(+r.d.target)}</span></h2>${str(r.d.idea) ? `<p class="goal-idea">“${esc(r.d.idea)}”</p>` : ""}</div>
    <div class="rep-k"><div class="dk"><span class="dk-l">Of the goal</span><b class="px">${r.pctTarget} %</b></div><div class="dk"><span class="dk-l">Cost per ${unitOf(r.d.goal, 1)}</span><b class="px">${r.cpr != null ? "€" + num(r.cpr) : "—"}</b></div><div class="dk"><span class="dk-l">Budget used</span><b class="px">€${num(r.pr.spent)}</b><span class="muted" style="font-size:12px">${r.pr.spent ? (r.pr.sample || r.pr.demo ? "demo · " : "") : `€${num(r.pr.planned || 0)} planned · `}of €${num(+r.d.budget || 0)}</span></div><div class="dk"><span class="dk-l">Paid / organic leads</span><b class="px">${r.paidShare != null ? `${r.paidShare} / ${100 - r.paidShare}` : "—"}</b></div></div>
    <div class="rep-two"><div class="dk"><span class="dk-l">Best episode</span>${r.best ? `<b>${esc(r.best.n.title)}</b><span class="muted" style="font-size:12px">${r.best.l ? `${r.best.l} leads` : `${num(r.best.r)} reach · sample`}</span>` : "<span class='muted'>—</span>"}</div><div class="dk"><span class="dk-l">Weakest episode</span>${r.worst ? `<b>${esc(r.worst.n.title)}</b><span class="muted" style="font-size:12px">${r.worst.l ? `${r.worst.l} leads` : `${num(r.worst.r)} reach · sample`}</span>` : "<span class='muted'>—</span>"}</div></div>
    <div class="dcard"><div class="dcard-h"><b>What we learned</b>${AI.fn ? `<button class="btn sm ghost" data-act="replearn">${ICON.sparkle} Write with Showrunner</button>` : ""}</div><ul class="learn">${learn.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
    <div class="swrow"><button class="btn primary" data-act="nextseason">${ICON.plus} Next season</button><button class="btn" data-act="runagain">${ICON.copy} Run it again</button><button class="btn" data-act="tplsaveopen">${ICON.grid} Save as a show format</button></div></section>`;
}
{ const _lv = liveView;
  liveView = function () {
    const s = cur(); const life = lifeOf(s); const d = dnaOf(s); const pr = progressOf(s); const pc = +d.target ? Math.min(100, pr.res / +d.target * 100) : 0;
    if (life === "ended" && !s.report && !isEx()) { const r = reportData(); s.report = { at: now(), res: r.pr.res, target: +d.target, spent: r.pr.spent, learnings: offlineLearnings(r) }; Store.putShow(s); }
    const head = ["ended", "results"].includes(life) || S.repPreview ? reportHTML()
      : `<section class="goalcard"><div class="goal-top"><div style="display:grid;gap:6px;min-width:0"><span class="dk-l">${lifeNote(life, s)}</span><h2 class="goal-h">${+d.target ? esc(goalLine(s)) : "No goal yet"}</h2></div><div class="goal-act">${lifeChip(life)}<button class="btn sm ghost" data-act="reppreview">Preview the end report</button></div></div>
        ${life !== "draft" ? `<div class="goal-prog"><div class="gp-bar"><i style="width:${pc}%"></i></div><span><b class="px">${num(pr.res)}</b> of ${num(+d.target)} ${unitOf(d.goal, d.target)}${pr.frac > 0 && pr.frac < 1 ? ` · ${Math.round(pr.frac * 100)} % of the run done` : ""}${pr.sample ? " · sample" : ""}</span></div>` : `<p class="muted" style="font-size:13px">Results start counting when the show is scheduled and on air.</p>`}</section>${weeklyCheck()}`;
    return _lv().replace('padding-top:28px">', `padding-top:28px">${S.repPreview && !["ended", "results"].includes(life) ? `<div class="swrow"><span class="chip">Preview</span><span class="muted" style="font-size:12px">This is how the report looks when the show ends.</span><button class="btn sm ghost" data-act="reppreview">Close preview</button></div>` : ""}${head}${epTable()}`);
  }; }
function cloneShow(name, { kitOnly = false, shift = 0, dna }) {
  const src = cur(); const s = createShow({ name, tint: src.tint }); delete s.fresh; s.dna = dna; s.laned = true; s.plan = kitOnly ? { format: src.plan?.format } : clone(src.plan || {}); Store.putShow(s);
  const keep = Object.values(S.nodes).filter(n => !kitOnly || laneOf(n) === "kit" || CONVERT_TYPES.has(n.type)); const map = {};
  const nodes = keep.map(n => { const c = clone(n); c.id = uid("n"); map[n.id] = c.id; c.hist = [{ at: now(), by: Store.me.id, note: "Copied from " + src.name }];
    if (c.p.start && shift) { c.p.start = addDays(c.p.start, shift); if (c.p.end) c.p.end = addDays(c.p.end, shift); } if (kitOnly && isEpisode(n)) { c.p.start = ""; c.p.end = ""; }
    if (["publish", "quiz", "poll"].includes(c.type)) { c.p.live = false; c.p.autoDone = ""; if (c.p.slug) c.p.slug = c.p.slug + "-" + Math.random().toString(36).slice(2, 5); if (c.type === "publish") { c.p.start = dna.start; c.p.end = dna.end; } }
    if (c.type === "adchannel") c.p.launched = 0; if (c.p.posts) c.p.posts = []; return c; });
  const edges = Object.values(S.edges).filter(e => map[e.from] && map[e.to]).map(e => ({ ...e, id: uid("e"), from: map[e.from], to: map[e.to] }));
  openShow(s.id, "plan"); addNodes(nodes, edges); return s;
}
Object.assign(A, {
  reppreview() { S.repPreview = !S.repPreview; rerenderBody(); },
  async replearn() { const r = reportData(); toast("Showrunner is writing…"); try { const t = await AI.text(`Write 4-5 short, concrete learnings from this finished campaign show for a small-business owner. One sentence each, plain words, no hype. Only use these numbers.\n${dnaText()}\nRESULT: ${r.pr.res} of ${r.d.target} ${unitOf(r.d.goal, 2)}, spent €${r.pr.spent}.\nEPISODES (leads, reach, paid): ${r.sc.map(e => `${e.n.title} [${e.n.p.arc || "?"}, ${e.n.type}]: ${e.l} leads, ${e.r} reach${e.paid ? ", paid" : ", organic"}`).join("; ")}\nReply with one learning per line, no bullets.`, { modelTier: "quick" }); const s = cur(); s.report = { ...(s.report || {}), learnings: t.split("\n").map(x => x.replace(/^[-•*\d.\s]+/, "").trim()).filter(Boolean).slice(0, 6) }; if (!isEx()) Store.putShow(s); rerenderBody(); } catch (e) { toast(errCopy(e)); } },
  runagain() { const s = cur(); const d = dnaOf(s); const L = showLen(d) || 28; const st = addDays(todayISO(), 3); const shift = d.start ? dayIx(st) - dayIx(d.start) : 0; cloneShow(s.name.replace(/ · run \d+$/, "") + " · run 2", { shift, dna: { ...d, start: st, end: addDays(st, L - 1) } }); toast("Copied with every episode moved to the new dates."); },
  nextseason() { const s = cur(); const d = dnaOf(s); const L = showLen(d) || 28; const st = addDays(todayISO(), 7); cloneShow(s.name.replace(/ · season \d+$/, "") + " · season 2", { kitOnly: true, dna: { ...d, idea: "", start: st, end: addDays(st, L - 1) } }); S.seasonFmt = s.plan?.format || "launch"; toast("New season: the kit, page and style come along. Write the new big idea, then plan."); },
});
