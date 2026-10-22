/* Webshow Play's read-only view of Shows made in Webshow Pro (same device, same origin).
   Play can list them, show their plan and talk about them; the canvas itself is edited in Pro. */
import { readPro, proToSlim, laneOfX } from "../shared/bridge.js";

const TINTS = { periwinkle: "#6b7fff", lavender: "#a39cf4", sky: "#86b4e0", green: "#a3c493", amber: "#d6bd85", pink: "#dc9ab4", orange: "#c3a0d8", slate: "#a3a9bf" };
const pro = () => { try { return readPro(localStorage) || { shows: {}, nodes: {} }; } catch { return { shows: {}, nodes: {} }; } };
/* Pro Shows that Play doesn't have (Play Shows opened in Pro keep their Play version here) */
export function proOnlyShows(playShows) {
  const p = pro(); return Object.values(p.shows || {}).filter(s => s && !s.example && !playShows[s.id]).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map(s => card(s, p.nodes?.[s.id] || {}));
}
export function proShow(id) { const p = pro(); const s = p.shows?.[id]; return s ? card(s, p.nodes?.[id] || {}) : null; }
function card(s, nodes) {
  const slim = proToSlim(s, nodes); const c = TINTS[s.tint] || TINTS.periwinkle;
  return { id: s.id, name: s.name || "Untitled show", showrunner: s.showrunner || "ogilvy", colors: [c, "#15122e"], goal: slim.brief.goal, idea: s.dna?.idea || "", slim,
    nodeCount: Object.keys(nodes).length, kit: Object.values(nodes).filter(n => laneOfX(n.x) === "kit").length };
}
