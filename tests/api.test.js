/* The AI endpoint, with the Anthropic API mocked. */
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.ANTHROPIC_API_KEY = "test-key";
const { default: handler } = await import("../api/showrunner.js");
const call = (method, body, ip = "1.1.1.1") => new Promise((done) => {
  const res = { code: 0, status(c) { this.code = c; return this; }, json(o) { done({ code: this.code, body: o }); } };
  handler({ method, body, headers: { "x-forwarded-for": ip }, socket: {} }, res);
});
const reply = (text, status = 200) => async (url, opts) => { reply.last = { url, opts: JSON.parse(opts.body), headers: opts.headers }; return { ok: status === 200, status, json: async () => ({ content: [{ type: "text", text }] }), text: async () => text }; };

test("GET tells the app whether AI is on", async () => { const r = await call("GET"); assert.equal(r.body.ai, true); });
test("POST builds the prompt on the server and returns parsed JSON", async () => {
  globalThis.fetch = reply('```json\n{"reply":"Hei!","cards":[],"remember":[]}\n```');
  const r = await call("POST", { task: "chat", input: { profile: { business: "Löyly", showrunner: "ogilvy" }, messages: [{ role: "user", text: "moi" }], shows: [], today: "2026-11-01" } });
  assert.equal(r.code, 200); assert.equal(r.body.data.reply, "Hei!");
  assert.equal(reply.last.url, "https://api.anthropic.com/v1/messages"); assert.equal(reply.last.headers["x-api-key"], "test-key");
  assert.match(reply.last.opts.messages[0].content, /YOUR STYLE: Ogilvy/);
});
test("unknown tasks, broken answers and upstream errors are reported", async () => {
  assert.equal((await call("POST", { task: "hack", input: {} })).code, 400);
  globalThis.fetch = reply("not json at all"); assert.equal((await call("POST", { task: "chat", input: {} })).body.error, "invalid_json");
  globalThis.fetch = reply("overloaded", 529); assert.equal((await call("POST", { task: "chat", input: {} })).body.error, "upstream");
  assert.equal((await call("POST", { task: "chat", input: { x: "y".repeat(70000) } })).code, 413);
});
test("the daily limit kicks in", async () => {
  globalThis.fetch = reply('{"reply":"ok"}'); let last;
  for (let i = 0; i < 81; i++) last = await call("POST", { task: "chat", input: {} }, "9.9.9.9");
  assert.equal(last.code, 429);
});
