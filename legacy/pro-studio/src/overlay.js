/* ============================================================
   Overlay & gradient editor (page images, carousel slides, image nodes)
   ============================================================ */
const OV_PRESETS = [
  ["Fade up", { kind: "linear", angle: 0, stops: [{ c: "ink", a: 88, p: 0 }, { c: "ink", a: 0, p: 65 }] }],
  ["Fade down", { kind: "linear", angle: 180, stops: [{ c: "ink", a: 80, p: 0 }, { c: "ink", a: 0, p: 55 }] }],
  ["Side fade", { kind: "linear", angle: 90, stops: [{ c: "ink", a: 88, p: 0 }, { c: "ink", a: 0, p: 70 }] }],
  ["Darken", { kind: "solid", stops: [{ c: "#000000", a: 40, p: 0 }] }],
  ["Brand tint", { kind: "solid", blend: "multiply", stops: [{ c: "pri", a: 75, p: 0 }] }],
  ["Duotone", { kind: "linear", angle: 135, blend: "color", stops: [{ c: "pri", a: 90, p: 0 }, { c: "pop", a: 90, p: 100 }] }],
  ["Spotlight", { kind: "radial", cx: 50, cy: 40, stops: [{ c: "ink", a: 0, p: 25 }, { c: "ink", a: 85, p: 100 }] }],
  ["Glow", { kind: "radial", cx: 72, cy: 28, blend: "screen", stops: [{ c: "pop", a: 75, p: 0 }, { c: "pop", a: 0, p: 60 }] }],
];
const OV_KIND_DEF = {
  solid: () => ({ kind: "solid", blend: "normal", stops: [{ c: "ink", a: 45, p: 0 }] }),
  linear: () => clone({ ...OV_PRESETS[0][1], blend: "normal" }),
  radial: () => clone({ ...OV_PRESETS[6][1], blend: "normal" }),
};
const OV_BLENDS = [["normal", "Normal"], ["multiply", "Multiply"], ["screen", "Screen"], ["overlay", "Overlay"], ["soft-light", "Soft light"], ["color", "Colour"]];
const OV_NAMES = ["Ink", "Primary", "Secondary", "Paper", "Pop"];
S.ovStop = {};

function ovBarBg(o) { return `linear-gradient(90deg,${o.kind === "solid" ? `${ovColor(o.stops[0].c, o.stops[0].a)},${ovColor(o.stops[0].c, o.stops[0].a)}` : ovStops(o)})`; }
function ovPanel(o, pal, t, label = "Overlay & gradient", hint = "") {
  pal = pal || PALETTES.webshow.c; const k = o?.kind && o.stops?.length ? o.kind : "none"; const stops = k === "none" ? [] : o.stops;
  const si = Math.max(0, Math.min(S.ovStop[t] ?? 0, stops.length - 1)); const cs = stops[si];
  const pre = OV_PRESETS.map(([name, p], i) => `<button class="ovpre" data-act="ovpreset" data-i="${i}" title="${name}" aria-label="${name}"><i style="${ovCSS(p)}"></i><span>${name}</span></button>`).join("");
  return `<div class="grp ovp" data-ovt="${t}" style="${palVars(pal)}"><h4>${esc(label)}</h4>${hint ? `<small class="faint ovhint">${esc(hint)}</small>` : ""}
    <div class="seg" style="justify-self:start">${[["none", "None"], ["solid", "Solid"], ["linear", "Linear"], ["radial", "Radial"]].map(([v, l]) => `<button data-act="ovkind" data-v="${v}" aria-pressed="${k === v}">${l}</button>`).join("")}</div>
    <div class="ovpres">${pre}</div>
    ${k === "none" ? "" : `
    ${k !== "solid" ? `<div class="ovbar" data-ovbar="1" title="Click to add a colour point"><div class="ovbar-g" style="background:${ovBarBg(o)}"></div>${stops.map((x, i) => `<button class="stp ${i === si ? "on" : ""}" data-stop="${i}" style="left:${x.p}%;--c:${ovHex(x.c, pal)}" aria-label="Colour point ${i + 1} at ${x.p}%"></button>`).join("")}</div>
      <small class="faint">Click the bar to add a point. Drag points to move them.</small>` : ""}
    <div class="ovstop"><div class="swrow">${pal.map((c, j) => `<button class="sw" data-act="ovtok" data-v="${OV_TOKS[j]}" aria-pressed="${cs.c === OV_TOKS[j]}" style="background:${c}" title="${OV_NAMES[j]} (follows the style guide)" aria-label="${OV_NAMES[j]}"></button>`).join("")}<button class="sw" data-act="ovtok" data-v="#000000" aria-pressed="${cs.c === "#000000"}" style="background:#000" aria-label="Black"></button><button class="sw" data-act="ovtok" data-v="#ffffff" aria-pressed="${cs.c === "#ffffff"}" style="background:#fff" aria-label="White"></button><label class="ovpick" title="Custom colour"><input type="color" data-ovf="c" value="${ovHex(cs.c, pal)}" aria-label="Custom colour"></label></div>
      <label class="adj"><span>Opacity</span><input type="range" min="0" max="100" data-ovf="a" value="${cs.a}"><output>${cs.a}%</output></label>
      ${k !== "solid" ? `<label class="adj"><span>Point at</span><input type="range" min="0" max="100" data-ovf="p" value="${cs.p}"><output>${cs.p}%</output></label>` : ""}
      ${k !== "solid" && stops.length > 2 ? `<button class="btn sm ghost" style="justify-self:start" data-act="ovdelstop">${ICON.trash} Remove this point</button>` : ""}</div>
    ${k === "linear" ? `<label class="adj"><span>Angle</span><input type="range" min="0" max="360" step="5" data-ovf="angle" value="${o.angle ?? 180}"><output>${o.angle ?? 180}°</output></label>` : ""}
    ${k === "radial" ? `<label class="adj"><span>Centre X</span><input type="range" min="0" max="100" data-ovf="cx" value="${o.cx ?? 50}"><output>${o.cx ?? 50}%</output></label><label class="adj"><span>Centre Y</span><input type="range" min="0" max="100" data-ovf="cy" value="${o.cy ?? 50}"><output>${o.cy ?? 50}%</output></label>` : ""}
    <label class="fld"><span>Blend</span><select class="inp" data-ovf="blend">${OV_BLENDS.map(([v, l]) => `<option value="${v}" ${(o.blend || "normal") === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>`}</div>`;
}

/* ---------- where an overlay lives ---------- */
function ovTarget(t) {
  if (t === "sec" && S.preview) {
    const n = S.nodes[S.preview.nodeId]; const i = S.preview.imgFor; const s = n?.p.sections?.[i]; if (!s) return null;
    return { n, pal: styleOf(n)?.palette, own: () => (s.ov && s.ov.stops ? s.ov : (s.ov = clone(secOv(s) || { kind: "none", stops: [] }))), cur: () => secOv(s), set: (o) => { s.ov = o; }, els: () => $$(`#pf [data-sec="${i}"] .ov.sec`), done: () => paintNode(n.id) };
  }
  if (t === "slide" && S.nodeEd) {
    const n = S.nodes[S.nodeEd.id]; const i = S.nodeEd.slide; const sl = n?.p.slides?.[i]; if (!sl) return null; const hasImg = () => !!slideImg(n, sl, i);
    return { n, pal: styleOf(n)?.palette, own: () => (sl.ov && sl.ov.stops ? sl.ov : (sl.ov = clone(hasImg() ? slideOv(sl) : { kind: "none", stops: [] }))), cur: () => sl.ov || (hasImg() ? slideOv(sl) : null), set: (o) => { sl.ov = o; }, els: () => $$(`#nestage .car-frame .ov.sec, #carstrip .car-th[data-th="${i}"] .ov.sec`), done: () => paintNode(n.id) };
  }
  if (t === "img" && S.nodeEd) {
    const n = S.nodes[S.nodeEd.id]; if (n?.type !== "image") return null;
    return { n, pal: styleOf(n)?.palette, own: () => (n.p.ov && n.p.ov.stops ? n.p.ov : (n.p.ov = { kind: "none", stops: [] })), cur: () => n.p.ov, set: (o) => { n.p.ov = o; }, els: () => $$("#nestage .ov.img"), done: () => { paintNode(n.id); G.edgesFrom(n.id).forEach(e => paintNode(e.to)); } };
  }
  return null;
}
let ovT;
function ovLive(T) { const css = ovCSS(T.cur()); T.els().forEach(el => el.setAttribute("style", css)); }
function ovCommit(T, note, delay = 300) { clearTimeout(ovT); ovT = setTimeout(() => { hist(T.n, note); commitNode(T.n); T.done(); }, delay); }
function ovPanelEl(t) { return $(`.ovp[data-ovt="${t}"]`); }
function ovRepaint(t, T) { const el = ovPanelEl(t); if (!el) return; const h = el.querySelector("h4")?.textContent || "Overlay & gradient"; const hint = el.querySelector(".ovhint")?.textContent || ""; const tmp = document.createElement("div"); tmp.innerHTML = ovPanel(T.cur(), T.pal, t, h, hint); el.replaceWith(tmp.firstElementChild); }
function ovSync(t, T) { const el = ovPanelEl(t); if (!el) return; const o = T.cur(); if (!o || o.kind === "none") return; const g = el.querySelector(".ovbar-g"); if (g) g.style.background = ovBarBg(o);
  el.querySelectorAll(".stp").forEach(b => { const x = o.stops[+b.dataset.stop]; if (x) { b.style.left = x.p + "%"; b.style.setProperty("--c", ovHex(x.c, T.pal)); } }); }
const ovEdit = (t, fn, note, repaint = true) => { const T = ovTarget(t); if (!T) return; const o = T.own(); fn(o, T); ovLive(T); if (repaint) ovRepaint(t, T); else ovSync(t, T); ovCommit(T, note); };

Object.assign(A, {
  ovkind(b) { const t = b.closest("[data-ovt]").dataset.ovt; const v = b.dataset.v; ovEdit(t, (o, T) => {
    if (v === "none") { T.set({ kind: "none", stops: [] }); return; }
    if (o.kind === v) return;
    if (v === "solid") { const s0 = o.stops?.[0]; T.set(s0 ? { kind: "solid", blend: o.blend || "normal", stops: [{ ...s0, p: 0, a: Math.max(s0.a, 30) }] } : OV_KIND_DEF.solid()); }
    else if ((o.kind === "linear" || o.kind === "radial") && o.stops?.length > 1) { o.kind = v; }
    else T.set(OV_KIND_DEF[v]());
    S.ovStop[t] = 0; }, "Changed the overlay"); },
  ovpreset(b) { const t = b.closest("[data-ovt]").dataset.ovt; ovEdit(t, (o, T) => { T.set(clone({ blend: "normal", ...OV_PRESETS[+b.dataset.i][1] })); S.ovStop[t] = 0; }, "Overlay: " + OV_PRESETS[+b.dataset.i][0]); },
  ovtok(b) { const t = b.closest("[data-ovt]").dataset.ovt; ovEdit(t, (o) => { const s = o.stops[S.ovStop[t] ?? 0] || o.stops[0]; if (s) s.c = b.dataset.v; }, "Changed the overlay colour"); },
  ovdelstop(b) { const t = b.closest("[data-ovt]").dataset.ovt; ovEdit(t, (o) => { if (o.stops.length > 2) { o.stops.splice(S.ovStop[t] ?? 0, 1); S.ovStop[t] = 0; } }, "Removed a gradient point"); },
});
document.addEventListener("input", (e) => {
  const el = e.target; const f = el.dataset?.ovf; if (!f || f === "blend") return; const t = el.closest("[data-ovt]")?.dataset.ovt; if (!t) return;
  const v = f === "c" ? el.value : +el.value;
  const out = el.parentElement.querySelector("output"); if (out) out.textContent = v + (f === "angle" ? "°" : "%");
  ovEdit(t, (o) => { if (["angle", "cx", "cy"].includes(f)) o[f] = v; else { const s = o.stops[S.ovStop[t] ?? 0]; if (s) s[f] = v; } }, "Adjusted the overlay", false);
  if (f === "c") ovPanelEl(t)?.querySelectorAll('.sw[aria-pressed="true"]').forEach(s => s.setAttribute("aria-pressed", "false"));
});
document.addEventListener("change", (e) => {
  const el = e.target; const f = el.dataset?.ovf; if (f !== "blend") return; const t = el.closest("[data-ovt]")?.dataset.ovt; if (!t) return;
  ovEdit(t, (o) => { o.blend = el.value; }, "Changed the overlay blend", false);
});
/* drag points on the gradient bar; click the bar to add one */
document.addEventListener("pointerdown", (e) => {
  const bar = e.target.closest("[data-ovbar]"); if (!bar) return; const t = bar.closest("[data-ovt]")?.dataset.ovt; const T = t && ovTarget(t); if (!T) return;
  e.preventDefault(); const o = T.own(); const r = bar.getBoundingClientRect(); const at = (x) => Math.round(Math.max(0, Math.min(100, (x - r.left) / r.width * 100)));
  const stp = e.target.closest(".stp"); let idx;
  if (stp) idx = +stp.dataset.stop;
  else {
    const p = at(e.clientX); const sorted = [...o.stops].sort((a, b) => a.p - b.p); const right = sorted.find(s => s.p >= p) || sorted.at(-1); const left = [...sorted].reverse().find(s => s.p <= p) || sorted[0];
    const k = right.p === left.p ? 0 : (p - left.p) / (right.p - left.p); o.stops.push({ c: (k < .5 ? left : right).c, a: Math.round(left.a + (right.a - left.a) * k), p }); idx = o.stops.length - 1;
    ovLive(T); ovCommit(T, "Added a gradient point");
  }
  S.ovStop[t] = idx; ovRepaint(t, T);
  const sx = e.clientX; let moved = false;
  const mv = (ev) => { if (!moved && Math.abs(ev.clientX - sx) < 3) return; moved = true; const T2 = ovTarget(t); if (!T2) return; const s = T2.own().stops[idx]; if (!s) return; s.p = at(ev.clientX); ovLive(T2); ovSync(t, T2); const pi = ovPanelEl(t)?.querySelector('[data-ovf="p"]'); if (pi) { pi.value = s.p; pi.parentElement.querySelector("output").textContent = s.p + "%"; } };
  const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); if (moved) { const T2 = ovTarget(t); if (T2) { ovRepaint(t, T2); ovCommit(T2, "Moved a gradient point", 0); } } };
  window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
});
