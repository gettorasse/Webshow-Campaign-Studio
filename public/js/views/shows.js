/* Shows (campaigns): the list, and one show with its posts and its plan. */
import { state } from "../store.js";
import { esc, IC } from "../lib.js";
import { CHANNELS, GOALS, KINDS, PHASES } from "../../shared/model.js";
import { srOf } from "../../shared/showrunners.js";
import { daysBetween, fmtDate, todayISO } from "../../shared/util.js";
import { showsList, sortedAssets, showEnd } from "../campaign.js";

const progress = (s) => { const n = s.assets.length; const d = s.assets.filter(a => a.done).length; return { n, d, pct: n ? Math.round(d / n * 100) : 0 }; };
const range = (s) => `${fmtDate(s.brief.start)} – ${fmtDate(showEnd(s))}`;

export function showsView() {
  const list = showsList();
  return `<section class="page">
    <header class="page-h"><div><span class="eyebrow">Your campaigns</span><h1>Shows</h1></div><button class="btn go sm" data-act="newshow">${IC.plus} New</button></header>
    ${list.length ? `<div class="list gap">${list.map(showCard).join("")}</div>` : `<div class="card empty"><b class="h">No shows yet</b><p>A show is one campaign: one big idea, one goal, and every post written for you, day by day.</p><button class="btn go" data-act="newshow">${IC.spark} Create a campaign with AI</button></div>`}
  </section>`;
}
function showCard(s) {
  const p = progress(s); const st = s.strategy || {};
  return `<button class="show-card" data-act="openshow" data-id="${s.id}">
    <span class="row between"><b class="h">${esc(st.name || "New campaign")}</b>${s.status === "writing" ? `<span class="tag live">${IC.spark} Writing…</span>` : `<span class="muted small">${p.d}/${p.n}</span>`}</span>
    ${st.idea ? `<span class="idea">“${esc(st.idea)}”</span>` : ""}
    <span class="meta"><span>${esc(GOALS[s.brief.goal]?.label || "")}</span><span>${esc(range(s))}</span><span class="dots">${s.brief.channels.map(k => `<i class="dot" style="--c:${CHANNELS[k].c}" title="${CHANNELS[k].label}"></i>`).join("")}</span></span>
    <span class="bar"><i style="width:${p.pct}%"></i></span>
  </button>`;
}

export function showView(s) {
  if (!s) return `<section class="page"><header class="page-h"><button class="icon-btn" data-act="tab" data-t="shows" aria-label="Back">${IC.back}</button></header><div class="card quiet"><p>This show was deleted.</p></div></section>`;
  const st = s.strategy || {}; const tab = state.ui.showTab; const p = progress(s);
  return `<section class="page">
    <header class="page-h sticky"><button class="icon-btn" data-act="tab" data-t="shows" aria-label="Back to shows">${IC.back}</button><div class="grow"><span class="eyebrow">${esc(range(s))}</span><h1 class="sm">${esc(st.name || "New campaign")}</h1></div><button class="icon-btn" data-act="sheet" data-k="export" aria-label="Export">${IC.down}</button></header>
    ${st.idea ? `<p class="idea big">“${esc(st.idea)}”</p>` : ""}
    <div class="row between small muted"><span>${srOf(s.showrunner).name} style · ${esc(GOALS[s.brief.goal]?.label || "")}</span><span>${p.d} of ${p.n} done</span></div>
    <span class="bar"><i style="width:${p.pct}%"></i></span>
    <div class="seg" role="tablist"><button role="tab" aria-selected="${tab === "posts"}" data-act="showtab" data-t="posts">Posts</button><button role="tab" aria-selected="${tab === "plan"}" data-act="showtab" data-t="plan">Plan</button></div>
    ${tab === "plan" ? planTab(s) : postsTab(s)}
  </section>`;
}
function postsTab(s) {
  if (!s.assets.length) return `<div class="card quiet"><p>${IC.spark} Your Showrunner is planning the campaign…</p></div>`;
  const weeks = new Map(); const t = todayISO();
  for (const a of sortedAssets(s)) { const w = a.date < s.brief.start ? -1 : Math.floor(daysBetween(s.brief.start, a.date) / 7); if (!weeks.has(w)) weeks.set(w, []); weeks.get(w).push(a); }
  return [...weeks].map(([w, list]) => `<h2 class="sec">${w < 0 ? "Before it starts" : `Week ${w + 1}`}</h2><div class="list">${list.map(a => postRow(s, a, t)).join("")}</div>`).join("");
}
function postRow(s, a, t) {
  const K = KINDS[a.kind]; const ch = CHANNELS[K.ch];
  if (a.pending) return `<div class="task pending"><span class="tick"></span><span class="task-b"><span class="t shimmer">Writing ${esc(K.label.toLowerCase())}…</span><span class="m"><i class="dot" style="--c:${ch.c}"></i>${esc(fmtDate(a.date))}</span></span></div>`;
  return `<div class="task${a.done ? " done" : ""}">
    <button class="tick" data-act="toggledone" data-s="${s.id}" data-a="${a.id}" aria-pressed="${!!a.done}" aria-label="${a.done ? "Mark not done" : "Mark done"}">${IC.check}</button>
    <button class="task-b" data-act="openasset" data-s="${s.id}" data-a="${a.id}"><span class="t">${esc(a.title || K.label)}</span><span class="m"><i class="dot" style="--c:${ch.c}"></i>${esc(K.label)} · ${esc(fmtDate(a.date, { weekday: "short", day: "numeric", month: "numeric" }))}${a.date === t ? " · today" : ""}<span class="ph" style="--c:${PHASES[a.phase].c}">${PHASES[a.phase].label}</span></span></button>
  </div>`;
}
function planTab(s) {
  const st = s.strategy; if (!st) return `<div class="card quiet"><p>${IC.spark} Planning…</p></div>`;
  const row = (l, v) => v ? `<div class="kv"><span>${l}</span><p>${esc(v)}</p></div>` : "";
  return `<div class="card">${row("Tagline", st.tagline)}${row("Who it's for", st.audience)}${row("Why it works", st.insight)}${row("Message", st.message)}${row("Offer", st.offer)}${row("Call to action", st.cta)}</div>
    <h2 class="sec">The arc</h2>
    <div class="arc">${["hook", "show", "convert"].map(k => `<div class="arc-step" style="--c:${PHASES[k].c}"><b>${PHASES[k].label}</b><span class="muted small">${PHASES[k].d}</span><p>${esc(st.arc?.[k] || "")}</p></div>`).join("")}</div>
    <div class="card">${row("Voice", st.voice)}${row("Look", st.visual)}</div>
    ${st.offerIdeas?.length ? `<div class="card tip"><span class="kicker">${IC.spark} Ideas to make the offer stronger</span><ul>${st.offerIdeas.map(x => `<li>${esc(x)}</li>`).join("")}</ul><p class="muted small">Suggestions only. Nothing here is used in your posts unless you say so.</p></div>` : ""}
    <button class="btn danger ghost" data-act="deleteshow" data-id="${s.id}">${IC.trash} Delete this show</button>`;
}
