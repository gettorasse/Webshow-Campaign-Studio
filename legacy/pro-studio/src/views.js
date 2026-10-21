/* ============================================================
   Views
   ============================================================ */
function render() {
  const app = $("#app");
  if (S.view === "public") { document.body.style.overflow = "auto"; app.innerHTML = publicView(); mountPublic(); paintLayer(); return; }
  document.body.style.overflow = "hidden";
  const show = cur();
  app.innerHTML = `<div class="app ${S.sbOpen ? "sb-open" : ""} ${S.sbHidden ? "sb-hidden" : ""}" style="--show:${show ? tintOf(show) : "var(--brand)"}">
    <div class="sb-scrim" data-act="sbclose"></div>
    <aside class="sb" id="sb">${sidebar()}</aside>
    <section class="main">${topbar()}<div class="body" id="body">${viewBody()}</div></section>
  </div>`;
  if (S.view === "connectors") loadConnectors();
  if (S.view === "canvas") mountCanvas();
  if ($(".home-dots [data-dots-canvas-init]") && !$(".home-dots [data-dots-canvas-init] canvas")) initInteractiveDotsGridBackground();
  if (S.view === "threads") { const m = $(".msgs"); if (m) m.scrollTop = m.scrollHeight; }
  if (S.view === "live") { loadLive(); mountDash(); }
  paintLayer(); paintPresence();
}
function renderSidebarOnly() { const sb = $("#sb"); if (sb) sb.innerHTML = sidebar(); }
function viewBody() {
  if (S.view === "home") return homeView();
  if (S.view === "connectors") return connectorsView();
  if (!cur()) return homeView();
  return { canvas: canvasView, timeline: timelineView, threads: threadsView, assets: assetsView, live: liveView }[S.view]?.() || homeView();
}

/* ---------- sidebar ---------- */
function sidebar() {
  const show = cur(); const shows = Object.values(S.shows).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const f = S.find.toLowerCase(); const list = shows.filter(s => !f || s.name.toLowerCase().includes(f));
  const th = Object.values(S.threads); const nUnread = th.filter(t => Reads.unread(t)).length; const nNeeds = th.filter(t => t.status === "needs").length, nOpen = th.filter(t => t.status === "open").length, nDone = th.filter(t => t.status === "done").length;
  const anyNeeds = shows.some(s => s.id !== S.showId && s.needs) || (S.showId && nNeeds);
  const row = (act, ic, label, extra = "", cur = false, attrs = "", cls = "") => `<button class="srow ${cls}" data-act="${act}" ${attrs} aria-current="${cur}"><span class="ic">${ic}</span><span class="lbl">${label}</span>${extra}</button>`;
  const dot = (c) => `<span style="width:7px;height:7px;border-radius:50%;background:${c}"></span>`;
  return `<div class="sb-top"><button class="wordmark" data-act="home" aria-label="Webshow Campaign Studio home">webshow<i>.ai</i></button><button class="ib" data-act="sbtoggle" aria-label="Hide sidebar">${ICON.sidebar}</button></div>
  <div class="sb-scroll">
    <label class="sb-search">${ICON.search}<input id="findshow" placeholder="Find a show" value="${esc(S.find)}" autocomplete="off"></label>
    ${row("home", ICON.spark, "Showrunner", anyNeeds ? dot("var(--cta)") : "", S.view === "home", "", "brand")}
    ${row("templates", ICON.grid, "Templates", "", false, "", "brand")}
    ${row("view", ICON.plug, "Connectors", Object.values(S.con?.conns || {}).some(c => c.on) ? dot("var(--live)") : "", S.view === "connectors", 'data-v="connectors"', "brand")}
    <div class="sb-sep"></div>
    ${show ? `<div class="sb-show" style="--st:${tintOf(show)}"><button class="sb-head srow" data-act="settings" style="font-weight:600"><span class="av" style="--nc:${tintOf(show)}">${esc((show.name || "?")[0].toUpperCase())}</span><span class="lbl">${esc(show.name)}</span>${show.example ? `<span class="chip">Example</span>` : ""}</button>
      ${row("view", ICON.nodes, "Canvas", `<span class="ct">${Object.keys(S.nodes).length}</span>`, S.view === "canvas", 'data-v="canvas"')}
      ${row("view", ICON.timeline, "Timeline", "", S.view === "timeline", 'data-v="timeline"')}
      ${row("threadsnav", ICON.chat, "Threads", `${nUnread ? `<span class="badge" title="${nUnread} unread">${nUnread}</span>` : ""}<span class="ct">${th.length}</span>`, S.view === "threads" && S.tfilter === "all", `aria-expanded="${!!S.thOpen}"`)}
      ${S.thOpen ? `<div class="sb-subs">
      <button class="srow sub ${nNeeds ? "needs" : ""}" data-act="view" data-v="threads" data-f="needs" aria-current="${S.view === "threads" && S.tfilter === "needs"}"><span class="ic">${ICON.hand}</span><span class="lbl">Needs you</span><span class="ct">${nNeeds}</span></button>
      <button class="srow sub" data-act="view" data-v="threads" data-f="open" aria-current="${S.view === "threads" && S.tfilter === "open"}"><span class="ic">${ICON.chat}</span><span class="lbl">Open</span><span class="ct">${nOpen}</span></button>
      <button class="srow sub" data-act="view" data-v="threads" data-f="done" aria-current="${S.view === "threads" && S.tfilter === "done"}"><span class="ic">${ICON.check}</span><span class="lbl">Done</span><span class="ct">${nDone}</span></button></div>` : ""}
      ${row("view", ICON.image, "Assets", `<span class="ct">${Object.values(S.nodes).filter(n => n.type === "image").length}</span>`, S.view === "assets", 'data-v="assets"')}
      ${row("view", ICON.signal, "Live", Object.values(S.nodes).some(n => n.type === "publish" && n.p.live) ? `<span style="width:7px;height:7px;border-radius:50%;background:var(--live)"></span>` : "", S.view === "live", 'data-v="live"')}
      ${row("settings", ICON.sliders, "Show settings")}</div>
      <div class="sb-sep"></div>` : ""}
    ${list.filter(s => s.id !== S.showId).slice(0, 8).map(s => `<button class="srow" data-act="open" data-id="${s.id}"><span class="av" style="--nc:${tintOf(s)}">${esc((s.name || "?")[0].toUpperCase())}</span><span class="lbl">${esc(s.name)}</span>${s.building ? `<span class="ct" style="color:var(--tint)">●</span>` : ""}${s.needs ? `<span class="badge">${s.needs}</span>` : ""}</button>`).join("")}
    ${shows.length > 9 ? row("home", ICON.grid, "All shows…") : ""}
  </div>
  <div class="sb-foot">
    ${row("newshow", ICON.plus, "Start new show", "", false, "", "brand")}
    ${row("share", ICON.share, "Invite your team", "", false, "", "brand")}
    <div class="me">${People.avatar(Store.me.id, `<i class="on"></i>`)}<b style="font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(Store.me.name || "You")}</b><button class="ib" data-act="theme" aria-label="Switch light or dark">${P('<path d="M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5Z"/>')}</button></div>
  </div>`;
}

/* ---------- top bar ---------- */
function topbar() {
  const show = cur(); let t = "";
  if (S.view === "connectors") t = `<b class="px" style="font-size:15px">Connectors</b>`;
  else if (S.view === "home" || !show) t = `<b class="px" style="font-size:15px">Showrunner</b>`;
  else {
    const label = { canvas: "Canvas", timeline: "Timeline", threads: "Threads", assets: "Assets", live: "Live" }[S.view];
    t = `${show.example ? `<span class="tag">${esc(show.name)}</span>` : `<button class="tag tag-btn" data-act="rename" title="Rename show">${esc(show.name)} ${P('<path d="M10.5 2.5l3 3L6 13H3v-3z"/>').replace('class="icon"', 'class="icon sm"')}</button>`}<b>${label}</b>${show.example ? `<span class="muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">· Example: edits aren't saved</span><button class="btn sm" data-act="dupex">Duplicate to keep</button>` : ""}`;
  }
  return `<header class="bar">
    <button class="ib only-m" data-act="sbopen" aria-label="Open sidebar">${ICON.menu}</button>
    ${S.sbHidden ? `<button class="ib" data-act="sbtoggle" aria-label="Show sidebar">${ICON.sidebar}</button>` : ""}
    <div class="title">${t}</div>
    <div class="peers" id="peers"></div>
    ${show && !["home", "connectors"].includes(S.view) ? `<button class="btn sm" data-act="share">${ICON.share} Share</button>` : ""}
    ${S.view === "canvas" && show ? `<button class="ib" data-act="insp" aria-pressed="${S.insp}" aria-label="Toggle inspector">${ICON.inspector}</button>` : ""}
  </header>`;
}
function paintPresence() {
  const el = $("#peers"); if (!el) return;
  const here = Room.peers.filter(p => S.showId && p.presence?.s === S.showId);
  const seen = new Set(); const ids = here.map(p => p.by || p.peer).filter(id => !seen.has(id) && seen.add(id));
  el.innerHTML = ids.slice(0, 5).map(id => People.avatar(id)).join("") + (ids.length > 5 ? `<span class="uav" style="background:var(--bubble);color:var(--ink)">+${ids.length - 5}</span>` : "");
  if (S.view === "canvas") paintCursors();
}

/* ---------- home ---------- */
function hello() { const h = new Date().getHours(); return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }
function homeView() {
  const shows = Object.values(S.shows).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const needs = Object.values(S.threads).filter(t => t.status === "needs");
  const otherNeeds = shows.filter(s => s.id !== S.showId && s.needs);
  const building = Object.values(S.nodes).filter(n => n.status === "building");
  const stOf = (s) => (s.id === "example" ? showStateOf(Object.values(S.example?.nodes || {})) : s.id === S.showId && !isEx() ? showStateOf(Object.values(S.nodes)) : { state: s.state || "draft", note: s.liveNote || "" });
  const withSt = shows.map(s => ({ ...s, st: stOf(s) })); const active = withSt.filter(s => s.st.state === "active"); const stopped = withSt.filter(s => s.st.state !== "active");
  const showRow = (s) => `<button class="li" data-act="open" data-id="${s.id}" ${s.needs ? 'data-v="threads"' : ""}><span class="av" style="--nc:${tintOf(s)}">${esc((s.name || "?")[0].toUpperCase())}</span><span class="t"><b>${esc(s.name)}</b><span>${s.st.state === "active" ? `<i class="livedot"></i>${esc(s.st.note)}` : s.st.state === "draft" ? (s.example ? "Example show · not launched" : "Draft · not launched yet") : `Stopped${s.st.note ? " · " + esc(s.st.note) : ""} · ${ago(s.updatedAt || now())}`}</span></span>${s.needs ? `<span class="chip st-needs"><i></i>${s.needs} needs you</span>` : ""}</button>`;
  return `<div class="home-dots"><div data-dots-canvas-init="" class="interactive-dots-grid" data-dots-color-inactive="var(--dots-off)" data-dots-color-active="var(--dots-on)"></div><div class="home"><div class="home-in">
    <div class="hello"><span class="sr-mark">${ICON.spark}</span><h1>${hello()}${Store.me.name ? ", " + esc(Store.me.name.split(" ")[0]) : ""}.</h1></div>
    <div>
      <div class="composer"><textarea id="homeask" aria-label="Tell Showrunner your idea" placeholder="Tell Showrunner your wildest idea. It plans the campaign, wires the nodes and builds every block." ${S.homeBusy ? "disabled" : ""}>${esc(S.homeText)}</textarea>
      <div class="cbar"><span class="chip">${ICON.spark} Showrunner</span>${effortSeg()}<span class="grow"></span>${S.homeBusy ? `<span class="chip st-building ty-chip" role="status"><span class="tdots sm" aria-hidden="true"><i></i><i></i><i></i></span>Showrunner is planning your show…</span>` : ""}<button class="send" data-act="homego" aria-label="Create show" ${S.homeBusy ? "disabled" : ""}>${ICON.send}</button></div></div>
      <p class="faint" style="font-size:12px;margin-top:8px">${AI.fn ? "Showrunner plans the nodes, wires them and builds every block." : "AI isn't connected in this view, so Studio makes a template-based draft. Open it in Claude to plan with AI."}</p>
    </div>
    ${ideasHTML()}
    <div class="sec-h" style="margin-bottom:-14px"><span>Or start from a template</span><button class="btn sm ghost" data-act="templates">${ICON.grid} All templates</button></div>
    <div class="sugg">${["full", "pagepop", "carousel"].map(k => `<button data-act="tplprev" data-src="builtin" data-id="${k}"><b>${esc(TEMPLATES[k].name)}</b><span>${esc(TEMPLATES[k].desc)}</span></button>`).join("")}</div>
    <div class="hgrid">
      <div>
        <div class="sec-h"><span>Active shows<span class="n">${active.length}</span></span></div>
        <div style="display:grid;gap:2px">${active.map(s => showRow(s)).join("") || `<p class="muted" style="padding:6px 8px">No show is running right now. Publish a page, launch ads or schedule a post and it shows up here.</p>`}</div>
        ${building.length ? `<div class="sec-h" style="margin-top:18px"><span>In production<span class="n">${building.length}</span></span></div>${building.map(n => `<button class="li" data-act="gonode" data-id="${n.id}"><span class="nico" style="--nc:${NT[n.type].color}">${ICON[NT[n.type].icon]}</span><span class="t"><b>${esc(n.title)}</b><span>Showrunner is building</span></span></button>`).join("")}` : ""}
      </div>
      <div>
        <div class="sec-h"><span>Stopped<span class="n">${stopped.length}</span></span><button class="btn sm ghost" data-act="newshow">${ICON.plus} New</button></div>
        <div style="display:grid;gap:2px">${stopped.map(s => showRow(s)).join("") || `<p class="muted" style="padding:6px 8px">Nothing stopped.</p>`}</div>
      </div>
    </div>
    </div>
  </div></div></div>`;
}
function effortSeg(id = "") { return `<div class="seg" role="group" aria-label="Effort">${[["quick", "Quick"], ["balanced", "Balanced"], ["deep", "Deep"]].map(([k, l]) => `<button data-act="effort" data-v="${k}" aria-pressed="${S.effort === k}">${l}</button>`).join("")}</div>`; }
function lastText(t) { const m = [...t.messages].reverse().find(x => x.text); return m ? m.text : ""; }

/* ---------- threads ---------- */
function threadsView() {
  const all = Object.values(S.threads).sort((a, b) => b.updatedAt - a.updatedAt);
  const q = S.tq.toLowerCase();
  const list = all.filter(t => (S.tfilter === "all" || t.status === S.tfilter) && (!q || (t.title + lastText(t)).toLowerCase().includes(q)));
  const t = S.threads[S.thread] || null;
  return `<div class="list ${t ? "hide-m" : ""}">
    <div class="list-h"><h2>${{ all: "Threads", needs: "Decisions", open: "Open", done: "Done" }[S.tfilter]}</h2><button class="ib" data-act="newthread" aria-label="New thread">${ICON.plus}</button></div>
    <div class="list-s"><label class="sb-search" style="margin:0">${ICON.search}<input id="tq" placeholder="Search threads…" value="${esc(S.tq)}" autocomplete="off"></label></div>
    <div class="list-b">${list.map(threadCard).join("") || `<div class="empty"><span>No threads here.</span><button class="btn sm" data-act="newthread">${ICON.plus} New thread</button></div>`}</div>
  </div>
  <div class="thread ${t ? "" : "hide-m"}">${t ? threadDetail(t) : `<div class="empty" style="margin:auto"><h3>Talk it through</h3><span>Threads hold Showrunner's questions, your team's comments and every decision, pinned to the node they're about.</span></div>`}</div>`;
}
function threadCard(t) {
  const n = t.nodeId && S.nodes[t.nodeId]; const pend = t.messages.find(m => m.kind === "decision" && !m.picked);
  const un = Reads.unread(t);
  return `<button class="tc ${un ? "unread" : ""}" data-act="openthread" data-id="${t.id}" aria-current="${S.thread === t.id}" aria-label="${esc(t.title)}${un ? `, ${un} unread` : ""}">
    <div class="r1">${n ? `<span class="tag">${esc(n.title)}</span>` : `<span class="tag">Show</span>`}<span class="grow"></span>${un ? `<span class="newb">${un} new</span>` : `<span class="meta">${ICON.chat}${t.messages.length}</span>`}</div>
    <b style="font-weight:600">${esc(t.title)}</b><p>${esc(lastText(t))}</p>
    <div class="meta">${People.avatar(t.messages.at(-1)?.by || t.by).replace('class="uav"', 'class="uav" style="width:16px;height:16px;font-size:8px"')}<span>${esc(People.get(t.messages.at(-1)?.by || t.by).name)}</span><span>· ${ago(t.updatedAt)}</span>${t.status === "done" ? `<span class="chip st-approved" style="margin-left:auto"><i></i>Done</span>` : ""}</div>
    ${pend ? `<div class="needs-strip"><b>● Needs you</b><span class="grow">${esc(pend.text)}</span><span>Answer →</span></div>` : ""}
  </button>`;
}
function threadDetail(t) {
  const n = t.nodeId && S.nodes[t.nodeId]; Reads.seen(t);
  return `<div class="bar" style="border-bottom:1px solid var(--line)"><button class="ib only-m" data-act="closethread" aria-label="Back">${ICON.back}</button><div class="title"><b>${esc(t.title)}</b></div>${n ? `<button class="btn sm" data-act="gonode" data-id="${n.id}">${ICON.nodes} Open on canvas</button>` : ""}${Reads.unread(t) ? `<button class="btn sm ghost" data-act="markread" data-id="${t.id}">Mark read</button>` : `<button class="btn sm ghost" data-act="markunread" data-id="${t.id}" title="Keep this thread flagged as new">Mark unread</button>`}<button class="btn sm" data-act="tstatus" data-id="${t.id}">${t.status === "done" ? "Reopen" : `${ICON.check} Mark done`}</button></div>
  <div class="msgs">${t.messages.map(m => msgView(t, m)).join("")}${S.typing.has(t.id) ? typingHTML() : ""}${t.status === "needs" ? `<p class="faint" style="font-size:12px">Needs your input</p>` : ""}</div>
  <div class="tcomp">${composerHTML("tmsg", "Write to your team, or ask Showrunner…", true)}</div>`;
}
function msgView(t, m) {
  const p = People.get(m.by);
  if (m.kind === "decision") return `<div class="decision"><div class="q">${ICON.chat}<span>${esc(m.text)}</span></div>
    ${m.picked ? `<div class="done">${ICON.check} ${esc(m.picked)}</div><span class="faint" style="font-size:12px">Chosen by ${esc(People.get(m.pickedBy).name)}</span>` : `<div>${m.options.map((o, i) => `<label class="opt"><input type="radio" name="d_${m.id}" id="d_${m.id}_${i}" value="${esc(o)}"> <span>${esc(o)}</span></label>`).join("")}</div>
    <input class="inp" id="dx_${m.id}" placeholder="Anything else? (optional)"><div class="swrow"><button class="btn primary sm" data-act="decide" data-t="${t.id}" data-m="${m.id}">Confirm</button><button class="btn sm ghost" data-act="dismiss" data-t="${t.id}" data-m="${m.id}">Dismiss</button></div>`}</div>`;
  const mine = p.me; const cls = m.by === "ai" ? "ai" : mine ? "me" : "team";
  return `<div class="msg ${cls}${m.id === S.freshMsg ? " fresh" : ""}"><div class="mh">${People.avatar(m.by)}<b>${esc(p.name)}</b><span class="grow"></span><time>${new Date(m.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time></div><div class="mb">${esc(m.text)}</div></div>`;
}
function composerHTML(id, ph, withAI) {
  return `<form class="composer" data-form="${id}"><textarea id="${id}" placeholder="${esc(ph)}" rows="2"></textarea><div class="cbar">${withAI ? `<label class="check" style="font-size:12px;color:var(--muted)"><input type="checkbox" id="${id}_ai" ${S.toAI ? "checked" : ""}> Ask Showrunner</label>` : ""}<span class="grow"></span><button class="send" aria-label="Send">${ICON.send}</button></div></form>`;
}

/* ---------- assets ---------- */
function assetsView() {
  const imgs = Object.values(S.nodes).filter(n => n.type === "image");
  return `<div class="home" style="background:var(--canvas)"><div class="home-in" style="max-width:1000px;padding-top:28px">
    <div class="sec-h"><span class="px vt" style="font-size:24px">Assets</span><div class="swrow"><label class="btn" for="assetup">${ICON.upload} Upload images</label><input type="file" id="assetup" accept="image/*" multiple hidden data-change="assetup"><button class="btn" data-act="exportkit">${ICON.doc} Export campaign kit</button></div></div>
    ${imgs.length ? `<div class="showgrid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${imgs.map(n => { const v = imageValue(n, .35); return `<button class="showcard" data-act="gonode" data-id="${n.id}" style="padding:0;overflow:hidden;gap:0"><img alt="${esc(v.alt)}" src="${v.src}" style="${v.style};width:100%;aspect-ratio:4/3;object-fit:cover;display:block"><span style="padding:8px 10px;display:grid;gap:2px"><b>${esc(n.title)}</b><span class="muted" style="font-size:12px">${n.p.source === "upload" ? "Upload" : "Concept art"} · used in ${G.edgesFrom(n.id).length}</span></span></button>`; }).join("")}</div>`
      : `<div class="empty"><h3>No images yet</h3><span>Upload photos, logos or product shots. Each becomes an Image node you can wire into pages, popups and carousels.</span></div>`}
    <p class="faint" style="font-size:12px">The campaign kit exports the brief, copy, style guide and every built block as one Markdown file you own.</p>
  </div></div>`;
}

/* ---------- live (box office) ---------- */
function liveView() {
  const pubs = Object.values(S.nodes).filter(n => n.type === "publish");
  const L = S.live;
  const leads = L ? L.leads.filter(l => pubs.some(p => p.p.slug === l.slug)).sort((a, b) => b.at - a.at) : [];
  return `<div class="home" style="background:var(--canvas)"><div class="home-in" style="max-width:1160px;padding-top:28px">
    ${liveDash(pubs, L)}
    <div class="sec-h" style="margin-top:8px"><span>Show Pages</span>${leads.length ? `<button class="btn" data-act="copycsv">${ICON.copy} Copy leads as CSV</button>` : ""}</div>
    ${pubs.length ? `<div style="display:grid;gap:6px">${pubs.map(n => { const v = L?.visits[n.p.slug] || 0; const l = leads.filter(x => x.slug === n.p.slug).length; return `<div class="showcard" style="grid-template-columns:minmax(0,1fr) repeat(3,auto);align-items:center;gap:18px"><span style="display:grid;gap:2px;min-width:0"><b>${esc(n.title)}</b><span class="mono muted" style="font-size:12px;overflow-wrap:anywhere">/${esc(n.p.slug || "—")}</span></span><span class="chip ${n.p.live ? "st-live" : ""}"><i></i>${n.p.live ? "Live" : "Draft"}</span><span style="display:grid;text-align:right"><b class="px" style="font-size:20px">${v}</b><span class="faint" style="font-size:11px">views</span></span><span style="display:grid;text-align:right"><b class="px" style="font-size:20px">${l}</b><span class="faint" style="font-size:11px">leads</span></span></div>`; }).join("")}</div>`
      : `<div class="empty"><h3>Nothing live yet</h3><span>Add a Publish node to the canvas and wire a landing page into it.</span></div>`}
    <div class="sec-h" style="margin-top:8px"><span>Leads</span></div>
    ${!L ? `<p class="muted">Loading…</p>` : leads.length ? `<div style="overflow-x:auto;border-radius:var(--r2);box-shadow:var(--ring);background:var(--raised)"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr>${["When", "Page", "Name", "Email", "Details"].map(h => `<th style="text-align:left;padding:8px 10px;color:var(--faint);font-weight:600;font-size:11.5px;border-bottom:1px solid var(--line)">${h}</th>`).join("")}</tr></thead><tbody>${leads.map(l => `<tr>${[ago(l.at), "/" + l.slug, l.name, l.email, [l.phone, l.company, l.date, l.message].filter(Boolean).join(" · ")].map(c => `<td style="padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top">${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : `<p class="muted">Form and popup submissions from your live pages show up here.</p>`}
  </div></div>`;
}
async function loadLive() { if (S.live && S.liveFor === S.showId) return; S.liveFor = S.showId; try { S.live = await Store.liveStats(); } catch { S.live = { leads: [], visits: {} }; } if (S.view === "live") { $("#body").innerHTML = liveView(); mountDash(); } }

/* ---------- layer: modals, library, preview ---------- */
function paintLayer() {
  const L = $("#layer"); let h = "";
  const m = S.modal; const show = cur();
  if (m === "templates") h += templatesModal();
  if (m === "tplprev") h += tplPreviewModal();
  if (m === "tplsave") h += tplSaveModal();
  if (m === "newshow") h += `<div class="scrim" data-act="closemodal"><form class="modal" data-stop="1" data-form="newshow" role="dialog" aria-label="Start new show"><div class="modal-h"><span class="nico" style="--nc:var(--brand)">${ICON.plus}</span><h3>Start new show</h3><button type="button" class="ib" data-act="closemodal" aria-label="Close">${ICON.x}</button></div><div class="modal-b"><div class="wellbox">
    <label class="fld"><span>Show name</span><input class="inp" id="ns_name" placeholder="Client or campaign name" autocomplete="off"></label><label class="fld"><span>Client</span><input class="inp" id="ns_client" placeholder="Optional"></label>
    <div class="fld"><span>Tint</span><div class="swrow">${Object.entries(TINTS).map(([k, c], i) => `<button type="button" class="sw" data-act="pickns" data-k="${k}" aria-pressed="${(S.nsTint || "periwinkle") === k}" style="background:${c}" aria-label="${TINT_NAMES[k] || k}" title="${TINT_NAMES[k] || k}"></button>`).join("")}</div></div></div>
    <div class="fld"><span>Start from</span><div class="seg" style="justify-self:start"><button type="button" data-act="nsfrom" data-v="blank" aria-pressed="${(S.nsFrom || "full") === "blank"}">Empty canvas</button><button type="button" data-act="nsfrom" data-v="full" aria-pressed="${(S.nsFrom || "full") === "full"}">Full show template</button></div></div></div>
    <div class="modal-f"><button type="button" class="btn ghost" data-act="closemodal">Cancel</button><button class="btn primary">Create show</button></div></form></div>`;
  if (m === "settings" && show) h += `<div class="scrim" data-act="closemodal"><form class="modal" data-stop="1" data-form="settings" role="dialog" aria-label="Show settings"><div class="modal-h"><span class="nico" style="--nc:var(--muted)">${ICON.sliders}</span><h3>Show settings</h3><button type="button" class="ib" data-act="closemodal" aria-label="Close">${ICON.x}</button></div><div class="modal-b">
    <div class="wellbox"><div style="display:flex;gap:12px;align-items:center"><span class="av lg" id="st_av" style="--nc:${tintOf(show)}">${esc((show.name || "?")[0].toUpperCase())}</span><label class="fld" style="flex:1"><span>Show name</span><input class="inp" id="st_name" value="${esc(show.name)}" ${show.example ? "disabled" : ""}></label></div>
    <label class="fld"><span>Client</span><input class="inp" id="st_client" value="${esc(show.client || "")}" ${show.example ? "disabled" : ""}></label>
    <div class="fld"><span>Tint</span><div class="swrow">${Object.entries(TINTS).map(([k, c]) => `<button type="button" class="sw" data-act="picktint" data-k="${k}" aria-pressed="${show.tint === k}" style="background:${c}" aria-label="${TINT_NAMES[k] || k}" title="${TINT_NAMES[k] || k}" ${show.example ? "disabled" : ""}></button>`).join("")}</div></div></div>
    <div class="swrow" style="justify-content:space-between"><span class="muted" style="font-size:12.5px">Reuse this whole setup in other shows, or share it with your team.</span><button type="button" class="btn sm" data-act="tplsaveopen">${ICON.grid} Save as template</button></div>
    ${show.example ? `<p class="muted">This is the built-in example. Duplicate it to change settings.</p>` : `<details><summary class="muted" style="cursor:pointer">Delete this show</summary><div style="display:grid;gap:8px;margin-top:10px"><p class="muted">Deletes every node, thread and live page in “${esc(show.name)}” for everyone. This can't be undone.</p><button type="button" class="btn danger" style="justify-self:start" data-act="delshow">Delete show</button></div></details>`}</div>
    <div class="modal-f"><button type="button" class="btn ghost" data-act="closemodal">Close</button>${show.example ? "" : `<button class="btn primary">Save</button>`}</div></form></div>`;
  if (m === "share") { const here = Room.peers.filter(p => p.presence?.s === S.showId); h += `<div class="scrim" data-act="closemodal"><div class="modal" data-stop="1" role="dialog" aria-label="Invite your team"><div class="modal-h"><span class="nico" style="--nc:var(--brand)">${ICON.share}</span><h3>Work on shows together</h3><button class="ib" data-act="closemodal" aria-label="Close">${ICON.x}</button></div><div class="modal-b">
    <p>Everyone you share this Studio with sees the same shows, live: cursors on the canvas, who's looking at which node, threads and decisions.</p>
    <div class="wellbox"><b>To invite someone</b><span class="muted">Open the page's Share menu (top right of this artifact in Claude) and add them as Contributor or Editor. Viewers and commenters can look but not edit.</span></div>
    <div class="sec-h"><span>Here now</span></div><div style="display:grid;gap:4px"><div class="li">${People.avatar(Store.me.id)}<span class="t"><b>${esc(Store.me.name || "You")}</b><span>You</span></span></div>${here.map(p => `<div class="li">${People.avatar(p.by || p.peer)}<span class="t"><b>${esc(People.get(p.by).name)}</b><span>${p.presence?.v === "canvas" ? "On the canvas" : "In " + esc(p.presence?.v || "Studio")}</span></span></div>`).join("")}</div>
    ${Store.mode !== "db" ? `<p class="faint" style="font-size:12px">You're in offline mode, so shows are saved in this browser only. Open Studio in Claude to share with your team.</p>` : ""}</div><div class="modal-f"><button class="btn primary" data-act="closemodal">Done</button></div></div></div>`; }
  if (m === "order") { const n = S.nodes[S.sel]; h += `<div class="scrim" data-act="closemodal"><form class="modal" data-stop="1" data-form="order" role="dialog" aria-label="Ask our pros"><div class="modal-h"><span class="nico" style="--nc:#c3a0d8">${ICON.hand}</span><h3>Our pros do it</h3><button type="button" class="ib" data-act="closemodal" aria-label="Close">${ICON.x}</button></div><div class="modal-b">
    <p>A Webshow designer picks up <b>${esc(n?.title || "this block")}</b>, works on it in this same canvas, and hands back a new version for you to approve.</p>
    <div class="wellbox"><label class="fld"><span>What should be different?</span><textarea class="ta" id="ord_txt" placeholder="e.g. The page doesn't feel premium enough. Use our product photos and make the hero more dramatic."></textarea></label>
    <div class="fld"><span>Package</span><div class="seg" style="justify-self:start"><button type="button" data-act="ordpkg" data-v="element" aria-pressed="${(S.ordPkg || "element") === "element"}">This block · from €490</button><button type="button" data-act="ordpkg" data-v="season" aria-pressed="${S.ordPkg === "season"}">Whole campaign · €3,000</button></div></div></div>
    <p class="faint" style="font-size:12px">This sends a request thread to the Webshow team. No payment is taken in the prototype; checkout comes with Stripe in the alpha.</p></div>
    <div class="modal-f"><button type="button" class="btn ghost" data-act="closemodal">Cancel</button><button class="btn cta">Send request</button></div></form></div>`; }
  if (m === "confirmdel") h += `<div class="scrim" data-act="closemodal"><div class="modal" data-stop="1" role="dialog" aria-label="Delete show"><div class="modal-h"><h3>Delete “${esc(show?.name)}”?</h3></div><div class="modal-b"><p class="muted">Every node, thread and live page in this show is removed for everyone.</p></div><div class="modal-f"><button class="btn ghost" data-act="closemodal">Cancel</button><button class="btn" style="background:var(--bad);color:#fff;box-shadow:none" data-act="dodelshow">Delete show</button></div></div></div>`;
  h += conLayer();
  if (S.lib) h += libraryPop();
  if (S.preview) h += previewHTML();
  if (S.nodeEd && !S.preview) h += nodeEdHTML();
  L.innerHTML = h;
  if (S.preview) mountPreview();
  if (S.nodeEd && !S.preview) mountNE();
  if (S.lib) setTimeout(() => $("#libq")?.focus(), 0);
  if (m === "newshow") setTimeout(() => $("#ns_name")?.focus(), 0);
}
function libraryPop() {
  const q = (S.libq || "").toLowerCase(); const L = S.lib;
  const items = Object.entries(NT).filter(([k, d]) => !q || (d.label + d.desc).toLowerCase().includes(q));
  const soon = LIB_SOON.filter(x => !q || (x[1] + x[3]).toLowerCase().includes(q));
  const cat = (c, label) => { const it = items.filter(([, d]) => d.cat === c); return it.length ? `<h5>${label}</h5><div class="lib-grid">${it.map(([k, d]) => `<button class="lib-item" data-act="addnode" data-t="${k}"><span class="nico" style="--nc:${d.color}">${ICON[d.icon]}</span><span style="min-width:0"><b>${esc(d.label)}</b><span>${esc(d.desc)}</span></span></button>`).join("")}</div>` : ""; };
  const W = Math.min(560, innerWidth - 24); const x = Math.max(12, Math.min(L.sx, innerWidth - W - 12)); const y = Math.max(12, Math.min(L.sy, innerHeight - 440));
  return `<div class="scrim" style="background:transparent;display:block" data-act="closelib"><div class="pop lib" data-stop="1" style="left:${x}px;top:${y}px" role="dialog" aria-label="Add a node">
    <label class="sb-search" style="margin:0">${ICON.search}<input id="libq" placeholder="Search nodes…" value="${esc(S.libq || "")}" autocomplete="off"></label>
    ${NODE_GROUPS.map(([g, label]) => { const it = items.filter(([, d]) => d.grp === g); return it.length ? `<h5>${label}</h5><div class="lib-grid">${it.map(([k, d]) => `<button class="lib-item" data-act="addnode" data-t="${k}"><span class="nico" style="--nc:${d.color}">${ICON[d.icon]}</span><span style="min-width:0"><b>${esc(d.label)}</b><span>${esc(d.desc)}</span></span></button>`).join("")}</div>` : ""; }).join("")}
    ${soon.length ? `<h5>Coming to Webshow</h5><div class="lib-grid">${soon.map(([ic, l, tag, d]) => `<button class="lib-item" disabled title="${tag === "Pro" ? "Part of the Pro plan in the alpha" : "On the roadmap"}"><span class="nico" style="background:var(--bubble);color:var(--muted)">${ICON[ic]}</span><span style="min-width:0"><b>${esc(l)} <span class="pro">${tag}</span></b><span>${esc(d)}</span></span></button>`).join("")}</div>` : ""}
  </div></div>`;
}

/* ---------- popup runtime ---------- */
function mountPopups(host, overlays, { theme, preview, scroller, force, slug }) {
  const cleans = []; const shown = new Set();
  const V = preview ? previewViewport(host, scroller) : null; const layer = V ? V.el : host; if (V) cleans.push(V.clean);
  const show = (o) => {
    if (shown.has(o.id)) return; shown.add(o.id);
    if (!preview) { try { if (o.freq === "once" && localStorage.getItem("wp_once_" + o.id)) return; if (o.freq === "session" && sessionStorage.getItem("wp_s_" + o.id)) return; localStorage.setItem("wp_once_" + o.id, "1"); sessionStorage.setItem("wp_s_" + o.id, "1"); } catch {} }
    const ov = document.createElement("div"); ov.className = `wp-ov ${o.position}`; if (!preview) ov.style.position = "fixed"; ov.setAttribute("style", (ov.getAttribute("style") || "") + ";" + theme + ";" + (o.css || ""));
    ov.innerHTML = popupHTML(o);
    ov.addEventListener("click", (e) => { if (e.target === ov || e.target.closest(".x") || e.target.closest("[data-close]")) ov.remove(); });
    const f = ov.querySelector("form"); if (f) f.addEventListener("submit", async (e) => { e.preventDefault(); const em = f.querySelector("input").value.trim(); if (!/^\S+@\S+\.\S+$/.test(em)) { f.querySelector("input").style.borderColor = "#c62828"; return; } if (!preview && slug) { try { await Store.addLead(slug, { name: "", email: em, message: "Popup: " + o.headline }); } catch {} } f.querySelector("input").hidden = true; f.querySelector("button").hidden = true; f.querySelector(".ok").hidden = false; });
    layer.appendChild(ov);
  };
  overlays.filter(o => o.type === "chatbot" && (preview || popupActive(o))).forEach(o => cleans.push(mountChatbot(preview ? layer : document.body, o, { theme: theme + ";" + (o.css || ""), preview, slug })));
  overlays.filter(o => o.type === "cookie").forEach(o => cleans.push(mountCookie(preview ? layer : document.body, o, { theme: theme + ";" + (o.css || ""), preview, slug })));
  overlays.forEach(o => {
    if (o.type && o.type !== "popup") return;
    if (force === o.id) { show(o); return; }
    if (!popupActive(o)) return;
    if (o.trigger === "load") { const t = setTimeout(() => show(o), 600); cleans.push(() => clearTimeout(t)); }
    if (o.trigger === "delay") { const t = setTimeout(() => show(o), Math.max(1, +o.delay || 8) * 1000); cleans.push(() => clearTimeout(t)); }
    if (o.trigger === "scroll") { const sc = scroller || window; const fn = () => { const el = scroller || document.documentElement; const pct = (el.scrollTop) / Math.max(1, el.scrollHeight - el.clientHeight) * 100; if (pct >= (+o.scroll || 50)) show(o); }; sc.addEventListener("scroll", fn, { passive: true }); cleans.push(() => sc.removeEventListener("scroll", fn)); }
    if (o.trigger === "exit") { const target = preview ? host : document; const fn = (e) => { if (preview ? !host.contains(e.relatedTarget) : (e.clientY <= 0 || !e.relatedTarget)) show(o); }; target.addEventListener("mouseleave", fn); cleans.push(() => target.removeEventListener("mouseleave", fn)); if (!preview) { const t = setTimeout(() => {}, 0); cleans.push(() => clearTimeout(t)); } }
  });
  return () => cleans.forEach(f => f());
}

/* ---------- public page (#p-slug) ---------- */
function pubWindow(d) { const day = localISO(); if (d.from && day < d.from) return "soon"; if (d.until && day > d.until) return "ended"; return "live"; }
function publicView() {
  const p = S.pub;
  if (!p || p.loading) return `<div class="empty" style="margin-top:20vh">Loading…</div>`;
  const win = p.data ? pubWindow(p.data) : "live"; const mine0 = p.data && S.shows[p.data.showId];
  if (p.data && win !== "live" && !mine0) return `<div class="empty" style="margin-top:20vh"><h3>${win === "soon" ? `This page goes live on ${new Date(p.data.from + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" })}` : "This campaign has ended"}</h3><span>${win === "soon" ? "Come back then." : "Thanks for stopping by."}</span></div>`;
  if (!p.data) return `<div class="empty" style="margin-top:20vh"><h3>This page isn't live</h3><span>It may have been unpublished.</span><button class="btn" data-act="leavepublic">Open Webshow Studio</button></div>`;
  const mine = S.shows[p.data.showId];
  return `${mine ? `<div style="position:sticky;top:0;z-index:30;display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px max(16px,env(safe-area-inset-right,0px)) 8px max(16px,env(safe-area-inset-left,0px));background:#0a0b1b;color:#f4f8ff;font:13px var(--f-ui)"><span><span class="chip st-live"><i></i>Live</span> /${esc(p.slug)} · forms collect real leads</span><button class="btn sm" data-act="leavepublic">Back to Studio</button></div>` : ""}
  <div class="sp" id="publicpage" style="${p.data.theme}">${renderPage(p.data.page, { imgs: p.data.imgs, live: true, href: p.data.href || "" })}</div>`;
}
let pubCleanup = null;
function mountPublic() { pubCleanup?.(); const p = S.pub; if (!p?.data) return; document.title = p.data.seo?.title || "Webshow"; pubCleanup = mountPopups(document.body, p.data.overlays || [], { theme: p.data.theme, preview: false, slug: p.slug }); }
async function openPublic(slug) {
  S.view = "public"; S.pub = { slug, loading: true }; render();
  let data = null; try { data = await Store.getPublished(slug); } catch {}
  if (!data && slug === "kivi-sauna") { const ex = S.example || (S.example = exampleShow()); const pg = Object.values(ex.nodes).find(n => n.type === "page"); const save = [S.nodes, S.edges]; S.nodes = ex.nodes; S.edges = ex.edges; const v = pageValue(pg, .75); data = { slug, showId: "example", page: { sections: v.sections }, imgs: v.imgs, theme: v.theme, overlays: v.overlays, seo: { title: "Kivi Sauna Co." } }; [S.nodes, S.edges] = save; }
  S.pub = { slug, data }; render(); if (data && pubWindow(data) === "live") countVisitWithConsent(slug, data);
}
