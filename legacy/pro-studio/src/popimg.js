/* ============================================================
   Popups: always anchored to the viewport, with an optional image
   (top, side or background) that carries editable overlays
   ============================================================ */
{ const f = NT.popup.params; NT.popup.params = () => ({ imgLayout: "", imgOv: null, ...f() }); }
const POP_LAYOUTS = [["none", "No image"], ["top", "Top"], ["side", "Side"], ["background", "Background"]];
const POP_BG_OV = () => ({ kind: "linear", angle: 0, blend: "normal", stops: [{ c: "ink", a: 85, p: 0 }, { c: "ink", a: 35, p: 100 }] });
const popLayout = (o) => (o.pimg ? (o.imgLayout && o.imgLayout !== "" ? o.imgLayout : "top") : "none");
const popImgOv = (o) => o.imgOv ?? (popLayout(o) === "background" ? POP_BG_OV() : null);
function popupImgOf(n, scale = .6) { const u = G.up(n.id, "image")[0]; return u ? imageValue(u, scale) : null; }

/* one renderer for the live popup, the preview and the editor (ce wraps editable text) */
function popupHTML(o, { ce } = {}) {
  const lay = popLayout(o); const t = (k, v, tag, cls = "") => ce ? ce(k, v, tag, cls) : `<${tag}${cls ? ` class="${cls}"` : ""}>${esc(v)}</${tag}>`;
  const img = lay !== "none" ? `<div class="pimg"><img alt="${esc(o.pimg.alt || "")}" src="${o.pimg.src}" style="${o.pimg.style || ""}" draggable="false">${o.pimg.ov ? ovLayer(o.pimg.ov, "img") : ""}${ovLayer(popImgOv(o))}</div>` : "";
  const cta = ce ? (o.email ? `<div style="display:grid;gap:8px"><input placeholder="you@example.com" aria-label="Email preview" tabindex="-1" readonly>${t("cta", o.cta || "Send", "span", "bt")}</div>` : t("cta", o.cta || "OK", "span", "bt"))
    : o.email ? `<form style="display:grid;gap:8px" novalidate><input type="email" placeholder="you@example.com" aria-label="Email"><button class="bt">${esc(o.cta || "Send")}</button><div class="ok" hidden>${esc(o.success)}</div></form>` : `<button class="bt" data-close="1">${esc(o.cta || "OK")}</button>`;
  return `<div class="wp ${lay !== "none" ? "hasimg img-" + lay : ""}" role="dialog" aria-label="${esc(o.headline || "Popup")}" ${ce ? 'style="animation:none"' : ""}>${img}<button class="x" aria-label="Close" ${ce ? 'tabindex="-1"' : ""}>×</button>
    <div class="wp-c"><div style="display:grid;gap:8px">${t("headline", o.headline || "Popup headline", "h3")}${t("body", o.body || (ce ? "Short offer text" : ""), "p")}</div>${cta}</div></div>`;
}

/* ---------- a viewport layer over the visible part of a preview ---------- */
function previewViewport(host, scroller) {
  const body = scroller?.parentElement; if (!body) return { el: host, clean: () => {} };
  let vp = body.querySelector(":scope > .pv-vp"); if (!vp) { vp = document.createElement("div"); vp.className = "pv-vp"; body.appendChild(vp); }
  const place = () => { const br = body.getBoundingClientRect(), sr = scroller.getBoundingClientRect(), pr = host.getBoundingClientRect(); vp.style.left = Math.max(sr.left, pr.left) - br.left + "px"; vp.style.width = Math.min(pr.width, sr.width) + "px"; vp.style.top = sr.top - br.top + "px"; vp.style.height = sr.height + "px"; };
  place(); const ro = new ResizeObserver(place); ro.observe(scroller); ro.observe(host); window.addEventListener("resize", place);
  return { el: vp, clean: () => { ro.disconnect(); window.removeEventListener("resize", place); vp.remove(); } };
}

/* ---------- inspector: image group ---------- */
function popupImageGroup(n) {
  const u = G.up(n.id, "image")[0]; const o = { ...n.p, pimg: u ? imageValue(u, .3) : null }; const lay = popLayout(o);
  if (!u) return `<div class="grp"><h4>Image</h4><small class="faint">Wire an Image node into the popup's Image input, or add one here. It can sit on top, on the side or behind the text.</small><button class="btn sm" style="justify-self:start" data-act="popaddimg">${ICON.plus} Add an image</button></div>`;
  const pg = pagesFeedingPopup(n)[0]; const pal = (styleOf(n) || (pg && styleOf(pg)) || DEF_DIR).palette;
  return `<div class="grp"><h4>Image</h4><div class="swrow" style="gap:8px;align-items:center"><img class="pop-th" alt="" src="${o.pimg.src}" style="${o.pimg.style}"><span class="muted" style="font-size:12px">${esc(u.title)}</span><button class="btn sm ghost" data-act="gonode" data-id="${u.id}">Adjust image</button></div>
    <div class="fld"><span>Layout</span><div class="seg" style="justify-self:start">${POP_LAYOUTS.map(([k, l]) => `<button data-act="poplay" data-v="${k}" aria-pressed="${lay === k}">${l}</button>`).join("")}</div></div>
    ${n.p.position === "bottom" && lay === "top" ? `<small class="faint">In a bottom bar, “Top” shows as a small image on the side.</small>` : ""}</div>
    ${lay !== "none" ? ovPanel(popImgOv(o), pal, "popimg", "Image overlay", lay === "background" ? "Keeps the text readable on top of the image." : "") : ""}`;
}
Object.assign(A, {
  poplay(b) { const n = selNode() || (S.nodeEd && S.nodes[S.nodeEd.id]); if (!n) return; n.p.imgLayout = b.dataset.v; if (b.dataset.v === "background" && !n.p.imgOv) n.p.imgOv = null; hist(n, "Popup image layout changed"); commitNode(n); paintNode(n.id); S.inspFor = null; paintInspector(); if (S.nodeEd) neRepaint(); },
  popaddimg() { const n = selNode() || (S.nodeEd && S.nodes[S.nodeEd.id]); if (!n) return; const img = addNode("image", n.x - 320, n.y + 40, { title: "Popup image" }); connect(img.id, "image", n.id, "image"); const st = G.up(n.id, "style")[0] || (pagesFeedingPopup(n)[0] && G.up(pagesFeedingPopup(n)[0].id, "style")[0]); if (st) connect(st.id, "style", img.id, "style"); n.p.imgLayout = "top"; hist(n, "Image added"); commitNode(n); paintAll(); if (S.nodeEd) neRepaint(); toast("Image added. Upload your own or generate one on the Image node."); },
});
/* overlay editor target for the popup image */
const _ovTarget0 = ovTarget;
ovTarget = function (t) {
  if (t !== "popimg") return _ovTarget0(t);
  const n = (S.nodeEd && S.nodes[S.nodeEd.id]?.type === "popup") ? S.nodes[S.nodeEd.id] : selNode(); if (n?.type !== "popup") return null;
  const pg = pagesFeedingPopup(n)[0];
  return { n, pal: (styleOf(n) || (pg && styleOf(pg)) || DEF_DIR).palette,
    own: () => (n.p.imgOv && n.p.imgOv.stops ? n.p.imgOv : (n.p.imgOv = clone(popImgOv({ ...n.p, pimg: popupImgOf(n) }) || { kind: "none", stops: [] }))),
    cur: () => popImgOv({ ...n.p, pimg: popupImgOf(n) }), set: (o) => { n.p.imgOv = o; },
    els: () => $$(".wp .pimg .ov.sec"), done: () => paintNode(n.id) };
};
