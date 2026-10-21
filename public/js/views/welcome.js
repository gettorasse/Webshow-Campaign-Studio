/* Mission-first onboarding: no marketing knowledge required. */
import { IC } from "../lib.js";
import { chatsList, state } from "../store.js";

const MISSIONS = [
  { key: "bookings", icon: "cal", title: "Fill my bookings", line: "Bring more people through the door" },
  { key: "leads", icon: "target", title: "Get more customers", line: "Start conversations that turn into business" },
  { key: "sales", icon: "layers", title: "Sell something", line: "Make an offer people notice" },
  { key: "event", icon: "spark", title: "Promote an event", line: "Give people a reason to show up" },
];
export function welcomeView() {
  const has = chatsList().length + Object.keys(state.shows).length;
  const cards = MISSIONS.map(m =>
    '<button class="mission-card" data-act="startmission" data-goal="' + m.key + '">' +
      '<span class="mission-icon">' + (IC[m.icon] || IC.spark) + '</span>' +
      '<b>' + m.title + '</b><span>' + m.line + '</span>' +
      '<span class="mission-arrow">' + IC.arrow + '</span></button>'
  ).join("");
  return '<section class="chat picker">' +
    '<header class="chat-h">' + (has ? '<button class="icon-btn" data-act="drawer" aria-label="Chats">' + IC.menu + '</button>' : '') +
      '<div class="t grow"><b class="wordmark">webshow<span class="brand-dot">.ai</span></b><span>Your creative sidekick</span></div></header>' +
    '<div class="msgs pick welcome"><div class="welcome-top">' +
      '<div class="buddy-character" aria-hidden="true"><i class="buddy-eye"></i><i class="buddy-smile"></i></div>' +
      '<span class="kicker welcome-kicker">' + IC.spark + ' Welcome to your next big idea</span>' +
      '<h1>What are we making happen?</h1>' +
      '<p>You have a business. We have ideas. Pick a mission, and we will make something great together.</p>' +
    '</div><div class="mission-grid" role="group" aria-label="Choose your marketing mission">' + cards + '</div>' +
      '<button class="mission-other" data-act="startmission" data-goal="awareness">' + IC.spark +
        ' Not sure yet? Figure it out with me ' + IC.arrow + '</button>' +
      '<p class="fine center">No marketing degree required. No commitment. Just your first great idea.</p>' +
    '</div></section>';
}
