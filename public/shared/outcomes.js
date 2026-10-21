/* Honest, owner-reported campaign feedback. No invented platform analytics.
 * A positive answer is attached to a POST, not a verified lead or attributed sale.
 * Ranges such as "2–5" must never be added together as exact counts.
 */
const isPost = a => a && a.kind !== "landing" && a.kind !== "search_ad";
export function summarizeOutcomes(show) {
  const posts = (show?.assets || []).filter(isPost);
  const published = posts.filter(a => a.done);
  const reviewed = published.filter(a => a.outcome && !a.outcome.skipped);
  const positive = reviewed.filter(a => a.outcome.got === true);
  const without = reviewed.filter(a => a.outcome.got === false);
  const unreviewed = published.length - reviewed.length;
  return {
    total: posts.length,
    published: published.length,
    reviewed: reviewed.length,
    positive: positive.length,
    without: without.length,
    unreviewed,
    complete: posts.length > 0 && published.length === posts.length,
    reported: reviewed.length > 0
  };
}
export function outcomesContext(show) {
  const o = summarizeOutcomes(show);
  if (!o.published) return "No published posts yet.";
  if (!o.reported) return o.published + " posts marked published; no results reported.";
  return o.published + " posts marked published; " + o.reviewed +
    " reviewed by the owner; " + o.positive + " with reported replies/inquiries/bookings; " +
    o.without + " with no reported response; " + o.unreviewed +
    " not reviewed. Owner-reported feedback, not verified attribution or platform analytics.";
}
