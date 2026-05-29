
'use strict';
/* ═══════════════════════════════════════
   LOG  (page-log)
═══════════════════════════════════════ */

function renderLog() {
  const recEl = el('log-recent'); if (!recEl) return;
  const recent = transactions.slice(0, 7);
  if (!recent.length) {
    recEl.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🧾</div>
      <div class="empty-state-title">No transactions yet</div>
      <div class="empty-state-sub">Use the forms above to record money in or out</div>
    </div>`;
    return;
  }
  recEl.innerHTML = recent.map(t => txItemHTML(t, true)).join('');
}