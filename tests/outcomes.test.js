/* Outcome summaries are intentionally factual and never claim attributed sales. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeOutcomes, outcomesContext } from "../public/shared/outcomes.js";
import { chatPrompt, showChatPrompt, conceptPrompt } from "../public/shared/prompts.js";
import { blankProfile } from "../public/shared/model.js";

const show = {
  id: "show_one",
  showrunner: "ogilvy",
  brief: { goal: "bookings", start: "2026-11-01", weeks: 2, channels: ["instagram"] },
  strategy: { name: "Autumn Sauna", idea: "The evening ritual", cta: "Book now", arc: {} },
  assets: [
    { id: "a1", kind: "ig_post", done: true, outcome: { got: true, count: "2–5" }, date: "2026-11-01", phase: "hook", title: "First post", fields: {} },
    { id: "a2", kind: "ig_story", done: true, outcome: { got: false }, date: "2026-11-03", phase: "hook", title: "Second post", fields: {} },
    { id: "a3", kind: "ig_post", done: true, outcome: { got: false, skipped: true }, date: "2026-11-05", phase: "show", title: "Third post", fields: {} },
    { id: "a4", kind: "ig_reel", done: false, date: "2026-11-06", phase: "convert", title: "Future video", fields: {} },
    { id: "a5", kind: "landing", done: true, date: "2026-10-30", phase: "always", title: "Landing page", fields: {} },
  ]
};

test("campaign outcome summaries count only published social posts, exclude skipped feedback", () => {
  assert.deepEqual(summarizeOutcomes(show), {
    total: 4, published: 3, reviewed: 2, positive: 1,
    without: 1, unreviewed: 1, complete: false, reported: true
  });
});
test("results never add uncertain ranges as precise leads or claim attribution", () => {
  const line = outcomesContext(show);
  assert.match(line, /1 with reported replies/);
  assert.match(line, /Owner-reported feedback/);
  assert.doesNotMatch(line, /sales achieved|5 bookings|total leads/);
});
test("unfinished or unchecked campaigns are described cautiously", () => {
  assert.match(outcomesContext({ assets: [] }), /No published posts/);
  assert.match(outcomesContext({ assets: [{ kind: "ig_post", done: true }] }), /no results reported/);
});
test("Showrunner chat can see owner feedback and is warned about causal claims", () => {
  const profile = { ...blankProfile(), business: "Löyly", what: "Sauna" };
  const summary = outcomesContext(show);
  const chat = chatPrompt({ profile, messages: [], shows: [{name:"Autumn Sauna",idea:"The evening ritual",start:"2026-11-01",end:"2026-11-14",done:3,total:4,outcomes:summary}],today:"2026-11-11" }).prompt;
  assert.match(chat, /Owner-reported feedback/);
  assert.match(chat, /NOT verified sales/);
  const showChat = showChatPrompt({ profile, show, messages: [], today:"2026-11-11" }).prompt;
  assert.match(showChat, /owner reported responses/);
  assert.match(showChat, /owner-reported/);
  const concept = conceptPrompt({ profile, seed:{ goal:"bookings",note:summary },today:"2026-11-11" }).prompt;
  assert.match(concept, /self-reported|reported replies|reported replies/i);
});
