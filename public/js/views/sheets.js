/* Bottom sheets: one post, export a show, plans. */
import { state } from "../store.js";
import { esc, IC } from "../lib.js";
import { CHANNELS, FORMATS, KINDS, PHASES } from "../../shared/model.js";
import { fmtDate } from "../../shared/util.js";
import { APP_PLANS, STUDIO_PLANS, euro } from "../../shared/plans.js";

export function sheetHTML() {
  const sh = state.ui.sheet; if (!sh) return "";
  const body = sh.k === "asset" ? assetSheet(sh) : sh.k === "export" ? exportSheet() : sh.k === "plans" ? plansSheet() : "";
  if (!body) return "";
  return `<div class="scrim" data-act="closesheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(sh.k)}"><div class="grab"></div>${body}</div>`;
}
export const findAsset = (sid, aid) => { const s = state.shows[sid]; return { s, a: s?.assets.find(x => x.id === aid) }; };

function assetSheet({ s: sid, a: aid }) {
  const { s, a } = findAsset(sid, aid); if (!a) return "";
  const K = KINDS[a.kind]; const ch = CHANNELS[K.ch]; const ids = `data-s="${sid}" data-a="${aid}"`;
  const head = `<header class="sheet-h"><div class="grow"><span class="kicker"><i class="dot" style="--c:${ch.c}"></i>${esc(K.label)} · <span style="color:${PHASES[a.phase].c}">${PHASES[a.phase].label}</span></span><h2>${esc(a.title || K.label)}</h2></div><button class="icon-btn" data-act="closesheet" aria-label="Close">${IC.x}</button></header>`;
  if (a.pending) return head + `<div class="card quiet"><p class="shimmer">${IC.spark} Your Showrunner is writing this…</p></div>`;
  return head + `
    <div class="when"><span>${IC.cal}</span><input type="date" value="${a.date}" data-act-change="movedate" ${ids} aria-label="Date">${a.time ? `<span class="muted">${a.time}</span>` : ""}${a.end ? `<span class="muted small">until ${esc(fmtDate(a.end))}</span>` : ""}</div>
    <p class="todo">${IC.target} ${esc(a.action)}</p>
    ${a.goal ? `<p class="muted small">${esc(a.goal)}</p>` : ""}
    <div class="fields">${K.fields.map(([k, l, rows]) => `<label class="field"><span class="row between">${l}<button class="link sm" data-act="copyfield" data-f="${k}" ${ids}>${IC.copy} Copy</button></span><textarea rows="${Math.min(rows, Math.max(1, Math.ceil(String(a.fields[k] || "").length / 38)))}" data-field="${k}" ${ids}>${esc(a.fields[k])}</textarea></label>`).join("")}</div>
    ${a.image ? `<div class="card img-p"><span class="kicker">${IC.image} Image prompt ${K.fmt ? `<span class="muted">· ${FORMATS[K.fmt].label}</span>` : ""}</span><p class="pre mono small">${esc(a.image)}</p><p class="muted small">This is a prompt for a photo or an image tool, not a finished image.</p><button class="btn sm" data-act="copyimage" ${ids}>${IC.copy} Copy prompt</button></div>` : ""}
    <div class="sheet-actions">
      <button class="btn go" data-act="copyasset" ${ids}>${IC.copy} Copy text</button>
      <button class="btn" data-act="toggledone" ${ids}>${IC.check} ${a.done ? "Mark not done" : "Mark done"}</button>
    </div>
    <form class="rewrite" data-form="rewrite" ${ids}><input name="note" placeholder="Ask for a change: shorter, funnier, mention the terrace…" aria-label="What to change"><button class="btn sm">${IC.redo} Rewrite</button></form>`;
}
function exportSheet() {
  const s = state.shows[state.ui.showId]; if (!s) return "";
  const b = (k, ic, t, d) => `<button class="row-card tap" data-act="export" data-k="${k}"><span class="ic-round">${IC[ic]}</span><span class="grow"><b>${t}</b><span class="muted small">${d}</span></span>${IC.down}</button>`;
  return `<header class="sheet-h"><div class="grow"><span class="kicker">Export</span><h2>${esc(s.strategy?.name || "Show")}</h2></div><button class="icon-btn" data-act="closesheet" aria-label="Close">${IC.x}</button></header>
    <div class="list">${b("md", "doc", "All posts as text", "Markdown. Opens in Notes, Docs or Word")}${b("ics", "cal", "Add to calendar", "Every post as a reminder (.ics)")}${b("csv", "table", "Spreadsheet", "Dates, channels and to-dos (.csv)")}${b("json", "layers", "Campaign file", "For Webshow Pro on desktop (.json)")}</div>`;
}
function plansSheet() {
  const cur = state.settings.plan;
  const card = (p) => `<div class="plan-card${p.key === cur ? " on" : ""}"><div class="row between"><b class="h">${p.name}</b><span class="price">${euro(p.price)}<small>/${p.per === "once" ? "one-off" : "mo"}</small></span></div><p class="muted small">${p.for}${p.draft ? " · price to be confirmed" : ""}</p><ul>${p.points.map(x => `<li>${IC.check}${x}</li>`).join("")}</ul>${p.key === cur ? `<span class="tag">Current plan</span>` : `<button class="btn sm${p.key === "starter" ? "" : " go"}" data-act="setplan" data-k="${p.key}">Choose ${p.name}</button>`}</div>`;
  return `<header class="sheet-h"><div class="grow"><span class="kicker">Demo · no payment is taken</span><h2>Plans</h2></div><button class="icon-btn" data-act="closesheet" aria-label="Close">${IC.x}</button></header>
    <h3 class="sec">The app</h3>${APP_PLANS.map(card).join("")}
    <h3 class="sec">Done for you by Webshow Studio</h3><p class="muted small">A human team that works with AI, for businesses that want it handled.</p>${STUDIO_PLANS.map(card).join("")}`;
}
