/* The Show Timeline: readable weeks, honest temporal types, phases from the plan, shared artwork. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { planSlots, blankProfile } from "../public/shared/model.js";
import { offlineAsset, offlineStrategy } from "../public/js/offline.js";
import { mondayOf, phaseRanges, phaseOn, weekTimeline } from "../public/js/views/timeline.js";
import { artFor, ART_KEYS, playToPro } from "../public/shared/bridge.js";

const profile = { ...blankProfile(), business: "Löyly" };
const brief = { goal: "bookings", channels: ["instagram", "facebook", "email", "website"], start: "2026-11-04", weeks: 4, budget: 0 };
const mk = () => { const st = offlineStrategy(profile, brief); const s = { id: "s_tl", showrunner: "ogilvy", brief, strategy: st, assets: [] }; s.assets = planSlots(brief).map(x => ({ ...x, ...offlineAsset(profile, s, x), source: "demo" })); return s; };

test("weeks start on Monday", () => { assert.equal(mondayOf("2026-11-04"), "2026-11-02"); assert.equal(mondayOf("2026-11-02"), "2026-11-02"); assert.equal(mondayOf("2026-11-08"), "2026-11-02"); });
test("phase bands follow the posts and cover the whole Show in order", () => {
  const s = mk(); const r = phaseRanges(s);
  assert.deepEqual(r.map(x => x[0]), ["hook", "show", "convert"]); assert.equal(r[0][1], brief.start);
  for (let i = 1; i < 3; i++) assert.ok(r[i][1] > r[i - 1][2] || r[i][1] === r[i - 1][2] || r[i][1] > r[i - 1][1]);
  for (const a of s.assets.filter(a => a.kind !== "landing")) assert.equal(phaseOn(r, a.date), a.phase, `${a.kind} ${a.date}`);
});
test("one week shows events on their day, intervals across days, evergreen as always on", () => {
  const s = mk(); const ad = s.assets.find(a => a.kind === "meta_ad"); const wk = mondayOf(ad.date);
  const html = weekTimeline(s, { week: wk });
  assert.match(html, /wt-el interval/, "the ad runs over several days");
  assert.match(html, /wt-el evergreen[^>]*grid-column:1 \/ 8/, "the landing page is always on, no invented dates");
  const ev = s.assets.filter(a => !a.end && a.kind !== "landing" && a.date >= wk && a.date <= "2026-11-08");
  assert.equal((html.match(/wt-el event/g) || []).length, ev.length);
  assert.match(html, /Week 1 of 5/); assert.doesNotMatch(html, /Google Ads/, "only channels this Show uses");
});
test("a Show keeps its character across Play and Pro", () => {
  const s = mk(); s.art = "leaf"; assert.equal(artFor(s), "leaf"); assert.equal(playToPro(s, profile).show.art, "leaf");
  assert.ok(ART_KEYS.includes(artFor({ id: "anything" }))); assert.equal(artFor({ id: "x1" }), artFor({ id: "x1" }));
});
