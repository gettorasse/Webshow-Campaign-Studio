/* Demo mode: what the Showrunner says and writes when no AI is connected.
   Good enough to click through every screen; not a substitute for the AI. */
import { CHANNELS, GOALS, KINDS, campaignEnd, isVisual } from "../shared/model.js";
import { srOf } from "../shared/showrunners.js";
import { clip, fmtDate, slug, str } from "../shared/util.js";

const GOAL_WORDS = { bookings: /book|varaa|varaus|appointment|class|kurssi|table|sauna|hotel/, sales: /shop|store|kauppa|product|tuote|buy|osta|sale|myy/, event: /event|tapahtuma|concert|festival|webinar|seminar/, signups: /sign.?up|subscri|tilaa|newsletter|member|jäsen/, awareness: /aware|tunnettu|brand|näky/, leads: /lead|b2b|quote|tarjous|contact|yhtey/ };
export const guessGoal = (t) => Object.keys(GOAL_WORDS).find(k => GOAL_WORDS[k].test(String(t).toLowerCase())) || "";
export const GOAL_CHANNELS = { bookings: ["instagram", "facebook", "email", "website"], leads: ["linkedin", "email", "google", "website"], sales: ["instagram", "facebook", "email", "website"], signups: ["instagram", "tiktok", "email", "website"], event: ["instagram", "facebook", "email"], awareness: ["instagram", "tiktok", "facebook"] };
const GOAL_OPTIONS = { "More bookings": "bookings", "More leads": "leads", "More sales": "sales", "More sign-ups": "signups", "Fill an event": "event", "Get known": "awareness" };

export function offlineChat({ profile, messages }) {
  const last = messages.filter(m => m.role === "user").at(-1)?.text || ""; const t = last.toLowerCase(); const r = srOf(profile.showrunner);
  const prevQ = messages.filter(m => m.role === "sr").at(-1)?.cards?.find(c => c.type === "question");
  const what = clip(profile.what || profile.business || "your business", 60);
  const goalPick = GOAL_OPTIONS[last.trim()] || (prevQ?.q?.startsWith("What do you want more of") ? guessGoal(t) : "");
  if (goalPick || /plan|campaign|kampanja|launch|lanseer/.test(t)) {
    const goal = goalPick || guessGoal(t + " " + profile.what);
    if (!goal) return { reply: `Let's plan it. What do you want more of from this campaign?`, cards: [{ type: "question", q: "What do you want more of?", options: Object.keys(GOAL_OPTIONS).slice(0, 4) }], remember: [] };
    return { reply: `Here's a first plan for ${what}: one idea, ${GOALS[goal].label.toLowerCase()} as the goal, four weeks from Hook to Convert. Create it and I'll write every post.`, cards: [{ type: "plan", name: clip(profile.business || what, 32) + " campaign", idea: clip(profile.offer || what, 70), goal, weeks: 4, channels: GOAL_CHANNELS[goal], offer: profile.offer, audience: profile.audience }], remember: [] };
  }
  if (/post|idea|write|kirjoita|julkaisu|caption|today|tänään/.test(t)) {
    return { reply: `Here's one you can post today. Change anything that doesn't sound like you.`, cards: [{ type: "post", channel: "instagram", hook: clip(profile.offer || `Meet ${what}`, 60), text: `${profile.offer || `This is ${what}.`}\n\nMade for ${(profile.audience || "people like you").toLowerCase()}.`, cta: `${GOALS[guessGoal(profile.what) || "leads"].cta} – link in bio.`, image_prompt: `A real, candid photo of ${what} in use, natural light, room at the top for a headline, no text in the image.` }], remember: [] };
  }
  if (/tip|help|apua|what should|mitä/.test(t)) { const tip = r.tips[(messages.length) % r.tips.length]; return { reply: "One thing that will help right now:", cards: [{ type: "tip", title: `${r.name} tip`, text: tip }], remember: [] }; }
  return { reply: `Got it. What would help most right now?`, cards: [{ type: "question", q: "What should we do next?", options: ["Plan a campaign", "Write a post for today", "Give me a tip"] }], remember: [] };
}

export function offlineStrategy(profile, brief) {
  const g = GOALS[brief.goal] || GOALS.leads; const what = str(profile.what) || str(profile.business) || "your business"; const offer = str(brief.offer) || str(profile.offer) || what;
  return { name: clip(str(profile.business) || what.split(/[,.]/)[0], 40) || "New campaign", idea: clip(offer, 70), tagline: `${g.cta}, before ${fmtDate(campaignEnd(brief), { day: "numeric", month: "long" })}`,
    audience: str(brief.audience) || str(profile.audience) || "People who are already looking for this", insight: `They already want this. They need one clear reason to act now, and an easy way to ${g.cta.toLowerCase()}.`,
    message: clip(offer, 160), offer, cta: g.cta, arc: { hook: "Show the idea in one picture and one line.", show: "Show what it's really like: the details, the people, the result.", convert: `Give a real reason to act now: ${g.cta}.` },
    voice: str(profile.voice) || "Friendly and direct. Short sentences.", visual: "One strong subject per picture, natural light, room for a headline.", offerIdeas: [] };
}

export function offlineAsset(profile, show, a) {
  const s = show.strategy, b = show.brief, g = GOALS[b.goal] || GOALS.leads; const k = a.kind; const ph = a.phase;
  const biz = clip(profile.business || profile.what || "us", 40); const who = (s.audience || "people like you").toLowerCase(); const end = fmtDate(campaignEnd(b), { day: "numeric", month: "long" });
  const H = { hook: clip(s.idea, 46), show: "See how it works", convert: `Last days: ${s.cta.toLowerCase()}`, always: clip(s.idea, 60) }[ph];
  const body = `${{ hook: `Meet ${s.idea.toLowerCase()}.`, show: "Here's what it's really like.", convert: `Only until ${end}.`, always: "" }[ph]} ${s.offer}`.trim();
  const tag = "#" + slug(biz).replace(/-/g, ""); const F = {};
  switch (k) {
    case "ig_post": Object.assign(F, { hook: H, caption: `${body}\n\nMade for ${who}.`, cta: `${s.cta} – link in bio.`, hashtags: tag }); break;
    case "fb_post": Object.assign(F, { hook: H, text: `${body}\n\nMade for ${who}.`, cta: `${s.cta}: ${b.url || profile.website || "link in the comments"}` }); break;
    case "ig_carousel": Object.assign(F, { hook: H, slides: [H, `The problem: ${clip(who, 50)} want this without the hassle`, `The answer: ${clip(s.offer, 70)}`, "How it works, step by step", `${s.cta} before ${end}`].join("\n"), caption: `${body}\n\nSwipe to see how it works.`, cta: `${s.cta} – link in bio.`, hashtags: tag }); break;
    case "ig_story": Object.assign(F, { hook: H, frames: [H, clip(s.offer, 80), `${s.cta} – tap the link`].join("\n"), sticker: ph === "convert" ? "Countdown sticker + link sticker" : "Poll sticker + link sticker" }); break;
    case "ig_reel": case "tiktok": Object.assign(F, { hook: ph === "convert" ? `You have until ${end}.` : `POV: you finally found ${clip(s.idea, 40).toLowerCase()}`, script: ["0–2 s: the opening line on screen, one striking shot", "2–6 s: the product or service in use", "6–10 s: one close-up detail", `10–15 s: “${s.cta}” on screen`].join("\n"), caption: `${body} ${s.cta} – link in bio.`, ...(k === "tiktok" ? { hashtags: tag } : { audio: "An upbeat track, low under the voice" }) }); break;
    case "meta_ad": Object.assign(F, { hook: H, primary: `${body}\n\nFor ${who}.`, headline: clip(ph === "convert" ? `Last chance: ${s.cta}` : s.idea, 40), description: clip(s.offer, 60), button: s.cta.length <= 20 ? s.cta : "Learn more", targeting: ph === "convert" ? "People who visited your page in the last 30 days" : clip(s.audience, 200) }); break;
    case "li_post": Object.assign(F, { hook: H, text: `${body}\n\nWe made it for ${who}.`, cta: `${s.cta}: ${profile.website || "link in the comments"}` }); break;
    case "email": Object.assign(F, { subject: ph === "convert" ? `Last chance: ${s.cta.toLowerCase()} before ${end}` : clip(s.idea, 60), preview: clip(s.offer, 100), hook: H, body: `Hi,\n\n${body}\n\nSee you soon,\n${biz}`, cta: s.cta }); break;
    case "landing": Object.assign(F, { hook: clip(s.idea, 70), sub: clip(s.offer, 200), sections: [`What you get: ${clip(s.offer, 120)}`, `Who it's for: ${clip(s.audience, 120)}`, "How it works: three simple steps", `Why now: until ${end}`].join("\n"), faq: "How do I start? Tap the button and pick a time.", cta: s.cta }); break;
    case "search_ad": Object.assign(F, { headlines: [clip(biz, 30), clip(s.cta, 30), clip(s.idea, 30)].join("\n"), descriptions: [clip(s.offer, 90), clip(`${s.cta} before ${end}.`, 90)].join("\n"), keywords: clip(profile.what, 120) }); break;
  }
  return { title: `${{ hook: "Hook", show: "Show", convert: "Convert", always: "Always on" }[ph]} · ${KINDS[k].label}`, fields: F, image: isVisual(k) ? `Photo for a ${KINDS[k].label.toLowerCase()}: ${clip(profile.what || biz, 90)}. ${ph === "show" ? "Candid, people using it, natural light" : "One bold subject, room at the top for a headline"}. No text in the image.` : "", goal: { hook: "Make people stop scrolling.", show: "Build trust by showing what it's really like.", convert: `Turn interest into ${g.unit} before the deadline.`, always: `Catch everyone who looks for you.` }[ph] };
}
export const channelLabel = (k) => CHANNELS[k]?.label || k;

/* Demo mode for a show's own chat: understands a few common adjustments. */
export function offlineShowChat({ show, messages }) {
  const t = (messages.filter(m => m.role === "user").at(-1)?.text || "").toLowerCase();
  const open = show.assets.filter(a => !a.done && !a.pending).sort((x, y) => x.date.localeCompare(y.date));
  const next = open.slice(0, 3);
  const days = /(\d+)\s*(day|päiv)/.exec(t)?.[1]; const weeks = /(\d+|a|one|yksi)\s*(week|viik)/.exec(t);
  if (/later|postpone|delay|push|myöhemm|siirr/.test(t) && (days || weeks)) {
    const n = days ? +days : (weeks && /\d/.test(weeks[1]) ? +weeks[1] : 1) * 7;
    return { reply: `I can move everything that's still to do ${n} days later. The posts you've done stay where they are.`, cards: [{ type: "change", summary: `Move ${open.length} posts ${n} days later`, ops: [{ op: "shift", days: n }] }], remember: [] };
  }
  if (/short|long|funn|serious|rewrite|change|tone|casual|formal|lyhy|hausk|muuta|kirjoita/.test(t) && next.length) {
    return { reply: `Here's what I'd do: rewrite the next ${next.length} posts with your note. Apply it and I'll write them again.`, cards: [{ type: "change", summary: `Rewrite: ${next.map(a => a.title || KINDS[a.kind].label).join(", ")}`, ops: [{ op: "rewrite", ids: next.map(a => a.id), note: messages.filter(m => m.role === "user").at(-1)?.text || "" }] }], remember: [] };
  }
  if (/next|what now|seuraav|mitä nyt/.test(t) || !t) {
    return { reply: next.length ? `Next up: ${next.map(a => `${a.title || KINDS[a.kind].label} (${fmtDate(a.date)})`).join(", ")}. Want me to change anything in these?` : "Everything is done. Nice work. Want to plan the next show?", cards: next.length ? [{ type: "question", q: "Change something?", options: ["Make them shorter", "Make them funnier", "Move everything a week later"] }] : [], remember: [] };
  }
  return { reply: "Tell me what to change: the tone, the timing, or the idea. I'll show you the change before anything happens.", cards: [{ type: "question", q: "What should change?", options: ["Make the posts shorter", "Move everything a week later", "What's next?"] }], remember: [] };
}
