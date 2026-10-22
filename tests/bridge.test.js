/* One Show, two experiences: routing, shared identity, the Show's own conversation, translations. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { experienceFor, allShows, chatForShow, newShowChat, playToPro, proToSlim, laneOfX, KIND_TO_PRO } from "../public/shared/bridge.js";
import { planSlots, blankProfile } from "../public/shared/model.js";
import { offlineAsset, offlineStrategy } from "../public/js/offline.js";

/* run the real redirect script from index.html in a sandbox */
function runIndexScript({ width, fine, touch = 0, platform = "Win32", search = "", stored = null, hash = "" }) {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  const code = html.match(/<script id="desktop-to-pro">([\s\S]*?)<\/script>/)[1];
  const store = new Map(stored ? [["webshow.view", stored]] : []); let replaced = null;
  const ctx = { URLSearchParams, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
    navigator: { platform, maxTouchPoints: touch }, matchMedia: () => ({ matches: width >= 1024 && fine }),
    location: { search, hash, replace: (u) => { replaced = u; } }, document: { documentElement: { dataset: {} } } };
  vm.runInNewContext(code, ctx); return { replaced, stored: store.get("webshow.view") ?? null };
}
test("desktop opens Webshow Pro with no plan check; phones and tablets open Play", () => {
  assert.equal(runIndexScript({ width: 1440, fine: true }).replaced, "pro/");
  assert.equal(runIndexScript({ width: 390, fine: false, touch: 5 }).replaced, null);
  assert.equal(runIndexScript({ width: 1180, fine: true, touch: 5, platform: "MacIntel" }).replaced, null, "iPad stays in Play");
});
test("the explicit switch wins and is remembered; ?view=pro undoes it; old ?view=phone still works", () => {
  const a = runIndexScript({ width: 1440, fine: true, search: "?view=play" }); assert.equal(a.replaced, null); assert.equal(a.stored, "play");
  assert.equal(runIndexScript({ width: 1440, fine: true, stored: "play" }).replaced, null);
  const b = runIndexScript({ width: 1440, fine: true, search: "?view=pro", stored: "play" }); assert.equal(b.replaced, "pro/"); assert.equal(b.stored, null);
  assert.equal(runIndexScript({ width: 1440, fine: true, search: "?view=phone" }).stored, "play");
  assert.equal(runIndexScript({ width: 1440, fine: true, hash: "#/show/s_abc" }).replaced, "pro/#show=s_abc", "a Show link opens that Show in Pro");
});
test("the inline script and experienceFor() agree", () => {
  const cases = [[1440, true, 0, "", ""], [390, false, 5, "", ""], [1440, true, 0, "?view=play", ""], [1440, true, 0, "", "play"], [800, true, 0, "", ""], [1440, true, 0, "?view=pro", "play"]];
  for (const [w, fine, touch, search, stored] of cases) {
    const inline = runIndexScript({ width: w, fine, touch, search, stored: stored || null }).replaced ? "pro" : "play";
    const shared = experienceFor({ width: w, finePointer: fine, hover: fine, ipad: false, stored, query: new URLSearchParams(search).get("view") || "" }).choice;
    assert.equal(inline, shared, JSON.stringify({ w, fine, search, stored }));
  }
});

const profile = { ...blankProfile(), business: "Löyly", what: "Sauna" };
const brief = { goal: "bookings", channels: ["instagram", "facebook", "email", "website", "google"], start: "2026-11-02", weeks: 4, budget: 300 };
const playShow = () => { const st = offlineStrategy(profile, brief); const s = { id: "s_play1", createdAt: 2, showrunner: "hormozi", brief, strategy: st, assets: [] }; s.assets = planSlots(brief).map(x => ({ ...x, ...offlineAsset(profile, s, x) })); return s; };

test("every Show appears once across both experiences, with where it lives", () => {
  const play = { shows: { s_play1: { id: "s_play1", createdAt: 5, strategy: { name: "Sauna Nights" } }, s_both: { id: "s_both", createdAt: 3, strategy: { name: "Both" } } } };
  const pro = { shows: { show_x: { id: "show_x", name: "Canvas Show", updatedAt: 9 }, s_both: { id: "s_both", name: "Both" }, example: { id: "example", example: true } } };
  const all = allShows(play, pro);
  assert.deepEqual(all.map(s => s.id), ["show_x", "s_play1", "s_both"]);
  assert.equal(all.find(s => s.id === "s_both").inPro, true); assert.equal(all.find(s => s.id === "s_play1").inPro, false); assert.equal(all.find(s => s.id === "show_x").from, "pro");
});
test("each Show owns exactly one Showrunner conversation", () => {
  const chats = { c1: { id: "c1", showId: null }, c2: { id: "c2", showId: "s_a" } };
  assert.equal(chatForShow(chats, "s_a").id, "c2"); assert.equal(chatForShow(chats, "s_b"), null);
  const c = newShowChat("s_b", "Sauna Nights", "vaynerchuk", 1);
  assert.equal(c.showId, "s_b"); assert.equal(c.showrunner, "vaynerchuk"); assert.equal(c.id, "c_s_b"); assert.match(c.messages[0].text, /Sauna Nights/);
});
test("a Play Show becomes a Pro canvas plan with the SAME id, Showrunner and idea", () => {
  const s = playShow(); const t = playToPro(s, profile);
  assert.equal(t.show.id, s.id); assert.equal(t.show.showrunner, "hormozi"); assert.equal(t.dna.goal, "bookings"); assert.equal(t.dna.idea, s.strategy.idea); assert.equal(t.dna.start, "2026-11-02");
  assert.ok(t.season.eps.length > 0);
  for (const e of t.season.eps) { assert.ok(Object.values(KIND_TO_PRO).includes(e.type)); assert.ok(["hook", "show", "convert"].includes(e.lane)); assert.ok(e.day >= 0); }
  assert.ok(t.skipped.includes("Email"), "what Pro can't hold yet is reported, not dropped silently");
});
test("a Pro Show reads back in the shape the Showrunner understands", () => {
  const show = { id: "show_x", name: "Canvas Show", showrunner: "ogilvy", dna: { goal: "sell", idea: "Mugs that last", start: "2026-11-02", end: "2026-11-29", offer: "Gift sets" } };
  const nodes = { a: { id: "a", type: "image", x: 640, title: "Teaser", p: { start: "2026-11-03", angle: "Meet the mug" } }, b: { id: "b", type: "carousel", x: 2080, title: "Last call", p: { start: "2026-11-25", posts: [{ done: true }] } }, k: { id: "k", type: "image", x: 0, title: "Hero visual", p: {} }, pg: { id: "pg", type: "page", x: 2080, p: {} } };
  const slim = proToSlim(show, nodes);
  assert.equal(slim.brief.goal, "sales"); assert.equal(slim.strategy.idea, "Mugs that last"); assert.equal(slim.assets.length, 2, "kit images and pages aren't episodes");
  assert.deepEqual(slim.assets.map(a => [a.phase, a.kind, a.done]), [["hook", "ig_post", false], ["convert", "ig_carousel", true]]);
  assert.equal(laneOfX(1360), "show");
});

test("a Pro episode keeps its phase wherever it sits on the canvas", async () => {
  const { proToSlim } = await import("../public/shared/bridge.js");
  const s = { id: "p1", name: "Free placement", dna: { goal: "leads", start: "2026-11-01", end: "2026-11-28" } };
  const nodes = { a: { id: "a", type: "image", x: 0, lane: "show", p: { start: "2026-11-05" } }, b: { id: "b", type: "carousel", x: 2400, lane: "hook", p: { start: "2026-11-02" } }, c: { id: "c", type: "image", x: 900, lane: "kit", p: {} }, d: { id: "d", type: "carousel", x: 700, p: { start: "2026-11-03" } } };
  const slim = proToSlim(s, nodes); const ph = Object.fromEntries(slim.assets.map(a => [a.id, a.phase]));
  assert.equal(ph.a, "show"); assert.equal(ph.b, "hook"); assert.equal(ph.c, undefined, "a shared visual is not an episode"); assert.equal(ph.d, "hook", "older nodes fall back to where they sit");
});
