'use strict';
/* ═══════════════════════════════════════
   HISTORY  (page-hist)
   - Default view: current week (Mon–today)
   - Each day row shows: date | +in − out = net | ▶
   - Transactions + Add button hidden until row is clicked
   - Empty days stay collapsed; clicking opens add modal directly
═══════════════════════════════════════ */

/* Monday of current week as YYYY-MM-DD */
function currentWeekStart() {
  const d = new Date();
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function renderHist() {
  if (!el('h-from')) return;

  const hFrom = el('h-from'), hTo = el('h-to');
  if (!hFrom.value) hFrom.value = currentWeekStart();
  if (!hTo.value)   hTo.value   = todayStr();

  const from = hFrom.value, to = hTo.value;

  /* Build every day in range (newest first) */
  const allDates = [];
  let cur = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (cur <= end && allDates.length < 90) {
    allDates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  allDates.reverse();

  /* All transactions in range (for per-day in/out totals) */
  const allInRange = transactions.filter(t => t.date >= from && t.date <= to);

  /* Filtered transactions (for what shows inside expanded rows) */
  let filtered = allInRange.slice();
  if      (histFilter === 'in')  filtered = filtered.filter(t => t.dir === 'in');
  else if (histFilter === 'out') filtered = filtered.filter(t => t.dir === 'out');
  else if (histFilter !== 'all') filtered = filtered.filter(t => t.cat === histFilter);

  /* Week-level summary bar */
  const sumIn  = allInRange.filter(t => t.dir==='in' ).reduce((s,t)=>s+t.amt,0);
  const sumOut = allInRange.filter(t => t.dir==='out').reduce((s,t)=>s+t.amt,0);
  const sumEl  = el('hist-summary');
  sumEl.innerHTML = allInRange.length ? `<div class="hist-summary">
    <div class="hist-stat"><span class="hist-stat-v" style="color:var(--green)">${fmt(sumIn)}</span><span class="hist-stat-l">In</span></div>
    <div class="hist-stat"><span class="hist-stat-v" style="color:var(--red)">${fmt(sumOut)}</span><span class="hist-stat-l">Out</span></div>
    <div class="hist-stat"><span class="hist-stat-v" style="color:${(sumIn-sumOut)>=0?'var(--green)':'var(--red)'}">${fmt(sumIn-sumOut)}</span><span class="hist-stat-l">Net</span></div>
    <div class="hist-stat"><span class="hist-stat-v" style="color:var(--blue)">${allInRange.length}</span><span class="hist-stat-l">Txns</span></div>
  </div>` : '';

  /* Group filtered txns by date */
  const byDate = {};
  filtered.forEach(t => { if (!byDate[t.date]) byDate[t.date] = []; byDate[t.date].push(t); });

  const today = todayStr();
  let html = '';

  allDates.forEach(dateStr => {
    const allDay = allInRange.filter(t => t.date === dateStr);
    const txs    = byDate[dateStr] || [];
    const hasEntries = allDay.length > 0;

    const dayIn  = allDay.filter(t=>t.dir==='in' ).reduce((s,t)=>s+t.amt,0);
    const dayOut = allDay.filter(t=>t.dir==='out').reduce((s,t)=>s+t.amt,0);
    const dayNet = dayIn - dayOut;

    const d = new Date(dateStr+'T00:00:00'), isToday = dateStr === today;
    const dayLabel = isToday
      ? 'Today — ' + d.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short'})
      : d.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short',year:'numeric'});

    const uid = 'hday-' + dateStr.replace(/-/g,'');

    if (hasEntries) {
      html += `
      <div class="hist-day-group" id="${uid}">
        <div class="hist-day-header hist-day-collapsible" onclick="toggleHistDay('${uid}','${dateStr}')">
          <span class="hist-day-label">${dayLabel}</span>
          <div class="hist-day-right">
            <span class="hist-day-inout">
              <span style="color:var(--green);font-family:var(--mono);font-size:11px;font-weight:700">+${fmt(dayIn)}</span>
              <span style="color:var(--txt3);font-size:11px"> − </span>
              <span style="color:var(--red);font-family:var(--mono);font-size:11px;font-weight:700">${fmt(dayOut)}</span>
              <span style="color:var(--txt3);font-size:11px"> = </span>
              <span style="color:${dayNet>=0?'var(--green)':'var(--red)'};font-family:var(--mono);font-size:12px;font-weight:800">${dayNet>=0?'+':''}${fmt(dayNet)}</span>
            </span>
            <span class="hist-chevron" id="${uid}-chev">▶</span>
          </div>
        </div>
        <div class="hist-day-body" id="${uid}-body" style="display:none">
          ${txs.length
            ? txs.map(t => txItemHTML(t, true)).join('')
            : '<p style="font-size:12px;color:var(--txt3);padding:6px 4px;font-style:italic">No matches for current filter</p>'}
          <button class="hist-add-day-btn" onclick="openDayModal('${dateStr}');event.stopPropagation()">＋ Add transaction for this day</button>
        </div>
      </div>`;
    } else {
      /* Empty day — clicking goes straight to add modal */
      html += `
      <div class="hist-day-group hist-day-empty">
        <div class="hist-day-header" onclick="openDayModal('${dateStr}')">
          <span class="hist-day-label" style="color:var(--txt3)">${dayLabel}</span>
          <div class="hist-day-right">
            <span style="font-size:11px;color:var(--txt3)">no entries</span>
            <span class="hist-add-btn">＋ Add</span>
          </div>
        </div>
      </div>`;
    }
  });

  el('hist-list').innerHTML = html || '<p style="font-size:13px;color:var(--txt3);text-align:center;padding:20px">No transactions in this period</p>';
}

/* Toggle a day open / closed */
function toggleHistDay(uid, dateStr) {
  const body = el(uid + '-body');
  const chev = el(uid + '-chev');
  if (!body) { openDayModal(dateStr); return; }
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (chev) chev.textContent = isOpen ? '▶' : '▼';
}

function setHistFilter(filter, btn) {
  histFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderHist();
}