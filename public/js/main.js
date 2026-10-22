/* Webshow – the phone app. One state object (store.js), one render(), one action table.
   Screens: Chat (default) · Today · Shows · Me. Sheets slide up from the bottom. */
import { state, load, save, resetAll, exportAll, chatsList, showChatOf } from "./store.js";
import { $, IC, toast, copyText, copyNow, mascot, esc } from "./lib.js";
import { ask, initAI, errText, aiMode } from "./ai.js";
import { normChat, normShowChat } from "../shared/prompts.js";
import { srOf, SHOWRUNNERS, SR_FOR_GOAL } from "../shared/showrunners.js";
import { copyOf, KINDS, GOALS, PACES } from "../shared/model.js";
import { clip, uid, todayISO, isISO } from "../shared/util.js";
import { offlineChat, offlineShowChat, guessGoal } from "./offline.js";
import { rewriteAsset, moveAsset, showsList, showEnd, applyChange, makeConcept, createShowFromConcept, checkMilestones, MILESTONES, setOutcome, retryFailed, writeAssets } from "./campaign.js";
import { showMD, showCSV, showICS, showJSON, fileBase, saveFile } from "./export.js";
import { chatView, drawerHTML, currentChat, stageHTML } from "./views/chat.js";
import { todayView, dueToday } from "./views/today.js";
import { showsView, showView } from "./views/shows.js";
import { meView } from "./views/me.js";
import { sheetHTML, findAsset, previewHTML, promptsHTML } from "./views/sheets.js";
import { buildPrompts, chatPostPrompt, afterOf, afterLine } from "../shared/make.js";
import { loadPhoto, savePhoto, removePhoto, renderPost, clearPhotos } from "./photos.js";
import { proShow } from "./pro.js";
import { newShowChat } from "../shared/bridge.js";
import { slug } from "../shared/util.js";

const TABS = [["today", "Home", "home"], ["chat", "Create", "spark"], ["shows", "Shows", "layers"]];

/* ---------- render ---------- */
let lastRoute = "";
export function render() {
  const route = state.ui.tab + (state.ui.showId || "") + (state.ui.tab === "chat" ? state.ui.chatId : "");
  const view = $("#view"); const keep = route === lastRoute ? view.scrollTop : 0; const draft = $("#msg")?.value || "";
  const tab = state.ui.tab;
  view.innerHTML = tab === "chat" ? chatView() : tab === "today" ? todayView() : tab === "show" ? showView(state.shows[state.ui.showId], state.ui.showId) : tab === "me" ? meView() : showsView();
  view.dataset.tab = tab;
  $("#tabs").innerHTML = TABS.map(([k, l, ic]) => { const on = k === tab || (k === "shows" && tab === "show"); const n = k === "today" ? dueToday().length : 0;
    return `<a href="#/${k}" class="tab" ${on ? 'aria-current="page"' : ""}>${IC[ic]}<span>${l}</span>${n ? `<i class="badge">${n}</i>` : ""}</a>`; }).join("");
  renderSheet(); $("#drawer").innerHTML = drawerHTML(); renderStage();
  if (tab === "chat") { const m = $("#msg"); if (m) { m.value = draft; grow(m); } const box = $("#msgs"); view.scrollTop = 0; if (box) box.scrollTop = box.scrollHeight; }
  else view.scrollTop = keep;
  lastRoute = route;
  /* the newest answer animates in once, not on every repaint */
  const f = state.ui.fresh; if (f) setTimeout(() => { if (state.ui.fresh === f) state.ui.fresh = null; }, 900);
}
function renderStage() { const el = $("#stage"); if (el) el.innerHTML = stageHTML(); }
function renderSheet() { const el = $("#sheet"); const keep = el.querySelector(".sheet")?.scrollTop || 0; el.innerHTML = sheetHTML(); el.querySelectorAll("textarea").forEach(fit); const s = el.querySelector(".sheet"); if (s) s.scrollTop = keep; document.body.classList.toggle("locked", !!state.ui.sheet); }
const fit = (t) => { if (!CSS.supports("field-sizing", "content")) { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; } };
const grow = (t) => { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 160) + "px"; };

/* ---------- routing: #/chat (current) #/chat/new #/chat/<id> #/today #/shows #/show/<id> #/me ---------- */
function route() {
  const [, tab0, id] = location.hash.split("/");
  const tab = tab0 || (Object.keys(state.shows).length ? "today" : "chat");
  state.ui.tab = ["chat", "today", "shows", "show", "me"].includes(tab) ? tab : "chat";
  state.ui.showId = tab === "show" ? id : null; state.ui.sheet = null; state.ui.confirmReset = false; state.ui.drawer = false;
  if (state.ui.tab === "chat") {
    state.ui.chatId = id !== "new" && state.chats[id] ? id : id !== "new" && state.chats[state.ui.chatId] ? state.ui.chatId : id !== "new" && chatsList()[0]?.id || freshChat().id;
    if (id !== state.ui.chatId) history.replaceState(null, "", "#/chat/" + state.ui.chatId);
  }
  render();
}
const go = (h) => { if (location.hash === h) route(); else location.hash = h; };

/* ---------- chats ---------- */
const push = (chat, role, text, cards = []) => { const m = { id: uid("m"), role, text, cards, at: Date.now() }; chat.messages.push(m); chat.updatedAt = m.at; save(); return m; };
function newChat(showrunner, showId) {
  const c = { id: uid("c"), title: "", showrunner, showId: showId || null, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
  state.chats[c.id] = c; return c;
}
/* A new chat starts with the mission, not with a marketing decision. Reuses an untouched one. */
function freshChat() {
  const idle = Object.values(state.chats).find(c => !c.showId && c.flow?.step === "goal" && !c.messages.some(m => m.role === "user"));
  if (idle) return idle;
  const c = newChat(state.profile.showrunner || ""); c.flow = { step: "goal" };
  push(c, "sr", state.profile.what ? "New idea time. What are we making happen?" : "Hi! I'm your Showrunner. Tell me what you want more of, and I'll come back with one campaign idea worth doing. So: what are we making happen?", [{ type: "goals" }]);
  return c;
}
const OFFER_Q = { bookings: "What should people book? Anything special on right now?", leads: "What do new customers come to you for? Your main service is fine.", sales: "What are we selling? A product, a gift card, something new?", event: "What's the event, and when is it?", signups: "What are people signing up for?", awareness: "What should people know you for?" };
const INTRO = { ogilvy: ["Here's the angle I'd bet on.", "One idea, sharpened."], hormozi: ["Here's an idea built around a clear yes.", "Offer first. Here's the idea."], vaynerchuk: ["Here's one people will actually stop scrolling for.", "Okay, this one's fun."] };
/* The guided start: goal → business (once) → what to promote → the idea. Typed questions skip to normal chat. */
async function flowStep(chat, text) {
  const f = chat.flow; const p = state.profile;
  if (f.step === "goal") {
    if (/\?\s*$/.test(text)) { chat.flow = null; return false; }
    f.goal = guessGoal(text) || "leads"; f.note = text; return nextFlow(chat);
  }
  if (f.step === "what") { learnFirst(p, text); return nextFlow(chat); }
  if (f.step === "offer") { const pick = /you pick|not sure|en tiedä|valitse/i.test(text); f.offer = pick ? "" : text; if (!pick && !p.offer) p.offer = clip(text, 300); return nextFlow(chat); }
  if (f.step === "tweak") { const { m, c } = f; chat.flow = null; const card = cardOf({ m, c }); if (!card) return true; card.state = "replaced"; await genConcept(chat, { ...card.seed, note: text, avoid: [...(card.seed.avoid || []), card.concept.name] }, card.showrunner); return true; }
  return false;
}
async function nextFlow(chat) {
  const f = chat.flow; const p = state.profile;
  if (!p.what) { f.step = "what"; await say(chat, "Love it. What's the business? One sentence is plenty."); return true; }
  if (f.offer === undefined) { f.step = "offer"; await say(chat, OFFER_Q[f.goal] || OFFER_Q.leads, [{ type: "question", q: "", options: ["You pick", ...(p.offer ? [clip(p.offer, 40)] : [])] }]); return true; }
  chat.flow = null;
  const sr = chat.showrunner || SR_FOR_GOAL[f.goal] || "ogilvy"; chat.showrunner = sr; /* picked at the start, or the best fit for the goal */
  await genConcept(chat, { goal: f.goal, what: [p.business, p.what].filter(Boolean).join(" – "), offer: f.offer, note: f.note && f.note !== GOAL_LABEL[f.goal] ? f.note : "" }, sr);
  return true;
}
const GOAL_LABEL = { bookings: "Fill bookings", leads: "Get more customers", sales: "Sell something", event: "Promote an event" };
async function say(chat, text, cards = [], ms = 700) { state.ui.busy = true; state.ui.busyLabel = "Thinking"; render(); await new Promise(ok => setTimeout(ok, ms)); const m = push(chat, "sr", text, cards); state.ui.fresh = m.id; state.ui.busy = false; render(); $("#msg")?.focus(); }
/* The big reveal. A real AI error shows as an error with Try again, never as a fake idea. */
async function genConcept(chat, seed, sr) {
  state.ui.busy = true; state.ui.busyLabel = ["Cooking up an idea", "Setting the stage", "Finding your angle"][(seed.avoid?.length || 0) % 3]; render();
  const t0 = Date.now();
  try {
    const { concept } = await makeConcept(seed, sr); await pause(t0, 1800);
    const lines = INTRO[sr] || INTRO.ogilvy; const m = push(chat, "sr", lines[(seed.avoid?.length || 0) % lines.length], [{ type: "concept", concept, seed, showrunner: sr, state: "new" }]);
    if (!chat.title) chat.title = concept.name; state.ui.fresh = m.id;
  } catch (e) { await pause(t0, 900); push(chat, "sr", "", [{ type: "error", text: errText(e), retry: { kind: "concept", seed, sr } }]); }
  state.ui.busy = false; render();
}
/* A show's own chat, made the first time it's opened. */
/* The Show's own Showrunner conversation: one per Show, shared with Webshow Pro. */
function openShowChat(showId) {
  const s = state.shows[showId]; const ps = s ? null : proShow(showId); if (!s && !ps) return;
  let c = showChatOf(showId);
  if (!c) { c = newShowChat(showId, s ? s.strategy?.name : ps.name, s ? s.showrunner : ps.showrunner); state.chats[c.id] = c;
    c.messages[0].cards = [{ type: "question", q: "Where do we start?", options: ["What's next?", "Make the posts shorter", "Move everything a week later"] }]; save(); }
  state.settings.activeShow = showId; go("#/chat/" + c.id);
}
const showSummary = (s) => { const next = s.assets.filter(a => !a.done && !a.pending).sort((x, y) => x.date.localeCompare(y.date))[0];
  return { name: s.strategy?.name, idea: s.strategy?.idea, start: s.brief.start, end: showEnd(s), done: s.assets.filter(a => a.done).length, total: s.assets.length, next: next ? `${KINDS[next.kind].label} on ${next.date}` : "" }; };
/* What the show chat sends: the show without the long texts. */
const slimShow = (s) => ({ showrunner: s.showrunner, brief: s.brief, strategy: s.strategy, assets: s.assets.map(a => ({ id: a.id, date: a.date, kind: a.kind, phase: a.phase, done: !!a.done, title: a.title, fields: { first: Object.values(a.fields || {})[0] || "" } })) });
/* What the AI sees of the conversation: the words plus a one-line note of each card. */
const forAI = (m) => ({ role: m.role, text: [m.text, ...(m.cards || []).map(c => c.type === "plan" ? `[proposed plan: ${c.name}${c.showId ? ", created" : ""}]` : c.type === "post" ? `[post for ${c.channel}: ${c.hook}]` : c.type === "question" ? `[asked: ${c.q}]` : "").filter(Boolean)].filter(Boolean).join(" ") });

/* The first thing the owner writes is about their business. "Löyly: sauna by the sea" → name + what. */
function learnFirst(p, text) {
  const m = text.match(/^\s*([^:,–\-.\n]{2,40}?)\s*[:–-]\s+(.+)$/s);
  if (m && !p.business && m[1].trim().split(/\s+/).length <= 5) { p.business = m[1].trim(); p.what = clip(m[2], 300); }
  else p.what = clip(text, 300);
}
async function send(text) {
  text = String(text || "").trim(); if (!text || state.ui.busy) return;
  const chat = currentChat(); if (!chat) return go("#/chat/new");
  const show = chat.showId ? state.shows[chat.showId] : null;
  const proSlim = !show && chat.showId ? proShow(chat.showId)?.slim : null; /* a Show made in Webshow Pro */
  if (!chat.title && !chat.flow) chat.title = clip(text, 42);
  if (chat.flow?.step) { push(chat, "user", text); render(); if (await flowStep(chat, text)) return; }
  else push(chat, "user", text);
  if (/^new campaign idea$/i.test(text)) { chat.flow = { step: "goal" }; return say(chat, "What are we making happen?", [{ type: "goals" }]); }
  const p = state.profile; if (!chat.showrunner) chat.showrunner = p.showrunner || "ogilvy"; const prof = { ...p, showrunner: chat.showrunner };
  if (!p.what && !show) learnFirst(p, text);
  if (!chat.title) chat.title = clip(text, 42);
  state.ui.busy = true; state.ui.busyLabel = "Thinking"; render();
  const t0 = Date.now(); let r;
  const msgs = chat.messages.slice(-14).map(forAI);
  try {
    r = show || proSlim ? normShowChat(await ask("showchat", { profile: prof, show: show ? slimShow(show) : proSlim, messages: msgs, today: todayISO() }), show || proSlim)
      : normChat(await ask("chat", { profile: prof, messages: msgs, shows: showsList().slice(0, 5).map(showSummary), today: todayISO() }));
  } catch (e) {
    if (e?.code !== "offline") { await pause(t0, 700); push(chat, "sr", "", [{ type: "error", text: errText(e), retry: { kind: "chat", text } }]); state.ui.busy = false; return render(); }
    r = show || proSlim ? offlineShowChat({ show: show || proSlim, messages: chat.messages }) : offlineChat({ profile: prof, messages: chat.messages });
  }
  const cards = [...r.cards];
  const fresh = r.remember.filter(x => !p.memory.some(m => m.text.toLowerCase() === x.toLowerCase()));
  if (fresh.length) { p.memory.push(...fresh.map(text => ({ text, at: Date.now() }))); cards.push({ type: "remembered", items: fresh }); }
  /* A short, natural pause while "… is answering" shows, even when the answer is instant. */
  await pause(t0, 900 + Math.min(1300, r.reply.length * 10));
  const m = push(chat, "sr", r.reply, cards); state.ui.fresh = m.id; state.ui.busy = false; render();
}
const pause = (t0, ms) => new Promise(ok => setTimeout(ok, Math.max(0, ms - (Date.now() - t0))));
/* Copy a prompt and open ChatGPT (the app on phones, the site on computers). */
function toGPT(text, photo) {
  copyNow(text); toast(photo ? "Prompt copied. In ChatGPT: add your photo, then paste." : "Prompt copied. Paste it in ChatGPT.", 4000);
  window.open("https://chatgpt.com/", "_blank", "noopener");
}
function setAfter(sid, patch) { const s = state.shows[sid]; if (!s) return; s.brief.after = { ...afterOf(s, state.profile), ...patch }; save(); }
const msgOf = (d) => { for (const c of Object.values(state.chats)) { const m = c.messages.find(x => x.id === d.m); if (m) return { chat: c, m }; } return {}; };
const cardOf = (d) => msgOf(d).m?.cards?.[+d.c];
/* Real milestones get a small, friendly moment. Nothing for just opening the app. */
function cheer(s) {
  const fresh = checkMilestones(s).filter(k => k !== "idea"); if (!fresh.length) return;
  const [, title, line] = MILESTONES.find(([k]) => k === fresh.at(-1));
  const box = $("#toasts"); box.replaceChildren(); const el = document.createElement("div"); el.className = "toast cheer";
  el.innerHTML = `${mascot("happy")}<span><b>${esc(title)}</b><small>${esc(line)}</small></span>`; box.append(el);
  setTimeout(() => el.remove(), 5000);
}

/* ---------- actions: every data-act="…" in the views lands here ---------- */
const A = {
  tab: (d) => go("#/" + d.t),
  say: (d) => send(d.t),
  /* The guided start */
  async goal(d) {
    const chat = currentChat(); if (!chat || state.ui.busy) return; chat.flow = { ...(chat.flow || {}), step: "goal", goal: d.k };
    push(chat, "user", GOAL_LABEL[d.k] || GOALS[d.k]?.label); render(); await nextFlow(chat);
  },
  pickrunner(d) { const chat = currentChat(); if (!chat) return; chat.showrunner = d.k; if (d.k) state.profile.showrunner = d.k; save(); render(); },
  makeit(d) { const c = cardOf(d); if (c) { c.state = "pace"; save(); render(); } },
  /* Approved: build the Show behind a short, real "production" reveal (no fake percentages). */
  async pace(d) {
    const c = cardOf(d); const { chat } = msgOf(d); if (!c || c.state === "approved") return;
    c.state = "approved"; save(); const t0 = Date.now();
    state.ui.build = { concept: c.concept, sr: c.showrunner, stage: 2, done: 0, total: 0 }; renderStage(); /* the idea is already approved: step 1 is done */
    const show = await createShowFromConcept(c.concept, d.v, c.showrunner, (s) => {
      c.showId = s.id; const b = state.ui.build; if (!b) return;
      b.showId = s.id; b.total = s.assets.length; b.done = s.assets.filter(a => !a.pending).length;
      if (Date.now() - t0 > 700) b.stage = Math.max(b.stage, 3); renderStage();
    });
    await pause(t0, 2400);
    const b = state.ui.build; if (b) { b.stage = 4; b.showId = show.id; b.status = show.status; renderStage(); }
    const n = show.assets.filter(a => a.source !== "failed").length;
    push(chat, "sr", show.status === "partial" ? `“${show.strategy.name}” is set up, but some posts didn't get written. Open the show and tap Try again.` : `“${show.strategy.name}” is ready: ${n} posts at a ${PACES[d.v].label.toLowerCase()} pace. First mission: make your first post.`, [{ type: "open", showId: show.id, name: show.strategy.name }]);
    state.settings.activeShow = show.id; save();
  },
  enterShow() { const id = state.ui.build?.showId; state.ui.build = null; renderStage(); if (id) { state.ui.showTab = "journey"; state.ui.stage = null; go("#/show/" + id); } },
  another(d) { const c = cardOf(d); const { chat } = msgOf(d); if (!c || state.ui.busy) return; c.state = "replaced"; genConcept(chat, { ...c.seed, avoid: [...(c.seed.avoid || []), c.concept.name] }, c.showrunner); },
  restyle(d) { const c = cardOf(d); const { chat } = msgOf(d); if (!c || state.ui.busy) return; c.state = "replaced"; chat.showrunner = d.k; genConcept(chat, { ...c.seed, avoid: [...(c.seed.avoid || []), c.concept.name] }, d.k); },
  tweak(d) { const { chat } = msgOf(d); if (!chat) return; chat.flow = { step: "tweak", m: d.m, c: d.c }; render(); $("#msg")?.focus(); },
  reuseconcept(d) { const { chat } = msgOf(d); chat?.messages.forEach(m => m.cards?.forEach(x => { if (x.type === "concept" && x.state === "new") x.state = "replaced"; })); const c = cardOf(d); if (c) c.state = "new"; save(); render(); },
  retry(d) {
    const c = cardOf(d); const { chat } = msgOf(d); if (!c || state.ui.busy) return; c.retried = true; save();
    if (c.retry?.kind === "concept") genConcept(chat, c.retry.seed, c.retry.sr);
    else if (c.retry?.kind === "chat") { chat.messages = chat.messages.filter(m => !(m.role === "user" && m.text === c.retry.text && m === chat.messages.at(-2))); send(c.retry.text); }
  },
  async "retry-show"(d) { const s = state.shows[d.id]; if (s) { await retryFailed(s, () => render()); render(); } },
  async "retry-one"(d) { const { s, a } = findAsset(d.s, d.a); if (a) { await writeAssets(s, [a], "", () => { render(); renderSheet(); }); renderSheet(); } },
  outcome(d) {
    const { s, a } = findAsset(d.s, d.a); if (!a) return;
    if (d.v === "skip") a.outcome = { got: false, skipped: true, at: todayISO() }; else setOutcome(a, d.v === "yes", d.n || a.outcome?.count || "");
    save(); render(); if (state.ui.sheet) renderSheet();
    if (d.v === "yes") cheer(s); else if (d.v === "no") toast("Noted. One post rarely does it alone; the next ones build on it.", 3500);
  },
  stage: (d) => { state.ui.stage = d.k; render(); },
  newchat: () => go("#/chat/new"),
  openchat: (d) => go("#/chat/" + d.id),
  showchat: (d) => openShowChat(d.id),
  drawer: () => { state.ui.drawer = !state.ui.drawer; $("#drawer").innerHTML = drawerHTML(); },
  delchat(d, el) {
    if (!el.dataset.armed) { el.dataset.armed = 1; el.classList.add("armed"); el.setAttribute("aria-label", "Tap again to delete"); toast("Tap again to delete this chat"); return; }
    delete state.chats[d.id]; save(); if (state.ui.chatId === d.id) { state.ui.chatId = null; state.ui.drawer = true; } render();
  },
  async applychange(d) {
    const { chat } = msgOf(d); const c = cardOf(d); const show = state.shows[chat?.showId]; if (!c || !show || c.applied) return;
    c.applied = true; save(); render(); toast("Applying the change…");
    await applyChange(show, c.ops, () => render());
    const m = push(chat, "sr", "Done. Have a look at the show.", [{ type: "open", showId: show.id, name: show.strategy?.name || "the show" }]); state.ui.fresh = m.id; render();
  },
  skipchange(d) { const c = cardOf(d); if (c) { c.dismissed = true; save(); render(); } },
  setstyle(d) { state.profile.showrunner = d.k; save(); render(); toast(`${SHOWRUNNERS[d.k].name} style`); },
  /* A plan suggested in conversation becomes a full idea to approve, never a show straight away. */
  createplan(d) {
    const c = cardOf(d); const { chat } = msgOf(d); if (!c || c.asked || state.ui.busy) return; c.asked = true; save();
    const p = state.profile; genConcept(chat, { goal: c.goal, what: [p.business, p.what].filter(Boolean).join(" – "), offer: c.offer || c.idea, note: `Build on this direction: ${c.name} – ${c.idea}` }, chat.showrunner || p.showrunner || SR_FOR_GOAL[c.goal]);
  },
  openshow: (d) => { state.ui.showTab = "journey"; state.ui.stage = null; state.settings.activeShow = d.id; save(); go("#/show/" + d.id); },
  copypost: (d) => { const c = cardOf(d); copyText([c.hook, c.text, c.cta].filter(Boolean).join("\n\n"), "Post copied"); },
  gptpost: (d) => toGPT(chatPostPrompt(cardOf(d), state.profile)),
  openme: () => go("#/me"),
  newshow() { go("#/chat/new"); },
  toggledone(d) { const { s, a } = findAsset(d.s, d.a); if (!a || a.source === "failed") return; a.done = !a.done; a.doneOn = a.done ? todayISO() : ""; save(); render(); if (state.ui.sheet) renderSheet(); if (a.done) cheer(s); },
  openasset(d) {
    state.ui.sheet = { k: "asset", s: d.s, a: d.a, t: d.t }; renderSheet();
    const { a } = findAsset(d.s, d.a); if (a?.hasPhoto) loadPhoto(a.id).then(u => { if (u && state.ui.sheet?.a === a.id) renderSheet(); });
  },
  sheettab: (d) => { state.ui.sheet.t = d.t; renderSheet(); },
  setlook(d) { const { a } = findAsset(d.s, d.a); if (!a) return; a.look = { ...(a.look || {}), [d.k]: d.v }; state.ui.lookOpen = true; save(); renderSheet(); },
  gpt(d) { const { s, a } = findAsset(d.s, d.a); const p = buildPrompts(a, s, state.profile)[+d.i]; if (!p) return; toGPT(p.text, p.photo); if (["image", "slides", "frames"].includes(p.key)) { a.gptImage = true; save(); setTimeout(() => cheer(s), 1200); } },
  copyp(d) { const { s, a } = findAsset(d.s, d.a); const p = buildPrompts(a, s, state.profile)[+d.i]; if (p) copyText(p.text, "Prompt copied"); },
  async saveimage(d) {
    const { s, a } = findAsset(d.s, d.a); if (!a) return; toast("Making your image…");
    const blob = await renderPost(a); const name = `${slug(s.strategy?.name || "post")}-${slug(a.title || a.kind)}.jpg`; a.imageSaved = true; save(); setTimeout(() => cheer(s), 600);
    const file = new File([blob], name, { type: "image/jpeg" });
    if (navigator.canShare?.({ files: [file] }) && matchMedia("(pointer: coarse)").matches) { try { await navigator.share({ files: [file] }); return; } catch (e) { if (e?.name === "AbortError") return; } }
    saveFile(name, blob, "image/jpeg");
  },
  async rmphoto(d) { const { a } = findAsset(d.s, d.a); if (!a) return; await removePhoto(a.id); a.hasPhoto = false; save(); renderSheet(); },
  editafter() { const sid = state.ui.sheet?.s; state.ui.sheet = null; state.ui.showTab = "plan"; go("#/show/" + sid); setTimeout(() => $("#after")?.scrollIntoView({ block: "start" }), 50); },
  aftertype(d) { setAfter(d.s, { type: d.v }); render(); },
  afterfield(d) { const af = afterOf(state.shows[d.s], state.profile); const f = af.fields.includes(d.f) ? af.fields.filter(x => x !== d.f) : [...af.fields, d.f]; setAfter(d.s, { fields: f }); render(); },
  sheet: (d) => { state.ui.sheet = { k: d.k }; renderSheet(); },
  closesheet: () => { state.ui.sheet = null; render(); },
  showtab: (d) => { state.ui.showTab = d.t; render(); },
  deleteshow(d, el) {
    if (el.dataset.armed) { delete state.shows[d.id]; save(); toast("Show deleted"); go("#/shows"); return; }
    el.dataset.armed = 1; el.innerHTML = `${IC.trash} Tap again to delete`;
  },
  copyfield: (d) => copyText(findAsset(d.s, d.a).a?.fields[d.f]),
  copyasset: (d) => copyText(copyOf(findAsset(d.s, d.a).a), "Text copied"),
  export(d) {
    const s = state.shows[state.ui.showId]; if (!s) return; const n = fileBase(s);
    ({ md: () => saveFile(n + ".md", showMD(s), "text/markdown"), ics: () => saveFile(n + ".ics", showICS(s), "text/calendar"), csv: () => saveFile(n + ".csv", showCSV(s), "text/csv"), json: () => saveFile(n + ".campaign.json", showJSON(s), "application/json") })[d.k]();
  },
  setplan(d) {
    state.settings.plan = d.k; save(); renderSheet(); render(); toast("Plan changed (demo, no payment)");
  },
  theme(d) { state.settings.theme = d.v; save(); applyTheme(); render(); },
  async nudges() {
    const on = !state.settings.nudges;
    if (on && "Notification" in window && Notification.permission === "default") { try { await Notification.requestPermission(); } catch {} }
    if (on && (!("Notification" in window) || Notification.permission !== "granted")) toast("Reminders will show inside the app.");
    state.settings.nudges = on; save(); render(); if (on) nudge(true);
  },
  forget(d) { state.profile.memory.splice(+d.i, 1); save(); render(); },
  exportall: () => saveFile("webshow-my-data.json", exportAll(), "application/json"),
  async reset() { if (state.ui.confirmReset) { await clearPhotos(); return resetAll(); } state.ui.confirmReset = true; render(); },
};

/* ---------- reminders (while the app is open) ---------- */
function nudge(force) {
  if (!state.settings.nudges) return; const t = todayISO(); if (!force && state.settings.lastNudge === t) return;
  const n = dueToday().length; if (!n) return;
  const body = `${n} thing${n > 1 ? "s" : ""} to post today. Your ${srOf(state.profile.showrunner).name} Showrunner has them ready.`;
  try { if ("Notification" in window && Notification.permission === "granted" && document.hidden) new Notification("Webshow", { body, icon: "icon.svg" }); else toast(body, 4000); } catch { toast(body, 4000); }
  state.settings.lastNudge = t; save();
}
function applyTheme() { const t = state.settings.theme; if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }

/* ---------- wiring ---------- */
function wire() {
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]"); if (!el || !A[el.dataset.act]) return;
    if (el.tagName === "A") return; e.preventDefault(); A[el.dataset.act](el.dataset, el, e);
  });
  document.addEventListener("submit", (e) => {
    const f = e.target.closest("[data-form]"); if (!f) return; e.preventDefault();
    if (f.dataset.form === "chat") { const m = $("#msg"); const v = m.value; m.value = ""; send(v); }
    if (f.dataset.form === "rewrite") { const { s, a } = findAsset(f.dataset.s, f.dataset.a); if (!a) return; const note = f.note.value.trim(); rewriteAsset(s, a, note, () => { renderSheet(); render(); }).then(() => toast("Rewritten")); }
  });
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "msg") grow(t);
    if (t.dataset.prof) { state.profile[t.dataset.prof] = t.value; save(); }
    if (t.dataset.look) { const { s, a } = findAsset(t.dataset.s, t.dataset.a); if (a) { a.look = { ...(a.look || {}), [t.dataset.look]: t.value }; save(); const pv = $("#mk-prev"), pr = $("#mk-prompts"); if (pv) pv.innerHTML = previewHTML(a); if (pr) pr.innerHTML = promptsHTML(s, a); } }
    if (t.dataset.after) { const s = state.shows[t.dataset.s]; if (s) { setAfter(s.id, { [t.dataset.after]: t.value }); const l = $("[data-afterline]"); if (l) l.textContent = afterLine(afterOf(s, state.profile)); } }
    if (t.dataset.field) { fit(t); const { a } = findAsset(t.dataset.s, t.dataset.a); if (a) { a.fields[t.dataset.field] = t.value; save(); } }
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.actChange === "photo" && t.files?.[0]) { const { a } = findAsset(t.dataset.s, t.dataset.a); if (!a) return; toast("Adding your photo…");
      savePhoto(a.id, t.files[0]).then(() => { a.hasPhoto = true; a.look = { ...(a.look || {}), photo: "own" }; save(); renderSheet(); render(); cheer(findAsset(t.dataset.s, t.dataset.a).s); }).catch(() => toast("That photo couldn't be read. Try a JPG or PNG.")); return; }
    if (t.dataset.actChange !== "movedate" || !isISO(t.value)) return;
    const { a } = findAsset(t.dataset.s, t.dataset.a); if (a) { moveAsset(a, t.value); render(); toast("Moved"); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.id === "msg" && e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.target.form.requestSubmit(); }
    if (e.key === "Escape" && state.ui.sheet) A.closesheet(); else if (e.key === "Escape" && state.ui.drawer) A.drawer();
  });
  window.addEventListener("hashchange", route);
  /* Webshow Pro (another tab) wrote to the shared store: pick up conversations and Shows */
  window.addEventListener("storage", (e) => { if ((e.key === "webshow.v1" || e.key === "wss.local") && !state.ui.busy) { if (e.key === "webshow.v1") load(); render(); } });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) nudge(); });
  setInterval(() => nudge(), 30 * 60e3);
}

async function start() {
  load(); applyTheme(); wire(); route();
  if (new URLSearchParams(location.search).has("plans")) { state.ui.sheet = { k: "plans" }; renderSheet(); }
  /* Optional: put the official ChatGPT logo at public/brand/chatgpt.svg and the buttons use it. */
  fetch("brand/chatgpt.svg", { method: "HEAD" }).then(r => { if (r.ok && /svg/.test(r.headers.get("content-type") || "")) { state.ui.gptLogo = true; render(); } }).catch(() => {});
  await initAI(); render();
  nudge();
}
start();
