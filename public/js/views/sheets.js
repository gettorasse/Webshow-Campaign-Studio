/* Bottom sheets: one post, export a show, plans. */
import { state } from "../store.js";
import { esc, IC } from "../lib.js";
import { CHANNELS, FORMATS, KINDS, PHASES } from "../../shared/model.js";
import { fmtDate } from "../../shared/util.js";
import { APP_PLANS, STUDIO_PLANS, euro, priceText } from "../../shared/plans.js";
import { buildPrompts, lookOf, fmtOf, afterOf, afterLine, VISUAL_KINDS, LOOK_POS, LOOK_FONT, LOOK_SIZE, LOOK_BG, LOOK_COLORS } from "../../shared/make.js";
import { photoURL, FONT_CSS, SIZE_K, isLight } from "../photos.js";

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
  const tab = state.ui.sheet.t || "make";
  return head + `
    <div class="when"><span>${IC.cal}</span><input type="date" value="${a.date}" data-act-change="movedate" ${ids} aria-label="Date">${a.time ? `<span class="muted">${a.time}</span>` : ""}${a.end ? `<span class="muted small">until ${esc(fmtDate(a.end))}</span>` : ""}</div>
    <p class="todo">${IC.target} ${esc(a.action)}</p>
    <div class="seg" role="tablist"><button role="tab" aria-selected="${tab === "make"}" data-act="sheettab" data-t="make">${IC.wand} Make it</button><button role="tab" aria-selected="${tab === "text"}" data-act="sheettab" data-t="text">${IC.doc} Post text</button></div>
    ${tab === "text" ? `
    ${a.goal ? `<p class="muted small">${esc(a.goal)}</p>` : ""}
    <div class="fields">${K.fields.map(([k, l, rows]) => `<label class="field"><span class="row between">${l}<button class="link sm" data-act="copyfield" data-f="${k}" ${ids}>${IC.copy} Copy</button></span><textarea rows="${rows}" data-field="${k}" ${ids}>${esc(a.fields[k])}</textarea></label>`).join("")}</div>
    <form class="rewrite" data-form="rewrite" ${ids}><input name="note" placeholder="Ask for a change: shorter, funnier, mention the terrace…" aria-label="What to change"><button class="btn sm">${IC.redo} Rewrite</button></form>` : `<div id="make">${makeHTML(s, a)}</div>`}
    <div class="sheet-actions">
      <button class="btn go" data-act="copyasset" ${ids}>${IC.copy} Copy text</button>
      <button class="btn" data-act="toggledone" ${ids}>${IC.check} ${a.done ? "Mark not done" : "Mark done"}</button>
    </div>`;
}

/* ---------- Make it: preview, text-on-image settings, and the prompts for ChatGPT ---------- */
export const gptMark = () => state.ui.gptLogo ? `<img class="gpt-logo" src="brand/chatgpt.svg" alt="">` : `<span class="gpt-ic">${IC.chat}</span>`;
export function makeHTML(s, a) {
  const ids = `data-s="${s.id}" data-a="${a.id}"`; const visual = VISUAL_KINDS.includes(a.kind); const look = lookOf(a);
  const seg = (k, opts) => `<div class="seg sm">${opts.map(([v, l]) => `<button aria-pressed="${look[k] === v}" data-act="setlook" data-k="${k}" data-v="${v}" ${ids}>${l}</button>`).join("")}</div>`;
  const photo = photoURL(a.id);
  return `${visual ? `
    <div class="mk">
      <div id="mk-prev">${previewHTML(a)}</div>
      <div class="row">
        <label class="btn sm">${IC.image} ${photo ? "Change photo" : "Add your photo"}<input type="file" accept="image/*" data-act-change="photo" ${ids} hidden></label>
        ${photo ? `<button class="btn sm go" data-act="saveimage" ${ids}>${IC.down} Save image</button><button class="icon-btn sm" data-act="rmphoto" ${ids} aria-label="Remove photo">${IC.trash}</button>` : ""}
      </div>
      <p class="muted small">${photo ? "Save image gives you the finished post with your text on it. For a more polished result, use the ChatGPT prompt below with the same photo." : "Add a photo from your phone to see the post here, or let ChatGPT make it."}</p>
    </div>
    <details class="card look" ${state.ui.lookOpen ? "open" : ""}><summary><b>${IC.edit} Text on the image</b><span class="muted small">The prompt updates as you change these</span></summary>
      <div class="set-col">
        <span class="lbl">Photo</span>${seg("photo", [["own", "My photo"], ["make", "Let ChatGPT make it"]])}
        <label class="field"><span>Headline on the image</span><input data-look="headline" ${ids} value="${esc(look.headline)}"></label>
        <label class="field"><span>Second line (optional)</span><input data-look="sub" ${ids} value="${esc(look.sub)}" placeholder="e.g. ${esc(s.strategy?.cta || "Book now")}"></label>
        <span class="lbl">Position</span>${seg("pos", LOOK_POS)}
        <span class="lbl">Style</span>${seg("font", LOOK_FONT)}
        <span class="lbl">Size</span>${seg("size", LOOK_SIZE)}
        <span class="lbl">Behind the text</span>${seg("bg", LOOK_BG)}
        <span class="lbl">Colour</span><div class="swatches">${LOOK_COLORS.map(c => `<button class="sw" style="--c:${c}" aria-label="Colour ${c}" aria-pressed="${look.color.toLowerCase() === c}" data-act="setlook" data-k="color" data-v="${c}" ${ids}></button>`).join("")}<label class="sw custom" aria-label="Pick a colour"><input type="color" value="${esc(look.color)}" data-look="color" ${ids}></label></div>
      </div>
    </details>` : ""}
    ${a.kind === "landing" || a.kind === "email" ? `<div class="card quiet small after-note"><b>After the button:</b> ${esc(afterLine(afterOf(s, state.profile)))} <button class="link sm" data-act="editafter">Change</button></div>` : ""}
    <div id="mk-prompts">${promptsHTML(s, a)}</div>`;
}
export function promptsHTML(s, a) {
  const ids = `data-s="${s.id}" data-a="${a.id}"`;
  return buildPrompts(a, s, state.profile).map((p, i) => `<div class="card prompt">
    <div class="row between"><b>${esc(p.label)}</b>${p.photo ? `<span class="tag">${IC.image} Your photo</span>` : ""}</div>
    <p class="muted small">${esc(p.hint)}</p>
    <details><summary class="small muted">See the prompt</summary><p class="pre mono small">${esc(p.text)}</p></details>
    <div class="row"><button class="btn gpt" data-act="gpt" data-i="${i}" ${ids}>${gptMark()} Copy to ChatGPT</button><button class="btn sm" data-act="copyp" data-i="${i}" ${ids}>${IC.copy} Copy only</button></div>
  </div>`).join("");
}
/* The same composition as renderPost(), in CSS: cqw units scale with the preview's width. */
export function previewHTML(a) {
  const look = lookOf(a), fmt = fmtOf(a), r = fmt.h / fmt.w, photo = photoURL(a.id), vertical = r > 1.5;
  const k = SIZE_K[look.size] || SIZE_K.l; const font = (FONT_CSS[look.font] || FONT_CSS.bold).replace("1em", (k * 100).toFixed(2) + "cqw");
  const contrast = isLight(look.color) ? "rgba(11,11,16,.9)" : "rgba(255,255,255,.92)";
  const pt = vertical ? 14 * r : 6, pb = vertical ? 20 * r : 6;
  return `<div class="mk-prev bg-${look.bg} pos-${look.pos}" style="aspect-ratio:${fmt.w}/${fmt.h};${photo ? `background-image:url('${photo}')` : ""};--tc:${look.color};--band:${contrast}">
    ${photo ? "" : `<span class="mk-empty">${IC.image}<span>${look.photo === "make" ? "ChatGPT makes the photo" : "Your photo"}</span><small>${fmt.w} × ${fmt.h}</small></span>`}
    <div class="mk-txt" style="padding:${pt.toFixed(1)}cqw 6cqw ${pb.toFixed(1)}cqw"><div class="mk-box"><div class="mk-h" style="font:${esc(font)}">${esc(look.headline)}</div>${look.sub ? `<div class="mk-s" style="font:${esc(font.replace(/[\d.]+cqw/, (k * 48).toFixed(2) + "cqw"))}">${esc(look.sub)}</div>` : ""}</div></div>
  </div>`;
}
function exportSheet() {
  const s = state.shows[state.ui.showId]; if (!s) return "";
  const b = (k, ic, t, d) => `<button class="row-card tap" data-act="export" data-k="${k}"><span class="ic-round">${IC[ic]}</span><span class="grow"><b>${t}</b><span class="muted small">${d}</span></span>${IC.down}</button>`;
  return `<header class="sheet-h"><div class="grow"><span class="kicker">Export</span><h2>${esc(s.strategy?.name || "Show")}</h2></div><button class="icon-btn" data-act="closesheet" aria-label="Close">${IC.x}</button></header>
    <div class="list">${b("md", "doc", "All posts as text", "Markdown. Opens in Notes, Docs or Word")}${b("ics", "cal", "Add to calendar", "Every post as a reminder (.ics)")}${b("csv", "table", "Spreadsheet", "Dates, channels and to-dos (.csv)")}${b("json", "layers", "Campaign file", "For Webshow Pro on desktop (.json)")}</div>`;
}
function plansSheet() {
  const cur = state.settings.plan;
  const card = (p) => `<div class="plan-card${p.key === cur ? " on" : ""}"><div class="row between"><b class="h">${p.name}</b><span class="price">${p.price === 0 ? priceText(p) : `${euro(p.price)}<small>/${p.per === "once" ? "one-off" : "mo"}</small>`}</span></div><p class="muted small">${p.for}</p><ul>${p.points.map(x => `<li>${IC.check}${x}</li>`).join("")}</ul>${p.key === cur ? `<span class="tag">Current plan</span>` : `<button class="btn sm${p.key === "starter" ? "" : " go"}" data-act="setplan" data-k="${p.key}">Choose ${p.name}</button>`}</div>`;
  return `<header class="sheet-h"><div class="grow"><span class="kicker">Demo · no payment is taken</span><h2>Plans</h2></div><button class="icon-btn" data-act="closesheet" aria-label="Close">${IC.x}</button></header>
    <h3 class="sec">The app</h3>${APP_PLANS.map(card).join("")}
    <h3 class="sec">Done for you</h3><p class="muted small">A human team that works with AI, for businesses that want it handled.</p>${STUDIO_PLANS.map(card).join("")}`;
}
