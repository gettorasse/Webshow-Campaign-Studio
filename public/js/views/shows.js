/* Shows (campaigns): the list as posters, and one show as a journey: Hook → Show → Convert,
   each stage a short list of missions, with the next one up front. */
import { state } from "../store.js";
import { esc, IC, mascot } from "../lib.js";
import { CHANNELS, GOALS, KINDS, PHASES } from "../../shared/model.js";
import { srOf } from "../../shared/showrunners.js";
import { fmtDate, todayISO } from "../../shared/util.js";
import { showsList, sortedAssets, showEnd, failedOf } from "../campaign.js";
import { afterOf, afterLine, AFTER_TYPES, AFTER_FIELDS } from "../../shared/make.js";
import { posterHTML } from "./chat.js";
import { missionCard } from "./today.js";

const progress = (s) => { const n = s.assets.length; const d = s.assets.filter(a => a.done).length; return { n, d, pct: n ? Math.round(d / n * 100) : 0 }; };
const range = (s) => `${fmtDate(s.brief.start)} – ${fmtDate(showEnd(s))}`;
const STAGES = [["hook", "Hook", "Make them notice"], ["show", "Show", "Show what it's like"], ["convert", "Convert", "Ask them to act"]];
const stageOf = (a) => a.phase === "always" ? "hook" : a.phase;

export function showsView() {
  const list = showsList();
  return `<section class="page">
    <header class="page-h"><div><span class="eyebrow">Your campaigns</span><h1>Shows</h1></div><div class="row"><button class="btn go sm" data-act="newshow">${IC.plus} New</button><button class="icon-btn me-btn" data-act="tab" data-t="me" aria-label="Your business and settings">${IC.user}</button></div></header>
    ${list.length ? `<div class="show-grid">${list.map(showCard).join("")}</div>` : `<div class="card empty hero">${mascot("idle")}<b class="h">No shows yet</b><p>A show is one campaign: one big idea, one goal, and posts you can actually keep up with.</p><button class="btn go big" data-act="newshow">${IC.spark} Start a campaign</button></div>`}
  </section>`;
}
function showCard(s) {
  const p = progress(s); const st = s.strategy || {}; const f = failedOf(s).length;
  const status = s.status === "writing" ? `<span class="tag live">${IC.spark} Writing…</span>` : f ? `<span class="tag warn">${f} to retry</span>` : p.d === p.n ? `<span class="tag live">${IC.check} Complete</span>` : `<span class="muted small">${p.d} of ${p.n} posted</span>`;
  return `<button class="show-card" data-act="openshow" data-id="${s.id}">
    ${posterHTML({ ...st, goal: s.brief.goal, name: st.name || "New campaign" }, true)}
    <span class="row between">${status}${s.source === "demo" ? `<em class="demo">demo</em>` : ""}</span>
    <span class="meta"><span>${esc(range(s))}</span><span class="dots">${s.brief.channels.map(k => `<i class="dot" style="--c:${CHANNELS[k].c}" title="${CHANNELS[k].label}"></i>`).join("")}</span></span>
    <span class="bar"><i style="width:${p.pct}%"></i></span>
  </button>`;
}

export function showView(s) {
  if (!s) return `<section class="page"><header class="page-h"><button class="icon-btn" data-act="tab" data-t="shows" aria-label="Back">${IC.back}</button></header><div class="card quiet"><p>This show was deleted.</p></div></section>`;
  const st = s.strategy || {}; const tab = state.ui.showTab === "plan" ? "plan" : "journey"; const r = srOf(s.showrunner);
  return `<section class="page">
    <header class="page-h sticky"><button class="icon-btn" data-act="tab" data-t="shows" aria-label="Back to shows">${IC.back}</button><div class="grow"><span class="eyebrow">${esc(range(s))}</span><h1 class="sm">${esc(st.name || "New campaign")}</h1></div><button class="icon-btn" data-act="sheet" data-k="export" aria-label="Export">${IC.down}</button></header>
    ${posterHTML({ ...st, goal: s.brief.goal, name: st.name || "New campaign" })}
    ${s.source === "demo" ? `<p class="demo-note">${IC.spark} Demo show: the idea and posts were written without AI. Connect the AI for real copy.</p>` : ""}
    ${missionCard(s, true)}
    <div class="seg" role="tablist"><button role="tab" aria-selected="${tab === "journey"}" data-act="showtab" data-t="journey">Journey</button><button role="tab" aria-selected="${tab === "plan"}" data-act="showtab" data-t="plan">The idea</button></div>
    ${tab === "plan" ? planTab(s) : journeyTab(s)}
    <button class="row-card tap talk" data-act="showchat" data-id="${s.id}">${mascot("idle", r.icon)}<span class="grow"><b>Talk about this show</b><span class="muted small">Ask ${esc(r.role)} to change the tone, the dates or the idea</span></span>${IC.chat}</button>
  </section>`;
}
function journeyTab(s) {
  if (!s.assets.length) return `<div class="card quiet"><p>${IC.spark} Your Showrunner is planning the campaign…</p></div>`;
  const all = sortedAssets(s); const t = todayISO();
  const cur = state.ui.stage || STAGES.find(([k]) => all.some(a => stageOf(a) === k && !a.done))?.[0] || "convert";
  return `<div class="stages" role="tablist">${STAGES.map(([k, l, d]) => { const list = all.filter(a => stageOf(a) === k); const done = list.filter(a => a.done).length;
      return `<button role="tab" class="stage${k === cur ? " on" : ""}${list.length && done === list.length ? " done" : ""}" style="--c:${PHASES[k].c}" aria-selected="${k === cur}" data-act="stage" data-k="${k}"><b>${l}</b><small>${d}</small><span class="st-n">${list.length && done === list.length ? IC.check : `${done}/${list.length}`}</span></button>`; }).join("")}</div>
    <div class="list">${all.filter(a => stageOf(a) === cur).map(a => postRow(s, a, t)).join("") || `<p class="muted small pad">Nothing in this stage.</p>`}</div>`;
}
const STATUS = (a, t) => a.source === "failed" ? `<span class="pill warn">Retry</span>` : a.done ? `<span class="pill ok">${a.outcome?.got ? "Got responses" : "Posted"}</span>` : a.date < t && !KINDS[a.kind].evergreen ? `<span class="pill late">Late</span>` : a.hasPhoto || a.imageSaved ? `<span class="pill ready">Ready</span>` : a.source === "demo" ? `<span class="pill">Demo draft</span>` : `<span class="pill">Draft</span>`;
function postRow(s, a, t) {
  const K = KINDS[a.kind]; const ch = CHANNELS[K.ch];
  if (a.pending) return `<div class="task pending"><span class="tick"></span><span class="task-b"><span class="t shimmer">Writing ${esc(K.label.toLowerCase())}…</span><span class="m"><i class="dot" style="--c:${ch.c}"></i>${esc(fmtDate(a.date))}</span></span></div>`;
  return `<div class="task${a.done ? " done" : ""}">
    <button class="tick" data-act="toggledone" data-s="${s.id}" data-a="${a.id}" aria-pressed="${!!a.done}" aria-label="${a.done ? "Mark not posted" : "Mark posted"}" ${a.source === "failed" ? "disabled" : ""}>${IC.check}</button>
    <button class="task-b" data-act="openasset" data-s="${s.id}" data-a="${a.id}"><span class="t">${esc(a.source === "failed" ? `${K.label} didn't get written` : a.title || K.label)}</span><span class="m"><i class="dot" style="--c:${ch.c}"></i>${esc(K.label)} · ${esc(K.evergreen ? "before it starts" : fmtDate(a.date, { weekday: "short", day: "numeric", month: "numeric" }))}${a.date === t ? " · today" : ""}${STATUS(a, t)}</span></button>
  </div>`;
}
function planTab(s) {
  const st = s.strategy; if (!st) return `<div class="card quiet"><p>${IC.spark} Planning…</p></div>`;
  const row = (l, v) => v ? `<div class="kv"><span>${l}</span><p>${esc(v)}</p></div>` : "";
  return `<div class="card">${st.why ? row("Why it'll work", st.why) : row("Tagline", st.tagline)}${row("Who it's for", st.audience)}${row("The insight", st.insight)}${row("Message", st.message)}${row("Offer", st.offer)}${row("Call to action", st.cta)}</div>
    <h2 class="sec">The arc</h2>
    <div class="arc">${["hook", "show", "convert"].map(k => `<div class="arc-step" style="--c:${PHASES[k].c}"><b>${PHASES[k].label}</b><span class="muted small">${PHASES[k].d}</span><p>${esc(st.arc?.[k] || "")}</p></div>`).join("")}</div>
    <div class="card">${row("Voice", st.voice)}${row("Look", st.visual)}</div>
    ${afterCard(s)}
    ${st.offerIdeas?.length ? `<div class="card tip"><span class="kicker">${IC.spark} Ideas to make the offer stronger</span><ul>${st.offerIdeas.map(x => `<li>${esc(x)}</li>`).join("")}</ul><p class="muted small">Suggestions only. Nothing here is used in your posts unless you say so.</p></div>` : ""}
    <button class="btn danger ghost" data-act="deleteshow" data-id="${s.id}">${IC.trash} Delete this show</button>`;
}

/* What happens after someone taps the button: used by the landing page, emails and every prompt. */
function afterCard(s) {
  const af = afterOf(s, state.profile); const inp = (k, l, ph, type = "text") => `<label class="field"><span>${l}</span><input type="${type}" data-after="${k}" data-s="${s.id}" value="${esc(af[k] || "")}" placeholder="${esc(ph)}"></label>`;
  return `<h2 class="sec" id="after">After the button</h2>
  <div class="card form">
    <p class="muted small">What happens when someone taps “${esc(s.strategy?.cta || "the button")}”. Your landing page, emails and ChatGPT prompts all use this.</p>
    <div class="seg sm">${AFTER_TYPES.map(([v, l]) => `<button aria-pressed="${af.type === v}" data-act="aftertype" data-v="${v}" data-s="${s.id}">${l}</button>`).join("")}</div>
    ${af.type === "link" ? inp("url", "Link", "https://… booking page, shop or website", "url") : ""}
    ${af.type === "call" ? inp("phone", "Phone number", "+358 …", "tel") : ""}
    ${af.type === "form" ? `${inp("title", "Form title", "Book your spot")}<span class="lbl">Fields</span><div class="chips">${AFTER_FIELDS.map(([k, l]) => `<button class="chip" aria-pressed="${af.fields.includes(k)}" data-act="afterfield" data-f="${k}" data-s="${s.id}">${l}</button>`).join("")}</div>${inp("thanks", "Thank-you message", "Thanks! We'll be in touch.")}` : ""}
    ${af.type !== "link" ? inp("email", af.type === "form" ? "Send answers to" : "Email (optional)", "you@business.fi", "email") : ""}
    <p class="small muted" data-afterline>${esc(afterLine(af))}</p>
  </div>`;
}
