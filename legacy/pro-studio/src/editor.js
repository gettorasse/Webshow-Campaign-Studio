/* ============================================================
   Page editor: preview + sections + templates + images + AI
   ============================================================ */
const SECTION_TPLS = [
  { k: "hero-split", type: "hero", label: "Hero · split", desc: "Headline beside an image", sk: '<i class="t1"></i><i class="t2"></i><i class="bt"></i><i class="im r"></i>' },
  { k: "hero-center", type: "hero", label: "Hero · centered", desc: "Big statement, image below", sk: '<i class="t1 c"></i><i class="t2 c"></i><i class="bt c"></i>' },
  { k: "hero-full", type: "hero", label: "Hero · full image", desc: "Text over a full-bleed visual", sk: '<i class="im full"></i><i class="t1 on"></i><i class="bt on"></i>' },
  { k: "benefits", type: "benefits", label: "Benefits", desc: "Three reasons in cards", sk: '<i class="t1"></i><span class="cards3"><i></i><i></i><i></i></span>' },
  { k: "features", type: "features", label: "Features", desc: "Four points in two columns", sk: '<i class="t1"></i><span class="cols2"><i></i><i></i><i></i><i></i></span>' },
  { k: "image", type: "image", label: "Image", desc: "Full-width visual with caption", sk: '<i class="im wide"></i><i class="t2"></i>' },
  { k: "stats", type: "stats", label: "Numbers", desc: "Two or three figures from your facts", sk: '<span class="cards3 num"><i></i><i></i><i></i></span>' },
  { k: "proof", type: "proof", label: "Customer quote", desc: "One real quote, with name", sk: '<i class="t1 q"></i><i class="t2"></i>' },
  { k: "faq", type: "faq", label: "FAQ", desc: "Questions that remove doubts", sk: '<i class="t1"></i><i class="ln"></i><i class="ln"></i><i class="ln"></i>' },
  { k: "form", type: "form", label: "Lead form", desc: "Name, email and a message", sk: '<i class="t1 half"></i><span class="frm"><i></i><i></i><i class="bt"></i></span>' },
  { k: "cta", type: "cta", label: "Call to action", desc: "A coloured band with one button", sk: '<span class="band"><i class="t1 on"></i><i class="bt on"></i></span>' },
  { k: "footer", type: "footer", label: "Footer", desc: "Business name and contact", sk: '<i class="ln"></i>' },
];
function tplSection(k, pg) {
  const b = briefOf(pg) || {}; const name = b.business || cur()?.name || "Your business"; const cta = b.cta || "Get in touch";
  const firstImg = G.up(pg.id, "images")[0]?.id || "";
  const S0 = { id: uid("s"), hidden: false };
  switch (k) {
    case "hero-split": return { ...S0, type: "hero", layout: "split", eyebrow: name, headline: b.offer ? b.offer.split(/[,.]/)[0] : "Say the one thing that matters", subhead: b.audience ? `Made for ${b.audience.charAt(0).toLowerCase() + b.audience.slice(1)}.` : "One sentence on who it's for and why it helps.", cta, cta2: "", visualId: firstImg };
    case "hero-center": return { ...tplSection("hero-split", pg), layout: "center" };
    case "hero-full": return { ...tplSection("hero-split", pg), layout: "full" };
    case "benefits": return { ...S0, type: "benefits", title: `Why ${name}`, items: [{ title: "First reason", text: "What changes for the customer." }, { title: "Second reason", text: "Keep it concrete." }, { title: "Third reason", text: "Remove one worry." }] };
    case "features": return { ...S0, type: "features", title: "What's included", items: [1, 2, 3, 4].map(i => ({ title: "Feature " + i, text: "What it does for them." })) };
    case "image": return { ...S0, type: "image", visualId: G.up(pg.id, "images")[1]?.id || firstImg, caption: "" };
    case "stats": return { ...S0, type: "stats", items: [{ value: "—", label: "Add a number from your facts" }, { value: "—", label: "Add a number from your facts" }] };
    case "proof": return { ...S0, type: "proof", quote: "Paste a real customer quote here.", author: "Name, place" };
    case "faq": return { ...S0, type: "faq", title: "Good to know", items: [{ q: "How do I get started?", a: cta + "." }, { q: "Who is this for?", a: b.audience || "Describe your customer." }, { q: "What does it cost?", a: "Add your pricing." }] };
    case "form": return { ...S0, type: "form", title: cta, text: b.offer || "", fields: ["name", "email", "message"], button: cta, success: "Thanks! We'll be in touch soon." };
    case "cta": return { ...S0, type: "cta", headline: "Ready when you are", text: b.offer || "", button: cta };
    case "footer": return { ...S0, type: "footer", business: name, contact: "", note: "" };
  }
}

/* ---------- preview shell ---------- */
function previewHTML() {
  const P0 = S.preview; const n = S.nodes[P0.nodeId]; if (!n) return "";
  const v = pageValue(n, .8); const edit = P0.mode === "edit";
  return `<div class="preview" role="dialog" aria-label="Page ${edit ? "editor" : "preview"}"><div class="bar"><button class="btn sm" data-act="closepreview">${ICON.back} Canvas</button><div class="title"><span class="tag">${esc(n.title)}</span>${isEx() ? `<span class="muted" style="white-space:nowrap">Example: edits aren't saved</span>` : ""}</div>
    <div class="seg"><button data-act="pvmode" data-v="edit" aria-pressed="${edit}">Edit</button><button data-act="pvmode" data-v="preview" aria-pressed="${!edit}">Preview</button></div>
    <div class="seg"><button data-act="pvdev" data-v="desktop" aria-pressed="${P0.dev !== "mobile"}" aria-label="Desktop">${P('<rect x="1.5" y="2.5" width="13" height="8.5" rx="1"/><path d="M5.5 13.5h5"/>')}</button><button data-act="pvdev" data-v="mobile" aria-pressed="${P0.dev === "mobile"}" aria-label="Mobile">${P('<rect x="4.5" y="1.5" width="7" height="13" rx="1.5"/><path d="M7.5 12.5h1"/>')}</button></div>
    ${!edit ? v.overlays.filter(o => !o.type || o.type === "popup").map(o => `<button class="btn sm" data-act="pvpop" data-id="${o.id}">${ICON.popup} Show “${esc(o.title)}”</button>`).join("") : ""}</div>
    <div class="pv-body">${edit ? `<aside class="pv-panel" id="pvpanel">${panelHTML(n, v)}</aside>` : ""}
    <div class="pframe" id="pframe"><div class="pf ${P0.dev === "mobile" ? "mobile" : ""}" id="pf"><div class="sp ${edit ? "editing" : ""}" style="${v.theme}">${renderPage({ sections: v.sections }, { imgs: v.imgs, editing: edit, href: v.href })}</div></div>
    ${!edit && v.overlays.some(o => !o.type || o.type === "popup") ? `<p class="faint" style="font-size:12px;margin-top:10px;text-align:center">Popup rules are live here: ${v.overlays.filter(o => !o.type || o.type === "popup").map(o => esc(o.title) + " (" + { load: "on load", delay: `after ${o.delay}s`, scroll: `at ${o.scroll}% scroll`, exit: "move the pointer out of the page" }[o.trigger] + (popupActive(o) ? "" : ", outside its dates") + ")").join(", ")}.</p>` : ""}
    ${edit ? `<p class="faint" style="font-size:12px;margin-top:10px;text-align:center">Click any text to edit it. Click a section or image to change it.</p>` : ""}</div></div></div>`;
}
let pvCleanup = null;
function mountPreview() {
  pvCleanup?.(); pvCleanup = null; const P0 = S.preview; const n = S.nodes[P0.nodeId]; if (!n) return;
  const fr = $("#pframe"); if (fr && P0.scroll) fr.scrollTop = P0.scroll;
  if (P0.mode === "edit") { markSel(); return; }
  const v = pageValue(n, .8);
  pvCleanup = mountPopups($("#pf"), v.overlays, { theme: v.theme, preview: true, scroller: fr, force: P0.force });
}
function repaintPreview(keepScroll = true) { if (keepScroll) S.preview.scroll = $("#pframe")?.scrollTop || 0; paintLayer(); }
function markSel() { $$("#pf [data-sec]").forEach(el => el.classList.toggle("pv-sel", +el.dataset.sec === S.preview.sec)); }

/* ---------- side panel ---------- */
function panelHTML(n, v) {
  const P0 = S.preview; const secs = n.p.sections; const sel = secs[P0.sec];
  if (P0.adding) return `<div class="pv-h"><button class="ib" data-act="pvaddclose" aria-label="Back">${ICON.back}</button><b>Add a section</b></div>
    <p class="muted" style="font-size:12px;padding:0 14px">Proven blocks, styled from your style guide. ${sel ? `Inserted after “${esc(secLabel(sel))}”.` : "Inserted before the footer."}</p>
    <div class="tplgrid">${SECTION_TPLS.map(t => `<button class="stpl" data-act="pvtpl" data-k="${t.k}"><span class="sk">${t.sk}</span><b>${esc(t.label)}</b><span>${esc(t.desc)}</span></button>`).join("")}</div>
    ${AI.fn ? `<label class="check" style="padding:4px 14px 14px;font-size:12px;color:var(--muted)"><input type="checkbox" id="pvaifill" ${P0.aiFill !== false ? "checked" : ""}> Let Showrunner write the copy</label>` : ""}`;
  if (P0.imgFor != null) return imagePanel(n, v);
  return `<div class="pv-h"><b>Sections</b><span class="grow"></span><button class="btn sm primary" data-act="pvadd">${ICON.plus} Add</button></div>
    <div class="pv-secs">${secs.map((s, i) => `<div class="pv-row ${P0.sec === i ? "on" : ""} ${s.hidden ? "off" : ""}" data-act="pvsec" data-i="${i}"><span class="lbl">${esc(secLabel(s))}</span>
      <button class="ib" data-act="pvmove" data-i="${i}" data-d="-1" aria-label="Move up" ${i === 0 ? "disabled" : ""}>${ICON.up}</button><button class="ib" data-act="pvmove" data-i="${i}" data-d="1" aria-label="Move down" ${i === secs.length - 1 ? "disabled" : ""}>${ICON.down}</button>
      <button class="ib" data-act="pvhide" data-i="${i}" aria-label="${s.hidden ? "Show" : "Hide"} section">${s.hidden ? P('<path d="M2 2l12 12M6.6 6.7A2 2 0 0 0 9.3 9.4M4.2 4.4C2.6 5.5 1.5 8 1.5 8S4 12.5 8 12.5c1.3 0 2.5-.4 3.5-1M7 3.6c.3 0 .7-.1 1-.1 4 0 6.5 4.5 6.5 4.5s-.5 1-1.5 2.1"/>') : ICON.eye}</button>
      <button class="ib" data-act="pvdel" data-i="${i}" aria-label="Delete section">${ICON.trash}</button></div>`).join("")}</div>
    ${sel ? `<div class="pv-detail"><div class="grp"><h4>${esc(secLabel(sel))}</h4>
      ${sel.type === "hero" && sel.layout === "split" ? `<div class="fld"><span>Image side</span><div class="seg" style="justify-self:start"><button data-act="pvflip" data-v="0" aria-pressed="${!sel.flip}">Right</button><button data-act="pvflip" data-v="1" aria-pressed="${!!sel.flip}">Left</button></div></div>` : ""}
      ${sel.type === "hero" ? `<label class="fld"><span>Layout</span><select class="sel" id="pvlayout">${[["split", "Split"], ["center", "Centered"], ["full", "Full image"]].map(([k, l]) => `<option value="${k}" ${sel.layout === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>` : ""}
      ${"visualId" in sel || ["hero", "image"].includes(sel.type) ? `<div class="fld"><span>Image</span><button class="pv-imgbtn" data-act="pvimg" data-i="${P0.sec}">${(() => { const id = pageImgId(n, sel.visualId); const im = v.imgs[id]; return im ? `<img alt="" src="${im.src}" style="${im.style}">` : `<span class="noimg" style="width:64px;aspect-ratio:4/3"></span>`; })()}<span><b>${esc(S.nodes[pageImgId(n, sel.visualId)]?.title || "No image")}</b><span class="muted">Change, upload or generate</span></span></button></div>` : ""}
      <small class="faint">Edit the text directly on the page. Drag an image to move it inside its frame.</small></div>
      ${sectionStyleGroup(n, P0.sec)}
      <div class="grp"><h4>Ask Showrunner</h4><textarea class="ta" id="pvask" style="min-height:56px" placeholder="${AI.fn ? "e.g. Make this section punchier and add a question about pricing" : "Open Studio in Claude to rewrite with AI"}" ${AI.fn ? "" : "disabled"}></textarea><button class="btn primary" style="justify-self:start" data-act="pvrewrite" ${AI.fn && !P0.busy ? "" : "disabled"}>${ICON.sparkle} ${P0.busy === "rewrite" ? "Rewriting…" : "Rewrite section"}</button></div></div>`
      : `<p class="muted" style="font-size:12px;padding:12px 14px">Select a section here or on the page to change its layout, image or copy.</p>`}`;
}
function secLabel(s) { const T = { scheduler: "Appointment scheduler", hero: "Hero", benefits: "Benefits", features: "Features", image: "Image", stats: "Numbers", proof: "Customer quote", faq: "FAQ", form: "Lead form", cta: "Call to action", footer: "Footer" }; return (T[s.type] || s.type) + (s.type === "hero" ? " · " + ({ split: "split", center: "centered", full: "full image" }[s.layout] || s.layout) : ""); }
function imagePanel(n, v) {
  const P0 = S.preview; const s = n.p.sections[P0.imgFor]; const cur0 = pageImgId(n, s?.visualId); const ups = G.up(n.id, "images");
  const st = styleOf(n);
  return `<div class="pv-h"><button class="ib" data-act="pvimgclose" aria-label="Back">${ICON.back}</button><b>Image for ${esc(secLabel(s))}</b></div>
    <div class="pv-detail">
    ${ups.length ? `<div class="grp"><h4>On this page</h4><div class="imgpick">${ups.map(u => { const im = v.imgs[u.id]; return `<button data-act="pvpick" data-id="${u.id}" aria-pressed="${u.id === cur0}" title="${esc(u.title)}"><img alt="${esc(u.title)}" src="${im.src}" style="${im.style}"><span>${esc(u.title)}</span></button>`; }).join("")}</div></div>` : ""}
    ${cur0 ? `<div class="grp"><h4>Position</h4><small class="faint">Drag the image on the page to move it inside its frame, or fine-tune here.</small>
      <label class="adj"><span>Horizontal</span><input type="range" id="pvfx" min="0" max="100" value="${s.fx ?? 50}"><output>${s.fx ?? 50}%</output></label>
      <label class="adj"><span>Vertical</span><input type="range" id="pvfy" min="0" max="100" value="${s.fy ?? 50}"><output>${s.fy ?? 50}%</output></label>
      ${s.type === "hero" && s.layout === "split" ? `<div class="fld"><span>Image side</span><div class="seg" style="justify-self:start"><button data-act="pvflip" data-v="0" aria-pressed="${!s.flip}">Right</button><button data-act="pvflip" data-v="1" aria-pressed="${!!s.flip}">Left</button></div></div>` : ""}
      <button class="btn sm ghost" style="justify-self:start" data-act="pvfocusreset">Reset position</button></div>` : ""}
    ${cur0 ? ovPanel(secOv(s), st?.palette, "sec", "Overlay & gradient", "Adds colour or a fade on top of the image, for example to keep text readable.") : ""}
    <div class="grp"><h4>Upload</h4><label class="btn" style="justify-self:start" for="pvup">${ICON.upload} Upload an image</label><input type="file" id="pvup" accept="image/*" hidden data-change="pvupload"></div>
    <div class="grp"><h4>Generate with AI</h4><textarea class="ta" id="pvimgprompt" style="min-height:64px" placeholder="Describe the image you want">${esc(P0.imgPrompt || defaultImgPrompt(n, s))}</textarea>
      <div class="swrow">${(st?.palette || PALETTES.webshow.c).map(c => `<span class="sw" style="width:16px;height:16px;background:${c}"></span>`).join("")}<span class="faint" style="font-size:11.5px">Uses the page's palette</span></div>
      <button class="btn primary" style="justify-self:start" data-act="pvgen" ${P0.busy ? "disabled" : ""}>${ICON.sparkle} ${P0.busy === "image" ? "Drawing…" : "Generate image"}</button>
      <small class="faint">${AI.fn ? "Showrunner draws an original illustration and adds it to the canvas as an Image node. Photo-real image models plug in during the alpha." : "AI isn't connected here, so this makes a concept frame instead. Open Studio in Claude to generate with AI."}</small></div>
    <div class="grp"><button class="btn sm ghost" style="justify-self:start" data-act="gonode" data-id="${cur0}" ${cur0 ? "" : "disabled"}>${ICON.sliders} Adjust this image on the canvas</button></div></div>`;
}
function defaultImgPrompt(n, s) { const b = briefOf(n) || {}; return [s?.headline || s?.title || s?.caption, b.offer].filter(Boolean).join(" — ").slice(0, 200); }

/* ---------- edits ---------- */
function pvEdit(fn, note, keepScroll = true) { const n = S.nodes[S.preview.nodeId]; fn(n, n.p.sections); hist(n, note); commitNode(n); repaintPreview(keepScroll); }
function addImageNodeFor(pg, extra) {
  const img = addNode("image", pg.x - 340, pg.y + 420, extra);
  connect(img.id, "image", pg.id, "images");
  const st = G.up(pg.id, "style")[0]; if (st && img.p.source === "concept") connect(st.id, "style", img.id, "style");
  return img;
}
function setSecImage(i, imgId, note) { pvEdit((n, secs) => { secs[i].visualId = imgId; }, note); }

const SVG_OK = new Set(["svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "defs", "lineargradient", "radialgradient", "stop", "clippath", "mask", "pattern", "use", "title", "desc", "filter", "fegaussianblur", "feoffset", "feblend", "fecolormatrix", "femerge", "femergenode", "feflood", "fecomposite", "feturbulence", "fedisplacementmap"]);
function sanitizeSvg(txt) {
  const m = String(txt).match(/<svg[\s\S]*<\/svg>/i); if (!m) throw { code: "invalid_svg" };
  const doc = new DOMParser().parseFromString(m[0], "image/svg+xml"); const root = doc.documentElement;
  if (root.nodeName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) throw { code: "invalid_svg" };
  const walk = (el) => { [...el.children].forEach(c => { if (!SVG_OK.has(c.nodeName.toLowerCase())) { c.remove(); return; } [...c.attributes].forEach(a => { const nm = a.name.toLowerCase(); if (nm.startsWith("on") || ((nm === "href" || nm === "xlink:href") && !a.value.startsWith("#")) || /url\((?!\s*['"]?#)/i.test(a.value)) c.removeAttribute(a.name); }); walk(c); }); };
  [...root.attributes].forEach(a => { if (a.name.toLowerCase().startsWith("on")) root.removeAttribute(a.name); });
  walk(root);
  if (!root.getAttribute("viewBox")) root.setAttribute("viewBox", "0 0 1200 900");
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg"); root.setAttribute("width", "1200"); root.setAttribute("height", "900"); root.setAttribute("preserveAspectRatio", "xMidYMid slice");
  const out = new XMLSerializer().serializeToString(root); if (out.length > 160000) throw { code: "too_large" };
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(out);
}
async function drawImage(prompt, palette) {
  const r = await AI.text(`Create an original SVG illustration for a marketing landing page.
Subject: <input>${prompt}</input>
Use only these colours (plus transparency): ${palette.join(", ")}.
Style: modern editorial illustration, layered flat shapes with soft gradients and depth, strong composition, generous negative space. No text, no letters, no logos, no detailed faces.
Technical: one <svg> with viewBox="0 0 1200 900"; shapes, paths and linearGradient/radialGradient only; no <image>, no <text>, no scripts, no external references, no foreignObject. Under 40 KB.
Reply with ONLY the SVG markup.`, { modelTier: AI.tier(S.effort) === "quick" ? "default" : AI.tier(S.effort) });
  return sanitizeSvg(r);
}
async function generateImageNode(n) {
  if (!AI.fn) return toast("Open Studio in Claude to generate images with AI.");
  if (!str(n.p.prompt)) return toast("Describe the image first.");
  n.status = "building"; paintNode(n.id); S.inspFor = null; paintInspector();
  try { const st = styleOf(n); n.p.src = await drawImage(n.p.prompt, st?.palette || PALETTES.webshow.c); n.p.alt = n.p.alt || n.p.prompt.slice(0, 120); n.status = "ready"; hist(n, "Image drawn by Showrunner"); commitNode(n); toast("Image ready"); }
  catch (e) { n.status = n.p.src ? "ready" : "failed"; commitNode(n); toast(e?.code === "invalid_svg" ? "The drawing came back broken. Try again." : errCopy(e)); }
  paintAll(); G.edgesFrom(n.id).forEach(e => paintNode(e.to));
}
async function rewriteSection(n, i, how) {
  const s = n.p.sections[i]; S.preview.busy = "rewrite"; repaintPreview();
  try {
    const r = await AI.json(`Rewrite one section of a landing page. Keep its "type" and structure; change copy only (and layout if asked). Instruction: <input>${how}</input>\n${RULES}\n${inputsBlock(n)}\nCURRENT SECTION JSON: ${JSON.stringify({ ...s, id: undefined, hidden: undefined })}\nReply with ONLY the updated section JSON object.`);
    const ns = normSections([{ ...r, type: s.type, visualId: s.visualId }], n, G.up(n.id, "images").length).find(x => x.type === s.type);
    if (ns) { ns.id = s.id; if (s.visualId) ns.visualId = s.visualId; if (s.type === "hero" && !r.layout) ns.layout = s.layout; n.p.sections[i] = ns; hist(n, "Section rewritten: " + how.slice(0, 60)); commitNode(n); toast("Section rewritten"); }
  } catch (e) { toast(errCopy(e)); }
  S.preview.busy = null; repaintPreview();
}
async function fillSectionAI(n, i) {
  const s = n.p.sections[i];
  try {
    const r = await AI.json(`Write the copy for a new "${s.type}" section of this landing page, matching the rest of the page.\n${RULES}\n${inputsBlock(n)}\nPAGE SO FAR: ${JSON.stringify(n.p.sections.filter(x => x.id !== s.id).map(x => ({ type: x.type, headline: x.headline || x.title })))}\nSECTION SHAPE: ${JSON.stringify({ ...s, id: undefined, hidden: undefined })}\nReply with ONLY the filled section JSON object, same keys.`, { modelTier: "quick" });
    const ns = normSections([{ ...r, type: s.type, visualId: s.visualId, layout: s.layout }], n, G.up(n.id, "images").length).find(x => x.type === s.type);
    if (ns && S.nodes[n.id]) { const idx = n.p.sections.findIndex(x => x.id === s.id); if (idx >= 0) { ns.id = s.id; ns.visualId = s.visualId; if (s.layout) ns.layout = s.layout; n.p.sections[idx] = ns; commitNode(n); if (S.preview) repaintPreview(); } }
  } catch (e) { console.warn(e); }
}

/* ---------- actions ---------- */
Object.assign(A, {
  preview(t) { const n = selNode(); if (n?.type === "page") { S.preview = { nodeId: n.id, dev: innerWidth < 700 ? "mobile" : "desktop", mode: t?.dataset?.mode === "edit" ? "edit" : "preview", sec: null, imgFor: null }; paintLayer(); } },
  previewpop() { const n = selNode(); const pg = pagesFeedingPopup(n)[0]; if (pg) { S.preview = { nodeId: pg.id, dev: "desktop", mode: "preview", force: n.id }; paintLayer(); } },
  editself() { const n = selNode(); if (n.type === "page" && n.p.sections?.length) return A.preview({ dataset: { mode: "edit" } }); $("#inspb")?.querySelector("input,textarea,select")?.focus(); },
  closepreview() { pvCleanup?.(); pvCleanup = null; S.preview = null; paintLayer(); paintAll(); },
  pvmode(t) { S.preview.mode = t.dataset.v; S.preview.force = null; S.preview.adding = false; S.preview.imgFor = null; repaintPreview(); },
  pvdev(t) { S.preview.dev = t.dataset.v; S.preview.force = null; repaintPreview(); },
  pvpop(t) { S.preview.force = t.dataset.id; repaintPreview(); },
  pvsec(t, e) { if (e?.target.closest("button") && e.target.closest("button") !== t) return; const i = +t.dataset.i; S.preview.sec = i; S.preview.imgFor = null; repaintPreview(); $(`#pf [data-sec="${i}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" }); },
  pvmove(t) { const i = +t.dataset.i, j = i + +t.dataset.d; pvEdit((n, s) => { [s[i], s[j]] = [s[j], s[i]]; }, "Moved a section"); S.preview.sec = j; markSel(); repaintPreview(); },
  pvhide(t) { const i = +t.dataset.i; pvEdit((n, s) => { s[i].hidden = !s[i].hidden; }, "Toggled a section"); },
  pvdel(t) { const i = +t.dataset.i; pvEdit((n, s) => { s.splice(i, 1); }, "Removed a section"); S.preview.sec = null; repaintPreview(); },
  pvadd() { S.preview.adding = true; S.preview.imgFor = null; repaintPreview(); },
  pvaddclose() { S.preview.adding = false; repaintPreview(); },
  pvtpl(t) {
    const n = S.nodes[S.preview.nodeId]; const sec = tplSection(t.dataset.k, n); const secs = n.p.sections;
    let at = S.preview.sec != null ? S.preview.sec + 1 : secs.findIndex(s => s.type === "footer"); if (at < 0) at = secs.length;
    const ai = AI.fn && ($("#pvaifill")?.checked ?? true);
    pvEdit((nn, s) => { s.splice(at, 0, sec); }, "Added a " + sec.type + " section");
    S.preview.adding = false; S.preview.sec = at; repaintPreview();
    setTimeout(() => $(`#pf [data-sec="${at}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 60);
    if (ai && !["footer", "image", "stats", "proof"].includes(sec.type)) { toast("Showrunner is writing the copy…"); fillSectionAI(n, at); }
  },
  pvimg(t) { S.preview.imgFor = +t.dataset.i; S.preview.sec = +t.dataset.i; S.preview.imgPrompt = ""; repaintPreview(); },
  pvflip(t) { const i = S.preview.sec ?? S.preview.imgFor; pvEdit((n, s) => { s[i].flip = t.dataset.v === "1"; }, "Moved the hero image"); },
  pvfocusreset() { const i = S.preview.imgFor ?? S.preview.sec; pvEdit((n, s) => { delete s[i].fx; delete s[i].fy; }, "Reset image position"); },
  pvimgclose() { S.preview.imgFor = null; repaintPreview(); },
  pvpick(t) { setSecImage(S.preview.imgFor, t.dataset.id, "Changed a section image"); },
  async pvgen() {
    const n = S.nodes[S.preview.nodeId]; const i = S.preview.imgFor; const prompt = str($("#pvimgprompt")?.value); if (!prompt) return toast("Describe the image first.");
    S.preview.imgPrompt = prompt; S.preview.busy = "image"; repaintPreview();
    const pal = (styleOf(n)?.palette) || PALETTES.webshow.c;
    try {
      let img;
      if (AI.fn) { const src = await drawImage(prompt, pal); img = addImageNodeFor(n, { title: prompt.split(/[,.—-]/)[0].slice(0, 36) || "AI image", p: { source: "ai", src, prompt, alt: prompt.slice(0, 120) } }); hist(img, "Image drawn by Showrunner"); commitNode(img); }
      else img = addImageNodeFor(n, { title: "Concept frame", p: { source: "concept", motif: MOTIFS[Math.floor(Math.random() * MOTIFS.length)], alt: prompt.slice(0, 120) } });
      S.preview.busy = null; setSecImage(i, img.id, "Generated a new image"); toast("New image added to the page and the canvas");
    } catch (e) { S.preview.busy = null; repaintPreview(); toast(e?.code === "invalid_svg" ? "The drawing came back broken. Try again." : errCopy(e)); }
  },
  pvrewrite() { const how = str($("#pvask")?.value); if (!how) return toast("Say how to change the section."); rewriteSection(S.nodes[S.preview.nodeId], S.preview.sec, how); },
  genimg() { generateImageNode(selNode()); },
  secimg(t) { const n = selNode(); const s = n.p.sections[+t.dataset.i]; const ups = G.up(n.id, "images"); if (!ups.length) return; const cur1 = pageImgId(n, s.visualId); const k = ups.findIndex(u => u.id === cur1); s.visualId = ups[(k + 1) % ups.length].id; commitNode(n); paintAll(); },
});

/* page clicks inside the editor */
document.addEventListener("click", (e) => {
  if (!S.preview || S.preview.mode !== "edit") return;
  const secEl = e.target.closest("#pf [data-sec]"); if (!secEl) return;
  if (focusDragMoved) { focusDragMoved = false; e.preventDefault(); e.stopPropagation(); return; }
  const i = +secEl.dataset.sec; e.preventDefault();
  if (e.target.closest("img")) { S.preview.sec = i; S.preview.imgFor = i; S.preview.adding = false; S.preview.imgPrompt = ""; repaintPreview(); return; }
  if (S.preview.sec !== i) { S.preview.sec = i; S.preview.imgFor = null; S.preview.adding = false; const pan = $("#pvpanel"); if (pan) pan.innerHTML = panelHTML(S.nodes[S.preview.nodeId], pageValue(S.nodes[S.preview.nodeId], .8)); markSel(); }
}, true);
document.addEventListener("change", async (e) => {
  const t = e.target;
  if (t.id === "pvlayout" && S.preview) pvEdit((n, s) => { s[S.preview.sec].layout = t.value; }, "Changed hero layout");
  if (t.dataset?.change === "pvupload" && t.files?.[0] && S.preview) {
    const n = S.nodes[S.preview.nodeId]; const i = S.preview.imgFor; toast("Uploading…");
    try { const r = await Store.uploadImage(t.files[0]); const img = addImageNodeFor(n, { title: t.files[0].name.replace(/\.[^.]+$/, "").slice(0, 40), p: { source: "upload", src: r.src, assetId: r.assetId || "" } }); setSecImage(i, img.id, "Uploaded a section image"); toast("Uploaded"); }
    catch (x) { console.warn(x); toast("Couldn't upload that image."); }
  }
});

/* ---------- drag an image to move it inside its frame ---------- */
let focusDragMoved = false;
function focusDrag(e, img, fx0, fy0, onMove, onEnd) {
  const r = img.getBoundingClientRect(); const sx = e.clientX, sy = e.clientY; let moved = false, fx = fx0, fy = fy0;
  img.setPointerCapture?.(e.pointerId); document.body.style.cursor = "grabbing";
  const mv = (ev) => { const dx = ev.clientX - sx, dy = ev.clientY - sy; if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return; moved = true;
    fx = Math.round(Math.min(100, Math.max(0, fx0 - dx / r.width * 100))); fy = Math.round(Math.min(100, Math.max(0, fy0 - dy / r.height * 100))); onMove(fx, fy); };
  const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); document.body.style.cursor = ""; onEnd(fx, fy, moved); };
  window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
}
document.addEventListener("pointerdown", (e) => {
  if (!S.preview || S.preview.mode !== "edit") return;
  const img = e.target.closest('#pf img[data-img-sec="1"]'); if (!img) return;
  const secEl = img.closest("[data-sec]"); if (!secEl) return; const i = +secEl.dataset.sec;
  const n = S.nodes[S.preview.nodeId]; const s = n.p.sections[i]; e.preventDefault();
  focusDrag(e, img, s.fx ?? 50, s.fy ?? 50, (fx, fy) => { img.style.objectPosition = `${fx}% ${fy}%`; },
    (fx, fy, moved) => { if (!moved) return; focusDragMoved = true; setTimeout(() => (focusDragMoved = false), 300); s.fx = fx; s.fy = fy; hist(n, "Moved an image"); commitNode(n); S.preview.sec = i; S.preview.imgFor = i; const pan = $("#pvpanel"); if (pan) pan.innerHTML = panelHTML(n, pageValue(n, .8)); markSel(); });
});
document.addEventListener("input", (e) => {
  if (!S.preview || !["pvfx", "pvfy"].includes(e.target.id)) return;
  const n = S.nodes[S.preview.nodeId]; const i = S.preview.imgFor; const s = n.p.sections[i]; if (!s) return;
  s[e.target.id === "pvfx" ? "fx" : "fy"] = +e.target.value; if (s.fy == null) s.fy = 50; if (s.fx == null) s.fx = 50;
  e.target.parentElement.querySelector("output").textContent = e.target.value + "%";
  $$(`#pf [data-sec="${i}"] img[data-img-sec="1"]`).forEach(im => (im.style.objectPosition = `${s.fx}% ${s.fy}%`));
  clearTimeout(editT); editT = setTimeout(() => { hist(n, "Moved an image"); commitNode(n); }, 400);
});
