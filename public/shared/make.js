/* "Make it": ready-to-paste prompts that turn every post into the finished thing in ChatGPT.
   Built in code from the post, the campaign and what the owner told us, so they are always
   complete and update the moment a setting changes. No DOM here (tested in tests/make.test.js). */
import { CHANNELS, FORMATS, GOALS, KINDS } from "./model.js";
import { clip, str } from "./util.js";

/* ---------- what happens after the button ---------- */
export const AFTER_TYPES = [["form", "Form"], ["link", "Link"], ["call", "Call"]];
export const AFTER_FIELDS = [["name", "Name"], ["email", "Email"], ["phone", "Phone"], ["date", "Preferred date"], ["people", "Group size"], ["message", "Message"]];
const FORM_TITLE = { bookings: "Book your spot", leads: "Get in touch", sales: "Order", signups: "Sign up", event: "Save your spot", awareness: "Stay in touch" };
export function defaultAfter(goal, p = {}) {
  const link = str(p.website);
  if ((goal === "sales" || goal === "awareness") && link) return { type: "link", url: link, email: str(p.email), phone: str(p.phone), fields: ["name", "email"], title: FORM_TITLE[goal], thanks: "Thanks! We'll be in touch soon." };
  const fields = goal === "bookings" ? ["name", "email", "phone", "date", "people", "message"] : goal === "event" ? ["name", "email", "people"] : goal === "signups" ? ["name", "email"] : ["name", "email", "phone", "message"];
  return { type: "form", url: link, email: str(p.email), phone: str(p.phone), fields, title: FORM_TITLE[goal] || "Get in touch", thanks: goal === "bookings" ? "Thanks! We'll confirm your booking by email within a day." : "Thanks! We'll be in touch soon." };
}
export const afterOf = (show, p) => ({ ...defaultAfter(show?.brief?.goal, p), ...(show?.brief?.after || {}) });
/* One line for prompts and the AI brief. */
export function afterLine(af) {
  const f = AFTER_FIELDS.filter(([k]) => af.fields?.includes(k)).map(([, l]) => l).join(", ");
  if (af.type === "link") return `The button opens ${af.url || "the owner's website (link to be added)"}.`;
  if (af.type === "call") return `The button calls ${af.phone || "the owner (number to be added)"}${af.email ? `; there's also an email link to ${af.email}` : ""}.`;
  return `The button opens a short form "${af.title}" (${f || "Name, Email"}). Answers go to ${af.email || "the owner's email (to be added)"}. After sending, people see: "${af.thanks}"`;
}

/* ---------- text on the image ---------- */
export const LOOK_POS = [["top", "Top"], ["middle", "Middle"], ["bottom", "Bottom"]];
export const LOOK_FONT = [["bold", "Bold"], ["clean", "Clean"], ["serif", "Elegant"], ["hand", "Hand"]];
export const LOOK_SIZE = [["s", "S"], ["m", "M"], ["l", "L"]];
export const LOOK_BG = [["none", "None"], ["shade", "Shade"], ["band", "Band"], ["box", "Box"]];
export const LOOK_COLORS = ["#ffffff", "#0b0b10", "#6b5bff", "#ffd84d", "#ff5a36"];
const FONT_WORDS = { bold: "a heavy, modern sans-serif (like Funnel Display Bold or Inter Black)", clean: "a clean, medium-weight sans-serif (like Geist or Helvetica)", serif: "an elegant serif (like Playfair Display or Cormorant)", hand: "a friendly handwritten script (like Caveat), still easy to read" };
const SIZE_WORDS = { s: "small and quiet – the headline about 1/18 of the image height", m: "medium – the headline about 1/13 of the image height", l: "big and bold – the headline about 1/9 of the image height" };
const BG_WORDS = { none: "no background behind the text; pick a calm part of the photo so it stays readable", shade: "a soft, dark gradient fading in behind the text so it's always readable", band: "a solid colour band across the full width behind the text", box: "a rounded box behind the text, slightly see-through" };
const POS_WORDS = { top: "the top third", middle: "the centre", bottom: "the bottom third" };
const COLOR_NAMES = { "#ffffff": "white", "#0b0b10": "near-black", "#6b5bff": "purple", "#ffd84d": "warm yellow", "#ff5a36": "orange-red" };
export const VISUAL_KINDS = ["ig_post", "fb_post", "meta_ad", "li_post", "ig_carousel", "ig_story", "ig_reel", "tiktok", "email", "landing"];
const firstLine = (s) => str(s).split("\n").map(x => x.trim()).filter(Boolean)[0] || "";
export function defaultLook(a) {
  const f = a.fields || {};
  const head = str(f.hook) || firstLine(f.subject) || clip(firstLine(f.slides || f.frames), 70);
  return { photo: "own", headline: head, sub: "", pos: ["ig_story", "ig_reel", "tiktok"].includes(a.kind) ? "middle" : "bottom", font: "bold", size: "l", color: "#ffffff", bg: "shade" };
}
export const lookOf = (a) => ({ ...defaultLook(a), ...(a.look || {}) });
export const fmtOf = (a) => FORMATS[KINDS[a.kind]?.fmt] || FORMATS.post45;

/* ---------- the prompts ---------- */
const LANG = "Write every word on the image exactly as given here – same language, same spelling. Don't add any other text, logos, watermarks or made-up numbers.";
function textSpec(look, fmt, vertical) {
  const lines = [`Headline: "${str(look.headline)}"`]; if (str(look.sub)) lines.push(`Second line, smaller: "${str(look.sub)}"`);
  return `TEXT ON THE IMAGE
${lines.join("\n")}
- Position: ${POS_WORDS[look.pos] || POS_WORDS.bottom}, with comfortable margins (about 6% of the width)
- Font: ${FONT_WORDS[look.font] || FONT_WORDS.bold}
- Size: ${SIZE_WORDS[look.size] || SIZE_WORDS.l}
- Colour: ${look.color} (${COLOR_NAMES[str(look.color).toLowerCase()] || "custom colour"})
- Behind the text: ${BG_WORDS[look.bg] || BG_WORDS.shade}${look.bg === "band" || look.bg === "box" ? `, in a colour that contrasts with ${look.color}` : ""}
${vertical ? "- Keep the top 14% and bottom 20% clear of text (Instagram and TikTok put their buttons there).\n" : ""}- ${LANG}`;
}
function photoSpec(look, scene, posWord) {
  return look.photo === "make"
    ? `PHOTO\nCreate a realistic photo: ${str(scene) || "the product or service in real use"}. Natural light, real-looking, not stock-photo staged. Leave calm space in ${posWord} for the text.`
    : `PHOTO\nUse the photo I've attached as the base. Keep the people, products and place exactly as they are – don't redraw, replace or "improve" them. You may crop, straighten, and gently fix light and colour. If the composition needs it, extend the background naturally.`;
}
const sizeLine = (label, fmt) => `Make a finished ${label} image, ${fmt.w} × ${fmt.h} px.`;
export function imagePrompt({ label, fmt, look, scene, visual, vertical }) {
  return [sizeLine(label, fmt), photoSpec(look, scene, POS_WORDS[look.pos] || "the bottom third"), textSpec(look, fmt, vertical), visual ? `STYLE\n${visual}` : "", "Give me the image only, no explanations. If anything is unclear, make the best choice and still give me the image."].filter(Boolean).join("\n\n");
}
const noDot = (s) => str(s).replace(/[.\s]+$/, "");
const listOf = (s) => str(s).split("\n").map(x => x.trim()).filter(Boolean);
const PASTE_PHOTO = "In ChatGPT, attach your photo first (+ → Photos), then paste.";

/* Every post gets one or more prompts: [{ key, label, hint, photo, text }]. */
export function buildPrompts(a, show, p = {}) {
  const K = KINDS[a.kind]; if (!K) return [];
  const f = a.fields || {}, st = show?.strategy || {}, look = lookOf(a), fmt = fmtOf(a), af = afterOf(show, p);
  const biz = str(p.business) || str(p.what) || "my business"; const visual = str(st.visual);
  const vertical = fmt.h > fmt.w * 1.5; const own = look.photo !== "make";
  const img = (label, extra = {}) => ({ key: "image", label: "Make the image", photo: own, hint: own ? PASTE_PHOTO : "Paste in ChatGPT. It will make the photo and the text.", text: imagePrompt({ label, fmt, look, scene: a.image, visual, vertical, ...extra }) });
  const out = [];
  switch (a.kind) {
    case "ig_post": case "fb_post": case "li_post":
      out.push(img(`${K.label}`)); break;
    case "meta_ad":
      out.push(img("Facebook and Instagram ad", { visual: [visual, "Keep the text short – ads with less text on the image usually reach more people."].filter(Boolean).join(" ") })); break;
    case "ig_carousel": {
      const slides = listOf(f.slides); const n = slides.length || 5;
      out.push({ key: "slides", label: `Make all ${n} slides`, photo: own, hint: own ? "Attach one or more of your photos in ChatGPT, then paste. Say “next” after each slide." : "Paste in ChatGPT. Say “next” after each slide.",
        text: `Make an Instagram carousel of ${n} slides, each ${fmt.w} × ${fmt.h} px, all in exactly the same style so they look like one set.

${own ? "PHOTOS\nUse the photos I've attached. Keep people, products and places exactly as they are – you may crop and gently fix light and colour. If there are fewer photos than slides, use plain colour slides that match the photos." : `PHOTOS\nCreate realistic photos on this theme: ${str(a.image) || st.idea || biz}. Natural light, not stock-photo staged.`}

SLIDE TEXT (one slide each, exactly as written)
${(slides.length ? slides : [look.headline]).map((s, i) => `${i + 1}. "${s}"`).join("\n")}

TEXT STYLE ON EVERY SLIDE
- Position: ${POS_WORDS[look.pos]}; font: ${FONT_WORDS[look.font]}; size: ${SIZE_WORDS[look.size]}
- Colour ${look.color}; behind the text: ${BG_WORDS[look.bg]}
- Slide 1 must stop the scroll. The last slide ends with the call to action: "${str(f.cta) || st.cta || ""}"
- ${LANG}
${visual ? `\nSTYLE\n${visual}\n` : ""}
Make slide 1 now. When I write "next", make the next slide in exactly the same style.` });
      break;
    }
    case "ig_story": {
      const frames = listOf(f.frames);
      out.push({ key: "frames", label: `Make the ${frames.length || 3} story frames`, photo: own, hint: own ? PASTE_PHOTO + " Say “next” after each frame." : "Paste in ChatGPT. Say “next” after each frame.",
        text: `Make ${frames.length || 3} Instagram story frames, each ${fmt.w} × ${fmt.h} px (9:16), in one consistent style.

${photoSpec(look, a.image, POS_WORDS[look.pos])}

FRAME TEXT (one frame each, exactly as written)
${(frames.length ? frames : [look.headline]).map((s, i) => `${i + 1}. "${s}"`).join("\n")}

TEXT STYLE
- Position: ${POS_WORDS[look.pos]}; font: ${FONT_WORDS[look.font]}; size: ${SIZE_WORDS[look.size]}; colour ${look.color}; behind the text: ${BG_WORDS[look.bg]}
- Keep the top 14% and bottom 20% empty: Instagram puts its buttons there, and the last frame needs room for the sticker (${str(f.sticker) || "link sticker"}).
- ${LANG}

Make frame 1 now. When I write "next", make the next one.` });
      break;
    }
    case "ig_reel": case "tiktok":
      out.push({ ...img(`${K.label} cover`), label: "Make the cover image" });
      out.push({ key: "film", label: "Plan the filming", photo: false, hint: "Paste in ChatGPT for a step-by-step shoot plan you can follow with your phone.",
        text: `Help me film this ${K.label.toLowerCase()} today with just my phone. Turn the script below into a simple shoot plan: each shot with what to film, where to stand, how long, and what to say or show on screen. Then give me the on-screen texts with the exact second they appear, and 3 tips to make the first 2 seconds stop the scroll.
Keep my words as they are; don't add claims or numbers.

Business: ${biz}
Opening line (first 2 seconds): "${str(f.hook)}"
Script:
${str(f.script)}
Caption: ${str(f.caption)}
${f.audio ? `Sound: ${f.audio}\n` : ""}Format: vertical 9:16, ${a.kind === "tiktok" ? "TikTok" : "Instagram Reels"}, 10–20 seconds.` });
      break;
    case "email":
      out.push({ key: "email", label: "Make the email", photo: false, hint: "Paste in ChatGPT. You get a ready HTML email to paste into your email tool (Mailchimp, MailerLite, Gmail…).",
        text: `Write a ready-to-send marketing email as HTML I can paste into my email tool. Use simple, email-safe HTML (tables, inline CSS, max width 600 px, looks great on phones, dark-mode friendly). Keep my words exactly; don't add claims, prices or numbers.

Subject line: ${str(f.subject)}
Preview text: ${str(f.preview)}
Header image: a full-width image with the text "${str(f.hook)}" (use a placeholder <img src="header.jpg"> with good alt text).
Body:
${str(f.body)}
Button: "${str(f.cta) || st.cta || "Read more"}" → ${af.type === "link" ? af.url || "[link to add]" : af.type === "call" ? `tel:${af.phone || "[number to add]"}` : `${af.url || "[your landing page link]"}#form`}
Footer: ${biz}${p.website ? ` · ${p.website}` : ""}${p.email ? ` · ${p.email}` : ""} and an unsubscribe link placeholder.

Return the complete HTML in one code block, then the subject and preview text on their own.` });
      out.push({ ...img("email header", { vertical: false }), label: "Make the header image" });
      break;
    case "landing":
      out.push({ key: "page", label: "Make the whole page", photo: false, hint: "Paste in ChatGPT. You get one HTML file: open it in a browser, or upload it to your website or a host like Netlify Drop.", text: landingPrompt(a, show, p, af, look) });
      out.push({ ...img("website hero", { vertical: false }), label: "Make the hero image" });
      break;
    case "search_ad":
      out.push({ key: "gads", label: "Set it up with help", photo: false, hint: "Paste in ChatGPT for click-by-click help in Google Ads.",
        text: `Walk me through setting up this Google search ad, click by click, in the current Google Ads interface. I'm not an expert. Keep my texts exactly; if a headline is over 30 characters or a description over 90, tell me and suggest a shorter version.

Business: ${biz}
Send people to: ${af.type === "link" && af.url ? af.url : str(p.website) || "[my landing page]"}
Goal: ${(GOALS[show?.brief?.goal] || GOALS.leads).label}
Headlines:
${str(f.headlines)}
Descriptions:
${str(f.descriptions)}
Keywords: ${str(f.keywords)}
${+show?.brief?.budget ? `Total ad budget for the whole campaign: ${show.brief.budget} €` : "Suggest a small daily budget to start."}` });
      break;
  }
  return out;
}

export function landingPrompt(a, show, p, af = afterOf(show, p), look = lookOf(a)) {
  const f = a.fields || {}, st = show?.strategy || {};
  const sections = listOf(f.sections), faq = listOf(f.faq);
  const cta = str(f.cta) || st.cta || "Get in touch";
  const fields = AFTER_FIELDS.filter(([k]) => af.fields?.includes(k)).map(([k, l]) => `${l}${k === "name" || k === "email" ? " (required)" : ""}`);
  const after = af.type === "link"
    ? `Every button links to ${af.url || "[my link – leave a clear placeholder]"}.`
    : af.type === "call"
    ? `Every button calls ${af.phone || "[my phone number]"} (a tel: link). Under the main button, add a smaller "or send an email" link to ${af.email || "[my email]"}.`
    : `Every button scrolls smoothly to a form titled "${af.title}" with these fields: ${fields.join(", ") || "Name (required), Email (required)"}.${af.fields?.includes("date") ? " Use a date picker for the date." : ""}
The form sends the answers to my email ${af.email || "[my email]"} using FormSubmit: <form action="https://formsubmit.co/${af.email || "YOUR-EMAIL"}" method="POST">, with a hidden _subject field "New ${(GOALS[show?.brief?.goal] || GOALS.leads).unit.replace(/s$/, "")} from the ${st.name || "campaign"} page" and _captcha set to false.
After sending, show this message on the same page (no reload): "${af.thanks}"
If a required field is missing, show a friendly error message next to it.`;
  return `Build me a complete, ready-to-publish landing page as ONE HTML file (HTML, CSS and a little JavaScript; no frameworks; only Google Fonts as an outside file). Design it for phones first, and make it look great on a computer too.

ABOUT
Business: ${str(p.business) || str(p.what)}${p.what && p.business ? ` – ${p.what}` : ""}
Campaign: ${st.name || ""}. Big idea: ${st.idea || ""}
For: ${st.audience || p.audience || ""}
Voice: ${st.voice || p.voice || "friendly and direct"}
Look: ${noDot(st.visual) || "clean, lots of white space, one strong photo"}. Main colour: ${look.color === "#ffffff" || look.color === "#0b0b10" ? "#6b5bff" : look.color}. Headings in ${FONT_WORDS[look.font] || FONT_WORDS.bold}.

USE MY WORDS EXACTLY. Don't add prices, reviews, numbers, awards or promises that aren't below.

PAGE, TOP TO BOTTOM
1. Hero: headline "${str(f.hook)}", subheadline "${str(f.sub)}", main button "${cta}". Full-width hero photo: use <img src="hero.jpg"> (I'll add my own photo) with alt text describing: ${noDot(clip(str(a.image) || st.visual || "the product in use", 140))}.
${sections.map((s, i) => `${i + 2}. Section: ${s}`).join("\n")}
${sections.length + 2}. Questions (tap to open): ${faq.length ? faq.map(q => `\n   - ${q}`).join("") : "none"}
${sections.length + 3}. Final call to action: repeat "${cta}".
${sections.length + 4}. Footer: ${[str(p.business), str(p.website), str(p.email || af.email), str(p.phone || af.phone)].filter(Boolean).join(" · ") || "business name and contact details"}.

WHAT HAPPENS WHEN SOMEONE TAPS THE BUTTON
${after}

ALSO
- A sticky "${cta}" button at the bottom of the screen on phones.
- Page title and meta description, Open Graph tags for sharing, a favicon made from the first letter of the business name.
- Accessible: good contrast, labels on every field, works with the keyboard.
- Fast: no heavy libraries.

Return the complete file in one code block, then two lines on how to publish it.`;
}

/* A post card in the chat gets the same treatment. */
export function chatPostPrompt(c, p = {}) {
  const look = { ...defaultLook({ kind: "ig_post", fields: { hook: c.hook } }), photo: "own" };
  const ch = CHANNELS[c.channel]?.label || "Instagram";
  const fmt = c.channel === "linkedin" ? FORMATS.wide : c.channel === "facebook" ? FORMATS.square : c.channel === "tiktok" ? FORMATS.story : FORMATS.post45;
  return imagePrompt({ label: `${ch} post`, fmt, look, scene: c.image_prompt, visual: "", vertical: fmt.h > fmt.w * 1.5 });
}
