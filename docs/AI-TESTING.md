# Testing the AI

The app is only as good as what the Showrunner writes. This is how we find out.

## 1. Run the eval

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
npm run eval                                   # all 6 test businesses
SHOWRUNNER_MODEL=claude-opus-5-5 npm run eval  # compare a different model
```

Each business in `tests/briefs.json` goes through the real path: **first chat message → strategy → first 5 posts**. You get `eval-results/<time>/report.md` (to read and grade) and `results.json` (raw).

The test businesses are chosen to stress different things:

| id | Tests |
|---|---|
| `sauna-fi` | Finnish in → Finnish out; uses the stated price; must not invent discounts ("Älä lupaa alennuksia") |
| `accounting-en` | B2B; LinkedIn and Google; "never give discounts" |
| `yoga-fi` | Beginners; no ad budget; Vaynerchuk style |
| `ceramics-en` | "What should I post today?" should give a post card, not a plan |
| `salon-thin` | Almost no information; it **must ask**, not plan or invent |
| `jazz-fi` | Event with a date; sell-out goal |

## 2. What's checked automatically (flags, not grades)

- Valid JSON, and every post came back
- **Numbers that aren't in the brief:** the top sign of invented facts
- A guarantee or discount the owner never mentioned
- Filler words (unlock, elevate, seamless…)
- The style's namesake mentioned in the output
- Wrong language
- `salon-thin` proposing a plan without asking first

## 3. Grade by hand (1–5)

| | 1 | 3 | 5 |
|---|---|---|---|
| **Understanding** | Misread the business | Generic but right | Got what's special about them |
| **Usefulness** | Owner would ignore it | Needs a rewrite | Would act on it today |
| **Big idea** | No idea, just topics | An idea, loosely used | One sharp idea, every post a variation |
| **Ready to post** | Unusable | Edit before posting | Post as is |
| **Channel fit** | Same text everywhere | Mostly fits | Native to each channel |
| **Voice / style** | Bland | Some style | Clearly that Showrunner, still sounds like the owner |
| **Honesty** | Invented a fact | Vague claim | Only stated facts |

**Bar for "ready to test with real clients":** honesty is 5 everywhere (no exceptions), and the average across the rest is at least 4.

## 4. Fix loop

1. Find the worst pattern in the report (for example, "every reel opens with POV").
2. Change **one** thing in `public/shared/prompts.js` (or a style in `showrunners.js`).
3. Re-run the same briefs and compare the reports side by side.
4. When a real client campaign turns out well, add it to `tests/briefs.json` so it stays good.

## 5. Test in the app

`npm run dev` with a key, then on a phone:

- Start over (Me → Start over) and onboard as a real business you know.
- Does the first reply ask a sensible question, or plan too early?
- Tell it a fact ("we're closed on Mondays"). Is it remembered, and used later?
- Create a show. Read 5 posts the way a customer would.
- Ask for a rewrite with a note ("shorter, mention the terrace"). Did it follow the note?

Write down every moment you thought "I wouldn't post that". That list is the next prompt change.
