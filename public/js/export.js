/* Everything a show can be taken out as: Markdown, calendar, CSV, JSON.
   Kept independent of the screens so the server or Pro can reuse it. */
import { CHANNELS, GOALS, KINDS, PHASES, campaignEnd, copyOf } from "../shared/model.js";
import { srOf } from "../shared/showrunners.js";
import { fmtDay, slug } from "../shared/util.js";
import { sortedAssets } from "./campaign.js";
import { toast } from "./lib.js";
import { state } from "./store.js";
import { buildPrompts, afterOf, afterLine } from "../shared/make.js";

const when = (a) => KINDS[a.kind].evergreen ? `Ready by ${fmtDay(a.date)}, runs until ${fmtDay(a.end)}` : a.end ? `${fmtDay(a.date)} – ${fmtDay(a.end)}` : `${fmtDay(a.date)}${a.time ? ", " + a.time : ""}`;
export function showMD(s) {
  const st = s.strategy, b = s.brief;
  const assets = sortedAssets(s).map((a, i) => { const K = KINDS[a.kind];
    return [`### ${String(i + 1).padStart(2, "0")} · ${a.title}`, `*${K.label} · ${PHASES[a.phase].label} · ${when(a)}*`, "", ...K.fields.filter(([k]) => a.fields?.[k]).flatMap(([k, l]) => [`**${l}**`, a.fields[k], ""]), ...buildPrompts(a, s, state.profile).flatMap(p => [`**ChatGPT: ${p.label}**${p.photo ? " (attach your photo)" : ""}`, "```", p.text, "```", ""]), `**What to do:** ${a.action}`, ""].join("\n"); }).join("\n");
  return `# ${st.name}\n\n> Made with your Webshow Showrunner (${srOf(s.showrunner).name}).\n\n**Big idea:** ${st.idea}\n**Goal:** ${(GOALS[b.goal] || GOALS.leads).label} · **Runs:** ${b.start} to ${campaignEnd(b)} · **Channels:** ${b.channels.map(k => CHANNELS[k].label).join(", ")}\n\n**Audience:** ${st.audience}\n**Message:** ${st.message}\n**Offer:** ${st.offer}\n**Call to action:** ${st.cta}\n**After the button:** ${afterLine(afterOf(s, state.profile))}\n\n**Hook:** ${st.arc.hook}\n**Show:** ${st.arc.show}\n**Convert:** ${st.arc.convert}\n\n## Posts and assets\n\n${assets}`;
}
const cell = (v) => { v = String(v ?? ""); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
export function showCSV(s) { return "\uFEFF" + [["Date", "Time", "Until", "Channel", "Type", "Phase", "Title", "What to do", "Done"], ...sortedAssets(s).map(a => [a.date, a.time || "", a.end || "", CHANNELS[KINDS[a.kind].ch].label, KINDS[a.kind].label, PHASES[a.phase].label, a.title, a.action, a.done ? "yes" : ""])].map(r => r.map(cell).join(",")).join("\r\n"); }
export function showICS(s) {
  const e = (x) => String(x).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, m => "\\" + m);
  /* RFC 5545: lines are at most 75 bytes; longer ones continue on the next line after a space. */
  const fold = (l) => { const out = []; let cur = "", n = 0; for (const ch of l) { const b = new TextEncoder().encode(ch).length; if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; n = 0; } cur += ch; n += b; } out.push(cur); return out.join("\r\n "); };
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const ev = sortedAssets(s).map(a => { const d = a.date.replace(/-/g, ""); const n = a.date.split("-").map(Number); const next = new Date(n[0], n[1] - 1, n[2] + 1); const nd = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, "0")}${String(next.getDate()).padStart(2, "0")}`;
    return ["BEGIN:VEVENT", `UID:${a.id}@webshow`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${nd}`, `SUMMARY:${e(`${CHANNELS[KINDS[a.kind].ch].label}: ${a.title}`)}`, `DESCRIPTION:${e(`${a.action}\n\n${copyOf(a)}`.slice(0, 1500))}`, "END:VEVENT"].join("\r\n"); });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Webshow//Showrunner//EN", `X-WR-CALNAME:${e(s.strategy.name)}`, ...ev, "END:VCALENDAR"].join("\r\n").split("\r\n").map(fold).join("\r\n") + "\r\n";
}
/* campaign.json: the format the desktop Pro studio and other tools read. */
export const showJSON = (s) => JSON.stringify({ format: "webshow.campaign", version: 1, ...s, assets: sortedAssets(s).map(({ pending, ...a }) => ({ ...a, copy: copyOf(a) })) }, null, 2);
export const fileBase = (s) => slug(s.strategy?.name || "show");

let dl; /* inside Claude, files go through the downloads capability */
export async function saveFile(name, data, type = "text/plain") {
  try { dl ??= window.claude?.use ? await window.claude.use("downloads") : null; } catch { dl = null; }
  if (dl) { try { await dl.save({ filename: name, data }); toast("Saved " + name); } catch (e) { if (e?.code !== "declined") toast("The file couldn't be saved here."); } return; }
  const url = URL.createObjectURL(new Blob([data], { type })); const a = document.createElement("a"); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast("Saved " + name);
}
