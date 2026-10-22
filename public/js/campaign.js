/* Shows (campaigns): the big idea first, then the posts, then progress.
   A show = { id, createdAt, showrunner, source: "ai"|"demo", status: "writing"|"ready"|"partial",
              brief, strategy (the approved concept), assets: [asset], milestones: { key: time } }
   An asset = { id, kind, phase, date, end?, time, order, title, fields, image, goal, action,
                source: "ai"|"demo"|"failed", done, doneOn, outcome?, look?, hasPhoto?, pending } */
import { state, save } from "./store.js";
import { ask, errText, aiMode } from "./ai.js";
import { normStrategy, normAsset, normConcept } from "../shared/prompts.js";
import { actionOf, campaignEnd, planSlots, GOALS } from "../shared/model.js";
import { uid, addDays, todayISO, daysBetween } from "../shared/util.js";
import { offlineAsset, offlineStrategy, offlineConcept, GOAL_CHANNELS } from "./offline.js";
import { toast } from "./lib.js";
import { defaultAfter } from "../shared/make.js";
import { artFor, ART_KEYS } from "../shared/bridge.js";
/* Each new Show gets a character the owner's other Shows don't use yet, so they're easy to tell apart */
function freshArt(name) { const used = new Set(Object.values(state.shows).map(s => artFor(s))); return ART_KEYS.find(k => !used.has(k)) || artFor({ name }); }

export const showsList = () => Object.values(state.shows).sort((a, b) => b.createdAt - a.createdAt);
export const sortedAssets = (s) => s.assets.slice().sort((x, y) => x.date.localeCompare(y.date) || x.order - y.order);

/* ---------- 1. the idea ---------- */
/* Returns { concept, source }. A real AI error is thrown, never hidden behind a demo idea. */
export async function makeConcept(seed, showrunner) {
  const profile = { ...state.profile, showrunner };
  if (aiMode() === "offline") return { concept: { ...offlineConcept(profile, seed), source: "demo" } };
  const c = normConcept(await ask("concept", { profile, seed, today: todayISO() }), seed);
  if (!c) throw { code: "invalid_json" };
  return { concept: { ...c, source: "ai" } };
}

/* ---------- 2. the show, from an approved idea ---------- */
export async function createShowFromConcept(c, pace, showrunner, onChange) {
  const p = state.profile;
  const brief = { goal: c.goal, offer: c.offer || p.offer, audience: c.audience || p.audience, channels: c.channels?.length ? c.channels : GOAL_CHANNELS[c.goal] || ["instagram", "email"], start: addDays(todayISO(), 1), weeks: c.weeks || 4, budget: 0, idea: c.idea, pace: pace || "light" };
  brief.after = defaultAfter(brief.goal, p);
  const strategy = { name: c.name, idea: c.idea, tagline: c.why, audience: c.audience, insight: c.insight, message: c.message, offer: c.offer, cta: c.cta || GOALS[c.goal]?.cta, arc: c.arc, voice: c.voice, visual: c.visual, offerIdeas: [], hook: c.hook, why: c.why, colors: c.colors };
  const show = { id: uid("s"), createdAt: Date.now(), showrunner, source: c.source || "ai", status: "writing", brief, strategy, assets: [], milestones: { idea: Date.now() }, art: freshArt(c.name) };
  show.assets = planSlots(brief).map(s => ({ ...s, title: "", fields: {}, image: "", goal: "", done: false, pending: true }));
  state.shows[show.id] = show; save(); onChange?.(show);
  await writeAssets(show, show.assets, "", onChange);
  return show;
}

/* Older path, kept for plan cards that already exist in chats. */
export async function createShow(plan, onChange, showrunner) {
  const p = { ...state.profile, showrunner: showrunner || state.profile.showrunner };
  const brief = { goal: plan.goal, offer: plan.offer || p.offer, audience: plan.audience || p.audience, channels: plan.channels?.length ? plan.channels : GOAL_CHANNELS[plan.goal] || ["instagram", "email"], start: plan.start || addDays(todayISO(), 1), weeks: plan.weeks || 4, budget: plan.budget || 0, idea: plan.idea, pace: plan.pace || "steady" };
  brief.after = defaultAfter(brief.goal, p);
  const show = { id: uid("s"), createdAt: Date.now(), showrunner: p.showrunner, source: aiMode() === "offline" ? "demo" : "ai", brief, strategy: null, assets: [], status: "writing", milestones: { idea: Date.now() } };
  state.shows[show.id] = show; save(); onChange?.(show);
  try { show.strategy = normStrategy(await ask("strategy", { profile: p, brief }), brief); }
  catch (e) { if (e?.code !== "offline") toast(errText(e)); show.strategy = offlineStrategy(p, brief); if (e?.code !== "offline") show.strategySource = "demo"; }
  if (plan.name && (!show.strategy.name || show.strategy.name === "New campaign")) show.strategy.name = plan.name;
  show.assets = planSlots(brief).map(s => ({ ...s, title: "", fields: {}, image: "", goal: "", done: false, pending: true }));
  save(); onChange?.(show);
  await writeAssets(show, show.assets, "", onChange);
  return show;
}

/* ---------- writing posts, honestly ----------
   No AI connected → a demo draft, labelled "demo".
   AI connected but it failed → "failed", empty, with Try again. Never a fake success. */
export async function writeAssets(show, list, note, onChange) {
  show.status = "writing"; list.forEach(a => { a.pending = true; }); onChange?.(show);
  const offline = aiMode() === "offline"; let errShown = false;
  for (let i = 0; i < list.length; i += 5) {
    const batch = list.slice(i, i + 5); let got = []; let failed = false;
    if (!offline) {
      try { got = (await ask("assets", { profile: { ...state.profile, showrunner: show.showrunner }, brief: show.brief, strategy: show.strategy, slots: batch.map(({ id, kind, phase, date }) => ({ id, kind, phase, date })), note }))?.assets || []; }
      catch (e) { failed = true; if (!errShown) { toast(errText(e)); errShown = true; } }
    }
    for (const a of batch) {
      if (a.look?.headline) delete a.look.headline; /* the new hook becomes the headline on the image */
      const x = offline ? offlineAsset(state.profile, show, a) : failed ? null : normAsset(a, got.find(g => g?.id === a.id));
      if (x) Object.assign(a, x, { source: offline ? "demo" : "ai", action: actionOf(a), pending: false });
      else Object.assign(a, { source: "failed", pending: false, action: actionOf(a), title: a.title || "" });
    }
    save(); onChange?.(show);
  }
  show.status = show.assets.some(a => a.source === "failed") ? "partial" : "ready"; save(); onChange?.(show);
}
export const failedOf = (s) => s.assets.filter(a => a.source === "failed");
export const retryFailed = (show, onChange) => writeAssets(show, failedOf(show), "", onChange);
export const rewriteAsset = (show, a, note, onChange) => writeAssets(show, [a], note || "Write a fresh, different take on this post. Keep the big idea.", onChange);
export function moveAsset(a, iso) { const d = (new Date(iso) - new Date(a.date)) / 864e5; a.date = iso; if (a.end) a.end = addDays(a.end, Math.round(d)); a.action = actionOf(a); save(); }
export const showEnd = (s) => campaignEnd(s.brief);

/* Changes proposed in a show's chat, applied when the owner taps Apply. */
export async function applyChange(show, ops, onChange) {
  const byId = (id) => show.assets.find(a => a.id === id);
  for (const o of ops) {
    if (o.op === "move") { const a = byId(o.id); if (a) moveAsset(a, o.date); }
    if (o.op === "shift") { if (!show.assets.some(a => a.done)) show.brief.start = addDays(show.brief.start, o.days); show.assets.filter(a => !a.done).forEach(a => moveAsset(a, addDays(a.date, o.days))); }
    if (o.op === "strategy" && show.strategy) show.strategy[o.field] = o.value;
    if (o.op === "done") o.ids.forEach(id => { const a = byId(id); if (a) { a.done = true; a.doneOn = todayISO(); } });
  }
  save(); onChange?.(show);
  for (const o of ops) if (o.op === "rewrite") await writeAssets(show, o.ids.map(byId).filter(Boolean), o.note, onChange);
}

/* ---------- 3. progress: missions, milestones, outcomes ---------- */
/* The one thing to do next: a failed post to retry, then the first creative, then the next post due. */
export function nextMission(s) {
  if (s.status === "writing") return { kind: "writing" };
  if (failedOf(s).length) return { kind: "retry", n: failedOf(s).length };
  const open = sortedAssets(s).filter(a => !a.done && !a.pending);
  if (!open.length) return { kind: "finished" };
  const visual = open.find(a => !KINDS_EVERGREEN(a) && !a.hasPhoto && a.fields && Object.keys(a.fields).length);
  if (!s.milestones?.creative && visual) return { kind: "creative", a: visual };
  return { kind: "post", a: open[0] };
}
const KINDS_EVERGREEN = (a) => a.kind === "landing" || a.kind === "search_ad";
export const MILESTONES = [
  ["idea", "Idea approved", "The hardest part of marketing is deciding. Done."],
  ["creative", "First creative made", "Your first post exists. That's further than most get."],
  ["posted", "First post out", "You're on air."],
  ["live", "Hook posted", "People are starting to notice. Now show them what it's like."],
  ["response", "First real response", "Someone answered. That's what all this is for."],
];
/* Marks milestones reached since last time; returns the newly reached ones. */
export function checkMilestones(s) {
  const m = s.milestones ||= {}; const fresh = [];
  const hit = (k, ok) => { if (ok && !m[k]) { m[k] = Date.now(); fresh.push(k); } };
  hit("idea", true);
  hit("creative", s.assets.some(a => a.hasPhoto || a.imageSaved || a.gptImage));
  hit("posted", s.assets.some(a => a.done && !KINDS_EVERGREEN(a)));
  hit("live", s.assets.filter(a => a.phase === "hook").length > 0 && s.assets.filter(a => a.phase === "hook").every(a => a.done));
  hit("response", s.assets.some(a => a.outcome?.got));
  if (fresh.length) save();
  return fresh;
}
/* Posts that went out at least a day ago and haven't been asked about yet. */
export const askOutcome = () => showsList().flatMap(s => s.assets.filter(a => a.done && !a.outcome && !KINDS_EVERGREEN(a) && a.doneOn && daysBetween(a.doneOn, todayISO()) >= 1).map(a => ({ s, a })));
export function setOutcome(a, got, count) { a.outcome = { got, count: count || "", at: todayISO() }; save(); }
