/* Home: your current show, the one next thing to do, how it went, and what's coming. */
import { state } from "../store.js";
import { esc, IC, mascot } from "../lib.js";
import { CHANNELS, KINDS } from "../../shared/model.js";
import { srOf } from "../../shared/showrunners.js";
import { addDays, fmtDate, hash, todayISO } from "../../shared/util.js";
import { showsList, nextMission, askOutcome, MILESTONES, showEnd } from "../campaign.js";
import { posterHTML } from "./chat.js";
import { weekTimeline } from "./timeline.js";
import { ART, artFor } from "../../shared/bridge.js";
import { GOALS } from "../../shared/model.js";

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
  const head = `<header class="page-h"><div class="hello"><span class="brandmark">${mascot("idle")}</span><div><span class="eyebrow">Webshow Play · ${esc(fmtDate(todayISO(), { weekday: "long", day: "numeric", month: "long" }))}</span><h1>${hi}${state.profile.business ? `, ${esc(state.profile.business)}` : ""}</h1></div></div><button class="icon-btn me-btn" data-act="tab" data-t="me" aria-label="Your business and settings">${IC.user}</button></header>`;
  if (!shows.length) return `<section class="page">${head}
    <div class="hero-card empty">${mascot("happy")}<b class="h">Let's make something happen.</b><p>Tell me what you want more of. I'll come back with one campaign idea, build the Show, and help you make the first post.</p><button class="btn ink big" data-act="newshow">${IC.spark} Start your first Show</button></div>
    ${tipCard()}</section>`;
  const active = state.shows[state.settings.activeShow];
  const s = active || shows.find(x => nextMission(x).kind !== "finished") || shows[0];
  const asks = askOutcome().slice(0, 2); const others = shows.filter(x => x.id !== s.id);
  return `<section class="page home">${head}
    ${heroCard(s)}
    <div class="card tl-card"><div class="row between"><h2 class="sec">Campaign timeline</h2><button class="link sm" data-act="showtimeline" data-id="${s.id}">Open ${IC.arrow}</button></div>${weekTimeline(s, { compact: true })}</div>
    ${missionCard(s, true)}
    ${asks.map(outcomeCard).join("")}
    ${others.length ? `<div class="row between"><h2 class="sec">Your Shows</h2><button class="link sm" data-act="tab" data-t="shows">See all ${IC.arrow}</button></div>
      <div class="gallery">${others.slice(0, 6).map(miniShow).join("")}<button class="mini-show new" data-act="newshow">${IC.plus}<b>New Show</b></button></div>` : `<button class="row-card tap" data-act="newshow"><span class="ic-round">${IC.plus}</span><span class="grow"><b>New Show</b><span class="muted small">Start another campaign</span></span>${IC.arrow}</button>`}
    ${tipCard()}
    <div class="card row-card"><span class="ic-round">${IC.bell}</span><div class="grow"><b>Daily reminder</b><p class="muted small">A note when something is due. Works while the app is open on this device.</p></div>
      <button class="switch" role="switch" aria-checked="${!!state.settings.nudges}" aria-label="Daily reminder" data-act="nudges"><i></i></button></div>
  </section>`;
}
/* The active Show, big: its character, name, goal, real progress, and the way in. */
export function heroCard(s) {
  const st = s.strategy || {}; const n = s.assets.length, d = s.assets.filter(a => a.done).length; const pct = n ? Math.round(d / n * 100) : 0;
  const k = artFor(s); const A = ART[k];
  return `<div class="hero-card" style="--pbg:${A.bg};--pink:${A.ink}">
    <span class="pill-k">${state.settings.activeShow === s.id ? "Active Show" : "Your Show"}</span>
    <b class="hc-name">${esc(st.name || "New show")}</b>
    <p class="hc-goal">${esc(st.idea || GOALS[s.brief.goal]?.label || "")}</p>
    <div class="hc-row"><button class="btn ink" data-act="openshow" data-id="${s.id}">Open Show ${IC.arrow}</button>
      <span class="ring" style="--p:${pct}" role="img" aria-label="${d} of ${n} posted"><b>${pct}%</b></span><small class="hc-n">${d} of ${n}<br>posted</small></div>
    <img class="hc-art" src="art/${k}.webp" alt="" draggable="false">
  </div>`;
}
function miniShow(s) {
  const k = artFor(s); const n = s.assets.length, d = s.assets.filter(a => a.done).length; const pct = n ? Math.round(d / n * 100) : 0;
  return `<button class="mini-show" style="--pbg:${ART[k].bg}" data-act="openshow" data-id="${s.id}"><img src="art/${k}.webp" alt=""><b>${esc(s.strategy?.name || "Show")}</b><small>${esc(fmtDate(s.brief.start))} – ${esc(fmtDate(showEnd(s)))}</small><span class="bar"><i style="width:${pct}%"></i></span></button>`;
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
