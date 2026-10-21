/* v3: the idea first, a workload people can keep, honest generation states, progress and outcomes. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { planSlots, PACES, blankProfile, KINDS } from "../public/shared/model.js";
import { conceptPrompt, normConcept, TASKS } from "../public/shared/prompts.js";
import { offlineConcept } from "../public/js/offline.js";
import { state } from "../public/js/store.js";
import { makeConcept, createShowFromConcept, nextMission, checkMilestones, askOutcome, setOutcome, failedOf } from "../public/js/campaign.js";
import { SHOWRUNNERS, SR_FOR_GOAL } from "../public/shared/showrunners.js";

const profile = { ...blankProfile(), business: "Löyly", what: "Sauna restaurant by the sea", offer: "Christmas parties for work teams" };
Object.assign(state.profile, profile);

test("every Showrunner has a plain-language role, and every goal has a default one", () => {
  for (const s of Object.values(SHOWRUNNERS)) assert.match(s.role, /^The /);
  for (const k of ["bookings", "leads", "sales", "signups", "event", "awareness"]) assert.ok(SHOWRUNNERS[SR_FOR_GOAL[k]]);
});
test("the concept prompt asks for one specific idea, protects facts and keeps the owner's words", () => {
  assert.ok(TASKS.concept);
  const { prompt } = conceptPrompt({ profile: { ...profile, showrunner: "hormozi" }, seed: { goal: "bookings", what: "Löyly – sauna", offer: "Pikkujoulupaketti 89 €", avoid: ["Sauna Nights"] }, today: "2026-10-21" });
  assert.match(prompt, /ONE strong campaign concept/); assert.match(prompt, /No discounts, scarcity/); assert.match(prompt, /Pikkujoulupaketti 89 €/); assert.match(prompt, /"Sauna Nights"/); assert.match(prompt, /Finnish in, Finnish out/); assert.match(prompt, /The Closer|Hormozi/);
});
test("concepts are checked: empty ones are rejected, colours and channels validated", () => {
  assert.equal(normConcept({ name: "", idea: "" }, { goal: "bookings" }), null);
  const c = normConcept({ name: "Sauna Before Speeches", idea: "The party starts in the sauna", colors: ["#0f3d3e", "blue"], channels: ["instagram", "myspace"], weeks: 40 }, { goal: "bookings" });
  assert.deepEqual(c.colors, ["#0f3d3e"]); assert.deepEqual(c.channels, ["instagram"]); assert.equal(c.weeks, 6); assert.equal(c.cta, "Book now");
});
test("demo concepts are honest and vary with each new angle", async () => {
  const a = offlineConcept(profile, { goal: "bookings" }); const b = offlineConcept(profile, { goal: "bookings", avoid: [a.name] });
  assert.notEqual(a.name, b.name); assert.doesNotMatch(JSON.stringify(a), /%|guarantee|only \d|last chance/i);
  const { concept } = await makeConcept({ goal: "bookings" }, "hormozi"); assert.equal(concept.source, "demo");
});
test("pace keeps the workload realistic and every phase present", () => {
  const b = { goal: "bookings", channels: ["instagram", "facebook", "email", "website"], start: "2026-11-02", weeks: 4 };
  const light = planSlots({ ...b, pace: "light" }), full = planSlots({ ...b, pace: "full" });
  assert.ok(light.length < full.length);
  for (const ph of ["hook", "show", "convert"]) assert.ok(light.some(s => s.phase === ph), ph);
  const perWeek = new Map(); for (const s of light.filter(s => !KINDS[s.kind].evergreen)) { const w = Math.floor((new Date(s.date) - new Date(b.start)) / 6048e5); perWeek.set(w, (perWeek.get(w) || 0) + 1); }
  for (const n of perWeek.values()) assert.ok(n <= PACES.light.per + 1);
});
test("an approved demo idea becomes a show labelled demo, with a clear next mission and milestones", async () => {
  const { concept } = await makeConcept({ goal: "bookings" }, "hormozi");
  const s = await createShowFromConcept(concept, "light", "hormozi");
  assert.equal(s.source, "demo"); assert.equal(s.status, "ready"); assert.equal(s.strategy.name, concept.name);
  assert.ok(s.assets.every(a => a.source === "demo")); assert.equal(failedOf(s).length, 0);
  assert.equal(nextMission(s).kind, "creative");
  const a = nextMission(s).a; a.hasPhoto = true; assert.deepEqual(checkMilestones(s), ["creative"]);
  a.done = true; a.doneOn = "2026-10-01"; assert.deepEqual(checkMilestones(s), ["posted"]);
  assert.equal(nextMission(s).kind, "post");
  assert.ok(askOutcome().some(x => x.a === a));
  setOutcome(a, true, "2–5"); assert.deepEqual(checkMilestones(s), ["response"]); assert.ok(!askOutcome().some(x => x.a === a));
});
test("with AI connected, a failed answer is never dressed up as a finished campaign", async () => {
  const { initAI } = await import("../public/js/ai.js");
  globalThis.fetch = async (url, o) => ({ json: async () => (!o || o.method !== "POST") ? { ok: true, ai: true } : { ok: false, error: "upstream" } });
  assert.equal(await initAI(), "api");
  await assert.rejects(makeConcept({ goal: "bookings" }, "ogilvy"), (e) => e.code === "upstream");
  const concept = { ...offlineConcept(profile, { goal: "bookings" }), source: "ai" };
  const s = await createShowFromConcept(concept, "light", "ogilvy");
  assert.equal(s.status, "partial"); assert.ok(s.assets.every(a => a.source === "failed" && !Object.keys(a.fields).length));
  assert.equal(nextMission(s).kind, "retry");
});
