/* Home: your current show, the one next thing to do, how it went, and what's coming. */
import { state } from "../store.js";
import { esc, IC, mascot, doodles } from "../lib.js";
import { CHANNELS, KINDS, PHASES } from "../../shared/model.js";
import { srOf } from "../../shared/showrunners.js";
import { addDays, fmtDate, hash, todayISO } from "../../shared/util.js";
import { showsList, nextMission, askOutcome, MILESTONES, showEnd } from "../campaign.js";
import { posterHTML } from "./chat.js";
import { weekTimeline, phaseCards, tile } from "./timeline.js";
import { ART, artFor } from "../../shared/bridge.js";
import { GOALS } from "../../shared/model.js";

/* Every open task across shows, with the show it belongs to. */
export function tasks() {
  const out = [];
  for (const s of showsList()) for (const a of s.assets) if (!a.pending && a.source !== "failed") out.push({ s, a });
  return out.sort((x, y) => x.a.date.localeCompare(y.a.date) || x.a.order - y.a.order);
}
export function dueToday() { const t = todayISO(); return tasks().filter(({ a }) => !a.done && a.date <= t); }

export function appHead(title = "Webshow Play") {
  const p = state.profile; const due = dueToday().length;
  return `<header class="app-h"><span class="logo-row"><img class="logo" src="art/logo-sm.png" alt="Webshow"><b>${esc(title)}</b></span>
    <button class="round-btn" data-act="sheet" data-k="due" aria-label="${due ? `${due} things due` : "Reminders"}">${IC.bell}${due ? `<i class="red-dot"></i>` : ""}</button>
    <button class="avatar" data-act="tab" data-t="me" aria-label="Your business and settings">${esc((p.business || "W").trim()[0]?.toUpperCase() || "W")}</button></header>`;
}
export function todayView() {
  const shows = showsList(); const head = appHead();
  if (!shows.length) return `<section class="page home">${head}
    <div class="hero-card" style="--pbg:#DCE6FF;--pink:#3f55d9"><span class="pill-k">Your first Show</span><b class="hc-name">Let's make something happen</b><p class="hc-goal">Tell me what you want more of. I'll come back with one campaign idea, build the Show, and help you make the first post.</p>
      <div class="hc-row"><button class="btn ink big" data-act="newshow">Start your first Show ${IC.arrow}</button></div><span class="hc-art-wrap">${doodles()}<img class="hc-art" src="art/showrunner.webp" alt=""></span></div>
    </section>`;
  const active = state.shows[state.settings.activeShow];
  const s = active || shows.find(x => nextMission(x).kind !== "finished") || shows[0];
  const asks = askOutcome().slice(0, 2);
  return `<section class="page home">${head}
    ${heroCard(s)}
    <div class="card tl-card"><div class="tl-h"><h2>Campaign Timeline</h2><button class="date-pill" data-act="showtimeline" data-id="${s.id}">${IC.cal} ${esc(fmtDate(s.brief.start, { day: "numeric", month: "short" }))} – ${esc(fmtDate(showEnd(s), { day: "numeric", month: "short", year: "numeric" }))} ${IC.chev}</button></div>
      ${phaseCards(s)}${weekTimeline(s, { compact: true })}</div>
    ${missionCard(s, true)}
    ${asks.map(outcomeCard).join("")}
    <div class="sec-h2"><h2>Your Shows</h2><button class="link" data-act="tab" data-t="shows">See all ${IC.arrow}</button></div>
    <div class="gallery">${shows.slice(0, 8).map(miniShow).join("")}<button class="mini-show new" data-act="newshow">${IC.plus}<b>New Show</b></button></div>
  </section>`;
}
/* The active Show, big: its character, name, goal, real progress, and the way in. */
export function heroCard(s, inShow = false) {
  const st = s.strategy || {}; const n = s.assets.length, d = s.assets.filter(a => a.done).length; const pct = n ? Math.round(d / n * 100) : 0;
  const k = artFor(s); const A = ART[k];
  return `<div class="hero-card" style="--pbg:${A.bg};--pink:${A.ink}">
    <span class="pill-k">${state.settings.activeShow === s.id ? "Active Show" : "Your Show"}</span>
    <b class="hc-name">${esc(st.name || "New show")}</b>
    <p class="hc-goal">${esc(st.idea || GOALS[s.brief.goal]?.label || "")}</p>
    <div class="hc-row">${inShow ? `<button class="btn ink big" data-act="showchat" data-id="${s.id}">${IC.chat} Talk it over</button>` : `<button class="btn ink big" data-act="openshow" data-id="${s.id}">Open Show ${IC.arrow}</button>`}</div>
    <span class="hc-art-wrap">${doodles()}<img class="hc-art" src="art/${k}.webp" alt="" draggable="false"></span>
    <div class="hc-prog"><span class="ring" style="--p:${pct}" role="img" aria-label="${pct} percent: ${d} of ${n} posted"><b>${pct}%</b></span><small><b>${d} of ${n}</b><br>posts done</small></div>
  </div>`;
}
function miniShow(s) {
  const k = artFor(s); const n = s.assets.length, d = s.assets.filter(a => a.done).length; const pct = n ? Math.round(d / n * 100) : 0;
  return `<button class="mini-show${state.settings.activeShow === s.id ? " on" : ""}" style="--pbg:${ART[k].bg};--pink:${ART[k].ink}" data-act="openshow" data-id="${s.id}"><span class="ms-art">${doodles()}<img src="art/${k}.webp" alt=""></span><b>${esc(s.strategy?.name || "Show")}</b><small>${esc(fmtDate(s.brief.start, { day: "numeric", month: "short" }))} – ${esc(fmtDate(showEnd(s), { day: "numeric", month: "short" }))}</small><span class="ms-p"><span class="bar"><i style="width:${pct}%"></i></span><small>${pct}%</small></span></button>`;
}

/* Timeline tab: the active Show's whole timeline, week by week, with a switcher between Shows */
export function timelinePage() {
  const shows = showsList();
  if (!shows.length) return `<section class="page">${appHead("Timeline")}<div class="hero-card" style="--pbg:#DCE6FF;--pink:#3f55d9"><span class="pill-k">Timeline</span><b class="hc-name">Nothing scheduled yet</b><p class="hc-goal">Start a Show and its posts land here, day by day, on one timeline.</p><div class="hc-row"><button class="btn ink big" data-act="newshow">Start a Show ${IC.arrow}</button></div><span class="hc-art-wrap">${doodles()}<img class="hc-art" src="art/starburst.webp" alt=""></span></div></section>`;
  const s = state.shows[state.settings.activeShow] || shows[0];
  const t = todayISO(); const next = s.assets.filter(a => !a.done && !a.pending && a.source !== "failed" && !KINDS[a.kind].evergreen && a.date >= t).sort((x, y) => x.date.localeCompare(y.date)).slice(0, 4);
  return `<section class="page">${appHead("Timeline")}
    ${shows.length > 1 ? `<div class="show-switch" role="tablist" aria-label="Show">${shows.map(x => { const k = artFor(x); return `<button role="tab" aria-selected="${x.id === s.id}" data-act="activeshow" data-id="${x.id}" style="--pbg:${ART[k].bg}"><img src="art/${k}.webp" alt="">${esc(x.strategy?.name || "Show")}</button>`; }).join("")}</div>` : ""}
    <div class="card tl-card"><div class="tl-h"><h2>${esc(s.strategy?.name || "Show")}</h2><span class="date-pill">${IC.cal} ${esc(fmtDate(s.brief.start, { day: "numeric", month: "short" }))} – ${esc(fmtDate(showEnd(s), { day: "numeric", month: "short" }))}</span></div>
      ${phaseCards(s)}${weekTimeline(s)}</div>
    ${missionCard(s, true)}
    ${next.length ? `<div class="sec-h2"><h2>Coming up</h2><button class="link" data-act="openshow" data-id="${s.id}">Open Show ${IC.arrow}</button></div><div class="card list">${next.map(a => taskRow({ s, a })).join("")}</div>` : ""}
  </section>`;
}

/* "Next up": the ONE next thing to do, with a big button */
export function missionCard(s, inShow) {
  const n = nextMission(s); const a = n.a; const K = a && KINDS[a.kind];
  const btn = (label, act, extra = "") => `<button class="btn go big" data-act="${act}" ${extra}>${label} ${IC.arrow}</button>`;
  const what = {
    writing: [mascot("think"), "Writing your posts…", "They appear as they're ready.", ""],
    retry: [`<span class="tile" style="background:linear-gradient(135deg,#ff8a7a,#e5484d)">${IC.redo}</span>`, "Some posts didn't get written", `${n.n} post${n.n > 1 ? "s" : ""} failed. Nothing is lost.`, btn("Try again", "retry-show", `data-id="${s.id}"`)],
    finished: [mascot("happy"), "Show complete", "Every post is out. Tell me how it went.", btn("Next Show", "newshow")],
    creative: a && [tile(K.ch, "lg"), "Make your first post", `${K.label} · add a photo, your text goes on it.`, btn("Start", "openasset", `data-s="${s.id}" data-a="${a.id}" data-t="make"`)],
    post: a && [tile(K.ch, "lg"), esc(a.title || K.label), `${K.label} · ${fmtDate(a.date, { weekday: "short", day: "numeric", month: "short" })}${a.source === "demo" ? " · demo draft" : ""}`, btn("Start task", "openasset", `data-s="${s.id}" data-a="${a.id}"`)],
  }[n.kind] || ["", "", "", ""];
  const ph = a?.phase && a.phase !== "always" ? `<span class="ph-pill ph-${a.phase}">${PHASES[a.phase].label}</span>` : "";
  return `<div class="nextup">
    <span class="nu-h">${IC.sparkle} ${a && a.date <= todayISO() ? "Next up today" : "Next mission"}</span>
    <div class="nu-row">${what[0]}<span class="nu-t"><b>${what[1]}</b>${ph}<small>${what[2]}</small></span>${what[3]}</div>
    <div class="ms-row" aria-label="Milestones">${MILESTONES.map(([k, l]) => `<span class="ms-dot${s.milestones?.[k] ? " on" : ""}" title="${l}"><i></i><small>${l}</small></span>`).join("")}</div>
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
