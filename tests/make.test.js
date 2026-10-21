/* The ChatGPT prompts: every post type gets complete prompts, and they follow the settings. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { KINDS, planSlots, blankProfile } from "../public/shared/model.js";
import { buildPrompts, defaultAfter, landingPrompt, chatPostPrompt, VISUAL_KINDS } from "../public/shared/make.js";
import { offlineAsset, offlineStrategy } from "../public/js/offline.js";

const profile = { ...blankProfile(), business: "Löyly", what: "Sauna restaurant by the sea", email: "hei@loyly.fi", phone: "+358 40 123 4567", website: "https://loyly.fi" };
const brief = { goal: "bookings", channels: ["instagram", "facebook", "email", "website", "google", "tiktok", "linkedin"], start: "2026-11-02", weeks: 4, budget: 300 };
const show = { brief: { ...brief, after: defaultAfter("bookings", profile) }, strategy: offlineStrategy(profile, brief) };
const assetOf = (kind) => ({ id: "a_" + kind, kind, phase: "hook", date: brief.start, ...offlineAsset(profile, show, { kind, phase: "hook", date: brief.start }) });

test("every post type gets at least one complete prompt", () => {
  for (const kind of Object.keys(KINDS)) {
    for (const photo of ["own", "make"]) {
      const a = { ...assetOf(kind), look: { photo } }; const ps = buildPrompts(a, show, profile);
      assert.ok(ps.length >= 1, kind);
      for (const p of ps) {
        assert.ok(p.text.length > 200, `${kind}: ${p.label} too short`);
        assert.doesNotMatch(p.text, /undefined|null|\[object/, `${kind}: ${p.label}`);
        assert.ok(p.label && p.hint, kind);
      }
      if (VISUAL_KINDS.includes(kind)) assert.ok(ps.some(p => /× \d+ px/.test(p.text)), kind + " has an image prompt with a size");
    }
  }
});
test("image prompts follow the text settings and the photo choice", () => {
  const a = { ...assetOf("ig_post"), look: { headline: "Sauna, sea, dinner.", sub: "Book by 15.12.", pos: "top", font: "serif", color: "#ffd84d", bg: "band", size: "s" } };
  const t = buildPrompts(a, show, profile)[0].text;
  assert.match(t, /1080 × 1350/); assert.match(t, /"Sauna, sea, dinner\."/); assert.match(t, /"Book by 15\.12\."/);
  assert.match(t, /top third/); assert.match(t, /elegant serif/); assert.match(t, /#ffd84d/); assert.match(t, /colour band/); assert.match(t, /photo I've attached/);
  const t2 = buildPrompts({ ...a, look: { ...a.look, photo: "make" } }, show, profile)[0].text; assert.match(t2, /Create a realistic photo/);
  const story = buildPrompts(assetOf("ig_story"), show, profile)[0].text; assert.match(story, /1080 × 1920/); assert.match(story, /top 14%/);
});
test("the landing page prompt builds the whole page and what happens after the button", () => {
  const a = assetOf("landing");
  const form = landingPrompt(a, show, profile); assert.match(form, /ONE HTML file/); assert.match(form, /formsubmit\.co\/hei@loyly\.fi/); assert.match(form, /Preferred date/); assert.match(form, /We'll confirm your booking/); assert.match(form, /sticky/);
  const link = landingPrompt(a, { ...show, brief: { ...show.brief, after: { type: "link", url: "https://loyly.fi/book" } } }, profile); assert.match(link, /https:\/\/loyly\.fi\/book/); assert.doesNotMatch(link, /formsubmit/);
  const call = landingPrompt(a, { ...show, brief: { ...show.brief, after: { type: "call", phone: "+358 40 123 4567" } } }, profile); assert.match(call, /tel: link/);
});
test("chat post cards get an image prompt too", () => {
  const t = chatPostPrompt({ channel: "instagram", hook: "Sauna season is here", text: "x", image_prompt: "Sauna by the sea at dusk" }, profile);
  assert.match(t, /"Sauna season is here"/); assert.match(t, /1080 × 1350/);
});
