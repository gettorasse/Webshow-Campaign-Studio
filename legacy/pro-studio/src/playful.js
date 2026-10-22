/* ============================================================
   Webshow Pro, playful look (v6): the Show Timeline as the studio's home.
   - A big pastel hero for the Show (its character, name, idea, real numbers) with tabs
     into the real views: Timeline, Build, Assets, Results, Plan, Settings.
   - A channel-track timeline: Hook / Show / Convert phase cards, a day axis with a Today pill
     and line, one track per channel with pastel clips, and the Show's milestones.
     Clips are the same rows the detailed schedule uses (onairRows), so dates, delivery states
     and drag-to-reschedule are real. Click a clip to inspect it; drag it to move it.
   - "Detailed schedule" switches to the original timeline (results column, edges, triggers).
   Phones keep the original list. Nothing here invents numbers: every figure comes from the
   Show's nodes, its dates and its leads.
   ============================================================ */
const PL_DOODLES = `<svg class="pl-doodles" viewBox="0 0 200 200" aria-hidden="true" fill="none" stroke="#141418" stroke-width="3.2" stroke-linecap="round"><path d="M40 34l-8-14M58 26l-2-16M24 52l-14-6" stroke="#ff7a3d"/><path d="M160 30l10-16M176 46l14-8"/><path d="M150 18l4-10"/><path d="M34 150c-10-6-18 6-8 12s20-10 28-2"/><path d="M162 160c8 2 12 12 4 16"/><circle cx="170" cy="178" r="5"/></svg>`;
ICON.camera = ICON.camera || P('<rect x="2" y="4" width="12" height="9.5" rx="2.6"/><circle cx="8" cy="8.7" r="2.5"/><path d="M5.6 4l1-1.5h2.8l1 1.5"/>');
ICON.megaphone = ICON.megaphone || P('<path d="M2.5 6.4v3.2h2.2l5.3 3V3.4L4.7 6.4z"/><path d="M12.2 6a2.6 2.6 0 0 1 0 4"/>');
ICON.people = ICON.people || P('<circle cx="6" cy="5.6" r="2.2"/><path d="M2 13c.4-2.2 2-3.4 4-3.4s3.6 1.2 4 3.4"/><circle cx="11.4" cy="6.2" r="1.7"/><path d="M11 9.6c1.6 0 2.8 1 3.1 2.8"/>');
ICON.flag = ICON.flag || P('<path d="M3.5 14.2V2.4M3.5 3h8.4l-1.7 2.7 1.7 2.8H3.5"/>');
ICON.cal = ICON.cal || P('<rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 6.5h12M5.5 1.8v2.4M10.5 1.8v2.4"/>');
ICON.bolt = ICON.bolt || P('<path d="M9 1.6 3.6 9h4l-1 5.4L12.4 7h-4z"/>');

const PL_TRACKS = {
  instagram: ["Instagram", "camera", "linear-gradient(135deg,#ff6aa2,#ff9a4d)", "#FCE3EE"],
  facebook: ["Facebook", "people", "linear-gradient(135deg,#5b8cff,#3f66f0)", "#E3ECFF"],
  tiktok: ["TikTok", "play", "linear-gradient(135deg,#2b2b33,#55556a)", "#ECECF2"],
  linkedin: ["LinkedIn", "people", "linear-gradient(135deg,#2bb3a6,#1c8f87)", "#DDF3F0"],
  youtube: ["YouTube", "video", "linear-gradient(135deg,#ff6b6b,#e5484d)", "#FFE3E3"],
  social: ["Social posts", "image", "linear-gradient(135deg,#a77bff,#7c5cf0)", "#EFE5FF"],
  quiz: ["Quizzes & polls", "quiz", "linear-gradient(135deg,#3fd0b5,#1fa38d)", "#D9F5EE"],
  ads: ["Ads", "megaphone", "linear-gradient(135deg,#ffc94d,#ff8a3d)", "#FFF0D6"],
  landing: ["Landing Page", "layout", "linear-gradient(135deg,#55b2ff,#3b8cf0)", "#E1F0FF"],
  popups: ["Popups & forms", "popup", "linear-gradient(135deg,#ff8fc0,#e35d9c)", "#FDE4F0"],
  booking: ["Bookings", "cal", "linear-gradient(135deg,#7bd36b,#3f9e3a)", "#E2F4DD"],
  chatbot: ["Chatbot", "bot", "linear-gradient(135deg,#8f9bff,#5b6cff)", "#E6E9FF"],
};
const PL_ORDER = Object.keys(PL_TRACKS);
function plTrack(n) {
  const t = n.type;
  if (t === "metaad" || t === "ad" || t === "adchannel") return "ads";
  if (t === "quiz" || t === "poll") return "quiz";
  if (t === "publish" || t === "page") return "landing";
  if (t === "popup" || t === "cookie") return "popups";
  if (t === "scheduler") return "booking";
  if (t === "chatbot") return "chatbot";
  const ch = String((n.p.channels || [])[0] || n.p.platform || "").toLowerCase();
  return /insta/.test(ch) ? "instagram" : /face/.test(ch) ? "facebook" : /tiktok/.test(ch) ? "tiktok" : /linkedin/.test(ch) ? "linkedin" : /youtube/.test(ch) ? "youtube" : "social";
}
const plTile = (k, cls = "") => { const T = PL_TRACKS[k]; return `<span class="pl-tile ${cls}" style="background:${T[2]}">${ICON[T[1]] || ICON.spark}</span>`; };
const PL_PH = [["hook", "Hook", "Get attention", "eye"], ["show", "Show", "Tell the story", "megaphone"], ["convert", "Convert", "Drive action", "target"]];
const PL_LIFE = { draft: "Draft show", scheduled: "Starting soon", live: "Active Show", paused: "Paused", ended: "Ended", results: "Ended" };
S.pl = S.pl || { len: null, start: null, detail: false };
TL_ZOOM.pl = [28, 30];

function plHero() {
  const s = cur(); const d = dnaOf(); const k = artOf(s); const A = PL_ART[k]; const life = lifeOf(); const pr = progressOf(); const t = todayIx();
  const ds = dayIx(d.start), de = dayIx(d.end); const eps = epList(); const out = eps.filter(n => ["posted", "running", "live", "ended"].includes(deliveryOf(n).k)).length;
  const day = ds == null ? "No dates yet" : t < ds ? `Starts ${fmtDay(ds, { weekday: "short", day: "numeric", month: "short" })}` : de != null && t > de ? "Show ended" : `Day ${t - ds + 1}${de != null ? ` of ${de - ds + 1}` : ""}`;
  const tab = (v, ic, l, on, act = "view") => `<button data-act="${act}" ${act === "view" ? `data-v="${v}"` : ""} aria-current="${on}">${ICON[ic]}${l}</button>`;
  return `<section class="pl-hero" style="--pbg:${A.bg};--pink:${A.ink}">
    <div class="pl-hero-t"><span class="pl-pill">${esc(PL_LIFE[life] || "Show")}</span>
      <h1>${esc(s.name)}</h1><p>${esc(d.idea || d.offer || "Give this show its one big idea in Plan.")}</p>
      <div class="pl-stats"><span>${ICON.cal}<b>${esc(day)}</b>${ds != null ? `<small>${fmtDay(ds)} – ${de != null ? fmtDay(de) : "open"}</small>` : ""}</span>
        <span>${ICON.target}${+d.target ? `<b>${num(pr.res)} / ${num(+d.target)}</b><small>${esc(unitOf(d.goal, 2))}${pr.sample ? " · sample" : ""}</small>` : `<b>No goal yet</b><small>set it in Plan</small>`}</span>
        <span>${ICON.share}<b>${out} of ${eps.length}</b><small>episodes out</small></span></div></div>
    <div class="pl-hero-art">${PL_DOODLES}<img src="../art/${k}.webp" alt="" draggable="false"></div>
  </section>
  <nav class="pl-tabs" aria-label="Show">${tab("timeline", "timeline", "Timeline", S.view === "timeline")}${tab("canvas", "nodes", "Build", false)}${tab("assets", "image", "Assets", false)}${tab("live", "trophy", "Results", false)}${tab("plan", "target", "Plan", false)}${tab("", "sliders", "Settings", false, "settings")}</nav>`;
}

/* the visible window: the whole show when it fits, otherwise 2 or 6 weeks around today */
function plRange(ds, de) {
  const t = todayIx(); const showLen = ds != null && de != null ? de - ds + 1 : null;
  const len = S.pl.len === "show" ? Math.min(98, (showLen || 42) + 4) : S.pl.len || (showLen && showLen <= 63 ? Math.min(98, showLen + 4) : 42);
  const r0 = S.pl.start ?? (S.pl.len !== 14 && showLen && showLen + 4 <= len ? ds - 2 : t - Math.min(3, Math.round(len / 6)));
  return [r0, len];
}
function plPhases(rows, ds, de) {
  const eps = rows.filter(r => r.ep && r.win?.s != null);
  const out = PL_PH.map(([k, l, dsc, ic]) => { const rs = eps.filter(r => r.stage === k); return { k, l, dsc, ic, n: rs.length, s: rs.length ? Math.min(...rs.map(r => r.win.s)) : null, e: rs.length ? Math.max(...rs.map(r => r.win.e ?? r.win.s)) : null }; });
  if (ds != null && de != null) { const L = de - ds + 1; out.forEach((p, i) => { if (p.s == null) { p.s = ds + Math.round(L * i / 3); p.e = ds + Math.round(L * (i + 1) / 3) - 1; p.est = true; } }); }
  return out;
}

const _plTV = timelineView;
timelineView = function () {
  if (innerWidth <= 760 || !cur()) return _plTV();
  if (S.pl.detail) { if (S.tl.zoom === "pl") S.tl.zoom = "6w"; const hero = plHero().replace("</nav>", `<button class="pl-switch" data-act="pldetail">${ICON.timeline} Back to the Show Timeline</button></nav>`); return _plTV().replace(/<div class="home-in"[^>]*>/, (m) => m + hero); }
  if (!S.live || S.liveFor !== S.showId) loadTLData();
  const t = todayIx(); const d = dnaOf(); const ds = dayIx(d.start), de = dayIx(d.end);
  const [r0, len] = plRange(ds, de); const r1 = r0 + len - 1;
  const avail = ($("#body")?.clientWidth || innerWidth - 300) - 2 * 28 - 2 * 18; const LW = avail < 760 ? 148 : 188; const bw = avail - LW - 12;
  const px = Math.max(9, Math.floor(bw / len)); const W = len * px; TL_ZOOM.pl = [len, px]; S.tl.zoom = "pl";
  const X = (x) => (x - r0) * px;
  const rows = onairRows(r0, r1); const eps = rows.filter(r => r.ep);

  /* phases: on the axis when they fit side by side, otherwise as three cards */
  const ph = plPhases(rows, ds, de);
  const pos = ph.filter(p => p.s != null).map(p => ({ ...p, L: X(Math.max(p.s, r0)), w: (Math.min(p.e, r1) - Math.max(p.s, r0) + 1) * px }));
  const fits = pos.length === 3 && pos.every((p, i) => p.w >= 150 && (i === 0 || p.L >= pos[i - 1].L + pos[i - 1].w - 1));
  const phCard = (p, style = "") => `<div class="pl-ph pl-ph-${p.k}" style="${style}"><span class="pl-ph-ic">${ICON[p.ic]}</span><span><b>${p.l}</b><small>${p.dsc}</small><small class="pl-ph-d">${p.s != null ? `${fmtDay(p.s)} – ${fmtDay(p.e)}` : "No dates"}${p.est ? " · planned" : ` · ${p.n} ep${p.n === 1 ? "" : "s"}`}</small></span></div>`;
  const phases = fits ? `<div class="pl-row pl-phrow"><div class="pl-l"></div><div class="pl-lane" style="width:${W}px">${pos.map(p => phCard(p, `left:${p.L}px;width:${p.w - 6}px`)).join("")}</div></div>` : `<div class="pl-phgrid">${ph.map(p => phCard(p)).join("")}</div>`;

  /* axis: months and days, weekends shaded, today as a black pill */
  const step = px >= 26 ? 1 : px >= 15 ? 2 : 7;
  const days = Array.from({ length: len }, (_, i) => { const dd = r0 + i; const dt = new Date(dd * DAY); const wk = dt.getUTCDay(); const near = Math.abs(dd - t) * px < 34 && dd !== t; const show = dd === t || (!near && (step === 7 ? wk === 1 : (dd - r0) % step === 0));
    return `<div class="pl-day${wk === 0 || wk === 6 ? " we" : ""}${dd === t ? " today" : ""}" style="left:${i * px}px;width:${px}px">${dd === t ? `<b>Today</b>` : show ? `${px >= 30 ? `<small>${fmtDay(dd, { weekday: "short" }).slice(0, 2)}</small>` : ""}<span>${dt.getUTCDate()}</span>` : ""}</div>`; }).join("");
  const months = []; for (let i = 0; i < len; i++) { const dt = new Date((r0 + i) * DAY); if (i === 0 || dt.getUTCDate() === 1) months.push(`<b class="pl-mo" style="left:${i * px}px">${fmtDay(r0 + i, { month: "long" })}</b>`); }
  const shade = Array.from({ length: len }, (_, i) => { const wk = new Date((r0 + i) * DAY).getUTCDay(); return wk === 0 || wk === 6 ? `<i style="left:${i * px}px;width:${px}px"></i>` : ""; }).join("");
  const band = ds != null && de != null && de >= r0 && ds <= r1 ? `<i class="pl-band" style="left:${X(Math.max(ds, r0))}px;width:${(Math.min(de, r1) - Math.max(ds, r0) + 1) * px}px"></i>` : "";

  /* tracks: one per channel used, clips packed into lines so nothing overlaps */
  const groups = new Map(); rows.forEach(r => { const k = plTrack(r.n); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
  const MIN = Math.min(150, Math.max(116, px * 3));
  const clipHTML = (r, k, line, L, w) => {
    const n = r.n, wn = r.win; const T = PL_TRACKS[k]; const one = r.ep && wn.e === wn.s; const st = r.ep ? r.dv.k : wn.state || "draft";
    const title = r.ep ? `Ep ${epNo(n)} · ${n.title}` : rowTitle(r);
    const when = wn.e == null ? `From ${fmtDay(wn.s)}` : one ? fmtDay(wn.s, { weekday: "short", day: "numeric", month: "short" }) : `${fmtDay(wn.s)} – ${fmtDay(wn.e)}`;
    const status = r.ep ? dlvLabel(r.dv) : r.kind === "engine" ? engineLabel(r) : r.kind === "trigger" ? "Fires on a trigger" : { live: "Running", scheduled: "Scheduled", ended: "Ended", due: "Not launched yet" }[wn.state] || "";
    const edges = !one && wn.e != null;
    return `<div class="pl-clip tl-bar st2-${st}${S.tl.sel === n.id ? " sel" : ""}${one ? "" : " span"}" data-id="${n.id}" style="left:${L}px;width:${w}px;top:${6 + line * 50}px;--clip:${T[3]}" title="${esc(title)}: ${esc(when)}${status ? " · " + esc(status) : ""}. Drag to move${edges ? ", drag the ends to change the window" : ""}." role="button" aria-label="${esc(title)}, ${esc(when)}, ${esc(status)}">${edges ? `<span class="h" data-edge="s"></span>` : ""}<span class="pl-ci">${st === "posted" || st === "ended" ? ICON.check : ICON[T[1]] || ICON.spark}</span><span class="pl-ct"><b>${esc(r.ep ? n.title : title)}</b><small>${r.ep ? `Ep ${epNo(n)} · ` : ""}${esc(when)}${status ? ` · ${esc(status)}` : ""}</small></span>${edges ? `<span class="h" data-edge="e"></span>` : ""}</div>`;
  };
  const tracks = [...groups.keys()].sort((a, b) => PL_ORDER.indexOf(a) - PL_ORDER.indexOf(b)).map(k => {
    const rs = groups.get(k); const T = PL_TRACKS[k]; const lines = []; let html = "", later = 0, undated = 0;
    rs.slice().sort((a, b) => (a.win?.s ?? 1e9) - (b.win?.s ?? 1e9)).forEach(r => {
      const w = r.win;
      if (!w || w.s == null) {
        if (r.kind === "trigger") { html += `<button class="pl-clip ghost" data-act="tlsel" data-id="${r.n.id}" style="left:${X(Math.max(t, r0))}px;top:${6 + lines.length * 50}px">${ICON.bolt} ${esc(rowTitle(r))} · ${esc(trigRule(r.n))}</button>`; lines.push(1e9); }
        else { undated++; if (undated === 1) { html += `<button class="pl-clip ghost" data-act="tlplan" data-id="${r.n.id}" style="left:${X(Math.min(r1 - 6, Math.max(t, ds ?? t, r0)))}px;top:${6 + lines.length * 50}px">${ICON.plus} ${r.ep ? `Date Ep ${epNo(r.n)}` : `Schedule ${esc(rowTitle(r))}`}</button>`; lines.push(1e9); } }
        return;
      }
      const e = w.e == null ? r1 : w.e; if (w.s > r1 || e < r0) { later++; return; }
      const L = X(Math.max(w.s, r0)); const wd = Math.min(W - L, Math.max((Math.min(e, r1) - Math.max(w.s, r0) + 1) * px, MIN));
      let line = lines.findIndex(end => end + 6 <= L); if (line < 0) { line = lines.length; lines.push(0); } lines[line] = L + wd;
      html += clipHTML(r, k, line, L, wd);
    });
    const n = rs.length; const h = Math.max(1, lines.length) * 50 + 8;
    return `<div class="pl-row pl-trk"><div class="pl-l">${plTile(k)}<span><b>${T[0]}</b><small>${n} item${n === 1 ? "" : "s"}${undated > 1 ? ` · ${undated} undated` : ""}${later ? ` · ${later} outside view` : ""}</small></span></div><div class="pl-lane" style="width:${W}px;height:${h}px">${html}</div></div>`;
  }).join("");

  /* milestones: the Show's real dates and its goal */
  const ms = [];
  if (ds != null) ms.push([ds, "Show starts", "flag"]);
  ph.forEach(p => { if (p.k !== "hook" && p.s != null && !p.est) ms.push([p.s, `${p.l} phase`, p.ic]); });
  const firstOut = eps.map(r => r.marks.filter(m => m.done).map(m => m.d)).flat().sort((a, b) => a - b)[0]; if (firstOut != null) ms.push([firstOut, "First post out", "check"]);
  if (de != null) ms.push([de, +d.target ? `Goal: ${num(+d.target)} ${unitOf(d.goal, 2)}` : "Show ends", "trophy"]);
  const msLines = []; const msHTML = ms.filter(([x]) => x >= r0 && x <= r1).sort((a, b) => a[0] - b[0]).map(([x, l, ic]) => { const est = 40 + (l.length + 7) * 6.4; const L = Math.max(0, Math.min(X(x) + px / 2 - 9, W - est)); let line = msLines.findIndex(end => end + 8 <= L); if (line < 0) { line = msLines.length; msLines.push(0); } msLines[line] = L + est;
    return `<span class="pl-ms" style="left:${L}px;top:${8 + line * 34}px"><i>${ICON[ic] || ICON.flag}</i><b>${esc(l)}</b><small>${fmtDay(x)}</small></span>`; }).join("");
  const milestones = ms.length ? `<div class="pl-row pl-trk pl-msrow"><div class="pl-l"><span class="pl-tile ms">${ICON.flag}</span><span><b>Show Milestones</b><small>${ms.length} dates</small></span></div><div class="pl-lane" style="width:${W}px;height:${Math.max(1, msLines.length) * 34 + 14}px">${msHTML}</div></div>` : "";

  const zoom = [[14, "2 weeks"], [42, "6 weeks"], ["show", "Whole show"]];
  const curLen = S.pl.len || (ds != null && de != null && de - ds + 1 <= 63 ? "show" : 42);
  const tools = `<div class="pl-tools"><h2>Show Timeline</h2><span class="pl-range">${ICON.cal} ${fmtDay(r0, { day: "numeric", month: "short" })} – ${fmtDay(r1, { day: "numeric", month: "short", year: "numeric" })}</span><span class="pl-grow"></span>
    <div class="pl-seg">${zoom.map(([v, l]) => `<button data-act="plzoom" data-v="${v}" aria-pressed="${curLen === v}">${l}</button>`).join("")}</div>
    <button class="pl-ib" data-act="plnav" data-d="-1" aria-label="Earlier">${ICON.back}</button><button class="pl-btn" data-act="pltoday">Today</button><button class="pl-ib" data-act="plnav" data-d="1" aria-label="Later">${ICON.chev}</button>
    <button class="pl-btn ghost" data-act="pldetail" title="The full schedule with results, triggers and windows">${ICON.timeline} Detailed schedule</button></div>`;
  const selR = rows.find(r => r.n.id === S.tl.sel);
  const nudge = selR && selR.win?.s != null ? `<div class="pl-nudge"><span>Move it</span><button class="pl-btn" data-act="plnudge" data-d="-1">${ICON.back} 1 day earlier</button><button class="pl-btn" data-act="plnudge" data-d="1">1 day later ${ICON.chev}</button><button class="pl-btn" data-act="plnudge" data-d="7">A week later</button></div>` : "";
  const today = t >= r0 && t <= r1 ? `<i class="pl-now" style="left:${LW + 12 + X(t) + px / 2 - 1}px"></i>` : "";
  return `<div class="home pl-home"><div class="home-in pl-in">${plHero()}
    <section class="pl-card pl-tl">${tools}
      ${rows.length ? `${fits ? "" : phases}<div class="pl-grid" style="--lw:${LW}px">
        ${fits ? phases : ""}
        <div class="pl-row pl-axis"><div class="pl-l"></div><div class="pl-lane" style="width:${W}px">${months.join("")}${days}</div></div>
        <div class="pl-body"><div class="pl-shade" style="left:${LW + 12}px;width:${W}px">${band}${shade}</div>${tracks}${milestones}${today}</div>
      </div>
      <p class="pl-legend"><span><i class="lg one"></i>One-off post</span><span><i class="lg span"></i>Runs for days</span><span><i class="lg ready"></i>Queued or posted</span><span><i class="lg late"></i>Date passed, not sent</span><span>Drag a clip to move it. Click it for details.</span></p>`
      : `<div class="pl-empty"><img src="../art/showrunner.webp" alt=""><div><b>Nothing on the timeline yet</b><p>Plan the season and your Showrunner lays the episodes out here by channel, or add posts, ads and quizzes in Build.</p><div class="swrow"><button class="btn primary" data-act="view" data-v="plan">${ICON.target} Plan the season</button><button class="btn" data-act="view" data-v="canvas">${ICON.nodes} Build</button></div></div></div>`}
    </section>
    ${selR ? `<div class="pl-insp">${nudge}${tlDetail(selR)}</div>` : ""}
  </div></div>`;
};

Object.assign(A, {
  plzoom(b) { const v = b.dataset.v; S.pl.len = v === "show" ? "show" : +v; S.pl.start = null; repaintTL(); },
  plnav(b) { const d = dnaOf(); const [r0, len] = plRange(dayIx(d.start), dayIx(d.end)); S.pl.start = r0 + (+b.dataset.d) * Math.max(7, Math.round(len / 2)); repaintTL(); },
  pltoday() { S.pl.start = null; if (S.pl.len === "show") S.pl.len = 42; repaintTL(); },
  pldetail() { S.pl.detail = !S.pl.detail; S.tl.zoom = S.pl.detail ? "6w" : "pl"; S.tl.start = null; repaintTL(); },
  plnudge(b) { const n = S.nodes[S.tl.sel]; if (!n) return; const w = isEpisode(n) ? epWin(n) : winOf(n); if (w.s == null) return; const dd = +b.dataset.d; setDates(n, w.s + dd, w.e != null && !(isEpisode(n) && !n.p.end) ? w.e + dd : null, `Moved ${Math.abs(dd)} day${Math.abs(dd) > 1 ? "s" : ""} ${dd > 0 ? "later" : "earlier"} on the timeline`); repaintTL(); toast(`Moved to ${fmtDay(w.s + dd, { weekday: "short", day: "numeric", month: "short" })}`); },
  plopen(b) { S.pl.detail = false; S.tl.sel = b.dataset.id; if (S.view !== "timeline") { S.view = "timeline"; render(); } else repaintTL(); setTimeout(() => $(".tl-detail")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60); },
  plspread() { const d = dnaOf(); const und = epList().filter(n => !n.p.start); if (!und.length) return; const a = Math.max(todayIx() + 1, dayIx(d.start) ?? todayIx() + 1), z = Math.max(a, (dayIx(d.end) ?? a + 27) - 1);
    und.forEach((n, i) => { n.p.start = isoOf(Math.round(a + (z - a) * (i + 1) / (und.length + 1))); hist(n, "Dated by Showrunner"); commitNode(n); }); toast(`${und.length} episode${und.length > 1 ? "s" : ""} dated. Drag them to the right days.`); if (S.view === "timeline") repaintTL(); paintSRP(); },
  plresched(b) { const n = S.nodes[b.dataset.id]; if (!n) return; const s = todayIx() + 1; const w = epWin(n); setDates(n, s, n.p.end ? s + Math.max(0, (w.e ?? w.s) - w.s) : null, "Moved to tomorrow by Showrunner"); toast(`Moved to ${fmtDay(s, { weekday: "short", day: "numeric", month: "short" })}`); if (S.view === "timeline") repaintTL(); paintSRP(); },
  plask(b) { if (!S.srOpen) A.srpanel(); srpSend(b.dataset.t); },
});
{ let rt = 0; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (S.view === "timeline" && !S.pl.detail) repaintTL(); }, 120); }); }

/* What the Showrunner suggests right now, from the Show's real state. Each one has a working button. */
function plSuggest() {
  if (!cur()) return []; const out = []; const t = todayIx(); const eps = epList(); const d = dnaOf();
  const und = eps.filter(n => !n.p.start); if (und.length) out.push({ ic: "cal", t: `${und.length} episode${und.length > 1 ? "s have" : " has"} no date`, d: "Spread them across the show so nothing gets forgotten.", btn: `<button class="btn sm primary" data-act="plspread">Give them dates</button>` });
  const missed = eps.filter(n => deliveryOf(n).k === "missed"); if (missed.length) out.push({ ic: "flag", t: `${missed.length} episode${missed.length > 1 ? "s" : ""} didn't go out`, d: `Ep ${epNo(missed[0])} · ${missed[0].title} passed its date.`, btn: `<button class="btn sm primary" data-act="plresched" data-id="${missed[0].id}">Move to tomorrow</button>` });
  const due = eps.filter(n => deliveryOf(n).k === "due"); if (due.length) out.push({ ic: "spark", t: `Ep ${epNo(due[0])} goes out today`, d: due[0].title, btn: `<button class="btn sm primary" data-act="plopen" data-id="${due[0].id}">Open it</button>` });
  const pg = mainPage(); const pub = pg && pubFor(pg); if (pg && !pub?.p.live) out.push({ ic: "layout", t: "Your page isn't live yet", d: "Every episode sends people to it.", btn: `<button class="btn sm" data-act="view" data-v="canvas">Open in Build</button>` });
  if (!+d.target) out.push({ ic: "target", t: "No goal yet", d: "Say how many bookings or leads this show is for.", btn: `<button class="btn sm" data-act="view" data-v="plan">Set the goal</button>` });
  const soon = eps.filter(n => { const w = epWin(n); return w.s != null && w.s > t && w.s <= t + 3; })[0]; if (soon) out.push({ ic: "eye", t: `Coming up: Ep ${epNo(soon)}`, d: `${soon.title} · ${fmtDay(epWin(soon).s, { weekday: "short", day: "numeric", month: "short" })}`, btn: `<button class="btn sm" data-act="plopen" data-id="${soon.id}">Check it</button>` });
  return out.slice(0, 3);
}
function plGreeting() {
  const s = cur(); const d = dnaOf(); const t = todayIx(); const ds = dayIx(d.start), de = dayIx(d.end); const eps = epList();
  const out = eps.filter(n => ["posted", "running", "live", "ended"].includes(deliveryOf(n).k)).length; const next = eps.filter(n => { const w = epWin(n); return w.s != null && w.s >= t; }).length;
  const when = ds == null ? "It has no dates yet." : t < ds ? `It starts ${fmtDay(ds, { weekday: "long", day: "numeric", month: "short" })}.` : de != null && t > de ? "It has ended." : `It's day ${t - ds + 1}${de != null ? ` of ${de - ds + 1}` : ""}.`;
  return `${s.name}: ${when} ${eps.length ? `${out} of ${eps.length} episodes are out, ${next} still to come.` : "No episodes yet."}`;
}
