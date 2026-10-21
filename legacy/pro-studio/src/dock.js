/* ============================================================
   Batch 3: the Showrunner dock, drafts that wait for a yes,
   and one "Needs you" list for everything waiting on the owner.
   ============================================================ */
ICON.inbox = P('<path d="M2.5 9h3.2l1 1.8h2.6l1-1.8h3.2"/><path d="M4.3 3.5h7.4L13.5 9v3.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V9z"/>');
const clip = (s, n) => { s = str(s); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };
const lc1 = (s) => { s = str(s); return s ? s[0].toLowerCase() + s.slice(1) : ""; };
const laneName = (k) => LANES.find(l => l[0] === k)?.[1] || k;
const audOf = (d) => clip(lc1(str(d.audience).split(/,| who | that | planning | looking | interested | living /)[0]), 48);

/* ---------- drafts: whatever Showrunner proposes waits here until someone says yes ---------- */
function draftsOf(s = cur()) { if (!s) return []; if (!Array.isArray(s.drafts)) s.drafts = []; return s.drafts; }
function saveDrafts() { const s = cur(); if (s && !isEx()) Store.putShow(s); }
function paintShowrunner() {
  renderSidebarOnly(); paintDnaBar(); paintAsk(); syncCounts();
  if (S.view === "needs") rerenderBody(); if (S.drOpen || $(".drawer")) paintLayer();
  if (S.view === "canvas" && !S.nodes[S.sel]) { S.inspFor = "__"; paintInspector(); }
}
function pushDrafts(items, open = true) { const ds = draftsOf(); items.slice().reverse().forEach(d => ds.unshift(d)); saveDrafts(); if (open) S.drOpen = true; paintShowrunner(); }

/* free days for new episodes: hooks early, proof in the middle, convert at the end */
function draftDays(lane, k) {
  const d = dnaOf(); const t = todayIx(); const a = Math.max(t + 1, dayIx(d.start) ?? t + 1); const b = Math.max(a, dayIx(d.end) ?? a + 20); const L = b - a + 1;
  const busy = new Set([...epList().map(n => dayIx(n.p.start)), ...draftsOf().filter(x => x.kind === "episode").map(x => dayIx(x.start))].filter(x => x != null));
  const [r0, r1] = lane === "hook" ? [a, Math.min(b, a + Math.max(6, Math.round(L * .5)))] : lane === "show" ? [Math.min(b, a + Math.round(L * .2)), Math.min(b, a + Math.round(L * .8))] : [Math.max(a, b - 6), b];
  const out = []; for (let x = r0; x <= r1 && out.length < k; x++) if (!busy.has(x) && !out.some(y => Math.abs(y - x) < 2)) out.push(x);
  for (let i = 0; out.length < k; i++) out.push(Math.min(b, r0 + i * 2));
  return out.sort((x, y) => x - y).map(isoOf);
}

/* offline ideas, written from the Show DNA. Showrunner's AI replaces them when it's connected. */
const DRAFT_IDEAS = {
  hook: [
    ["image", "teaser", (d) => clip(d.idea, 34) || "The big idea, in one picture", (d) => `Put the big idea on one picture: ${d.idea || d.offer || d.business}`, "One strong picture with the idea on it stops the scroll. It's the cheapest way to wake people up."],
    ["poll", "teaser", () => "Which one is you?", (d) => `A one-tap question that gets ${audOf(d) || "people"} picturing ${d.offer ? "the offer" : "it"} for themselves`, "A poll asks for one tap, not a decision. Everyone who votes has started picturing it."],
    ["carousel", "launch", () => "How it works, slide by slide", (d) => `From “${d.idea || d.business}” to ${lc1(d.cta) || "the next step"}, one slide at a time`, "Swipeable posts hold attention longest, and the last slide sends people to the page."],
    ["image", "teaser", () => "Coming soon", (d) => `Tease the offer without showing all of it: ${d.offer || d.idea}`, "A tease before the reveal gives the launch episode an audience that's already curious."],
    ["quiz", "launch", () => "Which one fits you?", (d) => `Three quick questions that end with the right ${d.offer ? "version of the offer" : "next step"} for each person`, "A quiz gives people something back, and the answers tell you who they are."],
    ["metaad", "launch", (d) => clip(d.offer || d.idea, 34) || "Meet the offer", (d) => `Show the offer to ${audOf(d) || "people"} who don't follow you yet`, "A small paid push puts the hook in front of people outside your followers."],
  ],
  show: [
    ["carousel", "proof", () => "Real people, real results", (d) => `Show it working for someone like the viewer${d.facts ? ": " + clip(d.facts.split(/[.\n]/)[0], 80) : ""}`, "Proof turns curiosity into trust. Real details beat adjectives."],
    ["image", "proof", () => "Behind the scenes", (d) => `What happens before the customer arrives${d.facts ? ": " + clip(d.facts.split(/[.\n]/)[0], 80) : ""}`, "Showing the work makes the price feel fair and the promise feel real."],
    ["quiz", "proof", () => "Find your perfect fit", (d) => `A quiz that matches each person with the right ${d.offer ? "option" : "next step"} and shows why`, "Personal results feel like advice, not advertising."],
  ],
  convert: [
    ["image", "urgency", (d, day) => { const left = d.end ? dayIx(d.end) - (dayIx(day) ?? todayIx()) : null; return left > 1 ? `Only ${left} days left` : "Last few days"; }, (d) => `${d.cta || "Act now"} before ${d.end ? fmtISO(d.end, { day: "numeric", month: "long" }) : "it ends"}`, "A real deadline is the strongest reason to act now."],
    ["metaad", "last", () => "Last chance", (d) => `Remind people who visited the page that ${d.end ? "the show ends " + fmtISO(d.end, { day: "numeric", month: "long" }) : "time is running out"}`, "People who already looked are the cheapest to convert."],
    ["carousel", "urgency", () => "Still thinking about it?", (d) => `Answer the last doubts, then ${lc1(d.cta) || "act"}`, "Most people need one more nudge, with their doubts answered."],
  ],
};
const VARIANT_TWISTS = [["as a question", "Ask it as a question the viewer answers in their head"], ["in their words", "Tell it from the customer's side, in their words"], ["with a number", "Lead with one concrete number or fact"], ["before and after", "Show the before and the after"]];

async function draftEpisodes({ lane = "hook", arc = "", count = 3, like = null, type = "", ask = "", why = "", src = "dock" } = {}) {
  const s = cur(); if (!s) return; const d = dnaOf(s); const budget = +d.budget || 0;
  if (like) lane = laneOf(like);
  const allowed = ["image", "carousel", "poll", "quiz", "metaad", "ad"].filter(tierAllows).filter(t => budget || !["metaad", "ad"].includes(t));
  const taken = new Set([...epList().map(n => n.title.toLowerCase()), ...draftsOf().map(x => str(x.title).toLowerCase())]);
  let eps = null; S.drBusy = true; paintAsk();
  if (AI.fn) {
    try {
      const role = { hook: "Hook episodes wake up interest", show: "Show episodes deepen and prove", convert: "Convert episodes push the main action before the deadline" }[lane];
      const r = await AI.json(`You are Showrunner in Webshow Studio. Draft ${count} new ${laneName(lane)} episode${count > 1 ? "s" : ""} for this campaign show. ${role}. Every episode is a variation of the big idea and points people to the show's landing page.\n${RULES}\nSHOW DNA:\n${dnaText()}\nEPISODES ALREADY IN THE SHOW: ${epList().map(n => `${n.title} [${n.type}, ${laneOf(n)}]`).join("; ") || "none"}\n${like ? `MAKE THEM VARIATIONS OF "${like.title}" (${like.type}${type ? `, but as a ${type}` : ""}): ${like.p.angle || ""}\n` : ""}${ask ? `THE OWNER ASKED: <input>${ask}</input>\n` : ""}Allowed types: ${(type ? [type] : allowed).join(", ")} (image = single image post with text on it, carousel = swipeable post, poll = one-tap poll, quiz = 3-question quiz with a personal result, metaad = Facebook & Instagram ad, ad = Google search ad).\nReply with ONLY JSON: {"episodes": [${count} items: {"type": one of the allowed types, "arc": "teaser"|"launch"|"proof"|"urgency"|"last", "title": max 34 chars, new and different from the existing titles, "angle": one line, how this episode varies the big idea, "why": one plain sentence on how it helps reach the goal}]}`, { modelTier: AI.tier(S.effort) });
      const ok = arr(r?.episodes, count).filter(e => (type ? [type] : allowed).includes(e.type) && str(e.title));
      if (ok.length) eps = ok.map(e => ({ type: e.type, arc: ARCS.some(a => a[0] === e.arc) ? e.arc : arc || "teaser", title: clip(e.title, 40), angle: clip(e.angle, 160), why: clip(e.why, 200), ai: true }));
    } catch (e) { toast(errCopy(e)); }
  }
  if (!eps) {
    if (like) {
      const base = str(like.title).replace(/ · .*$/, ""); const off = draftsOf().filter(x => x.like === like.id).length;
      eps = Array.from({ length: count }, (_, i) => { const tw = VARIANT_TWISTS[(off + i) % VARIANT_TWISTS.length]; return { type: type || like.type, arc: like.p.arc || arc || "teaser", title: clip(type && type !== like.type ? `${base} · ${EP_FMT[type].toLowerCase()}` : `${base} · ${tw[0]}`, 40), angle: type && type !== like.type ? `${like.p.angle || d.idea || base}, as a ${EP_FMT[type].toLowerCase()}` : `${tw[1]}: ${like.p.angle || d.idea || base}`, why: type && type !== like.type ? `The same angle in a new format reaches people the ${EP_FMT[like.type].toLowerCase()} didn't.` : "A second take on an angle that's already in the show. Keep the one that does better." }; });
    } else {
      const pool = DRAFT_IDEAS[lane].filter(([t, a]) => allowed.includes(t) && (!arc || a === arc || lane !== "convert"));
      const fresh = pool.filter(x => !taken.has(x[2](d, null).toLowerCase())); const use = (fresh.length >= count ? fresh : pool);
      const off = fresh.length >= count ? 0 : draftsOf().length;
      const dd = draftDays(lane, count);
      eps = Array.from({ length: Math.min(count, Math.max(1, use.length)) }, (_, i) => { const [t, a, T, A0, W] = use[(off + i) % use.length]; const title = T(d, dd[i]); return { type: t, arc: arc && lane !== "hook" ? arc : a, title: taken.has(title.toLowerCase()) ? clip(title + " · take 2", 40) : title, angle: A0(d), why: W }; });
    }
  }
  const days = draftDays(lane, eps.length); const left = Math.max(0, budget - spentOf() - epList().reduce((a, n) => a + (+n.p.boost || 0), 0));
  const list = eps.map((e, i) => ({ id: uid("dr"), kind: "episode", type: e.type, lane, arc: e.arc, title: e.title, angle: e.angle, why: why ? clip(why, 200) : e.why, start: days[i], boost: e.type === "metaad" && budget ? Math.max(30, Math.min(150, Math.round(left * .15 / 10) * 10)) : 0, src, like: like?.id || "", ai: !!e.ai, at: now() }));
  S.drBusy = false; pushDrafts(list);
  return list;
}

/* approving puts the episode on the canvas in its lane, with its date, and builds it */
function placeDraft(dr) {
  if (!NT[dr.type] || !tierAllows(dr.type)) { toast(`${EP_FMT[dr.type] || dr.type} isn't in your plan.`); return null; }
  const n = addEpisode(dr.type, dr.lane, dr.arc, str(dr.title, EP_FMT[dr.type]), dr.start || "", { angle: dr.angle, boost: +dr.boost || 0 });
  if (dr.type === "image") n.p.caption = dr.angle;
  if (dr.type === "poll" && !n.p.question) n.p.question = dr.title;
  if (dr.type === "quiz" && !n.p.title) { n.p.title = dr.title; n.p.intro = dr.angle; }
  hist(n, `Drafted by Showrunner, approved by ${Store.me.name || "you"}`); commitNode(n); return n;
}
async function approveDraft(id) {
  const ds = draftsOf(); const i = ds.findIndex(x => x.id === id); if (i < 0) return; const dr = ds[i];
  ds.splice(i, 1); saveDrafts();
  if (dr.kind === "change") { S.proposal = { text: dr.text, summary: dr.summary, ops: dr.ops }; if (!ds.length) S.drOpen = false; paintShowrunner(); await applyProposal(); paintShowrunner(); return; }
  const n = placeDraft(dr); if (!ds.length) S.drOpen = false; paintShowrunner(); if (!n) return;
  if (S.view === "canvas") paintAll();
  toast(`“${n.title}” is in the ${laneName(dr.lane)} lane${dr.start ? ", " + fmtISO(dr.start, { weekday: "short", day: "numeric", month: "short" }) : ""}. Showrunner is building it.`);
  if (BUILDABLE.has(n.type)) { const now0 = S.nodes[n.id]; if (now0) await buildNode(now0); }
}
async function approveAll() {
  const ds = draftsOf().splice(0); saveDrafts(); S.drOpen = false; paintShowrunner();
  const made = []; for (const dr of ds) { if (dr.kind === "change") { S.proposal = { text: dr.text, summary: dr.summary, ops: dr.ops }; await applyProposal(); } else { const n = placeDraft(dr); if (n) made.push(n.id); } }
  if (S.view === "canvas") paintAll(); paintShowrunner(); toast(`${ds.length} approved. Showrunner is building the new episodes.`);
  for (const id of made) { const n = S.nodes[id]; if (n && BUILDABLE.has(n.type)) await buildNode(n); }
}

/* ---------- the drafts panel ---------- */
function draftOps(d) { const prev = S.proposal; S.proposal = d; const h = d.ops.map(o => `<li>${opLabel(o)}</li>`).join(""); S.proposal = prev; return h; }
function draftCard(d) {
  if (d.kind === "change") return `<article class="drc chg"><div class="drc-top"><span class="dr-img dr-ico" style="--nc:var(--brand)">${ICON.nodes}</span><div class="drc-m"><span class="drc-k">Canvas change · you asked “${esc(clip(d.text, 70))}”</span><b class="drc-sum">${esc(d.summary)}</b></div></div>
    <ol class="drc-ops">${draftOps(d)}</ol>
    <div class="drc-f"><button class="btn primary sm" data-act="drok" data-id="${d.id}">${ICON.check} Apply ${d.ops.length} change${d.ops.length > 1 ? "s" : ""}</button><button class="btn sm ghost" data-act="drno" data-id="${d.id}">Discard</button></div></article>`;
  const st = mainStyle(); const pal = st ? styleValue(st).palette : PALETTES.webshow.c; const fp = st?.p.fontPair || "pixel"; const a = ARCS.find(x => x[0] === d.arc);
  const thumb = ["image", "carousel", "metaad"].includes(d.type) ? `<img class="dr-img" alt="" src="${visualURL({ id: d.id, motif: MOTIFS[hash(d.id) % MOTIFS.length], seed: 0, overlay: "", aspect: "4:5" }, pal, fp, .16)}">` : `<span class="dr-img dr-ico" style="--nc:${NT[d.type].color}">${ICON[NT[d.type].icon]}</span>`;
  return `<article class="drc" data-id="${d.id}"><div class="drc-top">${thumb}<div class="drc-m">
      <span class="drc-k"><span class="chip lane-c lane-${d.lane}">${esc(laneName(d.lane))}</span>${esc(EP_FMT[d.type] || d.type)}${a ? " · " + esc(a[1]) : ""}${+d.boost ? ` · €${num(+d.boost)} boost` : ""}</span>
      <input class="inp drc-title" data-drf="title" data-id="${d.id}" value="${esc(d.title)}" maxlength="60" aria-label="Episode title">
      <label class="drc-date"><span>Goes out</span><input type="date" class="inp" data-drf="start" data-id="${d.id}" value="${esc(d.start || "")}"></label></div></div>
    <textarea class="ta drc-angle" data-drf="angle" data-id="${d.id}" rows="2" aria-label="Angle">${esc(d.angle)}</textarea>
    ${d.why ? `<p class="drc-why">${ICON.spark}<span>${esc(d.why)}</span></p>` : ""}
    <div class="drc-f"><button class="btn primary sm" data-act="drok" data-id="${d.id}">${ICON.check} Approve</button><button class="btn sm ghost" data-act="drno" data-id="${d.id}">Discard</button><span class="grow"></span><small class="faint">${d.ai ? "Written by Showrunner" : "Drafted from your Show DNA"}</small></div></article>`;
}
function draftsPanel() {
  if (!S.drOpen || !cur() || ["home", "connectors"].includes(S.view)) return ""; const ds = draftsOf();
  return `<div class="scrim dr-scrim" data-act="drclose"><aside class="drawer" data-stop="1" role="dialog" aria-label="Drafts from Showrunner">
    <div class="dr-h"><span class="nico" style="--nc:var(--brand)">${ICON.sparkle}</span><div class="t"><b>Drafts from Showrunner</b><span>${ds.length ? `${ds.length} waiting · not on the canvas until you approve` : "Nothing is waiting for approval"}</span></div><button class="ib" data-act="drclose" aria-label="Close drafts">${ICON.x}</button></div>
    <div class="dr-b">${ds.length ? ds.map(draftCard).join("") : `<div class="dr-empty"><b>All approved</b><span class="muted">Ask Showrunner for hooks in the bar at the bottom, or start here.</span><button class="btn sm" data-act="dkhooks">${ICON.sparkle} Draft 3 hooks</button></div>`}
      ${ds.length && !AI.fn ? `<p class="faint" style="font-size:12px;margin:0">AI isn't connected in this view, so these are drafted from your Show DNA. Edit the title and angle before you approve.</p>` : ""}</div>
    ${ds.length > 1 ? `<div class="dr-f"><button class="btn primary" data-act="drall">${ICON.check} Approve all ${ds.length}</button><button class="btn ghost" data-act="drnone">Discard all</button></div>` : ""}
  </aside></div>`;
}
{ const _cl = conLayer; conLayer = () => _cl() + draftsPanel(); }
let drSave = 0;
document.addEventListener("input", (e) => { const t = e.target; const k = t.dataset?.drf; if (!k) return; const dr = draftsOf().find(x => x.id === t.dataset.id); if (!dr) return; dr[k] = k === "start" ? t.value : t.value.slice(0, k === "angle" ? 240 : 60); clearTimeout(drSave); drSave = setTimeout(saveDrafts, 500); });

/* ---------- the dock: Showrunner at the bottom of every show view, aware of what you're looking at ---------- */
const dockNode = () => S.view === "canvas" ? S.nodes[S.sel] || null : null;
function dockChips() {
  const s = cur(); if (!s) return []; const n = dockNode(); const life = lifeOf(s); const out = []; const C = (act, label, d = "") => out.push({ act, label, d });
  const has = (type) => Object.values(S.nodes).some(x => x.type === type);
  if (n && isEpisode(n)) {
    C("dkvar", "2 more takes on this", n.id);
    const alt = n.type !== "quiz" && tierAllows("quiz") ? "quiz" : n.type !== "carousel" ? "carousel" : "image"; C("dkfmt", `Make a ${EP_FMT[alt].toLowerCase()} version`, n.id + "|" + alt);
    if (n.p.start) C("dkmove", "Move a week later", n.id);
  } else if (n && n.type === "page") {
    if (!has("popup")) C("dkask", "Add an exit popup", "Add an exit popup to the landing page");
    if (!has("scheduler") && tierAllows("scheduler")) C("dkask", "Add a booking calendar", "Add an appointment scheduler to the landing page");
    C("dkbuild", n.p.sections?.length ? "Rebuild the page" : "Build the page", n.id);
  } else if (n) {
    C("dkhooks", "Use this in 3 hooks", "hook");
  } else {
    const t = todayIx(); const eps = epList(); const sg = typeof suggestions === "function" ? suggestions() : [];
    if (S.view === "live") { const best = (typeof reportData === "function" ? reportData().best : null); if (best?.n) C("dkvar", `More like “${clip(best.n.title, 22)}”`, best.n.id); }
    if (sg.some(x => x.id === "undated")) C("dksug", "Date the undated episodes", "undated");
    if (S.view === "timeline" && life === "live" && !eps.some(x => { const w = epWin(x); return w.s != null && w.s >= t && w.s <= t + 6; })) C("dkdraft", "Fill this week", "show|proof");
    C("dkhooks", "Draft 3 hooks", "hook");
    if (!out.some(x => x.act === "dkdraft")) C("dkdraft", "A proof episode", "show|proof");
    if (["live", "scheduled"].includes(life)) C("dkdraft", "An urgency episode", "convert|urgency");
  }
  return out.slice(0, 4);
}
function dockChipsHTML() {
  const s = cur(); if (!s) return ""; const n = dockNode(); const dr = draftsOf(s).length; const busy = S.askBusy || S.drBusy;
  const ctx = n ? `<span class="dk-ctx" title="Showrunner reads this with your request"><span class="nico" style="--nc:${NT[n.type].color}">${ICON[NT[n.type].icon]}</span><span class="dk-ctx-t">${esc(isEpisode(n) ? `Ep ${epNo(n)} · ${n.title}` : n.title)}</span><button class="dk-x" data-act="desel" aria-label="Stop focusing on ${esc(n.title)}">${ICON.x}</button></span>` : "";
  const pill = dr ? `<button class="dk-dr" data-act="dropen">${ICON.sparkle}<span>${dr} draft${dr > 1 ? "s" : ""} to approve</span></button>` : "";
  return pill + ctx + dockChips().map(c => `<button class="dk-c" data-act="${c.act}" data-d="${esc(c.d)}" ${busy ? "disabled" : ""}>${esc(c.label)}</button>`).join("");
}
function dockPh() { const n = dockNode(); return S.askBusy || S.drBusy ? "Showrunner is working…" : n ? `Ask Showrunner about “${clip(n.title, 28)}”…` : innerWidth <= 760 ? "Ask Showrunner…" : "Ask Showrunner to add, change or build something"; }
function dockInner() {
  const busy = S.askBusy || S.drBusy;
  return `<div class="dock"><div class="dk-chips" id="dkchips" role="toolbar" aria-label="Showrunner shortcuts">${dockChipsHTML()}</div>
  <form class="composer" data-form="ask"><textarea id="askin" rows="1" aria-label="Ask Showrunner" placeholder="${esc(dockPh())}" ${busy ? "disabled" : ""}>${esc(S.askText)}</textarea>
  <div class="cbar">${effortSeg()}<span class="grow"></span>${busy ? `<span class="chip st-building ty-chip" role="status"><span class="tdots sm" aria-hidden="true"><i></i><i></i><i></i></span>Showrunner is working…</span>` : ""}<button class="send" aria-label="Ask Showrunner" ${busy ? "disabled" : ""}>${ICON.send}</button></div></form></div>`;
}
paintAsk = function () { const el = $("#askbar"); if (el) el.innerHTML = dockInner(); };
function paintDockChips() { const c = $("#dkchips"); if (c) c.innerHTML = dockChipsHTML(); const t = $("#askin"); if (t && !t.disabled) t.placeholder = dockPh(); }
{ const _pi = paintInspector; paintInspector = function () { _pi(); paintDockChips(); }; }
{ const _sn = selectNode; selectNode = function (...a) { _sn(...a); paintDockChips(); }; }
/* the dock on On air, Results and Needs you too */
const dockView = (h) => cur() ? h + `<div class="askbar dock-v" id="askbar">${dockInner()}</div>` : h;
{ const _t = timelineView; timelineView = function () { return dockView(_t()); }; }
{ const _l = liveView; liveView = function () { return dockView(_l()); }; }

/* a request in plain words: episode ideas become drafts; anything else becomes a canvas change to approve */
const wantsEpisodes = (t) => /\b(hooks?|teasers?|episodes?|post ideas?|angles?|takes?|variations?)\b/i.test(t) && !/\b(popup|pop-up|landing|page|website|search ad|google|chatbot|booking|scheduler|cookie)\b/i.test(t);
{ const _ask = askCanvas;
  askCanvas = async function (text) {
    const n = dockNode(); const t = text.toLowerCase();
    if (wantsEpisodes(t)) {
      S.askText = ""; const m = t.match(/\b(\d|two|three|four|five)\b/); const k = m ? ({ two: 2, three: 3, four: 4, five: 5 }[m[1]] || +m[1]) : n && isEpisode(n) ? 2 : 3;
      const lane = /proof|testimonial|story|stories|behind/.test(t) ? "show" : /urgen|last chance|deadline|closing|convert/.test(t) ? "convert" : "hook";
      return draftEpisodes({ lane, arc: lane === "show" ? "proof" : lane === "convert" ? "urgency" : "", count: Math.max(1, Math.min(5, k)), like: n && isEpisode(n) && /this|like|variation|take|version/.test(t) ? n : null, ask: text });
    }
    await _ask(n ? `${text}\n(The owner has selected the node ${n.id}, a ${NT[n.type].label} called "${n.title}". "This" or "it" means that node.)` : text);
    const pr = S.proposal; if (!pr) return; S.proposal = null;
    if (pr.ops.length) pushDrafts([{ id: uid("dr"), kind: "change", text, summary: pr.summary, ops: pr.ops, at: now() }]); else toast(pr.summary);
    paintAsk();
  }; }

Object.assign(A, {
  dropen() { S.drOpen = true; S.more = false; paintLayer(); },
  drclose(t, e) { if (e && t.classList.contains("scrim") && e.target !== t) return; S.drOpen = false; paintLayer(); },
  drok(b) { approveDraft(b.dataset.id); },
  drno(b) { const ds = draftsOf(); const i = ds.findIndex(x => x.id === b.dataset.id); if (i >= 0) ds.splice(i, 1); saveDrafts(); if (!ds.length) S.drOpen = false; paintShowrunner(); toast("Discarded"); },
  drall() { approveAll(); },
  drnone() { const n = draftsOf().length; draftsOf().splice(0); saveDrafts(); S.drOpen = false; paintShowrunner(); toast(`${n} draft${n > 1 ? "s" : ""} discarded`); },
  dkhooks() { draftEpisodes({ lane: "hook", count: 3, like: null }); },
  dkdraft(b) { const [lane, arc] = b.dataset.d.split("|"); draftEpisodes({ lane, arc, count: 1 }); },
  dkvar(b) { const n = S.nodes[b.dataset.d]; if (n) draftEpisodes({ like: n, count: 2 }); },
  dkfmt(b) { const [id, type] = b.dataset.d.split("|"); const n = S.nodes[id]; if (n) draftEpisodes({ like: n, type, count: 1 }); },
  dkmove(b) { const n = S.nodes[b.dataset.d]; if (!n?.p.start) return; n.p.start = addDays(n.p.start, 7); if (n.p.end) n.p.end = addDays(n.p.end, 7); hist(n, "Moved a week later"); commitNode(n); paintAll(); paintDockChips(); toast(`“${n.title}” now goes out ${fmtISO(n.p.start, { weekday: "short", day: "numeric", month: "short" })}`); },
  dkask(b) { if (!S.askBusy) askCanvas(b.dataset.d); },
  async dkbuild(b) { const n = S.nodes[b.dataset.d]; if (n) { toast("Showrunner is building it"); await buildNode(n); } },
  dksug(b) { const sg = suggestions().find(x => x.id === b.dataset.d); if (sg) A[sg.act]?.(sg); },
});
/* the weekly check drafts new episodes instead of adding them straight to the canvas */
Object.assign(A, {
  sugurgency(sg) { sugDone(sg.id); draftEpisodes({ lane: "convert", arc: "urgency", count: 1, why: sg.b, src: "weekly" }); },
  sugproof(sg) { sugDone(sg.id); draftEpisodes({ lane: "show", arc: "proof", count: 1, why: sg.b, src: "weekly" }); },
});

/* ---------- Needs you: one list for everything that waits on the owner ---------- */
const NEED_GROUPS = [["approve", "To approve"], ["today", "Goes out today"], ["decide", "Decisions"], ["suggest", "Showrunner suggests"], ["setup", "Before you can schedule"], ["review", "To review"]];
function needsList(s = cur()) {
  if (!s || s.id !== S.showId) return []; const out = []; const life = lifeOf(s);
  const ds = draftsOf(s); if (ds.length) out.push({ id: "drafts", g: "approve", ic: ICON.sparkle, nc: "var(--brand)", t: `${ds.length} draft${ds.length > 1 ? "s" : ""} from Showrunner`, b: ds.slice(0, 3).map(x => `“${x.kind === "change" ? x.summary : x.title}”`).join(", ") + (ds.length > 3 ? "…" : ""), btn: "Review", run: () => A.dropen() });
  if (typeof deliveryOf === "function") epList().filter(n => deliveryOf(n).k === "due").forEach(n => out.push({ id: "due" + n.id, g: "today", ic: ICON[NT[n.type].icon], nc: NT[n.type].color, t: `Ep ${epNo(n)} · ${n.title}`, b: DELIVERY.due[1], btn: "Open", run: () => A.gonode({ dataset: { id: n.id } }) }));
  Object.values(S.threads).filter(t => t.status === "needs").forEach(t => out.push({ id: "th" + t.id, g: "decide", ic: ICON.chat, nc: "var(--c7)", t: t.title, b: S.nodes[t.nodeId] ? `About ${S.nodes[t.nodeId].title}` : "A decision is waiting", btn: "Answer", run: () => A.openthread({ dataset: { id: t.id } }) }));
  (typeof suggestions === "function" ? suggestions() : []).forEach(sg => out.push({ id: "sg" + sg.id, g: "suggest", ic: ICON.spark, nc: "var(--brand)", t: sg.t, b: sg.b, btn: sg.btn, dismiss: sg.id, run: () => A.sug({ dataset: { id: sg.id } }) }));
  if (["draft", "paused"].includes(life)) { const R = readiness(); const req = R.filter(r => r[3] && !r[1]);
    if (req.length) out.push({ id: "setup", g: "setup", ic: ICON.target, nc: "var(--brand)", t: `${req.length} thing${req.length > 1 ? "s" : ""} left before you can schedule`, b: req.map(r => r[0]).join(", "), btn: "Open Plan", run: () => { S.view = "plan"; render(); } });
    else out.push({ id: "sched", g: "setup", ic: ICON.rocket, nc: "var(--brand)", t: life === "paused" ? "The show is paused" : "Ready to schedule", b: life === "paused" ? "Resume it in Plan when you're ready." : "Goal, dates and budget are set. Schedule the show and the episodes go out on their dates.", btn: "Open Plan", run: () => { S.view = "plan"; render(); } }); }
  const rv = Object.values(S.nodes).filter(n => n.status === "ready").sort((a, b) => (isEpisode(a) ? epNo(a) : 99) - (isEpisode(b) ? epNo(b) : 99));
  if (rv.length) out.push({ id: "review", g: "review", ic: ICON.eye, nc: "var(--muted)", t: `${rv.length} built block${rv.length > 1 ? "s" : ""} to look over`, b: "Showrunner built them. Approve each one, or change what's off.", btn: "Start", list: rv, run: () => A.gonode({ dataset: { id: rv[0].id } }) });
  return out;
}
const nyRow = (x, compact) => `<div class="ny ${compact ? "sm" : ""}"><span class="nico" style="--nc:${x.nc}">${x.ic}</span><span class="t"><b>${esc(x.t)}</b>${compact ? "" : `<span>${esc(x.b)}</span>`}
  ${x.list && !compact ? `<span class="ny-list">${x.list.map(n => `<button class="ny-li" data-act="gonode" data-id="${n.id}"><span class="nico" style="--nc:${NT[n.type].color}">${ICON[NT[n.type].icon]}</span>${esc(isEpisode(n) ? `Ep ${epNo(n)} · ${n.title}` : n.title)}</button>`).join("")}</span>` : ""}</span>
  <span class="ny-a"><button class="btn sm ${["approve", "today", "decide"].includes(x.g) ? "primary" : ""}" data-act="ny" data-id="${esc(x.id)}">${esc(x.btn)}</button>${x.dismiss && !compact ? `<button class="btn sm ghost" data-act="sugdismiss" data-id="${esc(x.dismiss)}">Not now</button>` : ""}</span></div>`;
function needsView() {
  const s = cur(); const L = needsList(s);
  const body = L.length ? NEED_GROUPS.map(([g, label]) => { const xs = L.filter(x => x.g === g); return xs.length ? `<section class="ny-g"><h3 class="ny-h">${label}<span class="n">${xs.length}</span></h3>${xs.map(x => nyRow(x)).join("")}</section>` : ""; }).join("")
    : `<div class="ny-clear"><span class="nico" style="--nc:var(--brand)">${ICON.check}</span><b>Nothing is waiting on you</b><span class="muted">Showrunner keeps watching ${esc(s?.name || "the show")} and puts anything new here: drafts to approve, decisions, episodes that slip.</span></div>`;
  return dockView(`<div class="home" style="background:var(--canvas)"><div class="home-in" style="max-width:860px;padding-top:28px">
    <div class="dash-h"><div style="display:grid;gap:4px"><span class="px vt" style="font-size:24px">Needs you</span><span class="muted">${esc(s?.name || "")} · everything waiting for a yes, an answer or a look. Showrunner handles the rest.</span></div></div>
    ${body}</div></div>`);
}
function needsMini() {
  const L = needsList(); if (!L.length) return "";
  return `<div class="grp"><h4>Needs you <span class="faint" style="font-weight:400">${L.length}</span></h4>${L.slice(0, 4).map(x => `<button class="li" data-act="ny" data-id="${esc(x.id)}"><span class="nico" style="--nc:${x.nc}">${x.ic}</span><span class="t"><b>${esc(x.t)}</b></span><span class="go">${esc(x.btn)} →</span></button>`).join("")}${L.length > 4 ? `<button class="li" data-act="view" data-v="needs"><span class="t"><span class="muted">See all ${L.length}</span></span></button>` : ""}</div>`;
}
A.ny = function (b) { const x = needsList().find(y => y.id === b.dataset.id); if (x) x.run(); };
{ const _vb = viewBody; viewBody = function () { if (S.view === "needs" && cur()) return needsView(); return _vb(); }; }
/* after a weekly-check action or a dismiss, the list repaints where you are */
{ const _sd = sugDone; sugDone = function (id, msg) { const s = cur(); s.dismissed = { ...(s.dismissed || {}), [id]: now() }; if (!isEx()) Store.putShow(s); if (msg) toast(msg); if (["live", "needs"].includes(S.view)) { rerenderBody(); renderSidebarOnly(); paintDnaBar(); } else render(); }; }
