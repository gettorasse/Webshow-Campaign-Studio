/* All app state, saved to this device. One object, one save function.
   Shape is documented in docs/ARCHITECTURE.md. Bump VERSION when it changes. */
import { lsGet, lsSet } from "./lib.js";
import { blankProfile } from "../shared/model.js";

const KEY = "webshow.v1"; const VERSION = 2;
export const state = {
  profile: blankProfile(),
  chats: {},           // id → { id, title, showrunner, showId?, messages: [{ id, role: "user"|"sr", text, cards, at }], createdAt, updatedAt }
  shows: {},           // id → show (see campaign.js)
  settings: { theme: "", nudges: false, lastNudge: "", plan: "starter" },
  ui: { tab: "chat", chatId: null, showId: null, showTab: "posts", sheet: null, busy: false, fresh: null, drawer: false },
};
export function load() {
  const d = lsGet(KEY, null); if (!d || !d.version) return;
  Object.assign(state.profile, d.profile || {}); state.shows = d.shows || {}; Object.assign(state.settings, d.settings || {});
  state.chats = d.chats || {};
  /* version 1 had one long chat: keep it as the first chat */
  if (d.version === 1 && d.chat?.length) { const id = "c_first"; state.chats[id] = { id, title: "First chat", showrunner: state.profile.showrunner || "ogilvy", messages: d.chat.filter(m => !m.cards?.some(c => c.type === "style")), createdAt: d.chat[0]?.at || Date.now(), updatedAt: d.chat.at(-1)?.at || Date.now() }; }
  Object.values(state.shows).forEach(s => s.assets?.forEach(a => { a.pending = false; }));
}
let t = 0;
export function save() {
  clearTimeout(t);
  t = setTimeout(() => {
    const chats = Object.fromEntries(Object.entries(state.chats).filter(([, c]) => c.messages.length).map(([k, c]) => [k, { ...c, messages: c.messages.slice(-200) }]));
    if (!lsSet(KEY, { version: VERSION, profile: state.profile, chats, shows: state.shows, settings: state.settings })) console.warn("Could not save");
  }, 300);
}
export function resetAll() { lsSet(KEY, null); location.reload(); }
export const exportAll = () => JSON.stringify({ format: "webshow.account", version: VERSION, profile: state.profile, shows: state.shows, chats: state.chats }, null, 2);

/* Chats: general ones (pick a Showrunner first), and one per show. */
export const chatsList = () => Object.values(state.chats).filter(c => !c.showId && c.messages.length).sort((a, b) => b.updatedAt - a.updatedAt);
export const showChatOf = (showId) => Object.values(state.chats).find(c => c.showId === showId);
export const hasPro = () => ["premium", "enterprise"].includes(state.settings.plan);
