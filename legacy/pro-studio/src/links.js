/* ============================================================
   Link node: where ads, posts and page buttons send people.
   Also tightens which blocks can connect to which.
   ============================================================ */
ICON.link = P('<path d="M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 0 1 4 4l-1 1M9 11.5l-1 1a2.8 2.8 0 0 1-4-4l1-1"/>');
PT_LABEL.link = "Link"; PT_LABEL.ad = "Ad";
NT.link = {
  label: "Link", cat: "content", icon: "link", color: "#86b4e0", desc: "Where an ad, post or button sends people",
  inputs: [{ k: "page", t: "page", label: "Landing page" }], outputs: [{ k: "link", t: "link", label: "Link" }],
  params: () => ({ url: "", utm: true, campaign: "" }),
};
/* the connection rules: only blocks that really work together can be wired */
NT.page.inputs = [...NT.page.inputs.filter(i => i.k !== "link"), { k: "link", t: "link", label: "Buttons go to" }];
NT.carousel.inputs = [...NT.carousel.inputs.filter(i => i.k !== "link"), { k: "link", t: "link", label: "Link" }];
NT.ad.inputs = [{ k: "text", t: "text", label: "Copy & brief", multi: true }, { k: "link", t: "link", label: "Final URL" }];
NT.ad.outputs = [{ k: "post", t: "ad", label: "Ad" }];
NT.image.inputs = [...NT.image.inputs.filter(i => i.k !== "link"), { k: "link", t: "link", label: "Link" }];
NT.adchannel.inputs = [{ k: "ads", t: "ad", label: "Ads", multi: true }, { k: "boost", t: "post", label: "Boost posts", multi: true }];
NT.social.inputs = [{ k: "posts", t: "post", label: "Posts", multi: true }];
NT.scheduler.inputs = [];

/* ---------- resolve a link ---------- */
function pubFor(page) { return page && Object.values(S.nodes).find(x => x.type === "publish" && G.up(x.id, "page")[0]?.id === page.id); }
function pageAddress(page) { const pub = pubFor(page); return pub?.p.slug ? `${location.origin}${location.pathname}#p-${pub.p.slug}` : ""; }
function linkInfo(n, source) {
  const L = G.up(n.id, "link")[0]; if (!L) return null;
  const page = G.up(L.id, "page")[0]; let url = page ? pageAddress(page) : str(L.p.url);
  if (url && !/^https?:\/\//.test(url) && !url.startsWith(location.origin)) url = "https://" + url;
  const live = page ? !!pubFor(page)?.p.live : true;
  if (url && L.p.utm !== false && source) { const camp = slugify(L.p.campaign || cur()?.name || "webshow"); const [base, hash0] = url.split("#"); const q = `utm_source=${encodeURIComponent(source)}&utm_medium=${n.type === "carousel" || n.type === "image" ? "social" : "paid"}&utm_campaign=${camp}`; url = hash0 != null ? `${base}${base.includes("?") ? "&" : "?"}${q}#${hash0}` : `${url}${url.includes("?") ? "&" : "?"}${q}`; }
  return { node: L, page, url, live, display: page ? (pubFor(page)?.p.slug ? "/" + pubFor(page).p.slug : "landing page (not published)") : str(L.p.url).replace(/^https?:\/\//, "") };
}
const linkDomain = (n) => { const li = linkInfo(n); if (!li) return ""; if (li.page) return "webshow.ai" + (li.display.startsWith("/") ? li.display : ""); try { return new URL(li.url).hostname.replace(/^www\./, ""); } catch { return li.display; } };

/* ---------- inspector, node body ---------- */
const _tb1 = toolBody, _ti1 = toolInspector;
toolBody = function (n) {
  if (n.type === "link") { const page = G.up(n.id, "page")[0]; const users = G.edgesFrom(n.id).length;
    return `<div class="pv-link">${ICON.link}<span>${page ? esc(page.title) + (pubFor(page)?.p.live ? "" : " · not live yet") : esc(n.p.url || "No address yet")}</span></div><div class="pv-rule"><span class="chip">${users} using it</span>${n.p.utm !== false ? `<span class="chip">Tracked</span>` : ""}</div>`; }
  return _tb1(n);
};
toolInspector = function (n) {
  if (n.type === "link") { const page = G.up(n.id, "page")[0]; const users = G.edgesFrom(n.id).map(e => S.nodes[e.to]).filter(Boolean);
    return `<div class="grp">${page ? `<div class="wellbox" style="gap:6px"><b>Goes to “${esc(page.title)}”</b><span class="muted" style="font-size:12px">${pubFor(page)?.p.live ? esc(pageAddress(page)) : "The page isn't published yet. Ads and posts using this link should wait until it's live."}</span></div>` : fP(n, "url", "Web address", { ph: "yourshop.fi/offer" })}
      <small class="faint">${page ? "Unwire the landing page to send people somewhere else, like a web shop or booking system." : "Or wire a landing page's Page output into this node to send people there."}</small></div>
      <div class="grp"><h4>Tracking</h4><label class="check"><input type="checkbox" id="lk_utm_${n.id}" data-p="utm" ${n.p.utm !== false ? "checked" : ""}> Add tracking tags so Live can tell which ad or post brought each visitor</label>${n.p.utm !== false ? fP(n, "campaign", "Campaign name", { ph: slugify(cur()?.name || "campaign") }) : ""}</div>
      <div class="grp"><h4>Used by</h4>${users.map(x => { const li = linkInfo(x, x.type === "ad" ? "google" : x.type === "metaad" ? "meta" : x.type === "page" ? "" : "instagram"); return `<div class="li" style="padding:3px 0"><span class="nico" style="--nc:${NT[x.type].color}">${ICON[NT[x.type].icon]}</span><span class="t"><b style="font-weight:500">${esc(x.title)}</b><span class="mono" style="font-size:11px">${esc((li?.url || "").replace(location.origin + location.pathname, "…"))}</span></span></div>`; }).join("") || `<small class="faint">Wire this Link into ads, carousels, image posts or a page's buttons.</small>`}</div>`; }
  return _ti1(n);
};

/* ---------- old graphs: move wires to the right ports, drop impossible ones ---------- */
function migrateEdges() {
  if (isEx()) return; let ch = false;
  Object.values(S.edges).forEach(e => { const a = S.nodes[e.from], b = S.nodes[e.to]; if (!a || !b) return;
    if (b.type === "adchannel" && e.toPort === "ads" && a.type === "carousel") { e.toPort = "boost"; Store.put("edges", S.showId, e); ch = true; return; }
    const o = G.outDef(a, e.fromPort), i = G.inDef(b, e.toPort); if (!o || !i || o.t !== i.t) { delete S.edges[e.id]; Store.del("edges", S.showId, e.id); ch = true; } });
  if (ch) paintAll?.();
}
