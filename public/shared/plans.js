/* Prices in one place. Everything here is shown as a demo: no payments are taken.
   Change the numbers here and every screen follows. */
export const APP_PLANS = [
  { key: "starter", name: "Starter", price: 49, per: "month", for: "Your Showrunner in your pocket",
    points: ["Chat with your Showrunner", "Campaigns with every post written", "Daily to-dos and tips", "Export to calendar, sheet and text"] },
  { key: "connect", name: "Connect", price: 199, per: "month", draft: true, for: "Posts go out by themselves",
    points: ["Everything in Starter", "Connect Instagram, Facebook and email (coming)", "Scheduling (coming)", "Results back into the chat (coming)"] },
  { key: "enterprise", name: "Enterprise", price: 999, per: "month", for: "For teams and agencies",
    points: ["Everything in Connect", "Webshow Pro on desktop", "API access (coming)", "Several brands and a team"] },
];
export const STUDIO_PLANS = [
  { key: "studio", name: "Webshow Studio", price: 999, per: "month", for: "Our team runs your marketing with AI",
    points: ["A human team plus your Showrunner", "A new campaign every month", "Photos and video direction", "Monthly review call"] },
  { key: "launch", name: "Launch campaign", price: 2490, per: "once", for: "One campaign, made for you",
    points: ["Strategy and big idea", "All posts, ads and emails", "Landing page copy", "Hand-over in the app"] },
];
export const planOf = (k) => [...APP_PLANS, ...STUDIO_PLANS].find(p => p.key === k) || APP_PLANS[0];
export const euro = (n) => "€" + n.toLocaleString("en-US");
