/* ============================================================
   Templates (prebuilt node graphs) and the example show
   ============================================================ */
const TEMPLATES = {
  full: {
    name: "Full show", desc: "Brief, copy, visuals and style feeding a landing page with an exit popup, a carousel and a Google ad.", icons: ["doc", "layout", "popup", "slides", "ad"],
    graph: () => ({
      nodes: [
        { ref: "brief", type: "brief", x: 0, y: 0, title: "Brief" },
        { ref: "copy", type: "text", x: 0, y: 250, title: "Offer copy" },
        { ref: "hero", type: "image", x: 0, y: 470, title: "Hero visual", p: { motif: "horizon" } },
        { ref: "detail", type: "image", x: 0, y: 820, title: "Detail visual", p: { motif: "arcs", aspect: "1:1" } },
        { ref: "style", type: "style", x: 340, y: 600, title: "Style guide" },
        { ref: "popup", type: "popup", x: 340, y: 0, title: "Exit popup" },
        { ref: "page", type: "page", x: 700, y: 160, title: "Landing page" },
        { ref: "pub", type: "publish", x: 1080, y: 220, title: "Publish" },
        { ref: "car", type: "carousel", x: 700, y: 760, title: "Instagram carousel" },
        { ref: "ad", type: "ad", x: 1080, y: 560, title: "Search ad" },
        { ref: "link", type: "link", x: 1080, y: 900, title: "Link to the page" },
      ],
      edges: [["brief", "text", "page", "text"], ["copy", "text", "page", "text"], ["hero", "image", "page", "images"], ["detail", "image", "page", "images"], ["style", "style", "page", "style"], ["popup", "overlay", "page", "overlays"], ["copy", "text", "popup", "text"], ["page", "page", "pub", "page"], ["brief", "text", "car", "text"], ["hero", "image", "car", "images"], ["detail", "image", "car", "images"], ["style", "style", "car", "style"], ["brief", "text", "ad", "text"], ["style", "style", "hero", "style"], ["style", "style", "detail", "style"], ["page", "page", "link", "page"], ["link", "link", "ad", "link"], ["link", "link", "car", "link"]],
    }),
  },
  pagepop: {
    name: "Landing page + exit popup", desc: "A conversion page with a popup that catches visitors as they leave.", icons: ["layout", "popup"],
    graph: () => ({
      nodes: [
        { ref: "brief", type: "brief", x: 0, y: 0, title: "Brief" },
        { ref: "hero", type: "image", x: 0, y: 260, title: "Hero visual", p: { motif: "spotlight" } },
        { ref: "style", type: "style", x: 0, y: 600, title: "Style guide" },
        { ref: "popup", type: "popup", x: 340, y: 0, title: "Exit popup" },
        { ref: "page", type: "page", x: 700, y: 120, title: "Landing page" },
        { ref: "pub", type: "publish", x: 1080, y: 180, title: "Publish" },
      ],
      edges: [["brief", "text", "page", "text"], ["brief", "text", "popup", "text"], ["hero", "image", "page", "images"], ["style", "style", "page", "style"], ["style", "style", "hero", "style"], ["popup", "overlay", "page", "overlays"], ["page", "page", "pub", "page"]],
    }),
  },
  carousel: {
    name: "Instagram launch carousel", desc: "Five swipeable slides with caption and hashtags, styled from your brand.", icons: ["slides", "image"],
    graph: () => ({
      nodes: [
        { ref: "brief", type: "brief", x: 0, y: 0, title: "Brief" },
        { ref: "i1", type: "image", x: 0, y: 260, title: "Visual 1", p: { motif: "orbs", aspect: "1:1" } },
        { ref: "i2", type: "image", x: 0, y: 600, title: "Visual 2", p: { motif: "blob", aspect: "1:1" } },
        { ref: "style", type: "style", x: 340, y: 420, title: "Style guide" },
        { ref: "car", type: "carousel", x: 700, y: 120, title: "Instagram carousel" },
      ],
      edges: [["brief", "text", "car", "text"], ["i1", "image", "car", "images"], ["i2", "image", "car", "images"], ["style", "style", "car", "style"], ["style", "style", "i1", "style"], ["style", "style", "i2", "style"]],
    }),
  },
  search: {
    name: "Google search ads", desc: "Headlines and descriptions written to Google's limits, checked as you type.", icons: ["ad", "doc"],
    graph: () => ({
      nodes: [{ ref: "brief", type: "brief", x: 0, y: 0, title: "Brief" }, { ref: "ad", type: "ad", x: 360, y: 40, title: "Search ad" }],
      edges: [["brief", "text", "ad", "text"]],
    }),
  },
  leadpop: {
    name: "Lead magnet popup", desc: "A delayed popup that trades a guide or discount for an email address.", icons: ["popup", "text"],
    graph: () => ({
      nodes: [
        { ref: "copy", type: "text", x: 0, y: 0, title: "Offer", p: { text: "" } },
        { ref: "popup", type: "popup", x: 340, y: 0, title: "Lead popup", p: { trigger: "delay", delay: 8, position: "center" } },
      ],
      edges: [["copy", "text", "popup", "text"]],
    }),
  },
};

/* instantiate a template into concrete nodes/edges at an offset */
function instantiate(graph, ox = 0, oy = 0, fill = {}) {
  const ids = {}; const nodes = []; const edges = [];
  graph.nodes.forEach(t => {
    const id = uid("n"); ids[t.ref] = id;
    const p = { ...NT[t.type].params(), ...(t.p || {}), ...(fill[t.ref] || {}) };
    nodes.push({ id, type: t.type, x: t.x + ox, y: t.y + oy, title: fill[t.ref]?.__title || t.title, p, status: "idle", hist: [{ at: now(), by: Store.me.id, note: "Added" }], updatedAt: now(), by: Store.me.id });
    delete p.__title;
  });
  graph.edges.forEach(([f, fp, t, tp]) => ids[f] && ids[t] && edges.push({ id: uid("e"), from: ids[f], fromPort: fp, to: ids[t], toPort: tp }));
  return { nodes, edges, ids };
}

/* ---------- example show (fictional, local only) ---------- */
function exampleShow() {
  const show = { id: "example", name: "Kivi Sauna Co.", client: "Example", tint: "green", createdAt: now() - 864e5, updatedAt: now() - 36e5, example: true, needs: 1, building: 0 };
  const g = instantiate(TEMPLATES.full.graph(), 0, 0, {
    brief: { business: "Kivi Sauna Co.", offer: "Weekend rental of a wood-fired trailer sauna, delivered and set up anywhere in Uusimaa", audience: "Friend groups and families planning a summer cabin weekend or a party", goal: "bookings", cta: "Book a weekend", facts: "Seats 8 people. Delivery anywhere in Uusimaa. Firewood included. Optional hot tub add-on." },
    copy: { text: "Your weekend has a sauna now.\nWe tow a wood-fired sauna for eight to your cabin, beach or backyard, set it up before you arrive and collect it after. Firewood included." },
    hero: { overlay: "", motif: "horizon", alt: "Trailer sauna on a lakeshore at dusk" },
    detail: { motif: "arcs", alt: "Steam rising from hot stones" },
    style: { palette: PALETTES.nordic.c.slice(), fontPair: "editorial", mode: "light", radius: "soft" },
    popup: { headline: "Leaving without a sauna?", body: "Book any June weekend this week and the hot tub add-on is on us.", cta: "Check my dates", email: true, success: "Thanks! We'll send available weekends to your inbox.", trigger: "exit", freq: "session", position: "center", start: "", end: "" },
    page: { goal: "Fill summer weekends with bookings from friend groups", hero: "full", options: ["Any shore is sauna shore", "Rented the cabin? Bring the sauna."] },
    pub: { slug: "kivi-sauna", title: "Kivi Sauna Co. — mobile sauna rental in Uusimaa", desc: "A wood-fired trailer sauna for eight, delivered and set up." },
    car: { platform: "Instagram", count: 5, caption: "Wherever your weekend is, we bring the löyly. Delivered anywhere in Uusimaa, firewood included.", hashtags: ["kivisauna", "puusauna", "kesä", "uusimaa"], slides: [{ title: "Your weekend needs a sauna", text: "" }, { title: "We tow it to your cabin", text: "Beach, backyard or lakeshore." }, { title: "Room for eight", text: "Bring the whole group." }, { title: "Firewood included", text: "Just light the stove." }, { title: "Book a weekend", text: "Link in bio." }] },
    ad: { url: "kivisauna.example/book", keywords: "mobile sauna rental, sauna trailer hire uusimaa", headlines: ["Mobile Sauna Rental Uusimaa", "Wood-Fired Sauna for 8", "Delivered and Set Up", "Firewood Included", "Book a Summer Weekend", "Hot Tub Add-On Available"], descriptions: ["A wood-fired trailer sauna for eight, delivered anywhere in Uusimaa and collected after.", "Firewood included. Add a hot tub. Book your summer weekend online."] },
  });
  const by = (r) => g.nodes.find(n => n.id === g.ids[r]);
  const page = by("page");
  page.p.sections = [
    { id: "s1", type: "hero", layout: "full", eyebrow: "Kivi Sauna Co.", headline: "Your weekend has a sauna now", subhead: "A wood-fired trailer sauna for eight, delivered anywhere in Uusimaa and set up before you arrive.", cta: "Book a weekend", cta2: "What's included", visualId: "i0", hidden: false },
    { id: "s2", type: "benefits", title: "We tow it, you heat it", items: [{ title: "Room for eight", text: "Bring the whole group. The sauna seats eight." }, { title: "Firewood included", text: "Birch, split and stacked. Just light the stove." }, { title: "Set up for you", text: "We deliver anywhere in Uusimaa and collect it after." }], hidden: false },
    { id: "s3", type: "image", visualId: "i1", caption: "Real wood, real löyly.", hidden: false },
    { id: "s4", type: "faq", title: "Good to know", items: [{ q: "Do we need anything on site?", a: "A flat spot the trailer can reach. We handle the rest." }, { q: "Can we add a hot tub?", a: "Yes, the hot tub is an optional add-on." }, { q: "Where do you deliver?", a: "Anywhere in Uusimaa." }], hidden: false },
    { id: "s5", type: "form", title: "Book a weekend", text: "Tell us where and when. We'll confirm availability.", fields: ["name", "email", "date", "message"], button: "Book a weekend", success: "Thanks! We'll confirm your weekend soon.", hidden: false },
    { id: "s6", type: "footer", business: "Kivi Sauna Co.", contact: "kivisauna.example", note: "Uusimaa, Finland", hidden: false },
  ];
  ["page", "popup", "car", "ad"].forEach(r => { const n = by(r); n.status = r === "page" ? "approved" : "ready"; n.builtAt = now() - 36e5; n.updatedAt = now() - 36e5; n.hist.unshift({ at: now() - 36e5, by: "ai", note: "Built by Showrunner" }); });
  ["brief", "copy", "hero", "detail", "style", "pub"].forEach(r => { by(r).updatedAt = now() - 72e5; });
  const t1 = { id: "t_ex1", title: "Which headline leads the page?", nodeId: page.id, status: "needs", createdAt: now() - 36e5, updatedAt: now() - 36e5, by: "ai", messages: [
    { id: "m1", by: "ai", kind: "ai", text: "I built the landing page from the brief, the offer copy and both visuals. The hero currently says “Your weekend has a sauna now”.", at: now() - 36e5 },
    { id: "m2", by: "ai", kind: "decision", text: "Which headline leads the page?", options: ["Your weekend has a sauna now", "Any shore is sauna shore", "Rented the cabin? Bring the sauna."], apply: "hero.headline", picked: null, at: now() - 36e5 },
  ] };
  const t2 = { id: "t_ex2", title: "Popup timing", nodeId: by("popup").id, status: "done", createdAt: now() - 30e5, updatedAt: now() - 30e5, by: "ai", messages: [
    { id: "m3", by: "ai", kind: "ai", text: "The exit popup shows once per session. The hot tub offer is a placeholder: set the real dates under “Active from / until” before publishing.", at: now() - 30e5 },
  ] };
  return { show, nodes: Object.fromEntries(g.nodes.map(n => [n.id, n])), edges: Object.fromEntries(g.edges.map(e => [e.id, e])), threads: { [t1.id]: t1, [t2.id]: t2 } };
}
