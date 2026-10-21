/* Showrunner chats. Each chat starts with "Who's running your show?", then opens.
   Chats live in a side panel, like ChatGPT. Every show also has its own chat. */
import { state, chatsList } from "../store.js";
import { esc, IC } from "../lib.js";
import { CHANNELS, GOALS, KINDS } from "../../shared/model.js";
import { SHOWRUNNERS, SR_KEYS, srOf } from "../../shared/showrunners.js";
import { fmtDate } from "../../shared/util.js";
import { aiMode } from "../ai.js";
import { gptMark } from "./sheets.js";

const QUICK = ["Plan a campaign", "What should I post today?", "Write a post", "Give me a tip"];
const QUICK_SHOW = ["What's next?", "Make the posts shorter", "Move everything a week later", "Give me a tip"];
export const currentChat = () => state.chats[state.ui.chatId];

export function chatView() {
  const c = currentChat(); if (!c) return pickerView();
  const show = c.showId ? state.shows[c.showId] : null; const r = srOf(c.showrunner); const busy = state.ui.busy;
  const title = show ? show.strategy?.name || "Show" : c.title || "New chat";
  return `<section class="chat">
    <header class="chat-h">
      <button class="icon-btn" data-act="drawer" aria-label="Chats">${IC.menu}</button>
      <span class="sr-av sm">${IC[r.icon]}</span>
      <div class="t grow"><b>${esc(title)}</b><span>${show ? `Show chat · ${r.name}` : r.name} · ${aiMode() === "offline" ? "demo mode" : "online"}</span></div>
      ${show ? `<button class="icon-btn" data-act="openshow" data-id="${show.id}" aria-label="Open the show">${IC.layers}</button>` : `<button class="icon-btn" data-act="newchat" aria-label="New chat">${IC.edit}</button>`}
    </header>
    <div class="msgs" id="msgs" aria-live="polite">${c.messages.map((m, i) => msgHTML(c, m, i)).join("")}${busy ? `<div class="msg sr fresh" role="status"><div class="answering"><span class="sr-av sm">${IC[r.icon]}</span><span>${r.name} is answering</span><span class="typing" aria-hidden="true"><i></i><i></i><i></i></span></div></div>` : ""}</div>
    <div class="dock">
      ${!busy ? `<div class="quick" role="group" aria-label="Suggestions">${(show ? QUICK_SHOW : QUICK).map(q => `<button class="chip" data-act="say" data-t="${esc(q)}">${esc(q)}</button>`).join("")}</div>` : ""}
      <form class="composer" data-form="chat"><textarea id="msg" rows="1" placeholder="${show ? "Ask for a change…" : `Message ${r.name}…`}" aria-label="Message" ${busy ? "disabled" : ""}></textarea><button class="send" aria-label="Send" ${busy ? "disabled" : ""}>${IC.send}</button></form>
    </div>
  </section>`;
}

/* A new chat: pick who runs the show first. */
function pickerView() {
  const has = chatsList().length + Object.keys(state.shows).length;
  return `<section class="chat picker">
    <header class="chat-h">${has ? `<button class="icon-btn" data-act="drawer" aria-label="Chats">${IC.menu}</button>` : ""}<div class="t grow"><b>New chat</b><span>${aiMode() === "offline" ? "demo mode" : "online"}</span></div></header>
    <div class="msgs pick">
      <div class="pick-h"><span class="wordmark">webshow<b>.ai</b></span><h1>Who's running your show?</h1><p class="muted">Pick a Showrunner for this chat. Each one plans and writes in their own way, always with your facts.</p></div>
      <div class="srs big">${SR_KEYS.map(k => { const s = SHOWRUNNERS[k]; return `<button class="sr-pick" data-act="pickstyle" data-k="${k}"><span class="sr-av">${IC[s.icon]}</span><b>${s.name}</b><span>${esc(s.line)}</span></button>`; }).join("")}</div>
      <p class="fine center">Each style follows the published marketing principles of the person it's named after. Not affiliated with them.</p>
    </div>
  </section>`;
}

/* The side panel: new chat, your chats, and each show's chat. */
export function drawerHTML() {
  if (!state.ui.drawer) return "";
  const chats = chatsList(); const shows = Object.values(state.shows).sort((a, b) => b.createdAt - a.createdAt);
  const row = (c) => `<div class="dr-row${c.id === state.ui.chatId ? " on" : ""}"><button class="dr-b" data-act="openchat" data-id="${c.id}"><span class="sr-av xs">${IC[srOf(c.showrunner).icon]}</span><span class="grow"><b>${esc(c.title || "New chat")}</b><small>${srOf(c.showrunner).name} · ${fmtDate(new Date(c.updatedAt).toISOString().slice(0, 10))}</small></span></button><button class="icon-btn sm" data-act="delchat" data-id="${c.id}" aria-label="Delete chat">${IC.trash}</button></div>`;
  return `<div class="dr-scrim" data-act="drawer"></div><nav class="drawer" aria-label="Chats">
    <div class="dr-h"><span class="wordmark">webshow<b>.ai</b></span><button class="icon-btn" data-act="drawer" aria-label="Close">${IC.x}</button></div>
    <button class="btn go dr-new" data-act="newchat">${IC.plus} New chat</button>
    <h3 class="sec">Chats</h3>
    ${chats.length ? chats.map(row).join("") : `<p class="muted small">No chats yet.</p>`}
    ${shows.length ? `<h3 class="sec">Shows</h3>${shows.map(s => `<div class="dr-row${state.chats[state.ui.chatId]?.showId === s.id ? " on" : ""}"><button class="dr-b" data-act="showchat" data-id="${s.id}"><span class="sr-av xs show">${IC.layers}</span><span class="grow"><b>${esc(s.strategy?.name || "New show")}</b><small>Show chat · ${srOf(s.showrunner).name}</small></span></button></div>`).join("")}` : ""}
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
    case "question": return answered ? "" : `<div class="opts">${c.options.map(o => `<button class="chip" data-act="say" data-t="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
    case "plan": return `<div class="card plan"><span class="kicker">${IC.layers} Campaign plan</span><b class="h">${esc(c.name)}</b>${c.idea ? `<p class="idea">“${esc(c.idea)}”</p>` : ""}
      <div class="meta"><span class="tag">${IC.target}${esc(GOALS[c.goal]?.label || "")}</span><span class="tag">${IC.cal}${c.weeks} weeks</span>${c.channels.map(k => `<span class="tag"><i class="dot" style="--c:${CHANNELS[k].c}"></i>${CHANNELS[k].label}</span>`).join("")}</div>
      ${c.showId ? `<button class="btn" data-act="openshow" data-id="${c.showId}">Open the show ${IC.arrow}</button>` : `<button class="btn go" data-act="createplan" ${id}>${IC.spark} Create this show</button>`}</div>`;
    case "change": { const show = state.shows[chat.showId];
      return `<div class="card change"><span class="kicker">${IC.edit} Change to the show</span><b>${esc(c.summary)}</b><ul>${c.ops.map(o => `<li>${esc(opText(show, o))}</li>`).join("")}</ul>
      ${c.applied ? `<span class="tag live">${IC.check} Applied</span>` : c.dismissed ? `<span class="tag">Skipped</span>` : `<div class="row"><button class="btn go sm" data-act="applychange" ${id}>${IC.check} Apply</button><button class="btn sm" data-act="skipchange" ${id}>Not now</button></div>`}</div>`; }
    case "post": return `<div class="card post"><span class="kicker"><i class="dot" style="--c:${CHANNELS[c.channel].c}"></i>${CHANNELS[c.channel].label} post</span>${c.hook ? `<b class="h">${esc(c.hook)}</b>` : ""}<p class="pre">${esc(c.text)}</p>${c.cta ? `<p class="cta">${esc(c.cta)}</p>` : ""}
      ${c.image_prompt ? `<details class="img"><summary>${IC.image} Picture idea</summary><p class="pre">${esc(c.image_prompt)}</p></details>` : ""}
      <div class="row"><button class="btn sm go" data-act="copypost" ${id}>${IC.copy} Copy text</button><button class="btn sm gpt" data-act="gptpost" ${id}>${gptMark()} Image in ChatGPT</button></div></div>`;
    case "tip": return `<div class="card tip"><span class="kicker">${IC.spark} ${esc(c.title || "Tip")}</span><p>${esc(c.text)}</p></div>`;
    case "remembered": return `<div class="mem">${IC.brain}<span>Remembered: ${c.items.map(esc).join("; ")}</span><button class="link" data-act="openme">Edit</button></div>`;
    case "open": return `<button class="btn" data-act="openshow" data-id="${c.showId}">Open “${esc(c.name)}” ${IC.arrow}</button>`;
  }
  return "";
}
