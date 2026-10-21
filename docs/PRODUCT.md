# Webshow: product

## The idea

**Give people back the power over their own marketing.**
A small business owner has one place and one buddy: **their Showrunner**. It lives in their phone, learns their business, plans their campaigns, writes every post, and taps them on the shoulder when something is due. They can teach it ("our prices went up", "never mention competitors"), and it gets better the more they use it.

## How we launch (in this order)

1. **Webshow Studio (a service run by people, AI-first).** Our team uses the Showrunner internally to run clients' marketing. Every campaign teaches us what good looks like, and those cases become the training material and the proof.
   - **€999 / month:** ongoing done-for-you marketing.
   - **€2,490 one-off:** one launch campaign, made for you.
   - ⚠️ *A €9,999/month tier was also mentioned. We assumed this was a slip for €999. If a premium agency tier is intended, add it to `public/shared/plans.js`.*
2. **The app (self-serve).** The same Showrunner, used directly by owners.

| Plan | Price | What | Status |
|---|---|---|---|
| Starter | €49 / month | Chat, campaigns, every post written, daily to-dos and tips, exports | Built (demo pricing) |
| Connect | €199 / month *(placeholder)* | Connectors: publish to Instagram/Facebook/email, results back into the chat | Not built |
| Enterprise | €999 / month | API, team, several brands, Webshow Pro on desktop | Not built |
| Webshow Studio | €999 / month | Human team + Showrunner | Service, sold outside the app |
| Launch campaign | €2,490 one-off | One campaign made for you | Service |

There are no payments in the app. **Plans** in *Me* is a clearly labelled demo, so we can watch which plan people pick. Prices live in `public/shared/plans.js`. The word "free" is never used (a test enforces this).

## Phone first, desktop is Pro

- **The phone app is the product.** It's light and fast, and mostly a conversation with the Showrunner. Everything it makes is meant to be copied and posted from a phone.
- **Opening Webshow on a computer always launches Pro** (wide screen + mouse, no touch → `/pro/`). Phones and tablets get the app. Testers can force the phone app with `?view=phone`.
- **Webshow Pro (desktop)** is for power users and our own studio team. It has the canvas, nodes and timeline, like CapCut's desktop version. Today it's the legacy studio in `public/pro/`, and the two share a format: export a show as `campaign.json` from the phone. Pro needs porting (see the roadmap).

## The four screens

| Tab | What it's for |
|---|---|
| **Showrunner** (chat) | The home screen. On first open: pick a style, describe the business, then just talk. The answers come as cards: a question with tap-able answers, a **campaign plan** you can create in one tap, a **ready-to-copy post**, or a **tip**. Lasting facts are remembered. |
| **Today** | What to post today, the next 7 days, a tip, and a daily reminder (shown while the app is open). |
| **Shows** | Your campaigns. Each one has a big idea and a goal, with Hook → Show → Convert spread over 2–8 weeks. Posts are grouped by week; tap one to see the full text, copy it, change the date, mark it done, or ask for a rewrite. Export to text, calendar, spreadsheet or campaign.json. |
| **Me** | Train your Showrunner: its style, what it knows about the business, what it remembered from chats (you can delete any of it). Also plan (demo), theme, data download and start over. |

## The Showrunner styles

There are three styles, named by surname only: **Ogilvy**, **Hormozi**, **Vaynerchuk**. Each one is a block of instructions added to every AI request, based on that person's *published* marketing principles. They are not separate AI agents. The AI never claims to be the person, never quotes them, and never invents facts, prices, discounts or guarantees in their name. The app says once, in small print, that it isn't affiliated with them.

## What's real and what's simulated

| Real | Simulated or not built |
|---|---|
| AI chat, campaign strategy, every post written (with your API key) | Payments and plans (demo) |
| Publishing plan: channels, days and times worked out in code | Publishing to social networks or email (you copy and paste) |
| Memory of business facts | Accounts, sync across devices (everything is on one device) |
| Exports: .md, .ics, .csv, .json | Real push notifications (reminders only show while the app is open) |
| Light and dark, installable to the home screen | Images (we give image prompts, not images) |
| | Pro's AI only works inside Claude (legacy) |

## Roadmap (suggested)

1. **Now:** test the AI against real briefs (docs/AI-TESTING.md). Fix prompts until 4 out of 5 posts are "would post as is".
2. Use it inside Webshow Studio for real clients and save every good campaign as a test case.
3. Add accounts and sync (Supabase or similar), real rate limits, and error tracking.
4. Add push notifications (service worker + Web Push), then a native shell (Capacitor) if needed.
5. **Connect:** Meta and email connectors, scheduling, and results flowing back into the chat ("your reel got 3 bookings").
6. **Pro:** port the canvas onto the same `shared/` model, reading and writing campaign.json.
