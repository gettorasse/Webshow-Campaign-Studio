# Webshow: product

## The idea

**Give people back the power over their own marketing.**
A small business owner has one place and one buddy: **their Showrunner**. It lives in their phone, learns their business, plans their campaigns, writes every post, and taps them on the shoulder when something is due. They can teach it ("our prices went up", "never mention competitors"), and it gets better the more they use it.

## How we launch (in this order)

1. **Webshow on AIR (a service run by people, AI-first).** Our team uses the Showrunner to run clients' marketing. Every campaign teaches us what good looks like, and those cases become the training material and the proof.
2. **The app (self-serve).** The same Showrunner, used directly by owners. Starter is free, so anyone can try it.

| Plan | Price | What | Status |
|---|---|---|---|
| Starter | Free | Chat, campaigns with every post written, daily to-dos and tips, exports | Built |
| Connect | €49 / month | Connect Instagram, Facebook and email; scheduling; results back into the chat | Not built |
| Premium | €199 / month | **Webshow Pro on desktop** (Premium and Enterprise only), several campaigns side by side, more AI | Pro is legacy |
| Enterprise | €490 / month | Several brands and a team, API, priority support | Not built |
| **Webshow on AIR** | €999 / month | Our team runs your marketing with AI, a new campaign every month | Service |
| Live campaign | €2,490 one-off | A team of real talent comes to your place: a shoot on location, and every post made for you | Service |

There are no payments in the app and nothing is locked by plan yet. **Plans** in *Me* is a clearly labelled demo, so we can watch which plan people pick. Prices live in `public/shared/plans.js`. Pro (desktop) uses the same names and prices in `legacy/pro-studio/src/tiers.js`, where plans do unlock features in the demo.

## Phone first, desktop is Pro

- **The phone app is the product.** It's light and fast, and mostly a conversation with the Showrunner. Everything it makes is meant to be copied and posted from a phone.
- **Webshow Pro is part of Premium and Enterprise.** On a computer (wide screen + mouse, no touch) those plans open straight into Pro (`/pro/`); other plans see the phone app with a "See plans" note, and `/pro/` sends them back to the plans. Testers can force the phone app with `?view=phone`.
- **Webshow Pro (desktop)** is for power users and our own studio team. It has the canvas, nodes and timeline, like CapCut's desktop version. Today it's the legacy studio in `public/pro/`, and the two share a format: export a show as `campaign.json` from the phone. Pro needs porting (see the roadmap).

## The four screens

| Tab | What it's for |
|---|---|
| **Showrunner** (chats) | The home screen. Every new chat starts with **"Who's running your show?"**: pick Ogilvy, Hormozi or Vaynerchuk, then talk. Chats are kept in a side panel (☰), like ChatGPT. Answers come as cards: a question with tap-able answers, a **campaign plan** you create in one tap, a **ready-to-copy post**, or a **tip**. Lasting facts are remembered across all chats. |
| **Today** | What to post today, the next 7 days, a tip, and a daily reminder (shown while the app is open). |
| **Shows** | Your campaigns. Each show has **its own chat** ("Talk about this show", also in the side panel): ask for changes and the Showrunner proposes them as a card (rewrite posts, move dates, shift everything, change the idea), applied only when you tap Apply. Each one has a big idea and a goal, with Hook → Show → Convert spread over 2–8 weeks. Posts are grouped by week; tap one to see the full text, copy it, change the date, mark it done, or ask for a rewrite. Export to text, calendar, spreadsheet or campaign.json. |
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
2. Use it inside Webshow on AIR for real clients and save every good campaign as a test case.
3. Add accounts and sync (Supabase or similar), real rate limits, and error tracking.
4. Add push notifications (service worker + Web Push), then a native shell (Capacitor) if needed.
5. **Connect:** Meta and email connectors, scheduling, and results flowing back into the chat ("your reel got 3 bookings").
6. **Pro:** port the canvas onto the same `shared/` model, reading and writing campaign.json.
