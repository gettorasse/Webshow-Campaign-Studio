/* ============================================================
   Plans: Free, Basic and Advanced. Nodes and customisation tools
   unlock by plan. The prototype lets you switch plans to try them.
   ============================================================ */
ICON.cube = P('<path d="M8 1.8l5.5 3.1v6.2L8 14.2l-5.5-3.1V4.9z"/><path d="M2.5 4.9L8 8l5.5-3.1M8 8v6.2"/>');
const TIERS = {
  free: { label: "Starter", price: "€19", per: "/ month", who: "Try the idea on your own", feats: ["Build a show on the canvas", "Showrunner onboarding, Show DNA and the season plan", "Landing page, carousels and image posts", "Upload your own images", "Publish to staging.webshow.ai"], no: ["AI images", "Ads, quizzes and polls", "Your own domain"] },
  basic: { label: "Basic", price: "€49", per: "/ month", who: "Run a good show on your own", feats: ["Everything in Starter", "AI images and copy within your credits", "Meta and Google ads, boosts and budgets", "Quizzes, polls, popups, booking, cookie banner", "Weekly check and end report", "Your own domain"], no: ["Chatbots, configurators, 3D and games", "Per-section styling and overlays"] },
  advanced: { label: "Advanced", price: "€149", per: "/ month", who: "Heavy AI tools for big shows", feats: ["Everything in Basic", "Chatbot trained on the show", "Configurators, Three.js motion and mini games (soon)", "Per-section styles, overlays and gradients, colour palettes", "Manual links and full wiring control", "More credits"], no: ["Hands-on help from the Webshow studio"] },
  pro: { label: "Pro", price: "€690", per: "/ month", who: "Full access with the Webshow studio beside you", feats: ["Everything in Advanced", "Hands-on support from the Webshow creative studio", "Creative direction for every show", "Production help: photo, video and design", "Priority AI credits"], no: [] },
};
const ADDONS = [
  ["funnel", "Webshow Funnel", "We produce one complete campaign for one product or service.", "€1,500 + VAT"],
  ["direction", "Creative direction session", "A Webshow strategist reviews your show and sharpens the idea.", "Quoted per show"],
  ["production", "Photo and video production", "A shoot for your show's visuals, edited for every channel.", "Quoted per project"],
];
const TIER_RANK = { free: 0, basic: 1, advanced: 2, pro: 3 };
const NODE_TIER = { brief: 0, text: 0, image: 0, style: 0, page: 0, publish: 0, carousel: 0, popup: 1, metaad: 1, ad: 1, quiz: 1, poll: 1, scheduler: 1, cookie: 1, social: 1, adchannel: 1, chatbot: 2, palette: 2, link: 2 };
S.tier = lsGet("wss.tier", "basic"); if (!TIERS[S.tier]) S.tier = "basic";
S.addons = lsGet("wss.addons", {});
const tierAtLeast = (k) => TIER_RANK[S.tier] >= TIER_RANK[k];
const tierOfNode = (t) => ["free", "basic", "advanced"][NODE_TIER[t] ?? 0];
function nodeAllowed(t) { return tierAtLeast(tierOfNode(t)); }
{ const _lc = loadConnectors; loadConnectors = async function (f) { const r = await _lc(f); try { const v = await Store.getDoc("workspace/plan", null); if (v?.tier && TIER_RANK[v.tier] != null && v.tier !== S.tier) { S.tier = v.tier; lsSet("wss.tier", v.tier); render(); } } catch {} return r; }; }
function setTier(k) { S.tier = k; lsSet("wss.tier", k); Store.putDoc("workspace/plan", { tier: k, at: now(), by: Store.me.id }).catch(() => {}); }
function tierFootHTML() { return `<button class="srow brand" data-act="plans"><span class="ic">${ICON.lock}</span><span class="lbl">${TIERS[S.tier].label} plan</span><span class="ct">${S.tier === "pro" ? "studio support" : "upgrade"}</span></button>`; }
function lockedBox(what, need = "advanced") { return `<div class="grp"><div class="locked"><span class="nico" style="--nc:var(--brand)">${ICON.lock}</span><span class="t"><b>${esc(what)}</b><span>Part of the ${TIERS[need].label} plan</span></span><button class="btn sm" data-act="plans">See plans</button></div></div>`; }

/* library: locked nodes are visible but closed */
LIB_SOON.splice(0, LIB_SOON.length,
  ["cube", "Configurator", "Advanced", "Customers build their own product and see the price"], ["motion", "3D motion", "Advanced", "Three.js scenes and motion on the landing page"], ["game", "Mini game", "Advanced", "A playful episode that wins a lead"],
  ["video", "Video", "Soon", "AI video and uploads"], ["quote", "Testimonials", "Soon", "Customer reviews as a page section"], ["form", "Multi-step form", "Soon", "Qualify leads step by step"],
  ["calc", "Calculator", "Soon", "Price or savings calculator"], ["table", "Comparison table", "Soon", "Plans side by side"], ["mail", "Email", "Soon", "Follow-up sequence"]);
libraryPop = function () {
  const q = (S.libq || "").toLowerCase(); const L = S.lib;
  const items = Object.entries(NT).filter(([k, d]) => !q || (d.label + d.desc).toLowerCase().includes(q));
  const soon = LIB_SOON.filter(x => !q || (x[1] + x[3]).toLowerCase().includes(q));
  const W = Math.min(560, innerWidth - 24); const x = Math.max(12, Math.min(L.sx, innerWidth - W - 12)); const y = Math.max(12, Math.min(L.sy, innerHeight - 440));
  const item = ([k, d]) => { const ok = nodeAllowed(k); const t = tierOfNode(k);
    return `<button class="lib-item ${ok ? "" : "lk"}" data-act="${ok ? "addnode" : "plans"}" data-t="${k}" ${ok ? "" : `title="Part of the ${TIERS[t].label} plan"`}><span class="nico" style="--nc:${d.color}">${ICON[d.icon]}</span><span style="min-width:0"><b>${esc(d.label)}${ok ? "" : ` <span class="tierb">${ICON.lock}${TIERS[t].label}</span>`}${t === "advanced" && ok && S.tier === "advanced" ? ` <span class="tierb adv">Advanced</span>` : ""}</b><span>${esc(d.desc)}</span></span></button>`; };
  return `<div class="scrim" style="background:transparent;display:block" data-act="closelib"><div class="pop lib" data-stop="1" style="left:${x}px;top:${y}px" role="dialog" aria-label="Add a node">
    <label class="sb-search" style="margin:0">${ICON.search}<input id="libq" placeholder="Search nodes…" value="${esc(S.libq || "")}" autocomplete="off"></label>
    ${NODE_GROUPS.map(([g, label]) => { const it = items.filter(([, d]) => d.grp === g); return it.length ? `<h5>${label}</h5><div class="lib-grid">${it.map(item).join("")}</div>` : ""; }).join("")}
    ${soon.length ? `<h5>Coming to Webshow</h5><div class="lib-grid">${soon.map(([ic, l, tag, d]) => `<button class="lib-item" disabled title="${tag === "Advanced" ? "Advanced plan, coming soon" : "On the roadmap"}"><span class="nico" style="background:var(--bubble);color:var(--muted)">${ICON[ic] || ICON.cube}</span><span style="min-width:0"><b>${esc(l)} <span class="pro">${tag === "Advanced" ? "Advanced · soon" : tag}</span></b><span>${esc(d)}</span></span></button>`).join("")}</div>` : ""}
    <p class="faint" style="font-size:11.5px;padding:4px 6px 2px">${TIERS[S.tier].label} plan. Locked nodes open with a higher plan.</p>
  </div></div>`;
};
/* customisation tools are Advanced */
{ const _s = sectionStyleGroup; sectionStyleGroup = (n, i) => tierAtLeast("advanced") ? _s(n, i) : lockedBox("Per-section styling"); }
{ const _t = toolStyleGroup; toolStyleGroup = (n) => tierAtLeast("advanced") ? _t(n) : lockedBox("Custom tool styles"); }
{ const _o = ovPanel; ovPanel = (o, pal, t, label, hint) => tierAtLeast("advanced") ? _o(o, pal, t, label, hint) : `<div class="locked sm"><span class="ic0">${ICON.lock}</span><span>${esc(label || "Overlay & gradient")} · Advanced plan</span><button class="btn sm ghost" data-act="plans">See plans</button></div>`; }
/* Free: you bring your own images and publish to staging */
{ const _is = A.imgsrc; A.imgsrc = function (t) { if (S.tier === "free" && t.dataset.v !== "upload") { S.modal = "plans"; paintLayer(); return toast("On the Starter plan you upload your own images."); } _is(t); }; }
{ const _an = addNode; addNode = function (type, x, y, extra = {}) { if (type === "image" && S.tier === "free" && !extra.p?.source) extra = { ...extra, p: { ...(extra.p || {}), source: "upload" } }; return _an(type, x, y, extra); }; }
{ const _ib = inspectorBody; inspectorBody = (n) => { const h = _ib(n); if (S.tier === "free" && n.type === "publish") return `<div class="wellbox" style="gap:4px"><b>Publishes to staging</b><span class="muted" style="font-size:12.5px">On the Starter plan the page lives at staging.webshow.ai/${esc(n.p.slug || "your-show")}. Basic and Advanced publish to your own domain.</span><button class="btn sm" style="justify-self:start" data-act="plans">See plans</button></div>` + h;
  if (S.tier === "free" && n.type === "image" && n.p.source !== "upload") return `<div class="wellbox" style="gap:4px"><b>Upload your own image</b><span class="muted" style="font-size:12.5px">AI images are part of Basic. The placeholder art stays until you upload.</span></div>` + h; return h; }; }
{ const _bn = buildNode; buildNode = async function (n) { if (n && !nodeAllowed(n.type)) { S.modal = "plans"; paintLayer(); return toast(`${NT[n.type].label} is part of the ${TIERS[tierOfNode(n.type)].label} plan.`); } return _bn(n); }; }

/* plans modal: a full upgrade simulation. Nothing is charged; switching unlocks at once. */
function plansModal() {
  const pro = S.tier === "pro";
  return `<div class="scrim" data-act="closemodal"><div class="modal wide" data-stop="1" role="dialog" aria-label="Plans"><div class="modal-h"><span class="nico" style="--nc:var(--brand)">${ICON.lock}</span><h3>Plans</h3><span class="demo-b">Demo · no payment</span><span class="grow"></span><button class="ib" data-act="closemodal" aria-label="Close">${ICON.x}</button></div>
    <div class="modal-b"><p class="muted" style="font-size:12.5px">Pick any plan to try it. It unlocks right away, and you can switch back whenever you like. No account, card or subscription is created.</p>
      <div class="plans">${Object.entries(TIERS).map(([k, t]) => `<div class="plan ${S.tier === k ? "on" : ""} ${k === "pro" ? "plan-pro" : ""}"><div class="plan-h"><b class="px">${t.label}</b><span class="price"><b>${t.price}</b> ${t.per}</span><span class="muted">${t.who}</span></div>
        ${S.tier === k ? `<span class="chip st-live"><i></i>Current plan</span>` : `<button class="btn ${TIER_RANK[k] > TIER_RANK[S.tier] ? "primary" : ""}" data-act="settier" data-k="${k}">${TIER_RANK[k] > TIER_RANK[S.tier] ? "Upgrade to" : "Switch to"} ${t.label}</button>`}
        <ul>${t.feats.map(f => `<li>${ICON.check}<span>${esc(f)}</span></li>`).join("")}${t.no.map(f => `<li class="no"><span class="dash">–</span><span>${esc(f)}</span></li>`).join("")}</ul></div>`).join("")}</div>
      <div class="addons"><div class="sec-h"><span>Webshow studio services ${pro ? `<span class="muted" style="font-weight:400">· included in Pro</span>` : `<span class="muted" style="font-weight:400">· paid add-ons on any plan</span>`}</span></div>
        ${ADDONS.map(([k, t, d, p]) => `<div class="addon"><span class="t"><b>${esc(t)}</b><span>${esc(d)}</span></span><span class="ap">${pro ? "Included" : esc(p)}</span>${pro ? `<span class="chip st-live"><i></i>Included</span>` : S.addons[k] ? `<span class="chip">${ICON.check} Requested</span>` : `<button class="btn sm" data-act="addon" data-k="${k}">Request</button>`}</div>`).join("")}</div>
      <p class="faint" style="font-size:12px">Demo prices for testing the experience. Nothing you build is deleted when a plan locks it; it stays on the canvas, read-only for new building.</p></div></div></div>`;
}
{ const _cl = conLayer; conLayer = () => _cl() + (S.modal === "plans" ? plansModal() : ""); }
Object.assign(A, {
  plans() { S.lib = null; S.modal = "plans"; paintLayer(); },
  settier(b) { const up = TIER_RANK[b.dataset.k] > TIER_RANK[S.tier]; setTier(b.dataset.k); S.modal = null; render(); toast(`${up ? "Upgraded to" : "Switched to"} ${TIERS[b.dataset.k].label} (demo). ${up ? "Its features are unlocked." : ""}`); },
  addon(b) { S.addons[b.dataset.k] = now(); lsSet("wss.addons", S.addons); paintLayer(); toast("Request noted (demo). Nothing is sent or charged."); },
});
