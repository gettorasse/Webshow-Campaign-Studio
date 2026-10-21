/* ============================================================
   Campaign timeline: when every asset runs, where the campaign
   is today, and which assets perform best
   ============================================================ */
ICON.timeline = P('<path d="M2 3.5h6M5 8h9M3.5 12.5h7"/><circle cx="8" cy="3.5" r="1"/><circle cx="14" cy="8" r="1"/><circle cx="10.5" cy="12.5" r="1"/>');
["publish", "adchannel", "chatbot"].forEach(k => { const f = NT[k].params; NT[k].params = () => ({ start: "", end: "", ...f() }); });
{ const f = NT.scheduler.params; NT.scheduler.params = () => ({ from: "", until: "", ...f() }); }
/* date-window keys: the scheduler's start/end are opening hours, so its window uses from/until */
const DK = (n) => n.type === "scheduler" ? ["from", "until"] : ["start", "end"];
const winP = (n) => { const [a, b] = DK(n); return { start: n.p[a] || "", end: n.p[b] || "" }; };
const STAGES = [["reach", "Reach", "Ads and social posts bring people in"], ["engage", "Engage", "Your page and chatbot answer and persuade"], ["convert", "Convert", "Popups and bookings turn visitors into leads"]];
const TL_STAGE = { adchannel: "reach", carousel: "reach", ad: "reach", metaad: "reach", publish: "engage", chatbot: "engage", popup: "convert", scheduler: "convert" };
const TL_ZOOM = { "2w": [14, 56], "6w": [42, 24], "q": [91, 11] };
S.tl = { zoom: "6w", start: null, sel: null };
const DAY = 864e5;
const isoOf = (d) => new Date(d * DAY).toISOString().slice(0, 10);
const dayIx = (iso) => iso ? Math.floor(Date.parse(iso + "T00:00:00Z") / DAY) : null;
const todayIx = () => localDayOf(Date.now());
const fmtDay = (d, o = { day: "numeric", month: "short" }) => new Date(d * DAY).toLocaleDateString("en-GB", { ...o, timeZone: "UTC" });

/* ---------- rows ---------- */
function pageLive() { const pub = Object.values(S.nodes).find(n => n.type === "publish"); if (!pub) return null; return winOf(pub); }
function winOf(n) {
  const p = n.p; const wp = winP(n); const t = todayIx(); let s = dayIx(wp.start), e = dayIx(wp.end), follows = false;
  if (n.type === "publish" && s == null && p.live) s = localDayOf(p.at || Date.now());
  if (n.type === "adchannel" && s == null && p.launched) s = localDayOf(p.launched);
  if (s == null && ["popup", "chatbot", "scheduler"].includes(n.type)) { const pg = G.edgesFrom(n.id).map(x => S.nodes[x.to]).find(x => x?.type === "page"); const pub = pg && Object.values(S.nodes).find(x => x.type === "publish" && G.up(x.id, "page")[0]?.id === pg.id); const w = pub && winOf(pub); if (w?.s != null) { s = w.s; e = e ?? w.e; follows = true; } }
  if (s == null) return { s: null, e: null, state: "draft", follows };
  let state = s > t ? "scheduled" : e != null && e < t ? "ended" : "live";
  if (n.type === "publish" && state === "live" && !p.live) state = "due";
  if (n.type === "adchannel" && !p.launched && state === "live") state = "due";
  return { s, e, state, follows };
}
function leadsFor(n, slugs) {
  const L = (S.live?.leads || []).filter(l => slugs.has(l.slug));
  if (n.type === "popup") return L.filter(l => (l.message || "") === "Popup: " + n.p.headline || (l.message || "").startsWith("Popup: " + (n.p.headline || "").slice(0, 20)));
  if (n.type === "chatbot") return L.filter(l => (l.message || "").startsWith("Chatbot:"));
  if (n.type === "scheduler") return L.filter(l => (l.message || "").startsWith("Booking:"));
  if (n.type === "publish") return L.filter(l => !/^(Popup|Chatbot|Booking):/.test(l.message || ""));
  return [];
}
function tlRows(r0, r1) {
  const pubs = Object.values(S.nodes).filter(n => n.type === "publish"); const slugs = new Set(pubs.map(p => p.p.slug).filter(Boolean));
  const days = Array.from({ length: r1 - r0 + 1 }, (_, i) => r0 + i);
  const rows = Object.values(S.nodes).filter(n => TL_STAGE[n.type] && !(["ad", "metaad"].includes(n.type) && Object.values(S.nodes).some(x => x.type === "adchannel" && G.up(x.id, "ads").some(u => u.id === n.id)))).map(n => {
    const r = { n, stage: TL_STAGE[n.type], win: ["carousel", "ad", "metaad"].includes(n.type) ? null : winOf(n), marks: [], metric: null };
    if (n.type === "carousel") r.marks = (n.p.posts || []).map(p => ({ id: p.id, d: localDayOf(p.at), at: p.at, done: p.at <= Date.now(), accounts: p.accounts || [] }));
    if (["publish", "popup", "chatbot", "scheduler"].includes(n.type)) { const ls = leadsFor(n, slugs); const series = days.map(d => ls.filter(l => localDayOf(l.at) === d).length);
      const visits = n.type === "publish" ? [...slugs].reduce((a, s) => a + (S.live?.visits?.[s] || 0), 0) : null;
      r.metric = { kind: "leads", value: series.reduce((a, b) => a + b, 0), label: n.type === "scheduler" ? "Bookings" : "Leads", series, real: true, sub: visits != null ? `${num(visits)} visits` : "" }; }
    if (n.type === "adchannel") { const pl = (n.p.platforms || []).filter(conOn); const series = days.map(d => d > todayIx() ? 0 : pl.reduce((a, k) => a + sampleDay(S.showId, k, d).clicks, 0)); r.metric = pl.length ? { kind: "reach", value: series.reduce((a, b) => a + b, 0), label: "Ad clicks", series, real: false } : null; }
    if (n.type === "carousel") { const posts = (n.p.posts || []).filter(p => p.at <= Date.now()); const series = days.map(d => d > todayIx() ? 0 : Math.round(posts.reduce((a, p) => { const age = d - localDayOf(p.at); return a + (age >= 0 && age < 5 ? (300 + hash(p.id) % 2400) / (age + 1) / 2.3 : 0); }, 0)));
      r.metric = posts.length ? { kind: "reach", value: series.reduce((a, b) => a + b, 0), label: "Reach", series, real: false } : null; }
    return r;
  });
  const best = (kind) => rows.filter(r => r.metric?.kind === kind && r.metric.value > 0).sort((a, b) => b.metric.value - a.metric.value)[0];
  const b1 = best("leads"), b2 = best("reach"); if (b1) b1.top = "Best converter"; if (b2) b2.top = "Best reach";
  return rows;
}

/* ---------- view ---------- */
function timelineView() {
  if (!S.live) loadTLData();
  const [len, px] = TL_ZOOM[S.tl.zoom]; const t = todayIx(); const r0 = S.tl.start ?? t - Math.round(len / 4); const r1 = r0 + len - 1; const W = len * px;
  const rows = tlRows(r0, r1); const X = (d) => (d - r0) * px;
  const wins = rows.map(r => r.win).filter(w => w?.s != null); const cs = wins.length ? Math.min(...wins.map(w => w.s)) : null; const ends = wins.filter(w => w.e != null).map(w => w.e); const ce = ends.length ? Math.max(...ends) : null;
  const liveN = rows.filter(r => r.win?.state === "live").length + rows.filter(r => r.marks.some(m => m.d === t)).length;
  const next = [...rows.flatMap(r => [r.win?.state === "scheduled" ? { d: r.win.s, at: r.win.s * DAY, what: `${r.n.title} starts` } : null, ...r.marks.filter(m => !m.done).map(m => ({ d: m.d, at: m.at, what: `${r.n.title} posts to ${m.accounts.map(k => CONNECTORS.find(c => c.k === k)?.name.split(" ")[0]).join(", ")}` }))])].filter(Boolean).sort((a, b) => a.at - b.at)[0];
  const top = rows.filter(r => r.top).sort((a, b) => (b.metric.kind === "leads") - (a.metric.kind === "leads"))[0];
  const status = cs == null ? `<b>Not scheduled yet</b><span class="muted">Drag on a row, or set dates on an asset, to plan the campaign.</span>` : `<b>${t < cs ? `Starts ${fmtDay(cs)}` : ce != null && t > ce ? "Campaign ended" : `Day ${t - cs + 1}${ce != null ? ` of ${ce - cs + 1}` : ""}`}</b><span class="muted">${fmtDay(cs)} → ${ce != null ? fmtDay(ce) : "ongoing"}</span>${ce != null ? `<span class="tl-prog"><i style="width:${Math.max(0, Math.min(100, (t - cs + 1) / (ce - cs + 1) * 100))}%"></i></span>` : ""}`;
  const head = `<div class="dash-h"><div style="display:grid;gap:4px"><span class="px vt" style="font-size:24px">Timeline</span><span class="muted">${esc(cur()?.name || "")} · when every asset runs and how it's doing</span></div>
    <div class="swrow"><div class="seg">${[["2w", "2 weeks"], ["6w", "6 weeks"], ["q", "Quarter"]].map(([k, l]) => `<button data-act="tlzoom" data-v="${k}" aria-pressed="${S.tl.zoom === k}">${l}</button>`).join("")}</div><button class="ib" data-act="tlnav" data-d="-1" aria-label="Earlier">${ICON.back}</button><button class="btn sm" data-act="tltoday">Today</button><button class="ib" data-act="tlnav" data-d="1" aria-label="Later">${ICON.chev}</button></div></div>
    <div class="tl-cards"><div class="dk">${status}</div><div class="dk"><span class="dk-l">Running today</span><b class="px">${liveN}</b><span class="muted" style="font-size:12px">of ${rows.length} assets</span></div>
      <div class="dk"><span class="dk-l">Next up</span>${next ? `<b style="font-size:14px;font-weight:600">${esc(next.what)}</b><span class="muted" style="font-size:12px">${next.d === t ? "Today" : next.d === t + 1 ? "Tomorrow" : fmtDay(next.d, { weekday: "short", day: "numeric", month: "short" })}</span>` : `<span class="muted">Nothing scheduled</span>`}</div>
      <div class="dk"><span class="dk-l">Top performer</span>${top ? `<b style="font-size:14px;font-weight:600">${esc(top.n.title)}</b><span class="muted" style="font-size:12px">${num(top.metric.value)} ${top.metric.label.toLowerCase()}${top.metric.real ? "" : " · sample"}</span>` : `<span class="muted">No results yet</span>`}</div></div>`;
  const dayHead = Array.from({ length: len }, (_, i) => { const d = r0 + i; const dt = new Date(d * DAY); const wk = dt.getUTCDay(); const first = dt.getUTCDate() === 1 || i === 0;
    return `<div class="tl-d ${wk === 0 || wk === 6 ? "we" : ""} ${d === t ? "today" : ""}" style="left:${i * px}px;width:${px}px">${first || px >= 40 || dt.getUTCDate() % (px >= 20 ? 2 : 7) === 1 ? `<span>${px >= 40 ? fmtDay(d, { weekday: "short" }).slice(0, 2) + " " : ""}${dt.getUTCDate()}</span>` : ""}${first ? `<b>${fmtDay(d, { month: "short" })}</b>` : ""}</div>`; }).join("");
  const shade = Array.from({ length: len }, (_, i) => { const wk = new Date((r0 + i) * DAY).getUTCDay(); return wk === 0 || wk === 6 ? `<i style="left:${i * px}px;width:${px}px"></i>` : ""; }).join("");
  const rowHTML = (r) => { const c = NT[r.n.type].color; const w = r.win; let lane = "";
    if (w && w.s != null) { const s = Math.max(w.s, r0 - 1), e = w.e == null ? r1 + 1 : Math.min(w.e, r1 + 1); if (e >= r0 && s <= r1) lane += `<div class="tl-bar st-${w.state} ${w.e == null ? "open" : ""} ${w.follows ? "follows" : ""}" data-id="${r.n.id}" style="left:${X(s)}px;width:${Math.max(px, (e - s + 1) * px)}px;--bc:${c}" title="${esc(r.n.title)}: ${fmtDay(w.s)} → ${w.e != null ? fmtDay(w.e) : "ongoing"}${w.follows ? " (follows the page)" : ""}"><span class="h" data-edge="s"></span><b>${w.follows ? "Runs with the page" : { live: "Running", scheduled: "Scheduled", ended: "Ended", due: r.n.type === "publish" ? "Goes live when you open Studio" : "Not launched yet" }[w.state]}</b>${w.e != null ? `<span class="h" data-edge="e"></span>` : ""}</div>`; }
    else if (!["carousel", "ad", "metaad"].includes(r.n.type)) lane += `<button class="tl-ghost" data-act="tlplan" data-id="${r.n.id}" style="left:${X(Math.max(t, r0))}px">${ICON.plus} Schedule</button>`;
    r.marks.forEach(m => { if (m.d < r0 || m.d > r1) return; lane += `<button class="tl-mk ${m.done ? "done" : "sched"}" data-id="${r.n.id}" data-post="${m.id}" style="left:${X(m.d) + px / 2}px;--bc:${c}" title="${esc(r.n.title)} → ${m.accounts.map(k => CONNECTORS.find(x => x.k === k)?.name).join(", ")} · ${new Date(m.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}${m.done ? " · posted" : " · drag to move"}" aria-label="Post ${m.done ? "published" : "scheduled"} ${fmtDay(m.d)}"></button>`; });
    if (r.n.type === "carousel") { const gd = Math.max(t, r0, ...r.marks.filter(m => m.d >= t).map(m => m.d + Math.max(1, Math.ceil(28 / px)))); if (gd <= r1) lane += `<button class="tl-ghost sm" data-act="socopen" data-id="${r.n.id}" style="left:${X(gd)}px" ${r.n.p.slides?.length ? "" : "disabled"}>${ICON.plus} Post</button>`; }
    if (["ad", "metaad"].includes(r.n.type)) lane += `<span class="tl-note" style="left:${X(Math.max(t, r0))}px">Wire into Ad channels to run it</span>`;
    const m = r.metric;
    return `<div class="tl-row ${S.tl.sel === r.n.id ? "sel" : ""}"><button class="tl-name" data-act="tlsel" data-id="${r.n.id}"><span class="nico" style="--nc:${c}">${ICON[NT[r.n.type].icon]}</span><span class="t"><b>${esc(r.n.title)}</b><span>${esc(NT[r.n.type].label)}</span></span></button>
      <div class="tl-lane" style="width:${W}px">${lane}</div>
      <div class="tl-perf">${m ? `<span class="v"><b class="px">${num(m.value)}</b><small>${m.label}${m.real ? "" : " · sample"}${m.sub ? " · " + m.sub : ""}</small></span>${m.series.some(Boolean) ? sparkSVG(m.series) : ""}${r.top ? `<span class="topb">${ICON.check} ${r.top}</span>` : ""}` : `<small class="faint">${r.n.type === "carousel" ? "No posts yet" : r.n.type === "adchannel" ? "No platforms picked" : "No results yet"}</small>`}</div></div>`; };
  const grid = rows.length ? STAGES.map(([k, l, d]) => { const rs = rows.filter(r => r.stage === k); return rs.length ? `<div class="tl-stage"><div class="tl-name"><b>${l}</b><span>${d}</span></div><div class="tl-lane" style="width:${W}px"></div><div class="tl-perf"></div></div>${rs.map(rowHTML).join("")}` : ""; }).join("") : "";
  const selR = rows.find(r => r.n.id === S.tl.sel);
  return `<div class="home" style="background:var(--canvas)"><div class="home-in" style="max-width:1280px;padding-top:28px">${head}
    ${rows.length ? `<div class="tl-wrap" id="tlwrap"><div class="tl" style="--px:${px}px"><div class="tl-row tl-headrow"><div class="tl-name"><b>Asset</b></div><div class="tl-lane tl-days" style="width:${W}px">${dayHead}</div><div class="tl-perf"><b>Results · ${len} days</b></div></div>
      <div class="tl-body" style="--today:${X(t) + px / 2}px">${grid}<div class="tl-shade" style="width:${W}px">${shade}</div>${t >= r0 && t <= r1 ? `<div class="tl-now" aria-hidden="true"><span>Today</span></div>` : ""}</div></div></div>
      <p class="faint" style="font-size:12px">Drag a bar to move it, or its ends to change the dates. Drag a scheduled post to another day. Leads, visits and bookings are real; ad clicks and reach are sample data until the real accounts are connected.</p>
      ${selR ? tlDetail(selR) : ""}`
    : `<div class="empty"><h3>Nothing to schedule yet</h3><span>Add a landing page, popups, carousels or ad channels on the canvas. They show up here as one campaign you can plan day by day.</span><button class="btn" data-act="view" data-v="canvas">${ICON.nodes} Open the canvas</button></div>`}
  </div></div>`;
}
function tlDetail(r) {
  const n = r.n; const w = r.win; const hasDates = ["publish", "popup", "chatbot", "scheduler", "adchannel"].includes(n.type);
  return `<section class="dcard tl-detail"><div class="dcard-h"><span class="swrow"><span class="nico" style="--nc:${NT[n.type].color}">${ICON[NT[n.type].icon]}</span><b style="font-size:14px">${esc(n.title)}</b><span class="muted">${STAGES.find(s => s[0] === r.stage)[1]} · ${esc(NT[n.type].label)}</span></span><button class="ib" data-act="tlsel" data-id="" aria-label="Close details">${ICON.x}</button></div>
    ${hasDates ? `<div class="g2" style="max-width:420px"><label class="fld"><span>${n.type === "publish" ? "Goes live" : "Starts"}</span><input class="inp" type="date" id="tls_${n.id}" data-tlf="${DK(n)[0]}" data-id="${n.id}" value="${esc(winP(n).start)}"></label><label class="fld"><span>${n.type === "publish" ? "Taken down after" : "Ends after"}</span><input class="inp" type="date" id="tle_${n.id}" data-tlf="${DK(n)[1]}" data-id="${n.id}" value="${esc(winP(n).end)}"></label></div>
      <small class="faint">${n.type === "publish" ? "The page goes live on the start date and shows a “campaign has ended” note after the end date." : n.type === "adchannel" ? "Campaigns only run between these dates." : "Leave empty to run whenever the page is live."}${w?.follows ? " Right now it follows the page." : ""}</small>` : ""}
    ${n.type === "carousel" ? `<div style="display:grid;gap:4px">${(n.p.posts || []).sort((a, b) => a.at - b.at).map(p => `<div class="li" style="padding:3px 0"><span class="t"><b style="font-weight:500">${new Date(p.at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</b><span>${p.accounts.map(k => CONNECTORS.find(c => c.k === k)?.name).join(", ")}${p.demo ? " · demo" : ""}</span></span><span class="chip ${p.at <= Date.now() ? "st-live" : ""}"><i></i>${p.at <= Date.now() ? "Posted" : "Scheduled"}</span></div>`).join("") || `<p class="muted">No posts yet.</p>`}</div>` : ""}
    <div class="swrow"><button class="btn sm" data-act="openeditor" data-id="${n.id}">${ICON.fit} Open editor</button>${n.type === "carousel" && n.p.slides?.length ? `<button class="btn sm primary" data-act="socopen" data-id="${n.id}">${ICON.share} Schedule a post</button>` : ""}${hasDates && (winP(n).start || winP(n).end) ? `<button class="btn sm ghost" data-act="tlclear" data-id="${n.id}">Clear dates</button>` : ""}</div></section>`;
}

/* ---------- data, interactions ---------- */
async function loadTLData() { if (S.tlLoading) return; S.tlLoading = true; try { S.live = await Store.liveStats(); S.liveFor = S.showId; } catch { S.live = { leads: [], visits: {} }; } S.tlLoading = false; if (S.view === "timeline") repaintTL(); }
function repaintTL() { if (S.view !== "timeline") return; const b = $("#body"); const h0 = b.querySelector(".home"); const sc = h0?.scrollTop, sx = $("#tlwrap")?.scrollLeft; b.innerHTML = timelineView(); const h = b.querySelector(".home"); if (h && sc) h.scrollTop = sc; const w = $("#tlwrap"); if (w && sx != null) w.scrollLeft = sx; }
function setDates(n, s, e, note) { const [a, b] = DK(n); n.p[a] = s == null ? "" : isoOf(s); n.p[b] = e == null ? "" : isoOf(e); hist(n, note); commitNode(n); paintNode(n.id); runSchedules(); }
Object.assign(A, {
  tlzoom(b) { S.tl.zoom = b.dataset.v; S.tl.start = null; repaintTL(); },
  tlnav(b) { const [len] = TL_ZOOM[S.tl.zoom]; const t = todayIx(); S.tl.start = (S.tl.start ?? t - Math.round(len / 4)) + (+b.dataset.d) * Math.round(len / 2); repaintTL(); },
  tltoday() { S.tl.start = null; repaintTL(); },
  tlsel(b) { S.tl.sel = b.dataset.id || null; repaintTL(); if (S.tl.sel) setTimeout(() => $(".tl-detail")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0); },
  tlplan(b) { const n = S.nodes[b.dataset.id]; const t = todayIx(); setDates(n, t, t + 13, "Scheduled on the timeline"); S.tl.sel = n.id; repaintTL(); toast("Scheduled for two weeks. Drag to adjust."); },
  tlclear(b) { const n = S.nodes[b.dataset.id]; setDates(n, null, null, "Dates cleared"); repaintTL(); },
});
document.addEventListener("change", (e) => {
  const t = e.target; if (!t.dataset?.tlf) return; const n = S.nodes[t.dataset.id]; if (!n) return;
  n.p[t.dataset.tlf] = t.value; const [a, b] = DK(n); if (n.p[a] && n.p[b] && n.p[b] < n.p[a]) n.p[b] = n.p[a];
  hist(n, "Dates changed on the timeline"); commitNode(n); paintNode(n.id); runSchedules(); repaintTL();
});
document.addEventListener("pointerdown", (e) => {
  if (S.view !== "timeline") return; const bar = e.target.closest(".tl-bar"), mk = e.target.closest(".tl-mk.sched");
  if (!bar && !mk) return; const px = TL_ZOOM[S.tl.zoom][1]; const sx = e.clientX; let moved = false, dd = 0; e.preventDefault();
  if (bar) {
    const n = S.nodes[bar.dataset.id]; const w = winOf(n); const edge = e.target.closest("[data-edge]")?.dataset.edge; const l0 = parseFloat(bar.style.left), w0 = parseFloat(bar.style.width);
    const mv = (ev) => { dd = Math.round((ev.clientX - sx) / px); if (!moved && Math.abs(ev.clientX - sx) < 4) return; moved = true; bar.classList.add("drag");
      if (edge === "s") { bar.style.left = l0 + dd * px + "px"; bar.style.width = Math.max(px, w0 - dd * px) + "px"; } else if (edge === "e") bar.style.width = Math.max(px, w0 + dd * px) + "px"; else bar.style.left = l0 + dd * px + "px"; };
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up);
      if (!moved) { S.tl.sel = n.id; repaintTL(); return; }
      let s = w.s, en = w.e; if (edge === "s") s = Math.min(s + dd, en ?? s + dd); else if (edge === "e") en = Math.max(s, (en ?? s) + dd); else { s += dd; if (en != null) en += dd; }
      setDates(n, s, en, edge ? "Dates changed on the timeline" : "Moved on the timeline"); repaintTL(); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up); return;
  }
  const n = S.nodes[mk.dataset.id]; const post = (n.p.posts || []).find(p => p.id === mk.dataset.post); if (!post) return; const l0 = parseFloat(mk.style.left);
  const mv = (ev) => { dd = Math.round((ev.clientX - sx) / px); if (!moved && Math.abs(ev.clientX - sx) < 4) return; moved = true; mk.style.left = l0 + dd * px + "px"; };
  const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); if (!moved || !dd) { S.tl.sel = n.id; repaintTL(); return; }
    post.at = Math.max(Date.now() + 36e5, post.at + dd * DAY); hist(n, "Post rescheduled on the timeline"); commitNode(n); repaintTL(); toast("Post moved to " + new Date(post.at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })); };
  window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
});

/* ---------- scheduled go-live and take-down ----------
   In the prototype this runs whenever someone has Studio open; the alpha runs it on the server. */
let schedBusy = false;
async function runSchedules() {
  if (schedBusy || !cur() || isEx() || S.view === "public") return; schedBusy = true;
  try {
    const day = localISO();
    for (const n of Object.values(S.nodes).filter(x => x.type === "publish")) {
      const pg = G.up(n.id, "page")[0]; const inWin = (!n.p.start || day >= n.p.start) && (!n.p.end || day <= n.p.end);
      if (n.p.start && !n.p.live && inWin && pg?.p.sections?.length && n.p.autoDone !== n.p.start) { n.p.autoDone = n.p.start; await publishNode(n); toast(`“${pg.title}” went live as scheduled`); }
      else if (n.p.live && (n.p.start || n.p.end)) { const d = await Store.getPublished(n.p.slug).catch(() => null); if (d && (d.from !== (n.p.start || "") || d.until !== (n.p.end || ""))) await Store.publish(n.p.slug, { ...d, from: n.p.start || "", until: n.p.end || "" }).catch(() => {}); }
    }
  } finally { schedBusy = false; }
}
setInterval(runSchedules, 60000);
