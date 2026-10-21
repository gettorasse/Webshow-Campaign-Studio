/* Prices in one place. Everything here is shown as a demo: no payments are taken,
   and nothing in the app is locked by plan yet. Change the numbers here and every screen follows. */
export const APP_PLANS = [
  { key: "starter", name: "Starter", price: 0, per: "month", for: "Your Showrunner in your pocket",
    points: ["Chat with your Showrunner", "Campaigns with every post written", "Daily to-dos and tips", "Export to calendar, sheet and text"] },
  { key: "connect", name: "Connect", price: 49, per: "month", for: "Posts go out by themselves",
    points: ["Everything in Starter", "Connect Instagram, Facebook and email (coming)", "Scheduling (coming)", "Results back into the chat (coming)"] },
  { key: "premium", name: "Premium", price: 199, per: "month", for: "For businesses that market every week",
    points: ["Everything in Connect", "Webshow Pro on desktop", "Several campaigns side by side", "More AI and priority answers"] },
  { key: "enterprise", name: "Enterprise", price: 490, per: "month", for: "For teams and agencies",
    points: ["Everything in Premium", "Several brands and a team", "API access (coming)", "Priority support"] },
];
export const STUDIO_PLANS = [
  { key: "air", name: "Webshow on AIR", price: 999, per: "month", for: "Our team runs your marketing with AI",
    points: ["A human team plus your Showrunner", "A new campaign every month", "Photo and video direction", "Monthly review call"] },
  { key: "live", name: "Live campaign", price: 2490, per: "once", for: "A team of real talent comes to your place",
    points: ["Creative team on location for a day", "Photo and video shoot at your business", "Strategy and big idea", "Every post, ad and email ready in the app"] },
];
export const planOf = (k) => [...APP_PLANS, ...STUDIO_PLANS].find(p => p.key === k) || APP_PLANS[0];
export const euro = (n) => "€" + n.toLocaleString("en-US");
/* "Free" for the Starter plan, otherwise "€49 / month" or "€2,490 one-off". */
export const priceText = (p) => p.price === 0 ? "Free" : `${euro(p.price)} / ${p.per === "once" ? "one-off" : "month"}`;
