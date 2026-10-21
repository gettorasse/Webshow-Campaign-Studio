/* ============================================================
   Publish to social accounts from Webshow (carousels today)
   ============================================================ */
const socialAccounts = () => CONNECTORS.filter(c => c.social && conOn(c.k));
function socialPostList(k) {
  const posts = showPosts(S.showId).filter(p => p.accounts?.includes(k)).sort((a, b) => b.at - a.at);
  if (!S.showId) return `<p class="muted">Open a show to see its posts here.</p>`;
  return posts.length ? `<div style="display:grid;gap:6px">${posts.map(p => `<div class="li" style="padding:6px 0"><span class="t"><b style="font-weight:500">${esc(p.node.title)}</b><span>${new Date(p.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}${p.demo ? " · demo" : ""}</span></span><span class="chip ${p.at <= Date.now() ? "st-live" : ""}"><i></i>${p.at <= Date.now() ? "Published" : "Scheduled"}</span></div>`).join("")}</div>`
    : `<p class="muted">Nothing posted from ${esc(cur()?.name || "this show")} yet. Open a carousel and press Publish.</p>`;
}
function socialModal(nodeId) {
  const n = S.nodes[nodeId]; if (!n) return ""; const accs = socialAccounts(); const P0 = S.soc || {}; const isImg = n.type === "image"; const slides = isImg ? [{ img: n.id }] : (n.p.slides || []);
  const pick = P0.accounts || accs.filter(c => c.formats.includes("carousel")).map(c => c.k);
  const approved = n.status === "approved"; const needApprove = accs.some(c => pick.includes(c.k) && S.con.conns[c.k]?.approve !== false) && !approved && !isImg;
  const li = linkInfo(n, "social"); const link = li?.url || "";
  const dt = P0.when || localDateTime(Date.now() + 864e5 - (Date.now() % 36e5));
  return `<div class="scrim top" data-act="closemodal"><div class="modal" data-stop="1" role="dialog" aria-label="Publish ${esc(n.title)}"><div class="modal-h"><span class="nico" style="--nc:${NT[n.type].color}">${ICON[NT[n.type].icon]}</span><h3>Publish “${esc(n.title)}”</h3><button class="ib" data-act="closemodal" aria-label="Close">${ICON.x}</button></div><div class="modal-b">
    ${!slides.length ? `<p class="muted">Build the carousel first, then publish it.</p>` : !accs.length ? `<div class="wellbox"><b>No social accounts connected</b><span class="muted">Connect Instagram, Facebook, LinkedIn or TikTok once in Connectors, then publish from any show.</span><button class="btn primary" style="justify-self:start" data-act="socgocon">${ICON.plug} Open Connectors</button></div>` : `
    <div class="fld"><span>Post to</span><div class="socacc">${accs.map(c => { const ok = c.formats.includes("carousel"); const cn = S.con.conns[c.k]; return `<label ${ok ? "" : 'style="opacity:.55;cursor:not-allowed"'}><input type="checkbox" data-soc="${c.k}" ${ok && pick.includes(c.k) ? "checked" : ""} ${ok ? "" : "disabled"}><span class="con-mono sm">${esc(c.mono)}</span><span style="display:grid;min-width:0"><b style="font-weight:500">${esc(c.name)}</b><span class="faint" style="font-size:12px">${esc(cn.handle || "")}${cn.demo ? " · demo account" : ""}${ok ? "" : " · videos only"}</span></span></label>`; }).join("")}</div></div>
    <div class="swrow" style="gap:6px;overflow-x:auto;flex-wrap:nowrap">${isImg ? (() => { const v = imageValue(n, .3); return `<div class="soc-img" style="${palVars((styleOf(n) || DEF_DIR).palette)}"><img alt="" src="${v.src}" style="${v.style}">${v.ov ? ovLayer(v.ov, "img") : ""}${imgTextHTML(n)}</div>`; })() : slides.map((s, i) => `<div style="flex:none;width:64px">${slideHTML(n, s, i, slides.length)}</div>`).join("")}</div>
    <label class="fld"><span>Caption</span><textarea class="ta" id="soccap" data-soccap="1" style="min-height:96px">${esc(P0.caption ?? (isImg ? (n.p.caption || [n.p.txt?.headline, n.p.txt?.sub].filter(Boolean).join(" ")) : [n.p.caption, (n.p.hashtags || []).map(h => "#" + h).join(" ")].filter(Boolean).join("\n\n")))}</textarea></label>
    ${link ? `<small class="faint">Link added to the caption${li.live ? "" : " (the page isn't published yet)"}: ${esc(li.display)}</small>` : `<small class="faint">No link: wire a Link node into this ${isImg ? "image" : "carousel"} to add one.</small>`}
    <div class="fld"><span>When</span><div class="seg" style="justify-self:start"><button data-act="socwhen" data-v="now" aria-pressed="${(P0.mode || "now") === "now"}">Post now</button><button data-act="socwhen" data-v="later" aria-pressed="${P0.mode === "later"}">Schedule</button></div></div>
    ${P0.mode === "later" ? `<label class="fld"><span>Date and time</span><input class="inp" type="datetime-local" id="socat" value="${dt}" style="max-width:240px"></label>` : ""}
    ${needApprove ? `<div class="wellbox"><b>This carousel isn't approved yet</b><span class="muted">Your accounts are set to publish approved blocks only. Approve it here or on the canvas first.</span><button class="btn sm" style="justify-self:start" data-act="socapprove" data-id="${n.id}">${ICON.check} Approve now</button></div>` : ""}
    ${accs.some(c => S.con.conns[c.k]?.demo) ? `<p class="con-note">${ICON.spark}<span>Demo accounts record the post in Webshow and show sample reach. Nothing is sent to the real platform until the account is properly connected.</span></p>` : ""}`}
  </div><div class="modal-f"><button class="btn ghost" data-act="closemodal">Cancel</button>${slides.length && accs.length ? `<button class="btn primary" data-act="socpublish" data-id="${n.id}" ${needApprove ? "disabled" : ""}>${P0.mode === "later" ? "Schedule post" : "Publish now"}</button>` : ""}</div></div></div>`;
}
function socRead() { S.soc = S.soc || {}; S.soc.accounts = $$("[data-soc]").filter(x => x.checked).map(x => x.dataset.soc); const c = $("#soccap"); if (c) S.soc.caption = c.value; const a = $("#socat"); if (a) S.soc.when = a.value; }
Object.assign(A, {
  socopen(t) { const id = t.dataset.id || S.nodeEd?.id || S.sel; if (!S.con) loadConnectors(); S.soc = {}; const from = t.dataset.from && S.nodes[t.dataset.from]; if (from?.p.accounts?.length) S.soc.accounts = from.p.accounts.filter(conOn); S.modal = "consocial:" + id; paintLayer(); },
  socwhen(t) { socRead(); S.soc.mode = t.dataset.v; paintLayer(); },
  socgocon() { S.modal = null; S.nodeEd = null; S.view = "connectors"; render(); },
  socapprove(t) { socRead(); const n = S.nodes[t.dataset.id]; n.status = "approved"; hist(n, "Approved"); commitNode(n); paintLayer(); paintAll(); },
  socpublish(t) {
    socRead(); const n = S.nodes[t.dataset.id]; const P0 = S.soc; if (!P0.accounts.length) return toast("Pick at least one account.");
    let at = Date.now(); if (P0.mode === "later") { at = new Date(P0.when).getTime(); if (!at || at < Date.now() + 6e4) return toast("Pick a time in the future."); }
    const demo = P0.accounts.every(k => S.con.conns[k]?.demo);
    let caption = str(P0.caption); const li = linkInfo(n, P0.accounts[0] || "social");
    if (li?.url && P0.accounts.some(k => S.con.conns[k]?.link !== false)) caption += `\n\n${li.url}`;
    n.p.posts = [...(n.p.posts || []), { id: uid("po"), accounts: P0.accounts, at, created: now(), by: Store.me.id, caption: caption.slice(0, 2200), demo }];
    hist(n, P0.mode === "later" ? "Scheduled a social post" : "Published to social"); commitNode(n); paintNode(n.id);
    const names = P0.accounts.map(k => CONNECTORS.find(c => c.k === k)?.name).join(", ");
    S.modal = null; S.soc = null; paintLayer(); if (S.view === "live") repaintLive();
    toast(P0.mode === "later" ? `Scheduled for ${new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : demo ? `Recorded as posted to ${names} (demo)` : `Published to ${names}`);
  },
});
