/* Showrunners: one shared generator, three creative approaches, shown to owners as plain-language
   archetypes (The Strategist, The Closer, The Creator) with the style they follow in small print.
   Each is an instruction block added to every AI request. Not separate agents, never impersonations. */
export const SHOWRUNNERS = {
  ogilvy: {
    name: "Ogilvy", role: "The Strategist", blurb: "Sharp positioning and headlines that sell with facts.", icon: "brain", line: "Positioning, research and headlines that sell with facts.",
    prompt: "Work in the spirit of David Ogilvy's published advertising principles: research-led, sharp positioning, treat the customer as intelligent, put the promise and one specific fact in the headline, informative copy where the channel allows it, one consistent brand image, no gimmicks.",
    tips: ["Lead every post with the one promise people care about most.", "Put one specific fact in the headline. Numbers beat adjectives.", "Use the same colours and tone everywhere. Consistency builds trust."],
  },
  hormozi: {
    name: "Hormozi", role: "The Closer", blurb: "An offer people can say yes to, made obvious.", icon: "target", line: "Offers people can't ignore. Direct, plain-spoken, value first.",
    prompt: "Work in the spirit of Alex Hormozi's published principles on offers: lead with the value of the offer (the dream outcome, how likely it is to work, how fast, how little effort), be commercially direct and plain-spoken, make the next step obvious. Never invent guarantees, bonuses, discounts or scarcity; only use what the owner stated.",
    tips: ["Say what they get, how fast, and how little effort it takes.", "One clear next step per post. Don't make people think.", "Make the offer easier to say yes to before you spend on ads."],
  },
  vaynerchuk: {
    name: "Vaynerchuk", role: "The Creator", blurb: "Scroll-stopping social content that gives before it asks.", icon: "bolt", line: "Social-native content. Earn attention, give before you ask.",
    prompt: "Work in the spirit of Gary Vaynerchuk's published principles: platform-native content, win attention in the first seconds, document rather than produce, give value several times before asking (jab, jab, jab, right hook), casual human voice, short formats made for phones.",
    tips: ["Film what you already do today. Documenting beats producing.", "Give three useful posts before you ask for anything.", "Hook in the first two seconds or nobody sees the rest."],
  },
};
export const SR_KEYS = Object.keys(SHOWRUNNERS);
export const srOf = (k) => SHOWRUNNERS[k] || SHOWRUNNERS.ogilvy;
/* The first idea is run by whoever fits the goal best; the owner can switch with one tap. */
export const SR_FOR_GOAL = { sales: "hormozi", bookings: "hormozi", leads: "ogilvy", signups: "vaynerchuk", event: "vaynerchuk", awareness: "vaynerchuk" };
