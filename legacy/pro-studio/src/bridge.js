/* ============================================================
   Webshow Pro ↔ Webshow Play: one Show, two experiences.
   - Sidebar: New show, All shows, and every Show (from Pro and from Play) with status.
   - A Play Show opens in Pro with the SAME id: its canvas is built once from the Play Show.
   - Every Show has ONE Showrunner conversation, stored with Play's chats ("webshow.v1"),
     shown here in a right-hand panel and in Play on the phone.
   - The panel uses the Webshow server (/api/showrunner) when the AI is set up, otherwise
     clearly labelled demo answers. Changes are proposed as cards and applied only on Apply.
   Shared rules live in ../shared/bridge.js (tested). Loaded with dynamic import, so this file
   stays a plain script like the rest of the studio.
   ============================================================ */
const BR = { mod: null, prompts: null, offline: null, ai: undefined, busy: false };
async function brMods() {
  if (!BR.mod) [BR.mod, BR.prompts, BR.offline] = await Promise.all([import("../shared/bridge.js"), import("../shared/prompts.js"), import("../js/offline.js")]);
  return BR;
}
const playData = () => { try { return JSON.parse(localStorage.getItem("webshow.v1") || "null"); } catch { return null; } };
const writePlay = (d) => { try { localStorage.setItem("webshow.v1", JSON.stringify(d)); } catch { toast("Couldn't save the conversation on this device."); } };
const emptyPlay = () => ({ version: 2, profile: {}, chats: {}, shows: {}, settings: { plan: "starter" } });
/* Play Shows that don't have a canvas yet */
const playOnly = () => Object.values(playData()?.shows || {}).filter(s => !S.shows[s.id]).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
const PHONE_IC = P('<rect x="4.5" y="1.8" width="7" height="12.4" rx="1.6"/><path d="M7 12h2"/>');
const MASCOT_IC = P('<rect x="2" y="3" width="12" height="11" rx="4"/><circle cx="6" cy="8" r="1" fill="currentColor"/><circle cx="10" cy="8" r="1" fill="currentColor"/><path d="M6.2 10.6q1.8 1.2 3.6 0M8 3V1.3"/>');

/* ---------- sidebar: New show · All shows · Shows ---------- */
{ const _sb = sidebar; sidebar = function () {
  let h = _sb();
  /* "New show" opens the guided start (Showrunner, idea, build), not an empty project */
  h = h.replace(/<button class="srow brand" data-act="newshow"[\s\S]*?<\/button>/, "");
  h = h.replace(/(<label class="sb-search">[\s\S]*?<\/label>)/, `<button class="srow brand sb-new" data-act="srnew"><span class="ic">${ICON.plus}</span><span class="lbl">New show</span></button>$1`);
  h = h.replace(/(<button class="srow brand" data-act="home"[^>]*>)<span class="ic">[\s\S]*?<\/span><span class="lbl">Showrunner<\/span>/, `$1<span class="ic">${ICON.grid}</span><span class="lbl">All shows</span>`);
  /* label the list of Shows, and add Play Shows that haven't been opened here yet */
  const po = playOnly();
  const playRows = po.map(s => `<button class="srow from-play" data-act="fromplay" data-id="${esc(s.id)}" title="Made in Webshow Play. Opening it here builds its canvas."><span class="av" style="--nc:${esc(s.strategy?.colors?.[0] || "var(--brand)")}">${esc((s.strategy?.name || "?")[0].toUpperCase())}</span><span class="lbl">${esc(s.strategy?.name || "New show")}</span><span class="ct sb-play">${PHONE_IC}</span></button>`).join("");
  h = h.replace(/(<div class="sb-sep"><\/div>)/, `$1<div class="sb-label">Shows</div>`);
  h = h.replace(/(\s*<\/div>\s*<div class="sb-foot">)/, `${playRows ? `<div class="sb-label sm">From Webshow Play</div>${playRows}` : ""}$1`);
  /* switch experiences */
  h = h.replace(/(<div class="sb-foot">)/, `$1<a class="srow brand" href="../?view=play"><span class="ic">${PHONE_IC}</span><span class="lbl">Webshow Play</span><span class="ct">phone</span></a>`);
  return h;
}; }

/* ---------- topbar: open the Show's Showrunner ---------- */
{ const _tb = topbar; topbar = function () {
  const h = _tb(); const s = cur(); if (!s || ["home", "connectors"].includes(S.view)) return h;
  const btn = `<button class="btn sm srp-btn" data-act="srpanel" aria-pressed="${!!S.srOpen}">${MASCOT_IC} Showrunner</button>`;
  return h.replace('<div class="peers" id="peers">', btn + '<div class="peers" id="peers">');
}; }

/* ---------- the Showrunner panel ---------- */
{ const _r = render; render = function () { _r(); mountSRP(); }; }
function mountSRP() {
  const main = $(".main"); if (!main) return;
  main.classList.toggle("has-srp", !!(S.srOpen && cur() && !["home", "connectors"].includes(S.view)));
  if (!S.srOpen || !cur() || ["home", "connectors"].includes(S.view)) { BR.el?.remove(); return; }
  /* keep the same panel element across the studio's full re-renders (focus, scroll and clicks survive) */
  if (!BR.el) { BR.el = document.createElement("aside"); BR.el.id = "srp"; BR.el.className = "srp"; }
  if (BR.el.parentNode !== main) main.append(BR.el);
  if (BR.el.dataset.show !== cur().id) { BR.el.dataset.show = cur().id; BR.el.dataset.sig = ""; }
  paintSRP();
}
function srpChat() {
  const s = cur(); const d = playData() || emptyPlay();
  return Object.values(d.chats || {}).find(c => c.showId === s.id) || null;
}
function paintSRP() {
  const el = $("#srp"); const s = cur(); if (!el || !s) return;
  const k = s.showrunner || "ogilvy"; const r = SHOWRUNNERS[k] || SHOWRUNNERS.ogilvy; const role = { ogilvy: "The Strategist", hormozi: "The Closer", vaynerchuk: "The Creator" }[k] || "Showrunner";
  const c = srpChat(); const msgs = c?.messages || [];
  const scroll = el.querySelector(".srp-msgs")?.scrollTop;
  const html = `<div class="srp-h"><span class="srp-av">${ICON[r.icon] || MASCOT_IC}</span><span class="srp-t"><b>${esc(role)}</b><small>${esc(r.name)} style · ${esc(s.name)}</small></span><button class="ib" data-act="srpanel" aria-label="Close the Showrunner">${ICON.x}</button></div>
    <div class="srp-note">${BR.ai === false ? "Demo answers: the AI isn't set up on this server." : BR.ai ? "Shared with Webshow Play: the same conversation on your phone." : "Shared with Webshow Play."}</div>
    <div class="srp-msgs">${msgs.length ? msgs.map((m, i) => srpMsg(m, i, msgs)).join("") : `<div class="srp-empty">${MASCOT_IC}<p>This is ${esc(s.name)}'s Showrunner. Ask for changes, ideas or what to do next. Every change is shown before it happens.</p></div>`}${BR.busy ? `<div class="srp-m them"><div class="srp-b typing-b"><span class="tdots"><i></i><i></i><i></i></span></div></div>` : ""}</div>
    ${BR.busy ? "" : `<div class="srp-quick">${["What's next?", "Make the posts shorter", "Move everything a week later"].map(q => `<button class="chip" data-act="srsay" data-t="${esc(q)}">${esc(q)}</button>`).join("")}</div>`}
    <form class="srp-form" data-srp-form><textarea id="srp-in" rows="2" placeholder="Ask ${esc(role)} about this show…" ${BR.busy ? "disabled" : ""}></textarea><button class="send" aria-label="Send" ${BR.busy ? "disabled" : ""}>${ICON.send || "→"}</button></form>`;
  /* the studio re-renders often while it builds; only repaint when the conversation changed */
  if (el.dataset.sig === html) return; const draft = el.querySelector("#srp-in")?.value || ""; const focused = document.activeElement?.id === "srp-in";
  el.innerHTML = html; el.dataset.sig = html; const inp = el.querySelector("#srp-in"); if (inp) { inp.value = draft; if (focused) inp.focus(); }
  const box = el.querySelector(".srp-msgs"); if (box) box.scrollTop = scroll == null || BR.stick ? box.scrollHeight : scroll; BR.stick = false;
}
const PRO_OPS = new Set(["move", "shift", "strategy", "rewrite"]);
function srpMsg(m, i, all) {
  if (m.role === "user") return `<div class="srp-m mine"><div class="srp-b">${esc(m.text)}</div></div>`;
  const answered = all.slice(i + 1).some(x => x.role === "user");
  const cards = (m.cards || []).map((c, k) => {
    const id = `data-m="${esc(m.id)}" data-c="${k}"`;
    if (c.type === "question") return answered ? "" : `<div class="srp-opts">${c.options.map(o => `<button class="chip" data-act="srsay" data-t="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
    if (c.type === "tip") return `<div class="srp-card tip"><b>${esc(c.title || "Tip")}</b><p>${esc(c.text)}</p></div>`;
    if (c.type === "error") return `<div class="srp-card err"><b>That didn't work</b><p>${esc(c.text)}</p>${c.retried ? "" : `<button class="btn sm" data-act="srretry" ${id}>Try again</button>`}</div>`;
    if (c.type === "change") { const fits = (o) => PRO_OPS.has(o.op) && (o.op === "rewrite" ? o.ids.some(x => S.nodes[x]) : o.op === "move" ? !!S.nodes[o.id] : true); const ok = c.ops.filter(fits);
      return `<div class="srp-card change"><b>${esc(c.summary)}</b><ul>${c.ops.map(o => `<li>${esc(opLabel(o))}${fits(o) ? "" : " <i>(made in Webshow Play: apply it there)</i>"}</li>`).join("")}</ul>${c.applied ? `<span class="chip st-live"><i></i>Applied</span>` : c.dismissed ? `<span class="chip">Skipped</span>` : ok.length ? `<div class="swrow"><button class="btn sm primary" data-act="srapply" ${id}>Apply</button><button class="btn sm" data-act="srskip" ${id}>Not now</button></div>` : ""}</div>`; }
    if (c.type === "open" || c.type === "concept" || c.type === "goals") return "";
    return "";
  }).join("");
  return `<div class="srp-m them">${m.text ? `<div class="srp-b">${esc(m.text)}</div>` : ""}${cards}</div>`;
}
function opLabel(o) {
  const t = (id) => S.nodes[id]?.title || "a post";
  if (o.op === "rewrite") return `Rewrite ${o.ids.length > 2 ? o.ids.length + " episodes" : o.ids.map(t).join(" and ")}${o.note ? `: “${o.note}”` : ""}`;
  if (o.op === "move") return `Move ${t(o.id)} to ${fmtISO(o.date, { day: "numeric", month: "short" })}`;
  if (o.op === "shift") return `Move every episode still to come ${Math.abs(o.days)} days ${o.days > 0 ? "later" : "earlier"}`;
  if (o.op === "strategy") return `Change the ${o.field} to “${o.value}”`;
  if (o.op === "done") return `Mark ${o.ids.length} as posted`;
  return "";
}
/* one conversation per Show, kept with Play's chats */
function srpEnsureChat(d) {
  const s = cur(); let c = Object.values(d.chats || {}).find(x => x.showId === s.id);
  if (!c) { c = BR.mod.newShowChat(s.id, s.name, s.showrunner || "ogilvy"); (d.chats ||= {})[c.id] = c; }
  return c;
}
async function srpSend(text) {
  text = String(text || "").trim(); const s = cur(); if (!text || !s || BR.busy) return;
  try { await brMods(); } catch { toast("The Showrunner panel needs the Webshow server. Open Pro from your Webshow site."); return; }
  let d = playData() || emptyPlay(); let c = srpEnsureChat(d);
  c.messages.push({ id: "m" + uid(""), role: "user", text, cards: [], at: Date.now() }); c.updatedAt = Date.now(); writePlay(d);
  BR.busy = true; BR.stick = true; paintSRP(); const t0 = Date.now();
  if (BR.ai === undefined) BR.ai = await fetch("/api/showrunner", { cache: "no-store" }).then(r => r.json()).then(j => !!(j.ok && j.ai)).catch(() => false);
  const slim = BR.mod.proToSlim(s, S.nodes); let r = null, err = null;
  const msgs = c.messages.slice(-14).map(m => ({ role: m.role, text: m.text || "" }));
  if (BR.ai) {
    try { const res = await fetch("/api/showrunner", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task: "showchat", input: { profile: { ...(d.profile || {}), showrunner: s.showrunner }, show: slim, messages: msgs, today: todayISO() } }) }).then(x => x.json());
      if (!res.ok) throw { code: res.error }; r = BR.prompts.normShowChat(res.data, slim); } catch (e) { err = e; }
  } else r = BR.offline.offlineShowChat({ show: slim, messages: c.messages });
  await new Promise(ok => setTimeout(ok, Math.max(0, 900 - (Date.now() - t0))));
  d = playData() || emptyPlay(); c = srpEnsureChat(d);
  c.messages.push(err ? { id: "m" + uid(""), role: "sr", text: "", cards: [{ type: "error", text: err.code === "rate_limited" ? "Your Showrunner needs a breather. Try again in a minute." : "The AI didn't answer this time. Nothing is lost.", retry: text }], at: Date.now() }
    : { id: "m" + uid(""), role: "sr", text: r.reply, cards: r.cards, at: Date.now() });
  c.updatedAt = Date.now(); writePlay(d); BR.busy = false; BR.stick = true; paintSRP();
}
function srpCard(b) { const d = playData(); const c = d && srpEnsureChat(d); const m = c?.messages.find(x => x.id === b.dataset.m); return { d, m, card: m?.cards?.[+b.dataset.c] }; }
/* Apply a proposed change on the canvas. Only what the studio can really do. */
async function srpApply(ops) {
  const s = cur(); const dna = s.dna ||= DNA_DEF(); const posted = (n) => (n.p.posts || []).some(p => p.done); let rebuilt = 0, cant = 0;
  for (const o of ops) {
    if (o.op === "move") { const n = S.nodes[o.id]; if (n) { n.p.start = o.date; commitNode(n); } }
    if (o.op === "shift") { epList().filter(n => !posted(n) && n.p.start).forEach(n => { n.p.start = addDays(n.p.start, o.days); commitNode(n); }); if (!epList().some(posted) && dna.start) { dna.start = addDays(dna.start, o.days); if (dna.end) dna.end = addDays(dna.end, o.days); } }
    if (o.op === "strategy") { const f = { name: "name", idea: "idea", offer: "offer", cta: "cta", audience: "audience", message: "idea", tagline: "idea" }[o.field]; if (f === "name") s.name = o.value; else if (f) dna[f] = o.value; }
  }
  Store.putShow(s); paintAll(); renderSidebarOnly();
  for (const o of ops) if (o.op === "rewrite") for (const id of o.ids) { const n = S.nodes[id]; if (!n) continue; if (o.note) n.p.angle = o.note; if (BUILDABLE.has(n.type)) { await buildNode(n); rebuilt++; } else { commitNode(n); cant++; } }
  return { rebuilt, cant };
}

/* ---------- Play → Pro: build the canvas for a Play Show, same id ---------- */
async function fromPlay(id) {
  if (S.shows[id]) return openShow(id, "canvas");
  try { await brMods(); } catch { return toast("Opening Play Shows needs the Webshow server."); }
  const d = playData(); const ps = d?.shows?.[id]; if (!ps) return toast("That Show isn't on this device any more.");
  const t = BR.mod.playToPro(ps, d.profile || {});
  const tints = Object.keys(TINTS).filter(k => k !== "slate");
  const s = { ...t.show, tint: tints[hash(id) % tints.length], client: "", createdAt: now(), updatedAt: now(), by: Store.me.id, needs: 0, building: 0, nodeCount: 0, laned: true, fresh: false,
    dna: { ...DNA_DEF(), ...t.dna, target: OB_TARGET[t.dna.goal] || 30 } };
  S.obName = s.showrunner; S.obStep = 1; paintLayer();
  S.shows[id] = s; await Store.putShow(s);
  openShow(id, "canvas");
  S.season = { showId: id, ...t.season }; S.seasonFmt = t.season.format;
  await new Promise(ok => setTimeout(ok, 500)); S.obStep = 2; paintLayer();
  const done = buildSeason();
  setTimeout(() => { S.obStep = null; paintLayer(); toast(t.skipped.length ? `Canvas built from Webshow Play. Not on the canvas yet: ${[...new Set(t.skipped)].join(", ")}.` : "Canvas built from Webshow Play. Same Show, same Showrunner."); }, 900);
  /* tell Play this Show now also lives in Pro */
  const pd = playData(); if (pd?.shows?.[id]) { pd.shows[id].inPro = Date.now(); writePlay(pd); }
  await done;
}

/* ---------- actions, deep links, keeping in step with Play ---------- */
Object.assign(A, {
  srnew() { S.view = "home"; S.showId = null; S.sbOpen = false; render(); setTimeout(() => $(".ob-field textarea, .home textarea")?.focus(), 60); },
  fromplay(b) { S.sbOpen = false; fromPlay(b.dataset.id); },
  srpanel() { S.srOpen = !S.srOpen; render(); window.dispatchEvent(new Event("resize")); if (S.srOpen) { brMods().then(() => { if (BR.ai === undefined) fetch("/api/showrunner", { cache: "no-store" }).then(r => r.json()).then(j => { BR.ai = !!(j.ok && j.ai); paintSRP(); }).catch(() => { BR.ai = false; paintSRP(); }); }).catch(() => {}); setTimeout(() => $("#srp-in")?.focus(), 50); } },
  srsay(b) { srpSend(b.dataset.t); },
  srretry(b) { const { d, card } = srpCard(b); if (!card) return; card.retried = true; writePlay(d); srpSend(card.retry); },
  async srapply(b) { const { d, card } = srpCard(b); if (!card || card.applied) return; card.applied = true; writePlay(d); paintSRP(); toast("Applying the change…");
    const r = await srpApply(card.ops.filter(o => PRO_OPS.has(o.op)).map(o => o.ids ? { ...o, ids: o.ids.filter(x => S.nodes[x]) } : o));
    const d2 = playData(); const c = srpEnsureChat(d2); c.messages.push({ id: "m" + uid(""), role: "sr", text: `Done.${r.rebuilt ? ` Rebuilt ${r.rebuilt} episode${r.rebuilt > 1 ? "s" : ""}${AI.fn ? "" : " as offline drafts (the studio's own AI only runs inside Claude)"}.` : ""}${r.cant ? ` ${r.cant} episode${r.cant > 1 ? "s" : ""} got your note as the angle; rebuild them from the inspector.` : ""}`, cards: [], at: Date.now() }); writePlay(d2); paintSRP(); },
  srskip(b) { const { d, card } = srpCard(b); if (card) { card.dismissed = true; writePlay(d); paintSRP(); } },
});
document.addEventListener("submit", (e) => { const f = e.target.closest?.("[data-srp-form]"); if (!f) return; e.preventDefault(); const t = $("#srp-in"); const v = t.value; t.value = ""; srpSend(v); });
document.addEventListener("keydown", (e) => { if (e.target.id === "srp-in" && e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.target.form.requestSubmit(); } });
window.addEventListener("storage", (e) => { if (e.key === "webshow.v1") { renderSidebarOnly(); if (S.srOpen) paintSRP(); } });
{ const _init = Store.init.bind(Store); Store.init = async function () { await _init(); setTimeout(() => {
  const m = location.hash.match(/^#show=([\w-]+)/); if (!m) return; history.replaceState(null, "", location.pathname + location.search);
  if (S.shows[m[1]]) openShow(m[1], "canvas"); else if (playData()?.shows?.[m[1]]) fromPlay(m[1]);
}, 0); }; }
