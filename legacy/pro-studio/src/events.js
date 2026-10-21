/* ============================================================
   Events, actions, boot
   ============================================================ */
const selNode = () => S.nodes[S.sel];
function canvasCenterWorld() { const cv = $("#cv"); if (!cv) return [0, 0]; const r = cv.getBoundingClientRect(); return toWorld(r.left + r.width / 2 - 124, r.top + r.height / 3); }
function placeTemplate(k) {
  const tpl = TEMPLATES[k]; if (!tpl) return;
  if (cur() && S.view === "canvas" && Object.keys(S.nodes).length) { const b = bounds(); const g = instantiate(tpl.graph(), (b?.x1 || 0) + 160, b?.y0 || 0); addNodes(g.nodes, g.edges); paintAll(); fitSoon(); toast(tpl.name + " added"); return; }
  if (cur() && S.view === "canvas" && !isEx()) { const g = instantiate(tpl.graph()); addNodes(g.nodes, g.edges); paintAll(); fitSoon(); return; }
  const show = createShow({ name: tpl.name }); openShow(show.id); const g = instantiate(tpl.graph()); addNodes(g.nodes, g.edges); paintAll(); fitSoon();
}
function commitRename(v) {
  const s = cur(); const name = str(v); if (!s || s.example) return render();
  if (name && name !== s.name) { s.name = name.slice(0, 80); Store.putShow(s); toast("Show renamed"); }
  render();
}
const A = {
  rename(t) {
    const s = cur(); if (!s || s.example) return toast("Duplicate the example to rename it.");
    const inp = document.createElement("input"); inp.className = "inp tag-in"; inp.id = "renamein"; inp.value = s.name; inp.setAttribute("aria-label", "Show name"); inp.maxLength = 80;
    t.replaceWith(inp); inp.focus(); inp.select();
    inp.addEventListener("blur", () => { if (!inp.dataset.done) { inp.dataset.done = "1"; commitRename(inp.value); } });
  },
  home() { S.view = "home"; S.sbOpen = false; Room.set({ v: "home" }); render(); },
  threadsnav() { const here = S.view === "threads" && S.tfilter === "all"; S.thOpen = here ? !S.thOpen : true; lsSet("wss.thOpen", S.thOpen); if (here) return renderSidebarOnly(); A.view({ dataset: { v: "threads", f: "all" } }); },
  templates() { S.modal = "templates"; paintLayer(); },
  open(t) { S.sbOpen = false; openShow(t.dataset.id, t.dataset.v || "canvas"); },
  view(t) { S.view = t.dataset.v; if (t.dataset.f) { S.tfilter = t.dataset.f; S.thread = null; } S.sbOpen = false; Room.set({ v: S.view }); render(); },
  settings() { if (!cur()) return; S.modal = "settings"; paintLayer(); },
  share() { S.modal = "share"; paintLayer(); },
  newshow() { S.nsTint = Object.keys(TINTS)[Object.keys(S.shows).length % 7]; S.nsFrom = "full"; S.modal = "newshow"; paintLayer(); },
  sbtoggle() { if (innerWidth <= 860) { S.sbOpen = !S.sbOpen; } else S.sbHidden = !S.sbHidden; render(); },
  sbopen() { S.sbOpen = true; render(); }, sbclose() { S.sbOpen = false; render(); },
  theme() { const r = document.documentElement; const dark = r.dataset.theme ? r.dataset.theme === "dark" : !matchMedia("(prefers-color-scheme: light)").matches; r.dataset.theme = dark ? "light" : "dark"; lsSet("wss.theme", r.dataset.theme); if (S.view === "canvas" || S.view === "home") render(); },
  dupex() { duplicateExample(); },
  effort(t) { S.effort = t.dataset.v; $$('[data-act="effort"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.v === S.effort)); },
  homego() { const v = str($("#homeask")?.value); if (!v) return $("#homeask")?.focus(); showFromPrompt(v); },
  usetpl(t) { S.modal = null; placeTemplate(t.dataset.k); paintLayer(); },
  openthread(t) { const th = S.threads[t.dataset.id]; if (!th) return; S.keepUnread = null; S.thread = th.id; S.view = "threads"; if (S.tfilter !== "all" && th.status !== S.tfilter) S.tfilter = "all"; render(); },
  closethread() { S.thread = null; render(); },
  newthread() { const t = newThread("New thread"); S.thread = t.id; S.tfilter = "all"; render(); setTimeout(() => $("#tmsg")?.focus(), 30); },
  gonode(t) { const id = t.dataset.id; S.view = "canvas"; S.sel = id; S.inspTab = "settings"; S.insp = true; render(); requestAnimationFrame(() => centerOn(id)); },
  tstatus(t) { const th = S.threads[t.dataset.id]; th.status = th.status === "done" ? "open" : "done"; putThread(th); render(); },
  decide(t) { const m = t.dataset.m; const pick = $(`input[name="d_${m}"]:checked`)?.value; if (!pick) return toast("Pick an option first"); decide(t.dataset.t, m, pick, str($("#dx_" + m)?.value)); toast("Decision saved"); softRender(); },
  dismiss(t) { const th = S.threads[t.dataset.t]; const m = th.messages.find(x => x.id === t.dataset.m); m.picked = "Dismissed"; m.pickedBy = Store.me.id; th.status = th.messages.some(x => x.kind === "decision" && !x.picked) ? "needs" : "open"; putThread(th); softRender(); },
  closemodal(t, e) { if (e && t.classList.contains("scrim") && e.target !== t) return; S.modal = null; paintLayer(); },
  pickns(t) { S.nsTint = t.dataset.k; $$('[data-act="pickns"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.k === S.nsTint)); },
  nsfrom(t) { S.nsFrom = t.dataset.v; $$('[data-act="nsfrom"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.v === S.nsFrom)); },
  picktint(t) { const s = cur(); s.tint = t.dataset.k; Store.putShow(s); $$('[data-act="picktint"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.k === s.tint)); $("#st_av").style.setProperty("--nc", tintOf(s)); renderSidebarOnly(); },
  delshow() { S.modal = "confirmdel"; paintLayer(); },
  dodelshow() { S.modal = null; deleteShow(S.showId); },
  ordpkg(t) { S.ordPkg = t.dataset.v; $$('[data-act="ordpkg"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.v === S.ordPkg)); },
  closelib(t, e) { if (e && e.target !== t) return; S.lib = null; paintLayer(); },
  addnode(t) {
    const L = S.lib || {}; let wx = L.wx, wy = L.wy; if (wx == null) [wx, wy] = canvasCenterWorld();
    const n = addNode(t.dataset.t, wx, wy, { exact: !!L.dbl || !!L.wireFrom });
    if (L.wireFrom) { const inp = NT[n.type].inputs.find(i => i.t === L.wireFrom.t); if (inp) connect(L.wireFrom.node, L.wireFrom.port, n.id, inp.k); }
    S.lib = null; paintLayer(); paintWorld(); selectNode(n.id, "settings");
  },
  closepreview() { pvCleanup?.(); S.preview = null; paintLayer(); paintNode(S.sel); },
  pvdev(t) { S.preview.dev = t.dataset.v; S.preview.force = null; paintLayer(); },
  pvedit() { S.preview.edit = !S.preview.edit; S.preview.force = null; paintLayer(); },
  pvpop(t) { S.preview.force = t.dataset.id; S.preview.edit = false; paintLayer(); },
  leavepublic() { history.replaceState(null, "", location.pathname + location.search); pubCleanup?.(); S.view = S.showId ? "canvas" : "home"; document.title = "Webshow Studio"; render(); },
  exportkit() { saveFile(slugify(cur()?.name || "show") + "-campaign-kit.md", exportKit()); },
  copycsv() { const ls = S.live.leads; const rows = [["date", "page", "name", "email", "phone", "company", "preferred_date", "message"], ...ls.map(l => [new Date(l.at).toISOString(), l.slug, l.name, l.email, l.phone, l.company, l.date, l.message])]; copyText(rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n"), "CSV copied"); },
  tool(t) { S.tool = t.dataset.v; const cv = $("#cv"); cv.classList.toggle("hand", S.tool === "hand"); cv.classList.toggle("commenting", S.tool === "comment"); $$('.rail [data-act="tool"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.v === S.tool)); },
  openlib(t) { const r = (t && t.getBoundingClientRect) ? t.getBoundingClientRect() : { right: 80, top: 80 }; const [wx, wy] = canvasCenterWorld(); S.lib = { sx: r.right + 10, sy: r.top, wx, wy }; S.libq = ""; paintLayer(); },
  zoom(t) { const cv = $("#cv"); zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, S.vp.k * (+t.dataset.d > 0 ? 1.2 : 1 / 1.2)); },
  fit() { fit(); },
  insp() { S.insp = !S.insp; render(); },
  desel() { S.sel = null; Room.set({ sel: null }); paintWorld(); paintInspector(); if (innerWidth <= 760) { S.insp = false; render(); } },
  itab(t) { S.inspTab = t.dataset.v; S.inspFor = null; paintInspector(); },
  build() { const n = selNode(); if (n) buildNode(n); },
  approve() { const n = selNode(); n.status = "approved"; hist(n, "Approved"); commitNode(n); paintAll(); toast(n.title + " approved"); },
  unapprove() { const n = selNode(); n.status = "ready"; hist(n, "Approval removed"); commitNode(n); paintAll(); },
  preview() { const n = selNode(); if (n?.type === "page") { S.preview = { nodeId: n.id, dev: innerWidth < 700 ? "mobile" : "desktop" }; paintLayer(); } },
  previewpop() { const n = selNode(); const pg = pagesFeedingPopup(n)[0]; if (pg) { S.preview = { nodeId: pg.id, dev: "desktop", force: n.id }; paintLayer(); } },
  dupnode() { const n = selNode(); const c = clone(n); c.id = uid("n"); c.x += 40; c.y += 40; c.title += " copy"; c.hist = [{ at: now(), by: Store.me.id, note: "Duplicated from " + n.title }]; if (c.type === "publish") { c.p.live = false; c.p.slug = ""; } addNodes([c]); paintWorld(); selectNode(c.id); },
  delnode() { const n = selNode(); if (!n) return; if (n.type === "publish" && n.p.live) Store.unpublish(n.p.slug).catch(() => {}); delNode(n.id); Room.set({ sel: null }); paintAll(); toast("Node deleted"); },
  applyprop() { applyProposal(); },
  discardprop() { S.proposal = null; paintAsk(); },
  rewrite(t) { const n = selNode(); const how = t.dataset.t || str($("#rw_" + n.id)?.value); if (!how) return; rewriteText(n, how); },
  imgsrc(t) { const n = selNode(); n.p.source = t.dataset.v; commitNode(n); paintNode(n.id); S.inspFor = null; paintInspector(); },
  reroll() { const n = selNode(); n.p.seed = (n.p.seed || 0) + 1; n.p.motif = MOTIFS[(MOTIFS.indexOf(n.p.motif) + 1 + Math.floor(Math.random() * 3)) % MOTIFS.length]; hist(n, "New variation"); commitNode(n); paintAll(); },
  adjreset() { const n = selNode(); n.p.adj = { b: 100, c: 100, s: 100, w: 0, h: 0, blur: 0 }; n.p.fx = 50; n.p.fy = 50; commitNode(n); paintAll(); },
  describe() { describeImage(selNode()); },
  preset(t) { const n = selNode(); n.p.palette = PALETTES[t.dataset.k].c.slice(); hist(n, "Palette: " + PALETTES[t.dataset.k].label); commitNode(n); paintAll(); },
  extract() { extractPalette(selNode()); },
  secmove(t) { const n = selNode(); const i = +t.dataset.i, j = i + +t.dataset.d; const s = n.p.sections; [s[i], s[j]] = [s[j], s[i]]; hist(n, "Reordered sections"); commitNode(n); paintAll(); },
  sechide(t) { const n = selNode(); const s = n.p.sections[+t.dataset.i]; s.hidden = !s.hidden; commitNode(n); paintAll(); },
  secimg(t) { const n = selNode(); const s = n.p.sections[+t.dataset.i]; const c = G.up(n.id, "images").length || 1; s.visualId = "i" + ((+String(s.visualId).slice(1) + 1) % c); commitNode(n); paintAll(); },
  editself() { const n = selNode(); if (n.type === "page" && n.p.sections?.length) return A.preview(); $("#inspb")?.querySelector("input,textarea,select")?.focus(); },
  order() { S.ordPkg = "element"; S.modal = "order"; paintLayer(); },
  publish() { publishNode(selNode()); },
  unpublish() { unpublishNode(selNode()); },
  openlive() { location.hash = "p-" + selNode().p.slug; },
};

/* ---------- delegation ---------- */
document.addEventListener("click", (e) => {
  const go = e.target.closest(".sp [data-go]");
  if (go && !e.target.closest("[contenteditable]")) { e.preventDefault(); const sp = go.closest(".sp"); const tgt = go.dataset.go === "form" ? sp.querySelector('[data-anchor="form"]') : go.closest("section")?.nextElementSibling; tgt?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); return; }
  const t = e.target.closest("[data-act]"); if (!t || t.disabled) return;
  if (t.classList.contains("scrim") && e.target !== t) return;
  const fn = A[t.dataset.act]; if (fn) { if (t.tagName !== "LABEL") e.preventDefault(); fn(t, e); }
});
function keepFocus(id, fn) { const el = $("#" + id); const pos = el?.selectionStart; fn(); const n = $("#" + id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch {} } }
let editT;
document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.id === "findshow") { S.find = t.value; return keepFocus("findshow", renderSidebarOnly); }
  if (t.id === "tq") { S.tq = t.value; const b = $(".list-b"); if (b) { const q = S.tq.toLowerCase(); b.innerHTML = Object.values(S.threads).sort((a, c) => c.updatedAt - a.updatedAt).filter(x => (S.tfilter === "all" || x.status === S.tfilter) && (!q || (x.title + lastText(x)).toLowerCase().includes(q))).map(threadCard).join(""); } return; }
  if (t.id === "libq") { S.libq = t.value; return keepFocus("libq", paintLayer); }
  if (t.id === "homeask") { S.homeText = t.value; return; }
  if (t.id === "askin") { S.askText = t.value; t.style.height = "auto"; t.style.height = Math.min(140, t.scrollHeight) + "px"; return; }
  if (t.id === "tmsg_ai" || t.id === "ncmt_ai") { S.toAI = t.checked; return; }
  const n = selNode();
  if (t.dataset.title && n) { n.title = t.value; commitNode(n); const el = $(`#nodes .nd[data-id="${n.id}"] .nt`); if (el) el.textContent = t.value; const h = $("#insp .insp-h h3"); if (h) h.textContent = t.value; const nb = $(".ne .bar .title b"); if (nb) nb.textContent = t.value; return; }
  if (t.dataset.p && n) {
    let v = t.type === "checkbox" ? t.checked : t.type === "range" || t.type === "number" || t.dataset.p === "count" ? +t.value : t.value;
    set(n.p, t.dataset.p, v);
    if (t.type === "range") { const o = t.parentElement.querySelector("output"); if (o) o.textContent = t.value + (t.dataset.p.startsWith("f") ? "%" : t.dataset.p === "adj.h" ? "°" : t.dataset.p === "adj.blur" ? "px" : ""); }
    if (t.classList.contains("inp") && /headlines|descriptions/.test(t.dataset.p)) { const max = t.dataset.p.startsWith("head") ? 30 : 90; t.classList.toggle("warn", t.value.length > max); const c = t.parentElement.querySelector(".cnt"); if (c) { c.textContent = t.value.length; c.classList.toggle("over", t.value.length > max); } }
    commitNode(n); paintNode(n.id);
    if (n.type === "style" || n.type === "image") G.edgesFrom(n.id).forEach(ed => paintNode(ed.to));
    if (S.nodeEd) neAfterInput(t);
    return;
  }
  if (t.dataset.e && t.isContentEditable && S.preview) {
    const pn = S.nodes[S.preview.nodeId]; const [i, path] = t.dataset.e.split(":"); set(pn.p.sections[+i], path, t.textContent);
    clearTimeout(editT); editT = setTimeout(() => { hist(pn, "Text edited in preview"); commitNode(pn); }, 500);
  }
});
document.addEventListener("change", async (e) => {
  const t = e.target; const n = selNode();
  if (t.dataset.change === "upload" && t.files?.[0] && n) { toast("Uploading…"); try { const r = await Store.uploadImage(t.files[0]); n.p.src = r.src; n.p.assetId = r.assetId || ""; n.p.source = "upload"; if (!n.p.alt) n.p.alt = ""; n.title = n.title === "Image" ? t.files[0].name.replace(/\.[^.]+$/, "").slice(0, 40) : n.title; hist(n, "Uploaded an image"); commitNode(n); paintAll(); toast("Uploaded"); } catch (x) { console.warn(x); toast("Couldn't upload that image."); } }
  if (t.dataset.change === "assetup" && t.files?.length) {
    const b = Object.keys(S.nodes).length ? bounds() : null; let i = 0;
    for (const f of [...t.files].slice(0, 8)) { if (!f.type.startsWith("image/")) continue; try { const r = await Store.uploadImage(f); addNode("image", (b?.x0 || 0) - 340, (b?.y0 || 0) + i * 330, { title: f.name.replace(/\.[^.]+$/, "").slice(0, 40), p: { source: "upload", src: r.src, assetId: r.assetId || "" } }); i++; } catch { toast("Couldn't upload " + f.name); } }
    toast(`${i} image${i === 1 ? "" : "s"} added to the canvas`); render();
  }
  if (t.dataset.p && n && (t.tagName === "SELECT" || t.type === "checkbox" || t.type === "date")) { S.inspFor = null; paintInspector(); if (S.nodeEd) neRepaint(); }
});
document.addEventListener("submit", async (e) => {
  const f = e.target; const k = f.dataset.form;
  if (k) e.preventDefault();
  if (k === "ask") { const v = str($("#askin")?.value); if (v && !S.askBusy) askCanvas(v); return; }
  if (k === "tmsg") { const v = str($("#tmsg")?.value); const th = S.threads[S.thread]; if (!v || !th) return; if (th.title === "New thread" && !th.messages.length) th.title = v.slice(0, 60); sendInThread(th, v, $("#tmsg_ai")?.checked); return; }
  if (k === "ncmt") { const v = str($("#ncmt")?.value); const n = selNode(); if (!v || !n) return; const th = threadFor(n.id) || newThread(n.title, n.id); const ai = $("#ncmt_ai")?.checked; $("#ncmt").value = ""; await sendInThread(th, v, ai); paintWorld(); S.inspFor = null; paintInspector(); return; }
  if (k === "newshow") { const show = createShow({ name: str($("#ns_name").value, "Untitled show"), tint: S.nsTint, client: str($("#ns_client").value) }); S.modal = null; paintLayer(); openShow(show.id); if (S.nsFrom !== "blank") { const g = instantiate(TEMPLATES.full.graph()); g.nodes.find(n => n.type === "brief").p.business = show.name; addNodes(g.nodes, g.edges); paintAll(); fitSoon(); } return; }
  if (k === "settings") { const s = cur(); s.name = str($("#st_name").value, s.name); s.client = str($("#st_client").value); Store.putShow(s); S.modal = null; render(); toast("Saved"); return; }
  if (k === "order") { const n = selNode(); const txt = str($("#ord_txt").value); const th = newThread("Pro request: " + (n?.title || "campaign"), n?.id || null); th.messages.push({ id: uid("m"), by: Store.me.id, kind: "msg", text: `Requesting ${S.ordPkg === "season" ? "the whole campaign (Tuotantokausi, €3,000 + VAT)" : "a custom finish for this block (from €490 + VAT)"}.\n\n${txt || "No notes yet."}`, at: now() }, { id: uid("m"), by: "ai", kind: "ai", text: "Request logged for the Webshow team. A designer will reply here, work on the node in this canvas, and hand back a new version for you to approve.", at: now() }); putThread(th); S.modal = null; paintLayer(); toast("Request sent to the Webshow team"); softRender(); return; }
  if (f.classList.contains("fm")) {
    e.preventDefault(); const err = f.querySelector(".err"), ok = f.querySelector(".ok");
    if (f.dataset.live !== "1") { err.textContent = "Preview only. The form collects leads on the published page."; err.hidden = false; return; }
    const fd = Object.fromEntries(new FormData(f).entries());
    if (!str(fd.name) || !/^\S+@\S+\.\S+$/.test(str(fd.email))) { err.textContent = "Add your name and a valid email address."; err.hidden = false; return; }
    try { await Store.addLead(S.pub.slug, Object.fromEntries(Object.entries(fd).map(([a, b]) => [a, str(b).slice(0, 2000)]))); $$("label,button[type=submit]", f).forEach(x => (x.hidden = true)); err.hidden = true; ok.hidden = false; }
    catch { err.textContent = "Couldn't send just now. Try again."; err.hidden = false; }
  }
});
document.addEventListener("keydown", (e) => {
  if (e.target.id === "renamein") { const el = e.target; if (e.key === "Enter") { e.preventDefault(); if (!el.dataset.done) { el.dataset.done = "1"; commitRename(el.value); } } else if (e.key === "Escape") { e.preventDefault(); el.dataset.done = "1"; render(); } return; }
  const typing = e.target.matches?.("input,textarea,select,[contenteditable]");
  if (e.key === "Enter" && !e.shiftKey && ["askin", "homeask", "tmsg", "ncmt"].includes(e.target.id)) { e.preventDefault(); if (e.target.id === "homeask") return A.homego(); e.target.closest("form")?.requestSubmit(); return; }
  if (e.key === "Escape") { if (S.lib) { S.lib = null; return paintLayer(); } if (S.modal?.startsWith("consocial")) { S.modal = null; return paintLayer(); } if (S.preview) return A.closepreview(); if (S.nodeEd) { if (document.activeElement?.isContentEditable) return document.activeElement.blur(); return A.neclose(); } if (S.modal) { S.modal = null; return paintLayer(); } if (S.proposal) { S.proposal = null; return paintAsk(); } if (S.sel && S.view === "canvas") return A.desel(); }
  if (typing || S.view !== "canvas" || S.modal || S.preview || S.nodeEd) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d" && S.sel) { e.preventDefault(); return A.dupnode(); }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === "n") { e.preventDefault(); A.openlib($('.rail [data-act="openlib"]')); }
  if (k === "v" || k === "h" || k === "c") { const b = $(`.rail [data-v="${{ v: "select", h: "hand", c: "comment" }[k]}"]`); if (b) A.tool(b); }
  if (k === "f") fit();
  if ((e.key === "Delete" || e.key === "Backspace") && (S.sel || S.selEdge)) { e.preventDefault(); if (S.selEdge) { delEdge(S.selEdge); paintAll(); } else A.delnode(); }
  if (e.key === "Enter" && e.target.closest?.(".nd")) selectNode(e.target.closest(".nd").dataset.id);
});
window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (h.startsWith("p-")) openPublic(h.slice(2)); else if (S.view === "public") A.leavepublic(); });
window.addEventListener("resize", () => { if (S.view === "canvas") drawWires(); });

/* ---------- boot ---------- */
Promise.resolve().then(async function boot() {
  const th = lsGet("wss.theme", null); if (th) document.documentElement.dataset.theme = th;
  S.example = exampleShow(); S.shows = { example: S.example.show };
  S.showId = null; render();
  await Promise.all([Store.init(), AI.init(), (async () => { try { S.dl = window.claude?.use ? await claude.use("downloads") : null; } catch { S.dl = null; } })()]);
  Room.init(); Reads.load();
  Store.watchShows(list => {
    const keep = { example: S.example.show }; list.forEach(s => { if (s?.id) keep[s.id] = s; }); S.shows = keep;
    if (S.view === "home") render(); else renderSidebarOnly();
  });
  if (location.hash.startsWith("#p-")) openPublic(location.hash.slice(3));
  else render();
  if (!location.hash.startsWith("#p-")) loadConnectors();
  document.fonts?.ready?.then(() => { VCACHE.clear(); if (S.view === "canvas") paintWorld(); });
});
