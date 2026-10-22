/* One Show, two experiences.
   Webshow Play (phone, guided) stores Shows in localStorage "webshow.v1".
   Webshow Pro (desktop studio, canvas) stores Shows in localStorage "wss.local".
   Both live on the same origin, so they can read each other. This module holds the pure,
   tested rules for sharing between them. No DOM here.

   What is genuinely shared:
   - Show identity: a Show keeps ONE id in both experiences. A Play Show opened in Pro gets
     a canvas with the same id; a Pro Show appears in Play with its own id.
   - The Showrunner conversation: one chat per Show id, stored with Play's chats and used by both.
   - The Showrunner style of the Show.
   What is translated once (documented, not live-synced yet):
   - The canvas is built from the Play Show the first time it's opened in Pro. Later edits in one
     experience don't flow into the other's posts/nodes. */
import { KINDS, GOALS, campaignEnd } from "./model.js";

export const PLAY_KEY = "webshow.v1", PRO_KEY = "wss.local";

/* ---------- reading both stores ---------- */
const parse = (s, d) => { try { return s ? JSON.parse(s) : d; } catch { return d; } };
export const readPlay = (ls) => parse(ls.getItem(PLAY_KEY), null);
export const readPro = (ls) => parse(ls.getItem(PRO_KEY), null);

/* Every Show the owner has, from both experiences, once each. */
export function allShows(play, pro) {
  const out = new Map();
  for (const s of Object.values(play?.shows || {})) out.set(s.id, { id: s.id, name: s.strategy?.name || "New show", from: "play", inPro: !!pro?.shows?.[s.id], updatedAt: s.updatedAt || s.createdAt || 0 });
  for (const s of Object.values(pro?.shows || {})) {
    if (s.example) continue;
    const prev = out.get(s.id);
    if (prev) { prev.inPro = true; continue; }
    out.set(s.id, { id: s.id, name: s.name || "Untitled show", from: "pro", inPro: true, updatedAt: s.updatedAt || s.createdAt || 0 });
  }
  return [...out.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

/* ---------- the Showrunner conversation belongs to the Show ---------- */
export const chatForShow = (chats, showId) => Object.values(chats || {}).find(c => c.showId === showId) || null;
export function newShowChat(showId, name, showrunner, now = Date.now()) {
  return { id: "c_" + showId, title: name || "Show", showrunner: showrunner || "ogilvy", showId, messages: [
    { id: "m_" + showId + "_hi", role: "sr", text: `Let's talk about “${name || "this show"}”. Ask me to change the tone, move dates or rework the idea. I'll show you every change before anything happens.`, cards: [], at: now }], createdAt: now, updatedAt: now };
}

/* ---------- Play → Pro: the canvas plan for a Play Show ---------- */
const GOAL_TO_PRO = { bookings: "bookings", leads: "leads", sales: "sell", signups: "leads", event: "event", awareness: "awareness" };
const GOAL_FROM_PRO = { bookings: "bookings", leads: "leads", sell: "sales", launch: "awareness", event: "event", awareness: "awareness" };
const FORMAT_FOR = { bookings: "booking", event: "countdown" };
/* Pro has episode nodes for images, carousels, polls, quizzes, Meta ads and search ads.
   Emails, reels and stories have no node type yet; they're listed as "not on the canvas yet". */
export const KIND_TO_PRO = { ig_post: "image", fb_post: "image", li_post: "image", ig_carousel: "carousel", meta_ad: "metaad", search_ad: "ad" };
const PRO_TO_KIND = { image: "ig_post", carousel: "ig_carousel", poll: "ig_story", quiz: "ig_story", metaad: "meta_ad", ad: "search_ad" };
const HOOKLINE = (a) => String(a.fields?.hook || a.fields?.subject || a.fields?.headlines || a.title || "").split("\n")[0].slice(0, 120);

export function playToPro(s, profile = {}) {
  const st = s.strategy || {}, b = s.brief || {};
  const goal = GOAL_TO_PRO[b.goal] || "leads";
  const eps = [], skipped = [];
  for (const a of s.assets || []) {
    if (a.kind === "landing") continue; /* Pro always has a landing page node */
    const type = KIND_TO_PRO[a.kind];
    if (!type) { skipped.push(KINDS[a.kind]?.label || a.kind); continue; }
    const day = Math.max(0, Math.round((new Date(a.date) - new Date(b.start)) / 864e5));
    eps.push({ lane: a.phase === "always" ? "hook" : a.phase, arc: a.phase === "convert" ? "urgency" : a.phase === "show" ? "proof" : "teaser", type, day, title: (a.title || KINDS[a.kind]?.label || "Episode").slice(0, 40), angle: HOOKLINE(a), channels: [], boost: 0, on: true, from: a.id });
  }
  return {
    show: { id: s.id, name: (st.name || "New show").slice(0, 48), showrunner: s.showrunner || "ogilvy", art: artFor(s), play: { id: s.id, at: Date.now() } },
    dna: { goal, idea: st.idea || "", business: profile.business || st.name || "", offer: st.offer || b.offer || "", audience: st.audience || b.audience || "", cta: st.cta || GOALS[b.goal]?.cta || "", facts: profile.facts || "", start: b.start || "", end: b.start ? campaignEnd(b) : "", budget: +b.budget ? b.budget : "" },
    season: { format: FORMAT_FOR[b.goal] || "launch", eps, strategy: { who: st.audience || "", message: st.message || st.idea || "", whyNow: st.why || st.tagline || "" }, look: null },
    skipped,
  };
}

/* ---------- Pro → the shape the Showrunner (and Play) understands ---------- */
const EP_TYPES = new Set(["image", "carousel", "poll", "quiz", "metaad", "ad"]);
const LANE_X = { kit: 0, hook: 640, show: 1360, convert: 2080 };
export function laneOfX(x = 0) { return x >= LANE_X.convert - 80 ? "convert" : x >= LANE_X.show - 80 ? "show" : x >= LANE_X.hook - 80 ? "hook" : "kit"; }
export function proToSlim(s, nodes = {}) {
  const d = s.dna || {}; const list = Object.values(nodes);
  const eps = list.filter(n => EP_TYPES.has(n.type) && laneOfX(n.x) !== "kit").sort((a, b) => (a.p?.start || "9").localeCompare(b.p?.start || "9"));
  const goal = GOAL_FROM_PRO[d.goal] || "leads";
  const weeks = d.start && d.end ? Math.max(1, Math.round((new Date(d.end) - new Date(d.start)) / 6048e5)) : 4;
  return {
    id: s.id, showrunner: s.showrunner || "ogilvy", from: "pro",
    brief: { goal, offer: d.offer || "", audience: d.audience || "", channels: [], start: d.start || "", weeks, budget: +d.budget || 0 },
    strategy: { name: s.name, idea: d.idea || "", message: d.idea || "", offer: d.offer || "", cta: d.cta || "", audience: d.audience || "", arc: {} },
    assets: eps.map(n => ({ id: n.id, date: n.p?.start || "", kind: PRO_TO_KIND[n.type] || "ig_post", phase: laneOfX(n.x), done: !!(n.p?.posts || []).some(p => p.done), title: n.title || "", fields: { first: n.p?.angle || "" } })),
  };
}

/* ---------- which experience opens ---------- */
/* Desktop (wide, mouse, no touch) → Pro. Phones and tablets → Play. An explicit choice wins. */
export function experienceFor({ width = 0, finePointer = false, hover = false, ipad = false, stored = "", query = "" } = {}) {
  const q = query === "phone" ? "play" : query;
  if (q === "play" || q === "pro") return { choice: q, store: q === "play" ? "play" : "" };
  if (stored === "play" || stored === "phone") return { choice: "play", store: null };
  const desktop = width >= 1024 && finePointer && hover && !ipad;
  return { choice: desktop ? "pro" : "play", store: null };
}

/* ---------- Show artwork: one character per Show, the same in Play and Pro ---------- */
export const ART = { starburst: { bg: "#DCE6FF", ink: "#2a3bb7" }, snowflake: { bg: "#EDDDF9", ink: "#6a3aa6" }, leaf: { bg: "#DEF2E4", ink: "#2c7a48" }, sun: { bg: "#FFF0C8", ink: "#9a6a00" } };
export const ART_KEYS = Object.keys(ART);
const h32 = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const artFor = (show) => ART[show?.art] ? show.art : ART_KEYS[h32(show?.id || show?.name || "") % ART_KEYS.length];
