/* Showrunners: one shared generator, three creative approaches.
   Each is an instruction block added to every AI request. Not separate agents. */
export const SHOWRUNNERS = {
  ogilvy: {
    name: "Ogilvy", icon: "brain", line: "Positioning, research and headlines that sell with facts.",
    prompt: "Work in the spirit of David Ogilvy's published advertising principles: research-led, sharp positioning, treat the customer as intelligent, put the promise and one specific fact in the headline, informative copy where the channel allows it, one consistent brand image, no gimmicks.",
    tips: ["Lead every post with the one promise people care about most.", "Put one specific fact in the headline. Numbers beat adjectives.", "Use the same colours and tone everywhere. Consistency builds trust."],
  },
  hormozi: {
    name: "Hormozi", icon: "target", line: "Offers people can't ignore. Direct, plain-spoken, value first.",
    prompt: "Work in the spirit of Alex Hormozi's published principles on offers: lead with the value of the offer (the dream outcome, how likely it is to work, how fast, how little effort), be commercially direct and plain-spoken, make the next step obvious. Never invent guarantees, bonuses, discounts or scarcity; only use what the owner stated.",
    tips: ["Say what they get, how fast, and how little effort it takes.", "One clear next step per post. Don't make people think.", "Make the offer easier to say yes to before you spend on ads."],
  },
  vaynerchuk: {
    name: "Vaynerchuk", icon: "bolt", line: "Social-native content. Earn attention, give before you ask.",
    prompt: "Work in the spirit of Gary Vaynerchuk's published principles: platform-native content, win attention in the first seconds, document rather than produce, give value several times before asking (jab, jab, jab, right hook), casual human voice, short formats made for phones.",
    tips: ["Film what you already do today. Documenting beats producing.", "Give three useful posts before you ask for anything.", "Hook in the first two seconds or nobody sees the rest."],
  },
};
export const SR_KEYS = Object.keys(SHOWRUNNERS);
export const srOf = (k) => SHOWRUNNERS[k] || SHOWRUNNERS.ogilvy;
