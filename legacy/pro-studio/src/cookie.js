/* ============================================================
   Cookie consent tool and brief autofill
   ============================================================ */
ICON.cookie = P('<path d="M13.8 8.4A6 6 0 1 1 7.6 2.2a2 2 0 0 0 2.3 2.4 2 2 0 0 0 2.4 2.3 1.6 1.6 0 0 0 1.5 1.5Z"/><path d="M5.5 6.5h.1M5.5 10h.1M8.5 11h.1M9 8h.1"/>');
NT.cookie = {
  label: "Cookie consent", cat: "block", icon: "cookie", color: "#a3a9bf", desc: "Consent banner for cookies, wired into your site",
  inputs: [{ k: "style", t: "style", label: "Style" }], outputs: [{ k: "tool", t: "overlay", label: "Tool" }],
  params: () => ({ text: "We use cookies to keep this site working. With your OK we also measure visits and improve our ads.", policy: "", accept: "Accept all", reject: "Only necessary", choose: "Choose", analytics: true, marketing: true, position: "bottom" }),
};
const consentKey = (slug) => "wsc_" + (slug || "preview");
function getConsent(slug) { try { return JSON.parse(localStorage.getItem(consentKey(slug)) || "null"); } catch { return null; } }
function mountCookie(container, o, { theme, preview, slug }) {
  if (!container) return () => {};
  if (!preview && getConsent(slug)) return () => {};
  const w = document.createElement("div"); w.className = `wck ${o.position || "bottom"} ${preview ? "pv" : ""}`; w.setAttribute("style", theme || "");
  w.setAttribute("role", "dialog"); w.setAttribute("aria-label", "Cookie consent");
  const cats = [["necessary", "Necessary", "Keeps the site and forms working. Always on.", true], o.analytics !== false && ["analytics", "Analytics", "Counts visits so we can improve the page."], o.marketing !== false && ["marketing", "Marketing", "Measures our ads and shows you relevant offers."]].filter(Boolean);
  w.innerHTML = `<div class="wck-c"><p>${esc(o.text || "")}${o.policy ? ` <a href="${esc(/^https?:\/\//.test(o.policy) ? o.policy : "https://" + o.policy)}" target="_blank" rel="noopener noreferrer">Privacy policy</a>` : ""}</p>
    <div class="wck-cats" hidden>${cats.map(([k, l, d, fixed]) => `<label><input type="checkbox" data-ck="${k}" ${fixed ? "checked disabled" : ""}><span><b>${l}</b><small>${d}</small></span></label>`).join("")}</div>
    <div class="wck-b"><button type="button" class="bt alt" data-ck-act="reject">${esc(o.reject || "Only necessary")}</button><button type="button" class="bt alt" data-ck-act="choose">${esc(o.choose || "Choose")}</button><button type="button" class="bt" data-ck-act="accept">${esc(o.accept || "Accept all")}</button></div></div>`;
  const save = (c) => { const v = { necessary: true, analytics: !!c.analytics, marketing: !!c.marketing, at: Date.now() };
    if (!preview) { try { localStorage.setItem(consentKey(slug), JSON.stringify(v)); } catch {} window.webshowConsent = v; document.dispatchEvent(new CustomEvent("webshow:consent", { detail: v })); }
    w.remove(); };
  w.addEventListener("click", (e) => { const a = e.target.closest("[data-ck-act]")?.dataset.ckAct; if (!a) return;
    if (a === "accept") save({ analytics: true, marketing: true });
    if (a === "reject") save({});
    if (a === "choose") { const cs = w.querySelector(".wck-cats"); if (cs.hidden) { cs.hidden = false; e.target.textContent = "Save choices"; } else save(Object.fromEntries([...w.querySelectorAll("[data-ck]")].map(x => [x.dataset.ck, x.checked]))); } });
  container.appendChild(w); return () => w.remove();
}
/* Webshow counts a visit only once analytics consent is given, when the page has a consent banner */
function countVisitWithConsent(slug, data) {
  const hasCookie = (data?.overlays || []).some(o => o.type === "cookie");
  if (!hasCookie || getConsent(slug)?.analytics) return Store.addVisit(slug).catch(() => {});
  const fn = (e) => { if (e.detail?.analytics) Store.addVisit(slug).catch(() => {}); document.removeEventListener("webshow:consent", fn); };
  document.addEventListener("webshow:consent", fn);
}

/* ---------- inspector, node body and editor stage ---------- */
const _toolBody0 = toolBody, _toolInsp0 = toolInspector, _toolStage0 = toolStage;
toolBody = function (n) {
  if (n.type === "cookie") return `<div class="pv-ck"><span>${esc((n.p.text || "").slice(0, 70))}…</span><span class="swrow" style="gap:4px"><i>${esc(n.p.reject)}</i><i class="on">${esc(n.p.accept)}</i></span></div>`;
  return _toolBody0(n);
};
toolInspector = function (n) {
  if (n.type === "cookie") { const pages = G.edgesFrom(n.id).map(e => S.nodes[e.to]).filter(x => x?.type === "page");
    return `<div class="grp">${fP(n, "text", "Banner text", { ta: 1 })}${fP(n, "policy", "Privacy policy address", { ph: "yourdomain.fi/privacy" })}<div class="g2">${fP(n, "accept", "Accept button")}${fP(n, "reject", "Necessary-only button")}</div>${fP(n, "position", "Position", { sel: [["bottom", "Bar at the bottom"], ["corner", "Card in the corner"], ["center", "Centered"]] })}</div>
      <div class="grp"><h4>Categories visitors can choose</h4><label class="check"><input type="checkbox" checked disabled> Necessary (always on)</label><label class="check"><input type="checkbox" id="ck_a_${n.id}" data-p="analytics" ${n.p.analytics !== false ? "checked" : ""}> Analytics</label><label class="check"><input type="checkbox" id="ck_m_${n.id}" data-p="marketing" ${n.p.marketing !== false ? "checked" : ""}> Marketing</label>
        <small class="faint">"Accept" and "Only necessary" carry the same weight, as EU rules expect. When this banner is on a page, Webshow counts a visit only after the visitor allows analytics. Check the wording with whoever handles your privacy policy.</small></div>
      <div class="grp"><h4>On the site</h4>${pages.length ? `<small class="faint">On ${pages.map(x => "“" + esc(x.title) + "”").join(", ")}.</small>` : `<small class="faint">Wire the Tool output into a landing page's Tools input and it appears on the site automatically.</small>`}</div>${toolStyleGroup(n)}`; }
  return _toolInsp0(n);
};
toolStage = function (n) {
  if (n.type === "cookie") { const pg = G.edgesFrom(n.id).map(e => S.nodes[e.to]).find(x => x?.type === "page"); const v = pg?.p.sections?.length ? pageValue(pg, .5) : null;
    return `<div class="pop-stage"><div class="pop-frame" id="ckframe">${v ? `<div class="sp" style="${v.theme}">${renderPage({ sections: v.sections.slice(0, 2) }, { imgs: v.imgs })}</div>` : `<div class="sp" style="${pageTheme(styleOf(n) || DEF_DIR)};min-height:520px"></div>`}</div><p class="faint" style="font-size:12px;text-align:center">Preview: choices aren't saved here.</p></div>`; }
  return _toolStage0(n);
};
const _mountToolStage0 = mountToolStage;
let ckStageClean = null;
mountToolStage = function (n) {
  ckStageClean?.(); ckStageClean = null;
  if (n?.type === "cookie") { const fr = $("#ckframe"); const pg = G.edgesFrom(n.id).map(e => S.nodes[e.to]).find(x => x?.type === "page");
    if (fr) ckStageClean = mountCookie(fr, n.p, { theme: (pg ? pageValue(pg, .5).theme : pageTheme(DEF_DIR)) + ";" + toolCss(n, pg), preview: true }); return; }
  return _mountToolStage0(n);
};

/* ---------- brief autofill from one prompt ---------- */
function briefFillBox(n) {
  return `<div class="grp bfill"><h4>${ICON.sparkle} Fill from a prompt</h4><textarea class="ta" id="bf_${n.id}" style="min-height:60px" placeholder="e.g. We rent wood-fired trailer saunas in Uusimaa, 390 € a weekend, delivered to you. Want summer bookings from friend groups."></textarea>
    <button class="btn sm primary" style="justify-self:start" data-act="brieffill" data-id="${n.id}" ${S.briefBusy ? "disabled" : ""}>${S.briefBusy ? `<span class="tdots sm" aria-hidden="true"><i></i><i></i><i></i></span> Filling…` : "Fill the brief"}</button>
    <small class="faint">${AI.fn ? "Showrunner fills every field. Numbers and claims only go into facts when you wrote them." : "AI isn't connected here, so Studio fills what it can from your words."}</small></div>`;
}
function briefOffline(t) {
  const g = /book|varaa|appointment|ajanvar/i.test(t) ? "bookings" : /shop|buy|osta|verkkokau|sell/i.test(t) ? "sell" : /launch|lanseer|new /i.test(t) ? "launch" : /event|tapahtu|festival/i.test(t) ? "event" : "leads";
  const first = t.split(/[.,:;–—\n]/)[0].trim(); const facts = t.split(/(?<=[.!?])\s+/).filter(x => /\d/.test(x)).join(" ");
  const named = t.match(/^([A-ZÅÄÖ][\wÅÄÖåäö&'-]*(?:\s+[A-ZÅÄÖ][\wÅÄÖåäö&'-]*){0,3})/)?.[1];
  return { business: (named && named.split(/\s+/).length < first.split(/\s+/).length ? named : first.replace(/^(we|me|our|meidän)\s+/i, "")).slice(0, 60), offer: t.slice(0, 240), audience: (t.match(/(?:for|from|to)\s+([^.,]{4,60})/i)?.[1] || "").trim(), goal: g, cta: { bookings: "Book now", sell: "Shop now", launch: "Get early access", event: "Get tickets", leads: "Get in touch" }[g], facts };
}
A.brieffill = async (b) => {
  const n = S.nodes[b.dataset.id]; const t = str($("#bf_" + n.id)?.value); if (!t) return toast("Describe the business and the campaign first.");
  S.briefBusy = true; S.inspFor = null; paintInspector(); if (S.nodeEd) neRepaint();
  let r = null; const t0 = Date.now();
  if (AI.fn) { try { r = await AI.json(`Fill a marketing campaign brief from the owner's own description.\n${RULES}\n<input>${t}</input>\nReply with ONLY JSON: {"business": string (the business name, or a short description if no name is given), "offer": string (what this campaign promotes, max 30 words), "audience": string (max 20 words), "goal": one of ${JSON.stringify(GOAL_OPTS.map(x => x[0]))}, "cta": string (main action, max 4 words), "facts": string (ONLY concrete facts stated in the input: prices, places, dates, guarantees; empty string if none)}`, { modelTier: "quick" }); } catch (e) { toast(errCopy(e)); } }
  await minWait(t0);
  if (!r || !r.offer) r = briefOffline(t);
  const p = n.p; ["business", "offer", "audience", "cta", "facts"].forEach(k => { const v = str(r[k]); if (v) p[k] = v.slice(0, 400); }); if (GOAL_OPTS.some(x => x[0] === r.goal)) p.goal = r.goal;
  S.briefBusy = false; hist(n, AI.fn ? "Brief filled by Showrunner" : "Brief filled from a prompt"); commitNode(n); paintNode(n.id); G.edgesFrom(n.id).forEach(e => paintNode(e.to)); S.inspFor = null; paintInspector(); if (S.nodeEd) neRepaint(); toast("Brief filled. Check it, then build your blocks.");
};
