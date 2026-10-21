/* All app state, saved to this device. One object, one save function.
   Shape is documented in docs/ARCHITECTURE.md. Bump VERSION when it changes. */
import { lsGet, lsSet } from "./lib.js";
import { blankProfile } from "../shared/model.js";

const KEY = "webshow.v1"; const VERSION = 1;
export const state = {
  profile: blankProfile(),
  chat: [],            // [{ id, role: "user" | "sr", text, cards: [], at }]
  shows: {},           // id → show (see campaign.js)
  settings: { theme: "", nudges: false, lastNudge: "", plan: "starter" },
  ui: { tab: "chat", showId: null, showTab: "posts", sheet: null, busy: false, fresh: null },
};
export function load() {
  const d = lsGet(KEY, null); if (!d || d.version !== VERSION) return;
  Object.assign(state.profile, d.profile || {}); state.chat = d.chat || []; state.shows = d.shows || {}; Object.assign(state.settings, d.settings || {});
  Object.values(state.shows).forEach(s => s.assets?.forEach(a => { a.pending = false; }));
}
let t = 0;
export function save() { clearTimeout(t); t = setTimeout(() => { if (!lsSet(KEY, { version: VERSION, profile: state.profile, chat: state.chat.slice(-200), shows: state.shows, settings: state.settings })) console.warn("Could not save"); }, 300); }
export function resetAll() { lsSet(KEY, null); location.reload(); }
export const exportAll = () => JSON.stringify({ format: "webshow.account", version: VERSION, profile: state.profile, shows: state.shows, chat: state.chat }, null, 2);
