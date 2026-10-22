/* Me: train your Showrunner (what it knows), pick its style, plan and settings. */
import { state } from "../store.js";
import { esc, IC } from "../lib.js";
import { SHOWRUNNERS, SR_KEYS } from "../../shared/showrunners.js";
import { planOf, priceText } from "../../shared/plans.js";
import { aiMode } from "../ai.js";

export const PROFILE_FIELDS = [
  ["business", "Business name", "e.g. Saunaravintola Löyly", 1],
  ["what", "What you sell", "What you do, in a sentence or two", 2],
  ["audience", "Your customers", "Who buys from you, and why", 2],
  ["offer", "Your offer right now", "Prices, packages, anything on now", 2],
  ["voice", "How you sound", "e.g. warm, a bit cheeky, never salesy", 1],
  ["facts", "Facts it may use", "Opening hours, awards, numbers – only true ones", 2],
  ["avoid", "Never say", "Words, claims or topics to stay away from", 1],
  ["website", "Website", "https://", 1],
  ["email", "Email for leads", "Where form answers go", 1],
  ["phone", "Phone", "+358 …", 1],
];
export function meView() {
  const p = state.profile; const plan = planOf(state.settings.plan); const mode = aiMode();
  return `<section class="page">
    <header class="page-h"><button class="icon-btn" data-act="tab" data-t="today" aria-label="Back">${IC.back}</button><div class="grow"><span class="eyebrow">Your business and settings</span><h1>Me</h1></div><span class="wordmark">webshow<b>.ai</b></span></header>
    <h2 class="sec">Favourite Showrunner</h2>
    <p class="muted small">Your favourite runs new ideas and gives the daily tips. You can switch on any idea, too.</p>
    <div class="srs">${SR_KEYS.map(k => `<button class="sr-pick" data-act="setstyle" data-k="${k}" aria-pressed="${p.showrunner === k}"><span class="sr-av sm">${IC[SHOWRUNNERS[k].icon]}</span><b>${SHOWRUNNERS[k].role}</b><span>${esc(SHOWRUNNERS[k].blurb)} <em class="muted">${SHOWRUNNERS[k].name} style</em></span></button>`).join("")}</div>
    <h2 class="sec">What it knows about you</h2>
    <p class="muted small">Your Showrunner uses this in every answer. It never makes up facts, so the more you tell it, the better it gets.</p>
    <div class="card form">${PROFILE_FIELDS.map(([k, l, ph, rows]) => `<label class="field"><span>${l}</span>${rows > 1 ? `<textarea rows="${rows}" data-prof="${k}" placeholder="${esc(ph)}">${esc(p[k])}</textarea>` : `<input data-prof="${k}" value="${esc(p[k])}" placeholder="${esc(ph)}">`}</label>`).join("")}</div>
    <h2 class="sec">Remembered from your chats ${p.memory.length ? `<span class="count">${p.memory.length}</span>` : ""}</h2>
    ${p.memory.length ? `<div class="list">${p.memory.map((m, i) => `<div class="mem-row"><span>${esc(m.text)}</span><button class="icon-btn sm" data-act="forget" data-i="${i}" aria-label="Forget this">${IC.x}</button></div>`).join("")}</div>` : `<p class="muted small">Nothing yet. When you tell your Showrunner something lasting, like a price or who your customers are, it saves it here.</p>`}
    <h2 class="sec">Plan</h2>
    <button class="card row-card tap" data-act="sheet" data-k="plans"><span class="ic-round">${IC.layers}</span><span class="grow"><b>${esc(plan.name)}</b><span class="muted small">${priceText(plan)} · demo</span></span>${IC.arrow}</button>
    <h2 class="sec">Settings</h2>
    <div class="card">
      <div class="set"><span>Theme</span><div class="seg sm">${[["", "Auto"], ["light", "Light"], ["dark", "Dark"]].map(([v, l]) => `<button aria-pressed="${state.settings.theme === v}" data-act="theme" data-v="${v}">${l}</button>`).join("")}</div></div>
      <div class="set"><span>AI</span><span class="muted small">${mode === "offline" ? "Demo mode (no AI connected)" : mode === "claude" ? "Connected through Claude" : "Connected"}</span></div>
      <a class="set link-row" href="./?view=pro"><span>${IC.desktop} Webshow Pro</span><span class="muted small">The full studio · best on a computer ${IC.arrow}</span></a>
      <button class="set link-row" data-act="exportall"><span>${IC.down} Download my data</span></button>
      <button class="set link-row danger" data-act="reset"><span>${IC.trash} ${state.ui.confirmReset ? "Tap again to erase everything" : "Start over"}</span></button>
    </div>
    <p class="fine">Webshow internal beta. Everything is saved on this device only.</p>
  </section>`;
}
