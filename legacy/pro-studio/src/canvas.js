/* ============================================================
   Canvas: the node editor
   ============================================================ */
function canvasView() {
  return `<div class="cv ${S.tool === "hand" ? "hand" : ""} ${S.tool === "comment" ? "commenting" : ""}" id="cv">
    <div class="world" id="world"><svg class="wires" id="wires" width="1" height="1"></svg><div id="nodes"></div><div id="cursors"></div></div>
    <div class="cv-empty" id="cvempty" hidden></div>
    <div class="rail" role="toolbar" aria-label="Canvas tools">
      <button class="ib" data-act="tool" data-v="select" aria-pressed="${S.tool === "select"}" title="Select (V)" aria-label="Select">${ICON.cursor}</button>
      <button class="ib" data-act="tool" data-v="hand" aria-pressed="${S.tool === "hand"}" title="Pan (H)" aria-label="Pan">${ICON.hand}</button>
      <button class="ib" data-act="tool" data-v="comment" aria-pressed="${S.tool === "comment"}" title="Comment (C)" aria-label="Comment">${ICON.comment}</button>
      <hr><button class="ib" data-act="openlib" title="Add node (N)" aria-label="Add node">${ICON.plus}</button>
      <button class="ib" data-act="templates" title="Templates" aria-label="Templates">${ICON.grid}</button>
    </div>
    <div class="zoomer"><button class="ib" data-act="zoom" data-d="-1" aria-label="Zoom out">${ICON.minus}</button><span id="zpct">${Math.round(S.vp.k * 100)}%</span><button class="ib" data-act="zoom" data-d="1" aria-label="Zoom in">${ICON.plus}</button><button class="ib" data-act="fit" aria-label="Fit to view">${ICON.fit}</button></div>
    <div class="askbar" id="askbar"></div>
  </div>
  ${S.insp ? `<aside class="insp" id="insp"></aside>` : ""}`;
}
function mountCanvas() {
  paintWorld(); paintAsk(); paintInspector();
  if (S.vpFor !== S.showId) { S.vpFor = S.showId; requestAnimationFrame(fit); } else applyVp();
  bindCanvas();
}
function applyVp() { const w = $("#world"); if (w) w.style.transform = `translate(${S.vp.x}px,${S.vp.y}px) scale(${S.vp.k})`; const z = $("#zpct"); if (z) z.textContent = Math.round(S.vp.k * 100) + "%"; paintCursors(); }
function bounds() {
  const els = $$("#nodes .nd"); const all = Object.values(S.nodes); if (!all.length) return null;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  all.forEach(n => { const el = els.find(e => e.dataset.id === n.id); const w = el?.offsetWidth || 248, h = el?.offsetHeight || 220; x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + w); y1 = Math.max(y1, n.y + h); });
  return { x0, y0, x1, y1 };
}
function fit() {
  const cv = $("#cv"); if (!cv) return; const b = bounds();
  if (!b) { S.vp = { x: cv.clientWidth / 2 - 124, y: cv.clientHeight / 3, k: 1 }; return applyVp(); }
  const W = cv.clientWidth, H = cv.clientHeight - 90, pad = 48;
  const k = Math.min(1.1, Math.max(.2, Math.min((W - pad * 2) / (b.x1 - b.x0), (H - pad * 2) / (b.y1 - b.y0))));
  S.vp = { k, x: (W - (b.x1 - b.x0) * k) / 2 - b.x0 * k, y: pad + (H - pad * 2 - (b.y1 - b.y0) * k) / 2 - b.y0 * k }; applyVp();
}
function fitSoon() { S.vpFor = null; setTimeout(() => { if (S.view === "canvas") { S.vpFor = S.showId; fit(); } }, 60); }
function zoomAt(mx, my, k) {
  k = Math.min(2, Math.max(.2, k)); const wx = (mx - S.vp.x) / S.vp.k, wy = (my - S.vp.y) / S.vp.k;
  S.vp = { k, x: mx - wx * k, y: my - wy * k }; applyVp();
}
function toWorld(cx, cy) { const r = $("#cv").getBoundingClientRect(); return [(cx - r.left - S.vp.x) / S.vp.k, (cy - r.top - S.vp.y) / S.vp.k]; }

/* ---------- painting ---------- */
/* an output is active when it is actually running: page live, ads launched, posts going out */
function outputActive(n) {
  const day = localISO(); const inW = (p) => (!p.start || day >= p.start) && (!p.end || day <= p.end);
  if (n.type === "publish") return !!n.p.live && inW(n.p);
  if (n.type === "adchannel") return !!n.p.launched && (n.p.platforms || []).some(conOn) && inW(n.p);
  if (n.type === "social") { const acc = (n.p.accounts || []).filter(conOn); const posts = G.up(n.id, "posts").flatMap(u => u.p.posts || []); return acc.length > 0 && posts.some(p => p.at > Date.now() - 14 * 864e5); }
  return false;
}
function nodeHTML(n) {
  const d = NT[n.type]; if (!d) return "";
  const t = threadFor(n.id); const cc = t ? t.messages.length : 0; const cu = t ? Reads.unread(t) : 0;
  const peers = Room.peers.filter(p => p.presence?.s === S.showId && p.presence?.sel === n.id);
  const portRow = (pdef, dir) => { const on = dir === "in" ? G.edgesTo(n.id, pdef.k).length : G.edgesFrom(n.id).some(e => e.fromPort === pdef.k); return `<div class="prow ${dir}"><span class="port ${dir} ${on ? "on" : ""}" data-node="${n.id}" data-port="${pdef.k}" data-t="${pdef.t}" data-dir="${dir}" style="--pc:var(--pt-${pdef.t})" title="${PT_LABEL[pdef.t]}${pdef.multi ? " · many" : ""}"></span>${esc(pdef.label)}${pdef.multi && on ? ` <span class="faint">&nbsp;${on}</span>` : ""}</div>`; };
  const oc = d.cat === "output" ? (outputActive(n) ? "out on" : "out off") : d.cat === "block" ? "blk" : "";
  return `<div class="nd ${d.wide ? "wide" : ""} ${oc}" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px;--nc:${d.color}" ${d.cat === "output" ? `title="${outputActive(n) ? "Active" : "Not active yet"}"` : ""} aria-selected="${S.sel === n.id}" tabindex="0" role="group" aria-label="${esc(d.label)}: ${esc(n.title)}">
    ${cu ? `<span class="ncount" title="${cu} unread comment${cu > 1 ? "s" : ""}">${cu}</span>` : ""}
    ${peers.map(p => { const pp = People.get(p.by); return `<div class="peer-ring" style="--pc:${pp.color}"><b>${esc(pp.name)}</b></div>`; }).join("")}
    <div class="nh" data-drag="1"><span class="nico" style="--nc:${d.color}">${ICON[d.icon]}</span><span class="ty">${esc(d.label)}</span>${nodeStatus(n)}</div>
    <div class="nt" data-drag="1">${esc(n.title)}</div>
    <div class="nb" data-drag="1">${nodeBody(n)}</div>
    ${d.inputs.length || d.outputs.length ? `<div class="nports">${d.inputs.map(p => portRow(p, "in")).join("")}${d.outputs.map(p => portRow(p, "out")).join("")}</div>` : `<div style="height:10px"></div>`}
  </div>`;
}
function paintWorld() {
  const box = $("#nodes"); if (!box) return;
  box.innerHTML = Object.values(S.nodes).map(nodeHTML).join("");
  drawWires(); paintEmpty(); paintCursors(); renderSidebarOnly();
}
function paintNode(id) {
  const el = $(`#nodes .nd[data-id="${id}"]`); const n = S.nodes[id]; if (!el || !n) return paintWorld();
  const tmp = document.createElement("div"); tmp.innerHTML = nodeHTML(n); el.replaceWith(tmp.firstElementChild); drawWires();
}
function paintAll() { if (S.view !== "canvas") { renderSidebarOnly(); return; } paintWorld(); paintInspector(); }
function portPos(nodeId, port, dir) {
  const el = $(`#nodes .port[data-node="${nodeId}"][data-port="${port}"][data-dir="${dir}"]`); const n = S.nodes[nodeId];
  if (!el || !n) return null; let x = el.offsetWidth / 2, y = el.offsetHeight / 2, e = el;
  while (e && !e.classList.contains("nd")) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
  return [n.x + x, n.y + y];
}
const curve = (a, b) => { const dx = Math.max(60, Math.abs(b[0] - a[0]) * .5); return `M${a[0]} ${a[1]} C${a[0] + dx} ${a[1]},${b[0] - dx} ${b[1]},${b[0]} ${b[1]}`; };
function drawWires(ghost) {
  const svg = $("#wires"); if (!svg) return;
  const building = new Set(Object.values(S.nodes).filter(n => n.status === "building").map(n => n.id));
  let h = "";
  Object.values(S.edges).forEach(e => {
    const a = portPos(e.from, e.fromPort, "out"), b = portPos(e.to, e.toPort, "in"); if (!a || !b) return;
    const t = G.outDef(S.nodes[e.from], e.fromPort)?.t || "text"; const d = curve(a, b);
    h += `<path class="hit" data-edge="${e.id}" d="${d}"/><path d="${d}" data-edge="${e.id}" class="${S.selEdge === e.id ? "sel" : ""} ${building.has(e.to) ? "flow" : ""}" style="stroke:var(--pt-${t});opacity:${S.selEdge && S.selEdge !== e.id ? .5 : .9}"/>`;
  });
  if (ghost) h += `<path d="${curve(ghost.a, ghost.b)}" style="stroke:var(--pt-${ghost.t});stroke-dasharray:5 5;pointer-events:none"/>`;
  svg.innerHTML = h;
}
function paintEmpty() {
  const e = $("#cvempty"); if (!e) return; const empty = !Object.keys(S.nodes).length;
  e.hidden = !empty;
  if (empty) e.innerHTML = `<div class="empty" style="max-width:520px"><h3>An empty stage</h3><span>Add nodes with <b>N</b>, start from a template, or tell Showrunner what you need below.</span><div class="sugg" style="width:100%;margin-top:8px">${["full", "pagepop", "carousel"].map(k => `<button data-act="usetpl" data-k="${k}"><b>${esc(TEMPLATES[k].name)}</b><span>${esc(TEMPLATES[k].desc.split(".")[0])}.</span></button>`).join("")}</div></div>`;
}
function paintCursors() {
  const box = $("#cursors"); if (!box) return;
  const ps = Room.peers.filter(p => p.presence?.s === S.showId && p.presence?.v === "canvas" && Array.isArray(p.presence?.c));
  box.innerHTML = ps.map(p => { const pp = People.get(p.by); const [x, y] = p.presence.c; return `<div class="cursor" style="transform:translate(${x}px,${y}px) scale(${1 / S.vp.k});transform-origin:0 0"><svg viewBox="0 0 18 18"><path d="M2 2l5.5 14 2-6 6-2z" fill="${pp.color}" stroke="#fff" stroke-width="1.2"/></svg><b style="background:${pp.color}">${esc(pp.name)}</b></div>`; }).join("");
}
function paintAsk() {
  const el = $("#askbar"); if (!el) return; const pr = S.proposal;
  el.innerHTML = `${pr ? `<div class="proposal"><div style="display:flex;gap:8px;align-items:center"><span class="nico" style="--nc:var(--brand)">${ICON.sparkle}</span><b style="flex:1">${esc(pr.summary)}</b></div>${pr.ops.length ? `<ol>${pr.ops.map(o => `<li>${opLabel(o)}</li>`).join("")}</ol><div class="swrow"><button class="btn primary sm" data-act="applyprop">Apply ${pr.ops.length} change${pr.ops.length > 1 ? "s" : ""}</button><button class="btn sm ghost" data-act="discardprop">Discard</button></div>` : `<button class="btn sm ghost" data-act="discardprop" style="justify-self:start">OK</button>`}</div>` : ""}
  <form class="composer" data-form="ask"><textarea id="askin" rows="1" placeholder="${S.askBusy ? "Showrunner is planning…" : (innerWidth <= 760 ? "Ask Showrunner…" : "Ask Showrunner to add, change or build something")}" ${S.askBusy ? "disabled" : ""}>${esc(S.askText)}</textarea>
  <div class="cbar">${effortSeg()}<span class="grow"></span>${S.askBusy ? `<span class="chip st-building ty-chip" role="status"><span class="tdots sm" aria-hidden="true"><i></i><i></i><i></i></span>Showrunner is working…</span>` : ""}<button class="send" aria-label="Ask Showrunner" ${S.askBusy ? "disabled" : ""}>${ICON.send}</button></div></form>`;
}
function paintInspector() {
  const el = $("#insp"); if (!el) return;
  if (el.contains(document.activeElement) && document.activeElement.matches("input,textarea,select") && S.inspFor === S.sel) return;
  S.inspFor = S.sel;
  const n = S.nodes[S.sel];
  if (!n) {
    const all = Object.values(S.nodes); const needs = Object.values(S.threads).filter(t => t.status === "needs");
    el.innerHTML = `<div class="insp-h"><div class="r"><h3>${esc(cur()?.name || "Show")}</h3></div><div style="height:8px"></div></div><div class="insp-b">
      <div class="grp"><h4>On this canvas</h4>${["content", "block", "output"].map(c => { const ns = all.filter(x => NT[x.type]?.cat === c); return ns.length ? ns.map(x => `<button class="li" data-act="gonode" data-id="${x.id}" style="padding:4px 6px"><span class="nico" style="--nc:${NT[x.type].color}">${ICON[NT[x.type].icon]}</span><span class="t"><b style="font-weight:500">${esc(x.title)}</b></span>${nodeStatus(x)}</button>`).join("") : ""; }).join("") || `<p class="muted">No nodes yet.</p>`}</div>
      ${needs.length ? `<div class="grp"><h4>Needs you</h4>${needs.map(t => `<button class="li" data-act="openthread" data-id="${t.id}"><span class="t"><b>${esc(t.title)}</b><span>${esc(S.nodes[t.nodeId]?.title || "Decision waiting")}</span></span><span class="go">Answer →</span></button>`).join("")}</div>` : ""}
      <div class="grp"><h4>Wire types</h4><div class="swrow">${Object.entries(PT_LABEL).map(([k, l]) => `<span class="chip"><i style="background:var(--pt-${k})"></i>${l}</span>`).join("")}</div><small class="faint">Drag from an output dot on the right of a node to a matching input on the left. Inputs that can't take the wire dim while you drag.</small></div>
    </div>`;
    return;
  }
  const d = NT[n.type]; const t = threadFor(n.id);
  if (t && S.inspTab === "comments") Reads.seen(t);
  const cu = t ? Reads.unread(t) : 0;
  const tabs = [["settings", "Settings"], ["comments", `Comments${t ? " " + t.messages.length : ""}${cu ? ` <span class="newdot" aria-label="${cu} unread"></span>` : ""}`], ["activity", "Activity"]];
  let body = "";
  if (S.inspTab === "settings") body = `<label class="fld"><span>Title</span><input class="inp" id="ntitle_${n.id}" data-title="1" value="${esc(n.title)}"></label>${inspectorBody(n)}`;
  else if (S.inspTab === "comments") body = `${t ? t.messages.map(m => msgView(t, m)).join("") + (S.typing.has(t.id) ? typingHTML() : "") : `<p class="muted">No comments on this node yet. Start one for your team or ask Showrunner about it.</p>`}`;
  else body = `<div class="hist">${(n.hist || []).map(h => `<div><time>${ago(h.at)}</time><span>${People.avatar(h.by).replace('class="uav"', 'class="uav" style="width:16px;height:16px;font-size:8px;display:inline-grid;vertical-align:-3px"')} ${esc(People.get(h.by).name)}: ${esc(h.note)}</span></div>`).join("")}</div>`;
  const block = BUILDABLE.has(n.type);
  el.innerHTML = `<div class="insp-h"><div class="r"><span class="nico" style="--nc:${d.color}">${ICON[d.icon]}</span><h3>${esc(n.title)}</h3><button class="ib" data-act="desel" aria-label="Close">${ICON.x}</button></div>
    <div class="r" style="flex-wrap:wrap">${nodeStatus(n)}<span class="faint" style="font-size:12px">${esc(d.label)} · edited ${ago(n.updatedAt)}${n.by && n.by !== Store.me.id ? " by " + esc(People.get(n.by).name) : ""}</span></div>
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-act="itab" data-v="${k}" aria-selected="${S.inspTab === k}">${l}</button>`).join("")}</div></div>
    <div class="insp-b" id="inspb">${body}</div>
    ${S.inspTab === "comments" ? `<div class="insp-f" style="display:block">${composerHTML("ncmt", "Comment, or ask Showrunner about this node…", true)}</div>`
      : `<div class="insp-f">${block ? `<button class="btn primary" data-act="build" ${n.status === "building" ? "disabled" : ""}>${ICON.sparkle} ${n.builtAt ? "Rebuild" : "Build"}</button>` : ""}${block && n.builtAt ? (n.status === "approved" ? `<button class="btn" data-act="unapprove">${ICON.check} Approved</button>` : `<button class="btn" data-act="approve">${ICON.check} Approve</button>`) : ""}<button class="btn" data-act="openeditor" data-id="${n.id}" title="Open the editor (double-click the node)">${ICON.fit} Editor</button>${n.type === "page" && n.p.sections?.length ? `<button class="ib" data-act="preview" aria-label="Preview" title="Preview">${ICON.eye}</button>` : ""}<span style="flex:1"></span><button class="ib" data-act="dupnode" aria-label="Duplicate node" title="Duplicate">${ICON.copy}</button><button class="ib" data-act="delnode" aria-label="Delete node" title="Delete">${ICON.trash}</button></div>`}`;
}

/* ---------- canvas pointer handling ---------- */
function bindCanvas() {
  const cv = $("#cv"); if (!cv) return;
  let drag = null; const pts = new Map(); let pinch = null; let moveRaf = 0;
  cv.onpointerdown = (e) => {
    if (e.target.closest(".rail,.zoomer,.askbar,.cv-empty .empty")) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: S.vp.k }; drag = null; return; }
    const port = e.target.closest(".port"); const nd = e.target.closest(".nd"); const edge = e.target.closest("path[data-edge]");
    if (port && S.tool === "select") {
      e.preventDefault(); const nid = port.dataset.node, pk = port.dataset.port, dir = port.dataset.dir, t = port.dataset.t;
      if (dir === "in") { const ex = G.edgesTo(nid, pk).at(-1); if (!ex) return; delEdge(ex.id); drag = { kind: "wire", from: ex.from, fromPort: ex.fromPort, t }; }
      else drag = { kind: "wire", from: nid, fromPort: pk, t };
      $$("#nodes .port").forEach(p => { const ok = p.dataset.dir === "in" && p.dataset.t === drag.t && p.dataset.node !== drag.from; p.classList.toggle("dim", !ok); p.classList.toggle("hot", false); });
      cv.setPointerCapture(e.pointerId); return;
    }
    if (edge && S.tool === "select") { S.selEdge = edge.dataset.edge; S.sel = null; drawWires(); paintInspector(); return; }
    if (nd && S.tool === "comment") { selectNode(nd.dataset.id, "comments"); S.tool = "select"; cv.classList.remove("commenting"); $$(".rail .ib").forEach(b => b.getAttribute("data-v") && b.setAttribute("aria-pressed", b.dataset.v === "select")); setTimeout(() => $("#ncmt")?.focus(), 50); return; }
    if (nd && S.tool === "select" && e.target.closest("[data-drag]")) {
      const n = S.nodes[nd.dataset.id]; drag = { kind: "node", id: n.id, el: nd, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, moved: false }; cv.setPointerCapture(e.pointerId); return;
    }
    if (nd) return;
    drag = { kind: "pan", sx: e.clientX, sy: e.clientY, ox: S.vp.x, oy: S.vp.y, moved: false }; cv.classList.add("panning"); cv.setPointerCapture(e.pointerId);
  };
  cv.onpointermove = (e) => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!moveRaf && Room.room) { const cx = e.clientX, cy = e.clientY; moveRaf = requestAnimationFrame(() => { moveRaf = 0; const [wx, wy] = toWorld(cx, cy); Room.set({ c: [Math.round(wx), Math.round(wy)] }); }); }
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; const r = cv.getBoundingClientRect(); zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, pinch.k * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d); return; }
    if (!drag) return;
    if (drag.kind === "pan") { const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true; S.vp.x = drag.ox + dx; S.vp.y = drag.oy + dy; applyVp(); }
    else if (drag.kind === "node") { const dx = (e.clientX - drag.sx) / S.vp.k, dy = (e.clientY - drag.sy) / S.vp.k; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true; if (!drag.moved) return; const n = S.nodes[drag.id]; n.x = Math.round(drag.ox + dx); n.y = Math.round(drag.oy + dy); drag.el.style.left = n.x + "px"; drag.el.style.top = n.y + "px"; S.dirty.add(n.id); drawWires(); }
    else if (drag.kind === "wire") {
      const a = portPos(drag.from, drag.fromPort, "out"); const b = toWorld(e.clientX, e.clientY);
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest(".port"); $$("#nodes .port.hot").forEach(p => p.classList.remove("hot")); if (over && !over.classList.contains("dim") && over.dataset.dir === "in") over.classList.add("hot");
      drawWires({ a, b, t: drag.t });
    }
  };
  let lastTap = null;
  const end = (e) => {
    pts.delete(e.pointerId); if (pts.size < 2) pinch = null; cv.classList.remove("panning");
    if (!drag) return; const d = drag; drag = null;
    if (d.kind === "pan" && !d.moved) { if (S.sel || S.selEdge) { S.sel = null; S.selEdge = null; Room.set({ sel: null }); paintWorld(); paintInspector(); } }
    if (d.kind === "node") { if (d.moved) { const n = S.nodes[d.id]; commitNode(n, 0); lastTap = null; } else { const dbl = lastTap && lastTap.id === d.id && Date.now() - lastTap.t < 400; lastTap = dbl ? null : { id: d.id, t: Date.now() }; if (dbl) return openNodeEditor(d.id); selectNode(d.id); } }
    if (d.kind === "wire") {
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest(".port");
      $$("#nodes .port").forEach(p => p.classList.remove("dim", "hot"));
      if (over && over.dataset.dir === "in" && over.dataset.t === d.t) { const ed = connect(d.from, d.fromPort, over.dataset.node, over.dataset.port); if (ed) { const tn = S.nodes[ed.to]; hist(tn, `Wired from “${S.nodes[d.from].title}”`); commitNode(tn); } }
      else if (!over) { const [wx, wy] = toWorld(e.clientX, e.clientY); S.lib = { sx: e.clientX, sy: e.clientY, wx, wy, wireFrom: { node: d.from, port: d.fromPort, t: d.t } }; S.libq = ""; paintLayer(); }
      paintWorld(); paintInspector();
    }
  };
  cv.onpointerup = end; cv.onpointercancel = end;
  cv.onwheel = (e) => { if (e.target.closest(".askbar,.proposal")) return; e.preventDefault(); const r = cv.getBoundingClientRect(); if (e.ctrlKey || e.metaKey) zoomAt(e.clientX - r.left, e.clientY - r.top, S.vp.k * Math.exp(-e.deltaY * .01)); else { S.vp.x -= e.deltaX; S.vp.y -= e.deltaY; applyVp(); } };
  cv.ondblclick = (e) => { if (S.nodeEd || S.preview) return; const hit = document.elementFromPoint(e.clientX, e.clientY) || e.target; const nd = hit.closest(".nd"); if (nd) { if (!hit.closest(".port,input,textarea,button")) { e.preventDefault(); openNodeEditor(nd.dataset.id); } return; } if (e.target.closest(".nd,.rail,.zoomer,.askbar")) return; const [wx, wy] = toWorld(e.clientX, e.clientY); S.lib = { sx: e.clientX, sy: e.clientY, wx, wy, dbl: true }; S.libq = ""; paintLayer(); };
  cv.onpointerleave = () => Room.set({ c: null });
}
function selectNode(id, tab) {
  S.sel = id; S.selEdge = null; S.inspTab = tab || (S.inspTab === "comments" && !tab ? "settings" : S.inspTab); if (tab) S.inspTab = tab;
  if (!S.insp) { S.insp = true; render(); } else { $$("#nodes .nd").forEach(el => el.setAttribute("aria-selected", el.dataset.id === id)); drawWires(); S.inspFor = null; paintInspector(); }
  Room.set({ sel: id });
}
function centerOn(id) {
  const n = S.nodes[id]; const cv = $("#cv"); if (!n || !cv) return;
  S.vp.k = Math.max(S.vp.k, .7); S.vp.x = cv.clientWidth / 2 - (n.x + 140) * S.vp.k; S.vp.y = cv.clientHeight / 2.6 - (n.y + 100) * S.vp.k; applyVp();
}
