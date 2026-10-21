/* A show's own chat: the AI proposes changes, the app checks them, Apply carries them out. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { planSlots, blankProfile } from "../public/shared/model.js";
import { showChatPrompt, normShowChat, TASKS } from "../public/shared/prompts.js";
import { offlineShowChat, offlineAsset, offlineStrategy } from "../public/js/offline.js";
import { applyChange } from "../public/js/campaign.js";
import { addDays } from "../public/shared/util.js";

const profile = { ...blankProfile(), business: "Löyly", what: "Sauna restaurant" };
const brief = { goal: "bookings", channels: ["instagram", "email"], start: "2026-11-02", weeks: 4, budget: 0 };
const mkShow = () => { const st = offlineStrategy(profile, brief); const show = { id: "s1", showrunner: "hormozi", brief: { ...brief }, strategy: st, assets: [] };
  show.assets = planSlots(brief).map(s => ({ ...s, ...offlineAsset(profile, show, s), done: false })); return show; };

test("the show chat prompt lists every post with its id", () => {
  const show = mkShow(); assert.ok(TASKS.showchat);
  const { prompt } = showChatPrompt({ profile, show, messages: [{ role: "user", text: "shorter please" }], today: "2026-11-01" });
  for (const a of show.assets) assert.match(prompt, new RegExp(a.id));
  assert.match(prompt, /YOUR STYLE: Hormozi/); assert.match(prompt, /"change"/);
});
test("proposed changes are checked: unknown ids and bad values are dropped", () => {
  const show = mkShow(); const [a, b] = show.assets;
  const r = normShowChat({ reply: "Sure", cards: [{ type: "change", summary: "x", ops: [{ op: "rewrite", ids: [a.id, "nope"], note: "shorter" }, { op: "move", id: b.id, date: "tomorrow" }, { op: "move", id: b.id, date: "2026-11-20" }, { op: "shift", days: 400 }, { op: "strategy", field: "password", value: "x" }, { op: "strategy", field: "idea", value: "Sauna nights" }, { op: "explode" }] }] }, show);
  const ops = r.cards[0].ops;
  assert.deepEqual(ops.map(o => o.op), ["rewrite", "move", "shift", "strategy"]);
  assert.deepEqual(ops[0].ids, [a.id]); assert.equal(ops[2].days, 30);
});
test("demo mode understands shift and rewrite requests", () => {
  const show = mkShow();
  const shift = offlineShowChat({ show, messages: [{ role: "user", text: "Move everything a week later" }] });
  assert.equal(shift.cards[0].ops[0].op, "shift"); assert.equal(shift.cards[0].ops[0].days, 7);
  const rw = offlineShowChat({ show, messages: [{ role: "user", text: "Make the posts shorter" }] });
  assert.equal(rw.cards[0].ops[0].op, "rewrite"); assert.equal(rw.cards[0].ops[0].ids.length, 3);
});
test("Apply moves dates, changes the idea and marks posts done", async () => {
  const show = mkShow(); const before = show.assets.map(a => a.date); const first = show.assets[0];
  await applyChange(show, [{ op: "shift", days: 7 }, { op: "strategy", field: "idea", value: "Sauna nights" }, { op: "done", ids: [first.id] }]);
  show.assets.forEach((a, i) => assert.equal(a.date, addDays(before[i], 7)));
  assert.equal(show.brief.start, "2026-11-09"); assert.equal(show.strategy.idea, "Sauna nights"); assert.equal(first.done, true);
});
