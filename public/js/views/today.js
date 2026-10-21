/* Home: your current show, the one next thing to do, how it went, and what's coming. */
import { state } from "../store.js";
import { esc, IC, mascot } from "../lib.js";
import { CHANNELS, KINDS } from "../../shared/model.js";
import { srOf } from "../../shared/showrunners.js";
import { addDays, fmtDate, hash, todayISO } from "../../shared/util.js";
import { showsList, nextMission, askOutcome, MILESTONES } from "../campaign.js";
import { posterHTML } from "./chat.js";

/* Every open task across shows, with the show it belongs to. */
export function tasks() {
  const out = [];
  for (const s of showsList()) for (const a of s.assets) if (!a.pending && a.source !== "failed") out.push({ s, a });
  return out.sort((x, y) => x.a.date.localeCompare(y.a.date) || x.a.order - y.a.order);
}
export function dueToday() { const t = todayISO(); return tasks().filter(({ a }) => !a.done && a.date <= t); }

export function todayView() {
  const shows = showsList(); const hour = new Date().getHours();
  const hi = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const head = `<header class="page-h"><div class="hello">${mascot("idle")}<div><span class="eyebrow">${esc(fmtDate(todayISO(), { weekday: "long", day: "numeric", month: "long" }))}</span><h1>${hi}${state.profile.business ? `, ${esc(state.profile.business)}` : ""}</h1></div></div><button class="icon-btn me-btn" data-act="tab" data-t="me" aria-label="Your business and settings">${IC.user}</button></header>`;
  if (!shows.length) return `<section class="page">${head}
    <div class="card empty hero"><b class="h">Let's make something happen.</b><p>Tell me what you want more of. I'll come back with one campaign idea, then help you make the first post.</p><button class="btn go big" data-act="newshow">${IC.spark} Start a campaign</button></div>
    ${tipCard()}</section>`;
  const s = shows.find(x => nextMission(x).kind !== "finished") || shows[0];
  const t = todayISO(); const week = addDays(t, 7);
  const next = tasks().filter(({ a }) => !a.done && a.date <= week);
  const asks = askOutcome().slice(0, 2);
  return `<section class="page">${head}
    ${missionCard(s)}
    ${asks.map(outcomeCard).join("")}
    ${next.length > 1 ? `<h2 class="sec">This week</h2><div class="list">${next.slice(0, 6).map(taskRow).join("")}</div>` : ""}
    ${tipCard()}
    <div class="card row-card"><span class="ic-round">${IC.bell}</span><div class="grow"><b>Daily reminder</b><p class="muted small">A note when something is due. Works while the app is open on this device.</p></div>
      <button class="switch" role="switch" aria-checked="${!!state.settings.nudges}" aria-label="Daily reminder" data-act="nudges"><i></i></button></div>
  </section>`;
}

/* The current show as a poster, its progress, and the ONE next thing to do. */
export function missionCard(s, inShow) {
  const st = s.strategy || {}; const n = nextMission(s); const done = Object.keys(s.milestones || {}).length;
  const go = (label, act, extra = "") => `<button class="btn go big" data-act="${act}" ${extra}>${label}</button>`;
  const what = {
    writing: [`${mascot("think")} Writing your posts…`, "They appear as they're ready. You can look around meanwhile.", ""],
    retry: [`Some posts didn't get written`, `${n.n} post${n.n > 1 ? "s" : ""} failed. Nothing is lost; try again when the connection's back.`, go(`${IC.redo} Try again`, "retry-show", `data-id="${s.id}"`)],
    finished: [`Show complete`, "Every post is out. Tell me how it went, then let's plan the next one.", go(`${IC.spark} Plan the next show`, "newshow")],
    creative: n.a && [`Make your first post`, `${KINDS[n.a.kind].label} · add a photo and your text goes on it. Ready to post in a minute.`, go(`${IC.image} Make it`, "openasset", `data-s="${s.id}" data-a="${n.a.id}" data-t="make"`)],
    post: n.a && [`${n.a.date <= todayISO() ? "Today" : "Next"}: ${esc(n.a.title || KINDS[n.a.kind].label)}`, `${KINDS[n.a.kind].label} · ${fmtDate(n.a.date, { weekday: "short", day: "numeric", month: "short" })}${n.a.source === "demo" ? " · demo draft" : ""}`, go(`${IC.arrow} Open`, "openasset", `data-s="${s.id}" data-a="${n.a.id}"`)],
  }[n.kind] || ["", "", ""];
  return `<div class="mission">
    ${inShow ? "" : `<button class="m-poster" data-act="openshow" data-id="${s.id}" aria-label="Open ${esc(st.name)}">${posterHTML({ ...st, goal: s.brief.goal }, true)}</button>`}
    <div class="m-body">
      <span class="kicker">${IC.target} Next mission</span>
      <b class="h">${what[0]}</b><p class="muted small">${what[1]}</p>${what[2]}
      <div class="ms-row" aria-label="Milestones: ${done} of ${MILESTONES.length}">${MILESTONES.map(([k, l]) => `<span class="ms-dot${s.milestones?.[k] ? " on" : ""}" title="${l}"><i></i><small>${l}</small></span>`).join("")}</div>
    </div>
  </div>`;
}
export function outcomeCard({ s, a }) {
  const ids = `data-s="${s.id}" data-a="${a.id}"`;
  return `<div class="card outcome"><span class="kicker">${IC.chat} Quick check</span><b>Did your ${esc(KINDS[a.kind].label)} from ${esc(fmtDate(a.doneOn || a.date, { weekday: "short", day: "numeric", month: "short" }))} get any replies, inquiries or bookings?</b>
    <div class="row"><button class="btn sm go" data-act="outcome" data-v="yes" ${ids}>Yes!</button><button class="btn sm" data-act="outcome" data-v="no" ${ids}>Not yet</button><button class="btn sm ghost" data-act="outcome" data-v="skip" ${ids}>Skip</button></div></div>`;
}
function tipCard() {
  const r = srOf(state.profile.showrunner); const tip = r.tips[hash(todayISO()) % r.tips.length];
  return `<div class="card tip"><span class="kicker">${IC.spark} ${r.role}'s tip</span><p>${esc(tip)}</p></div>`;
}
export function taskRow({ s, a }) {
  const K = KINDS[a.kind]; const ch = CHANNELS[K.ch]; const t = todayISO();
  const when = a.date < t && !K.evergreen ? `<span class="late">${esc(fmtDate(a.date))}</span>` : a.date === t || (K.evergreen && a.date <= t) ? (a.time ? esc(a.time) : "Today") : esc(fmtDate(a.date, { weekday: "short", day: "numeric", month: "numeric" }));
  return `<div class="task${a.done ? " done" : ""}">
    <button class="tick" data-act="toggledone" data-s="${s.id}" data-a="${a.id}" aria-pressed="${!!a.done}" aria-label="${a.done ? "Mark not posted" : "Mark posted"}">${IC.check}</button>
    <button class="task-b" data-act="openasset" data-s="${s.id}" data-a="${a.id}"><span class="t">${esc(a.title || K.label)}</span><span class="m"><i class="dot" style="--c:${ch.c}"></i>${esc(K.label)} · ${when}${a.source === "demo" ? ` · <em class="demo">demo</em>` : ""}</span></button>
  </div>`;
}
