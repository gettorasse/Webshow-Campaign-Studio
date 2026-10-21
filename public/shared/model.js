/* The campaign model: channels, asset types, and the publishing plan.
   The plan (what goes out, where, on which day) is worked out here in code,
   so the calendar always adds up. The AI only writes the words. */
import { addDays, fmtDate, str, uid } from "./util.js";

export const CHANNELS = {
  instagram: { label: "Instagram", c: "#e4568b" },
  facebook: { label: "Facebook", c: "#4a7dff" },
  tiktok: { label: "TikTok", c: "#a64dff" },
  linkedin: { label: "LinkedIn", c: "#1c8f87" },
  email: { label: "Email", c: "#e09a00" },
  website: { label: "Landing page", c: "#22a06b" },
  google: { label: "Google Ads", c: "#e0672b" },
};
export const GOALS = {
  bookings: { label: "Bookings", unit: "bookings", cta: "Book now" },
  leads: { label: "Leads", unit: "leads", cta: "Get in touch" },
  sales: { label: "Sales", unit: "sales", cta: "Shop now" },
  signups: { label: "Sign-ups", unit: "sign-ups", cta: "Sign up" },
  event: { label: "Event attendance", unit: "attendees", cta: "Save your spot" },
  awareness: { label: "Awareness", unit: "people reached", cta: "Learn more" },
};
export const PHASES = {
  hook: { label: "Hook", d: "Wake up interest", c: "var(--hook)" },
  show: { label: "Show", d: "Show it and prove it", c: "var(--show)" },
  convert: { label: "Convert", d: "Make them act", c: "var(--convert)" },
  always: { label: "Always on", d: "Runs the whole campaign", c: "var(--always)" },
};
export const FORMATS = {
  post45: { w: 1080, h: 1350, label: "Feed 1080 × 1350 (4:5)" },
  story: { w: 1080, h: 1920, label: "Vertical 1080 × 1920 (9:16)" },
  square: { w: 1080, h: 1080, label: "Square 1080 × 1080 (1:1)" },
  wide: { w: 1200, h: 628, label: "Link image 1200 × 628" },
  email: { w: 1200, h: 600, label: "Email header 1200 × 600" },
  hero: { w: 1440, h: 900, label: "Website hero 1440 × 900" },
};
/* fields: [key, label, rows, max chars]; copy: what "Copy text" puts on the clipboard, in order */
export const KINDS = {
  ig_post: { ch: "instagram", label: "Instagram post", fmt: "post45", time: "18:00", verb: "Post to your Instagram feed",
    fields: [["hook", "Headline on the image", 1, 70], ["caption", "Caption", 6, 1500], ["cta", "Call to action", 1, 140], ["hashtags", "Hashtags", 1, 220]], copy: ["caption", "cta", "hashtags"] },
  ig_carousel: { ch: "instagram", label: "Instagram carousel", fmt: "post45", time: "18:00", verb: "Post the carousel to your Instagram feed",
    fields: [["hook", "First slide", 1, 70], ["slides", "Slides, one per line", 6, 900], ["caption", "Caption", 5, 1500], ["cta", "Call to action", 1, 140], ["hashtags", "Hashtags", 1, 220]], copy: ["caption", "cta", "hashtags"] },
  ig_story: { ch: "instagram", label: "Instagram story", fmt: "story", time: "12:00", verb: "Post as an Instagram story",
    fields: [["hook", "First frame", 1, 70], ["frames", "Frames, one per line", 4, 500], ["sticker", "Sticker or link", 1, 140]], copy: ["frames", "sticker"] },
  ig_reel: { ch: "instagram", label: "Instagram reel", fmt: "story", time: "19:00", verb: "Film and post the reel",
    fields: [["hook", "Opening line (first 2 seconds)", 1, 90], ["script", "Shot list and script", 6, 1200], ["caption", "Caption", 4, 1200], ["audio", "Sound idea", 1, 140]], copy: ["caption"] },
  fb_post: { ch: "facebook", label: "Facebook post", fmt: "square", time: "17:00", verb: "Post on your Facebook page",
    fields: [["hook", "Headline on the image", 1, 70], ["text", "Post text", 6, 1500], ["cta", "Call to action", 1, 140]], copy: ["text", "cta"] },
  meta_ad: { ch: "facebook", label: "Facebook & Instagram ad", fmt: "square", time: "", verb: "Start the ad in Meta Ads Manager",
    fields: [["hook", "Headline on the image", 1, 70], ["primary", "Primary text", 4, 600], ["headline", "Ad headline", 1, 40], ["description", "Description", 1, 60], ["button", "Button", 1, 30], ["targeting", "Who to show it to", 2, 300]], copy: ["primary", "headline", "description"] },
  tiktok: { ch: "tiktok", label: "TikTok video", fmt: "story", time: "19:30", verb: "Film and post on TikTok",
    fields: [["hook", "Opening line (first 2 seconds)", 1, 90], ["script", "Shot list and script", 6, 1200], ["caption", "Caption", 2, 300], ["hashtags", "Hashtags", 1, 200]], copy: ["caption", "hashtags"] },
  li_post: { ch: "linkedin", label: "LinkedIn post", fmt: "wide", time: "08:30", verb: "Post on LinkedIn",
    fields: [["hook", "Headline on the image", 1, 70], ["text", "Post text", 7, 2500], ["cta", "Call to action", 1, 140]], copy: ["text", "cta"] },
  email: { ch: "email", label: "Email", fmt: "email", time: "09:00", verb: "Send the email to your list",
    fields: [["subject", "Subject line", 1, 80], ["preview", "Preview text", 1, 120], ["hook", "Header image text", 1, 70], ["body", "Email body", 8, 2500], ["cta", "Button", 1, 40]], copy: ["subject", "preview", "body", "cta"] },
  landing: { ch: "website", label: "Landing page", fmt: "hero", time: "", verb: "Publish the page on your website", evergreen: true,
    fields: [["hook", "Main headline", 1, 80], ["sub", "Subheadline", 2, 220], ["sections", "Sections, one per line (title: text)", 7, 2000], ["faq", "FAQ, one per line (question? answer)", 5, 1500], ["cta", "Button", 1, 40]], copy: ["hook", "sub", "sections", "faq", "cta"] },
  search_ad: { ch: "google", label: "Google search ad", fmt: "", time: "", verb: "Set up the search ad in Google Ads", evergreen: true,
    fields: [["headlines", "Headlines, one per line (max 30 characters)", 5, 300], ["descriptions", "Descriptions, one per line (max 90 characters)", 2, 200], ["keywords", "Keywords", 2, 400]], copy: ["headlines", "descriptions", "keywords"] },
};
export const KIND_ORDER = Object.keys(KINDS);
export const isVisual = (k) => !!KINDS[k]?.fmt;

/* ---------- the publishing plan: which assets, on which day. Code, not AI, so the timeline always adds up. ---------- */
const CADENCE = {
  instagram: (W) => ({ n: Math.max(2, Math.min(8, W * 2)), c: [["ig_post", "hook", 0], ["ig_story", "hook", .1], ["ig_reel", "hook", .24], ["ig_carousel", "show", .38], ["ig_story", "show", .5], ["ig_post", "show", .63], ["ig_reel", "convert", .8], ["ig_story", "convert", 1]] }),
  facebook: (W) => ({ n: W >= 3 ? 3 : W, c: [["meta_ad", "hook", .03], ["fb_post", "show", .5], ["meta_ad", "convert", .72]] }),
  tiktok: (W) => ({ n: Math.max(1, Math.min(4, W)), c: [["tiktok", "hook", .05], ["tiktok", "show", .35], ["tiktok", "show", .6], ["tiktok", "convert", .86]] }),
  linkedin: (W) => ({ n: Math.max(1, Math.min(3, Math.ceil(W / 2))), c: [["li_post", "hook", .05], ["li_post", "show", .5], ["li_post", "convert", .86]] }),
  email: (W) => ({ n: W >= 3 ? 3 : W, c: [["email", "hook", 0], ["email", "show", .5], ["email", "convert", .95]] }),
  website: () => ({ n: 1, c: [["landing", "always", 0]] }),
  google: () => ({ n: 1, c: [["search_ad", "always", 0]] }),
};
const pickSpread = (list, n) => n >= list.length ? list : n <= 1 ? [list[0]] : Array.from({ length: n }, (_, i) => list[Math.round(i * (list.length - 1) / (n - 1))]);
export function campaignEnd(b) { return addDays(b.start, b.weeks * 7 - 1); }
export function planSlots(b) {
  const L = b.weeks * 7; const out = []; const used = new Map();
  for (const ch of Object.keys(CHANNELS)) {
    if (!b.channels.includes(ch)) continue;
    const { n, c } = CADENCE[ch](b.weeks);
    for (const [kind, phase, f] of pickSpread(c, n)) {
      const K = KINDS[kind]; let day = Math.round(f * (L - 1));
      if (K.evergreen) { out.push({ kind, phase, date: addDays(b.start, -2), end: campaignEnd(b) }); continue; }
      /* spread days out: no two posts on one channel the same day, weekends get stories and reels */
      for (let k = 0; k < 6 && used.get(ch + day); k++) day = Math.min(L - 1, day + 1);
      used.set(ch + day, 1);
      const s = { kind, phase, date: addDays(b.start, day) };
      if (kind === "meta_ad") s.end = phase === "convert" ? campaignEnd(b) : addDays(b.start, Math.min(L - 1, day + Math.max(5, Math.round(L * .4))));
      out.push(s);
    }
  }
  return out.map((s, i) => ({ id: uid("a"), ...s, time: KINDS[s.kind].time, order: i }));
}

export function actionOf(a) {
  const K = KINDS[a.kind];
  if (a.kind === "landing") return `Publish the page before the campaign starts and check the button works on a phone.`;
  if (a.kind === "search_ad") return `Set up the ad in Google Ads, send it to the landing page, and let it run until ${fmtDate(a.end)}.`;
  if (a.kind === "meta_ad") return `Start the ad in Meta Ads Manager and let it run until ${fmtDate(a.end)}. Send it to your landing page.`;
  return `${K.verb}${a.time ? " around " + a.time : ""}.`;
}
export function copyOf(a) { const K = KINDS[a.kind]; return K.copy.map(k => str(a.fields?.[k])).filter(Boolean).join("\n\n"); }


/* What the owner teaches their Showrunner. Sent with every AI request. */
export const blankProfile = () => ({ business: "", what: "", audience: "", offer: "", voice: "", facts: "", avoid: "", website: "", email: "", phone: "", showrunner: "", memory: [] });
export const GOAL_KEYS = Object.keys(GOALS);
export const CHANNEL_KEYS = Object.keys(CHANNELS);
