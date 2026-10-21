/* Make the creative idea the hero of the conversation, not a metadata form. */
import { esc, IC } from "../lib.js";
import { GOALS, CHANNELS } from "../../shared/model.js";

export function conceptCard(c, id) {
  const channelTags = (c.channels || []).map(k => CHANNELS[k] ?
    '<span class="tag"><i class="dot" style="--c:' + CHANNELS[k].c + '"></i>' + esc(CHANNELS[k].label) + '</span>' : ''
  ).join('');
  const visual = c.visual ? '<p class="muted small">Creative direction: ' + esc(c.visual) + '</p>' : '';
  const why = c.why ? '<p class="concept-why"><b>Why it might work:</b> ' + esc(c.why) + '</p>' : '';
  const action = c.showId ?
    '<button class="btn go concept-cta" data-act="openshow" data-id="' + esc(c.showId) + '">Explore your show ' + IC.arrow + '</button>' :
    '<button class="btn go concept-cta" data-act="createplan" ' + id + '>' + IC.spark + ' Let\'s make it ' + IC.arrow + '</button>' +
    '<button class="btn ghost concept-alt" data-act="say" data-t="Give me a genuinely different campaign concept for the same mission. Surprise me with a new big idea.">Try another angle ' + IC.redo + '</button>';
  return '<div class="card plan concept-card">' +
    '<span class="kicker">' + IC.spark + ' Meet your next big idea</span>' +
    '<div class="concept-poster"><span class="concept-poster-meta">A WEBSHOW ORIGINAL <span>✳</span></span>' +
      '<b class="concept-poster-title">' + esc(c.name) + '</b>' +
      '<span class="concept-poster-line">' + esc(c.hook || c.idea || 'One big idea. One great show.') + '</span>' +
      '<span class="concept-poster-signature">YOUR NEXT SHOW ↗</span></div>' +
    (c.idea ? '<p class="concept-message">' + esc(c.idea) + '</p>' : '') +
    why + visual +
    '<div class="meta"><span class="tag">' + IC.target + esc(GOALS[c.goal]?.label || '') + '</span>' +
      '<span class="tag">' + IC.cal + c.weeks + ' weeks</span>' + channelTags + '</div>' + action + '</div>';
}
