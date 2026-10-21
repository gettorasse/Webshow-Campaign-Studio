/* Webshow – the phone app. One state object (store.js), one render(), one action table.
   Screens: Chat (default) · Today · Shows · Me. Sheets slide up from the bottom. */
import { state, load, save, resetAll, exportAll, chatsList, showChatOf, hasPro } from "./store.js";
import { $, IC, toast, copyText, copyNow } from "./lib.js";
import { ask, initAI, errText } from "./ai.js";
import { normChat, normShowChat } from "../shared/prompts.js";
import { srOf, SHOWRUNNERS } from "../shared/showrunners.js";
import { copyOf, KINDS } from "../shared/model.js";
import { clip, uid, todayISO, isISO } from "../shared/util.js";
import { offlineChat, offlineShowChat } from "./offline.js";
import { createShow, rewriteAsset, moveAsset, showsList, showEnd, applyChange } from "./campaign.js";
import { showMD, showCSV, showICS, showJSON, fileBase, saveFile } from "./export.js";
import { chatView, drawerHTML, currentChat } from "./views/chat.js";
import { todayView, dueToday } from "./views/today.js";
import { showsView, showView } from "./views/shows.js";
import { meView } from "./views/me.js";
import { sheetHTML, findAsset, previewHTML, promptsHTML } from "./views/sheets.js";
import { buildPrompts, chatPostPrompt, afterOf, afterLine } from "../shared/make.js";
import { loadPhoto, savePhoto, removePhoto, renderPost, clearPhotos } from "./photos.js";
import { slug } from "../shared/util.js";

const TABS = [["chat", "Showrunner", "chat"], ["today", "Today", "home"], ["shows", "Shows", "layers"], ["me", "Me", "user"]];

/* ---------- render ---------- */
let lastRoute = "";
export function render() {
  const route = state.ui.tab + (state.ui.showId || "") + (state.ui.tab === "chat" ? state.ui.chatId : "");
  const view = $("#view"); const keep = route === lastRoute ? view.scrollTop : 0; const draft = $("#msg")?.value || "";
  const tab = state.ui.tab;
  view.innerHTML = tab === "chat" ? chatView() : tab === "today" ? todayView() : tab === "show" ? showView(state.shows[state.ui.showId]) : tab === "me" ? meView() : showsView();
  view.dataset.tab = tab;
  $("#tabs").innerHTML = TABS.map(([k, l, ic]) => { const on = k === tab || (k === "shows" && tab === "show"); const n = k === "today" ? dueToday().length : 0;
    return `<a href="#/${k}" class="tab" ${on ? 'aria-current="page"' : ""}>${IC[ic]}<span>${l}</span>${n ? `<i class="badge">${n}</i>` : ""}</a>`; }).join("");
  renderSheet(); $("#drawer").innerHTML = drawerHTML();
  if (tab === "chat") { const m = $("#msg"); if (m) { m.value = draft; grow(m); } const box = $("#msgs"); view.scrollTop = 0; if (box) box.scrollTop = box.scrollHeight; }
  else view.scrollTop = keep;
  lastRoute = route;
  /* the newest answer animates in once, not on every repaint */
  const f = state.ui.fresh; if (f) setTimeout(() => { if (state.ui.fresh === f) state.ui.fresh = null; }, 900);
}
function renderSheet() { const el = $("#sheet"); const keep = el.querySelector(".sheet")?.scrollTop || 0; el.innerHTML = sheetHTML(); el.querySelectorAll("textarea").forEach(fit); const s = el.querySelector(".sheet"); if (s) s.scrollTop = keep; document.body.classList.toggle("locked", !!state.ui.sheet); }
const fit = (t) => { if (!CSS.supports("field-sizing", "content")) { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; } };
const grow = (t) => { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 160) + "px"; };

/* ---------- routing: #/chat (current) #/chat/new #/chat/<id> #/today #/shows #/show/<id> #/me ---------- */
function route() {
  const [, tab = "chat", id] = location.hash.split("/");
  state.ui.tab = ["chat", "today", "shows", "show", "me"].includes(tab) ? tab : "chat";
  state.ui.showId = tab === "show" ? id : null; state.ui.sheet = null; state.ui.confirmReset = false; state.ui.drawer = false;
  if (state.ui.tab === "chat") state.ui.chatId = id === "new" ? null : state.chats[id] ? id : state.chats[state.ui.chatId] ? state.ui.chatId : chatsList()[0]?.id || null;
  render();
}
const go = (h) => { if (location.hash === h) route(); else location.hash = h; };

/* ---------- chats ---------- */
const push = (chat, role, text, cards = []) => { const m = { id: uid("m"), role, text, cards, at: Date.now() }; chat.messages.push(m); chat.updatedAt = m.at; save(); return m; };
function newChat(showrunner, showId) {
  const c = { id: uid("c"), title: "", showrunner, showId: showId || null, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
  state.chats[c.id] = c; return c;
}
/* A show's own chat, made the first time it's opened. */
function openShowChat(showId) {
  const s = state.shows[showId]; if (!s) return;
  let c = showChatOf(showId);
  if (!c) { c = newChat(s.showrunner || state.profile.showrunner || "ogilvy", showId); c.title = s.strategy?.name || "Show";
    push(c, "sr", `Let's talk about “${s.strategy?.name || "this show"}”. Ask me to change the tone, move dates or rework the idea. I'll show you every change before anything happens.`, [{ type: "question", q: "Where do we start?", options: ["What's next?", "Make the posts shorter", "Move everything a week later"] }]); }
  go("#/chat/" + c.id);
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
  const chat = currentChat(); if (!chat) { state.ui.pendingSay = text; return go("#/chat/new"); }
  const show = chat.showId ? state.shows[chat.showId] : null;
  const p = state.profile; const prof = { ...p, showrunner: chat.showrunner };
  if (!p.what && !show) learnFirst(p, text);
  if (!chat.title) chat.title = clip(text, 42);
  push(chat, "user", text); state.ui.busy = true; render();
  const t0 = Date.now(); let r;
  const msgs = chat.messages.slice(-14).map(forAI);
  try {
    r = show ? normShowChat(await ask("showchat", { profile: prof, show: slimShow(show), messages: msgs, today: todayISO() }), show)
      : normChat(await ask("chat", { profile: prof, messages: msgs, shows: showsList().slice(0, 5).map(showSummary), today: todayISO() }));
  } catch (e) { if (e?.code !== "offline") toast(errText(e)); r = show ? offlineShowChat({ show, messages: chat.messages }) : offlineChat({ profile: prof, messages: chat.messages }); }
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

/* ---------- actions: every data-act="…" in the views lands here ---------- */
const A = {
  tab: (d) => go("#/" + d.t),
  say: (d) => send(d.t),
  /* New chat: the owner picked who runs the show. */
  pickstyle(d) {
    const sr = SHOWRUNNERS[d.k]; state.profile.showrunner = d.k;
    const c = newChat(d.k); state.ui.busy = true; go("#/chat/" + c.id);
    setTimeout(() => {
      const first = !state.profile.what;
      const m = push(c, "sr", first ? `I'm ${sr.name}, and I'm running your show. Tell me about your business: what you sell, and who buys it?` : `${sr.name} here. What are we working on today?`);
      state.ui.fresh = m.id; state.ui.busy = false; render();
      const say = state.ui.pendingSay; state.ui.pendingSay = ""; if (say && !first) send(say); else $("#msg")?.focus();
    }, 900);
  },
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
  async createplan(d) {
    const c = cardOf(d); const { chat } = msgOf(d); if (!c || c.showId) return;
    let first = true;
    const show = await createShow(c, (s) => { c.showId = s.id; if (first) { first = false; go("#/show/" + s.id); } else render(); }, chat?.showrunner);
    push(chat, "sr", `“${show.strategy.name}” is ready: ${show.assets.length} posts, planned day by day. Your to-dos are in Today.`, [{ type: "open", showId: show.id, name: show.strategy.name }]);
    toast("Your show is ready"); render();
  },
  openshow: (d) => { state.ui.showTab = "posts"; go("#/show/" + d.id); },
  copypost: (d) => { const c = cardOf(d); copyText([c.hook, c.text, c.cta].filter(Boolean).join("\n\n"), "Post copied"); },
  gptpost: (d) => toGPT(chatPostPrompt(cardOf(d), state.profile)),
  openme: () => go("#/me"),
  newshow() { state.ui.pendingSay = "Plan a campaign"; go("#/chat/new"); },
  toggledone(d) { const { a } = findAsset(d.s, d.a); if (!a) return; a.done = !a.done; a.doneOn = a.done ? todayISO() : ""; save(); render(); },
  openasset(d) {
    state.ui.sheet = { k: "asset", s: d.s, a: d.a }; renderSheet();
    const { a } = findAsset(d.s, d.a); if (a?.hasPhoto) loadPhoto(a.id).then(u => { if (u && state.ui.sheet?.a === a.id) renderSheet(); });
  },
  sheettab: (d) => { state.ui.sheet.t = d.t; renderSheet(); },
  setlook(d) { const { a } = findAsset(d.s, d.a); if (!a) return; a.look = { ...(a.look || {}), [d.k]: d.v }; state.ui.lookOpen = true; save(); renderSheet(); },
  gpt(d) { const { s, a } = findAsset(d.s, d.a); const p = buildPrompts(a, s, state.profile)[+d.i]; if (p) toGPT(p.text, p.photo); },
  copyp(d) { const { s, a } = findAsset(d.s, d.a); const p = buildPrompts(a, s, state.profile)[+d.i]; if (p) copyText(p.text, "Prompt copied"); },
  async saveimage(d) {
    const { s, a } = findAsset(d.s, d.a); if (!a) return; toast("Making your image…");
    const blob = await renderPost(a); const name = `${slug(s.strategy?.name || "post")}-${slug(a.title || a.kind)}.jpg`;
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
    state.settings.plan = d.k; save(); document.documentElement.dataset.pro = hasPro() ? "yes" : "no"; renderSheet(); render();
    toast(hasPro() && matchMedia("(min-width: 1024px) and (pointer: fine)").matches ? "Plan changed (demo). Webshow Pro is now yours on this computer." : "Plan changed (demo, no payment)");
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
      savePhoto(a.id, t.files[0]).then(() => { a.hasPhoto = true; a.look = { ...(a.look || {}), photo: "own" }; save(); renderSheet(); }).catch(() => toast("That photo couldn't be read. Try a JPG or PNG.")); return; }
    if (t.dataset.actChange !== "movedate" || !isISO(t.value)) return;
    const { a } = findAsset(t.dataset.s, t.dataset.a); if (a) { moveAsset(a, t.value); render(); toast("Moved"); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.id === "msg" && e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.target.form.requestSubmit(); }
    if (e.key === "Escape" && state.ui.sheet) A.closesheet(); else if (e.key === "Escape" && state.ui.drawer) A.drawer();
  });
  window.addEventListener("hashchange", route);
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
