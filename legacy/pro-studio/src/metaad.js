/* ============================================================
   Facebook & Instagram ad block: formats, texts and button layouts
   ============================================================ */
const META_CTAS = [["learn", "Learn more"], ["book", "Book now"], ["signup", "Sign up"], ["shop", "Shop now"], ["contact", "Contact us"], ["offer", "Get offer"], ["quote", "Get quote"]];
const META_FORMATS = [["feed11", "Feed 1:1", "1/1"], ["feed45", "Feed 4:5", "4/5"], ["story", "Story 9:16", "9/16"], ["landscape", "Link 1.91:1", "1.91/1"]];
NT.metaad = {
  label: "Facebook & Instagram ad", cat: "block", icon: "meta", color: "#8fa0d8", desc: "Feed, story and link ads with texts and a button",
  inputs: [{ k: "text", t: "text", label: "Copy & brief", multi: true }, { k: "images", t: "image", label: "Images", multi: true }, { k: "style", t: "style", label: "Style" }, { k: "link", t: "link", label: "Link" }],
  outputs: [{ k: "post", t: "ad", label: "Ad" }],
  params: () => ({ primary: "", headline: "", desc: "", cta: "learn", format: "feed45", ctaStyle: "bar", img: "" }),
};
BUILDABLE.add("metaad");
BUILD_AI.metaad = async (n) => {
  const r = await AI.json(`Write a Facebook and Instagram feed ad.\n${RULES}\n${inputsBlock(n)}\nReply with ONLY JSON: {"primary": string (max 125 characters, the text above the image), "headline": string (max 40 characters), "desc": string (max 30 characters), "cta": one of ${JSON.stringify(META_CTAS.map(x => x[0]))}}`);
  if (!str(r?.primary) && !str(r?.headline)) return BUILD_OFF.metaad(n);
  return { p: { primary: str(r.primary), headline: str(r.headline), desc: str(r.desc), cta: META_CTAS.some(x => x[0] === r.cta) ? r.cta : "learn" } };
};
BUILD_OFF.metaad = (n) => { const b = briefOf(n) || {}; const g = b.goal || "leads";
  return { p: { primary: [b.offer, b.audience && `Made for ${b.audience.toLowerCase()}.`].filter(Boolean).join(" ").slice(0, 125) || "Tell people what you offer and why now.", headline: (b.cta || b.business || "Find out more").slice(0, 40), desc: (b.business || "").slice(0, 30), cta: { bookings: "book", sell: "shop", event: "signup", launch: "signup" }[g] || "learn" } }; };

const metaImg = (n) => { const ups = G.up(n.id, "images"); return ups.find(u => u.id === n.p.img) || ups[0] || null; };
function metaCreative(n, fmt, { edit = false, big = false } = {}) {
  const p = n.p; const im = metaImg(n); const v = im ? imageValue(im, big ? .7 : .3) : null; const b = briefOf(n) || {}; const biz = b.business || cur()?.name || "Your business";
  const ar = META_FORMATS.find(f => f[0] === fmt)?.[2] || "4/5"; const cta = META_CTAS.find(c => c[0] === p.cta)?.[1] || "Learn more"; const dom = linkDomain(n) || "yourdomain.fi";
  const st = styleOf(n) || DEF_DIR; const ce = (k, val, tag, cls, ph) => edit ? `<${tag} class="${cls}" data-ne="${k}" contenteditable="true" spellcheck="false" data-ph="${ph}">${esc(val)}</${tag}>` : `<${tag} class="${cls}">${esc(val || ph)}</${tag}>`;
  const media = `<div class="mc-media" style="aspect-ratio:${ar};${palVars(st.palette)}">${v ? `<img alt="${esc(v.alt)}" src="${v.src}" style="${v.style}" draggable="false">${v.ov ? ovLayer(v.ov, "img") : ""}${imgTextHTML(im)}` : `<div class="noimg" style="position:absolute;inset:0;aspect-ratio:auto"></div>`}${p.ctaStyle === "onimage" && fmt !== "story" ? `<span class="mc-onbtn" style="--it-acc:${st.palette[1]};--it-on:${lum(st.palette[1]) > .6 ? st.palette[0] : "#fff"}">${esc(cta)}</span>` : ""}</div>`;
  const head = `<div class="mc-head"><span class="mc-av">${esc(biz[0] || "W")}</span><span class="mc-who"><b>${esc(biz)}</b><small>Sponsored</small></span></div>`;
  if (fmt === "story") return `<div class="mcard story ${big ? "big" : ""}">${media}<div class="mc-story-top">${head}</div><div class="mc-story-bot">${ce("primary", p.primary, "p", "mc-prim", "Primary text")}<span class="mc-swipe">${ICON.up}${esc(cta)}</span></div></div>`;
  return `<div class="mcard ${fmt} ${big ? "big" : ""}">${head}${ce("primary", p.primary, "p", "mc-prim", "Primary text")}${media}
    ${p.ctaStyle === "onimage" ? `<div class="mc-bar min"><span class="mc-dom">${esc(dom.toUpperCase())}</span>${ce("headline", p.headline, "b", "mc-h", "Headline")}</div>` : `<div class="mc-bar"><span class="mc-txt"><span class="mc-dom">${esc(dom.toUpperCase())}</span>${ce("headline", p.headline, "b", "mc-h", "Headline")}${ce("desc", p.desc, "span", "mc-d", "Description")}</span><span class="mc-btn">${esc(cta)}</span></div>`}</div>`;
}

/* ---------- node body, inspector, editor ---------- */
const _tb2 = toolBody, _ti2 = toolInspector, _ts2 = toolStage;
toolBody = function (n) {
  if (n.type === "metaad") return n.p.primary || n.p.headline ? `<div class="pv-meta">${metaCreative(n, n.p.format === "story" ? "feed11" : n.p.format)}</div>` : `<div class="pv-text">Wire in a brief, images and a Link, then Build.</div>`;
  return _tb2(n);
};
const cnt = (v, max) => `<span class="cnt ${v.length > max ? "over" : ""}">${v.length}/${max}</span>`;
toolInspector = function (n) {
  if (n.type !== "metaad") return _ti2(n);
  const p = n.p; const ups = G.up(n.id, "images"); const li = linkInfo(n, "meta");
  return `<div class="grp"><h4>Destination</h4>${li ? `<div class="li" style="padding:2px 0"><span class="nico" style="--nc:${NT.link.color}">${ICON.link}</span><span class="t"><b style="font-weight:500">${esc(li.display)}</b><span>${li.live ? "Tracked as meta / paid" : "Not live yet: publish the page before the ad runs"}</span></span></div>` : `<small class="faint">Wire a Link node into this ad so it knows where to send people.</small>`}</div>
    <div class="grp"><h4>Texts</h4><label class="fld"><span>Primary text ${cnt(p.primary, 125)}</span><textarea class="ta" id="ma_p_${n.id}" data-p="primary" style="min-height:64px">${esc(p.primary)}</textarea></label>
      <label class="fld"><span>Headline ${cnt(p.headline, 40)}</span><input class="inp" id="ma_h_${n.id}" data-p="headline" value="${esc(p.headline)}"></label>
      <label class="fld"><span>Description ${cnt(p.desc, 30)}</span><input class="inp" id="ma_d_${n.id}" data-p="desc" value="${esc(p.desc)}"></label>
      ${fP(n, "cta", "Button", { sel: META_CTAS })}<small class="faint">Longer texts get cut off with “See more”. Text written on the image comes from the Image node.</small></div>
    <div class="grp"><h4>Format and layout</h4><div class="seg" style="justify-self:start;flex-wrap:wrap">${META_FORMATS.map(([k, l]) => `<button data-act="metafmt" data-v="${k}" aria-pressed="${p.format === k}">${l}</button>`).join("")}</div>
      <div class="fld"><span>Button layout</span><div class="seg" style="justify-self:start"><button data-act="metacta" data-v="bar" aria-pressed="${p.ctaStyle !== "onimage"}">Under the image</button><button data-act="metacta" data-v="onimage" aria-pressed="${p.ctaStyle === "onimage"}">On the image</button></div></div></div>
    <div class="grp"><h4>Image</h4>${ups.length ? `<div class="imgpick">${ups.map(u => { const im = imageValue(u, .2); return `<button data-act="metaimg" data-id="${u.id}" aria-pressed="${(metaImg(n)?.id) === u.id}" title="${esc(u.title)}"><img alt="" src="${im.src}" style="${im.style}"><span>${esc(u.title)}${hasTxt(u.p.txt) ? " · text" : ""}</span></button>`; }).join("")}</div>` : `<small class="faint">Wire Image nodes into this ad. Add text on the image in the Image node.</small>`}</div>
    <div class="grp"><button class="btn" style="justify-self:start" data-act="openeditor" data-id="${n.id}">${ICON.eye} See every placement</button></div>${customBox(n)}`;
};
toolStage = function (n) {
  if (n.type !== "metaad") return _ts2(n);
  const f = n.p.format; return `<div class="meta-stage"><div class="meta-main">${metaCreative(n, f, { edit: true, big: true })}</div>
    <div class="meta-alt"><b class="faint" style="font-size:12px">All placements</b>${META_FORMATS.map(([k, l]) => `<button class="meta-th ${k === f ? "on" : ""}" data-act="metafmt" data-v="${k}" aria-label="${l}"><div class="meta-th-in">${metaCreative(n, k)}</div><span>${l}</span></button>`).join("")}</div></div>`;
};
const metaSet = (k) => (b) => { const n = selNode() || (S.nodeEd && S.nodes[S.nodeEd.id]); if (!n) return; n.p[k] = b.dataset.v || b.dataset.id; hist(n, "Ad changed"); commitNode(n); paintNode(n.id); S.inspFor = null; paintInspector(); if (S.nodeEd) neRepaint(); };
Object.assign(A, { metafmt: metaSet("format"), metacta: metaSet("ctaStyle"), metaimg: metaSet("img") });
