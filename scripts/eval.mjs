/* AI test run: sends each test business in tests/briefs.json through the real model
   (chat → the big idea → first posts), runs automatic checks, and writes a report you grade by hand.
     ANTHROPIC_API_KEY=... node scripts/eval.mjs            all briefs
     node scripts/eval.mjs sauna-fi yoga-fi                  only these
     SHOWRUNNER_MODEL=... node scripts/eval.mjs              compare models
   Output: eval-results/<time>/report.md and results.json. See docs/AI-TESTING.md. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
const ROOT = resolve(import.meta.dirname, "..");
for (const f of [".env.local", ".env"]) { const p = join(ROOT, f); if (!existsSync(p)) continue; for (const l of readFileSync(p, "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } }
if (!process.env.ANTHROPIC_API_KEY) { console.error("Set ANTHROPIC_API_KEY (in .env or the shell) first."); process.exit(1); }

const { callClaude } = await import("../api/showrunner.js");
const { TASKS, normChat, normConcept, normAsset } = await import("../public/shared/prompts.js");
const { blankProfile, planSlots, KINDS } = await import("../public/shared/model.js");
const { parseJSON, addDays, todayISO } = await import("../public/shared/util.js");

const only = process.argv.slice(2);
const briefs = JSON.parse(readFileSync(join(ROOT, "tests/briefs.json"), "utf8")).filter(b => !only.length || only.includes(b.id));
const BANNED = /\b(unlock|elevate|seamless|game.?changer|revolutionary|delve|synergy|world.?class)\b/i;
const NAMES = /\b(Ogilvy|Hormozi|Vaynerchuk|Gary Vee)\b/i;

/* Automatic checks. They flag things for a human to look at; they don't grade. */
function checks(text, b) {
  const flags = []; const src = JSON.stringify(b.profile) + JSON.stringify(b.brief) + b.open;
  const nums = [...new Set((text.match(/\d+(?:[.,]\d+)?\s?(?:%|€|eur|euros?|e\b)?/gi) || []).map(s => s.trim()))];
  const invented = nums.filter(n => { const d = n.replace(/[^\d]/g, ""); return d.length >= 2 && !src.includes(d) && !/^20\d\d$/.test(d); });
  if (invented.length) flags.push(`Numbers not in the brief (check for invented facts): ${invented.slice(0, 8).join(", ")}`);
  if (/(guarantee|takuu|money.?back|rahat takaisin|-\d+ ?%|\d+ ?% off|alennus|discount)/i.test(text) && !/(guarantee|takuu|alennus|discount|%)/i.test(src)) flags.push("Mentions a guarantee or discount that the owner never stated");
  const m = text.match(BANNED); if (m) flags.push(`Filler word: "${m[0]}"`);
  const n = text.match(NAMES); if (n) flags.push(`Names the style's namesake in the output: "${n[0]}"`);
  const fi = (text.match(/[äö]/gi) || []).length / Math.max(1, text.length);
  if (b.lang === "fi" && fi < .01) flags.push("Expected Finnish, looks like English");
  if (b.lang === "en" && fi > .01) flags.push("Expected English, looks like Finnish");
  return flags;
}
async function run(task, input) {
  const { prompt, maxTokens } = TASKS[task](input); const t = Date.now();
  try { const raw = await callClaude(prompt, maxTokens); return { raw, data: parseJSON(raw), ms: Date.now() - t }; }
  catch (e) { return { raw: "", data: null, ms: Date.now() - t, error: String(e.message) }; }
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19); const dir = join(ROOT, "eval-results", stamp); mkdirSync(dir, { recursive: true });
const results = []; let md = `# Showrunner AI test · ${new Date().toLocaleString("en-GB")}\n\nModel: \`${process.env.SHOWRUNNER_MODEL || "claude-sonnet-5-5"}\` · Briefs: ${briefs.length}\n\nGrade each section 1–5 on the rubric in docs/AI-TESTING.md. Flags are hints, not verdicts.\n`;
for (const b of briefs) {
  process.stdout.write(`${b.id} … `);
  const profile = { ...blankProfile(), ...b.profile, showrunner: b.showrunner };
  const chat = await run("chat", { profile, messages: [{ role: "user", text: b.open }], shows: [], today: todayISO() });
  const chatN = chat.data ? normChat(chat.data) : null;
  const brief = { ...b.brief, offer: profile.offer, audience: profile.audience, start: addDays(todayISO(), 1) };
  /* the same path as the app: one concept to approve, which becomes the strategy */
  const strat = await run("concept", { profile, seed: { goal: brief.goal, what: [profile.business, profile.what].filter(Boolean).join(" – "), offer: profile.offer }, today: todayISO() });
  const c = strat.data ? normConcept(strat.data, { goal: brief.goal, offer: profile.offer }) : null;
  const stratN = c ? { ...c, tagline: c.why } : null;
  const slots = planSlots(brief).slice(0, 5);
  const assets = stratN ? await run("assets", { profile, brief, strategy: stratN, slots }) : { data: null, error: "no strategy" };
  const assetsN = slots.map(s => ({ slot: s, out: normAsset(s, (assets.data?.assets || []).find(a => a?.id === s.id)) }));
  const allText = [chat.raw, strat.raw, assets.raw].join("\n");
  const flags = checks(allText, b);
  if (!chatN) flags.push("Chat: no valid JSON"); if (!stratN) flags.push("Idea: no valid JSON");
  const missing = assetsN.filter(a => !a.out).length; if (missing) flags.push(`${missing} of ${slots.length} posts missing or empty`);
  if (b.id === "salon-thin" && chatN?.cards.some(c => c.type === "plan")) flags.push("Proposed a plan with almost no information (should ask first)");
  results.push({ id: b.id, showrunner: b.showrunner, ms: { chat: chat.ms, strategy: strat.ms, assets: assets.ms }, flags, chat: chatN, strategy: stratN, assets: assetsN, errors: [chat.error, strat.error, assets.error].filter(Boolean) });
  console.log(flags.length ? `${flags.length} flag(s)` : "ok");

  md += `\n---\n\n## ${b.id} · ${b.showrunner} style · ${b.lang}\n\n**Owner says:** ${b.open}\n\n`;
  md += flags.length ? `**Flags:**\n${flags.map(f => `- ⚠️ ${f}`).join("\n")}\n\n` : "**Flags:** none\n\n";
  md += `### Chat (${chat.ms} ms)\n\n${chatN ? `> ${chatN.reply}\n\n${chatN.cards.map(c => "```json\n" + JSON.stringify(c, null, 2) + "\n```").join("\n")}${chatN.remember.length ? `\nRemembered: ${chatN.remember.join("; ")}\n` : ""}` : "_failed_ " + (chat.error || "")}\n\nGrade: understanding __ · usefulness __ · voice __ · honesty __\n\n`;
  md += `### The big idea (${strat.ms} ms)\n\n${stratN ? `**${stratN.name}** — “${stratN.idea}”\n\n- Example hook: ${stratN.hook}\n- Why it'll work: ${stratN.why}\n- Audience: ${stratN.audience}\n- Insight: ${stratN.insight}\n- Message: ${stratN.message}\n- Offer: ${stratN.offer}\n- CTA: ${stratN.cta}\n- Hook: ${stratN.arc.hook}\n- Show: ${stratN.arc.show}\n- Convert: ${stratN.arc.convert}\n- Voice: ${stratN.voice}\n- Visual: ${stratN.visual}\n${stratN.offerIdeas.length ? `- Offer ideas: ${stratN.offerIdeas.join(" / ")}\n` : ""}` : "_failed_ " + (strat.error || "")}\nGrade: big idea __ · fit to goal __ · style shows __ · honesty __\n\n`;
  md += `### First posts (${assets.ms || 0} ms)\n\n${assetsN.map(({ slot, out }) => `#### ${KINDS[slot.kind].label} · ${slot.phase} · ${slot.date}\n\n${out ? Object.entries(out.fields).filter(([, v]) => v).map(([k, v]) => `**${k}:** ${v}`).join("\n\n") + (out.image ? `\n\n**image prompt:** ${out.image}` : "") : "_missing_"}\n`).join("\n")}\nGrade: ready to post __ · one idea throughout __ · channel fit __ · honesty __\n`;
}
writeFileSync(join(dir, "results.json"), JSON.stringify(results, null, 2)); writeFileSync(join(dir, "report.md"), md);
console.log(`\nReport: ${join(dir, "report.md")}`);
