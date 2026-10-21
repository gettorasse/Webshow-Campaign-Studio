/* ============================================================
   Live dashboard for one show (campaign): every channel in one view
   ============================================================ */
/* Channel entities in a fixed order: the colour follows the channel, never its rank */
const DCH = [
  { k: "gads", label: "Google Ads", type: "Paid", con: ["gads"] },
  { k: "meta", label: "Meta Ads", type: "Paid", con: ["meta"] },
  { k: "instagram", label: "Instagram", type: "Organic", con: ["instagram"] },
  { k: "facebook", label: "Facebook", type: "Organic", con: ["facebook"] },
  { k: "linkedin", label: "LinkedIn", type: "Paid + organic", con: ["linkedin", "linkedinpage"] },
  { k: "tiktok", label: "TikTok", type: "Paid + organic", con: ["tiktok", "tiktokacc"] },
  { k: "youtube", label: "YouTube", type: "Organic", con: ["youtube"] },
];
DCH.forEach((c, i) => (c.slot = i + 1));
const ADS_KEYS = new Set(["gads", "meta", "linkedin", "tiktok"]);
const dayOf = (t) => localDayOf(t);
const pct = (v) => (v * 100).toFixed(2).replace(".", ",") + " %";
function showPosts(showId) {
  const nodes = showId === S.showId ? Object.values(S.nodes) : [];
  return nodes.filter(n => n.type === "carousel").flatMap(n => (n.p.posts || []).map(p => ({ ...p, node: n })));
}
function sampleOrg(showId, k, d, posts) {
  const h = hash(showId + k + d + "o"); const base = { instagram: 420, facebook: 260, linkedinpage: 180, tiktokacc: 650, youtube: 300 }[k] || 200;
  let imp = base * (.6 + (h % 80) / 100);
  posts.forEach(p => { if (!p.accounts?.includes(k) || p.at > Date.now()) return; const age = d - dayOf(p.at); if (age >= 0 && age < 4) imp += base * 4 / (age + 1); });
  return { imp, clicks: imp * (.008 + (h % 10) / 1000), spend: 0 };
}
function dashData(showId, days) {
  const end = dayOf(Date.now()); const posts = showPosts(showId);
  const chans = DCH.filter(c => c.con.some(conOn));
  const make = (from) => Array.from({ length: days }, (_, i) => from + i);
  const cur = make(end - days + 1), prev = make(end - 2 * days + 1);
  const series = (c, ds) => ds.map(d => { const o = { imp: 0, clicks: 0, spend: 0 }; c.con.filter(conOn).forEach(k => { const x = ADS_KEYS.has(k) ? sampleDay(showId, k, d) : sampleOrg(showId, k, d, posts); o.imp += x.imp; o.clicks += x.clicks; o.spend += x.spend; }); return o; });
  const rows = chans.map(c => { const s = series(c, cur), p = series(c, prev); const sum = (a, f) => a.reduce((t, x) => t + x[f], 0);
    return { c, s, imp: sum(s, "imp"), clicks: sum(s, "clicks"), spend: sum(s, "spend"), pImp: sum(p, "imp"), pClicks: sum(p, "clicks"), pSpend: sum(p, "spend") }; });
  return { rows, cur, posts, demo: chans.some(c => c.con.some(k => S.con?.conns?.[k]?.demo)) };
}

/* ---------- view ---------- */
function liveDash(pubs, L) {
  if (!S.con) return `<div class="sec-h"><span>Channels</span></div><p class="muted">Loading…</p>`;
  const days = S.dashRange || 30; const D = dashData(S.showId, days); const off = S.dashOff || {};
  const vis = D.rows.filter(r => !off[r.c.k]);
  const since = Date.now() - days * 864e5, since2 = Date.now() - 2 * days * 864e5;
  const slugs = new Set(pubs.map(p => p.p.slug)); const leadsAll = (L?.leads || []).filter(l => slugs.has(l.slug));
  const leads = leadsAll.filter(l => l.at >= since).length, pLeads = leadsAll.filter(l => l.at >= since2 && l.at < since).length;
  const visits = pubs.reduce((a, p) => a + (L?.visits?.[p.p.slug] || 0), 0);
  const T = (f) => vis.reduce((a, r) => a + r[f], 0);
  const imp = T("imp"), clicks = T("clicks"), spend = T("spend");
  const daily = (f) => D.cur.map((_, i) => vis.reduce((a, r) => a + r.s[i][f], 0));
  const leadDaily = D.cur.map(d => leadsAll.filter(l => dayOf(l.at) === d).length);
  const anyCh = D.rows.length;
  const head = `<div class="dash-h"><div style="display:grid;gap:2px"><span class="dash-sub">Channels</span><span class="muted" style="font-size:12.5px">Traffic, ads and posts from connected accounts</span></div>
    <div class="swrow">${D.demo ? `<span class="chip" title="Ad and social numbers come from demo connections">${ICON.spark} Sample data</span>` : ""}<button class="btn sm" data-act="view" data-v="connectors">${ICON.plug} Connectors</button></div></div>`;
  const filters = `<div class="dash-f"><div class="seg">${RANGES.map(([d, l]) => `<button data-act="dashrange" data-v="${d}" aria-pressed="${days === d}">${l}</button>`).join("")}</div>
    ${anyCh ? `<div class="swrow dash-chips">${D.rows.map(r => `<button class="dchip" data-act="dashch" data-k="${r.c.k}" aria-pressed="${!off[r.c.k]}"><i class="s${r.c.slot}"></i>${esc(r.c.label)}</button>`).join("")}</div>` : ""}</div>`;
  const tile = (label, v, cur0, prev0, spark, opts = {}) => { const d = prev0 ? (cur0 - prev0) / prev0 : null; const up = d != null && d >= 0; const good = opts.lowerBetter ? !up : up;
    return `<div class="dk"><span class="dk-l">${label}</span><b class="px">${v}</b><span class="dk-d">${d == null ? `<span class="faint">${opts.note || "No earlier data"}</span>` : `<span class="${good ? "good" : "bad"}">${up ? "▲" : "▼"} ${Math.abs(d * 100).toFixed(0)} %</span><span class="faint">vs previous ${days} days</span>`}</span>${spark ? sparkSVG(spark) : ""}</div>`; };
  const tiles = `<div class="dks">
    ${tile("Impressions", anyCh ? num(imp) : "–", imp, T("pImp"), anyCh && daily("imp"))}
    ${tile("Clicks", anyCh ? num(clicks) : "–", clicks, T("pClicks"), anyCh && daily("clicks"))}
    ${tile("Click-through rate", anyCh && imp ? pct(clicks / imp) : "–", imp ? clicks / imp : 0, T("pImp") ? T("pClicks") / T("pImp") : 0, null)}
    ${tile("Ad spend", anyCh ? eur(spend) : "–", spend, T("pSpend"), anyCh && spend ? daily("spend") : null, { lowerBetter: true })}
    ${tile("Leads", num(leads), leads, pLeads, leadDaily.some(Boolean) ? leadDaily : null, { note: "From your Show Page forms" })}
    ${tile("Cost per lead", spend && leads ? eur(spend / leads) : "–", spend && leads ? spend / leads : 0, T("pSpend") && pLeads ? T("pSpend") / pLeads : 0, null, { lowerBetter: true, note: leads ? "" : "Needs leads and ad spend" })}
  </div>`;
  if (!anyCh) return `${head}${filters}${tiles}<div class="empty dash-empty"><h3>Connect your channels</h3><span>Link Google Ads, Meta, Instagram and the rest once. This dashboard then shows traffic, impressions and spend for ${esc(cur()?.name || "this show")} from every channel.</span><button class="btn primary" data-act="view" data-v="connectors">${ICON.plug} Open Connectors</button></div>
    <p class="faint" style="font-size:12px">Page visits so far: ${num(visits)}. Leads and visits are counted by Webshow itself, so they work without any connection.</p>`;
  const traffic = lineChart("dtraffic", D.cur, vis.map(r => ({ name: r.c.label, slot: r.c.slot, v: r.s.map(x => x.clicks) })), "Clicks");
  const paid = vis.filter(r => r.spend > 0).sort((a, b) => b.spend - a.spend); const maxS = Math.max(1, ...paid.map(r => r.spend));
  const spendBars = paid.length ? `<div class="hb">${paid.map(r => `<div class="hb-r" title="${esc(r.c.label)}: ${eur(r.spend)}"><span class="hb-l">${esc(r.c.label)}</span><span class="hb-t"><i class="s${r.c.slot}" style="width:${Math.max(2, r.spend / maxS * 100)}%"></i></span><span class="hb-v">${eur(r.spend)}</span></div>`).join("")}</div>` : `<p class="muted" style="font-size:12.5px">No paid channels in this view.</p>`;
  const share = vis.length ? `<div class="hb">${[...vis].sort((a, b) => b.imp - a.imp).map(r => `<div class="hb-r" title="${esc(r.c.label)}: ${num(r.imp)} impressions"><span class="hb-l">${esc(r.c.label)}</span><span class="hb-t"><i class="s${r.c.slot}" style="width:${Math.max(2, r.imp / Math.max(1, ...vis.map(x => x.imp)) * 100)}%"></i></span><span class="hb-v">${num(r.imp)}</span></div>`).join("")}</div>` : "";
  const table = `<div class="con-table"><table><thead><tr><th>Channel</th><th>Type</th><th class="r">Impressions</th><th class="r">Clicks</th><th class="r">CTR</th><th class="r">Spend</th><th class="r">Cost per click</th></tr></thead><tbody>
    ${vis.map(r => `<tr><td><span class="con-show"><i class="dot s${r.c.slot}"></i><b>${esc(r.c.label)}</b></span></td><td class="muted">${r.c.type}</td><td class="r">${num(r.imp)}</td><td class="r">${num(r.clicks)}</td><td class="r">${r.imp ? pct(r.clicks / r.imp) : "–"}</td><td class="r">${r.spend ? eur(r.spend) : "–"}</td><td class="r">${r.spend && r.clicks ? eur(r.spend / r.clicks) : "–"}</td></tr>`).join("")}
    <tr class="tot"><td><b>Total</b></td><td></td><td class="r">${num(imp)}</td><td class="r">${num(clicks)}</td><td class="r">${imp ? pct(clicks / imp) : "–"}</td><td class="r">${spend ? eur(spend) : "–"}</td><td class="r">${spend && clicks ? eur(spend / clicks) : "–"}</td></tr></tbody></table></div>`;
  const posts = D.posts.sort((a, b) => b.at - a.at);
  const postCards = posts.length ? `<div class="posts">${posts.map(p => { const live = p.at <= Date.now(); const h = hash(p.id); const reach = live ? 300 + h % 2400 : 0;
    return `<div class="post"><div class="post-h">${(p.accounts || []).map(k => `<span class="con-mono sm" title="${esc(CONNECTORS.find(c => c.k === k)?.name || k)}">${esc(CONNECTORS.find(c => c.k === k)?.mono || "?")}</span>`).join("")}<span class="grow"></span><span class="chip ${live ? "st-live" : ""}"><i></i>${live ? "Published" : "Scheduled"}</span></div>
      <b>${esc(p.node.title)}</b><span class="muted" style="font-size:12px">${new Date(p.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}${p.demo ? " · demo" : ""}</span>
      ${live ? `<div class="post-m"><span><b>${num(reach)}</b>Reach</span><span><b>${num(reach * (.04 + (h % 5) / 100))}</b>Likes</span><span><b>${num(reach * .004 + h % 7)}</b>Comments</span><span><b>${num(reach * .01)}</b>Saves</span></div>` : `<button class="btn sm ghost" style="justify-self:start" data-act="socunsched" data-n="${p.node.id}" data-id="${p.id}">Cancel post</button>`}</div>`; }).join("")}</div>`
    : `<div class="empty" style="padding:20px"><span>No social posts yet. Open a carousel and press <b>Publish</b> to post or schedule it to your connected accounts.</span></div>`;
  return `${head}${filters}${tiles}
    <div class="dgrid"><section class="dcard span2"><div class="dcard-h"><b>Traffic by channel</b><span class="faint">Clicks per day</span></div>${traffic}</section>
      <section class="dcard"><div class="dcard-h"><b>Ad spend by channel</b><span class="faint">${RANGES.find(x => x[0] === days)[1]}</span></div>${spendBars}<div class="dcard-h" style="margin-top:14px"><b>Impressions by channel</b></div>${share}</section></div>
    <section style="display:grid;gap:8px"><div class="sec-h"><span>Channels</span></div>${table}</section>
    <section style="display:grid;gap:8px"><div class="sec-h"><span>Social posts</span></div>${postCards}</section>`;
}
function sparkSVG(v) { const max = Math.max(1e-9, ...v); const pts = v.map((y, i) => `${(i / Math.max(1, v.length - 1) * 100).toFixed(2)},${(28 - y / max * 26).toFixed(2)}`).join(" ");
  return `<svg class="dk-s" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="var(--brand)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`; }

/* line chart with crosshair tooltip (HTML overlay) */
S.lc = {};
function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); return Math.ceil(v / p / (v / p > 5 ? 2 : 1)) * p * (v / p > 5 ? 2 : 1); }
function lineChart(id, ds, series, unit) {
  const max = niceMax(Math.max(1, ...series.flatMap(s => s.v))); const W = 1000, H = 220; const n = ds.length;
  S.lc[id] = { ds, series, max, unit };
  const x = (i) => (i / Math.max(1, n - 1) * W).toFixed(1), y = (v) => (H - v / max * H).toFixed(1);
  const fmt = (d) => new Date(d * 864e5).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const ticks = [0, .25, .5, .75, 1];
  return `<div class="lc" data-lc="${id}"><div class="lc-y">${ticks.slice().reverse().map(t => `<span>${num(max * t)}</span>`).join("")}</div>
    <div class="lc-plot"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${unit} per day by channel">
      ${ticks.map(t => `<line x1="0" x2="${W}" y1="${(H - t * H).toFixed(1)}" y2="${(H - t * H).toFixed(1)}" stroke="var(--line)" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join("")}
      ${series.map(s => `<polyline points="${s.v.map((v, i) => `${x(i)},${y(v)}`).join(" ")}" fill="none" class="ln s${s.slot}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>`).join("")}
    </svg><div class="lc-hair" hidden></div><div class="lc-dots"></div><div class="lc-tip" hidden></div></div>
    <div class="lc-x"><span>${fmt(ds[0])}</span><span>${fmt(ds[Math.floor((n - 1) / 2)])}</span><span>${fmt(ds[n - 1])}</span></div>
    <div class="lc-leg">${series.map(s => `<span><i class="s${s.slot}"></i>${esc(s.name)}</span>`).join("")}</div></div>`;
}
function mountDash() {
  $$(".lc").forEach(el => {
    const D = S.lc[el.dataset.lc]; if (!D) return; const plot = el.querySelector(".lc-plot"); const hair = el.querySelector(".lc-hair"), tip = el.querySelector(".lc-tip"), dots = el.querySelector(".lc-dots");
    const n = D.ds.length;
    const show = (cx) => { const r = plot.getBoundingClientRect(); const i = Math.max(0, Math.min(n - 1, Math.round((cx - r.left) / r.width * (n - 1)))); const xp = i / Math.max(1, n - 1) * 100;
      hair.hidden = false; hair.style.left = xp + "%"; dots.innerHTML = D.series.map(s => `<i class="s${s.slot}" style="left:${xp}%;top:${100 - s.v[i] / D.max * 100}%"></i>`).join("");
      const rows = D.series.map(s => [s, s.v[i]]).sort((a, b) => b[1] - a[1]);
      tip.hidden = false; tip.innerHTML = `<b>${new Date(D.ds[i] * 864e5).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</b>${rows.map(([s, v]) => `<span><i class="s${s.slot}"></i>${esc(s.name)}<em>${num(v)}</em></span>`).join("")}`;
      const tw = tip.offsetWidth; let left = xp / 100 * r.width + 12; if (left + tw > r.width) left = xp / 100 * r.width - tw - 12; tip.style.left = Math.max(0, left) + "px"; };
    const hide = () => { hair.hidden = true; tip.hidden = true; dots.innerHTML = ""; };
    plot.onpointermove = (e) => show(e.clientX); plot.onpointerleave = hide; plot.onpointerdown = (e) => show(e.clientX);
  });
}
Object.assign(A, {
  dashrange(t) { S.dashRange = +t.dataset.v; repaintLive(); },
  dashch(t) { S.dashOff = S.dashOff || {}; S.dashOff[t.dataset.k] = !S.dashOff[t.dataset.k]; repaintLive(); },
  socunsched(t) { const n = S.nodes[t.dataset.n]; if (!n) return; n.p.posts = (n.p.posts || []).filter(p => p.id !== t.dataset.id); hist(n, "Cancelled a scheduled post"); commitNode(n); repaintLive(); toast("Scheduled post cancelled"); },
});
function repaintLive() { if (S.view !== "live") return; const b = $("#body"); const sc = b.querySelector(".home")?.scrollTop; b.innerHTML = liveView(); const h = b.querySelector(".home"); if (h && sc) h.scrollTop = sc; mountDash(); }
