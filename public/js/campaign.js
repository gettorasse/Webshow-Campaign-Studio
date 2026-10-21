/* Shows (campaigns): create from a plan card, write the posts, rewrite one.
   A show = { id, createdAt, brief, strategy, assets: [asset], showrunner }
   An asset = { id, kind, phase, date, end?, time, order, title, fields, image, goal, action, done, pending } */
import { state, save } from "./store.js";
import { ask, errText } from "./ai.js";
import { normStrategy, normAsset } from "../shared/prompts.js";
import { actionOf, campaignEnd, planSlots } from "../shared/model.js";
import { uid, addDays, todayISO } from "../shared/util.js";
import { offlineAsset, offlineStrategy, GOAL_CHANNELS } from "./offline.js";
import { toast } from "./lib.js";
import { defaultAfter } from "../shared/make.js";

export const showsList = () => Object.values(state.shows).sort((a, b) => b.createdAt - a.createdAt);
export const sortedAssets = (s) => s.assets.slice().sort((x, y) => x.date.localeCompare(y.date) || x.order - y.order);

/* Turn a plan card from the chat into a full show. onChange repaints the screen. */
export async function createShow(plan, onChange, showrunner) {
  const p = { ...state.profile, showrunner: showrunner || state.profile.showrunner };
  const brief = { goal: plan.goal, offer: plan.offer || p.offer, audience: plan.audience || p.audience, channels: plan.channels?.length ? plan.channels : GOAL_CHANNELS[plan.goal] || ["instagram", "email"], start: plan.start || addDays(todayISO(), 1), weeks: plan.weeks || 4, budget: plan.budget || 0, idea: plan.idea };
  brief.after = defaultAfter(brief.goal, p);
  const show = { id: uid("s"), createdAt: Date.now(), showrunner: p.showrunner, brief, strategy: null, assets: [], status: "writing" };
  state.shows[show.id] = show; save(); onChange?.(show);
  try { show.strategy = normStrategy(await ask("strategy", { profile: p, brief }), brief); }
  catch (e) { if (e?.code !== "offline") toast(errText(e)); show.strategy = offlineStrategy(p, brief); }
  if (plan.name && (!show.strategy.name || show.strategy.name === "New campaign")) show.strategy.name = plan.name;
  show.assets = planSlots(brief).map(s => ({ ...s, title: "", fields: {}, image: "", goal: "", done: false, pending: true }));
  save(); onChange?.(show);
  await writeAssets(show, show.assets, "", onChange);
  show.status = "ready"; save(); onChange?.(show);
  return show;
}
/* Write assets in batches of five; anything the AI can't deliver gets an offline draft. */
export async function writeAssets(show, list, note, onChange) {
  list.forEach(a => { a.pending = true; }); onChange?.(show);
  for (let i = 0; i < list.length; i += 5) {
    const batch = list.slice(i, i + 5); let got = [];
    try { got = (await ask("assets", { profile: { ...state.profile, showrunner: show.showrunner }, brief: show.brief, strategy: show.strategy, slots: batch.map(({ id, kind, phase, date }) => ({ id, kind, phase, date })), note }))?.assets || []; }
    catch (e) { if (e?.code !== "offline") toast(errText(e)); }
    for (const a of batch) {
      const x = normAsset(a, got.find(g => g?.id === a.id)) || offlineAsset(state.profile, show, a);
      if (a.look?.headline) delete a.look.headline; /* the new hook becomes the headline on the image */
      Object.assign(a, x, { action: actionOf(a), pending: false });
    }
    save(); onChange?.(show);
  }
}
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
