/* Create: talking with your Showrunner. A new chat starts with "What are we making happen?",
   asks two quick things, then reveals ONE campaign idea to approve. Style is a fun switch on the idea,
   not a gate. Chats live in a side panel, like ChatGPT. Every show also has its own chat. */
import { state, chatsList } from "../store.js";
import { esc, IC, mascot } from "../lib.js";
import { CHANNELS, GOALS, KINDS, MISSIONS, PACES } from "../../shared/model.js";
import { SHOWRUNNERS, SR_KEYS, srOf } from "../../shared/showrunners.js";
import { fmtDate } from "../../shared/util.js";
import { aiMode } from "../ai.js";
import { gptMark } from "./sheets.js";
import { proShow } from "../pro.js";
import { ART, artFor } from "../../shared/bridge.js";

const QUICK = ["New campaign idea", "What should I post today?", "Write a post", "Give me a tip"];
const FLOW_HINT = { goal: "Or tell me in your own words…", what: "e.g. A sauna restaurant by the sea in Helsinki", offer: "e.g. Christmas parties for work teams", tweak: "What should change? e.g. more playful, focus on gift cards" };
const QUICK_SHOW = ["What's next?", "Make the posts shorter", "Move everything a week later", "Give me a tip"];
export const currentChat = () => state.chats[state.ui.chatId];

export function chatView() {
  const c = currentChat(); if (!c) return `<section class="chat"><div class="msgs"></div></section>`;
  const show = c.showId ? state.shows[c.showId] || proShow(c.showId) : null; const r = srOf(c.showrunner); const busy = state.ui.busy;
  const title = show ? show.strategy?.name || show.name || "Show" : c.title || "New chat";
  return `<section class="chat">
    <header class="chat-h">
      <button class="icon-btn" data-act="drawer" aria-label="Chats">${IC.menu}</button>
      ${mascot(busy ? "think" : "idle", c.showrunner ? r.icon : "")}
      <div class="t grow"><b>${esc(title)}</b><span>${show ? "Show chat · " : ""}${c.showrunner ? r.role : "Your Showrunner"} · ${aiMode() === "offline" ? `<em class="demo">demo mode</em>` : "online"}</span></div>
      ${show ? `<button class="icon-btn" data-act="openshow" data-id="${show.id}" aria-label="Open the show">${IC.layers}</button>` : `<button class="icon-btn" data-act="newchat" aria-label="New chat">${IC.edit}</button>`}
    </header>
    <div class="msgs" id="msgs" aria-live="polite">${c.messages.map((m, i) => msgHTML(c, m, i)).join("")}${busy ? `<div class="msg sr fresh" role="status"><div class="answering">${mascot("think")}<span>${esc(state.ui.busyLabel || "Thinking")}</span><span class="typing" aria-hidden="true"><i></i><i></i><i></i></span></div></div>` : ""}</div>
    <div class="dock">
      ${!busy && !c.flow?.step ? `<div class="quick" role="group" aria-label="Suggestions">${(show ? QUICK_SHOW : QUICK).map(q => `<button class="chip" data-act="say" data-t="${esc(q)}">${esc(q)}</button>`).join("")}</div>` : ""}
      <form class="composer" data-form="chat"><textarea id="msg" rows="1" placeholder="${esc(FLOW_HINT[c.flow?.step] || (show ? "Ask for a change…" : "Message your Showrunner…"))}" aria-label="Message" ${busy ? "disabled" : ""}></textarea><button class="send" aria-label="Send" ${busy ? "disabled" : ""}>${IC.send}</button></form>
    </div>
  </section>`;
}

/* The side panel: new chat, your chats, and each show's chat. */
export function drawerHTML() {
  if (!state.ui.drawer) return "";
  const chats = chatsList(); const shows = Object.values(state.shows).sort((a, b) => b.createdAt - a.createdAt);
  const row = (c) => `<div class="dr-row${c.id === state.ui.chatId ? " on" : ""}"><button class="dr-b" data-act="openchat" data-id="${c.id}"><span class="sr-av xs">${IC[srOf(c.showrunner).icon]}</span><span class="grow"><b>${esc(c.title || "New chat")}</b><small>${srOf(c.showrunner).role} · ${fmtDate(new Date(c.updatedAt).toISOString().slice(0, 10))}</small></span></button><button class="icon-btn sm" data-act="delchat" data-id="${c.id}" aria-label="Delete chat">${IC.trash}</button></div>`;
  return `<div class="dr-scrim" data-act="drawer"></div><nav class="drawer" aria-label="Chats">
    <div class="dr-h"><span class="wordmark">webshow<b>.ai</b></span><button class="icon-btn" data-act="drawer" aria-label="Close">${IC.x}</button></div>
    <button class="btn go dr-new" data-act="newchat">${IC.plus} New chat</button>
    <h3 class="sec">Chats</h3>
    ${chats.length ? chats.map(row).join("") : `<p class="muted small">No chats yet.</p>`}
    ${shows.length ? `<h3 class="sec">Shows</h3>${shows.map(s => `<div class="dr-row${state.chats[state.ui.chatId]?.showId === s.id ? " on" : ""}"><button class="dr-b" data-act="showchat" data-id="${s.id}"><span class="sr-av xs show">${IC.layers}</span><span class="grow"><b>${esc(s.strategy?.name || "New show")}</b><small>Show chat · ${srOf(s.showrunner).role}</small></span></button></div>`).join("")}` : ""}
  </nav>`;
}

function msgHTML(chat, m, i) {
  if (m.role === "user") return `<div class="msg me"><div class="bubble">${esc(m.text)}</div></div>`;
  const answered = chat.messages.slice(i + 1).some(x => x.role === "user");
  return `<div class="msg sr${m.id === state.ui.fresh ? " fresh" : ""}">${m.text ? `<div class="bubble">${esc(m.text)}</div>` : ""}${(m.cards || []).map((c, k) => cardHTML(chat, c, m, k, answered)).join("")}</div>`;
}
const opText = (show, o) => {
  const t = (id) => { const a = show?.assets.find(x => x.id === id); return a ? `${a.title || KINDS[a.kind].label} (${fmtDate(a.date)})` : "a post"; };
  if (o.op === "rewrite") return `Rewrite ${o.ids.length > 2 ? `${o.ids.length} posts` : o.ids.map(t).join(" and ")}${o.note ? `: “${o.note}”` : ""}`;
  if (o.op === "move") return `Move ${t(o.id)} to ${fmtDate(o.date)}`;
  if (o.op === "shift") return `Move every post that's still to do ${Math.abs(o.days)} days ${o.days > 0 ? "later" : "earlier"}`;
  if (o.op === "strategy") return `Change the ${o.field} to “${o.value}”`;
  if (o.op === "done") return `Mark ${o.ids.length} post${o.ids.length > 1 ? "s" : ""} done`;
  return "";
};
function cardHTML(chat, c, m, k, answered) {
  const id = `data-m="${m.id}" data-c="${k}"`;
  switch (c.type) {
    case "goals": return answered ? "" : `<div class="missions">${MISSIONS.map(([k, l, ic]) => `<button class="mission-b" data-act="goal" data-k="${k}" ${id}>${IC[ic]}<b>${l}</b></button>`).join("")}</div>
      <div class="sr-row" role="group" aria-label="Who runs this Show"><span class="muted small">Run by</span><button class="chip sm${chat.showrunner ? "" : " on"}" data-act="pickrunner" data-k="">Best fit</button>${SR_KEYS.map(k => `<button class="chip sm${chat.showrunner === k ? " on" : ""}" data-act="pickrunner" data-k="${k}" title="${esc(SHOWRUNNERS[k].blurb)} ${SHOWRUNNERS[k].name} style">${SHOWRUNNERS[k].role.replace("The ", "")}</button>`).join("")}</div>`;
    case "concept": return conceptHTML(chat, c, m, k);
    case "error": return `<div class="card error"><span class="kicker">${IC.x} That didn't work</span><p>${esc(c.text)}</p>${c.retried ? "" : `<button class="btn sm" data-act="retry" ${id}>${IC.redo} Try again</button>`}</div>`;
    case "question": return answered ? "" : `<div class="opts">${c.options.map(o => `<button class="chip" data-act="say" data-t="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
    case "plan": return `<div class="card plan"><span class="kicker">${IC.layers} Campaign plan</span><b class="h">${esc(c.name)}</b>${c.idea ? `<p class="idea">“${esc(c.idea)}”</p>` : ""}
      <div class="meta"><span class="tag">${IC.target}${esc(GOALS[c.goal]?.label || "")}</span><span class="tag">${IC.cal}${c.weeks} weeks</span>${c.channels.map(k => `<span class="tag"><i class="dot" style="--c:${CHANNELS[k].c}"></i>${CHANNELS[k].label}</span>`).join("")}</div>
      ${c.showId ? `<button class="btn" data-act="openshow" data-id="${c.showId}">Open the show ${IC.arrow}</button>` : c.asked ? "" : `<button class="btn go" data-act="createplan" ${id}>${IC.spark} See the full idea</button>`}</div>`;
    case "change": { const show = state.shows[chat.showId]; const inPro = !show && proShow(chat.showId);
      return `<div class="card change"><span class="kicker">${IC.edit} Change to the show</span><b>${esc(c.summary)}</b><ul>${c.ops.map(o => `<li>${esc(opText(show || inPro?.slim, o))}</li>`).join("")}</ul>
      ${c.applied ? `<span class="tag live">${IC.check} Applied</span>` : c.dismissed ? `<span class="tag">Skipped</span>` : show && !c.ops.some(o => (o.ids || (o.id ? [o.id] : [])).some(x => show.assets.some(a => a.id === x)) || o.op === "shift" || o.op === "strategy") ? `<p class="muted small">${IC.desktop} Proposed for the Pro canvas: apply it in Webshow Pro.</p>` : inPro ? `<p class="muted small">${IC.desktop} This Show lives on the Webshow Pro canvas: apply it there, in the Showrunner panel.</p>` : `<div class="row"><button class="btn go sm" data-act="applychange" ${id}>${IC.check} Apply</button><button class="btn sm" data-act="skipchange" ${id}>Not now</button></div>`}</div>`; }
    case "post": return `<div class="card post"><span class="kicker"><i class="dot" style="--c:${CHANNELS[c.channel].c}"></i>${CHANNELS[c.channel].label} post</span>${c.hook ? `<b class="h">${esc(c.hook)}</b>` : ""}<p class="pre">${esc(c.text)}</p>${c.cta ? `<p class="cta">${esc(c.cta)}</p>` : ""}
      ${c.image_prompt ? `<details class="img"><summary>${IC.image} Picture idea</summary><p class="pre">${esc(c.image_prompt)}</p></details>` : ""}
      <div class="row"><button class="btn sm go" data-act="copypost" ${id}>${IC.copy} Copy text</button><button class="btn sm gpt" data-act="gptpost" ${id}>${gptMark()} Image in ChatGPT</button></div></div>`;
    case "tip": return `<div class="card tip"><span class="kicker">${IC.spark} ${esc(c.title || "Tip")}</span><p>${esc(c.text)}</p></div>`;
    case "remembered": return `<div class="mem">${IC.brain}<span>Remembered: ${c.items.map(esc).join("; ")}</span><button class="link" data-act="openme">Edit</button></div>`;
    case "open": return `<button class="btn" data-act="openshow" data-id="${c.showId}">Open “${esc(c.name)}” ${IC.arrow}</button>`;
  }
  return "";
}

/* ---------- the big reveal: one idea, as a poster ---------- */
/* A Show's poster: its own character on a soft pastel, the name in bold. The same art follows the Show into Pro. */
export function posterHTML(c, small, kicker) {
  const k = artFor(c); const A = ART[k];
  return `<div class="poster art${small ? " sm" : ""}" style="--pbg:${A.bg};--pink:${A.ink}"><span class="p-k">${esc(kicker || GOALS[c.goal]?.label || "Campaign")}</span><b class="p-name">${esc(c.name)}</b>${c.hook ? `<span class="p-hook">“${esc(c.hook)}”</span>` : ""}<img class="p-art" src="art/${k}.webp" alt="" draggable="false"></div>`;
}
function conceptHTML(chat, c, m, k) {
  const x = c.concept; const id = `data-m="${m.id}" data-c="${k}"`; const r = srOf(c.showrunner);
  if (c.state === "replaced") return `<div class="card quiet small">“${esc(x.name)}” · <button class="link sm" data-act="reuseconcept" ${id}>Bring it back</button></div>`;
  const row = (l, v) => v ? `<div class="kv"><span>${l}</span><p>${esc(v)}</p></div>` : "";
  return `<div class="card concept">
    ${posterHTML(x)}
    ${x.source === "demo" ? `<p class="demo-note">${IC.spark} Demo idea, written without AI from what you told me. Connect the AI for the real thing.</p>` : ""}
    <p class="c-idea">${esc(x.idea)}</p>
    ${x.message ? `<p class="c-msg">${esc(x.message)}</p>` : ""}
    ${row("Who it's for", x.audience)}${row("Why it'll work", x.why)}${row("The look", x.visual)}
    <div class="meta"><span class="tag">${IC.target}${esc(GOALS[x.goal]?.label || "")}</span><span class="tag">${IC.cal}${x.weeks} weeks</span>${(x.channels || []).map(ch => `<span class="tag"><i class="dot" style="--c:${CHANNELS[ch]?.c}"></i>${CHANNELS[ch]?.label}</span>`).join("")}</div>
    ${c.state === "approved" ? `<button class="btn" data-act="openshow" data-id="${c.showId}">${IC.layers} Open the show ${IC.arrow}</button>`
      : c.state === "pace" ? `<div class="pace"><b>How much can you post?</b><span class="muted small">Be honest. A show you finish beats a big one you don't.</span>${Object.entries(PACES).map(([p, v]) => `<button class="pace-b" data-act="pace" data-v="${p}" ${id}><b>${v.label}</b><span>${v.d}</span></button>`).join("")}</div>`
      : `<div class="c-acts"><button class="btn go big" data-act="makeit" ${id}>${IC.spark} Let's make it</button><div class="row"><button class="btn sm" data-act="another" ${id}>${IC.redo} Different angle</button><button class="btn sm" data-act="tweak" ${id}>${IC.edit} Tweak it</button></div></div>
      <div class="c-style"><span class="muted small">Run by ${r.role} · ${r.name} style</span><div class="row">${SR_KEYS.filter(s => s !== c.showrunner).map(s => `<button class="chip sm" data-act="restyle" data-k="${s}" ${id}>Try ${SHOWRUNNERS[s].role}</button>`).join("")}</div></div>`}
  </div>`;
}

/* ---------- the production: a new Show coming together, tied to real steps ---------- */
const STEPS = [["Finding your big idea", "Approved"], ["Setting the stage", "Hook, Show and Convert, on a calendar"], ["Building your Show", ""]];
export function stageHTML() {
  const b = state.ui.build; if (!b) return "";
  const x = b.concept; const r = srOf(b.sr); const show = b.showId ? state.shows[b.showId] : null;
  if (b.stage === 4 && show) {
    const first = show.assets.find(a => a.source !== "failed" && !KINDS[a.kind].evergreen) || show.assets[0];
    return `<div class="stage-ov reveal" role="dialog" aria-modal="true" aria-label="Your new Show">
      <div class="st-in">
        ${posterHTML({ ...x, name: show.strategy.name, art: show.art }, false, "New Show")}
        <div class="st-welcome">${mascot("happy", r.icon)}<p><b>Welcome to “${esc(show.strategy.name)}”.</b> ${show.status === "partial" ? "Some posts didn't get written; you can retry them inside, nothing is lost." : `${show.assets.length} posts, Hook to Convert. Let's start with your first post${first ? `, an ${esc(KINDS[first.kind].label)}`.replace(/an (?=[^AEIOU])/, "a ") : ""}.`}</p></div>
        <p class="st-idea">${esc(x.idea)}</p>
        <button class="btn go big" data-act="enterShow">${IC.arrow} Enter your Show</button>
      </div></div>`;
  }
  const label3 = b.total ? `${b.done} of ${b.total} posts written` : "Writing your posts";
  return `<div class="stage-ov" role="status" aria-live="polite" aria-label="Building your Show">
    <div class="st-in">
      <div class="st-poster s${b.stage}">${posterHTML(x)}<div class="st-cards">${["hook", "show", "convert"].map((k, i) => `<span class="st-card" style="--i:${i}">${["Hook", "Show", "Convert"][i]}</span>`).join("")}</div></div>
      <ol class="st-steps">${STEPS.map(([t, d], i) => { const n = i + 1; const st = b.stage > n ? "ok" : b.stage === n ? "on" : ""; return `<li class="${st}"><span class="b">${st === "ok" ? IC.check : st === "on" ? `<i class="spin"></i>` : ""}</span><span><b>${t}</b><small>${n === 3 ? (b.stage >= 3 ? label3 : "") : d}</small></span></li>`; }).join("")}</ol>
      <p class="muted small st-by">${mascot("think", r.icon)} ${esc(r.role)} is running this production</p>
    </div></div>`;
}
