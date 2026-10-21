/* Webshow – the phone app. One state object (store.js), one render(), one action table.
   Screens: Chat (default) · Today · Shows · Me. Sheets slide up from the bottom. */
import { state, load, save, resetAll, exportAll } from "./store.js";
import { $, IC, toast, copyText } from "./lib.js";
import { ask, initAI, errText } from "./ai.js";
import { normChat } from "../shared/prompts.js";
import { srOf, SHOWRUNNERS } from "../shared/showrunners.js";
import { copyOf, KINDS } from "../shared/model.js";
import { clip, uid, todayISO, isISO } from "../shared/util.js";
import { offlineChat } from "./offline.js";
import { createShow, rewriteAsset, moveAsset, showsList, showEnd } from "./campaign.js";
import { showMD, showCSV, showICS, showJSON, fileBase, saveFile } from "./export.js";
import { chatView } from "./views/chat.js";
import { todayView, dueToday } from "./views/today.js";
import { showsView, showView } from "./views/shows.js";
import { meView } from "./views/me.js";
import { sheetHTML, findAsset } from "./views/sheets.js";

const TABS = [["chat", "Showrunner", "chat"], ["today", "Today", "home"], ["shows", "Shows", "layers"], ["me", "Me", "user"]];

/* ---------- render ---------- */
let lastRoute = "";
export function render() {
  const route = state.ui.tab + (state.ui.showId || "");
  const view = $("#view"); const keep = route === lastRoute ? view.scrollTop : 0; const draft = $("#msg")?.value || "";
  const tab = state.ui.tab;
  view.innerHTML = tab === "chat" ? chatView() : tab === "today" ? todayView() : tab === "show" ? showView(state.shows[state.ui.showId]) : tab === "me" ? meView() : showsView();
  view.dataset.tab = tab;
  $("#tabs").innerHTML = TABS.map(([k, l, ic]) => { const on = k === tab || (k === "shows" && tab === "show"); const n = k === "today" ? dueToday().length : 0;
    return `<a href="#/${k}" class="tab" ${on ? 'aria-current="page"' : ""}>${IC[ic]}<span>${l}</span>${n ? `<i class="badge">${n}</i>` : ""}</a>`; }).join("");
  renderSheet();
  if (tab === "chat") { const m = $("#msg"); if (m) { m.value = draft; grow(m); } const box = $("#msgs"); view.scrollTop = 0; if (box) box.scrollTop = box.scrollHeight; }
  else view.scrollTop = keep;
  lastRoute = route;
}
function renderSheet() { const el = $("#sheet"); const keep = el.querySelector(".sheet")?.scrollTop || 0; el.innerHTML = sheetHTML(); el.querySelectorAll("textarea").forEach(fit); const s = el.querySelector(".sheet"); if (s) s.scrollTop = keep; document.body.classList.toggle("locked", !!state.ui.sheet); }
const fit = (t) => { if (!CSS.supports("field-sizing", "content")) { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; } };
const grow = (t) => { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 160) + "px"; };

/* ---------- routing: #/chat #/today #/shows #/show/<id> #/me ---------- */
function route() {
  const [, tab = "chat", id] = location.hash.split("/");
  state.ui.tab = ["chat", "today", "shows", "show", "me"].includes(tab) ? tab : "chat";
  state.ui.showId = tab === "show" ? id : null; state.ui.sheet = null; state.ui.confirmReset = false;
  render();
}
const go = (h) => { if (location.hash === h) route(); else location.hash = h; };

/* ---------- the chat ---------- */
const push = (role, text, cards = []) => { const m = { id: uid("m"), role, text, cards, at: Date.now() }; state.chat.push(m); save(); return m; };
function greet() {
  if (state.chat.length) return;
  push("sr", "Hi! I'm your Showrunner. I plan your marketing, write every post, and tell you what to do each day. First, pick the style I should work in:", [{ type: "style" }]);
}
const showSummary = (s) => { const next = s.assets.filter(a => !a.done && !a.pending).sort((x, y) => x.date.localeCompare(y.date))[0];
  return { name: s.strategy?.name, idea: s.strategy?.idea, start: s.brief.start, end: showEnd(s), done: s.assets.filter(a => a.done).length, total: s.assets.length, next: next ? `${KINDS[next.kind].label} on ${next.date}` : "" }; };
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
  const p = state.profile;
  if (!p.showrunner) p.showrunner = "ogilvy";
  if (!p.what) learnFirst(p, text);
  push("user", text); state.ui.busy = true; if (state.ui.tab !== "chat") go("#/chat"); else render();
  let r;
  try { r = normChat(await ask("chat", { profile: p, messages: state.chat.slice(-14).map(forAI), shows: showsList().slice(0, 5).map(showSummary), today: todayISO() })); }
  catch (e) { if (e?.code !== "offline") toast(errText(e)); r = offlineChat({ profile: p, messages: state.chat }); }
  const cards = [...r.cards];
  const fresh = r.remember.filter(x => !p.memory.some(m => m.text.toLowerCase() === x.toLowerCase()));
  if (fresh.length) { p.memory.push(...fresh.map(text => ({ text, at: Date.now() }))); cards.push({ type: "remembered", items: fresh }); }
  push("sr", r.reply, cards); state.ui.busy = false; render();
}
const cardOf = (d) => state.chat.find(m => m.id === d.m)?.cards?.[+d.c];

/* ---------- actions: every data-act="…" in the views lands here ---------- */
const A = {
  tab: (d) => go("#/" + d.t),
  say: (d) => send(d.t),
  pickstyle(d) {
    const first = !state.profile.showrunner; state.profile.showrunner = d.k; save();
    if (first) push("sr", `${SHOWRUNNERS[d.k].name} style it is. Now tell me about your business: what you sell, and who buys it?`);
    else push("sr", `Switched to ${SHOWRUNNERS[d.k].name} style.`);
    render(); $("#msg")?.focus();
  },
  setstyle(d) { state.profile.showrunner = d.k; save(); render(); toast(`${SHOWRUNNERS[d.k].name} style`); },
  async createplan(d) {
    const c = cardOf(d); if (!c || c.showId) return;
    let first = true;
    const show = await createShow(c, (s) => { c.showId = s.id; if (first) { first = false; go("#/show/" + s.id); } else render(); });
    push("sr", `“${show.strategy.name}” is ready: ${show.assets.length} posts, planned day by day. Your to-dos are in Today.`, [{ type: "open", showId: show.id, name: show.strategy.name }]);
    toast("Your show is ready"); render();
  },
  openshow: (d) => { state.ui.showTab = "posts"; go("#/show/" + d.id); },
  copypost: (d) => { const c = cardOf(d); copyText([c.hook, c.text, c.cta].filter(Boolean).join("\n\n"), "Post copied"); },
  copyprompt: (d) => copyText(cardOf(d).image_prompt, "Prompt copied"),
  openme: () => go("#/me"),
  newshow: () => send("Plan a campaign"),
  toggledone(d) { const { a } = findAsset(d.s, d.a); if (!a) return; a.done = !a.done; a.doneOn = a.done ? todayISO() : ""; save(); render(); },
  openasset: (d) => { state.ui.sheet = { k: "asset", s: d.s, a: d.a }; renderSheet(); },
  sheet: (d) => { state.ui.sheet = { k: d.k }; renderSheet(); },
  closesheet: () => { state.ui.sheet = null; render(); },
  showtab: (d) => { state.ui.showTab = d.t; render(); },
  deleteshow(d, el) {
    if (el.dataset.armed) { delete state.shows[d.id]; save(); toast("Show deleted"); go("#/shows"); return; }
    el.dataset.armed = 1; el.innerHTML = `${IC.trash} Tap again to delete`;
  },
  copyfield: (d) => copyText(findAsset(d.s, d.a).a?.fields[d.f]),
  copyimage: (d) => copyText(findAsset(d.s, d.a).a?.image, "Prompt copied"),
  copyasset: (d) => copyText(copyOf(findAsset(d.s, d.a).a), "Text copied"),
  export(d) {
    const s = state.shows[state.ui.showId]; if (!s) return; const n = fileBase(s);
    ({ md: () => saveFile(n + ".md", showMD(s), "text/markdown"), ics: () => saveFile(n + ".ics", showICS(s), "text/calendar"), csv: () => saveFile(n + ".csv", showCSV(s), "text/csv"), json: () => saveFile(n + ".campaign.json", showJSON(s), "application/json") })[d.k]();
  },
  setplan(d) { state.settings.plan = d.k; save(); renderSheet(); render(); toast("Plan changed (demo, no payment)"); },
  theme(d) { state.settings.theme = d.v; save(); applyTheme(); render(); },
  async nudges() {
    const on = !state.settings.nudges;
    if (on && "Notification" in window && Notification.permission === "default") { try { await Notification.requestPermission(); } catch {} }
    if (on && (!("Notification" in window) || Notification.permission !== "granted")) toast("Reminders will show inside the app.");
    state.settings.nudges = on; save(); render(); if (on) nudge(true);
  },
  forget(d) { state.profile.memory.splice(+d.i, 1); save(); render(); },
  exportall: () => saveFile("webshow-my-data.json", exportAll(), "application/json"),
  reset() { if (state.ui.confirmReset) return resetAll(); state.ui.confirmReset = true; render(); },
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
    if (t.dataset.field) { fit(t); const { a } = findAsset(t.dataset.s, t.dataset.a); if (a) { a.fields[t.dataset.field] = t.value; save(); } }
  });
  document.addEventListener("change", (e) => {
    const t = e.target; if (t.dataset.actChange !== "movedate" || !isISO(t.value)) return;
    const { a } = findAsset(t.dataset.s, t.dataset.a); if (a) { moveAsset(a, t.value); render(); toast("Moved"); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.id === "msg" && e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.target.form.requestSubmit(); }
    if (e.key === "Escape" && state.ui.sheet) A.closesheet();
  });
  window.addEventListener("hashchange", route);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) nudge(); });
  setInterval(() => nudge(), 30 * 60e3);
}

async function start() {
  load(); applyTheme(); greet(); wire(); route();
  await initAI(); render();
  nudge();
}
start();
