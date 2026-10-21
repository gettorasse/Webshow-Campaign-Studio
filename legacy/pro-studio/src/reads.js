/* ============================================================
   Read state per person: comment notifications clear when read,
   and any thread can be marked unread again
   ============================================================ */
const Reads = {
  map: {}, loaded: false, t: null,
  path: () => "reads/" + (Store.me.id || "local"),
  async load() { try { const d = await Store.getDoc(this.path(), { t: {} }); this.map = { ...(d.t || {}), ...this.map }; } catch {} this.loaded = true; softRender(); },
  save() { clearTimeout(this.t); this.t = setTimeout(() => Store.putDoc(this.path(), { t: this.map, at: now() }).catch(() => {}), 500); },
  last(id) { return this.map[id] || 0; },
  others(t) { return (t.messages || []).filter(m => m.by !== Store.me.id && !(m.by === "local" && Store.me.id === "local")); },
  unread(t) { if (!t || !this.loaded) return 0; const lr = this.last(t.id); return this.others(t).filter(m => (m.at || 0) > lr).length; },
  seen(t) {
    if (!t || S.keepUnread === t.id || !this.unread(t)) return;
    this.map[t.id] = Math.max(now(), ...t.messages.map(m => m.at || 0)); this.save();
    setTimeout(() => { renderSidebarOnly(); if (S.view === "canvas" && t.nodeId && S.nodes[t.nodeId]) paintNode(t.nodeId); if (S.view === "threads") { const c = $(`.tc[data-id="${t.id}"]`); if (c) c.outerHTML = threadCard(t); } }, 0);
  },
  markUnread(t) { const o = this.others(t); if (!o.length) return false; this.map[t.id] = (o.at(-1).at || now()) - 1; S.keepUnread = t.id; this.save(); return true; },
  markRead(t) { S.keepUnread = null; this.map[t.id] = Math.max(now(), ...t.messages.map(m => m.at || 0)); this.save(); },
};
Object.assign(A, {
  markunread(b) { const t = S.threads[b.dataset.id]; if (!t) return; if (!Reads.markUnread(t)) return toast("Only your own messages here, so there's nothing to mark unread."); toast("Marked unread"); render(); },
  markread(b) { const t = S.threads[b.dataset.id]; if (!t) return; Reads.markRead(t); render(); },
});
