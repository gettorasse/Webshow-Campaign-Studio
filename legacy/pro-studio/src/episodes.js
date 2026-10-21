/* ============================================================
   Episodes: dated releases with a role in the story, aired on
   chosen channels and pointing back to the landing page.
   Plus two interactive episode formats: Quiz and Poll.
   ============================================================ */
ICON.quiz = P('<rect x="2.5" y="2.5" width="11" height="11" rx="2.5"/><path d="M6.4 6.3a1.7 1.7 0 1 1 2.4 1.5c-.5.3-.8.6-.8 1.2M8 11.2v.1"/>');
ICON.poll = P('<path d="M3 13.5V8M6.5 13.5V3.5M10 13.5V6.5M13.5 13.5V10"/>');
const EP_TYPES = new Set(["carousel", "image", "metaad", "ad", "quiz", "poll"]);
const ARCS = [["teaser", "Teaser", "Raise curiosity"], ["launch", "Launch", "Reveal the offer"], ["proof", "Proof", "Show that it works"], ["urgency", "Urgency", "A reason to act now"], ["last", "Last chance", "Close the doors"]];
const EP_CHANNELS = [["instagram", "Instagram", ["carousel", "image", "quiz", "poll"]], ["facebook", "Facebook", ["carousel", "image", "quiz", "poll"]], ["linkedinpage", "LinkedIn", ["carousel", "image", "quiz", "poll"]], ["tiktokacc", "TikTok", ["carousel", "image"]], ["meta", "Meta ads", ["metaad", "carousel", "image", "quiz", "poll"]], ["gads", "Google Ads", ["ad"]]];
const EP_DEF_CH = { carousel: ["instagram", "facebook"], image: ["instagram"], metaad: ["meta"], ad: ["gads"], quiz: ["instagram", "facebook"], poll: ["instagram"] };
const EP_FMT = { carousel: "Carousel", image: "Image post", metaad: "Meta ad", ad: "Search ad", quiz: "Quiz", poll: "Poll" };
const arcOf = (n) => ARCS.find(a => a[0] === n.p.arc) || null;

/* ---------- quiz and poll node types ---------- */
NT.quiz = {
  label: "Quiz", cat: "block", icon: "quiz", desc: "Interactive episode: a few questions, a personal result, a lead",
  inputs: [{ k: "text", t: "text", label: "Copy & brief", multi: true }, { k: "style", t: "style", label: "Style" }, { k: "link", t: "link", label: "Link" }],
  outputs: [{ k: "post", t: "post", label: "Post" }],
  params: () => ({ title: "", intro: "", questions: [], results: [], email: true, cta: "", slug: "", live: false, at: 0 }),
};
NT.poll = {
  label: "Poll", cat: "block", icon: "poll", desc: "Interactive episode: one question, one tap, a warm audience",
  inputs: [{ k: "text", t: "text", label: "Copy & brief", multi: true }, { k: "style", t: "style", label: "Style" }, { k: "link", t: "link", label: "Link" }],
  outputs: [{ k: "post", t: "post", label: "Post" }],
  params: () => ({ question: "", opts: ["", "", ""], thanks: "", email: true, cta: "", slug: "", live: false, at: 0 }),
};
["quiz", "poll"].forEach(k => { NT[k].grp = "content"; NT[k].color = NODE_GROUPS.find(g => g[0] === "content")[2]; BUILDABLE.add(k); });
NODE_GROUPS.find(g => g[0] === "content")[3].push("quiz", "poll");
/* every episode type carries its date, role, channels and boost */
EP_TYPES.forEach(k => { const f = NT[k].params; NT[k].params = () => ({ start: "", end: "", arc: "", angle: "", channels: (EP_DEF_CH[k] || []).slice(), boost: 0, ...f() }); });
{ const i = LIB_SOON.findIndex(x => x[0] === "quiz"); if (i >= 0) LIB_SOON.splice(i, 1); }

function isEpisode(n) { return !!n && EP_TYPES.has(n.type) && (n.type !== "image" || laneOf(n) !== "kit"); }
const LANE_ORD = { hook: 0, show: 1, convert: 2 };
function epList() { return Object.values(S.nodes).filter(isEpisode).sort((a, b) => (a.p.start || "9999").localeCompare(b.p.start || "9999") || LANE_ORD[laneOf(a)] - LANE_ORD[laneOf(b)] || a.y - b.y); }
function epNo(n) { return epList().findIndex(x => x.id === n.id) + 1; }

/* ---------- canvas chip, inspector, Showrunner context ---------- */
const nodeStatusBase = nodeStatus;
{ const _ns = nodeStatusBase; nodeStatus = (n) => { const s = _ns(n); if (!isEpisode(n)) return s; return `<span class="chip ep" title="${esc(arcOf(n)?.[1] || "Episode")}">Ep ${epNo(n)}${n.p.start ? " · " + fmtISO(n.p.start) : ""}</span>` + s; }; }
function episodeGroup(n) {
  const p = n.p; const L = laneOf(n); const li = linkInfo(n); const d = dnaOf();
  const out = d.start && p.start && (p.start < d.start || (d.end && p.start > d.end));
  const chans = EP_CHANNELS.filter(c => c[2].includes(n.type));
  return `<div class="grp epg"><h4>Episode ${epNo(n)} of ${epList().length}</h4>
    <div class="fld"><span>Lane</span><div class="seg" style="justify-self:start">${["hook", "show", "convert"].map(l => `<button data-act="eplane" data-v="${l}" aria-pressed="${L === l}">${LANES.find(x => x[0] === l)[1]}</button>`).join("")}</div></div>
    <div class="g2">${fP(n, "start", "Goes out", { type: "date" })}${fP(n, "end", "Runs until", { type: "date" })}</div>
    ${out ? `<small class="warnline">Outside the show's dates, ${fmtISO(d.start)} → ${fmtISO(d.end)}.</small>` : ""}
    ${(() => { const dv = deliveryOf(n); const act = ["posted", "running", "live", "ended"].includes(dv.k) ? "" : ["carousel", "image"].includes(n.type) && (n.type === "image" || p.slides?.length) && dv.k !== "scheduled" ? `<button class="btn sm" data-act="socopen" data-id="${n.id}">${ICON.share} Schedule a post</button>` : ["quiz", "poll"].includes(n.type) && !p.live ? `<button class="btn sm" data-act="qzpublish">${ICON.rocket} Publish</button>` : ["ad", "metaad"].includes(n.type) && dv.k !== "scheduled" ? `<small class="faint">Goes out when an Ad channel with a connected account launches it.</small>` : "";
      return `<div class="dlv dlv-${dv.k}"><span class="t"><b>${esc(dlvLabel(dv))}</b><span>${esc(DELIVERY[dv.k][1])}</span></span>${act}</div>`; })()}
    ${fP(n, "arc", "Role in the story", { sel: [["", "Pick a role"], ...ARCS.map(a => [a[0], `${a[1]} · ${a[2]}`])] })}
    ${fP(n, "angle", "Angle", { ph: "What this episode says, in one line" })}
    <div class="fld"><span>Where it airs</span><div class="chans">${chans.map(([k, l]) => `<label class="check"><input type="checkbox" data-epch="${k}" ${(p.channels || []).includes(k) ? "checked" : ""}> ${l}${conOn(k) ? "" : ` <span class="faint">· not connected</span>`}</label>`).join("")}</div></div>
    ${n.type !== "ad" ? fP(n, "boost", "Boost from the show budget, €", { type: "number", min: 0, hint: "0 keeps it organic." }) : ""}
    <div class="li" style="padding:2px 0"><span class="nico" style="--nc:${NT.link.color}">${ICON.link}</span><span class="t"><b style="font-weight:500">${li ? esc(li.display) : "No destination yet"}</b><span>${li ? (li.node?.auto ? "The show's landing page · tracked per episode" : "Set by a wired Link") : "Add a landing page to the show"}</span></span></div></div>`;
}
{ const _ib = inspectorBody; inspectorBody = (n) => (isEpisode(n) ? episodeGroup(n) : "") + inheritGroup(n) + _ib(n); }
{ const _ib2 = inputsBlock; inputsBlock = (n) => { const s = _ib2(n); if (!isEpisode(n)) return s; const a = arcOf(n);
  return s.replace(/<\/input>\s*$/, `\nEPISODE ${epNo(n)} of ${epList().length} in the show. Lane: ${laneOf(n)}. Role: ${a ? `${a[1]} (${a[2]})` : "not set"}.${n.p.angle ? ` Angle: ${n.p.angle}.` : ""} Make it a fresh variation of the show's big idea, not a repeat of other episodes.\n</input>`); }; }
Object.assign(A, {
  eplane(b) { const n = selNode(); if (!n) return; const l = b.dataset.v; const x0 = LANE_X[l]; const col = Object.values(S.nodes).filter(x => x.id !== n.id && Math.abs(x.x - x0) < 160);
    n.x = x0; n.y = col.length ? Math.max(...col.map(x => x.y + (EST_H[x.type] || 270))) + 44 : 0; hist(n, "Moved to " + LANES.find(x => x[0] === l)[1]); commitNode(n); paintWorld(); S.inspFor = null; paintInspector(); centerOn(n.id); },
});
document.addEventListener("change", (e) => {
  const t = e.target; if (!t.dataset?.epch) return; const n = selNode() || (S.nodeEd && S.nodes[S.nodeEd.id]); if (!n) return;
  const set0 = new Set(n.p.channels || []); t.checked ? set0.add(t.dataset.epch) : set0.delete(t.dataset.epch); n.p.channels = [...set0]; hist(n, "Channels changed"); commitNode(n); paintNode(n.id);
});

/* ---------- building quizzes and polls ---------- */
BUILD_AI.quiz = async (n) => {
  const r = await AI.json(`Write a short interactive lead quiz for a campaign show. It should feel like a game, end in a personal recommendation and lead to the main action.\n${RULES}\n${inputsBlock(n)}\nReply with ONLY JSON: {"title": string max 48 chars, "intro": string max 140 chars, "questions": exactly 3 {"q": string max 70 chars, "opts": exactly 3 {"t": string max 40 chars, "r": 0|1|2 (which result it points to)}}, "results": exactly 3 {"title": string max 40 chars, "text": string max 180 chars}, "cta": string max 24 chars}`);
  if (!arr(r?.questions).length) return BUILD_OFF.quiz(n);
  return { p: { title: str(r.title), intro: str(r.intro), questions: arr(r.questions, 5).map(q => ({ q: str(q.q), opts: arr(q.opts, 4).map(o => ({ t: str(o.t), r: Math.max(0, Math.min(2, +o.r || 0)) })) })), results: arr(r.results, 3).map(x => ({ title: str(x.title), text: str(x.text) })), cta: str(r.cta, briefOf(n)?.cta || "See the offer") } };
};
BUILD_OFF.quiz = (n) => { const b = briefOf(n) || {}; const biz = b.business || cur()?.name || "us"; const cta = b.cta || "See the offer";
  return { p: { title: `Which ${biz} fits you?`, intro: "Three quick questions and you get a recommendation made for you.",
    questions: [{ q: "What are you planning?", opts: [{ t: "Something easy", r: 0 }, { t: "Something memorable", r: 1 }, { t: "Something for a group", r: 2 }] },
      { q: "What matters most?", opts: [{ t: "No hassle", r: 0 }, { t: "The experience", r: 1 }, { t: "Room for everyone", r: 2 }] },
      { q: "When?", opts: [{ t: "As soon as possible", r: 0 }, { t: "A special date", r: 1 }, { t: "When the gang can make it", r: 2 }] }],
    results: [{ title: "The easy choice", text: b.offer ? `Keep it simple: ${b.offer}.` : "Keep it simple and let us do the work." }, { title: "The full experience", text: "Go all in and make it the thing people remember." }, { title: "The group plan", text: "Bring everyone. It's better together." }], cta } }; };
BUILD_AI.poll = async (n) => {
  const r = await AI.json(`Write a one-question social poll for a campaign show. Easy to answer in one tap, related to the show's big idea, and it should warm people up for the offer.\n${RULES}\n${inputsBlock(n)}\nReply with ONLY JSON: {"question": string max 80 chars, "opts": 2-4 strings max 32 chars, "thanks": string max 120 chars, "cta": string max 24 chars}`);
  if (!str(r?.question)) return BUILD_OFF.poll(n);
  return { p: { question: str(r.question), opts: arr(r.opts, 4).map(x => str(x)), thanks: str(r.thanks), cta: str(r.cta, briefOf(n)?.cta || "See the offer") } };
};
BUILD_OFF.poll = (n) => { const b = briefOf(n) || {}; return { p: { question: b.idea ? `${b.idea}: where would you start?` : "Which one sounds most like you?", opts: ["This weekend", "Next month", "Just looking"], thanks: "Thanks! Here's something you might like.", cta: b.cta || "See the offer" } }; };

/* ---------- the interactive card: Studio preview and the public page ---------- */
const QZ = new Map(); let qzSeq = 0;
function qzData(n) { return { kind: n.type, ...clone(n.p), href: linkInfo(n, n.type)?.url || "", biz: briefOf(n)?.business || cur()?.name || "" }; }
function qzMount(host, d, { preview = true, slug = "" } = {}) { const id = "qz" + (++qzSeq); QZ.set(id, { d, preview, slug, i: -1, picks: [] }); host.innerHTML = `<div class="qz" id="${id}">${qzScreen(id)}</div>`; }
function qzResult(st) { const c = [0, 0, 0]; st.picks.forEach(r => (c[r] = (c[r] || 0) + 1)); const i = c.indexOf(Math.max(...c)); return st.d.results?.[i] || st.d.results?.[0] || { title: "", text: "" }; }
function qzScreen(id) {
  const st = QZ.get(id); const d = st.d; const cta = `<a class="qz-cta" href="${esc(d.href || "#")}" ${st.preview || !d.href ? 'data-qz-noop="1"' : ""}>${esc(d.cta || "See the offer")} →</a>`;
  const mail = (lbl) => `<form class="qz-mail" data-qz-mail="${id}"><label>${esc(lbl)}<input type="email" placeholder="you@example.com" required></label><button class="qz-btn" type="submit">Send</button></form>`;
  const head = `<span class="qz-k">${esc(d.biz || "")}${d.biz ? " · " : ""}${d.kind === "poll" ? "Poll" : "Quiz"}</span>`;
  if (d.kind === "poll") {
    if (st.voted == null) return `<div class="qz-card">${head}<h2>${esc(d.question || "Your question")}</h2><div class="qz-opts">${(d.opts || []).filter(Boolean).map((o, i) => `<button class="qz-o" data-qz="${id}" data-qv="${i}">${esc(o)}</button>`).join("")}</div></div>`;
    return `<div class="qz-card">${head}<h2>${esc(d.thanks || "Thanks! Your vote is in.")}</h2>${d.email && !st.mailed ? mail("Want to hear how it turns out?") : st.mailed ? `<p class="qz-ok">You're on the list.</p>` : ""}${cta}</div>`;
  }
  const qs = d.questions || [];
  if (st.i < 0) return `<div class="qz-card">${head}<h2>${esc(d.title || "Your quiz")}</h2><p>${esc(d.intro || "")}</p><button class="qz-btn" data-qz="${id}" data-qstart="1">Start · ${qs.length} questions</button></div>`;
  if (st.i < qs.length) { const q = qs[st.i]; return `<div class="qz-card">${head}<div class="qz-step"><i style="width:${(st.i + 1) / qs.length * 100}%"></i></div><span class="qz-n">${st.i + 1} / ${qs.length}</span><h2>${esc(q.q)}</h2><div class="qz-opts">${(q.opts || []).map((o, i) => `<button class="qz-o" data-qz="${id}" data-qa="${i}">${esc(o.t)}</button>`).join("")}</div></div>`; }
  if (d.email && !st.mailed && !st.skip) return `<div class="qz-card">${head}<h2>Your result is ready</h2>${mail("Where should we send it?")}<button class="qz-skip" data-qz="${id}" data-qskip="1">Just show me</button></div>`;
  const r = qzResult(st); return `<div class="qz-card">${head}<span class="qz-n">Your result</span><h2>${esc(r.title)}</h2><p>${esc(r.text)}</p>${cta}<button class="qz-skip" data-qz="${id}" data-qagain="1">Start over</button></div>`;
}
function qzRepaint(id) { const el = document.getElementById(id); if (el) el.innerHTML = qzScreen(id); }
async function qzLead(st, lead) { if (st.preview || !st.slug) return; try { await Store.addLead(st.slug, { name: "", email: "", ...lead }); } catch {} }
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-qz]"); if (b) { e.preventDefault(); const id = b.dataset.qz; const st = QZ.get(id); if (!st) return; const d = st.d;
    if (b.dataset.qstart) st.i = 0;
    else if (b.dataset.qa != null) { st.picks.push(d.questions[st.i].opts[+b.dataset.qa]?.r || 0); st.i++; if (st.i >= d.questions.length && !d.email) qzLead(st, { message: `Vote: ${d.title} → ${qzResult(st).title}` }); }
    else if (b.dataset.qv != null) { st.voted = +b.dataset.qv; qzLead(st, { message: `Vote: ${d.question} → ${d.opts[st.voted]}` }); }
    else if (b.dataset.qskip) { st.skip = true; qzLead(st, { message: `Vote: ${d.title} → ${qzResult(st).title}` }); }
    else if (b.dataset.qagain) { st.i = -1; st.picks = []; st.skip = false; st.mailed = false; }
    qzRepaint(id); return; }
  const a = e.target.closest("[data-qz-noop]"); if (a) { e.preventDefault(); toast(QZ.size && S.view !== "public" ? "In the live quiz this goes to your landing page." : "This link isn't set yet."); }
});
document.addEventListener("submit", async (e) => {
  const f = e.target.closest("[data-qz-mail]"); if (!f) return; e.preventDefault(); const id = f.dataset.qzMail; const st = QZ.get(id); if (!st) return;
  const em = f.querySelector("input").value.trim(); if (!/^\S+@\S+\.\S+$/.test(em)) return; const d = st.d;
  await qzLead(st, { email: em, message: d.kind === "poll" ? `Poll: ${d.question} → ${d.opts[st.voted]}` : `Quiz: ${d.title} → ${qzResult(st).title}` }); st.mailed = true; qzRepaint(id);
});

/* node card, inspector and editor stage */
{ const _tb = toolBody; toolBody = function (n) {
  if (n.type === "quiz") return n.p.questions?.length ? `<div class="pv-qz"><b>${esc(n.p.title)}</b><span>${n.p.questions.length} questions · ${n.p.results.length} results${n.p.email ? " · collects emails" : ""}</span>${n.p.live ? `<span class="chip st-live"><i></i>Live</span>` : ""}</div>` : `<div class="pv-text">Build to write the questions and results.</div>`;
  if (n.type === "poll") return n.p.question ? `<div class="pv-qz"><b>${esc(n.p.question)}</b><div class="pv-opts">${n.p.opts.filter(Boolean).map(o => `<span>${esc(o)}</span>`).join("")}</div>${n.p.live ? `<span class="chip st-live"><i></i>Live</span>` : ""}</div>` : `<div class="pv-text">Build to write the question.</div>`;
  return _tb(n); }; }
function pollCounts(n) { const L = (S.live?.leads || []).filter(l => l.slug === n.p.slug && /^(Vote|Poll): /.test(l.message || "")); return n.p.opts.map(o => L.filter(l => (l.message || "").endsWith("→ " + o)).length); }
function qzPublishGroup(n) {
  const p = n.p; const addr = p.slug ? `${location.origin}${location.pathname}#p-${p.slug}` : "";
  return `<div class="grp"><h4>Publish</h4>${fP(n, "slug", "Address", { ph: slugify((cur()?.name || "show") + "-" + n.type) })}
    <div class="swrow">${p.live ? `<button class="btn" data-act="qzpublish">${ICON.rocket} Update</button><button class="btn ghost" data-act="qzunpublish">Unpublish</button><button class="btn sm ghost" data-act="qzcopy">${ICON.copy} Copy link</button>` : `<button class="btn primary" data-act="qzpublish" ${n.type === "quiz" ? (p.questions?.length ? "" : "disabled") : p.question ? "" : "disabled"}>${ICON.rocket} Publish ${n.type}</button>`}</div>
    <small class="faint">${p.live ? `Live at ${esc(addr.replace(location.origin + location.pathname, "…"))}. Share it in the episode's posts or link a story to it.` : "Publishing gives the episode its own page. Answers arrive in Results; anyone who leaves an email counts toward the goal."}</small></div>`;
}
{ const _ti = toolInspector; toolInspector = function (n) {
  const p = n.p;
  if (n.type === "quiz") return `<div class="grp"><h4>Quiz</h4>${fP(n, "title", "Title")}${fP(n, "intro", "Intro", { ta: 1 })}</div>
    ${(p.questions || []).map((q, i) => `<div class="grp qz-ed"><h4>Question ${i + 1}</h4><label class="fld"><span class="sr">Question</span><input class="inp" id="qq_${n.id}_${i}" data-p="questions.${i}.q" value="${esc(q.q)}"></label>
      ${q.opts.map((o, j) => `<div class="qz-row"><input class="inp" id="qo_${n.id}_${i}_${j}" data-p="questions.${i}.opts.${j}.t" value="${esc(o.t)}" aria-label="Answer ${j + 1}"><select class="sel" id="qr_${n.id}_${i}_${j}" data-p="questions.${i}.opts.${j}.r" aria-label="Leads to result">${(p.results || []).map((r, k) => `<option value="${k}" ${+o.r === k ? "selected" : ""}>→ ${esc(r.title || "Result " + (k + 1))}</option>`).join("")}</select></div>`).join("")}</div>`).join("")}
    ${(p.results || []).length ? `<div class="grp"><h4>Results</h4>${p.results.map((r, k) => `<div class="wellbox" style="padding:10px;gap:6px"><input class="inp" id="qrt_${n.id}_${k}" data-p="results.${k}.title" value="${esc(r.title)}" aria-label="Result ${k + 1} title"><textarea class="ta" id="qrx_${n.id}_${k}" data-p="results.${k}.text" aria-label="Result ${k + 1} text" style="min-height:52px">${esc(r.text)}</textarea></div>`).join("")}</div>` : ""}
    <div class="grp"><h4>Lead and next step</h4>${fP(n, "email", "Ask for an email before showing the result", { check: 1 })}${fP(n, "cta", "Button on the result", { ph: "e.g. Book a weekend" })}<button class="btn sm" style="justify-self:start" data-act="openeditor" data-id="${n.id}">${ICON.eye} Try it</button></div>${qzPublishGroup(n)}${customBox(n)}`;
  if (n.type === "poll") { const c = p.live ? pollCounts(n) : null; const tot = c ? c.reduce((a, b) => a + b, 0) : 0;
    return `<div class="grp"><h4>Poll</h4>${fP(n, "question", "Question", { ta: 1 })}${p.opts.map((o, i) => `<div class="qz-row"><input class="inp" id="po_${n.id}_${i}" data-p="opts.${i}" value="${esc(o)}" placeholder="Option ${i + 1}">${c ? `<span class="faint" style="font-size:12px;min-width:52px;text-align:right">${tot ? Math.round(c[i] / tot * 100) : 0} %</span>` : ""}</div>`).join("")}
      ${p.opts.length < 4 ? `<button class="btn sm ghost" style="justify-self:start" data-act="polladd">${ICON.plus} Add option</button>` : ""}${c ? `<small class="faint">${tot} vote${tot === 1 ? "" : "s"} so far</small>` : ""}</div>
      <div class="grp"><h4>After the vote</h4>${fP(n, "thanks", "Thank-you line")}${fP(n, "email", "Offer to send the results by email", { check: 1 })}${fP(n, "cta", "Button", { ph: "e.g. See the offer" })}<button class="btn sm" style="justify-self:start" data-act="openeditor" data-id="${n.id}">${ICON.eye} Try it</button></div>${qzPublishGroup(n)}${customBox(n)}`; }
  return _ti(n); }; }
{ const _ts = toolStage; toolStage = function (n) { if (n.type === "quiz" || n.type === "poll") { const st = styleOf(n) || { palette: PALETTES.webshow.c, fontPair: "pixel", mode: "dark", radius: "soft" }; return `<div class="pub-stage"><div class="pub-frame"><div class="sp qz-page" id="qzstage" style="${pageTheme(st)}"></div></div><p class="faint" style="font-size:12px;text-align:center">Preview: answers aren't saved here. The published ${n.type} collects them.</p></div>`; } return _ts(n); }; }
{ const _ms = mountToolStage; mountToolStage = function (n) { _ms(n); if (n && (n.type === "quiz" || n.type === "poll")) { const h = $("#qzstage"); if (h) qzMount(h, qzData(n), { preview: true }); } }; }
Object.assign(A, {
  polladd() { const n = selNode(); if (!n) return; n.p.opts.push(""); commitNode(n); S.inspFor = null; paintInspector(); },
  async qzpublish() {
    const n = selNode(); if (!n) return; const slug = slugify(n.p.slug || (cur()?.name || "show") + "-" + n.type); n.p.slug = slug;
    const ex = await Store.getPublished(slug).catch(() => null); if (ex && ex.nodeId !== n.id) return toast(`/${slug} is already in use. Change the address.`);
    const st = styleOf(n) || { palette: PALETTES.webshow.c, fontPair: "pixel", mode: "dark", radius: "soft" };
    try { await Store.publish(slug, { slug, kind: n.type, nodeId: n.id, showId: S.showId, theme: pageTheme(st), qz: qzData(n), seo: { title: n.p.title || n.p.question || n.title }, from: n.p.start || "", until: dnaOf().end || "", at: now() }); }
    catch (e) { console.warn(e); return toast("Couldn't publish just now."); }
    n.p.live = true; n.p.at = now(); hist(n, "Published /" + slug); commitNode(n); paintNode(n.id); S.inspFor = null; paintInspector(); toast(`Live at /${slug}`);
  },
  async qzunpublish() { const n = selNode(); if (!n) return; await Store.unpublish(n.p.slug).catch(() => {}); n.p.live = false; hist(n, "Unpublished"); commitNode(n); paintNode(n.id); S.inspFor = null; paintInspector(); toast("Unpublished"); },
  qzcopy() { const n = selNode(); if (n?.p.slug) copyText(`${location.origin}${location.pathname}#p-${n.p.slug}`, "Link copied"); },
});
/* public page: quizzes and polls render as their own interactive page */
{ const _pv = publicView; publicView = function () { const p = S.pub; if (!p?.data || !["quiz", "poll"].includes(p.data.kind) || (pubWindow(p.data) !== "live" && !S.shows[p.data.showId])) return _pv();
  const mine = S.shows[p.data.showId];
  return `${mine ? `<div class="qz-own"><span><span class="chip st-live"><i></i>Live</span> /${esc(p.slug)} · answers are saved</span><button class="btn sm" data-act="leavepublic">Back to Studio</button></div>` : ""}<div class="sp qz-page" id="publicqz" style="${p.data.theme}"></div>`; }; }
{ const _mp = mountPublic; mountPublic = function () { const p = S.pub; if (p?.data && ["quiz", "poll"].includes(p.data.kind)) { document.title = p.data.seo?.title || "Webshow"; const h = $("#publicqz"); if (h) qzMount(h, p.data.qz, { preview: false, slug: p.slug }); return; } _mp(); }; }

/* ---------- On air: the timeline, by lane and by episode ---------- */
STAGES.splice(0, STAGES.length, ["hook", "Hook", "Episodes that wake up interest"], ["show", "Show", "Episodes that deepen and prove"], ["convert", "Convert", "Where visitors become results"]);
function epWin(n) { const t = todayIx(); const s = dayIx(n.p.start); if (s == null) return { s: null, e: null, state: "draft" }; const e = dayIx(n.p.end) ?? s; return { s, e, single: !n.p.end, state: s > t ? "scheduled" : e < t ? "ended" : "live" }; }
function epLeads(n) { const L = S.live?.leads || []; return L.filter(l => (l.ep === n.id || (["quiz", "poll"].includes(n.type) && n.p.slug && l.slug === n.p.slug)) && !(l.message || "").startsWith("Vote:")); }
/* ---------- delivery: what actually went out, kept apart from what was planned ---------- */
const DELIVERY = {
  draft: ["No date", "Give it a date to plan it"], planned: ["Planned", "Nothing is queued to go out yet"], due: ["Due today", "Nothing has gone out yet"],
  missed: ["Not sent", "The date passed and nothing went out"], scheduled: ["Scheduled", "A post or campaign is queued"], posted: ["Posted", "Went out on a connected account"],
  live: ["Page live", "The episode's own page is published"], running: ["Running", "An ad campaign is running it"], ended: ["Ended", "Its campaign has finished"],
};
const DELIVERY_BAR = { draft: "draft", planned: "planned", due: "due", missed: "missed", scheduled: "scheduled", posted: "live", live: "live", running: "live", ended: "ended" };
function adChannelsFor(n) { return Object.values(S.nodes).filter(a => a.type === "adchannel" && [...G.up(a.id, "ads"), ...G.up(a.id, "boost")].some(u => u.id === n.id)); }
function deliveryOf(n) {
  const w = epWin(n); const t = todayIx(); const now0 = Date.now();
  if (w.s == null) return { k: "draft" };
  if (isEx()) { const paid = ["ad", "metaad"].includes(n.type); return { k: w.s > t ? "scheduled" : paid ? (w.e < t ? "ended" : "running") : "posted", demo: true }; }
  const demoAcc = (ks) => ks.some(k => S.con?.conns?.[k]?.demo);
  const posts = n.p.posts || []; const sent = posts.filter(p => p.at <= now0), queued = posts.filter(p => p.at > now0);
  const ads = adChannelsFor(n).filter(a => a.p.launched && (a.p.platforms || []).some(conOn)); const adDemo = ads.some(a => demoAcc((a.p.platforms || []).filter(conOn))); const adSt = ads.map(a => winOf(a).state);
  if (adSt.includes("live")) return { k: "running", demo: adDemo };
  if (["quiz", "poll"].includes(n.type) && n.p.live) return { k: w.s <= t ? "live" : "scheduled" };
  if (sent.length) return { k: "posted", demo: sent.some(p => p.demo || demoAcc(p.accounts || [])) };
  if (queued.length || adSt.includes("scheduled")) return { k: "scheduled", demo: queued.some(p => p.demo || demoAcc(p.accounts || [])) || adDemo };
  if (adSt.length && adSt.every(s0 => s0 === "ended")) return { k: "ended", demo: adDemo };
  return { k: w.s > t ? "planned" : w.s === t ? "due" : "missed" };
}
const dlvLabel = (dv) => DELIVERY[dv.k][0] + (dv.demo ? " · demo" : "");
function epMetric(n, days) {
  const ls = epLeads(n); if (ls.length) { const series = days.map(d => ls.filter(l => localDayOf(l.at) === d).length); return { kind: "leads", value: ls.length, label: "Leads", series, real: true }; }
  /* reach exists only for episodes that went out on a demo account, as clearly labelled sample numbers; nothing sent means no numbers */
  const dv = deliveryOf(n); if (!["posted", "running", "ended"].includes(dv.k) || !dv.demo) return null;
  const w = epWin(n); if (w.s == null || w.s > todayIx()) return null;
  const base = 260 + hash(isEx() ? n.type + n.title : n.id) % 1400 + (+n.p.boost || 0) * 9; /* the example's node ids change every load; its sample numbers shouldn't */ const series = days.map(d => d > todayIx() || d < w.s ? 0 : Math.round(base / (d - w.s + 1) / (w.single ? 1.6 : 1.1)));
  return { kind: "reach", value: series.reduce((a, b) => a + b, 0), label: "Reach", series, real: false };
}
{ const _tr = tlRows;
  tlRows = function (r0, r1) {
    const days = Array.from({ length: r1 - r0 + 1 }, (_, i) => r0 + i);
    const base = _tr(r0, r1).filter(r => !EP_TYPES.has(r.n.type)).map(r => ({ ...r, stage: ["adchannel", "social"].includes(r.n.type) ? laneOf(r.n) : "convert", top: null }));
    const eps = epList().map(n => { const dv = deliveryOf(n); return { n, ep: true, dv, stage: laneOf(n), win: { ...epWin(n), state: DELIVERY_BAR[dv.k] }, marks: (n.p.posts || []).map(p => ({ id: p.id, d: localDayOf(p.at), at: p.at, done: p.at <= Date.now(), accounts: p.accounts || [] })), metric: epMetric(n, days) }; });
    const rows = [...eps, ...base];
    const best = (kind) => rows.filter(r => r.metric?.kind === kind && r.metric.value > 0).sort((a, b) => b.metric.value - a.metric.value)[0];
    const b1 = best("leads"), b2 = best("reach"); if (b1) b1.top = "Best converter"; if (b2 && b2 !== b1) b2.top = "Best reach";
    return rows;
  }; }
/* how a row runs: episodes are one-off or windowed, the engine is always on, popups and the cookie banner fire on triggers */
const TRIG = { load: "When the page opens", delay: "After a few seconds on the page", scroll: "When a visitor scrolls", exit: "When a visitor is about to leave" };
const FREQ_T = { always: "every visit", session: "once per visit", once: "once per person" };
function trigRule(n) { if (n.type === "cookie") return "On a visitor's first page view"; if (n.type === "chatbot") return "Replies when a visitor writes"; return `${TRIG[n.p.trigger] || "On a trigger"}, ${FREQ_T[n.p.freq] || "once per visit"}`; }
function rowKind(r) { return r.ep ? "episode" : ["publish", "scheduler", "chatbot"].includes(r.n.type) ? "engine" : ["popup", "cookie"].includes(r.n.type) ? "trigger" : "channel"; }
function pageWin() { const pg = mainPage(); const pub = pg && pubFor(pg); return pub ? winOf(pub) : null; }
function onairRows(r0, r1) {
  const rows = tlRows(r0, r1);
  Object.values(S.nodes).filter(n => n.type === "cookie").forEach(n => { const w = pageWin(); rows.push({ n, stage: "convert", win: w && w.s != null ? { ...w, follows: true } : null, marks: [], metric: null }); });
  rows.forEach(r => (r.kind = rowKind(r)));
  return rows;
}
function schedText(r) {
  const w = r.win;
  if (r.kind === "episode") return w?.s == null ? "No date" : w.e === w.s ? `One-off · ${fmtDay(w.s, { weekday: "short", day: "numeric", month: "short" })}` : `Runs ${fmtDay(w.s)} – ${fmtDay(w.e)}`;
  if (r.kind === "trigger") return `⚡ ${trigRule(r.n)}`;
  if (r.kind === "engine") return w?.s == null ? "Always on once it's scheduled" : `Always on · ${fmtDay(w.s)} – ${w.e != null ? fmtDay(w.e) : "open"}`;
  return w?.s == null ? "Not scheduled" : `${fmtDay(w.s)} – ${w.e != null ? fmtDay(w.e) : "open"}`;
}
/* the publish step is shown as the page it publishes */
function rowTitle(r) { if (r.n.type === "publish") { const pg = G.up(r.n.id, "page")[0]; return pg ? pg.title : r.n.title; } return r.n.title; }
function engineLabel(r) {
  const n = r.n, w = r.win;
  if (n.type === "publish") return n.p.live ? "Page live" : w?.state === "scheduled" ? `Goes live ${fmtDay(w.s)}` : "Not published";
  if (n.type === "scheduler") return "Booking open";
  if (n.type === "chatbot") return "Chat available · replies when a visitor writes";
  return "";
}
timelineView = function () {
  if (!S.live || S.liveFor !== S.showId) loadTLData();
  if (innerWidth <= 760) return onairList();
  const [len, px] = TL_ZOOM[S.tl.zoom]; const t = todayIx(); const d = dnaOf(); const ds = dayIx(d.start), de = dayIx(d.end);
  const r0 = S.tl.start ?? (ds != null && de != null && de - ds < len ? Math.min(t - 3, ds - 2) : t - Math.round(len / 4)); const r1 = r0 + len - 1; const W = len * px;
  const rows = onairRows(r0, r1); const X = (x) => (x - r0) * px;
  const head = onairHead(rows, t, d, ds, de, `<div class="swrow onair-nav"><div class="seg">${[["2w", "2 weeks"], ["6w", "6 weeks"], ["q", "Quarter"]].map(([k, l]) => `<button data-act="tlzoom" data-v="${k}" aria-pressed="${S.tl.zoom === k}">${l}</button>`).join("")}</div><button class="ib" data-act="tlnav" data-d="-1" aria-label="Earlier">${ICON.back}</button><button class="btn sm" data-act="tltoday">Today</button><button class="ib" data-act="tlnav" data-d="1" aria-label="Later">${ICON.chev}</button></div>`);
  const dayHead = Array.from({ length: len }, (_, i) => { const dd = r0 + i; const dt = new Date(dd * DAY); const wk = dt.getUTCDay(); const first = dt.getUTCDate() === 1 || i === 0;
    return `<div class="tl-d ${wk === 0 || wk === 6 ? "we" : ""} ${dd === t ? "today" : ""}" style="left:${i * px}px;width:${px}px">${first || px >= 40 || dt.getUTCDate() % (px >= 20 ? 2 : 7) === 1 ? `<span>${px >= 40 ? fmtDay(dd, { weekday: "short" }).slice(0, 2) + " " : ""}${dt.getUTCDate()}</span>` : ""}${first ? `<b>${fmtDay(dd, { month: "short" })}</b>` : ""}</div>`; }).join("");
  const shade = Array.from({ length: len }, (_, i) => { const wk = new Date((r0 + i) * DAY).getUTCDay(); return wk === 0 || wk === 6 ? `<i style="left:${i * px}px;width:${px}px"></i>` : ""; }).join("");
  const showBand = ds != null && de != null && de >= r0 && ds <= r1 ? `<div class="tl-showwin" style="left:${X(Math.max(ds, r0))}px;width:${(Math.min(de, r1) - Math.max(ds, r0) + 1) * px}px"></div>` : "";
  const rowHTML = (r) => { const c = NT[r.n.type].color; const w = r.win; let lane = ""; const a = r.ep ? arcOf(r.n) : null;
    if (w && w.s != null) { const s = Math.max(w.s, r0 - 1), e = w.e == null ? r1 + 1 : Math.min(w.e, r1 + 1); if (e >= r0 && s <= r1) {
      const one = r.ep && w.e === w.s;
      const label = r.ep ? `Ep ${epNo(r.n)}${["missed", "due"].includes(r.dv.k) ? " · " + DELIVERY[r.dv.k][0] : a ? " · " + a[1] : ""}${+r.n.p.boost ? ` · €${num(+r.n.p.boost)}` : ""}` : r.kind === "engine" ? engineLabel(r) : r.kind === "trigger" ? `⚡ ${trigRule(r.n)}` : w.follows ? "Runs with the page" : { live: "Running", scheduled: "Scheduled", ended: "Ended", due: "Not launched yet" }[w.state];
      lane += `<div class="tl-bar st-${w.state} ${w.e == null ? "open" : ""} ${w.follows && r.kind !== "trigger" ? "follows" : ""} ${r.ep ? "ep" : ""} ${one ? "one" : ""} k-${r.kind}" data-id="${r.n.id}" style="left:${X(s)}px;width:${Math.max(px, (e - s + 1) * px)}px;--bc:${c}" title="${esc(r.n.title)}: ${esc(schedText(r))}${r.ep ? " · " + dlvLabel(r.dv) : ""}"><span class="h" data-edge="s"></span><b>${esc(label)}</b><span class="h" data-edge="e"></span></div>`; } }
    else if (r.kind === "trigger") lane += `<span class="tl-rule">⚡ ${esc(trigRule(r.n))} · runs while the page is live</span>`;
    else lane += `<button class="tl-ghost" data-act="tlplan" data-id="${r.n.id}" style="left:${X(Math.max(t, ds ?? t, r0))}px">${ICON.plus} ${r.ep ? "Give it a date" : "Schedule"}</button>`;
    if (r.ep && ["carousel", "image"].includes(r.n.type) && (r.n.type === "image" || r.n.p.slides?.length) && !r.marks.some(m => !m.done) && !["posted", "running", "live", "ended"].includes(r.dv.k)) { const gx = w?.s != null ? X(Math.min(r1, Math.max(w.e ?? w.s, r0))) + px + (w.e === w.s ? 150 : 8) : X(Math.max(t, r0)) + 140; if (gx < W - 100) lane += `<button class="tl-ghost sm" data-act="socopen" data-id="${r.n.id}" style="left:${gx}px">${ICON.plus} Post</button>`; }
    r.marks.forEach(m => { if (m.d < r0 || m.d > r1) return; lane += `<button class="tl-mk ${m.done ? "done" : "sched"}" data-id="${r.n.id}" data-post="${m.id}" style="left:${X(m.d) + px / 2}px;--bc:${c}" title="${esc(r.n.title)} → ${m.accounts.map(k => CONNECTORS.find(x => x.k === k)?.name).join(", ")}" aria-label="Post ${m.done ? "published" : "scheduled"} ${fmtDay(m.d)}"></button>`; });
    const m = r.metric;
    const sub = r.ep ? `${EP_FMT[r.n.type]} · ${(r.n.p.channels || []).map(k => CONNECTORS.find(x => x.k === k)?.name.split(" ")[0] || k).join(", ") || "no channel"}` : r.kind === "engine" ? (r.n.type === "publish" ? "Show page" : esc(NT[r.n.type].label)) + " · always on" : r.kind === "trigger" ? esc(NT[r.n.type].label) + " · on a trigger" : esc(NT[r.n.type].label);
    return `<div class="tl-row k-${r.kind} ${S.tl.sel === r.n.id ? "sel" : ""}"><button class="tl-name" data-act="tlsel" data-id="${r.n.id}"><span class="nico" style="--nc:${c}">${ICON[NT[r.n.type].icon]}</span><span class="t"><b>${esc(rowTitle(r))}</b><span>${sub}</span></span></button>
      <div class="tl-lane" style="width:${W}px">${lane}</div>
      <div class="tl-perf">${m ? `<span class="v"><b class="px">${num(m.value)}</b><small>${m.label}${m.real ? "" : " · sample"}</small></span>${m.series.some(Boolean) ? sparkSVG(m.series) : ""}${r.top ? `<span class="topb">${ICON.check} ${r.top}</span>` : ""}` : `<small class="${r.ep && ["missed", "due"].includes(r.dv.k) ? "dlv-warn" : "faint"}">${r.ep ? esc(dlvLabel(r.dv)) : r.kind === "trigger" ? "Leads arrive in Results" : "No results yet"}</small>`}</div></div>`; };
  const group = (title, desc, inner, cls = "") => `<div class="tl-stage tl-group ${cls}"><div class="tl-name"><b>${title}</b><span>${desc}</span></div><div class="tl-lane" style="width:${W}px"></div><div class="tl-perf"></div></div>${inner}`;
  const sub = (l, dsc, rs) => `<div class="tl-row tl-sub"><div class="tl-name"><b>${l}</b><span>${dsc}</span></div><div class="tl-lane" style="width:${W}px"></div><div class="tl-perf"></div></div>${rs.map(rowHTML).join("")}`;
  const eng = rows.filter(r => r.kind === "engine"), eps = rows.filter(r => r.kind === "episode"), trg = rows.filter(r => r.kind === "trigger"), chs = rows.filter(r => r.kind === "channel");
  const grid = [
    eng.length ? group("Always on", "The engine every episode sends people to", eng.map(rowHTML).join(""), "g-engine") : "",
    group("Episodes", "One-off posts ◆ and campaign windows ▬", STAGES.map(([k, l, dsc]) => { const rs = eps.filter(r => r.stage === k); return rs.length ? sub(l, dsc, rs) : ""; }).join("") || `<div class="tl-row"><div class="tl-name"><span class="faint" style="font-size:12px;padding-left:4px">No episodes yet</span></div><div class="tl-lane" style="width:${W}px"></div><div class="tl-perf"></div></div>`, "g-eps"),
    trg.length ? group("Triggers", "Fire when a visitor does something", trg.map(rowHTML).join(""), "g-trig") : "",
    chs.length ? group("Ad channels", "Campaigns that run episodes as ads", chs.map(rowHTML).join(""), "g-ch") : "",
  ].join("");
  const selR = rows.find(r => r.n.id === S.tl.sel);
  return `<div class="home" style="background:var(--canvas)"><div class="home-in" style="max-width:1280px;padding-top:28px">${head}
    ${rows.length ? `<div class="tl-wrap" id="tlwrap"><div class="tl" style="--px:${px}px"><div class="tl-row tl-headrow"><div class="tl-name"><b>What runs when</b></div><div class="tl-lane tl-days" style="width:${W}px">${dayHead}</div><div class="tl-perf"><b>Results · ${len} days</b></div></div>
      <div class="tl-body" style="--today:${X(t) + px / 2}px">${showBand}${grid}<div class="tl-shade" style="width:${W}px">${shade}</div>${t >= r0 && t <= r1 ? `<div class="tl-now" aria-hidden="true"><span>Today</span></div>` : ""}</div></div></div>
      <p class="faint" style="font-size:12px">The tinted band is the show's run. ◆ is a one-off post (it stays up after it goes out), a bar is a campaign window, ⚡ fires on a visitor's action. Dashed means planned only, striped means queued, an orange edge means the date passed and nothing went out. Drag to move; drag the ends to change the window. Leads are real; reach shows only for demo accounts, as sample data.</p>
      ${selR ? tlDetail(selR) : ""}`
    : `<div class="empty"><h3>No episodes yet</h3><span>Plan the season and Showrunner lays the episodes out here, or add carousels, ads, quizzes and polls on the canvas.</span><div class="swrow" style="justify-content:center"><button class="btn primary" data-act="view" data-v="plan">${ICON.target} Plan the season</button><button class="btn" data-act="view" data-v="canvas">${ICON.nodes} Build</button></div></div>`}
  </div></div>`;
};
function onairHead(rows, t, d, ds, de, nav = "") {
  const life = lifeOf(); const pr = progressOf();
  const next = rows.flatMap(r => [r.kind === "episode" && ["scheduled", "planned"].includes(r.win?.state) && r.win.s >= t ? { d: r.win.s, what: `Ep ${epNo(r.n)} · ${r.n.title}` } : null, ...r.marks.filter(m => !m.done).map(m => ({ d: m.d, what: `${r.n.title} posts` }))]).filter(Boolean).sort((a, b) => a.d - b.d)[0];
  const top = rows.filter(r => r.top).sort((a, b) => (b.metric.kind === "leads") - (a.metric.kind === "leads"))[0];
  const status = ds == null ? `<b>No dates yet</b><span class="muted">Set the show's start and end in Plan.</span>` : `<b>${life === "draft" ? "Not scheduled" : life === "paused" ? "Paused" : t < ds ? `Starts ${fmtDay(ds)}` : de != null && t > de ? "The show has ended" : `Day ${t - ds + 1}${de != null ? ` of ${de - ds + 1}` : ""}`}</b><span class="muted">${fmtDay(ds)} → ${de != null ? fmtDay(de) : "open"}</span>${de != null ? `<span class="tl-prog"><i style="width:${Math.max(0, Math.min(100, (t - ds + 1) / (de - ds + 1) * 100))}%"></i></span>` : ""}`;
  return `<div class="dash-h"><div style="display:grid;gap:4px"><span class="px vt" style="font-size:24px">On air</span><span class="muted">${esc(cur()?.name || "")} · what runs when, and how each part is doing</span></div>${nav}</div>
    <div class="tl-cards"><div class="dk">${status}</div>
      <div class="dk"><span class="dk-l">Goal</span>${+d.target ? `<b class="px">${num(pr.res)} <small class="muted" style="font-size:13px">/ ${num(+d.target)}</small></b><span class="muted" style="font-size:12px">${unitOf(d.goal, 2)}${pr.sample ? " · sample" : ""}</span>` : `<button class="btn sm" data-act="view" data-v="plan">Set the goal</button>`}</div>
      <div class="dk"><span class="dk-l">Next up</span>${next ? `<b style="font-size:14px;font-weight:600">${esc(next.what)}</b><span class="muted" style="font-size:12px">${next.d === t ? "Today" : next.d === t + 1 ? "Tomorrow" : fmtDay(next.d, { weekday: "short", day: "numeric", month: "short" })}</span>` : `<span class="muted">Nothing scheduled</span>`}</div>
      <div class="dk"><span class="dk-l">Top episode</span>${top ? `<b style="font-size:14px;font-weight:600">${esc(top.n.title)}</b><span class="muted" style="font-size:12px">${num(top.metric.value)} ${top.metric.label.toLowerCase()}${top.metric.real ? "" : " · sample"}</span>` : `<span class="muted">No results yet</span>`}</div></div>`;
}
/* phones: the same rows as cards, grouped by week */
function onairList() {
  const t = todayIx(); const d = dnaOf(); const ds = dayIx(d.start), de = dayIx(d.end);
  const r0 = Math.min(t - 14, ds ?? t) - 1, r1 = Math.max(t + 42, de ?? t) + 1;
  const rows = onairRows(r0, r1); const wkStart = (x) => x - ((x + 3) % 7); const thisWk = wkStart(t);
  const card = (r) => { const c = NT[r.n.type].color; const m = r.metric; const warn = r.ep && ["missed", "due"].includes(r.dv.k);
    const status = r.ep ? `<span class="${warn ? "dlv-warn" : ""}">${esc(dlvLabel(r.dv))}</span>` : r.kind === "engine" ? `<span>${esc(engineLabel(r))}</span>` : r.kind === "trigger" ? `<span>${r.win?.s != null ? "While the page is live" : "Runs once the page is live"}</span>` : "";
    return `<button class="oc ${warn ? "warn" : ""} ${S.tl.sel === r.n.id ? "sel" : ""}" data-act="tlsel" data-id="${r.n.id}"><span class="nico" style="--nc:${c}">${ICON[NT[r.n.type].icon]}</span><span class="oc-t"><b>${r.ep ? `Ep ${epNo(r.n)} · ` : ""}${esc(rowTitle(r))}</b><span class="oc-s">${r.ep && r.win?.s != null && r.win.e === r.win.s ? "◆ " : ""}${esc(schedText(r))}</span><span class="oc-m">${r.ep ? `<i class="chip lane-c lane-${r.stage}">${esc(LANES.find(l => l[0] === r.stage)[1])}</i>` : ""}${status}${m ? `<span>${num(m.value)} ${m.label.toLowerCase()}${m.real ? "" : " · sample"}</span>` : ""}</span></span></button>${S.tl.sel === r.n.id ? `<div class="oc-detail">${tlDetail(r)}</div>` : ""}`; };
  const eng = rows.filter(r => r.kind === "engine"), trg = rows.filter(r => r.kind === "trigger"), chs = rows.filter(r => r.kind === "channel");
  const eps = rows.filter(r => r.kind === "episode").sort((a, b) => (a.win?.s ?? 1e9) - (b.win?.s ?? 1e9));
  const weeks = new Map(); eps.forEach(r => { const k = r.win?.s == null ? "none" : wkStart(r.win.s) < thisWk ? "past" : wkStart(r.win.s); if (!weeks.has(k)) weeks.set(k, []); weeks.get(k).push(r); });
  const wkName = (k) => k === "none" ? "No date yet" : k === "past" ? "Earlier" : k === thisWk ? "This week" : k === thisWk + 7 ? "Next week" : `Week of ${fmtDay(k, { day: "numeric", month: "short" })}`;
  const order = [...weeks.keys()].sort((a, b) => (a === "past" ? -2e9 : a === "none" ? 2e9 : a) - (b === "past" ? -2e9 : b === "none" ? 2e9 : b));
  const sec = (title, desc, inner) => `<section class="oc-sec"><div class="oc-h"><b>${title}</b>${desc ? `<span>${desc}</span>` : ""}</div><div class="oc-list">${inner}</div></section>`;
  return `<div class="home" style="background:var(--canvas)"><div class="home-in onair-m">${onairHead(rows, t, d, ds, de)}
    ${eng.length ? sec("Always on", "The engine every episode sends people to", eng.map(card).join("")) : ""}
    ${eps.length ? order.map(k => sec(wkName(k), k === thisWk ? "Episodes going out now" : "", weeks.get(k).map(card).join(""))).join("") : sec("Episodes", "", `<p class="muted" style="padding:6px 2px">No episodes yet. Plan the season in Plan.</p>`)}
    ${trg.length ? sec("Triggers", "Fire when a visitor does something", trg.map(card).join("")) : ""}
    ${chs.length ? sec("Ad channels", "", chs.map(card).join("")) : ""}
    <p class="faint" style="font-size:12px">◆ one-off post · Runs = campaign window · ⚡ fires on a visitor's action. Leads are real; reach is sample data from demo accounts.</p>
  </div></div>`;
}
{ const _td = tlDetail; tlDetail = function (r) {
  if (!r.ep) return _td(r); const n = r.n; const a = arcOf(n); const ls = epLeads(n);
  return `<section class="dcard tl-detail"><div class="dcard-h"><span class="swrow"><span class="nico" style="--nc:${NT[n.type].color}">${ICON[NT[n.type].icon]}</span><b style="font-size:14px">Episode ${epNo(n)} · ${esc(n.title)}</b><span class="muted">${LANES.find(l => l[0] === laneOf(n))[1]} · ${EP_FMT[n.type]}${a ? " · " + a[1] : ""}</span></span><button class="ib" data-act="tlsel" data-id="" aria-label="Close details">${ICON.x}</button></div>
    <div class="g3" style="max-width:560px"><label class="fld"><span>Goes out</span><input class="inp" type="date" id="tls_${n.id}" data-tlf="start" data-id="${n.id}" value="${esc(n.p.start)}"></label><label class="fld"><span>Runs until</span><input class="inp" type="date" id="tle_${n.id}" data-tlf="end" data-id="${n.id}" value="${esc(n.p.end)}"></label><label class="fld"><span>Boost, €</span><input class="inp" type="number" min="0" id="tlb_${n.id}" data-tlb="${n.id}" value="${+n.p.boost || 0}"></label></div>
    ${n.p.angle ? `<p style="font-size:13px">“${esc(n.p.angle)}”</p>` : ""}
    <div class="swrow" style="font-size:12.5px"><span class="muted">Airs on</span>${(n.p.channels || []).map(k => `<span class="chip">${esc(CONNECTORS.find(c => c.k === k)?.name || k)}${conOn(k) ? "" : " · not connected"}</span>`).join("") || `<span class="faint">no channel picked</span>`}</div>
    <div class="swrow" style="font-size:12.5px"><span class="muted">Leads from this episode</span><b>${ls.length}</b>${ls.slice(0, 3).map(l => `<span class="chip">${esc(l.email || l.name || "anonymous")}</span>`).join("")}</div>
    <div class="swrow"><button class="btn sm" data-act="openeditor" data-id="${n.id}">${ICON.fit} Open editor</button>${["carousel", "image"].includes(n.type) && (n.p.slides?.length || n.type === "image") ? `<button class="btn sm primary" data-act="socopen" data-id="${n.id}">${ICON.share} Schedule a post</button>` : ""}<button class="btn sm ghost" data-act="gonode" data-id="${n.id}">${ICON.nodes} Show on canvas</button>${n.p.start ? `<button class="btn sm ghost" data-act="tlclear" data-id="${n.id}">Clear date</button>` : ""}</div></section>`; }; }
{ const _plan = A.tlplan; A.tlplan = function (b) { const n = S.nodes[b.dataset.id]; if (!isEpisode(n)) return _plan(b); const d = dnaOf(); const t = todayIx(); const s = Math.max(t, dayIx(d.start) ?? t); setDates(n, s, null, "Dated on the timeline"); S.tl.sel = n.id; repaintTL(); toast("Dated. Drag it to the right day."); }; }
document.addEventListener("change", (e) => { const t = e.target; if (!t.dataset?.tlb) return; const n = S.nodes[t.dataset.tlb]; if (!n) return; n.p.boost = Math.max(0, +t.value || 0); hist(n, "Boost changed on the timeline"); commitNode(n); repaintTL(); });

/* ---------- the example show gets a season ---------- */
{ const _ex = exampleShow;
  exampleShow = function () {
    const ex = _ex(); const d = ex.show.dna; const t = todayISO(); const ns = ex.nodes; const by = (ty) => Object.values(ns).find(n => n.type === ty);
    const mk = (type, title, lane, p, extra = {}) => { const n = { id: uid("n"), type, x: LANE_X[lane], y: 0, title, p: { ...NT[type].params(), ...p }, status: "ready", builtAt: now() - 2 * 864e5, hist: [{ at: now() - 2 * 864e5, by: "ai", note: "Built by Showrunner" }], updatedAt: now() - 864e5, by: "ai", ...extra }; ns[n.id] = n; return n; };
    const pub = by("publish"); Object.assign(pub.p, { live: true, at: now() - 12 * DAY, start: d.start, end: d.end });
    const car = by("carousel"); Object.assign(car.p, { start: addDays(t, -9), arc: "launch", angle: "We tow it to wherever your weekend is", channels: ["instagram", "facebook"], boost: 200 });
    const ad = by("ad"); Object.assign(ad.p, { start: d.start, end: d.end, arc: "teaser", angle: "Catch people already searching for a sauna", channels: ["gads"] });
    mk("image", "Shore teaser", "hook", { source: "concept", motif: "horizon", alt: "A trailer sauna on an empty shore at dawn", txt: { headline: "Any shore is sauna shore", sub: "Coming to Uusimaa this summer", cta: "", pos: "bottom", align: "left", size: "l", tone: "light", shade: true }, caption: "Something warm is coming to your shore.", start: d.start, arc: "teaser", angle: "Tease the idea before showing the offer", channels: ["instagram"] });
    mk("poll", "Which shore first?", "hook", { question: "Your first sauna weekend: where do you heat it?", opts: ["Lakeshore", "Sea cliffs", "Our backyard"], thanks: "Good pick. We deliver to all of them.", cta: "Book a weekend", start: addDays(t, -5), arc: "teaser", angle: "Get people picturing their own shore", channels: ["instagram"] });
    mk("quiz", "Which sauna weekend are you?", "show", { title: "Which sauna weekend are you?", intro: "Three questions, one weekend plan made for your group.", questions: [{ q: "Who's coming?", opts: [{ t: "Just us two", r: 0 }, { t: "The whole friend group", r: 1 }, { t: "Family, kids too", r: 2 }] }, { q: "Pick a shore", opts: [{ t: "Quiet lake", r: 0 }, { t: "Party beach", r: 1 }, { t: "Our own backyard", r: 2 }] }, { q: "After the sauna?", opts: [{ t: "Stars and silence", r: 0 }, { t: "Jump in the lake, repeat", r: 1 }, { t: "Sausages on the grill", r: 2 }] }], results: [{ title: "The slow weekend", text: "Two people, one quiet shore, a stove that stays warm all evening." }, { title: "The big night", text: "Room for eight and the hot tub add-on. Book early, June goes first." }, { title: "The family classic", text: "We set it up in your yard. Firewood included, so you just light the stove." }], cta: "Book a weekend", email: true, start: addDays(t, 2), end: addDays(t, 9), arc: "proof", angle: "Let people find their own kind of sauna weekend", channels: ["instagram", "facebook", "meta"], boost: 150 });
    mk("metaad", "Last June weekends", "convert", { primary: "The last June weekends are going. Book now and the hot tub add-on is on us.", headline: "Book your sauna weekend", desc: "Delivered anywhere in Uusimaa", cta: "book", format: "feed45", start: addDays(d.end, -4), end: d.end, arc: "last", angle: "Close the doors with a real deadline", channels: ["meta"], boost: 250 });
    Object.values(ns).forEach(n => { if (!BUILDABLE.has(n.type)) n.updatedAt = Math.min(n.updatedAt || 0, now() - 72e5); });
    arrangeLanes(Object.values(ns), false);
    return ex;
  }; }

/* inspector with nothing selected: the show, lane by lane */
{ const _pi = paintInspector;
  paintInspector = function () {
    const el = $("#insp"); if (!el || S.nodes[S.sel]) return _pi(); S.inspFor = S.sel;
    if (innerWidth <= 760) { S.insp = false; el.remove(); const b = $(".bar-insp"); if (b) b.setAttribute("aria-pressed", "false"); return; } const s = cur();
    const groups = LANES.map(([k, l]) => [k, l, Object.values(S.nodes).filter(n => laneOf(n) === k).sort((a, b) => isEpisode(a) && isEpisode(b) ? epNo(a) - epNo(b) : a.y - b.y)]);
    el.innerHTML = `<div class="insp-h"><div class="r"><h3>${esc(s?.name || "Show")}</h3></div><div class="r" style="flex-wrap:wrap">${lifeChip(lifeOf(s))}<span class="faint" style="font-size:12px">${esc(goalLine(s))}</span></div><div style="height:6px"></div></div><div class="insp-b">
      ${groups.map(([k, l, ns]) => ns.length ? `<div class="grp"><h4>${l}</h4>${ns.map(x => `<button class="li" data-act="gonode" data-id="${x.id}" style="padding:4px 6px"><span class="nico" style="--nc:${NT[x.type].color}">${ICON[NT[x.type].icon]}</span><span class="t"><b style="font-weight:500">${esc(x.title)}</b>${isEpisode(x) ? `<span>Ep ${epNo(x)} · ${x.p.start ? fmtISO(x.p.start, { weekday: "short", day: "numeric", month: "short" }) : "no date"}</span>` : ""}</span>${nodeStatusBase(x)}</button>`).join("")}</div>` : "").join("") || `<p class="muted">No nodes yet.</p>`}
      ${needsMini()}
      <div class="grp"><h4>How the canvas works</h4><small class="faint">Blocks read the Show DNA, the style guide and the landing page on their own. Wire something in only to override it. Drag an episode to another lane to change its role.</small></div></div>`;
  }; }
