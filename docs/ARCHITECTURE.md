# Architecture

## Principles

- **No build step, no dependencies.** The app is plain ES modules served as static files. The server is one Vercel function. `npm install` is never needed.
- **One state object, one render.** `store.js` holds everything; `main.js` re-renders the current screen from it. Views are functions that return HTML strings. Every button carries `data-act="name"`, and all actions live in one table in `main.js` (`A`). Nothing patches anything else.
- **Prompts live on the server side of the line.** The client sends *data* (`{task, input}`); `shared/prompts.js` turns it into a prompt. The same file is imported by the server and by the in-Claude preview, so there is exactly one copy of every prompt.
- **Code plans, AI writes.** Which posts go out, on which channel and which day is computed in `model.js` (`planSlots`), so the calendar always adds up. The model writes only the words.
- **Every AI reply is checked.** `normChat`, `normStrategy` and `normAsset` clamp lengths, drop unknown values and fill gaps. When something can't be saved, `offline.js` writes a plain draft instead, so the app never shows a blank.

## One Show, two experiences (Play + Pro)

| | Webshow Play (`/`) | Webshow Pro (`/pro/`) |
|---|---|---|
| For | Phones and tablets, guided | Computers, the full studio (canvas, nodes, timeline) |
| Opens by default on | touch or narrow screens | wide screen + mouse (no plan needed in the demo) |
| Switch | Me → *Webshow Pro*, desktop side note, `?view=pro` | sidebar → *Webshow Play*, `?view=play` (remembered) |
| Show store | `localStorage["webshow.v1"].shows` | `localStorage["wss.local"].shows/nodes/edges` |

Rules (pure functions, tested, in `public/shared/bridge.js`; Pro loads them with dynamic `import()`):
- **Identity:** a Show has one id everywhere. Play Show opened in Pro → `playToPro()` builds its canvas with the **same id** (via Pro's own `buildSeason`). Pro Show → visible in Play via `proToSlim()` (read-only plan + its conversation).
- **Conversation:** ONE chat per Show id, stored in `webshow.v1.chats` (`chatForShow`, `newShowChat`). Play's show chat and Pro's right-hand Showrunner panel read and write the same chat; a `storage` event keeps an open tab in step.
- **Showrunner style** travels with the Show (`showrunner`).
- **AI:** Pro's panel uses the same server task as Play (`showchat`), with the canvas translated by `proToSlim()`. Changes come back as cards; Pro applies `move`, `shift`, `strategy` (DNA) and `rewrite` (Pro's own `buildNode`); ids that belong to the other experience are shown, not applied.
- **Routing:** `experienceFor()` (and the identical inline script in `index.html`, checked by tests). `/#/show/<id>` on a computer opens that Show in Pro (`/pro/#show=<id>`).

**Known limits (honest, documented in the UI):** the canvas is built from a Play Show **once**; after that, post edits in Play and node edits in Pro don't flow into each other. Emails, reels and stories have no node type in Pro yet, so they are reported as "not on the canvas yet". Both stores are on one device only (no accounts/sync). Pro's built-in generator (`AI.fn`) still only runs inside Claude; outside it builds offline drafts, and its Showrunner panel uses the server.

## The Show Timeline

- **Play** (`js/views/timeline.js`): one week at a time (readable on a phone), phase cards (`phaseCards()`: Hook/Show/Convert with dates from the posts themselves), one track per channel the Show uses (icon tile + item count) with pastel clips, a black Today pill and line. Three temporal types: **events** (a post on its day), **intervals** (ads with `end`, drawn across their days), **evergreen** (landing page, search ad: always on, no invented dates). Tap opens the post; the sheet reschedules with −1/+1 day or a date picker (`moveAsset`). Arrows or swipe change week. The timeline, the Assets list and Home read the **same asset objects**.
- **Pro** (`legacy/pro-studio/src/playful.js` + `playful.css`): the default view of every Show is the **Show Timeline**: a hero, phase cards, a day axis and one track per channel (`plTrack()`: the episode's channel, or its type for ads, quizzes, the landing page, popups, bookings and the chatbot). Clips are the rows of the studio's own `onairRows()`, so dates and delivery states are the real ones; clips are `.tl-bar` elements, so the studio's drag handler moves them (the visible window is registered as `TL_ZOOM.pl`). Clicking a clip opens the studio's `tlDetail()` plus ±1 day / a week later. *Detailed schedule* (`S.pl.detail`) shows the original timeline (`episodes.js`) with results and triggers. Phones keep the original list. The Showrunner panel's suggestions (`plSuggest()`) come from the Show's nodes and each runs a real action (`plspread`, `plresched`, `plopen`, or opening Build/Plan).
- **The rest of Pro** uses the same look from `playful.css`/`playful.js`: every Show page (Assets, Results, Plan, Needs you) opens with a compact version of the Show's pastel header and tabs; cards, inputs, tabs and dialogs are rounder with soft shadows. **Canvas**: white node cards with a coloured icon tile, title, type and an edit (⋮) button, vivid coloured ports and wires (`--pt-*`), a dotted page; on the canvas one right-hand panel shows at a time (a selected node's inspector takes the Showrunner panel's place). **Concept images** (`visualURL`, used for every ready-made image) are drawn joyful: pastel backgrounds, bright shapes, smiling characters, rainbows, suns and confetti; text-on-image still comes from the node.
- **Free canvas** (Build): no Kit / Hook / Show / Convert columns. An episode's phase is stored on the node (`n.lane`, read by `laneOf()` in Pro and `phaseOfNode()` in `shared/bridge.js`); older nodes get it once from where they sat, then keep it wherever they're moved. Phase is set in the inspector (images: "Use this image as" shared visual / Hook / Show / Convert post). Each node shows one dot in and one dot out; dropping a wire anywhere on a node plugs it into the matching input. "+" on a node's right edge (or a wire dropped into empty space) opens the library with **Showrunner suggests**: the next blocks that accept that output, wired automatically and, for buildable blocks (page, popup, carousel, ad), built straight away. ▷ builds every buildable block that isn't built or is out of date. *Preview* opens the Show's landing page. Auto-layout after a build still places things left to right as a starting point.
- **Channels across experiences**: `playToPro()` gives each episode the channel its Play post was made for (`ig_*` → Instagram, `fb_post` → Facebook, `li_post` → LinkedIn page, ads → Meta / Google Ads), so it lands on the right track. Posting still needs a connected account.
- **Artwork**: each Show has one character (`artFor()` in `shared/bridge.js`: starburst, snowflake, leaf, sun), stored as `show.art` and used for posters in Play and the sidebar in Pro. The purple character is the Showrunner. Files in `public/art/` (from the Webshow mascot pack).

## The core flow (v3)

```
Create → "What are we making happen?" (goal) → business (once) → what to promote
       → task "concept" → ONE idea card → Let's make it → pace → createShowFromConcept()
       → planSlots(brief with pace) → task "assets" in batches → show.status ready | partial
Show   → nextMission(): retry → first creative → next post   ·   checkMilestones()   ·   askOutcome()
```
The chat's guided start is a small state machine on the chat (`chat.flow = { step: "goal"|"what"|"offer"|"tweak", … }` in `main.js`), so it is fast and predictable; free conversation still goes to the AI.

## Request flow

```
phone ──POST /api/showrunner {task:"chat"|"showchat"|"concept"|"strategy"|"assets", input}──▶ api/showrunner.js
                                                                           │ TASKS[task](input) → prompt   (shared/prompts.js)
                                                                           │ fetch api.anthropic.com/v1/messages
                                                                           │ parseJSON(reply)
phone ◀────────────────────── {ok:true, data} ─────────────────────────────┘
      normX(data) → state → render
```

`ai.js` picks the backend once, at start:
1. `window.claude.use("sample")`: only when running as a Claude artifact (`npm run preview`).
2. `GET /api/showrunner` returns `ai: true`: your server with a key.
3. Otherwise: demo mode (`offline.js`).

Making one campaign costs 1 strategy call plus ⌈posts / 5⌉ asset calls. A 4-week campaign on 4 channels is about 15 posts, so 4–5 calls.

## Data (localStorage key `webshow.v1`)

```js
{
  version: 1,
  profile: { business, what, audience, offer, voice, facts, avoid, website, showrunner, memory: [{text, at}] },
  chats: { [id]: { id, title, showrunner, showId?,                 // showId set = that show's own chat
                   messages: [{ id, role: "user"|"sr", text, cards: [card], at }], createdAt, updatedAt } },  // last 200 messages kept
  shows: { [id]: {
    id, createdAt, showrunner, status: "writing"|"ready",
    brief: { goal, offer, audience, channels: [..], start, weeks, budget, idea, pace: "light"|"steady"|"full",
             after: { type: "form"|"link"|"call", url, email, phone, fields: [..], title, thanks } },
    strategy: { name, idea, tagline, audience, insight, message, offer, cta, arc: {hook, show, convert}, voice, visual, offerIdeas },
    source: "ai"|"demo", status: "writing"|"ready"|"partial", milestones: { idea, creative, posted, live, response },
    assets: [{ id, kind, phase, date, end?, time, order, title, fields: {..}, image, goal, action, done, doneOn,
               source: "ai"|"demo"|"failed", outcome?: { got, count, at, skipped? }, imageSaved?, gptImage?,
               look?: { photo: "own"|"make", headline, sub, pos, font, size, bg, color },   // only what the owner changed
               hasPhoto? }]                                                                   // the photo itself is in IndexedDB
  }},
  settings: { theme, nudges, lastNudge, plan }
}
```

Card types in chat: `question`, `plan` (+ `showId` once created), `post`, `tip`, `remembered`, `open`, and in show chats `change` (`{summary, ops}` with ops `rewrite`, `move`, `shift`, `strategy`, `done`; applied by `applyChange()` in campaign.js only when the owner taps Apply). Version 1 data (one long chat) is migrated into a first chat on load.
If you change this shape, bump `VERSION` in `store.js` and add a migration in `load()`.

## "Make it": prompts for ChatGPT

`shared/make.js` builds, in code, one or more ready-to-paste prompts for every post (`buildPrompts(asset, show, profile)`): the image with exact text-on-image settings (photo of your own or generated), carousel and story sets, reel cover + shoot plan, the full HTML email, the **whole landing page as one HTML file including what happens after the button** (form via FormSubmit to the owner's email, a link, or a call), and Google Ads set-up help. Changing a setting rebuilds the prompt instantly; nothing is sent to the AI.

Photos from the phone are stored per post in IndexedDB (`js/photos.js`), shrunk to 1600 px. **Save image** draws the finished post (photo + text) on a canvas at the exact format size, matching the CSS preview, and shares it to Photos on phones or downloads it on computers. Photos are not in exports and don't leave the device.

## campaign.json (phone ↔ Pro ↔ anything)

**Export → Campaign file** writes the show above with `format: "webshow.campaign"`, `version: 1`. Each asset also carries `copy` (the ready-to-paste text). Pro, and any future connector, should read this format rather than inventing a new one.

## Adding things

| To add… | Edit |
|---|---|
| A post type | `KINDS` (and `CADENCE`) in `shared/model.js`; a draft in `offline.js` |
| A channel | `CHANNELS` + `CADENCE` in `model.js`, `GOAL_CHANNELS` in `offline.js` |
| A Showrunner style | `shared/showrunners.js`, plus an icon in `js/lib.js` `IC` |
| A chat card | the schema in `chatPrompt` + `normChat`, then render it in `views/chat.js` `cardHTML` |
| A screen | a view in `js/views/`, a case in `render()`, a tab in `TABS` |
| A price | `shared/plans.js` |

## Before going public

- Real rate limiting: replace the in-memory `Map` in `api/showrunner.js` with Upstash Redis or Vercel KV, keyed by user rather than by IP.
- Auth (magic link) and server-side storage; the localStorage shape above maps 1:1 to tables.
- Streaming replies for chat (feels faster on phones).
- Error tracking (Sentry) and a log of prompts and replies for the eval set, with consent.
- A service worker for offline use and Web Push.

## Legacy: Webshow Pro

`public/pro/index.html` is the built desktop studio. Its source is in `legacy/pro-studio/src`, built by `legacy/pro-studio/build.sh`, which concatenates the files in order and later files override earlier ones. It runs standalone, but its AI, file and room features only work inside Claude (it uses `window.claude` capabilities). Treat it as a reference, not a base: port features onto `public/shared/` instead of extending it.

## Build: the creative asset builder (Pro)

Source: `legacy/pro-studio/src/build.js` + `build.css` (loaded last, on top of the studio). Verified end to end by `tests/e2e/build_journey.py`.

- **Assets are the studio's nodes.** Build, Assets and Timeline read the same `S.nodes`; nothing is copied. Each asset keeps its show (the store is per show), its type, its content (`n.p`), its status (draft, drafting, ready/approved, published via the Publish block), the sources it was made from with their versions (`n.src = [{id, v, title}]`) and the foundation it was made with (`n.found`). Its card position (`x`, `y`, `off`) is the only canvas state on it.
- **Foundation.** The Show DNA (goal, audience, offer, key message, main action, approved facts, tone of voice) plus the main style guide and the show's mascot, edited in the pinned *Show foundation* panel on the canvas (or in Plan). Every asset reads it automatically (`briefOf`, `textsInto`, `INHERIT`); wiring a Brief or a Style into one asset overrides it there, visibly ("Brief override", "Style override").
- **Relationships.** Four kinds on each edge (`e.rel`, `e.role`): *use* (Hero image, Copy, Reference, Knowledge…), *create* (Created from), *place* (Embedded form, Embedded quiz, Embedded chatbot…), *link* (CTA destination, Publishes, Posts to…). Underneath they are the studio's typed ports, so builders keep working. Connecting: drag from a card's right dot onto another card (or use *Connect to…*). One valid meaning connects at once; several show a small choice; none explains why. Creation dependencies can't loop (`upstreamHas`); links may go both ways. Labels show on the selected card's wires, and its sources and outputs are highlighted.
- **Create from.** On every suitable card (and its right dot, and the selection bar for several cards). A page becomes an Instagram carousel, search ad variations or a Facebook & Instagram ad drafted from the page's own sections (with the AI, the builders read the page's copy through `textsInto`), a quiz, a version B, or a reusable Text block. Text, references and images become a page, carousel, ads, a form, a chatbot or a popup. *Create* in the toolbar starts from the outcome: Showrunner picks the show's texts and references (images come from the kit), drafts it and places it.
- **Change tracking.** When the foundation changes, assets made with the older version show *Update available*; when a source changes after an asset was made, *Source changed* (`G.stale`). The inspector shows what changed and offers: *Update the changed parts* (replaces only the old wording with the new, leaving every other edit), redraft, or keep as it is. Published pages stay as published until you publish again (the Publish card says "Page changed · publish to update"); the Assets export says when it's out of date. Nothing regenerates by itself.
- **Multi-step form.** A real block (`NT.form`): steps (pick one, short answer, name and email), drafted from the foundation, edited step by step in the inspector, placed on a page as its own section (it replaces the page's simple form, which is hidden, not deleted). On the published page it saves the response with `show` and `asset` (the form's id) through the existing `Store.addLead`; previews say they saved nothing. A quiz can be placed on a page as a card that opens the published quiz. A *Reference* block holds approved facts, FAQs, product information, testimonials or a link.
- **Responses** of forms, quizzes, polls, popups, chatbots, bookings and pages show "Responses saved to: [Show] audience" with the latest entries; each submission is its own entry. Destinations such as HubSpot or Mailchimp stay in Connectors.
- **Canvas.** *Remove* takes a card off the canvas (the asset stays; *Off canvas* puts it back); *Delete asset* is a separate, confirmed action. Undo/redo (buttons, Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z) covers connections, creations, removals, edits and foundation changes. The library is a drawer; the Showrunner panel opens on Build only when you ask for it.

**Known gaps:** email isn't a block yet (shown as *Soon*). Outside Claude the studio's AI writer isn't available, so drafts are made from templates and from the source page's sections, and say so. Positions are still stored on the node object (separate fields, same record). Multi-select is Shift-click or *Select* on a card; there's no lasso yet.
