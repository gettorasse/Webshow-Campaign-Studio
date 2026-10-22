/* The Show Timeline in Play: one week at a time, so it stays readable on a phone.
   - Phase cards: Hook / Show / Convert with their real date ranges (from the posts themselves).
   - Tracks: only the channels this Show uses, each with its icon tile and item count.
   - Publication events sit on their day (a dot marks the exact day); active intervals
     (ads with an end date) span their days; evergreen pages are "always on", never given fake dates.
   - Today is a black pill with a line through the week. Tap anything to open it; swipe or
     use the arrows to change week. */
import { state } from "../store.js";
import { esc, IC } from "../lib.js";
import { KINDS, campaignEnd } from "../../shared/model.js";
import { addDays, daysBetween, fmtDate, todayISO, fromISO, toISO } from "../../shared/util.js";

export const mondayOf = (iso) => { const d = fromISO(iso); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return toISO(d); };
/* Phase windows from the posts themselves, so the bands always match the plan */
export function phaseRanges(s) {
  const start = s.brief.start, end = campaignEnd(s.brief), L = daysBetween(start, end) + 1;
  const first = (ph) => s.assets.filter(a => a.phase === ph && !KINDS[a.kind].evergreen).map(a => a.date).sort()[0];
  let showS = first("show") || addDays(start, Math.round(L / 3)), convS = first("convert") || addDays(start, Math.round(L * 2 / 3));
  if (showS <= start) showS = addDays(start, 1); if (convS <= showS) convS = addDays(showS, 1);
  return [["hook", start, addDays(showS, -1)], ["show", showS, addDays(convS, -1)], ["convert", convS, end]];
}
export const phaseOn = (ranges, iso) => ranges.find(([, a, b]) => iso >= a && iso <= b)?.[0] || "";
/* Which week to show first: this week while the Show runs, otherwise its first week */
export function defaultWeek(s) { const t = todayISO(), end = campaignEnd(s.brief); return mondayOf(t >= addDays(s.brief.start, -6) && t <= end ? t : s.brief.start); }
const TEMPORAL = (a) => KINDS[a.kind].evergreen ? "evergreen" : a.end ? "interval" : "event";

/* Channel look: generic icons on coloured tiles (not the networks' own logos) */
export const TRACK = {
  instagram: { name: "Instagram", ic: "camera", tile: "linear-gradient(135deg,#ff6aa2,#ff9a4d)", clip: "#FCE3EE" },
  facebook: { name: "Facebook", ic: "people", tile: "linear-gradient(135deg,#5b8cff,#3f66f0)", clip: "#E3ECFF" },
  tiktok: { name: "TikTok", ic: "play", tile: "linear-gradient(135deg,#2b2b33,#55556a)", clip: "#ECECF2" },
  linkedin: { name: "LinkedIn", ic: "people", tile: "linear-gradient(135deg,#2bb3a6,#1c8f87)", clip: "#DDF3F0" },
  email: { name: "Email", ic: "mail", tile: "linear-gradient(135deg,#55b2ff,#3b8cf0)", clip: "#E1F0FF" },
  website: { name: "Website", ic: "link", tile: "linear-gradient(135deg,#a77bff,#7c5cf0)", clip: "#EFE5FF" },
  google: { name: "Ads", ic: "megaphone", tile: "linear-gradient(135deg,#ffc94d,#ff8a3d)", clip: "#FFF0D6" },
};
export const tile = (ch, size = "") => `<span class="tile ${size}" style="background:${TRACK[ch]?.tile || "var(--go)"}">${IC[TRACK[ch]?.ic || "spark"]}</span>`;
const PH = { hook: ["Hook", "Get attention", "eye"], show: ["Show", "Tell the story", "megaphone"], convert: ["Convert", "Drive action", "target"] };
const rangeTxt = (a, b) => `${fmtDate(a, { day: "numeric", month: "short" })} – ${fmtDate(b, { day: "numeric", month: "short" })}`;

/* Hook / Show / Convert as three cards with their real dates */
export function phaseCards(s) {
  const r = phaseRanges(s); const cur = phaseOn(r, todayISO());
  return `<div class="ph-cards">${r.map(([k, a, b]) => `<div class="ph-card ph-${k}${cur === k ? " now" : ""}"><span class="ph-ic">${IC[PH[k][2]]}</span><span><b>${PH[k][0]}</b><small>${PH[k][1]}</small><small class="ph-d">${rangeTxt(a, b)}</small></span></div>`).join("")}</div>`;
}

export function weekTimeline(s, opts = {}) {
  const wk = opts.week || state.ui.weeks?.[s.id] || defaultWeek(s);
  const days = Array.from({ length: 7 }, (_, i) => addDays(wk, i)); const last = days[6]; const t = todayISO();
  const end = campaignEnd(s.brief); const live = s.assets.filter(a => !a.pending);
  const ever = live.filter(a => TEMPORAL(a) === "evergreen");
  const inWeek = live.filter(a => TEMPORAL(a) !== "evergreen" && (a.end ? a.date <= last && a.end >= wk : a.date >= wk && a.date <= last));
  const chans = [...new Set(s.assets.map(a => KINDS[a.kind].ch))];
  const col = (iso) => Math.min(7, Math.max(1, daysBetween(wk, iso) + 1));
  const clip = (a) => {
    const K = KINDS[a.kind]; const tp = TEMPORAL(a); const st = a.source === "failed" ? "failed" : a.done ? "done" : a.date < t && tp === "event" ? "late" : a.hasPhoto || a.imageSaved ? "ready" : "draft";
    const c0 = tp === "evergreen" ? 1 : col(a.date), c1 = tp === "evergreen" ? 7 : tp === "interval" ? col(a.end) : Math.min(7, c0 + 1);
    /* events start exactly on their day (a 2-day-wide card for readability, never earlier); intervals span their real days */
    const span = tp === "event" ? `grid-column:${c0} / ${Math.min(8, c0 + 2)}` : `grid-column:${c0} / ${Math.max(c1 + 1, Math.min(8, c0 + 2))}`;
    const when = tp === "evergreen" ? "Always on" : tp === "interval" ? rangeTxt(a.date, a.end) : fmtDate(a.date, { day: "numeric", month: "short" });
    return `<button class="clip ${tp} st-${st}" style="${span};--clip:${TRACK[K.ch]?.clip || "var(--well)"}" data-act="openasset" data-s="${s.id}" data-a="${a.id}" aria-label="${esc(`${K.label}: ${a.title || K.label}, ${when}, ${st}`)}">
      <span class="clip-ic">${st === "done" ? IC.check : IC[TRACK[K.ch]?.ic || "spark"]}</span><span class="clip-t"><b>${esc(a.title || K.label)}</b><small>${esc(when)}${st === "late" ? " · late" : st === "failed" ? " · retry" : st === "done" ? " · posted" : ""}</small></span></button>`;
  };
  const w0 = mondayOf(s.brief.start); const week = Math.floor(daysBetween(w0, wk) / 7) + 1, weeks = Math.floor(daysBetween(w0, mondayOf(end)) / 7) + 1;
  const canPrev = wk > mondayOf(addDays(s.brief.start, -6)), canNext = last < end;
  const tc = days.includes(t) ? col(t) : 0;
  const rows = chans.map(ch => {
    const list = [...ever.filter(a => KINDS[a.kind].ch === ch), ...inWeek.filter(a => KINDS[a.kind].ch === ch)]; if (opts.compact && !list.length) return "";
    const n = s.assets.filter(a => KINDS[a.kind].ch === ch).length;
    return `<div class="trk"><div class="trk-l">${tile(ch)}<span><b>${TRACK[ch]?.name || ch}</b><small>${n} item${n === 1 ? "" : "s"}</small></span></div><div class="trk-g">${list.length ? list.map(clip).join("") : `<span class="trk-empty" style="grid-column:1 / 8"></span>`}</div></div>`;
  }).join("");
  return `<div class="wt${opts.compact ? " compact" : ""}" data-swipe-week="${s.id}">
    <div class="wt-nav"><button class="icon-btn sm" data-act="week" data-s="${s.id}" data-d="-7" aria-label="Previous week" ${canPrev ? "" : "disabled"}>${IC.back}</button>
      <div class="wt-title"><b>${week >= 1 && week <= weeks ? `Week ${week} of ${weeks}` : week < 1 ? "Before it starts" : "After the show"}</b><small>${esc(rangeTxt(wk, last))}</small></div>
      <button class="icon-btn sm" data-act="week" data-s="${s.id}" data-d="7" aria-label="Next week" ${canNext ? "" : "disabled"}>${IC.arrow}</button></div>
    <div class="wt-body" style="--tc:${tc}">
      <div class="trk head"><div class="trk-l"></div><div class="trk-g">${days.map(d => `<div class="wt-day${d === t ? " today" : ""}">${d === t ? `<small>Today</small><b>${fromISO(d).getDate()}</b>` : `<small>${esc(fmtDate(d, { weekday: "short" }))}</small><b>${fromISO(d).getDate()}</b>`}</div>`).join("")}</div></div>
      ${rows}
      ${tc ? `<i class="now-line" aria-hidden="true"></i>` : ""}
    </div>
    ${!inWeek.length && !ever.length ? `<p class="muted small wt-none">Nothing goes out this week.</p>` : ""}
  </div>`;
}
