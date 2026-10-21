/* Core logic tests:  npm test  (node --test, no dependencies) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJSON, addDays, daysBetween } from "../public/shared/util.js";
import { planSlots, campaignEnd, KINDS, CHANNEL_KEYS, blankProfile } from "../public/shared/model.js";
import { TASKS, normChat, normStrategy, normAsset } from "../public/shared/prompts.js";
import { offlineChat, offlineStrategy, offlineAsset } from "../public/js/offline.js";
import { showICS, showCSV, showJSON, showMD } from "../public/js/export.js";

const brief = { goal: "bookings", channels: ["instagram", "facebook", "email", "website"], start: "2026-11-02", weeks: 4, budget: 300, offer: "Sauna + dinner 89 €" };
const profile = { ...blankProfile(), business: "Löyly", what: "Sauna restaurant", offer: "Sauna + dinner 89 €", showrunner: "hormozi" };

test("parseJSON finds JSON in fences and prose", () => {
  assert.deepEqual(parseJSON('{"a":1}'), { a: 1 });
  assert.deepEqual(parseJSON('```json\n{"a":2}\n```'), { a: 2 });
  assert.deepEqual(parseJSON('Sure! {"a":3} hope that helps'), { a: 3 });
  assert.equal(parseJSON("no json here"), null);
});
test("plan stays inside the campaign and never doubles a channel on one day", () => {
  for (const weeks of [2, 4, 8]) {
    const b = { ...brief, weeks, channels: CHANNEL_KEYS }; const slots = planSlots(b); const end = campaignEnd(b); const seen = new Set();
    assert.ok(slots.length > 5);
    for (const s of slots) {
      assert.ok(KINDS[s.kind], s.kind);
      if (KINDS[s.kind].evergreen) { assert.equal(s.date, addDays(b.start, -2)); continue; }
      assert.ok(s.date >= b.start && s.date <= end, `${s.kind} ${s.date} outside ${b.start}..${end}`);
      const k = KINDS[s.kind].ch + s.date; assert.ok(!seen.has(k), "two posts on one channel on " + s.date); seen.add(k);
    }
  }
  assert.equal(daysBetween("2026-11-02", campaignEnd(brief)), 27);
});
test("every task builds a prompt with the rules, the style and the owner's data", () => {
  const slots = planSlots(brief).slice(0, 3);
  const st = normStrategy({}, brief);
  for (const [task, input] of [["chat", { profile, messages: [{ role: "user", text: "hi" }], shows: [], today: "2026-11-01" }], ["strategy", { profile, brief }], ["assets", { profile, brief, strategy: st, slots }]]) {
    const { prompt, maxTokens } = TASKS[task](input);
    assert.ok(maxTokens > 500); assert.match(prompt, /Never invent facts/); assert.match(prompt, /YOUR STYLE: Hormozi/); assert.match(prompt, /Löyly/); assert.match(prompt, /<owner>/);
  }
});
test("normalisers survive junk and clamp values", () => {
  const c = normChat({ reply: "Hi", cards: [{ type: "plan", name: "X", goal: "nope", weeks: 99, channels: ["instagram", "myspace"] }, { type: "bogus" }, null], remember: ["Price 89 €", ""] });
  assert.equal(c.cards.length, 1); assert.equal(c.cards[0].goal, "leads"); assert.equal(c.cards[0].weeks, 8); assert.deepEqual(c.cards[0].channels, ["instagram"]); assert.deepEqual(c.remember, ["Price 89 €"]);
  assert.equal(normChat(null).reply.length > 0, true);
  const s = normStrategy("garbage", brief); assert.equal(s.cta, "Book now");
  const slot = { id: "a1", kind: "ig_post" };
  assert.equal(normAsset(slot, {}), null);
  const a = normAsset(slot, { title: "T", fields: { caption: "x".repeat(5000), hook: "Hello" }, image_prompt: "photo" });
  assert.equal(a.fields.caption.length <= 1500, true); assert.equal(a.image, "photo");
});
test("demo mode answers every kind of message and writes every post type", () => {
  assert.equal(offlineChat({ profile, messages: [{ role: "user", text: "Plan a campaign" }] }).cards[0].type, "plan");
  assert.equal(offlineChat({ profile, messages: [{ role: "user", text: "What should I post today?" }] }).cards[0].type, "post");
  assert.equal(offlineChat({ profile, messages: [{ role: "user", text: "Give me a tip" }] }).cards[0].type, "tip");
  assert.equal(offlineChat({ profile: { ...profile, what: "" }, messages: [{ role: "user", text: "make a campaign" }] }).cards[0].type, "question");
  const show = { brief, strategy: offlineStrategy(profile, brief) };
  for (const kind of Object.keys(KINDS)) { const x = offlineAsset(profile, show, { kind, phase: "hook", date: brief.start }); assert.ok(normAsset({ kind }, x), kind); }
});
test("exports are well formed", () => {
  const slots = planSlots(brief); const st = offlineStrategy(profile, brief);
  const show = { id: "s1", createdAt: 1, showrunner: "ogilvy", brief, strategy: st, assets: slots.map(s => ({ ...s, ...offlineAsset(profile, { brief, strategy: st }, s), action: "Do it", done: false })) };
  const ics = showICS(show);
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/); assert.match(ics, /END:VCALENDAR\r\n?$/);
  for (const line of ics.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, "ICS line too long: " + line.slice(0, 40));
  assert.equal(showCSV(show).split("\r\n").length, slots.length + 1);
  const j = JSON.parse(showJSON(show)); assert.equal(j.format, "webshow.campaign"); assert.equal(j.assets.length, slots.length); assert.ok(!("pending" in j.assets[0]));
  assert.match(showMD(show), /^# /);
});
test("the word 'free' appears only as the Starter price", async () => {
  const { readdirSync, readFileSync, statSync } = await import("node:fs"); const { join } = await import("node:path");
  const walk = (d) => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? (f === "pro" ? [] : walk(p)) : [p]; });
  for (const f of walk("public")) if (/\.(js|html|css|json)$/.test(f) && !f.endsWith("plans.js")) assert.doesNotMatch(readFileSync(f, "utf8"), /\bfree\b/i, f);
});
