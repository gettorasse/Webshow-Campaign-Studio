/* ============================================================
   Onboarding: describe your goal → build your show → choose your
   Showrunner → generate → the full Studio canvas.
   One shared generator: the Showrunner is an instruction block that
   steers every AI call for its show.
   ============================================================ */
ICON.brain = P('<path d="M6 2.6a2 2 0 0 0-2 2 2 2 0 0 0-1.4 3.4A2.2 2.2 0 0 0 4.5 12a2 2 0 0 0 3.5 1V3.6A1.6 1.6 0 0 0 6 2.6z"/><path d="M10 2.6a2 2 0 0 1 2 2 2 2 0 0 1 1.4 3.4 2.2 2.2 0 0 1-1.9 4 2 2 0 0 1-3.5 1V3.6A1.6 1.6 0 0 1 10 2.6z"/>');
ICON.bolt = P('<path d="M9 1.6 3.6 9h4l-1 5.4L12.4 7h-4z"/>');
ICON.up = P('<path d="M8 12.6V3.6M4.4 7.2 8 3.6l3.6 3.6"/>');
ICON.back = ICON.back || P('<path d="M13 8H3M7 4 3 8l4 4"/>');

const SHOWRUNNERS = {
  ogilvy: { name: "Ogilvy", icon: "brain", line: "Positioning, research and headlines that sell with facts.",
    prompt: "Work in the spirit of David Ogilvy's published advertising principles: research-led, sharp positioning, treat the customer as intelligent, put the promise and one specific fact in the headline, informative copy where the channel allows it, one consistent brand image, no gimmicks." },
  hormozi: { name: "Hormozi", icon: "target", line: "Offers people can't ignore. Direct, plain-spoken, value first.",
    prompt: "Work in the spirit of Alex Hormozi's published principles on offers: lead with the value of the offer (the dream outcome, how likely it is to work, how fast, how little effort), be commercially direct and plain-spoken, make the next step obvious. Never invent guarantees, bonuses, discounts or scarcity; only use what the owner stated." },
  vaynerchuk: { name: "Vaynerchuk", icon: "bolt", line: "Social-native content. Earn attention, give before you ask.",
    prompt: "Work in the spirit of Gary Vaynerchuk's published principles: platform-native content, win attention in the first seconds, document rather than produce, give value several times before asking (jab, jab, jab, right hook), casual human voice, short formats made for phones." },
};
const SR_KEYS = Object.keys(SHOWRUNNERS);
const srText = (k) => { const r = SHOWRUNNERS[k]; return r ? `\nYOUR SHOWRUNNER: ${r.name}. ${r.prompt}\nThe Showrunner shapes the creative approach, the messaging and the hooks. It never changes the facts, never overrides the rules above, and never claims to be, quote or speak as the real person.` : ""; };
/* every AI call for a show carries its Showrunner */
{ const _j = AI.json.bind(AI), _t = AI.text.bind(AI); const sr = () => S.obSR || cur()?.showrunner;
  AI.json = (p, o) => _j(typeof p === "string" && sr() ? p + srText(sr()) : p, o);
  AI.text = (p, o) => _t(typeof p === "string" && sr() ? p + srText(sr()) : p, o); }

const OB_CH = [["instagram", "Instagram"], ["facebook", "Facebook"], ["linkedinpage", "LinkedIn"], ["tiktokacc", "TikTok"], ["meta", "Meta ads"], ["gads", "Google Ads"]];
const OB_AS = [["image", "Image posts"], ["carousel", "Carousels"], ["poll", "Polls"], ["quiz", "Quizzes"]];
const OB_TARGET = { leads: 30, bookings: 40, sell: 50, launch: 100, event: 60, awareness: 2000 };
const OB_FMT = { bookings: "booking", event: "countdown", launch: "launch", sell: "seasonal", leads: "booking", awareness: "launch" };
const OB_REC = { leads: ["linkedinpage", "facebook", "gads"], bookings: ["instagram", "facebook", "meta"], sell: ["instagram", "facebook", "meta"], launch: ["instagram", "tiktokacc", "meta"], event: ["instagram", "facebook"], awareness: ["instagram", "tiktokacc", "facebook"] };
const OB_EXAMPLES = [
  ["Bakery subscription", "Our bakery in Tampere is launching a sourdough subscription: a fresh loaf every Friday, picked up or delivered. First month half price."],
  ["Yoga studio, new members", "A small yoga studio in Kallio wants 30 new members for its beginner classes this autumn. Intro offer: two weeks unlimited for 29 €."],
  ["B2B energy audit", "We help Finnish manufacturers cut energy costs. We want leads from CFOs and plant managers, starting with a 30-minute energy check call."],
  ["Saunalautta (in Finnish)", "Vuokraamme saunalauttaa Tampereella. Haluamme pikkujouluvarauksia työporukoilta. Varaa ennen 15.11. ja saat glögit kaupan päälle."],
];
const obBlank = () => ({ what: "", business: "", audience: "", audOptions: [], goal: "", goalGuess: "leads", target: 0, offer: "", start: addDays(todayISO(), 3), weeks: 4, budget: "", channels: [], chAuto: true, recommended: [], assets: [], look: "", showrunner: "ogilvy", format: "", known: {}, ai: false });

/* ---------- start ---------- */
function obStartHTML() {
  return `<div class="ob-hero"><div class="ob-row"><h1 class="ob-h1">Your pocket Showrunner.</h1><span class="ob-pill">Beta</span></div><p class="ob-sub">From a rough idea to a ready-to-run campaign, built on the canvas.</p></div>
    <div class="ob-card"><div class="ob-ch"><h2>What are we promoting?</h2><p>Tell your Showrunner what you want to achieve, in plain words.</p></div>
      <div class="ob-field"><textarea id="homeask" rows="3" aria-label="What are we promoting?" placeholder="I want to launch our new service and get more leads from local businesses…" ${S.homeBusy ? "disabled" : ""}>${esc(S.homeText)}</textarea>
        <button class="ob-send" data-act="homego" aria-label="Create campaign with AI">${ICON.up}</button></div>
      <div class="ob-ex"><span>Try</span>${OB_EXAMPLES.map(([l], i) => `<button class="ob-chip" data-act="obex" data-i="${i}">${esc(l)}</button>`).join("")}</div></div>
    <div class="ob-foot"><span>A few answers. One complete campaign.</span><button class="btn ob-go" data-act="homego">${ICON.sparkle} Create campaign with AI</button></div>`;
}

/* ---------- build your show ---------- */
function obView() {
  const o = S.ob; if (!o) return homeView(); const K = o.known; const from = (k) => K[k] ? `<span class="ob-from">${ICON.check} From your message</span>` : "";
  const unit = unitOf(o.goal || o.goalGuess, 2); const ads = o.channels.some(k => ["meta", "gads"].includes(k));
  if (!o.parsed) return `<div class="home ob-page"><div class="home-in ob-in"><div class="ob-hero"><h1 class="ob-h1">Reading your idea…</h1><p class="ob-sub">${esc(clip(o.what, 160))}</p></div><div class="ob-card">${typingHTML("is reading your idea")}</div></div></div>`;
  return `<div class="home ob-page"><div class="home-in ob-in">
    <div class="ob-hero"><button class="ob-back" data-act="obback">${ICON.back} Edit my idea</button><h1 class="ob-h1">Build your show.</h1><p class="ob-sub">${o.ai ? "Here's what I understood. Fill in what's missing, or let me recommend." : "Fill in what's missing, or let the Showrunner recommend."}</p></div>
    <div class="ob-card">
      <div class="ob-q"><div class="ob-qh"><label for="ob-what">What are we promoting?</label>${from("what")}</div><textarea class="ta ob-ta" id="ob-what" data-ob="what" rows="2">${esc(o.what)}</textarea></div>
      <div class="ob-q"><div class="ob-qh"><label for="ob-aud">Who is it for?</label>${from("audience")}</div><input class="inp ob-inp" id="ob-aud" data-ob="audience" value="${esc(o.audience)}" placeholder="Leave empty and the Showrunner decides">
        ${!o.audience && o.audOptions.length ? `<div class="ob-chips">${o.audOptions.map((x, i) => `<button class="ob-chip" data-act="obaud" data-i="${i}">${esc(x)}</button>`).join("")}</div>` : ""}</div>
      <div class="ob-q"><div class="ob-qh"><span class="ob-l" id="obl-goal">What should people do?</span>${from("goal")}</div><div class="ob-chips" role="group" aria-labelledby="obl-goal">${GOAL_OPTS.map(([k, l]) => `<button class="ob-chip" data-act="obgoal" data-k="${k}" aria-pressed="${o.goal === k}">${l}</button>`).join("")}<button class="ob-chip ob-spk" data-act="obgoal" data-k="" aria-pressed="${!o.goal}">Recommend for me ✨</button></div>
        <div class="ob-inline"><label for="ob-target">How many ${unit}?</label><input class="inp ob-inp ob-num" id="ob-target" data-ob="target" type="number" min="1" value="${+o.target || ""}" placeholder="${OB_TARGET[o.goal || o.goalGuess] || 30}"><span class="muted">${+o.target ? "" : "Leave empty for a realistic target"}</span></div></div>
      <div class="ob-q"><div class="ob-qh"><label for="ob-offer">Offer or main message</label>${from("offer")}</div><input class="inp ob-inp" id="ob-offer" data-ob="offer" value="${esc(o.offer)}" placeholder="Optional, e.g. first month at half price"></div>
      <div class="ob-q"><div class="ob-qh"><span class="ob-l" id="obl-when">When does it run?</span>${from("weeks")}</div><div class="ob-chips" role="group" aria-labelledby="obl-when"><input class="inp ob-date" type="date" id="ob-start" data-ob="start" value="${esc(o.start)}" aria-label="Start date">${[2, 3, 4, 6, 8].map(w => `<button class="ob-chip" data-act="obweeks" data-k="${w}" aria-pressed="${o.weeks === w}">${w} weeks</button>`).join("")}</div></div>
    </div>
    <div class="ob-card">
      <div class="ob-q"><div class="ob-qh"><span class="ob-l" id="obl-ch">Where do you want to show up?</span>${from("channels")}</div>
        <div class="ob-chips" role="group" aria-labelledby="obl-ch">${OB_CH.map(([k, l]) => `<button class="ob-chip" data-act="obch" data-k="${k}" aria-pressed="${o.channels.includes(k)}">${l}${o.recommended.includes(k) ? ` <span class="ob-rec" title="Recommended">✨</span>` : ""}</button>`).join("")}<button class="ob-chip ob-spk" data-act="obchauto" aria-pressed="${o.chAuto}">Not sure? ✨</button></div>
        ${o.chAuto ? `<p class="ob-hint">Picked for you: ${o.recommended.map(k => OB_CH.find(c => c[0] === k)[1]).join(", ")}. A landing page is always included.</p>` : `<p class="ob-hint">A landing page is always included: every post and ad sends people there.</p>`}
        ${ads ? `<div class="ob-inline"><label for="ob-budget">Ad budget, €</label><input class="inp ob-inp ob-num" id="ob-budget" data-ob="budget" type="number" min="0" value="${esc(o.budget)}" placeholder="e.g. 600"><span class="muted">${+o.budget ? "" : "Ads need a budget. Without one the show stays organic."}</span></div>` : ""}</div>
      <div class="ob-q"><div class="ob-qh"><span class="ob-l" id="obl-as">What should we make?</span></div>
        <div class="ob-chips" role="group" aria-labelledby="obl-as">${OB_AS.map(([k, l]) => { const ok = tierAllows(k); return `<button class="ob-chip ${ok ? "" : "lk"}" data-act="${ok ? "obas" : "plans"}" data-k="${k}" aria-pressed="${o.assets.includes(k)}">${ok ? "" : ICON.lock}${l}</button>`; }).join("")}<button class="ob-chip ob-spk" data-act="obas" data-k="" aria-pressed="${!o.assets.length}">Showrunner decides ✨</button></div></div>
      <div class="ob-q"><div class="ob-qh"><span class="ob-l" id="obl-look">How should it look?</span></div>
        <div class="ob-looks" role="group" aria-labelledby="obl-look">${Object.entries(LOOKS).map(([k, L]) => `<button class="ob-look" data-act="oblook" data-k="${k}" aria-pressed="${o.look === k}"><span class="sw">${L.palette.slice(0, 4).map(c => `<i style="background:${c}"></i>`).join("")}</span>${esc(L.label)}</button>`).join("")}<button class="ob-chip ob-spk" data-act="oblook" data-k="" aria-pressed="${!o.look}">Showrunner decides ✨</button></div></div>
    </div>
    <div class="ob-card">
      <div class="ob-q"><div class="ob-qh"><span class="ob-l" id="obl-sr">Choose your Showrunner</span></div>
        <div class="ob-srs" role="radiogroup" aria-labelledby="obl-sr">${SR_KEYS.map(k => { const r = SHOWRUNNERS[k]; return `<button class="ob-sr" role="radio" aria-checked="${o.showrunner === k}" data-act="obsr" data-k="${k}"><span class="ob-sri">${ICON[r.icon]}</span><b>${r.name}</b><span>${esc(r.line)}</span></button>`; }).join("")}</div>
        <p class="ob-hint"><b>${SHOWRUNNERS[o.showrunner].name}:</b> ${esc(SHOWRUNNERS[o.showrunner].line)} Each Showrunner follows the published marketing principles of the person it's named after; not affiliated with them.</p></div>
    </div>
    <div class="ob-foot"><span>Webshow plans the season and builds it on the canvas. You can change everything after.</span><button class="btn ob-go" data-act="obgo">${ICON.sparkle} Create my show</button></div>
  </div></div>`;
}

/* ---------- understanding the first message ---------- */
function obGuessGoal(t) { t = t.toLowerCase(); return /book|varaa|varaus|reserv|appointment|class|kurssi|sauna|hotel|table/.test(t) ? "bookings" : /shop|store|kauppa|product|tuote|buy|osta|sale/.test(t) ? "sell" : /event|tapahtuma|concert|festival|seminar|webinar/.test(t) ? "event" : /launch|new |uusi|lanseer|subscription|tilaus/.test(t) ? "launch" : /aware|tunnettuus|brand/.test(t) ? "awareness" : "leads"; }
function obParseOffline(t) {
  const g = obGuessGoal(t); const m = t.match(/(\d+)\s*(viikk|week)/i); const n = t.match(/\b(\d{2,4})\s*(new )?(members|leads|bookings|customers|asiakas|varau|jäsen)/i);
  const said = OB_CH.filter(([k]) => new RegExp({ instagram: "instagram|insta", facebook: "facebook", linkedinpage: "linkedin", tiktokacc: "tiktok", meta: "meta ads|facebook ads|mainos", gads: "google" }[k], "i").test(t)).map(c => c[0]);
  return { what: t, business: "", audience: "", audOptions: [], goal: "", goalGuess: g, target: n ? +n[1] : 0, offer: "", weeks: m ? Math.max(2, Math.min(8, +m[1])) : 0, channels: said, recommended: OB_REC[g], format: OB_FMT[g], ai: false };
}
async function obUnderstand(text) {
  const off = obParseOffline(text); if (!AI.fn) return off;
  try {
    const r = await AI.json(`You are Showrunner in Webshow Campaign Studio, reading a business owner's first message about a campaign. Pull out ONLY what they actually said, and recommend the rest.\n${RULES}\n<input>${text}</input>\nReply with ONLY JSON: {"what": "what they promote, one or two sentences in their language", "business": "business name if said, else empty", "audience": "the audience ONLY if they said it, else empty", "audience_options": ["3 short, likely audiences, in their language"], "goal": one of ${GOAL_OPTS.map(g => `"${g[0]}"`).join("|")} ONLY if clear, else "", "goal_guess": your best guess from the same list, "target": the number they want ONLY if said, else 0, "offer": "the offer ONLY if said, else empty", "weeks": duration in weeks if said, else 0, "format": one of ${Object.keys(SHOW_FORMATS).map(k => `"${k}"`).join("|")}, "channels_said": [channel keys they named, from ${OB_CH.map(c => `"${c[0]}"`).join(", ")}], "channels_recommended": [2-4 keys from the same list that fit this business best]}`, { modelTier: "quick" });
    const okc = (k) => OB_CH.some(c => c[0] === k); const okg = (g) => GOAL_OPTS.some(x => x[0] === g);
    return { what: str(r?.what) || text, business: str(r?.business), audience: str(r?.audience), audOptions: arr(r?.audience_options, 3).map(x => clip(str(x), 80)).filter(Boolean), goal: okg(r?.goal) ? r.goal : "", goalGuess: okg(r?.goal_guess) ? r.goal_guess : off.goalGuess, target: Math.max(0, Math.round(+r?.target || 0)), offer: str(r?.offer), weeks: Math.max(0, Math.min(8, Math.round(+r?.weeks || 0))), channels: arr(r?.channels_said, 6).filter(okc), recommended: arr(r?.channels_recommended, 4).filter(okc).length ? arr(r?.channels_recommended, 4).filter(okc) : off.recommended, format: SHOW_FORMATS[r?.format] ? r.format : off.format, ai: true };
  } catch { return off; }
}
async function obStart(text) {
  S.ob = { ...obBlank(), what: text, showrunner: S.ob?.showrunner || "ogilvy" }; S.view = "onboard"; S.showId = null; render();
  const t0 = Date.now(); const p = await obUnderstand(text); await minWait(t0, 1400); const o = S.ob; if (S.view !== "onboard" || !o) return;
  Object.assign(o, { what: p.what, business: p.business, audOptions: p.audOptions, goalGuess: p.goalGuess, recommended: p.recommended, format: p.format, ai: p.ai, parsed: true });
  if (p.audience) o.audience = p.audience; if (p.goal) o.goal = p.goal; if (p.target) o.target = p.target; if (p.offer) o.offer = p.offer; if (p.weeks) o.weeks = p.weeks;
  o.channels = p.channels.length ? p.channels : [...p.recommended]; o.chAuto = !p.channels.length;
  o.known = { what: p.ai, audience: !!p.audience, goal: !!p.goal, offer: !!p.offer, weeks: !!p.weeks, channels: !!p.channels.length };
  rerenderBody();
}

/* ---------- generate: DNA in the Showrunner's voice → season plan → build on the canvas ---------- */
const OB_STEPS = ["Writing the Show DNA", "Planning the season", "Building it on the canvas"];
function obGenModal() { if (S.obStep == null) return ""; return `<div class="scrim top"><div class="modal ob-gen" role="status" aria-live="polite"><div class="ob-stage" aria-hidden="true"><i>Hook</i><i>Show</i><i>Convert</i></div><h3>Creating your show</h3><p class="muted">${esc(SHOWRUNNERS[S.obName || "ogilvy"]?.name || "")} is running it.</p><ol class="ob-steps">${OB_STEPS.map((t, i) => `<li class="${i < S.obStep ? "ok" : i === S.obStep ? "on" : ""}"><span class="b">${i < S.obStep ? ICON.check : ""}</span>${t}</li>`).join("")}</ol></div></div>`; }
{ const _cl = conLayer; conLayer = () => _cl() + obGenModal(); }
async function obGenerate() {
  const o = S.ob; if (!o || str(o.what).length < 6) return toast("Tell your Showrunner what you're promoting first.");
  const goal = o.goal || o.goalGuess; const target = +o.target || OB_TARGET[goal] || 30; const budget = Math.max(0, +o.budget || 0);
  S.obSR = o.showrunner; S.obName = o.showrunner; S.obStep = 0; paintLayer();
  let r = null;
  if (AI.fn) { try { r = await AI.json(`You are Showrunner in Webshow Campaign Studio. Write the DNA of ONE campaign show: one goal, one big idea.\n${RULES}\n<input>What: ${o.what}\nBusiness: ${o.business || "(not given)"}\nAudience: ${o.audience || "(decide)"}\nGoal: ${goal}, target ${target}\nOffer: ${o.offer || "(not given)"}\nRuns ${o.weeks} weeks from ${o.start}. Budget €${budget}.</input>\nReply with ONLY JSON: {"name": "show name, max 4 words", "tint": one of ${Object.keys(TINTS).filter(k => k !== "slate").map(k => `"${k}"`).join("|")}, "idea": "the big idea in one short sentence", "business": "business name", "offer": "the offer, only as stated", "audience": "who, one sentence", "cta": "main action, 2-4 words", "facts": "facts from the input only, or empty"}`); } catch (e) { toast(errCopy(e)); } }
  const s = createShow({ name: str(r?.name) || clip(o.business || o.what.split(/[.,:\n]/)[0], 32) || "New show", tint: TINTS[r?.tint] ? r.tint : undefined });
  s.showrunner = o.showrunner; s.onboard = { channels: o.channels, assets: o.assets, look: o.look, at: now() };
  s.dna = { ...DNA_DEF(), goal, target, idea: str(r?.idea), business: str(r?.business) || o.business || s.name, offer: str(r?.offer) || o.offer, audience: str(r?.audience) || o.audience, cta: str(r?.cta), facts: str(r?.facts), start: o.start, end: addDays(o.start, o.weeks * 7 - 1), budget: budget || "" };
  Store.putShow(s); S.obSR = null; S.obStep = 1; S.seasonFmt = o.format || OB_FMT[goal] || "launch"; S.ob = null;
  openShow(s.id, "plan"); paintLayer();
  await planSeason();
  if (!S.season) { S.obStep = null; paintLayer(); return toast("The season couldn't be planned. Check the DNA in Plan and try again."); }
  const ch = s.onboard.channels; const keep = (e) => (e.type !== "metaad" || (ch.includes("meta") && budget)) && (e.type !== "ad" || (ch.includes("gads") && budget)) && (!s.onboard.assets.length || ["metaad", "ad"].includes(e.type) || s.onboard.assets.includes(e.type));
  const eps = S.season.eps.filter(keep); if (eps.length >= 2) S.season.eps = eps;
  S.season.eps.forEach(e => { const can = EP_CHANNELS.filter(c => c[2].includes(e.type)).map(c => c[0]); const pick = ch.filter(k => can.includes(k) && (e.type === "metaad" || !["meta", "gads"].includes(k))); if (pick.length) e.channels = pick; });
  if (s.onboard.look) S.season.look = s.onboard.look;
  S.obStep = 2; paintLayer();
  const done = buildSeason();
  setTimeout(() => { S.obStep = null; paintLayer(); toast(`${SHOWRUNNERS[s.showrunner].name} is building your show. Everything on the canvas is yours to change.`, 5000); }, 700);
  await done;
}

/* ---------- the Showrunner stays visible in Plan, and can be switched ---------- */
function srCardHTML() { const s = cur(); if (!s) return ""; const k = s.showrunner || "ogilvy";
  return `<section class="dcard"><div class="dcard-h"><b>Showrunner</b><span class="muted" style="font-size:12px">Steers every idea, hook and rewrite</span></div><div class="ob-srs sm">${SR_KEYS.map(x => `<button class="ob-sr" role="radio" aria-checked="${k === x}" data-act="srset" data-k="${x}"><span class="ob-sri">${ICON[SHOWRUNNERS[x].icon]}</span><b>${SHOWRUNNERS[x].name}</b></button>`).join("")}</div><span class="muted" style="font-size:12px">${esc(SHOWRUNNERS[k].line)}</span></section>`; }
{ const _pv = planView; planView = function () { const h = _pv(); return h.replace('<div style="display:grid;gap:12px;align-content:start">', `<div style="display:grid;gap:12px;align-content:start">${srCardHTML()}`); }; }

/* ---------- wiring ---------- */
{ const _vb = viewBody; viewBody = function () { if (S.view === "onboard") return obView(); return _vb(); }; }
document.addEventListener("input", (e) => { const t = e.target; const k = t.dataset?.ob; if (!k || !S.ob) return; S.ob[k] = k === "target" ? Math.max(0, +t.value || 0) : t.value; if (t.tagName === "TEXTAREA") { t.style.height = "auto"; t.style.height = t.scrollHeight + 4 + "px"; } });
const obRe = () => { const sc = $(".ob-page"); const y = sc?.scrollTop || 0; rerenderBody(); const n = $(".ob-page"); if (n) n.scrollTop = y; };
Object.assign(A, {
  homego() { const v = str($("#homeask")?.value || S.homeText); if (v.length < 6) { toast("Tell your Showrunner what you're promoting first: a sentence or two is enough."); return $("#homeask")?.focus(); } S.homeText = ""; obStart(v); },
  obex(b) { S.homeText = OB_EXAMPLES[+b.dataset.i][1]; const t = $("#homeask"); if (t) { t.value = S.homeText; t.focus(); } },
  obback() { S.homeText = S.ob?.what || S.homeText; S.view = "home"; render(); },
  obaud(b) { S.ob.audience = S.ob.audOptions[+b.dataset.i] || ""; obRe(); },
  obgoal(b) { S.ob.goal = b.dataset.k; obRe(); },
  obweeks(b) { S.ob.weeks = +b.dataset.k; obRe(); },
  obch(b) { const k = b.dataset.k; const c = S.ob.channels; const i = c.indexOf(k); if (i >= 0) { if (c.length === 1) return toast("Pick at least one channel."); c.splice(i, 1); } else c.push(k); S.ob.chAuto = false; obRe(); },
  obchauto() { const o = S.ob; o.chAuto = !o.chAuto; if (o.chAuto) o.channels = [...o.recommended]; obRe(); },
  obas(b) { const k = b.dataset.k; const a = S.ob.assets; if (!k) S.ob.assets = []; else { const i = a.indexOf(k); i >= 0 ? a.splice(i, 1) : a.push(k); } obRe(); },
  oblook(b) { S.ob.look = b.dataset.k; obRe(); },
  obsr(b) { S.ob.showrunner = b.dataset.k; obRe(); },
  obgo() { obGenerate(); },
  srset(b) { const s = cur(); if (!s) return; s.showrunner = b.dataset.k; if (!isEx()) Store.putShow(s); rerenderBody(); toast(`${SHOWRUNNERS[b.dataset.k].name} now runs this show`); },
});
/* the sidebar's Showrunner row covers the onboarding too */
{ const _sb = sidebar; sidebar = function () { const h = _sb(); return S.view === "onboard" ? h.replace('data-act="home"  aria-current="false"', 'data-act="home"  aria-current="true"') : h; }; }
