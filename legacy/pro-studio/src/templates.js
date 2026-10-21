/* ============================================================
   Template library: Webshow picks, your saved templates and
   community templates, with performance, preview and copy
   ============================================================ */
Object.assign(TEMPLATES.full, { perf: { visits: 4820, leads: 312, ads: { imp: 98400, clicks: 2140, spend: 2620 } } });
Object.assign(TEMPLATES.pagepop, { perf: { visits: 2310, leads: 188 } });
Object.assign(TEMPLATES.carousel, { perf: { ads: { imp: 41200, clicks: 690, spend: 0 } } });
Object.assign(TEMPLATES.search, { perf: { ads: { imp: 23800, clicks: 1010, spend: 1240 } } });
Object.assign(TEMPLATES.leadpop, { perf: { visits: 1640, leads: 141 } });

S.tplTab = "picks"; S.tplStore = null; S.tplPrev = null;
const builtinTpl = (k) => ({ src: "builtin", id: k, name: TEMPLATES[k].name, desc: TEMPLATES[k].desc, author: "Webshow", perf: TEMPLATES[k].perf || null, perfKind: "example", graph: TEMPLATES[k].graph() });
async function loadTemplates(force) {
  if (S.tplStore && !force) return;
  try { S.tplStore = (await Store.listDocs("templates")).filter(t => t?.graph?.nodes); } catch { S.tplStore = []; }
  if (S.modal === "templates") paintLayer();
}
function tplList(tab) {
  if (tab === "picks") return Object.keys(TEMPLATES).map(builtinTpl);
  const all = (S.tplStore || []).map(t => ({ ...t, src: "store", author: t.byName || "Teammate", perfKind: t.perf?.ads?.demo ? "mixed" : "real" }));
  if (tab === "mine") return all.filter(t => t.by === Store.me.id).sort((a, b) => b.createdAt - a.createdAt);
  return all.filter(t => t.community).sort((a, b) => (b.uses || 0) - (a.uses || 0) || b.createdAt - a.createdAt);
}

/* ---------- mini map of a template graph ---------- */
function miniMap(g, W = 280, H = 120) {
  const ns = g.nodes; if (!ns.length) return "";
  const w = (n) => (NT[n.type]?.wide ? 300 : 240), h = 170;
  const x0 = Math.min(...ns.map(n => n.x)), y0 = Math.min(...ns.map(n => n.y)), x1 = Math.max(...ns.map(n => n.x + w(n))), y1 = Math.max(...ns.map(n => n.y + h));
  const k = Math.min((W - 16) / (x1 - x0), (H - 16) / (y1 - y0)); const ox = (W - (x1 - x0) * k) / 2, oy = (H - (y1 - y0) * k) / 2;
  const P = (x, y) => [ox + (x - x0) * k, oy + (y - y0) * k]; const byRef = Object.fromEntries(ns.map(n => [n.ref, n]));
  const wires = g.edges.map(([f, , t]) => { const a = byRef[f], b = byRef[t]; if (!a || !b) return ""; const [ax, ay] = P(a.x + w(a), a.y + h / 2), [bx, by] = P(b.x, b.y + h / 2); const dx = Math.max(12, (bx - ax) / 2); return `<path d="M${ax} ${ay}C${ax + dx} ${ay} ${bx - dx} ${by} ${bx} ${by}" />`; }).join("");
  const boxes = ns.map(n => { const [x, y] = P(n.x, n.y); const c = NT[n.type]?.color || "#a3a9bf"; return `<rect x="${x}" y="${y}" width="${w(n) * k}" height="${h * k}" rx="${Math.max(2, 8 * k)}" style="fill:color-mix(in srgb,${c} 24%,var(--raised));stroke:color-mix(in srgb,${c} 60%,transparent)"/>`; }).join("");
  return `<svg class="mmap" viewBox="0 0 ${W} ${H}" role="img" aria-label="Node map with ${ns.length} nodes"><g class="mw">${wires}</g>${boxes}</svg>`;
}
function perfHTML(t, big) {
  const p = t.perf; if (!p || (!p.visits && !p.leads && !p.ads)) return `<p class="muted" style="font-size:12px">${t.src === "store" ? "No results yet: the show wasn't live when this was saved." : "No results yet."}</p>`;
  const conv = p.visits ? (p.leads / p.visits) : null; const a = p.ads;
  const items = [p.visits != null && ["Page visits", num(p.visits)], p.leads != null && ["Leads", num(p.leads)], conv != null && ["Conversion", pct(conv)], a && ["Ad clicks", num(a.clicks)], a && a.imp && ["CTR", pct(a.clicks / a.imp)], a && a.spend && p.leads && ["Cost per lead", eur(a.spend / p.leads)]].filter(Boolean);
  const label = t.perfKind === "example" ? "Example numbers" : t.perfKind === "mixed" ? "Real leads · sample ad data" : "Real results";
  return `<div class="tperf ${big ? "big" : ""}">${items.slice(0, big ? 6 : 3).map(([l, v]) => `<span><b>${v}</b>${l}</span>`).join("")}</div><small class="faint">${label}${t.perf?.at ? " · saved " + ago(t.perf.at) : ""}</small>`;
}

/* ---------- library modal ---------- */
function templatesModal() {
  if (S.tplTab !== "picks") loadTemplates();
  const list = tplList(S.tplTab); const show = cur();
  const tabs = [["picks", "Webshow picks"], ["mine", "Your templates"], ["community", "Community"]];
  return `<div class="scrim" data-act="closemodal"><div class="modal wide tlib" data-stop="1" role="dialog" aria-label="Templates"><div class="modal-h"><span class="nico" style="--nc:var(--brand)">${ICON.grid}</span><h3>Templates</h3><span class="grow"></span>${show ? `<button class="btn sm" data-act="tplsaveopen">${ICON.plus} Save this show as a template</button>` : ""}<button class="ib" data-act="closemodal" aria-label="Close">${ICON.x}</button></div>
    <div class="tabs tl-tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-act="tpltab" data-v="${k}" aria-selected="${S.tplTab === k}">${l}${k !== "picks" && S.tplStore ? ` <span class="faint">${tplList(k).length}</span>` : ""}</button>`).join("")}</div>
    <div class="modal-b">
    ${S.tplTab !== "picks" && !S.tplStore ? `<p class="muted">Loading templates…</p>` : list.length ? `<div class="tpl-grid">${list.map(t => `<div class="tpl"><button class="art" data-act="tplprev" data-src="${t.src}" data-id="${esc(t.id)}" aria-label="Preview ${esc(t.name)}">${miniMap(t.graph)}</button>
      <div class="tb"><b>${esc(t.name)}</b><span>${esc(t.desc || "")}</span><span class="tby">${t.src === "builtin" ? "By Webshow" : `By ${esc(t.author)}`}${t.uses ? ` · used ${t.uses}×` : ""}${t.community && S.tplTab === "mine" ? " · shared" : ""}</span>${perfHTML(t)}
      <div class="swrow" style="margin-top:4px"><button class="btn sm" data-act="tplprev" data-src="${t.src}" data-id="${esc(t.id)}">${ICON.eye} Preview</button><button class="btn sm primary" data-act="tpluse" data-src="${t.src}" data-id="${esc(t.id)}">${ICON.copy} Use</button></div></div></div>`).join("")}</div>`
      : S.tplTab === "mine" ? `<div class="empty"><h3>No saved templates yet</h3><span>Save any show as a template: its nodes, wiring, built pages and results are kept so you can reuse the whole setup.</span>${show ? `<button class="btn primary" data-act="tplsaveopen">${ICON.plus} Save “${esc(show.name)}” as a template</button>` : `<span class="faint">Open a show first.</span>`}</div>`
      : `<div class="empty"><h3>No community templates yet</h3><span>When someone in your workspace shares a template with the community, it appears here with its results.</span>${show ? `<button class="btn" data-act="tplsaveopen">${ICON.share} Share one of yours</button>` : ""}</div>`}
    <p class="faint" style="font-size:12px">${show && S.view === "canvas" ? "Webshow picks are added next to what's on this canvas. Saved and community templates are copied into a new show." : "Using a template copies it into a new show of your own. The original stays as it is."}</p></div></div></div>`;
}
function findTpl(src, id) { if (src === "builtin") return builtinTpl(id); const t = (S.tplStore || []).find(x => x.id === id); return t ? { ...t, src: "store", author: t.byName || "Teammate", perfKind: t.perf?.ads?.demo ? "mixed" : "real" } : null; }

/* ---------- preview ---------- */
function tplPage(g) {
  const pg = g.nodes.find(n => n.type === "page" && n.p?.sections?.length); if (!pg) return "";
  const byRef = Object.fromEntries(g.nodes.map(n => [n.ref, n]));
  const stEdge = g.edges.find(([, , t, tp]) => t === pg.ref && tp === "style"); const st = stEdge ? byRef[stEdge[0]]?.p : null;
  const imgs = {}; g.edges.filter(([, , t, tp]) => t === pg.ref && tp === "images").forEach(([f]) => { const n = byRef[f]; if (!n) return; const p = { ...NT.image.params(), ...n.p };
    imgs[n.ref] = { src: p.source !== "concept" && p.src ? p.src : visualURL({ id: n.ref, motif: p.motif, seed: p.seed, overlay: p.overlay, aspect: p.aspect || "4:3" }, st?.palette || PALETTES.webshow.c, st?.fontPair || "pixel", .45), style: imgFilter(p), alt: p.alt || n.title, ov: p.ov && p.ov.kind !== "none" ? p.ov : null }; });
  const keys = Object.keys(imgs); const secs = pg.p.sections.map(x => x.type === "scheduler" ? { ...x, tool: byRef[x.toolId]?.p || {} } : x.visualId ? { ...x, visualId: imgs[x.visualId] ? x.visualId : keys[+String(x.visualId).replace(/^i/, "")] || keys[0] } : x);
  return `<div class="pv-page tprev-page"><div class="sp" style="${pageTheme(st || { palette: PALETTES.webshow.c, fontPair: "pixel", mode: "dark", radius: "soft" })}">${renderPage({ sections: secs }, { imgs })}</div></div>`;
}
function tplPreviewModal() {
  const t = S.tplPrev; if (!t) return ""; const g = t.graph; const page = tplPage(g);
  const counts = {}; g.nodes.forEach(n => (counts[n.type] = (counts[n.type] || 0) + 1));
  return `<div class="scrim" data-act="closemodal"><div class="modal wide tprev" data-stop="1" role="dialog" aria-label="Preview ${esc(t.name)}"><div class="modal-h"><button class="ib" data-act="tplback" aria-label="Back to templates">${ICON.back}</button><h3>${esc(t.name)}</h3><span class="chip">${t.src === "builtin" ? "Webshow pick" : t.community ? "Community" : "Your template"}</span><span class="grow"></span><button class="ib" data-act="closemodal" aria-label="Close">${ICON.x}</button></div>
    <div class="modal-b tprev-b"><div class="tprev-l">${page || `<div class="tprev-map">${miniMap(g, 560, 300)}</div><p class="faint" style="font-size:12px">This template's blocks are built from your own brief after you copy it.</p>`}${page ? `<div class="tprev-map sm">${miniMap(g, 560, 200)}</div>` : ""}</div>
      <aside class="tprev-r"><p>${esc(t.desc || "")}</p><span class="faint" style="font-size:12px">${t.src === "builtin" ? "By Webshow" : `By ${esc(t.author)}`}${t.showName ? ` · from “${esc(t.showName)}”` : ""}${t.uses ? ` · used ${t.uses}×` : ""}</span>
        <div class="grp"><h4>How it performed</h4>${perfHTML(t, true)}</div>
        <div class="grp"><h4>What you get</h4>${Object.entries(counts).map(([k, c]) => `<div class="li" style="padding:3px 0"><span class="nico" style="--nc:${NT[k]?.color}">${ICON[NT[k]?.icon] || ""}</span><span class="t"><b style="font-weight:500">${esc(NT[k]?.label || k)}${c > 1 ? ` × ${c}` : ""}</b></span>${g.nodes.some(n => n.type === k && n.built) ? `<span class="chip st-approved"><i></i>Built</span>` : ""}</div>`).join("")}<small class="faint">${g.edges.length} wires included. Copies get your brief, not the original business's details${t.src === "store" ? ", except text you keep" : ""}.</small></div></aside></div>
    <div class="modal-f"><button class="btn ghost" data-act="tplback">Back</button><button class="btn primary" data-act="tpluse" data-src="${t.src}" data-id="${esc(t.id)}">${ICON.copy} Use this template</button></div></div></div>`;
}

/* ---------- save a show as a template ---------- */
function snapshotGraph() {
  const ns = Object.values(S.nodes); const x0 = Math.min(0, ...ns.map(n => n.x)), y0 = Math.min(0, ...ns.map(n => n.y)); const mx = Math.min(...ns.map(n => n.x)), my = Math.min(...ns.map(n => n.y));
  const nodes = ns.map(n => { const p = clone(n.p);
    if (n.type === "publish") Object.assign(p, { live: false, slug: "", at: 0 });
    if (n.type === "carousel") delete p.posts; if (n.type === "adchannel") p.launched = 0; if (n.type === "social") p.accounts = [];
    if (n.type === "image" && typeof p.src === "string" && p.src.startsWith("data:") && p.src.length > 120000) { p.source = "concept"; p.src = ""; }
    return { ref: n.id, type: n.type, x: n.x - mx, y: n.y - my, title: n.title, p, built: !!n.builtAt }; });
  return { nodes, edges: Object.values(S.edges).map(e => [e.from, e.fromPort, e.to, e.toPort]) };
}
async function showPerf() {
  const pubs = Object.values(S.nodes).filter(n => n.type === "publish" && n.p.slug); let visits = 0, leads = 0;
  try { const st = await Store.liveStats(); pubs.forEach(p => { visits += st.visits?.[p.p.slug] || 0; leads += (st.leads || []).filter(l => l.slug === p.p.slug).length; }); } catch {}
  let ads = null; if (S.con && typeof dashData === "function") { const D = dashData(S.showId, 30); const T = (f) => D.rows.reduce((a, r) => a + r[f], 0); if (D.rows.length) ads = { imp: Math.round(T("imp")), clicks: Math.round(T("clicks")), spend: Math.round(T("spend")), demo: D.demo }; }
  return pubs.length || ads ? { visits: pubs.length ? visits : null, leads: pubs.length ? leads : null, ads, at: now() } : null;
}
function tplSaveModal() {
  const s = cur(); if (!s) return "";
  return `<div class="scrim" data-act="closemodal"><form class="modal" data-stop="1" data-form="tplsave" role="dialog" aria-label="Save as template"><div class="modal-h"><span class="nico" style="--nc:var(--brand)">${ICON.grid}</span><h3>Save as template</h3><button type="button" class="ib" data-act="closemodal" aria-label="Close">${ICON.x}</button></div><div class="modal-b">
    <div class="tprev-map">${miniMap(snapshotGraph(), 500, 150)}</div>
    <label class="fld"><span>Template name</span><input class="inp" id="ts_name" value="${esc(s.name)}" maxlength="60"></label>
    <label class="fld"><span>What is it good for?</span><textarea class="ta" id="ts_desc" maxlength="200" placeholder="e.g. Weekend rental launch: page with booking, exit popup and an Instagram carousel"></textarea></label>
    <label class="check"><input type="checkbox" id="ts_comm"> Share with the community, so others in this workspace can preview and copy it</label>
    <small class="faint">Saves every node, wire and built block, plus this show's results so far. Threads, leads and live addresses stay with the show.</small></div>
    <div class="modal-f"><button type="button" class="btn ghost" data-act="closemodal">Cancel</button><button class="btn primary">Save template</button></div></form></div>`;
}
document.addEventListener("submit", async (e) => {
  if (e.target.dataset?.form !== "tplsave") return; e.preventDefault(); const s = cur(); if (!s) return;
  const id = uid("tpl"); const g = snapshotGraph();
  const doc = { id, name: str($("#ts_name").value, s.name).slice(0, 60), desc: str($("#ts_desc").value).slice(0, 200), community: $("#ts_comm").checked, by: Store.me.id, byName: Store.me.name || "", showName: s.name, createdAt: now(), uses: 0, graph: g, perf: await showPerf() };
  try { await Store.putDoc("templates/" + id, doc); } catch (x) { console.warn(x); return toast(x?.code === "invalid_argument" ? "This show is too large to save as a template. Remove large uploaded images and try again." : "Couldn't save the template."); }
  S.tplStore = [...(S.tplStore || []), doc]; S.tplTab = "mine"; S.modal = "templates"; paintLayer(); toast(doc.community ? "Saved and shared with the community" : "Template saved");
});

/* ---------- use a template ---------- */
function useStoredTemplate(t) {
  const show = createShow({ name: t.name }); openShow(show.id);
  const g = { nodes: t.graph.nodes.map(n => ({ ...n, p: clone(n.p || {}) })), edges: t.graph.edges };
  const out = instantiate(g); const ids = out.ids;
  out.nodes.forEach((n, i) => { const src = g.nodes[i]; if (src.built) { n.status = "ready"; n.builtAt = now(); }
    if (n.type === "page" && n.p.sections) n.p.sections = n.p.sections.map(x => ({ ...x, ...(x.toolId ? { toolId: ids[x.toolId] || x.toolId } : {}), ...(x.visualId && ids[x.visualId] ? { visualId: ids[x.visualId] } : {}) }));
    if (n.type === "carousel" && n.p.slides) n.p.slides = n.p.slides.map(sl => (sl.img && ids[sl.img] ? { ...sl, img: ids[sl.img] } : sl));
    n.hist = [{ at: now(), by: Store.me.id, note: `Copied from template “${t.name}”` }]; });
  addNodes(out.nodes, out.edges); paintAll(); fitSoon();
  if (t.src === "store") Store.putDoc("templates/" + t.id, { ...(S.tplStore || []).find(x => x.id === t.id), uses: (t.uses || 0) + 1 }).catch(() => {});
  toast(`“${t.name}” copied into a new show`);
}
Object.assign(A, {
  templates() { S.modal = "templates"; paintLayer(); loadTemplates(true); },
  tpltab(b) { S.tplTab = b.dataset.v; paintLayer(); },
  tplprev(b) { const t = b.dataset.src === "builtin" ? builtinTpl(b.dataset.id) : findTpl("store", b.dataset.id); if (!t) return; S.tplPrev = t; S.modal = "tplprev"; paintLayer(); },
  tplback() { S.modal = "templates"; paintLayer(); },
  tpluse(b) { S.modal = null; S.tplPrev = null; if (b.dataset.src === "builtin") { placeTemplate(b.dataset.id); paintLayer(); return; } const t = findTpl("store", b.dataset.id); paintLayer(); if (t) useStoredTemplate(t); },
  tplsaveopen() { if (!cur()) return toast("Open a show first."); S.modal = "tplsave"; paintLayer(); setTimeout(() => $("#ts_desc")?.focus(), 0); },
});

/* ---------- Showrunner ideas on the front page ---------- */
const IDEAS = [
  "Turn our sauna rental into a winter festival: countdown page, ice-swim booking and a TikTok challenge",
  "A mystery box campaign where visitors take a quiz and get a personal offer by email",
  "Launch a pop-up store for one weekend only, with a waitlist page and a reminder popup",
  "A chatbot that plans the perfect weekend trip around our service and books a time",
  "Make our boring B2B service fun: comic-strip carousel, cheeky search ads and a demo booking page",
  "Celebrate our 10th birthday with a 10-day giveaway: daily posts, landing page and an exit popup",
  "A 'build your own bundle' landing page with a price calculator and LinkedIn ads",
  "Recruit summer staff with a playful landing page, Instagram carousel and booking for interviews",
];
S.ideas = null; S.ideaSeed = 0; S.ideasBusy = false;
function ideaList() { const base = S.ideas?.length ? S.ideas : IDEAS; const k = S.ideaSeed % base.length; return [...base.slice(k), ...base.slice(0, k)].slice(0, 4); }
async function loadIdeas() {
  if (!AI.fn || S.ideasBusy) { S.ideaSeed += 4; if (S.view === "home") render(); return; }
  S.ideasBusy = true; if (S.view === "home") render();
  try {
    const ctx = Object.values(S.shows).filter(s => !s.example).slice(0, 6).map(s => s.name).join(", ");
    const r = await AI.json(`Suggest 4 bold, imaginative but doable marketing campaign ideas a small or medium business could ask Webshow's Showrunner to build (landing pages, popups, social carousels, search ads, chatbots, booking). ${ctx ? `The user's existing shows: ${ctx}. Make at least two ideas fit these businesses.` : ""} Each idea is one sentence, max 20 words, written as an instruction to Showrunner. No invented facts or numbers about real businesses.\nReply with ONLY JSON: {"ideas":[4 strings]}`, { modelTier: "quick" });
    const ideas = arr(r?.ideas, 4).map(x => str(x)).filter(Boolean); if (ideas.length) { S.ideas = ideas; S.ideaSeed = 0; } else S.ideaSeed += 4;
  } catch { S.ideaSeed += 4; }
  S.ideasBusy = false; if (S.view === "home") render();
}
function ideasHTML() {
  return `<div class="ideas" aria-label="Showrunner suggests"><span class="ideas-h">${ICON.spark} Showrunner suggests</span>${ideaList().map((x, i) => `<button class="idea" data-act="useidea" data-t="${esc(x)}">${esc(x)}</button>`).join("")}<button class="btn sm ghost" data-act="moreideas" ${S.ideasBusy ? "disabled" : ""}>${S.ideasBusy ? `<span class="tdots sm" aria-hidden="true"><i></i><i></i><i></i></span> Thinking…` : `${ICON.sparkle} More ideas`}</button></div>`;
}
Object.assign(A, {
  useidea(b) { S.homeText = b.dataset.t; render(); const ta = $("#homeask"); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } },
  moreideas() { loadIdeas(); },
});
