/* The main screen: talking with your Showrunner. */
import { state } from "../store.js";
import { esc, IC } from "../lib.js";
import { CHANNELS, GOALS } from "../../shared/model.js";
import { SHOWRUNNERS, SR_KEYS, srOf } from "../../shared/showrunners.js";
import { aiMode } from "../ai.js";
import { gptMark } from "./sheets.js";

const QUICK = ["Plan a campaign", "What should I post today?", "Write a post", "Give me a tip"];
export function chatView() {
  const r = srOf(state.profile.showrunner); const busy = state.ui.busy;
  return `<section class="chat">
    <header class="chat-h"><span class="sr-av">${IC[r.icon]}</span><div class="t"><b>Your Showrunner</b><span>${state.profile.showrunner ? `${r.name} style · ` : ""}${aiMode() === "offline" ? "demo mode" : "online"}</span></div></header>
    <div class="msgs" id="msgs" aria-live="polite">${state.chat.map(msgHTML).join("")}${busy ? `<div class="msg sr fresh" role="status"><div class="answering"><span class="sr-av sm">${IC[r.icon]}</span><span>Showrunner is answering</span><span class="typing" aria-hidden="true"><i></i><i></i><i></i></span></div></div>` : ""}</div>
    <div class="dock">
      ${state.profile.showrunner && !busy ? `<div class="quick" role="group" aria-label="Suggestions">${QUICK.map(q => `<button class="chip" data-act="say" data-t="${esc(q)}">${esc(q)}</button>`).join("")}</div>` : ""}
      <form class="composer" data-form="chat"><textarea id="msg" rows="1" placeholder="Message your Showrunner…" aria-label="Message your Showrunner" ${busy ? "disabled" : ""}></textarea><button class="send" aria-label="Send" ${busy ? "disabled" : ""}>${IC.send}</button></form>
    </div>
  </section>`;
}
function msgHTML(m, i) {
  if (m.role === "user") return `<div class="msg me"><div class="bubble">${esc(m.text)}</div></div>`;
  const answered = state.chat.slice(i + 1).some(x => x.role === "user");
  return `<div class="msg sr${m.id === state.ui.fresh ? " fresh" : ""}">${m.text ? `<div class="bubble">${esc(m.text)}</div>` : ""}${(m.cards || []).map((c, k) => cardHTML(c, m, k, answered)).join("")}</div>`;
}
function cardHTML(c, m, k, answered) {
  const id = `data-m="${m.id}" data-c="${k}"`;
  switch (c.type) {
    case "style": return `<div class="card"><div class="srs">${SR_KEYS.map(s => `<button class="sr-pick" data-act="pickstyle" data-k="${s}" aria-pressed="${state.profile.showrunner === s}"><span class="sr-av sm">${IC[SHOWRUNNERS[s].icon]}</span><b>${SHOWRUNNERS[s].name}</b><span>${esc(SHOWRUNNERS[s].line)}</span></button>`).join("")}</div><p class="fine">Each style follows the published marketing principles of the person it's named after. Not affiliated with them. You can change it any time in Me.</p></div>`;
    case "question": return answered ? "" : `<div class="opts">${c.options.map(o => `<button class="chip" data-act="say" data-t="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
    case "plan": return `<div class="card plan"><span class="kicker">${IC.layers} Campaign plan</span><b class="h">${esc(c.name)}</b>${c.idea ? `<p class="idea">“${esc(c.idea)}”</p>` : ""}
      <div class="meta"><span class="tag">${IC.target}${esc(GOALS[c.goal]?.label || "")}</span><span class="tag">${IC.cal}${c.weeks} weeks</span>${c.channels.map(k => `<span class="tag"><i class="dot" style="--c:${CHANNELS[k].c}"></i>${CHANNELS[k].label}</span>`).join("")}</div>
      ${c.showId ? `<button class="btn" data-act="openshow" data-id="${c.showId}">Open the show ${IC.arrow}</button>` : `<button class="btn go" data-act="createplan" ${id}>${IC.spark} Create this show</button>`}</div>`;
    case "post": return `<div class="card post"><span class="kicker"><i class="dot" style="--c:${CHANNELS[c.channel].c}"></i>${CHANNELS[c.channel].label} post</span>${c.hook ? `<b class="h">${esc(c.hook)}</b>` : ""}<p class="pre">${esc(c.text)}</p>${c.cta ? `<p class="cta">${esc(c.cta)}</p>` : ""}
      ${c.image_prompt ? `<details class="img"><summary>${IC.image} Picture idea</summary><p class="pre">${esc(c.image_prompt)}</p></details>` : ""}
      <div class="row"><button class="btn sm go" data-act="copypost" ${id}>${IC.copy} Copy text</button><button class="btn sm gpt" data-act="gptpost" ${id}>${gptMark()} Image in ChatGPT</button></div></div>`;
    case "tip": return `<div class="card tip"><span class="kicker">${IC.spark} ${esc(c.title || "Tip")}</span><p>${esc(c.text)}</p></div>`;
    case "remembered": return `<div class="mem">${IC.brain}<span>Remembered: ${c.items.map(esc).join("; ")}</span><button class="link" data-act="openme">Edit</button></div>`;
    case "open": return `<button class="btn" data-act="openshow" data-id="${c.showId}">Open “${esc(c.name)}” ${IC.arrow}</button>`;
  }
  return "";
}
