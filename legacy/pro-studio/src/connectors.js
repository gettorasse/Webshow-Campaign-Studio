/* ============================================================
   Connectors: ad and analytics accounts, all-shows performance,
   campaign settings managed inside Webshow
   ============================================================ */
const CONNECTORS = [
  { k: "gads", name: "Google Ads", cat: "Ads", mono: "G", desc: "Search, Performance Max and YouTube campaigns", open: "https://ads.google.com", ads: true },
  { k: "meta", name: "Meta Ads", cat: "Ads", mono: "M", desc: "Facebook and Instagram ads, Pixel and lead forms", open: "https://adsmanager.facebook.com", ads: true },
  { k: "linkedin", name: "LinkedIn Ads", cat: "Ads", mono: "in", desc: "Sponsored content and lead gen forms for B2B", open: "https://www.linkedin.com/campaignmanager", ads: true },
  { k: "tiktok", name: "TikTok Ads", cat: "Ads", mono: "T", desc: "In-feed video ads and Spark Ads", open: "https://ads.tiktok.com", ads: true },
  { k: "instagram", name: "Instagram", cat: "Social", mono: "IG", desc: "Publish posts and carousels to a business or creator account", open: "https://www.instagram.com", social: true, formats: ["carousel"] },
  { k: "facebook", name: "Facebook Page", cat: "Social", mono: "f", desc: "Publish posts and photo albums to your Page", open: "https://www.facebook.com", social: true, formats: ["carousel"] },
  { k: "linkedinpage", name: "LinkedIn Page", cat: "Social", mono: "Li", desc: "Publish document carousels and posts to a company page", open: "https://www.linkedin.com", social: true, formats: ["carousel"] },
  { k: "tiktokacc", name: "TikTok account", cat: "Social", mono: "Tt", desc: "Publish photo carousels and videos", open: "https://www.tiktok.com", social: true, formats: ["carousel", "video"] },
  { k: "youtube", name: "YouTube channel", cat: "Social", mono: "YT", desc: "Publish videos and Shorts", open: "https://studio.youtube.com", social: true, formats: ["video"] },
  { k: "ga4", name: "Google Analytics 4", cat: "Analytics", mono: "GA", desc: "Visits, sources and conversions on your Show Pages", open: "https://analytics.google.com" },
  { k: "gsc", name: "Search Console", cat: "Analytics", mono: "SC", desc: "Search queries and indexing for published pages", open: "https://search.google.com/search-console" },
  { k: "hubspot", name: "HubSpot", cat: "CRM & email", mono: "H", desc: "Send every Webshow lead to your CRM as a contact", open: "https://app.hubspot.com" },
  { k: "mailchimp", name: "Mailchimp", cat: "CRM & email", mono: "Mc", desc: "Add popup and form sign-ups to an audience", open: "https://mailchimp.com" },
];
const CON_DEF = { conns: {}, camp: {} };
const RANGES = [[7, "7 days"], [30, "30 days"], [90, "90 days"]];
const eur = (v) => new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR", maximumFractionDigits: v < 100 ? 2 : 0 }).format(v || 0);
const num = (v) => new Intl.NumberFormat("fi-FI").format(Math.round(v || 0));
const conOn = (k) => !!S.con?.conns?.[k]?.on;

async function loadConnectors(force) {
  if (S.con && !force && S.conLoaded) return;
  S.conLoaded = true;
  try { S.con = await Store.getDoc("workspace/connectors", clone(CON_DEF)); } catch { S.con = clone(CON_DEF); }
  S.con.conns = S.con.conns || {}; S.con.camp = S.con.camp || {};
  try {
    const st = await Store.liveStats(); const slugs = [...new Set([...st.leads.map(l => l.slug), ...Object.keys(st.visits || {})])];
    const owner = {}; await Promise.all(slugs.map(async sl => { try { const p = await Store.getPublished(sl); if (p?.showId) owner[sl] = p.showId; } catch {} }));
    S.conStats = { ...st, owner };
  } catch { S.conStats = { leads: [], visits: {}, owner: {} }; }
  if (S.view === "connectors") { const b = $("#body"); if (b) b.innerHTML = connectorsView(); renderSidebarOnly(); }
  if (S.view === "live" && typeof repaintLive === "function") repaintLive();
}
let conT; function saveCon(note) { clearTimeout(conT); conT = setTimeout(async () => { try { await Store.putDoc("workspace/connectors", S.con); if (note) toast(note); } catch (e) { console.warn(e); toast("Couldn't save the connector settings."); } }, 400); }

/* campaign settings per show and platform */
function campOf(showId, k) {
  const c = (S.con.camp[showId] = S.con.camp[showId] || {});
  if (!c[k]) c[k] = { status: "active", budget: 20, bidding: "conversions", geo: "Finland", lang: "Finnish", placements: ["feed", "stories", "reels"], ageMin: 25, ageMax: 54, objective: "leads" };
  return c[k];
}
/* Sample ad numbers for demo connections (deterministic, clearly labelled in the UI) */
function sampleDay(showId, k, d) {
  const c = S.con.camp[showId]?.[k]; if (c?.status === "paused") return { spend: 0, imp: 0, clicks: 0 };
  if (showId === S.showId) { const ch = Object.values(S.nodes).filter(n => n.type === "adchannel" && (n.p.platforms || []).includes(k) && (n.p.start || n.p.end)); if (ch.length && !ch.some(n => { const iso = new Date(d * 864e5).toISOString().slice(0, 10); return (!n.p.start || iso >= n.p.start) && (!n.p.end || iso <= n.p.end); })) return { spend: 0, imp: 0, clicks: 0 }; }
  const h = hash(showId + k + d); const budget = c?.budget ?? 20; const spend = budget * (.55 + (h % 45) / 100);
  const cpm = { gads: 9, meta: 6, linkedin: 28, tiktok: 5 }[k] || 8; const imp = spend / cpm * 1000; const ctr = ({ gads: .042, meta: .012, linkedin: .007, tiktok: .009 }[k] || .01) * (.7 + (h % 60) / 100);
  return { spend, imp, clicks: imp * ctr };
}
function conData(days) {
  const shows = Object.values(S.shows); const ads = CONNECTORS.filter(c => c.ads && conOn(c.k)); const end = localDayOf(Date.now());
  const since = Date.now() - days * 864e5; const st = S.conStats || { leads: [], visits: {}, owner: {} };
  const exSlug = "kivi-sauna"; const showOf = (slug) => st.owner[slug] || (slug === exSlug ? "example" : null);
  const daily = Array.from({ length: days }, (_, i) => ({ d: end - days + 1 + i, spend: 0 }));
  const rows = shows.map(s => {
    const r = { show: s, spend: 0, imp: 0, clicks: 0, chans: [], visits: 0, leads: 0 };
    ads.forEach(c => { r.chans.push(c); daily.forEach(dd => { const x = sampleDay(s.id, c.k, dd.d); r.spend += x.spend; r.imp += x.imp; r.clicks += x.clicks; dd.spend += x.spend; }); });
    r.leads = st.leads.filter(l => showOf(l.slug) === s.id && l.at >= since).length;
    r.visits = Object.entries(st.visits || {}).filter(([sl]) => showOf(sl) === s.id).reduce((a, [, v]) => a + v, 0);
    return r;
  });
  const tot = rows.reduce((a, r) => ({ spend: a.spend + r.spend, imp: a.imp + r.imp, clicks: a.clicks + r.clicks, leads: a.leads + r.leads, visits: a.visits + r.visits }), { spend: 0, imp: 0, clicks: 0, leads: 0, visits: 0 });
  return { rows, tot, daily, ads };
}

/* ---------- view ---------- */
function connectorsView() {
  if (!S.con) return `<div class="home" style="background:var(--canvas)"><div class="home-in" style="max-width:1080px;padding-top:28px"><p class="muted">Loading connectors…</p></div></div>`;
  const days = S.conRange || 30; const D = conData(days); const anyAds = D.ads.length; const demo = Object.values(S.con.conns).some(c => c.on && c.demo);
  const kpi = (label, v, sub = "") => `<div class="kpi"><span>${label}</span><b class="px">${v}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
  const cpl = D.tot.leads ? eur(D.tot.spend / D.tot.leads) : "–";
  return `<div class="home" style="background:var(--canvas)"><div class="home-in con" style="max-width:1080px;padding-top:28px">
    <div style="display:grid;gap:6px"><span class="px vt" style="font-size:24px">Connectors</span><p class="muted" style="max-width:62ch">Link your ad and analytics accounts once. See every show's results in one place and change campaign settings here, without opening each ad platform.</p></div>

    <div style="display:grid;gap:12px">
      <div class="sec-h"><span>All shows</span><div class="seg">${RANGES.map(([d, l]) => `<button data-act="conrange" data-v="${d}" aria-pressed="${days === d}">${l}</button>`).join("")}</div></div>
      ${demo ? `<p class="con-note">${ICON.spark}<span>Ad numbers come from demo connections and are sample data. Leads and visits are real, from your published Show Pages.</span></p>` : ""}
      <div class="kpis">${kpi("Ad spend", anyAds ? eur(D.tot.spend) : "–", anyAds ? `${D.ads.length} ad platform${D.ads.length > 1 ? "s" : ""}` : "No ad account linked")}${kpi("Ad impressions", anyAds ? num(D.tot.imp) : "–")}${kpi("Ad clicks", anyAds ? num(D.tot.clicks) : "–", anyAds && D.tot.imp ? `CTR ${(D.tot.clicks / D.tot.imp * 100).toFixed(2).replace(".", ",")} %` : "")}${kpi("Leads", num(D.tot.leads), "From Webshow forms and popups")}${kpi("Cost per lead", anyAds ? cpl : "–")}${kpi("Page visits", num(D.tot.visits), "All time")}</div>
      ${anyAds ? spendChart(D.daily) : ""}
      <div class="con-table"><table><thead><tr><th>Show</th><th>Channels</th><th class="r">Spend</th><th class="r">Clicks</th><th class="r">Visits</th><th class="r">Leads</th><th class="r">Cost per lead</th><th></th></tr></thead><tbody>
        ${D.rows.length ? D.rows.map(r => `<tr><td><span class="con-show"><span class="av" style="--nc:${tintOf(r.show)}">${esc((r.show.name || "?")[0].toUpperCase())}</span><b>${esc(r.show.name)}</b></span></td>
          <td><span class="swrow" style="gap:4px">${r.chans.map(c => { const st = S.con.camp[r.show.id]?.[c.k]?.status || "active"; return `<span class="chip ${st === "paused" ? "" : "st-live"}" title="${esc(c.name)}: ${st === "paused" ? "Paused" : "Active"}"><i></i>${esc(c.name.replace(" Ads", ""))}</span>`; }).join("") || `<span class="faint">None</span>`}</span></td>
          <td class="r">${anyAds ? eur(r.spend) : "–"}</td><td class="r">${anyAds ? num(r.clicks) : "–"}</td><td class="r">${num(r.visits)}</td><td class="r">${num(r.leads)}</td><td class="r">${anyAds && r.leads ? eur(r.spend / r.leads) : "–"}</td>
          <td class="r">${anyAds ? `<button class="btn sm" data-act="conshow" data-id="${r.show.id}">Campaigns</button>` : ""}</td></tr>`).join("") : `<tr><td colspan="8" class="muted">No shows yet.</td></tr>`}
      </tbody></table></div>
    </div>

    ${["Ads", "Social", "Analytics", "CRM & email"].map(cat => `<div style="display:grid;gap:10px"><div class="sec-h"><span>${cat}</span></div><div class="con-grid">${CONNECTORS.filter(c => c.cat === cat).map(conCard).join("")}</div></div>`).join("")}
    <p class="faint" style="font-size:12px">Each connection signs in with the platform's own login and permission screen. Webshow never asks for or stores your passwords.</p>
  </div></div>`;
}
function conCard(c) {
  const on = conOn(c.k); const cn = S.con.conns[c.k];
  return `<div class="con-card"><div class="con-top"><span class="con-mono">${esc(c.mono)}</span><span style="display:grid;gap:2px;min-width:0"><b>${esc(c.name)}</b><span class="muted" style="font-size:12px">${esc(c.desc)}</span></span></div>
    <div class="swrow" style="justify-content:space-between">${on ? `<span class="chip st-live"><i></i>${cn.demo ? "Demo account" : "Connected"}</span>` : `<span class="chip">Not connected</span>`}
    <span class="swrow" style="gap:6px"><a class="btn sm ghost" href="${c.open}" target="_blank" rel="noopener noreferrer" title="Open ${esc(c.name)} in a new tab">${ICON.ext}</a>${on ? `<button class="btn sm" data-act="conmanage" data-k="${c.k}">Settings</button>` : `<button class="btn sm primary" data-act="conconnect" data-k="${c.k}">Connect</button>`}</span></div></div>`;
}
function spendChart(daily) {
  const W = 1000, H = 120, max = Math.max(1, ...daily.map(d => d.spend)); const bw = W / daily.length; const fmt = (d) => new Date(d * 864e5).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return `<figure class="con-chart"><figcaption><b>Ad spend per day</b><span class="faint">Top ${eur(max)}</span></figcaption>
    <div class="cc-wrap"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Daily ad spend across all shows">
    <line x1="0" x2="${W}" y1="${H - .5}" y2="${H - .5}" stroke="var(--line-2)" stroke-width="1" vector-effect="non-scaling-stroke"/>
    ${daily.map((d, i) => { const h = Math.max(1, d.spend / max * (H - 6)); return `<g class="cc-bar"><rect x="${i * bw}" y="0" width="${bw}" height="${H}" fill="transparent"><title>${fmt(d.d)}: ${eur(d.spend)}</title></rect><path d="${barPath(i * bw + 1, H, Math.max(1, bw - 2), h)}" fill="var(--brand)"/></g>`; }).join("")}</svg></div>
    <div class="cc-axis"><span>${fmt(daily[0].d)}</span><span>${fmt(daily.at(-1).d)}</span></div></figure>`;
}
function barPath(x, base, w, h) { const r = Math.min(4, w / 2, h); return `M${x} ${base}V${base - h + r}Q${x} ${base - h} ${x + r} ${base - h}H${x + w - r}Q${x + w} ${base - h} ${x + w} ${base - h + r}V${base}Z`; }

/* ---------- connect and settings sheets ---------- */
function conLayer() {
  const m = S.modal || ""; if (!m.startsWith("con")) return "";
  const [kind, k] = m.split(":"); const c = CONNECTORS.find(x => x.k === k);
  if (kind === "conconnect" && c) return `<div class="scrim" data-act="closemodal"><div class="modal" data-stop="1" role="dialog" aria-label="Connect ${esc(c.name)}"><div class="modal-h"><span class="con-mono">${esc(c.mono)}</span><h3>Connect ${esc(c.name)}</h3><button class="ib" data-act="closemodal" aria-label="Close">${ICON.x}</button></div><div class="modal-b">
    <p>You'll sign in on ${esc(c.name.replace(/ Ads$| 4$/, ""))}'s own permission screen and choose which account Webshow can use. Webshow then ${c.social ? "publishes the posts you send from your shows and reads their reach" : "reads results and applies the settings you change here"}.</p>
    <div class="wellbox"><b>This prototype can't reach ${esc(c.name)} yet</b><span class="muted">The real sign-in arrives with the alpha. Until then, a demo account lets you try the settings and the all-shows view with sample numbers, clearly marked as sample data.</span></div></div>
    <div class="modal-f"><button class="btn ghost" data-act="closemodal">Cancel</button><button class="btn primary" data-act="condemo" data-k="${c.k}">Use a demo account</button></div></div></div>`;
  if (kind === "conset" && c) return conSettings(c);
  if (kind === "conshow") return conShowSheet(k);
  if (kind === "consocial") return socialModal(k);
  return "";
}
function campRows(c, shows) {
  return shows.map(s => { const cp = campOf(s.id, c.k); const id = `${s.id}_${c.k}`;
    return `<div class="camp"><div class="camp-h"><span class="av" style="--nc:${tintOf(s)}">${esc((s.name || "?")[0].toUpperCase())}</span><b>${esc(s.name)}</b><span class="grow"></span>
      <div class="seg"><button data-act="constatus" data-s="${s.id}" data-k="${c.k}" data-v="active" aria-pressed="${cp.status !== "paused"}">Active</button><button data-act="constatus" data-s="${s.id}" data-k="${c.k}" data-v="paused" aria-pressed="${cp.status === "paused"}">Paused</button></div></div>
      <div class="camp-b"><label class="fld"><span>Daily budget, €</span><input class="inp" type="number" min="1" step="1" id="cb_${id}" data-con="${s.id}|${c.k}|budget" value="${cp.budget}"></label>
      ${c.k === "gads" ? `<label class="fld"><span>Bidding</span><select class="inp" id="cbid_${id}" data-con="${s.id}|${c.k}|bidding">${[["conversions", "Maximise conversions"], ["clicks", "Maximise clicks"], ["cpa", "Target cost per lead"]].map(([v, l]) => `<option value="${v}" ${cp.bidding === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>`
        : `<label class="fld"><span>Objective</span><select class="inp" id="cobj_${id}" data-con="${s.id}|${c.k}|objective">${[["leads", "Leads"], ["traffic", "Traffic to the Show Page"], ["awareness", "Awareness"]].map(([v, l]) => `<option value="${v}" ${cp.objective === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>`}
      <label class="fld"><span>Locations</span><input class="inp" id="cgeo_${id}" data-con="${s.id}|${c.k}|geo" value="${esc(cp.geo)}"></label>
      ${c.k === "gads" ? `<label class="fld"><span>Language</span><input class="inp" id="clang_${id}" data-con="${s.id}|${c.k}|lang" value="${esc(cp.lang)}"></label>`
        : `<label class="fld"><span>Ages</span><span class="swrow" style="gap:6px;flex-wrap:nowrap"><input class="inp" type="number" min="18" max="65" id="cam_${id}" data-con="${s.id}|${c.k}|ageMin" value="${cp.ageMin}"><span class="faint">to</span><input class="inp" type="number" min="18" max="65" id="cax_${id}" data-con="${s.id}|${c.k}|ageMax" value="${cp.ageMax}"></span></label>`}
      ${c.k === "meta" ? `<div class="fld" style="grid-column:1/-1"><span>Placements</span><span class="swrow">${[["feed", "Feeds"], ["stories", "Stories"], ["reels", "Reels"]].map(([v, l]) => `<label class="check"><input type="checkbox" data-con="${s.id}|${c.k}|placements|${v}" ${cp.placements?.includes(v) ? "checked" : ""}> ${l}</label>`).join("")}</span></div>` : ""}</div></div>`; }).join("");
}
function conSettings(c) {
  const cn = S.con.conns[c.k] || {}; const shows = Object.values(S.shows);
  return `<div class="scrim" data-act="closemodal"><div class="modal wide con-sheet" data-stop="1" role="dialog" aria-label="${esc(c.name)} settings"><div class="modal-h"><span class="con-mono">${esc(c.mono)}</span><h3>${esc(c.name)}</h3>${cn.demo ? `<span class="chip">Demo account</span>` : ""}<span class="grow"></span><a class="btn sm ghost" href="${c.open}" target="_blank" rel="noopener noreferrer">${ICON.ext} Open ${esc(c.name)}</a><button class="ib" data-act="closemodal" aria-label="Close">${ICON.x}</button></div><div class="modal-b">
    <div class="wellbox"><div class="g2"><label class="fld"><span>Account</span><input class="inp" id="cacc_${c.k}" data-conn="${c.k}|account" value="${esc(cn.account || "")}"></label><label class="fld"><span>Currency</span><input class="inp" value="EUR" disabled></label></div>
      ${c.ads ? `<label class="check"><input type="checkbox" data-conn="${c.k}|conv" ${cn.conv !== false ? "checked" : ""}> Count Webshow form and popup sign-ups as conversions</label><label class="check"><input type="checkbox" data-conn="${c.k}|utm" ${cn.utm !== false ? "checked" : ""}> Tag Show Page links automatically so every visit is credited to the right campaign</label>` : ""}
      ${c.social ? `<label class="fld"><span>Profile</span><input class="inp" id="chandle_${c.k}" data-conn="${c.k}|handle" value="${esc(cn.handle || "")}" placeholder="@yourbrand"></label><label class="check"><input type="checkbox" data-conn="${c.k}|approve" ${cn.approve !== false ? "checked" : ""}> Only publish blocks that are approved on the canvas</label><label class="check"><input type="checkbox" data-conn="${c.k}|link" ${cn.link !== false ? "checked" : ""}> Add the Show Page link to captions</label>` : ""}
      ${c.cat === "Analytics" ? `<label class="check"><input type="checkbox" data-conn="${c.k}|track" ${cn.track !== false ? "checked" : ""}> Track every published Show Page</label>` : ""}
      ${c.cat === "CRM & email" ? `<label class="fld"><span>${c.k === "hubspot" ? "Lifecycle stage for new contacts" : "Audience"}</span><input class="inp" id="clist_${c.k}" data-conn="${c.k}|list" value="${esc(cn.list || (c.k === "hubspot" ? "Lead" : "Webshow sign-ups"))}"></label><label class="check"><input type="checkbox" data-conn="${c.k}|send" ${cn.send !== false ? "checked" : ""}> Send every new lead automatically</label>` : ""}</div>
    ${c.ads ? `<div class="sec-h"><span>Campaigns from your shows</span></div><p class="muted" style="margin-top:-6px">Each show runs as its own campaign. Changes save here at once${cn.demo ? "; with a demo account they change the sample numbers instead of a real campaign" : ` and sync to ${esc(c.name)}`}.</p><div style="display:grid;gap:8px">${campRows(c, shows)}</div>` : ""}
    ${c.social ? `<div class="sec-h"><span>Posts from your shows</span></div>${socialPostList(c.k)}` : ""}
    <details><summary class="muted" style="cursor:pointer">Disconnect ${esc(c.name)}</summary><div style="display:grid;gap:8px;margin-top:10px"><p class="muted">Webshow stops reading results and changing settings. Your campaigns keep running in ${esc(c.name)}.</p><button class="btn danger" style="justify-self:start" data-act="condisconnect" data-k="${c.k}">Disconnect</button></div></details>
  </div><div class="modal-f"><button class="btn primary" data-act="closemodal">Done</button></div></div></div>`;
}
function conShowSheet(showId) {
  const s = S.shows[showId]; if (!s) return ""; const ads = CONNECTORS.filter(c => c.ads && conOn(c.k));
  return `<div class="scrim" data-act="closemodal"><div class="modal wide con-sheet" data-stop="1" role="dialog" aria-label="${esc(s.name)} campaigns"><div class="modal-h"><span class="av" style="--nc:${tintOf(s)}">${esc((s.name || "?")[0].toUpperCase())}</span><h3>${esc(s.name)} · campaigns</h3><span class="grow"></span><button class="ib" data-act="closemodal" aria-label="Close">${ICON.x}</button></div><div class="modal-b">
    ${ads.map(c => `<div style="display:grid;gap:8px"><div class="sec-h"><span class="swrow"><span class="con-mono sm">${esc(c.mono)}</span>${esc(c.name)}</span><a class="btn sm ghost" href="${c.open}" target="_blank" rel="noopener noreferrer">${ICON.ext}</a></div>${campRows(c, [s])}</div>`).join("")}
  </div><div class="modal-f"><button class="btn primary" data-act="closemodal">Done</button></div></div></div>`;
}
function repaintCon() { if (S.view === "connectors") { const b = $("#body"); if (b) { const sc = b.querySelector(".home")?.scrollTop; b.innerHTML = connectorsView(); const h = b.querySelector(".home"); if (h && sc) h.scrollTop = sc; } } renderSidebarOnly(); }

Object.assign(A, {
  conrange(t) { S.conRange = +t.dataset.v; repaintCon(); },
  conconnect(t) { S.modal = "conconnect:" + t.dataset.k; paintLayer(); },
  condemo(t) { const k = t.dataset.k; S.con.conns[k] = { on: true, demo: true, account: "Demo account", at: now(), by: Store.me.id }; if (CONNECTORS.find(c => c.k === k)?.social) S.con.conns[k].handle = "@" + (slugify(cur()?.name || "yourbrand").replace(/-/g, "") || "yourbrand"); saveCon(); S.modal = "conset:" + k; paintLayer(); repaintCon(); toast("Demo account connected"); },
  conmanage(t) { S.modal = "conset:" + t.dataset.k; paintLayer(); },
  conshow(t) { S.modal = "conshow:" + t.dataset.id; paintLayer(); },
  condisconnect(t) { delete S.con.conns[t.dataset.k]; saveCon("Disconnected"); S.modal = null; paintLayer(); repaintCon(); },
  constatus(t) { const cp = campOf(t.dataset.s, t.dataset.k); cp.status = t.dataset.v; saveCon(t.dataset.v === "paused" ? "Campaign paused" : "Campaign active"); t.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === t))); repaintCon(); },
});
function conField(t) {
  if (t.dataset.con) { const [sid, k, f, v] = t.dataset.con.split("|"); const cp = campOf(sid, k);
    if (f === "placements") { const set = new Set(cp.placements || []); t.checked ? set.add(v) : set.delete(v); cp.placements = [...set]; }
    else cp[f] = t.type === "number" ? Math.max(+t.min || 0, +t.value || 0) : t.value;
    saveCon(); if (f === "budget") repaintCon(); return true; }
  if (t.dataset.conn) { const [k, f] = t.dataset.conn.split("|"); const cn = S.con.conns[k]; if (!cn) return true; cn[f] = t.type === "checkbox" ? t.checked : t.value; saveCon(); return true; }
  return false;
}
document.addEventListener("input", (e) => { const t = e.target; if ((t.dataset?.con || t.dataset?.conn) && t.type !== "checkbox" && t.tagName !== "SELECT") conField(t); });
document.addEventListener("change", (e) => { const t = e.target; if ((t.dataset?.con || t.dataset?.conn) && (t.type === "checkbox" || t.tagName === "SELECT")) { conField(t); toast("Saved"); } });
