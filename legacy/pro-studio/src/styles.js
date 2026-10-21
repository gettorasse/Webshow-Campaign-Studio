/* ============================================================
   Per-block and per-section styling: mix the palette, or give a
   section or tool its own style guide
   ============================================================ */
const MIX_TOKS = [["auto", "Default"], ["ink", "Ink"], ["pri", "Primary"], ["sec", "Secondary"], ["paper", "Paper"], ["pop", "Pop"]];
const DEF_DIR = { palette: PALETTES.webshow.c, fontPair: "pixel", mode: "dark", radius: "soft" };
const tokHex = (dir, k) => { const [ink, pri, sec, paper, pop] = dir.palette; return { ink, pri, sec, paper, pop }[k]; };
function remixVars(dir, sty = {}) {
  dir = dir || DEF_DIR; const [ink, , , paper] = dir.palette; let out = "";
  const bg = sty.bg && sty.bg !== "auto" ? tokHex(dir, sty.bg) : null;
  if (bg) { const fg = lum(bg) > .55 ? ink : paper; out += `--p-bg:${bg};--p-fg:${fg};--p-card:color-mix(in srgb,${fg} 7%,${bg});--p-line:color-mix(in srgb,${fg} 16%,${bg});`; }
  let acc = sty.btn && sty.btn !== "auto" ? tokHex(dir, sty.btn) : null;
  if (!acc && bg && sty.bg === "pri") acc = lum(bg) > .55 ? ink : paper;
  if (acc) out += `--p-acc:${acc};--p-on:${lum(acc) > .6 ? ink : "#ffffff"};`;
  if (sty.radius && sty.radius !== "auto") out += `--p-r:${{ sharp: "0px", soft: "14px", round: "28px" }[sty.radius]};`;
  return out;
}
const styleDirOf = (id) => (id && S.nodes[id]?.type === "style" ? styleValue(S.nodes[id]) : null);
function sectionCss(page, s) {
  const st = s?.sty; if (!st || (!st.styleId && (st.bg || "auto") === "auto" && (st.btn || "auto") === "auto")) return "";
  const own = styleDirOf(st.styleId); const dir = own || styleOf(page) || DEF_DIR;
  return (own ? pageTheme(own) + ";" : "") + remixVars(dir, st) + "background:var(--p-bg);color:var(--p-fg);font-family:var(--p-body)";
}
function toolCss(n, page) {
  const own = styleOf(n); const dir = own || (page && styleOf(page)) || DEF_DIR; const p = n.p; let out = own ? pageTheme(own) + ";" : "";
  out += remixVars(dir, p.sty || {});
  if (n.type === "popup") { const st = p.sty || {}; out += `--wp-w:${{ s: "340px", m: "420px", l: "560px" }[st.size || "m"]};--wp-dim:rgba(0,0,0,${(st.dim ?? 45) / 100});`; }
  return out;
}
/* swatch row used by the page editor and tool inspectors */
function mixRow(dir, cur, act, data = "") {
  return `<div class="swrow mixrow">${MIX_TOKS.map(([k, l]) => `<button type="button" class="mixsw ${k === "auto" ? "auto" : ""}" data-act="${act}" data-v="${k}" ${data} aria-pressed="${(cur || "auto") === k}" title="${l}" aria-label="${l}" style="${k === "auto" ? "" : `background:${tokHex(dir, k)}`}">${k === "auto" ? "A" : ""}</button>`).join("")}</div>`;
}

/* ---------- page editor: section style ---------- */
function sectionStyleGroup(n, i) {
  const s = n.p.sections[i]; if (!s) return ""; const st = s.sty || {}; const own = styleDirOf(st.styleId); const dir = own || styleOf(n) || DEF_DIR;
  const styles = Object.values(S.nodes).filter(x => x.type === "style");
  return `<div class="grp"><h4>Section style</h4>
    <div class="fld"><span>Background</span>${mixRow(dir, st.bg, "pvsty", 'data-k="bg"')}</div>
    <div class="fld"><span>Buttons</span>${mixRow(dir, st.btn, "pvsty", 'data-k="btn"')}</div>
    <label class="fld"><span>Style guide</span><select class="sel" id="pvstyid"><option value="">Same as the page</option>${styles.map(x => `<option value="${x.id}" ${st.styleId === x.id ? "selected" : ""}>${esc(x.title)}</option>`).join("")}</select></label>
    ${styles.length < 2 ? `<small class="faint">Add another Style guide node to the canvas to give this section its own fonts and colours.</small>` : ""}
    ${s.sty ? `<button class="btn sm ghost" style="justify-self:start" data-act="pvstyreset">Reset section style</button>` : ""}</div>`;
}
Object.assign(A, {
  pvsty(b) { const i = S.preview.sec; pvEdit((n, secs) => { secs[i].sty = { ...(secs[i].sty || {}), [b.dataset.k]: b.dataset.v }; }, "Section style changed"); },
  pvstyreset() { const i = S.preview.sec; pvEdit((n, secs) => { delete secs[i].sty; }, "Section style reset"); },
  toolsty(b) { const n = selNode() || (S.nodeEd && S.nodes[S.nodeEd.id]); if (!n) return; n.p.sty = { ...(n.p.sty || {}), [b.dataset.k]: b.dataset.v }; hist(n, "Style changed"); commitNode(n); paintNode(n.id); S.inspFor = null; paintInspector(); if (S.nodeEd) neRepaint(); },
  toolstyreset() { const n = selNode() || (S.nodeEd && S.nodes[S.nodeEd.id]); if (!n) return; delete n.p.sty; hist(n, "Style reset"); commitNode(n); paintNode(n.id); S.inspFor = null; paintInspector(); if (S.nodeEd) neRepaint(); },
});
document.addEventListener("change", (e) => {
  if (e.target.id !== "pvstyid" || !S.preview) return; const i = S.preview.sec; const v = e.target.value;
  pvEdit((n, secs) => { secs[i].sty = { ...(secs[i].sty || {}), styleId: v || null }; }, v ? "Section got its own style guide" : "Section uses the page style");
});
/* ---------- tool style group (popup, chatbot, cookie banner) ---------- */
function toolStyleGroup(n) {
  const pg = G.edgesFrom(n.id).map(e => S.nodes[e.to]).find(x => x?.type === "page"); const own = styleOf(n); const dir = own || (pg && styleOf(pg)) || DEF_DIR; const st = n.p.sty || {};
  return `<div class="grp"><h4>Style</h4><small class="faint">${own ? "Uses its own style guide (wired in)." : pg ? `Follows “${esc(pg.title)}”. Wire a Style guide into this node to give it its own look.` : "Wire a Style guide into this node, or into the page it sits on."}</small>
    <div class="fld"><span>Background</span>${mixRow(dir, st.bg, "toolsty", 'data-k="bg"')}</div>
    <div class="fld"><span>Buttons</span>${mixRow(dir, st.btn, "toolsty", 'data-k="btn"')}</div>
    <div class="fld"><span>Corners</span><div class="seg" style="justify-self:start">${[["auto", "Default"], ["sharp", "Sharp"], ["soft", "Soft"], ["round", "Round"]].map(([k, l]) => `<button data-act="toolsty" data-k="radius" data-v="${k}" aria-pressed="${(st.radius || "auto") === k}">${l}</button>`).join("")}</div></div>
    ${n.type === "popup" ? `<div class="fld"><span>Size</span><div class="seg" style="justify-self:start">${[["s", "Small"], ["m", "Medium"], ["l", "Large"]].map(([k, l]) => `<button data-act="toolsty" data-k="size" data-v="${k}" aria-pressed="${(st.size || "m") === k}">${l}</button>`).join("")}</div></div>
      <label class="adj"><span>Dim page</span><input type="range" min="0" max="85" id="pdim_${n.id}" data-tooldim="1" value="${st.dim ?? 45}"><output>${st.dim ?? 45}%</output></label>` : ""}
    ${n.p.sty ? `<button class="btn sm ghost" style="justify-self:start" data-act="toolstyreset">Reset style</button>` : ""}</div>`;
}
let dimT;
document.addEventListener("input", (e) => {
  if (!e.target.dataset?.tooldim) return; const n = selNode() || (S.nodeEd && S.nodes[S.nodeEd.id]); if (!n) return;
  n.p.sty = { ...(n.p.sty || {}), dim: +e.target.value }; e.target.parentElement.querySelector("output").textContent = e.target.value + "%";
  clearTimeout(dimT); dimT = setTimeout(() => { commitNode(n); paintNode(n.id); if (S.nodeEd) neRepaint("stage"); }, 250);
});
