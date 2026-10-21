/* ============================================================
   Text on image blocks: turn any image into an ad or post creative
   ============================================================ */
{ const f = NT.image.params; NT.image.params = () => ({ txt: null, caption: "", ...f() }); }
NT.image.outputs = [{ k: "image", t: "image", label: "Image" }, { k: "post", t: "post", label: "Post" }];
const TXT_DEF = () => ({ headline: "", sub: "", cta: "", pos: "bottom", align: "left", size: "m", tone: "light", shade: true });
const hasTxt = (t) => !!(t && (t.headline || t.sub || t.cta));
function imgTextHTML(n, { edit = false, scale = 1 } = {}) {
  const t = n.p.txt; if (!edit && !hasTxt(t)) return ""; const x = { ...TXT_DEF(), ...(t || {}) };
  const st = styleOf(n) || DEF_DIR; const fp = FONT_PAIRS[st.fontPair] || FONT_PAIRS.pixel; const [ink, pri, , paper] = st.palette;
  const ce = (k, v, tag, cls, ph) => edit ? `<${tag} class="${cls}" data-itx="${k}" contenteditable="true" spellcheck="false" data-ph="${ph}">${esc(v)}</${tag}>` : v ? `<${tag} class="${cls}">${esc(v)}</${tag}>` : "";
  return `<div class="itx pos-${x.pos} al-${x.align} sz-${x.size} tone-${x.tone} ${x.shade ? "shade" : ""}" style="--it-acc:${pri};--it-on:${lum(pri) > .6 ? ink : "#fff"};--it-head:${fp.head};--it-body:${fp.body};--it-w:${fp.w || 800};--it-ink:${ink};--it-paper:${paper}">
    <div class="itx-in">${ce("headline", x.headline, "b", "it-h", "Headline")}${ce("sub", x.sub, "span", "it-s", "Supporting line")}${ce("cta", x.cta, "span", "it-b", "Button")}</div></div>`;
}
function imageTextGroup(n) {
  const x = { ...TXT_DEF(), ...(n.p.txt || {}) }; const on = hasTxt(n.p.txt);
  const seg = (k, opts) => `<div class="seg" style="justify-self:start">${opts.map(([v, l]) => `<button data-act="imgtxt" data-k="${k}" data-v="${v}" aria-pressed="${x[k] === v}">${l}</button>`).join("")}</div>`;
  return `<div class="grp"><h4>Text on image</h4><small class="faint">Turns this image into a ready creative for ads and posts. Pages use their own text, so it isn't shown there.</small>
    <label class="fld"><span>Headline</span><input class="inp" id="itx_h_${n.id}" data-p="txt.headline" value="${esc(x.headline)}" maxlength="60" placeholder="e.g. Your weekend needs a sauna"></label>
    <label class="fld"><span>Supporting line</span><input class="inp" id="itx_s_${n.id}" data-p="txt.sub" value="${esc(x.sub)}" maxlength="90"></label>
    <label class="fld"><span>Button</span><input class="inp" id="itx_b_${n.id}" data-p="txt.cta" value="${esc(x.cta)}" maxlength="24" placeholder="Optional"></label>
    ${on ? `<div class="fld"><span>Position</span>${seg("pos", [["top", "Top"], ["center", "Middle"], ["bottom", "Bottom"]])}</div><div class="fld"><span>Align</span>${seg("align", [["left", "Left"], ["center", "Center"]])}</div>
    <div class="fld"><span>Size</span>${seg("size", [["s", "S"], ["m", "M"], ["l", "L"]])}</div><div class="fld"><span>Text colour</span>${seg("tone", [["light", "Light"], ["dark", "Dark"]])}</div>
    <label class="check"><input type="checkbox" id="itx_sh_${n.id}" data-p="txt.shade" ${x.shade ? "checked" : ""}> Darken behind the text</label>
    <button class="btn sm" style="justify-self:start" data-act="openeditor" data-id="${n.id}">${ICON.fit} Edit on the image</button>` : ""}
    <label class="fld"><span>Post caption</span><textarea class="ta" id="itx_c_${n.id}" data-p="caption" style="min-height:52px" placeholder="Used when this image is posted on its own">${esc(n.p.caption || "")}</textarea></label>
    <button class="btn sm" style="justify-self:start" data-act="socopen" data-id="${n.id}">${ICON.share} Post this image</button></div>`;
}
A.imgtxt = (b) => { const n = selNode() || (S.nodeEd && S.nodes[S.nodeEd.id]); if (!n) return; n.p.txt = { ...TXT_DEF(), ...(n.p.txt || {}), [b.dataset.k]: b.dataset.v }; hist(n, "Text on image changed"); commitNode(n); paintNode(n.id); G.edgesFrom(n.id).forEach(e => paintNode(e.to)); S.inspFor = null; paintInspector(); if (S.nodeEd) neRepaint(); };
/* inline editing on the image in the editor */
let itxT;
document.addEventListener("input", (e) => {
  const el = e.target; if (!el.dataset?.itx || !el.isContentEditable) return; const n = S.nodeEd && S.nodes[S.nodeEd.id]; if (!n) return;
  n.p.txt = { ...TXT_DEF(), ...(n.p.txt || {}), [el.dataset.itx]: el.textContent.slice(0, 90) };
  $$(`#nestage [data-itx="${el.dataset.itx}"]`).forEach(x => { if (x !== el) x.textContent = el.textContent; });
  clearTimeout(itxT); itxT = setTimeout(() => { hist(n, "Text on image edited"); commitNode(n); paintNode(n.id); G.edgesFrom(n.id).forEach(x => paintNode(x.to)); neRepaint("side"); }, 400);
});
