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

## Navigation (v5)

- **Play:** Home (active Show hero, this week's timeline, next mission, your Shows) · Shows · Create. Inside a Show: **Timeline | Assets | Chat**, plus *The idea*.
- **Pro:** sidebar *New show*, *All shows*, Shows (each with its character); inside a Show: **Timeline** (default) · Build (canvas) · Assets · Results · Plan; the Showrunner panel on the right (open by default on wide screens).

## Two experiences, one product

- **Webshow Play** (phone, guided): start a Show, pick or auto-pick a Showrunner, approve one idea, watch it being built ("Finding your big idea → Setting the stage → Building your Show", tied to real steps), then missions, creatives and progress. Shows are a collection of productions; each has its Showrunner one tap away.
- **Webshow Pro** (computer, the studio): sidebar with *New show*, *All shows* and every Show (including ones made in Play), the node canvas, timeline, results, and a **Showrunner panel** for the open Show.
- Same Show identity and the **same Showrunner conversation** in both. During the demo **Pro is open to everyone** (no plan needed); plans are shown for feedback only.

## Phone first, desktop is Pro

- **The phone app is the product.** It's light and fast, and mostly a conversation with the Showrunner. Everything it makes is meant to be copied and posted from a phone.
- **On a computer Webshow opens as Pro** (wide screen + mouse, no touch) for everyone in the demo. Phones and tablets get Play. `?view=play` / `?view=pro` switch and are remembered.
- **Webshow Pro (desktop)** is for power users and our own studio team. It has the canvas, nodes and timeline, like CapCut's desktop version. Today it's the legacy studio in `public/pro/`, and the two share a format: export a show as `campaign.json` from the phone. Pro needs porting (see the roadmap).

## The app: three tabs

| Tab | What it's for |
|---|---|
| **Home** | Your current show as a poster, the **one next mission**, quick outcome checks ("Did it get any replies, inquiries or bookings?"), this week, a tip. |
| **Create** | Talk to your Showrunner. A new chat starts with **"What are we making happen?"**, asks at most two things, then reveals **one campaign idea** to approve (Let's make it / Different angle / Tweak it), then *How much can you post?*. Chats live in the side panel (☰). |
| **Shows** | Every campaign as a poster. A show is a journey: **Hook → Show → Convert**, each a short list of missions with clear status, five real milestones, and its own chat for changes (proposed as a card, applied only when you tap Apply). |

**Me** (business profile, what the Showrunner remembered, favourite Showrunner, plan, theme, data) sits behind the profile button.

**The post: Create.** Preview of the finished post → add a photo → **Save image** → copy the caption → **I posted it**. Text-on-image settings are folded away; ChatGPT prompts are under *More ways to make it*.

**Honesty rules.** Demo content (no AI connected) is labelled *demo* everywhere. If the AI fails, nothing is faked: the post or idea shows *Try again*. Outcomes are only what the owner tells us.

## The Showrunner styles

There are three styles, shown as **The Strategist** (Ogilvy style), **The Closer** (Hormozi style) and **The Creator** (Vaynerchuk style). The first idea is run by whichever fits the goal; you can switch with one tap on the idea, and set a favourite in Me. Each one is a block of instructions added to every AI request, based on that person's *published* marketing principles. They are not separate AI agents. The AI never claims to be the person, never quotes them, and never invents facts, prices, discounts or guarantees in their name. The app says once, in small print, that it isn't affiliated with them.

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
