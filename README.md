# Webshow

**Your Showrunner: an AI marketing buddy in your pocket.**
Tell it about your business, and it plans one campaign at a time around one big idea. It writes every post and tells you what to do today.

This repo is the **phone app** (mobile-first web app, installable to the home screen), plus **one serverless AI endpoint**. The old desktop canvas studio ships alongside it as **Webshow Pro** (legacy, see below).

> Internal beta. No accounts, no payments, no publishing to social networks. Everything is saved on the device.

---

## Run it locally (2 minutes)

You need Node 20.11 or newer. There's nothing to install: the project has no dependencies.

```bash
cp .env.example .env        # then paste your Anthropic API key into .env
npm run dev                 # → http://localhost:5173
```

- Without a key, the app runs in **demo mode**. Every screen works, but the answers are canned (`public/js/offline.js`).
- With a key, every answer comes from the real model through `api/showrunner.js`.
- To try it on your phone, open `http://<your-computer's-ip>:5173` on the same Wi-Fi.
- **Two experiences, one product:** computers open **Webshow Pro** (`/pro/`, the studio), phones open **Webshow Play** (`/`). Switch with `/?view=play` and `/?view=pro` (remembered), or from the sidebar / Me. A Show and its Showrunner conversation are shared between both; see docs/ARCHITECTURE.md for what is shared and what is translated once.

## Deploy to Vercel

1. Push this repo to GitHub, then **Import** it in Vercel. Use framework preset **Other**, with no build command; `vercel.json` already points the output at `public/`.
2. In **Settings → Environment Variables**, add `ANTHROPIC_API_KEY`. `SHOWRUNNER_MODEL` and `SHOWRUNNER_DAILY_LIMIT` are optional.
3. Deploy, open the URL on your phone, and choose **Add to Home Screen**.

> ⚠️ The endpoint is open to anyone who has the URL. The per-IP daily limit (`SHOWRUNNER_DAILY_LIMIT`, default 80 calls) only slows people down; it is not real protection. Before sharing the link outside the team, add Vercel password protection or a real limiter (see docs/ARCHITECTURE.md).

## ChatGPT button logo

Every post has **Copy to ChatGPT** buttons. To show the official ChatGPT logo on them, download it from OpenAI's brand page and save it as `public/brand/chatgpt.svg`. The app picks it up automatically; without it, a neutral chat icon is shown.

## Test

```bash
npm test                    # logic, prompts, exports and the API with a mocked model (no key needed)
npm run eval                # real model: 6 test businesses → eval-results/<time>/report.md
npm run eval sauna-fi       # just one
```

How to grade the eval report: **docs/AI-TESTING.md**. This is the next big step.

## What's where

```
public/                 the app (static, served as-is)
  index.html            shell: one screen + bottom tabs
  styles.css            the whole design: playful pastel look, soft page, blue-violet accent, dark mode
  shared/               code used by BOTH the app and the server
    prompts.js          ← every AI prompt and every reply check. Tune the AI here.
    showrunners.js      the three styles (Ogilvy, Hormozi, Vaynerchuk)
    model.js            channels, post types, and the day-by-day publishing plan
    plans.js            prices (demo)
    make.js             ← the ChatGPT prompts for every post type, text-on-image settings, "after the button"
    util.js             dates, JSON parsing
  js/
    main.js             render, routing and every button action
    store.js            all state, saved to localStorage
    ai.js               where answers come from: Claude preview → /api → demo
    campaign.js         create a show, write posts, rewrite one
    offline.js          demo-mode answers
    export.js           Markdown, calendar (.ics), CSV, campaign.json
    photos.js           photos from the phone (IndexedDB) + drawing the finished post
    views/              chat, today, shows, me, sheets: pure HTML strings
  pro/index.html        Webshow Pro (legacy desktop studio, built file)
api/showrunner.js       the only server code: builds the prompt, calls Claude, returns JSON
scripts/dev.mjs         local server (static files + the API)
scripts/eval.mjs        AI test run
scripts/preview.mjs     one-file build for trying it inside Claude
tests/                  node --test suites + eval briefs
legacy/pro-studio/      source of Webshow Pro (concatenated files; playful.js/.css = the Show Timeline look)
docs/                   product, architecture, AI testing
```

Start with **docs/PRODUCT.md**.
