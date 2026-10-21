/* ============================================================
   Node editors: an enlarged editor for every node type
   ============================================================ */
function slideImg(n, sl, i) {
  const ups = G.up(n.id, "images"); if (sl.img === "none") return "";
  if (sl.img && ups.some(u => u.id === sl.img)) return sl.img;
  return ups.length ? ups[i % ups.length].id : "";
}
function slideHTML(n, sl, i, total, { editing = false, big = false, scale } = {}) {
  const st = styleOf(n) || { palette: PALETTES.webshow.c, fontPair: "pixel", radius: "soft" };
  const fp = FONT_PAIRS[st.fontPair] || FONT_PAIRS.pixel; const [ink, pri, , paper] = st.palette;
  const id = slideImg(n, sl, i); const im = id && S.nodes[id] ? imageValue(S.nodes[id], scale || (big ? .6 : .22)) : null;
  const bg = im ? ink : (i % 2 ? pri : ink); const fg = im ? "#fff" : (lum(bg) > .6 ? ink : paper);
  const ce = (path, v, tag) => `<${tag} data-ne="slides.${i}.${path}" ${editing ? 'contenteditable="true" spellcheck="false"' : ""}>${esc(v)}</${tag}>`;
  return `<div class="slide2 al-${sl.align || "bottom"} ${big ? "big" : ""}" data-slide="${i}" style="${palVars(st.palette)}background:${bg};color:${fg};font-family:${fp.body};border-radius:${{ sharp: "2px", soft: "10px", round: "18px" }[st.radius] || "10px"}">
    ${im ? `<img alt="" src="${im.src}" style="${im.style};object-position:${sl.fx ?? 50}% ${sl.fy ?? 50}%" data-slide-img="${i}" draggable="false">${im.ov ? ovLayer(im.ov, "img") : ""}` : ""}${ovLayer(sl.ov || (im ? slideOv(sl) : null))}
    <div class="st">${ce("title", sl.title || "", "h4").replace("<h4", `<h4 style="font-family:${fp.head};font-weight:${fp.w || 700}"`)}${sl.text || editing ? ce("text", sl.text || "", "p") : ""}</div>
    <span class="num">${i + 1}/${total}</span></div>`;
}

/* ---------- shell ---------- */
function openNodeEditor(id) {
  const n = S.nodes[id]; if (!n) return;
  if (n.type === "page") { S.sel = id; return n.p.sections?.length ? A.preview({ dataset: { mode: "edit" } }) : (selectNode(id), toast("Build the page first, then open the editor.")); }
  S.sel = id; S.nodeEd = { id, slide: 0, combo: 0 }; Room.set({ sel: id }); paintLayer();
}
function nodeEdHTML() {
  const E = S.nodeEd; const n = S.nodes[E.id]; if (!n) return ""; const d = NT[n.type];
  const block = BUILDABLE.has(n.type) && n.type !== "page";
  return `<div class="preview ne" role="dialog" aria-label="${esc(d.label)} editor">
    <div class="bar"><button class="btn sm" data-act="neclose">${ICON.back} Canvas</button>
      <div class="title"><span class="nico" style="--nc:${d.color}">${ICON[d.icon]}</span><b class="ne-t">${esc(n.title)}</b><span class="muted">${esc(d.label)}</span>${nodeStatus(n)}${isEx() ? `<span class="muted">· Example: edits aren't saved</span>` : ""}</div>
      ${n.type === "carousel" && n.p.slides?.length ? `<button class="btn sm" data-act="socopen" data-id="${n.id}">${ICON.share} Publish</button>` : ""}
      ${block ? `<button class="btn sm primary" data-act="nebuild" ${n.status === "building" ? "disabled" : ""}>${ICON.sparkle} ${n.builtAt ? "Rebuild" : "Build"}</button>` : ""}
      ${block && n.builtAt ? (n.status === "approved" ? `<button class="btn sm" data-act="neunapprove">${ICON.check} Approved</button>` : `<button class="btn sm" data-act="neapprove">${ICON.check} Approve</button>`) : ""}
    </div>
    <div class="pv-body"><div class="ne-stage" id="nestage">${neStage(n)}</div><aside class="ne-side" id="neside">${neSide(n)}</aside></div></div>`;
}
function neRepaint(which = "both") {
  if (!S.nodeEd) return; const n = S.nodes[S.nodeEd.id]; if (!n) { S.nodeEd = null; return paintLayer(); }
  const st = $("#nestage"), sd = $("#neside"); const a = document.activeElement;
  const busy = (el) => el && el.contains(a) && (a.matches("input,textarea,select") || a.isContentEditable);
  if (st && which !== "side" && !busy(st)) { const sc = st.scrollTop; st.innerHTML = neStage(n); st.scrollTop = sc; mountNE(); }
  if (sd && which !== "stage" && !busy(sd)) { const sc = sd.scrollTop; sd.innerHTML = neSide(n); sd.scrollTop = sc; }
  const bar = $(".ne .bar .title"); if (bar) { const chip = bar.querySelector(".chip"); const tmp = document.createElement("div"); tmp.innerHTML = nodeStatus(n); if (chip) chip.replaceWith(tmp.firstElementChild || document.createTextNode("")); else if (tmp.firstElementChild) bar.appendChild(tmp.firstElementChild); }
}

/* ---------- stages ---------- */
function neStage(n) {
  const p = n.p; const ts = toolStage(n); if (ts) return ts;
  switch (n.type) {
    case "carousel": {
      const sl = p.slides || []; const E = S.nodeEd; const i = Math.min(E.slide, Math.max(0, sl.length - 1)); E.slide = i;
      if (!sl.length) return `<div class="empty" style="margin:auto"><h3>No slides yet</h3><span>Build the carousel from what's wired in, or add slides by hand.</span><div class="swrow"><button class="btn primary" data-act="nebuild" ${AI.fn ? "" : ""}>${ICON.sparkle} Build slides</button><button class="btn" data-act="neadd">${ICON.plus} Add a slide</button></div></div>`;
      return `<div class="car-ed"><div class="car-main"><button class="ib car-arrow" data-act="neslide" data-d="-1" aria-label="Previous slide" ${i === 0 ? "disabled" : ""}>${ICON.back}</button>
        <div class="car-frame">${slideHTML(n, sl[i], i, sl.length, { editing: true, big: true })}</div>
        <button class="ib car-arrow" data-act="neslide" data-d="1" aria-label="Next slide" ${i === sl.length - 1 ? "disabled" : ""}>${ICON.chev}</button></div>
        <p class="faint" style="text-align:center;font-size:12px">Click the text to edit it. Drag the image to move it. Drag the thumbnails to reorder.</p>
        <div class="car-strip" id="carstrip">${sl.map((s, k) => `<div class="car-th ${k === i ? "on" : ""}" draggable="true" data-th="${k}" data-act="neselslide" data-i="${k}" title="Slide ${k + 1}">${slideHTML(n, s, k, sl.length)}</div>`).join("")}<button class="car-add" data-act="neadd" aria-label="Add a slide">${ICON.plus}<span>Add slide</span></button></div>
        <div class="car-post"><div class="car-post-h"><span class="uav" style="background:var(--tint)">${esc((briefOf(n)?.business || cur()?.name || "W")[0])}</span><b>${esc(briefOf(n)?.business || cur()?.name || "")}</b><span class="faint">· ${esc(p.platform)}</span></div><p data-ne="caption" contenteditable="true" spellcheck="false" class="car-cap">${esc(p.caption || "Write a caption…")}</p><p class="car-tags">${(p.hashtags || []).map(h => "#" + esc(h)).join(" ")}</p></div></div>`;
    }
    case "popup": {
      const pg = pagesFeedingPopup(n)[0]; const v = pg ? pageValue(pg, .5) : null;
      const st = pg ? styleOf(pg) : null; const theme = v ? v.theme : pageTheme(st || { palette: PALETTES.webshow.c, fontPair: "pixel", mode: "dark", radius: "soft" });
      const ce = (k, val, tag, cls = "") => `<${tag} class="${cls}" data-ne="${k}" contenteditable="true" spellcheck="false">${esc(val)}</${tag}>`;
      return `<div class="pop-stage"><div class="pop-frame">${v && pg.p.sections?.length ? `<div class="sp" style="${v.theme}">${renderPage({ sections: v.sections.slice(0, 2) }, { imgs: v.imgs })}</div>` : `<div class="sp" style="${theme};min-height:520px"></div>`}
        <div class="wp-ov ${p.position}" style="position:absolute;${theme};${toolCss(n, pg)}">${popupHTML({ ...p, pimg: popupImgOf(n, .5) }, { ce })}</div></div>
        <div class="swrow" style="justify-content:center">${ruleChips(p)}${pg ? `<span class="faint" style="font-size:12px">on “${esc(pg.title)}”</span>` : `<span class="faint" style="font-size:12px">Wire this popup into a landing page to see it on the page.</span>`}</div>
        ${pg ? `<button class="btn" style="justify-self:center" data-act="neprevpop">${ICON.eye} Try it on the live preview</button>` : ""}</div>`;
    }
    case "ad": {
      const h = p.headlines || [], d = p.descriptions || []; const c = S.nodeEd.combo || 0;
      if (!h.length) return `<div class="empty" style="margin:auto"><h3>No ad copy yet</h3><span>Build headlines and descriptions from the brief.</span><button class="btn primary" data-act="nebuild">${ICON.sparkle} Build</button></div>`;
      const pick = (arr0, k, n0) => Array.from({ length: Math.min(n0, arr0.length) }, (_, j) => arr0[(k + j) % arr0.length]);
      const url = linkDomain(n) || p.url || "yourdomain.fi";
      return `<div class="ad-stage"><div class="swrow" style="justify-content:space-between"><b>How Google may show it</b><button class="btn sm" data-act="necombo">${ICON.spark} Another combination</button></div>
        <div class="serp"><small>Sponsored</small><div class="serp-u"><span class="uav" style="background:var(--bubble);color:var(--ink);width:18px;height:18px;font-size:9px">${esc((briefOf(n)?.business || "W")[0])}</span><span>${esc(briefOf(n)?.business || "")}<br><small>${esc(url)}</small></span></div><a>${esc(pick(h, c, 3).join(" | "))}</a><p>${esc(pick(d, c, 2).join(" "))}</p></div>
        <div class="serp mob"><small>Sponsored · ${esc(url)}</small><a>${esc(pick(h, c + 1, 2).join(" | "))}</a><p>${esc(pick(d, c + 1, 1).join(" "))}</p></div>
        <p class="faint" style="font-size:12px">Google mixes headlines and descriptions automatically. Keep every line able to stand on its own.</p></div>`;
    }
    case "image": {
      const v = imageValue(n, .9); const ar = (p.source === "concept" ? (p.aspect || "4:3") : "4:3").replace(":", "/");
      return `<div class="img-stage"><div class="img-big" style="aspect-ratio:${ar};${palVars(styleOf(n)?.palette)}"><img alt="${esc(v.alt)}" src="${v.src}" style="${v.style}" data-node-img="1" draggable="false">${ovLayer(v.ov, "img")}${imgTextHTML(n, { edit: true })}<span class="img-hint">Drag to move the focus point</span></div>
        <div class="img-crops">${[["16:9", "Landscape"], ["4:5", "Feed"], ["1:1", "Square"], ["9:16", "Story"]].map(([a, l]) => `<figure><div style="aspect-ratio:${a.replace(":", "/")};position:relative;isolation:isolate;${palVars(styleOf(n)?.palette)}"><img alt="" src="${v.src}" style="${v.style}" draggable="false">${ovLayer(v.ov, "img")}${imgTextHTML(n)}</div><figcaption>${l}</figcaption></figure>`).join("")}</div></div>`;
    }
    case "text": return `<div class="doc"><input class="doc-t" id="ne_title" data-title="1" value="${esc(n.title)}" aria-label="Title"><textarea class="doc-b" id="ne_text" data-p="text" placeholder="Write the copy…">${esc(p.text)}</textarea><span class="faint" style="font-size:12px">${(p.text || "").trim().split(/\s+/).filter(Boolean).length} words</span></div>`;
    case "brief": return `<div class="doc"><input class="doc-t" id="ne_title" data-title="1" value="${esc(n.title)}" aria-label="Title">${inspectorBody(n).replace(/id="p_/g, 'id="ne_p_')}</div>`;
    case "style": {
      const f = FONT_PAIRS[p.fontPair] || FONT_PAIRS.pixel; const [ink, pri, sec, paper, pop] = p.palette; const dark = p.mode === "dark"; const bg = dark ? ink : paper, fg = dark ? paper : ink; const r = { sharp: "0px", soft: "12px", round: "26px" }[p.radius];
      return `<div class="sty-stage"><div class="sty-pal">${p.palette.map((c, i) => `<div style="background:${c};color:${lum(c) > .55 ? "#0a0b1b" : "#fff"}"><b>${["Ink", "Primary", "Secondary", "Paper", "Pop"][i]}</b><span class="mono">${c}</span></div>`).join("")}</div>
        <div class="sty-spec" style="background:${bg};color:${fg};border-radius:${r}"><span style="font:600 12px ${f.body};letter-spacing:.14em;text-transform:uppercase;color:${pri}">${esc(cur()?.name || "Your brand")}</span>
          <h2 style="font-family:${f.head};font-weight:${f.w || 800};font-size:clamp(34px,5vw,60px);line-height:1.02;letter-spacing:-.02em;margin:10px 0 12px">${esc(briefOf({ id: "" })?.offer || "A headline set in your type")}</h2>
          <p style="font-family:${f.body};font-size:17px;line-height:1.55;max-width:52ch;opacity:.82">Body copy in ${esc(f.label.toLowerCase())}. This is how paragraphs, buttons and cards look on your pages, popups and carousels.</p>
          <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap"><span style="background:${pri};color:${lum(pri) > .6 ? ink : "#fff"};padding:12px 20px;border-radius:${r};font:700 15px ${f.body}">Primary action</span><span style="box-shadow:inset 0 0 0 1.5px ${fg};padding:12px 20px;border-radius:${r};font:700 15px ${f.body}">Secondary</span><span style="background:${pop};width:44px;border-radius:${r}"></span></div>
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:22px">${["Card one", "Card two", "Card three"].map(t => `<div style="background:color-mix(in srgb,${fg} 6%,${bg});border-radius:${r};padding:16px;display:grid;gap:6px"><i style="width:26px;height:26px;border-radius:50%;background:${sec}"></i><b style="font-family:${f.head};font-weight:${f.w3 || 700}">${t}</b><span style="opacity:.7;font:14px ${f.body}">Supporting line.</span></div>`).join("")}</div></div></div>`;
    }
    case "publish": {
      const pg = G.up(n.id, "page")[0]; const v = pg ? pageValue(pg, .5) : null;
      return `<div class="pub-stage">${pg && pg.p.sections?.length ? `<div class="pub-frame"><div class="pub-url"><span class="chip ${p.live ? "st-live" : ""}"><i></i>${p.live ? "Live" : "Draft"}</span><span class="mono">/${esc(p.slug || slugify(cur()?.name))}</span></div><div class="pv-page" style="height:420px"><div class="sp" style="${v.theme}">${renderPage({ sections: v.sections.slice(0, 3) }, { imgs: v.imgs })}</div></div></div>` : `<div class="empty" style="margin:auto"><h3>Nothing to publish yet</h3><span>Wire a built landing page into this node.</span></div>`}</div>`;
    }
  }
  return `<div class="doc">${inspectorBody(n)}</div>`;
}

/* ---------- side panels ---------- */
function neSide(n) {
  const p = n.p;
  if (n.type === "carousel") {
    const sl = p.slides || []; const i = S.nodeEd.slide; const s = sl[i]; const ups = G.up(n.id, "images"); const cur1 = s ? slideImg(n, s, i) : "";
    return `<div class="insp-b">${s ? `<div class="grp"><div class="swrow" style="justify-content:space-between"><h4>Slide ${i + 1} of ${sl.length}</h4><span class="swrow"><button class="ib" data-act="nemove" data-d="-1" aria-label="Move slide left" ${i === 0 ? "disabled" : ""}>${ICON.back}</button><button class="ib" data-act="nemove" data-d="1" aria-label="Move slide right" ${i === sl.length - 1 ? "disabled" : ""}>${ICON.chev}</button><button class="ib" data-act="nedup" aria-label="Duplicate slide">${ICON.copy}</button><button class="ib" data-act="nedel" aria-label="Delete slide">${ICON.trash}</button></span></div>
      <div class="fld"><span>Text position</span><div class="seg" style="justify-self:start">${[["top", "Top"], ["center", "Middle"], ["bottom", "Bottom"]].map(([k, l]) => `<button data-act="nealign" data-v="${k}" aria-pressed="${(s.align || "bottom") === k}">${l}</button>`).join("")}</div></div></div>
      <div class="grp"><h4>Image</h4><div class="imgpick">${ups.map(u => { const im = imageValue(u, .2); return `<button data-act="neslideimg" data-id="${u.id}" aria-pressed="${u.id === cur1}" title="${esc(u.title)}"><img alt="" src="${im.src}" style="${im.style}"><span>${esc(u.title)}</span></button>`; }).join("")}<button data-act="neslideimg" data-id="none" aria-pressed="${!cur1}"><span class="noimg" style="aspect-ratio:4/3;border-radius:5px"></span><span>No image</span></button></div>
        ${cur1 ? `<label class="adj"><span>Horizontal</span><input type="range" min="0" max="100" data-sl="fx" id="ne_fx" value="${s.fx ?? 50}"><output>${s.fx ?? 50}%</output></label><label class="adj"><span>Vertical</span><input type="range" min="0" max="100" data-sl="fy" id="ne_fy" value="${s.fy ?? 50}"><output>${s.fy ?? 50}%</output></label>` : ""}
        <div class="swrow"><label class="btn sm" for="neup">${ICON.upload} Upload</label><input type="file" id="neup" accept="image/*" hidden data-change="neupload"></div>
        <textarea class="ta" id="neimgprompt" style="min-height:48px" placeholder="Describe a new image for this slide"></textarea><button class="btn sm primary" style="justify-self:start" data-act="negenimg" ${S.nodeEd.busy ? "disabled" : ""}>${ICON.sparkle} ${S.nodeEd.busy === "image" ? "Drawing…" : "Generate image"}</button></div>
      ${ovPanel(sl[i].ov || (cur1 ? slideOv(sl[i]) : null), styleOf(n)?.palette, "slide", cur1 ? "Overlay & gradient" : "Background gradient")}
      <div class="grp"><h4>Ask Showrunner</h4><input class="inp" id="neask" placeholder="${AI.fn ? "e.g. Make this slide a question" : "Open Studio in Claude to use AI"}" ${AI.fn ? "" : "disabled"}><button class="btn sm" style="justify-self:start" data-act="nerewriteslide" ${AI.fn && !S.nodeEd.busy ? "" : "disabled"}>${ICON.sparkle} ${S.nodeEd.busy === "rewrite" ? "Rewriting…" : "Rewrite this slide"}</button></div>` : ""}
      <div class="grp"><h4>Post</h4>${fP(n, "platform", "Platform", { sel: [["Instagram", "Instagram"], ["LinkedIn", "LinkedIn"], ["Facebook", "Facebook"]] })}${fP(n, "count", "Slides when rebuilding", { sel: [3, 4, 5, 6, 7].map(x => [x, x]) })}
        <label class="fld"><span>Hashtags</span><input class="inp" id="ne_tags" data-tags="1" value="${esc((p.hashtags || []).join(", "))}" placeholder="kivisauna, puusauna"></label><small class="faint">Rebuild keeps each slide's image and position and rewrites the text.</small></div></div>`;
  }
  if (n.type === "text") return `<div class="insp-b"><div class="grp"><h4>Rewrite with AI</h4><div class="swrow">${["Shorter", "Punchier", "More premium", "In Finnish", "In English"].map(t => `<button class="btn sm" data-act="rewrite" data-t="${t}" ${AI.fn ? "" : "disabled"}>${t}</button>`).join("")}</div><div style="display:flex;gap:6px"><input class="inp" id="rw_${n.id}" placeholder="${AI.fn ? "Or say how to change it…" : "Connect AI to rewrite"}" ${AI.fn ? "" : "disabled"}><button class="btn" data-act="rewrite" ${AI.fn ? "" : "disabled"}>${ICON.sparkle}</button></div></div>
    <div class="grp"><h4>Used by</h4>${G.edgesFrom(n.id).map(e => S.nodes[e.to]).filter(Boolean).map(x => `<div class="li" style="padding:4px 0"><span class="nico" style="--nc:${NT[x.type].color}">${ICON[NT[x.type].icon]}</span><span class="t"><b style="font-weight:500">${esc(x.title)}</b></span></div>`).join("") || `<p class="muted">Not wired into anything yet.</p>`}</div></div>`;
  if (n.type === "brief") return `<div class="insp-b"><div class="grp"><h4>Why the brief matters</h4><p class="muted">Every block wired to this brief writes from it. Only the facts field can be used for numbers, prices or claims, so put anything you can prove there.</p></div><div class="grp"><h4>Used by</h4>${G.edgesFrom(n.id).map(e => S.nodes[e.to]).filter(Boolean).map(x => `<div class="li" style="padding:4px 0"><span class="nico" style="--nc:${NT[x.type].color}">${ICON[NT[x.type].icon]}</span><span class="t"><b style="font-weight:500">${esc(x.title)}</b></span></div>`).join("") || `<p class="muted">Not wired into anything yet.</p>`}</div></div>`;
  if (n.type === "image") return `<div class="insp-b">${ovPanel(n.p.ov, styleOf(n)?.palette, "img", "Overlay & gradient", "Shows wherever this image is used: pages, carousels and posts.")}<label class="fld"><span>Title</span><input class="inp" id="ne_title2" data-title="1" value="${esc(n.title)}"></label>${inspectorBody(n).replace(/<button data-act="editself">[\s\S]*?<\/button>/, "").replace(/id="p_/g, 'id="nes_p_').replace(/id="adj_/g, 'id="nes_adj_').replace(/id="fx_/g, 'id="nes_fx_').replace(/id="fy_/g, 'id="nes_fy_')}</div>`;
  return `<div class="insp-b"><label class="fld"><span>Title</span><input class="inp" id="ne_title2" data-title="1" value="${esc(n.title)}"></label>${inspectorBody(n).replace(/<button data-act="editself">[\s\S]*?<\/button>/, "").replace(/id="p_/g, 'id="nes_p_').replace(/id="adj_/g, 'id="nes_adj_').replace(/id="fx_/g, 'id="nes_fx_').replace(/id="fy_/g, 'id="nes_fy_').replace(/id="pc_/g, 'id="nes_pc_')}</div>`;
}

/* ---------- mount: drag and drop, focus drag ---------- */
function mountNE() {
  mountToolStage(S.nodeEd && S.nodes[S.nodeEd.id]);
  const strip = $("#carstrip"); if (!strip) return;
  let from = null;
  strip.querySelectorAll(".car-th").forEach(th => {
    th.addEventListener("dragstart", (e) => { from = +th.dataset.th; th.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", String(from)); } catch {} });
    th.addEventListener("dragend", () => th.classList.remove("dragging"));
    th.addEventListener("dragover", (e) => { e.preventDefault(); th.classList.add("over"); });
    th.addEventListener("dragleave", () => th.classList.remove("over"));
    th.addEventListener("drop", (e) => { e.preventDefault(); th.classList.remove("over"); const to = +th.dataset.th; if (from == null || from === to) return; carEdit((n, sl) => { const [m] = sl.splice(from, 1); sl.splice(to, 0, m); S.nodeEd.slide = to; }, "Reordered slides"); });
  });
}
function carEdit(fn, note, which = "both") { const n = S.nodes[S.nodeEd.id]; fn(n, n.p.slides); n.p.count = n.p.slides.length || n.p.count; hist(n, note); commitNode(n); paintNode(n.id); neRepaint(which); }
document.addEventListener("pointerdown", (e) => {
  if (!S.nodeEd) return; const n = S.nodes[S.nodeEd.id]; if (!n) return;
  const big = !e.target.closest("[contenteditable]") && e.target.closest("#nestage .car-frame .slide2"); const si = big && big.querySelector("img[data-slide-img]");
  if (si && n.type === "carousel") { const i = +si.dataset.slideImg; const s = n.p.slides[i]; e.preventDefault();
    return focusDrag(e, si, s.fx ?? 50, s.fy ?? 50, (fx, fy) => { si.style.objectPosition = `${fx}% ${fy}%`; }, (fx, fy, moved) => { if (moved) carEdit((nn, sl) => { sl[i].fx = fx; sl[i].fy = fy; }, "Moved a slide image"); }); }
  const ni = e.target.closest("#nestage img[data-node-img]");
  if (ni && n.type === "image") { e.preventDefault();
    return focusDrag(e, ni, n.p.fx ?? 50, n.p.fy ?? 50, (fx, fy) => { $$("#nestage img").forEach(im => (im.style.objectPosition = `${fx}% ${fy}%`)); }, (fx, fy, moved) => { if (!moved) return; n.p.fx = fx; n.p.fy = fy; hist(n, "Moved the focus point"); commitNode(n); paintNode(n.id); G.edgesFrom(n.id).forEach(ed => paintNode(ed.to)); neRepaint("side"); }); }
});
let neT;
document.addEventListener("input", (e) => {
  if (!S.nodeEd) return; const t = e.target; const n = S.nodes[S.nodeEd.id]; if (!n) return;
  if (t.dataset.ne && t.isContentEditable) { set(n.p, t.dataset.ne, t.textContent); clearTimeout(neT); neT = setTimeout(() => { commitNode(n); paintNode(n.id); }, 350); return; }
  if (t.dataset.sl) { const s = n.p.slides[S.nodeEd.slide]; s[t.dataset.sl] = +t.value; t.parentElement.querySelector("output").textContent = t.value + "%";
    const big = $("#nestage .car-frame .slide2"); if (big) { const im = big.querySelector("img"); if (im) im.style.objectPosition = `${s.fx ?? 50}% ${s.fy ?? 50}%`; }
    clearTimeout(neT); neT = setTimeout(() => { hist(n, "Adjusted a slide image"); commitNode(n); paintNode(n.id); neRepaint("stage"); }, 400); return; }
  if (t.dataset.tags) { n.p.hashtags = t.value.split(/[,\s]+/).map(x => x.replace(/^#/, "").trim()).filter(Boolean); clearTimeout(neT); neT = setTimeout(() => { commitNode(n); neRepaint("stage"); }, 400); return; }
});
document.addEventListener("focusout", (e) => { if (S.nodeEd && e.target.dataset?.ne) setTimeout(() => neRepaint("side"), 0); });
function neAfterInput(t) { if (!S.nodeEd) return; const inStage = t.closest?.("#nestage"); if (!inStage) neRepaint("stage"); else neRepaint("side"); }

/* ---------- actions ---------- */
async function drawForSlide(n, i, prompt) {
  const pal = styleOf(n)?.palette || PALETTES.webshow.c; S.nodeEd.busy = "image"; neRepaint("side");
  try {
    let img;
    if (AI.fn) { const src = await drawImage(prompt, pal); img = addImageNodeFor(n, { title: prompt.split(/[,.—-]/)[0].slice(0, 36) || "AI image", p: { source: "ai", src, prompt, alt: prompt.slice(0, 120) } }); hist(img, "Image drawn by Showrunner"); commitNode(img); }
    else img = addImageNodeFor(n, { title: "Concept frame", p: { source: "concept", motif: MOTIFS[Math.floor(Math.random() * MOTIFS.length)], alt: prompt.slice(0, 120) } });
    S.nodeEd.busy = null; carEdit((nn, sl) => { sl[i].img = img.id; delete sl[i].fx; delete sl[i].fy; }, "New slide image"); paintWorld(); toast("New image added to the slide and the canvas");
  } catch (e) { S.nodeEd.busy = null; neRepaint("side"); toast(e?.code === "invalid_svg" ? "The drawing came back broken. Try again." : errCopy(e)); }
}
Object.assign(A, {
  openeditor(t) { openNodeEditor(t?.dataset?.id || S.sel); },
  editself() { const n = selNode(); if (n) openNodeEditor(n.id); },
  neclose() { botStageClean?.(); botStageClean = null; S.nodeEd = null; paintLayer(); paintAll(); },
  nebuild() { const n = S.nodes[S.nodeEd.id]; buildNode(n).then(() => neRepaint()); neRepaint(); },
  neapprove() { const n = S.nodes[S.nodeEd.id]; n.status = "approved"; hist(n, "Approved"); commitNode(n); paintLayer(); paintAll(); },
  neunapprove() { const n = S.nodes[S.nodeEd.id]; n.status = "ready"; commitNode(n); paintLayer(); paintAll(); },
  neslide(t) { S.nodeEd.slide += +t.dataset.d; neRepaint(); },
  neselslide(t) { S.nodeEd.slide = +t.dataset.i; neRepaint(); },
  neadd() { carEdit((n, sl) => { sl.splice((sl.length ? S.nodeEd.slide + 1 : 0), 0, { title: "New slide", text: "", align: "bottom", shade: 45 }); S.nodeEd.slide = sl.length ? S.nodeEd.slide + (sl.length > 1 ? 1 : 0) : 0; }, "Added a slide"); },
  nemove(t) { const i = S.nodeEd.slide, j = i + +t.dataset.d; carEdit((n, sl) => { [sl[i], sl[j]] = [sl[j], sl[i]]; S.nodeEd.slide = j; }, "Moved a slide"); },
  nedup() { const i = S.nodeEd.slide; carEdit((n, sl) => { sl.splice(i + 1, 0, clone(sl[i])); S.nodeEd.slide = i + 1; }, "Duplicated a slide"); },
  nedel() { const i = S.nodeEd.slide; carEdit((n, sl) => { sl.splice(i, 1); S.nodeEd.slide = Math.max(0, i - 1); }, "Deleted a slide"); },
  nealign(t) { carEdit((n, sl) => { sl[S.nodeEd.slide].align = t.dataset.v; }, "Moved slide text"); },
  neslideimg(t) { carEdit((n, sl) => { sl[S.nodeEd.slide].img = t.dataset.id; delete sl[S.nodeEd.slide].fx; delete sl[S.nodeEd.slide].fy; }, "Changed a slide image"); },
  negenimg() { const n = S.nodes[S.nodeEd.id]; const s = n.p.slides[S.nodeEd.slide]; const prompt = str($("#neimgprompt")?.value) || [s.title, s.text].filter(Boolean).join(". "); if (!prompt) return toast("Describe the image first."); drawForSlide(n, S.nodeEd.slide, prompt); },
  async nerewriteslide() {
    const n = S.nodes[S.nodeEd.id]; const i = S.nodeEd.slide; const how = str($("#neask")?.value); if (!how) return toast("Say how to change the slide.");
    S.nodeEd.busy = "rewrite"; neRepaint("side");
    try { const r = await AI.json(`Rewrite one slide of a ${n.p.platform} carousel. Instruction: <input>${how}</input>\n${RULES}\n${inputsBlock(n)}\nALL SLIDES: ${JSON.stringify(n.p.slides.map(s => ({ title: s.title, text: s.text })))}\nSLIDE ${i + 1}: ${JSON.stringify({ title: n.p.slides[i].title, text: n.p.slides[i].text })}\nReply with ONLY JSON: {"title": string max 6 words, "text": string max 18 words}`, { modelTier: "quick" });
      S.nodeEd.busy = null; carEdit((nn, sl) => { sl[i].title = str(r.title, sl[i].title); sl[i].text = str(r.text); }, "Slide rewritten"); toast("Slide rewritten"); }
    catch (e) { S.nodeEd.busy = null; neRepaint("side"); toast(errCopy(e)); }
  },
  necombo() { S.nodeEd.combo = (S.nodeEd.combo || 0) + 1; neRepaint("stage"); },
  neprevpop() { const n = S.nodes[S.nodeEd.id]; const pg = pagesFeedingPopup(n)[0]; if (!pg) return; S.nodeEd = null; S.preview = { nodeId: pg.id, dev: "desktop", mode: "preview", force: n.id }; paintLayer(); },
});
document.addEventListener("change", async (e) => {
  const t = e.target; if (!S.nodeEd || t.dataset?.change !== "neupload" || !t.files?.[0]) return;
  const n = S.nodes[S.nodeEd.id]; const i = S.nodeEd.slide; toast("Uploading…");
  try { const r = await Store.uploadImage(t.files[0]); const img = addImageNodeFor(n, { title: t.files[0].name.replace(/\.[^.]+$/, "").slice(0, 40), p: { source: "upload", src: r.src, assetId: r.assetId || "" } }); carEdit((nn, sl) => { sl[i].img = img.id; }, "Uploaded a slide image"); paintWorld(); toast("Uploaded"); }
  catch (x) { console.warn(x); toast("Couldn't upload that image."); }
});
