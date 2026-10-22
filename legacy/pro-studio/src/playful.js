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

function plHero(mini = false) {
  const s = cur(); const d = dnaOf(); const k = artOf(s); const A = PL_ART[k]; const life = lifeOf(); const pr = progressOf(); const t = todayIx();
  const ds = dayIx(d.start), de = dayIx(d.end); const eps = epList(); const out = eps.filter(n => ["posted", "running", "live", "ended"].includes(deliveryOf(n).k)).length;
  const day = ds == null ? "No dates yet" : t < ds ? `Starts ${fmtDay(ds, { weekday: "short", day: "numeric", month: "short" })}` : de != null && t > de ? "Show ended" : `Day ${t - ds + 1}${de != null ? ` of ${de - ds + 1}` : ""}`;
  const tab = (v, ic, l, on, act = "view") => `<button data-act="${act}" ${act === "view" ? `data-v="${v}"` : ""} aria-current="${on}">${ICON[ic]}${l}</button>`;
  return `<section class="pl-hero${mini ? " mini" : ""}" style="--pbg:${A.bg};--pink:${A.ink}">
    <div class="pl-hero-t"><span class="pl-pill">${esc(PL_LIFE[life] || "Show")}</span>
      <h1>${esc(s.name)}</h1><p>${esc(d.idea || d.offer || "Give this show its one big idea in Plan.")}</p>
      <div class="pl-stats"><span>${ICON.cal}<b>${esc(day)}</b>${ds != null ? `<small>${fmtDay(ds)} – ${de != null ? fmtDay(de) : "open"}</small>` : ""}</span>
        <span>${ICON.target}${+d.target ? `<b>${num(pr.res)} / ${num(+d.target)}</b><small>${esc(unitOf(d.goal, 2))}${pr.sample ? " · sample" : ""}</small>` : `<b>No goal yet</b><small>set it in Plan</small>`}</span>
        <span>${ICON.share}<b>${out} of ${eps.length}</b><small>episodes out</small></span></div></div>
    <div class="pl-hero-art">${PL_DOODLES}<img src="../art/${k}.webp" alt="" draggable="false"></div>
  </section>
  <nav class="pl-tabs" aria-label="Show">${tab("timeline", "timeline", "Timeline", S.view === "timeline")}${tab("canvas", "nodes", "Build", false)}${tab("assets", "image", "Assets", S.view === "assets")}${tab("live", "trophy", "Results", S.view === "live")}${tab("plan", "target", "Plan", S.view === "plan")}${tab("", "sliders", "Settings", false, "settings")}</nav>`;
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

/* ---------- canvas: the node look of the reference (white cards, colour tiles, coloured ports) ---------- */
ICON.dots = ICON.dots || `<svg class="icon" viewBox="0 0 16 16" style="fill:currentColor;stroke:none"><circle cx="8" cy="3.4" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="8" cy="12.6" r="1.4"/></svg>`;
const PL_NODE_C = { brief: "#5b6cff", text: "#8b5cf6", image: "#ff7a3d", style: "#22b07d", palette: "#22b07d", page: "#7c5cf0", popup: "#ec4899", carousel: "#f59e0b", ad: "#f59e0b", publish: "#3b82f6", quiz: "#14b8a6", poll: "#14b8a6", metaad: "#6366f1", chatbot: "#3b82f6", scheduler: "#22c55e", social: "#ec4899", adchannel: "#f97316", cookie: "#d97706", link: "#8b5cf6" };
Object.entries(PL_NODE_C).forEach(([k, c]) => { if (NT[k]) NT[k].color = c; });
{ const _nh = nodeHTML; nodeHTML = function (n) {
  const d = NT[n.type]; const h = _nh(n); if (!d) return h;
  return h.replace(/<div class="nh" data-drag="1"><span class="nico"([^>]*)>([\s\S]*?)<\/span><span class="ty">[\s\S]*?<\/span>([\s\S]*?)<\/div>\s*<div class="nt" data-drag="1">([\s\S]*?)<\/div>/,
    (m, at, ic, status, title) => `<div class="nh pl-nh" data-drag="1"><span class="nico"${at}>${ic}</span><span class="pl-nhd"><b>${title}</b><small>${esc(d.label)}</small></span><button class="pl-kebab" data-act="nodemenu" data-id="${n.id}" aria-label="Edit ${esc(n.title)}" title="Edit">${ICON.dots}</button></div>${status.trim() ? `<div class="pl-nst">${status}</div>` : ""}`);
}; }
A.nodemenu = (b) => selectNode(b.dataset.id, "settings");

/* ---------- ready-made concept images: joyful, colourful, with a friendly face now and then ---------- */
const JOY = ["#ff8a3d", "#ff6aa2", "#ffc94d", "#7c5cf0", "#3fd0b5", "#5b8cff", "#ff5e5e", "#8fd14f"];
const JOY_BG = ["#FFF0C8", "#DCE6FF", "#EDDDF9", "#DEF2E4", "#FFE0D3", "#FCE3EE", "#D9F5EE"];
visualURL = function (item, pal, fontKey = "grotesk", scale = 1) {
  const key = ["joy", item.id, item.motif, item.seed, item.overlay, item.aspect, (pal || []).join(), fontKey, scale].join("|");
  if (VCACHE.has(key)) return VCACHE.get(key);
  const [W0, H0] = ASPECT[item.aspect] || ASPECT["16:9"]; const W = Math.round(W0 * scale), H = Math.round(H0 * scale);
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  const R = rng(item.id + item.motif + item.seed); const M = Math.min(W, H); const ink = "#17171f";
  const pick = (a) => a[Math.floor(R() * a.length)];
  const pop = pal && isHex(pal[4] || "") && lum(pal[4]) > .25 && lum(pal[4]) < .85 ? pal[4] : pick(JOY);
  const cols = [...JOY].sort(() => R() - .5); cols.splice(2, 0, pop);
  const bg = pick(JOY_BG); const g0 = x.createLinearGradient(0, 0, W, H); g0.addColorStop(0, bg); g0.addColorStop(1, pick(JOY_BG)); x.fillStyle = g0; x.fillRect(0, 0, W, H);
  const lw = Math.max(2, M * .014); x.lineCap = "round"; x.lineJoin = "round";
  const blob = (cx, cy, r, col, pts = 8, wob = .22) => { x.fillStyle = col; x.beginPath(); const k = []; for (let i = 0; i < pts; i++) k.push(r * (1 - wob / 2 + R() * wob)); for (let i = 0; i <= pts; i++) { const a = i / pts * Math.PI * 2, rr = k[i % pts]; const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; if (!i) x.moveTo(px, py); else { const a0 = (i - .5) / pts * Math.PI * 2; x.quadraticCurveTo(cx + Math.cos(a0) * rr * 1.12, cy + Math.sin(a0) * rr * 1.12, px, py); } } x.fill(); };
  const star = (cx, cy, r, col, n = 9, inner = .62) => { x.fillStyle = col; x.beginPath(); for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * inner : r; const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.fill(); };
  const face = (cx, cy, s) => { x.strokeStyle = ink; x.lineWidth = s * .09; x.beginPath(); x.arc(cx - s * .32, cy, s * .16, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); x.beginPath(); x.arc(cx + s * .32, cy, s * .16, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); x.beginPath(); x.arc(cx, cy + s * .12, s * .2, Math.PI * .15, Math.PI * .85); x.stroke(); };
  const rays = (cx, cy, r) => { x.strokeStyle = ink; x.lineWidth = lw; for (let i = 0; i < 5; i++) { const a = -Math.PI * .85 + i * .38 + R() * .1; x.beginPath(); x.moveTo(cx + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * 1.15); x.lineTo(cx + Math.cos(a) * r * 1.38, cy + Math.sin(a) * r * 1.38); x.stroke(); } };
  const squiggle = (sx, sy, len, col = ink) => { x.strokeStyle = col; x.lineWidth = lw; x.beginPath(); x.moveTo(sx, sy); for (let i = 1; i <= 4; i++) x.quadraticCurveTo(sx + len * (i - .5) / 4, sy + (i % 2 ? -1 : 1) * len * .14, sx + len * i / 4, sy); x.stroke(); };
  const sparkle = (cx, cy, r, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(cx, cy - r); x.quadraticCurveTo(cx, cy, cx + r, cy); x.quadraticCurveTo(cx, cy, cx, cy + r); x.quadraticCurveTo(cx, cy, cx - r, cy); x.quadraticCurveTo(cx, cy, cx, cy - r); x.fill(); };
  const confetti = (n) => { for (let i = 0; i < n; i++) { const px = R() * W, py = R() * H, s = M * (.012 + R() * .02); x.fillStyle = pick(cols); x.save(); x.translate(px, py); x.rotate(R() * 3); R() > .5 ? x.fillRect(-s, -s / 2, s * 2.4, s) : (x.beginPath(), x.arc(0, 0, s * .8, 0, 7), x.fill()); x.restore(); } };
  switch (item.motif) {
    case "spotlight": case "blob": { /* a friendly character, like the Show mascots */
      const cx = W * (.5 + (R() - .5) * .2), cy = H * .52, r = M * .3;
      blob(W * .18, H * .82, M * .2, cols[3], 7, .3); blob(W * .86, H * .2, M * .16, cols[4], 7, .3);
      item.motif === "spotlight" ? star(cx, cy, r, cols[0], 9 + Math.floor(R() * 3), .66) : blob(cx, cy, r, cols[0], 9, .18);
      face(cx, cy + r * .05, r * .55); rays(cx, cy, r); squiggle(W * .08, H * .16, M * .22); sparkle(W * .82, H * .76, M * .05, cols[1]); confetti(10); break; }
    case "orbs": for (let i = 0; i < 7; i++) { x.globalAlpha = .92; blob(R() * W, R() * H, M * (.12 + R() * .2), cols[i % cols.length], 8, .2); } x.globalAlpha = 1; confetti(16); sparkle(W * .5, H * .5, M * .07, "#fff"); break;
    case "arcs": { const cx = W * (.35 + R() * .3), cy = H * 1.02; for (let i = 7; i > 0; i--) { x.fillStyle = i === 1 ? bg : cols[i % cols.length]; x.beginPath(); x.arc(cx, cy, M * .12 * i, Math.PI, 0); x.fill(); } blob(W * .82, H * .25, M * .12, "#fff", 7, .3); blob(W * .7, H * .28, M * .09, "#fff", 7, .3); confetti(8); break; }
    case "horizon": {
      const sx = W * (.3 + R() * .4), sy = H * .38, sr = M * .17; star(sx, sy, sr * 1.25, "#ffc94d", 12, .78); x.fillStyle = "#ffb020"; x.beginPath(); x.arc(sx, sy, sr, 0, 7); x.fill(); face(sx, sy, sr * .9);
      [[.66, "#8fd14f"], [.76, "#3fd0b5"], [.88, "#2bb39a"]].forEach(([y, col]) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, H); x.lineTo(0, H * y); const n = 3; for (let i = 1; i <= n; i++) x.quadraticCurveTo(W * (i - .5) / n, H * (y - .08 - R() * .06), W * i / n, H * y); x.lineTo(W, H); x.fill(); });
      squiggle(W * .7, H * .16, M * .2); sparkle(W * .12, H * .2, M * .045, cols[1]); break; }
    case "stripes": { x.save(); x.translate(W / 2, H / 2); x.rotate(-.5); const bw = M * .09; for (let i = -30; i < 30; i++) { x.fillStyle = i % 2 ? cols[(i + 60) % cols.length] : "#ffffff"; x.fillRect(i * bw, -M * 2, bw, M * 4); } x.restore(); blob(W * .5, H * .5, M * .22, "#fff", 9, .15); star(W * .5, H * .5, M * .14, cols[0], 8, .6); break; }
    case "grid": { const n = 4, cw = W / n, ch = H / Math.max(2, Math.round(n * H / W)); for (let i = 0; i < n; i++) for (let j = 0; j * ch < H; j++) { const col = pick(cols); const r = R(); x.fillStyle = col; const X0 = i * cw, Y0 = j * ch, s = Math.min(cw, ch);
        if (r < .3) { x.beginPath(); x.arc(X0 + cw / 2, Y0 + ch / 2, s * .4, 0, 7); x.fill(); } else if (r < .55) { x.beginPath(); x.arc(X0 + cw / 2, Y0 + ch, s * .45, Math.PI, 0); x.fill(); } else if (r < .75) star(X0 + cw / 2, Y0 + ch / 2, s * .38, col, 6, .55); else { x.beginPath(); x.roundRect(X0 + s * .14, Y0 + s * .14, cw - s * .28, ch - s * .28, s * .18); x.fill(); } }
      break; }
    default: confetti(40); for (let i = 0; i < 5; i++) sparkle(R() * W, R() * H, M * (.03 + R() * .04), pick(cols)); squiggle(W * .2, H * .5, M * .3); squiggle(W * .55, H * .3, M * .25, cols[0]);
  }
  if (item.overlay) {
    const fp = FONT_PAIRS[fontKey] || FONT_PAIRS.pixel; const fs = Math.round(M * .11);
    x.font = `${fp.w || 800} ${fs}px ${fp.head}`; x.textBaseline = "alphabetic";
    const words = item.overlay.toUpperCase().split(/\s+/); const lines = []; let line = "";
    words.forEach(w => { const t = line ? line + " " + w : w; if (x.measureText(t).width > W * .8 && line) { lines.push(line); line = w; } else line = t; }); lines.push(line);
    const pad = M * .07; let y = H - pad - (lines.length - 1) * fs * .98;
    x.fillStyle = "rgba(255,255,255,.88)"; const tw = Math.max(...lines.map(l => x.measureText(l).width)); x.beginPath(); x.roundRect(pad * .6, y - fs * 1.05, tw + pad * .8, (lines.length) * fs * .98 + fs * .35, fs * .3); x.fill();
    x.fillStyle = ink; lines.forEach(l => { x.fillText(l, pad, y); y += fs * .98; });
  }
  const url = c.toDataURL("image/jpeg", .88); VCACHE.set(key, url); return url;
};
/* the canvas outline duplicates the Showrunner panel; with the panel open the canvas gets the room */
{ const _cv = canvasView; canvasView = () => { const h = _cv(); return S.srOpen && !S.nodes[S.sel] && innerWidth > 760 ? h.replace(/<aside class="insp" id="insp"><\/aside>/, "") : h; }; }
{ const _sel = selectNode; selectNode = function (id, tab) { _sel(id, tab); if (S.view === "canvas" && !$("#insp")) render(); else mountSRP(); }; }
{ const _ds = A.desel; A.desel = function () { _ds(); if (S.view === "canvas" && S.srOpen) render(); }; }

/* every Show page starts with the same pastel header and tabs (smaller than on the timeline) */
{ const _vb = viewBody; viewBody = function () {
  const h = _vb(); if (!cur() || innerWidth <= 760 || !["assets", "live", "plan", "needs"].includes(S.view)) return h;
  return h.replace(/<div class="home-in[^"]*"[^>]*>/, (m) => m + plHero(true));
}; }
/* wires stay visible in their colours (dimmer when another node is in focus) */
{ const _dw2 = drawWires; drawWires = function (ghost) { _dw2(ghost); $$("#wires path[data-edge]:not(.hit)").forEach(p => { if (+p.style.opacity < .2) p.style.opacity = S.sel ? .25 : .55; }); }; }

/* ============================================================
   Free canvas: no Kit / Hook / Show / Convert columns. Place things anywhere.
   - A node's phase is stored on the node (n.lane) instead of being read from where it sits.
     Older nodes get it once from their position, then keep it however they're moved.
   - One dot in, one dot out: drop a wire anywhere on a node and it plugs into the matching input.
   - "+" on a node's right edge, or dragging a wire into empty space, offers what usually comes next.
     The Showrunner's picks are wired and, for blocks it can build, built straight away.
   - ▷ builds everything that isn't built yet. Preview opens the Show's landing page.
   ============================================================ */
const _laneX = laneOf;
laneOf = function (n) {
  if (!n) return "kit"; if (KIT_TYPES.has(n.type) || CONVERT_TYPES.has(n.type)) return _laneX(n);
  if (["kit", "hook", "show", "convert"].includes(n.lane)) return n.lane;
  const l = _laneX(n); n.lane = l; return l;
};
const stampLanes = () => Object.values(S.nodes).forEach(n => laneOf(n));
{ const _pw = paintWorld; paintWorld = function () { stampLanes(); _pw(); }; }
paintLanes = function () { const b = $("#lanes"); if (b) b.innerHTML = ""; };
{ const _an = addNode; addNode = function (type, x, y, extra = {}) {
  const src = S.lib?.wireFrom && S.nodes[S.lib.wireFrom.node];
  const n = _an(type, x, y, extra);
  if ((EP_TYPES.has(type) || type === "image") && !extra.lane) { /* decided here, not from where the card happens to land */
    const fx = Object.entries(LANE_X).find(([, v]) => v === Math.round(x))?.[0];
    const sl = src && ["hook", "show", "convert"].includes(laneOf(src)) ? laneOf(src) : null;
    n.lane = fx && (type === "image" || fx !== "kit") ? fx : type === "image" ? (sl || "kit") : (sl || "hook");
    if (!isEx()) Store.put("nodes", S.showId, n);
  }
  return n;
}; }
A.eplane = function (b) { const n = selNode(); if (!n) return; const l = b.dataset.v; n.lane = l; hist(n, l === "kit" ? "Now a shared visual" : "Phase: " + LANES.find(x => x[0] === l)[1]); commitNode(n); paintWorld(); S.inspFor = null; paintInspector(); renderSidebarOnly(); };
{ const _ib = inspectorBody; inspectorBody = function (n) {
  let h = _ib(n).replace(/<span>Lane<\/span>/, "<span>Phase</span>");
  if (n.type === "image") {
    const L = laneOf(n); const btn = (v, l) => `<button data-act="eplane" data-v="${v}" aria-pressed="${L === v}">${l}</button>`;
    const pick = `<div class="fld"><span>Use this image as</span><div class="seg" style="justify-self:start;flex-wrap:wrap">${btn("kit", "Shared visual")}${btn("hook", "Hook post")}${btn("show", "Show post")}${btn("convert", "Convert post")}</div></div>`;
    h = L === "kit" ? pick + h : h.replace(/<div class="fld"><span>Phase<\/span>[\s\S]*?<\/div><\/div>/, pick);
  }
  return h;
}; }

/* nodes: an edit button, and "+" for the next step */
{ const _nh2 = nodeHTML; nodeHTML = function (n) {
  const h = _nh2(n); const d = NT[n.type]; if (!d?.outputs?.length) return h;
  return h.replace(/<\/div>\s*$/, `<button class="pl-next" data-act="plnext" data-id="${n.id}" aria-label="What comes after ${esc(n.title)}?" title="Add what comes next">${ICON.plus}</button></div>`);
}; }
const PL_NEXT = ["page", "carousel", "metaad", "ad", "popup", "publish", "quiz", "poll", "chatbot", "scheduler", "social", "adchannel", "image", "text"];
A.plnext = function (b) {
  const n = S.nodes[b.dataset.id]; const o = NT[n?.type]?.outputs?.[0]; if (!o) return; const r = b.getBoundingClientRect();
  S.lib = { sx: r.right + 10, sy: r.top - 40, wx: n.x + nodeW(n) + 110, wy: n.y, wireFrom: { node: n.id, port: o.k, t: o.t } }; S.libq = ""; paintLayer();
};
{ const _lp = libraryPop; libraryPop = function () {
  const h = _lp(); const L = S.lib; if (!L?.wireFrom) return h;
  const sug = PL_NEXT.filter(k => NT[k] && (typeof nodeAllowed !== "function" || nodeAllowed(k)) && NT[k].inputs.some(i => i.t === L.wireFrom.t)).slice(0, 3);
  if (!sug.length) return h;
  const row = `<div class="pl-sugrow"><h5>${ICON.sparkle || ICON.spark} Showrunner suggests</h5><div class="pl-sugs">${sug.map(k => `<button class="pl-sug" data-act="pladd" data-t="${k}"><span class="nico" style="--nc:${NT[k].color}">${ICON[NT[k].icon]}</span><b>${esc(NT[k].label)}</b><small>${BUILDABLE.has(k) ? "Wired and built for you" : "Wired for you"}</small></button>`).join("")}</div><h5>Or pick anything</h5></div>`;
  return h.replace(/(<label class="sb-search"[\s\S]*?<\/label>)/, `$1${row}`);
}; }
A.pladd = function (b) { A.addnode(b); const n = S.nodes[S.sel]; if (n && BUILDABLE.has(n.type)) { toast(`Building “${n.title}”…`); buildNode(n).catch(() => toast("Couldn't build it just now. Try Build in the inspector.")); } };

/* canvas chrome like the reference: Canvas | Preview, ▷, zoom pill, fit */
{ const _cv2 = canvasView; canvasView = () => {
  let h = _cv2();
  h = h.replace(/<div class="zoomer">([\s\S]*?)<\/div>/, (m, inner) => { const parts = inner.match(/<button[\s\S]*?<\/button>|<span[\s\S]*?<\/span>/g) || []; const pill = parts.slice(0, 3).join(""), rest = parts.slice(3).join("");
    return `<div class="zoomer pl-zoom"><button class="pl-round play" data-act="plbuildall" title="Let Showrunner build everything that isn't built yet" aria-label="Build everything">${ICON.play}</button><div class="pl-zpill">${pill}</div>${rest}</div>`; });
  return h.replace('<div class="rail"', `<div class="pl-cvtabs" role="tablist"><button role="tab" aria-selected="true">Canvas</button><button role="tab" aria-selected="false" data-act="plpreview">Preview</button></div><div class="rail"`);
}; }
A.plpreview = function () { const pg = mainPage(); if (!pg) return toast("Add a landing page first: press + on a node and pick Landing page."); S.sel = pg.id; A.preview(); };
A.plbuildall = async function () {
  if (S.plBuilding) return; const list = Object.values(S.nodes).filter(n => BUILDABLE.has(n.type) && n.status !== "building" && (!n.builtAt || G.stale(n)));
  if (!list.length) return toast("Everything is built. Change something and press play again.");
  S.plBuilding = true; toast(`Showrunner is building ${list.length} block${list.length > 1 ? "s" : ""}…`);
  for (const n of list) { try { await buildNode(n); } catch { } }
  S.plBuilding = false; toast("Built. Look them over; nothing goes out until you publish.");
};
/* a big canvas opens readable, at the beginning of the flow; the fit button still shows everything */
{ const _fit = fit; fit = function () { const user = S.plUserFit; S.plUserFit = false; _fit(); const b = bounds(); if (!user && b && (S.vp.k < .6 || S.vp.k > .85)) { const k = .72; S.vp = { k, x: 150 - b.x0 * k, y: 110 - b.y0 * k }; applyVp(); } }; }
{ const _af = A.fit; A.fit = function (b) { S.plUserFit = true; return _af ? _af(b) : fit(); }; }
