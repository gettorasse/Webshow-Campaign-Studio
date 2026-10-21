/* Today: what to post now, what's next, and one tip. */
import { state } from "../store.js";
import { esc, IC } from "../lib.js";
import { CHANNELS, KINDS } from "../../shared/model.js";
import { srOf } from "../../shared/showrunners.js";
import { addDays, fmtDate, hash, todayISO } from "../../shared/util.js";
import { showsList } from "../campaign.js";

/* Every open task across shows, with the show it belongs to. */
export function tasks() {
  const out = [];
  for (const s of showsList()) for (const a of s.assets) if (!a.pending) out.push({ s, a });
  return out.sort((x, y) => x.a.date.localeCompare(y.a.date) || x.a.order - y.a.order);
}
export function dueToday() { const t = todayISO(); return tasks().filter(({ a }) => !a.done && a.date <= t); }

export function todayView() {
  const t = todayISO(); const week = addDays(t, 7); const all = tasks();
  const now = all.filter(({ a }) => !a.done && a.date <= t);
  const next = all.filter(({ a }) => !a.done && a.date > t && a.date <= week);
  const doneToday = all.filter(({ a }) => a.done && a.doneOn === t);
  const r = srOf(state.profile.showrunner); const tip = r.tips[hash(t) % r.tips.length];
  const hi = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  return `<section class="page">
    <header class="page-h"><div><span class="eyebrow">${esc(fmtDate(t, { weekday: "long", day: "numeric", month: "long" }))}</span><h1>${hi}${state.profile.business ? ", " + esc(state.profile.business) : ""}</h1></div></header>
    ${!state.profile.showrunner ? `<div class="card empty"><b class="h">Start with your Showrunner</b><p>Tell it about your business and it will plan your first campaign.</p><button class="btn go" data-act="tab" data-t="chat">${IC.chat} Talk to your Showrunner</button></div>` : ""}
    <h2 class="sec">To do today ${now.length ? `<span class="count">${now.length}</span>` : ""}</h2>
    ${now.length ? `<div class="list">${now.map(taskRow).join("")}</div>` : `<div class="card quiet"><p>${all.length ? "Nothing due today. Nice." : "Nothing yet. When you create a campaign, your daily to-dos show up here."}</p>${!all.length && state.profile.showrunner ? `<button class="btn go" data-act="newshow">${IC.spark} Create a campaign with AI</button>` : ""}</div>`}
    ${doneToday.length ? `<p class="muted small">${IC.check} ${doneToday.length} done today</p>` : ""}
    ${next.length ? `<h2 class="sec">Next 7 days</h2><div class="list">${next.map(taskRow).join("")}</div>` : ""}
    <div class="card tip"><span class="kicker">${IC.spark} Tip from your Showrunner</span><p>${esc(tip)}</p><button class="link" data-act="say" data-t="Give me a tip">Ask for more ${IC.arrow}</button></div>
    <div class="card row-card"><span class="ic-round">${IC.bell}</span><div class="grow"><b>Daily reminder</b><p class="muted small">A note when something is due. Works while the app is open on this device; phone push comes with the app.</p></div>
      <button class="switch" role="switch" aria-checked="${!!state.settings.nudges}" aria-label="Daily reminder" data-act="nudges"><i></i></button></div>
  </section>`;
}
export function taskRow({ s, a }) {
  const K = KINDS[a.kind]; const ch = CHANNELS[K.ch]; const t = todayISO();
  const when = a.date < t && !K.evergreen ? `<span class="late">${esc(fmtDate(a.date))}</span>` : a.date === t || (K.evergreen && a.date <= t) ? (a.time ? esc(a.time) : "Today") : esc(fmtDate(a.date, { weekday: "short", day: "numeric", month: "numeric" }));
  return `<div class="task${a.done ? " done" : ""}">
    <button class="tick" data-act="toggledone" data-s="${s.id}" data-a="${a.id}" aria-pressed="${!!a.done}" aria-label="${a.done ? "Mark not done" : "Mark done"}">${IC.check}</button>
    <button class="task-b" data-act="openasset" data-s="${s.id}" data-a="${a.id}"><span class="t">${esc(a.title || K.label)}</span><span class="m"><i class="dot" style="--c:${ch.c}"></i>${esc(K.label)} · ${when} · ${esc(s.strategy?.name || "")}</span></button>
  </div>`;
}
