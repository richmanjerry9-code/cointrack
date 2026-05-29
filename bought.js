'use strict';
/* ═══════════════════════════════════════
   BOUGHT  (page-spent)
═══════════════════════════════════════ */

function renderSpent() {
  if (!el('sp-metrics')) return;
  const from = el('sp-from').value || getMonthRange()[0];
  const to   = el('sp-to').value   || getMonthRange()[1];
  const filtered = transactions.filter(t => t.date >= from && t.date <= to);

  const incomeAmt = filtered.filter(t => t.dir==='in' ).reduce((s,t)=>s+t.amt,0);
  const spentAmt  = filtered.filter(t => t.dir==='out').reduce((s,t)=>s+t.amt,0);
  const netAmt    = incomeAmt - spentAmt;
  const spentCount = filtered.filter(t => t.dir==='out').length;

  el('sp-metrics').innerHTML = `
    <div class="metric"><div class="metric-label">Total in</div><div class="metric-value" style="color:var(--green)">${fmt(incomeAmt)}</div></div>
    <div class="metric"><div class="metric-label">Total out</div><div class="metric-value" style="color:var(--red)">${fmt(spentAmt)}</div></div>
    <div class="metric"><div class="metric-label">Net</div><div class="metric-value" style="color:${netAmt>=0?'var(--green)':'var(--red)'}">${fmt(netAmt)}</div></div>
    <div class="metric"><div class="metric-label">Purchases</div><div class="metric-value" style="color:var(--blue)">${spentCount}</div></div>`;

  const cats = {};
  filtered.filter(t => t.dir === 'out').forEach(t => {
    if (!cats[t.cat]) cats[t.cat] = { amt: 0, items: [] };
    cats[t.cat].amt += t.amt; cats[t.cat].items.push(t);
  });
  const sorted  = Object.entries(cats).sort((a,b) => b[1].amt - a[1].amt);
  const maxAmt  = sorted.length ? sorted[0][1].amt : 1;
  const catGrid = el('sp-cats');

  if (!sorted.length) {
    catGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📂</div><div class="empty-state-title">No spending in this period</div></div>`;
    return;
  }
  catGrid.innerHTML = sorted.map(([cat, data]) => {
    const pct = Math.round(data.amt / maxAmt * 100);
    return `<div class="cat-card" onclick="drillCategory('${cat}')">
      <span class="cat-icon">${CAT_ICONS[cat]||'📦'}</span>
      <div class="cat-name">${cat}</div>
      <div class="cat-amt">${fmt(data.amt)}</div>
      <div class="cat-count">${data.items.length} purchase${data.items.length!==1?'s':''}</div>
      <div class="cat-bar"><div class="cat-bar-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

function drillCategory(cat) {
  const drillEl = el('drill-panel'); if (!drillEl) return;
  if (!cat) { drillEl.classList.remove('open'); openDrillCat = null; return; }
  const from = el('sp-from').value || getMonthRange()[0];
  const to   = el('sp-to').value   || getMonthRange()[1];
  if (openDrillCat === cat && drillEl.classList.contains('open')) { drillEl.classList.remove('open'); openDrillCat = null; return; }
  openDrillCat = cat;
  const items = transactions.filter(t => t.dir==='out' && t.cat===cat && t.date>=from && t.date<=to);
  el('drill-title').textContent = `${CAT_ICONS[cat]||'📦'} ${cat} — ${items.length} purchase${items.length!==1?'s':''}`;
  el('drill-list').innerHTML = items.length
    ? items.map(t => `<div class="tx-item out"><div class="tx-icon out">${CAT_ICONS[t.cat]||'📦'}</div><div class="tx-body"><div class="tx-desc">${escHtml(t.desc)}</div><div class="tx-meta">${t.date}</div></div><div class="tx-amount out">${fmt(t.amt)}</div><button class="tx-del" onclick="deleteTx('${t.id}')">🗑️</button></div>`).join('')
    : `<p style="font-size:13px;color:var(--txt3);text-align:center;padding:12px">No items found</p>`;
  drillEl.classList.add('open');
}