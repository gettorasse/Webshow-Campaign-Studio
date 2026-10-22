/* The Show Timeline in Play: one week at a time, so it stays readable on a phone.
   - Phase band: Hook / Show / Convert across the days.
   - Tracks: only the channels this Show uses. "Always on" for evergreen pages and ads.
   - Publication events sit on their day; active intervals (ads with an end date) span their days;
     evergreen elements run the whole week without invented dates.
   - Tap anything to open it; swipe or use the arrows to change week. */
import { state } from "../store.js";
import { esc, IC } from "../lib.js";
import { CHANNELS, KINDS, PHASES, campaignEnd } from "../../shared/model.js";
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
/* each row is its own 7-column grid, so posts never drift into another channel's row */
/* on a phone a day is ~45px wide: events show what they are; the full title is one tap away */
const KIND_SHORT = { ig_post: "Post", fb_post: "Post", li_post: "Post", ig_carousel: "Carousel", ig_story: "Story", ig_reel: "Reel", tiktok: "Video", meta_ad: "Ad", email: "Email", landing: "Page", search_ad: "Search ad" };
const SHORT = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", linkedin: "LinkedIn", email: "Email", website: "Website", google: "Google Ads" };

export function weekTimeline(s, opts = {}) {
  const wk = opts.week || state.ui.weeks?.[s.id] || defaultWeek(s);
  const days = Array.from({ length: 7 }, (_, i) => addDays(wk, i)); const last = days[6]; const t = todayISO();
  const ranges = phaseRanges(s); const end = campaignEnd(s.brief);
  const live = s.assets.filter(a => !a.pending);
  const ever = live.filter(a => TEMPORAL(a) === "evergreen");
  const inWeek = live.filter(a => TEMPORAL(a) !== "evergreen" && (a.end ? a.date <= last && a.end >= wk : a.date >= wk && a.date <= last));
  const chans = [...new Set(s.assets.filter(a => TEMPORAL(a) !== "evergreen").map(a => KINDS[a.kind].ch))];
  const col = (iso) => daysBetween(wk, iso) + 1; /* grid columns 1..7 */
  const chip = (a) => {
    const K = KINDS[a.kind]; const st = a.source === "failed" ? "failed" : a.done ? "done" : a.date < t ? "late" : a.hasPhoto || a.imageSaved ? "ready" : "draft";
    const span = TEMPORAL(a) === "interval" ? `grid-column:${Math.max(1, col(a.date))} / ${Math.min(7, col(a.end)) + 1}` : `grid-column:${col(a.date)}`;
    return `<button class="wt-el ${TEMPORAL(a)} st-${st}" style="${span};--c:${CHANNELS[K.ch].c}" data-act="openasset" data-s="${s.id}" data-a="${a.id}" aria-label="${esc(`${K.label}: ${a.title || K.label}, ${fmtDate(a.date, { weekday: "long", day: "numeric", month: "long" })}${a.end ? ` to ${fmtDate(a.end)}` : ""}, ${st}`)}">${st === "done" ? IC.check : ""}<span>${esc(TEMPORAL(a) === "interval" ? a.title || K.label : KIND_SHORT[a.kind] || K.label)}</span></button>`;
  };
  const w0 = mondayOf(s.brief.start); const week = Math.floor(daysBetween(w0, wk) / 7) + 1, weeks = Math.floor(daysBetween(w0, mondayOf(end)) / 7) + 1;
  const canPrev = wk > mondayOf(addDays(s.brief.start, -6)), canNext = last < end;
  /* phase band: contiguous runs of the same phase inside this week */
  const runs = []; for (const d of days) { const ph = phaseOn(ranges, d); const r = runs.at(-1); if (r && r.ph === ph) r.to = d; else runs.push({ ph, from: d, to: d }); }
  return `<div class="wt${opts.compact ? " compact" : ""}" data-swipe-week="${s.id}">
    ${opts.compact ? "" : `<div class="wt-nav"><button class="icon-btn sm" data-act="week" data-s="${s.id}" data-d="-7" aria-label="Previous week" ${canPrev ? "" : "disabled"}>${IC.back}</button>
      <div class="wt-title"><b>${week >= 1 && week <= weeks ? `Week ${week} of ${weeks}` : week < 1 ? "Before it starts" : "After the show"}</b><small>${esc(fmtDate(wk, { day: "numeric", month: "short" }))} – ${esc(fmtDate(last, { day: "numeric", month: "short" }))}</small></div>
      <button class="icon-btn sm" data-act="week" data-s="${s.id}" data-d="7" aria-label="Next week" ${canNext ? "" : "disabled"}>${IC.arrow}</button></div>`}
    <div class="wt-body" style="--tc:${days.includes(t) ? col(t) : 0}" aria-label="Timeline, week of ${esc(fmtDate(wk, { day: "numeric", month: "long" }))}">
      <div class="wt-row wt-days">${days.map(d => `<div class="wt-day${d === t ? " today" : ""}"><small>${esc(fmtDate(d, { weekday: "short" }))}</small><b>${fromISO(d).getDate()}</b></div>`).join("")}</div>
      <div class="wt-row wt-phases">${runs.map(r => `<div class="wt-phase ${r.ph ? "ph-" + r.ph : "off"}" style="grid-column:${col(r.from)} / ${col(r.to) + 1}">${r.ph ? `<span>${PHASES[r.ph].label}</span>` : ""}</div>`).join("")}</div>
      ${ever.length && !opts.compact ? `<div class="wt-label">${IC.layers} Always on</div><div class="wt-row">${ever.map(a => `<button class="wt-el evergreen st-${a.done ? "done" : "draft"}" style="grid-column:1 / 8;--c:${CHANNELS[KINDS[a.kind].ch].c}" data-act="openasset" data-s="${s.id}" data-a="${a.id}" aria-label="${esc(KINDS[a.kind].label)}: always on">${a.done ? IC.check : ""}<span>${esc(KINDS[a.kind].label)} · always on</span></button>`).join("")}</div>` : ""}
      ${chans.map(ch => { const list = inWeek.filter(a => KINDS[a.kind].ch === ch); if (opts.compact && !list.length) return "";
        return `<div class="wt-label"><i class="dot" style="--c:${CHANNELS[ch].c}"></i>${SHORT[ch]}</div><div class="wt-row">${list.map(chip).join("")}</div>`; }).join("")}
    </div>
    ${!inWeek.length ? `<p class="muted small wt-none">${opts.compact ? "Nothing scheduled this week." : "Nothing goes out this week."}</p>` : ""}
  </div>`;
}
