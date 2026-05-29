'use strict';
/* ═══════════════════════════════════════
   DASHBOARD  (page-dash)
═══════════════════════════════════════ */

function renderDash() {
  const today = todayStr(), [m0, m1] = getMonthRange();

  const tIn    = transactions.filter(t => t.dir==='in'  && t.date===today).reduce((s,t)=>s+t.amt,0);
  const tOut   = transactions.filter(t => t.dir==='out' && t.date===today).reduce((s,t)=>s+t.amt,0);
  const tRing  = getRingSpending(today);
  const mIn    = transactions.filter(t => t.dir==='in'  && t.date>=m0 && t.date<=m1).reduce((s,t)=>s+t.amt,0);
  const mOut   = transactions.filter(t => t.dir==='out' && t.date>=m0 && t.date<=m1).reduce((s,t)=>s+t.amt,0);
  const allIn  = transactions.filter(t => t.dir==='in' ).reduce((s,t)=>s+t.amt,0);
  const allOut = transactions.filter(t => t.dir==='out').reduce((s,t)=>s+t.amt,0);
  const bal    = allIn - allOut;

  const balEl = el('dash-bal');
  if (balEl) { balEl.textContent = fmt(bal); balEl.className = `balance-amount${bal<0?' neg':bal===0?' zero':''}`; }
  const sub = el('dash-balance-sub');
  if (sub) sub.textContent = bal===0 ? 'Log your first transaction below' : bal<0 ? 'Spending exceeds income' : 'Looking good! 💚';
  const hb = el('header-balance');
  if (hb) { hb.textContent = fmt(bal); hb.className = `header-bal-num${bal<0?' neg':''}`; }

  ['dash-today-in','dash-today-out','dash-month-in','dash-month-out','dash-total-in','dash-total-out']
    .forEach((id, i) => { const e = el(id); if (e) e.textContent = fmt([tIn,tOut,mIn,mOut,allIn,allOut][i]); });

  renderSavingsCard(mIn, mOut, allIn, allOut);
  renderRing(tRing);
  if (el('week-grid'))           renderWeekBars();
  if (el('dash-goals-content'))  renderDashGoals(mIn, mOut);
  if (el('dash-insights'))       renderInsights(tRing, mIn, mOut, bal);
  renderDashBudgetGoals();
}

/* ── Savings card ── */
function renderSavingsCard(mIn, mOut, allIn, allOut) {
  const card = el('dash-savings-card'); if (!card) return;
  const savedThisMonth = mIn - mOut;
  const netWorth       = allIn - allOut;
  const projectGoals   = budgetGoals.filter(g => goalType(g) === 'project');

  let projectHtml = '';
  if (projectGoals.length) {
    projectHtml = `<div style="margin-top:4px"><div class="dash-goals-section-label">💰 PROJECT GOALS</div>` +
      projectGoals.map(g => {
        const spent = calcGoalSpent(g.id), pct = Math.min(spent/g.budget,1), pctW = Math.round(pct*100);
        const { label, cls } = projectGoalStatus(spent, g.budget);
        return `<div class="bgoal-dash-item">
          <div class="bgoal-dash-icon">${g.icon}</div>
          <div class="bgoal-dash-info">
            <div class="bgoal-dash-name">${escHtml(g.name)}</div>
            <div class="bgoal-dash-track"><div class="bgoal-dash-fill ${cls}" style="width:${pctW}%"></div></div>
          </div>
          <div class="bgoal-dash-right">
            <div class="bgoal-dash-spent">${fmt(spent)} / ${fmt(g.budget)}</div>
            <div class="bgoal-dash-badge ${cls}">${label}</div>
          </div>
        </div>`;
      }).join('') + '</div>';
  }

  card.innerHTML = `<div class="card-title">💰 Savings</div>
    <div class="savings-row">
      <div class="savings-stat">
        <div class="savings-stat-label">Saved this month</div>
        <div class="savings-stat-val ${savedThisMonth>=0?'pos':'neg'}">${fmt(Math.abs(savedThisMonth))}</div>
        <div class="savings-stat-sub">${savedThisMonth>=0?'income minus all spending':'spending exceeds income'}</div>
      </div>
      <div class="savings-stat">
        <div class="savings-stat-label">Net worth (all time)</div>
        <div class="savings-stat-val ${netWorth>=0?'pos':'neg'}">${fmt(Math.abs(netWorth))}</div>
        <div class="savings-stat-sub">${netWorth>=0?'total balance':'overall deficit'}</div>
      </div>
    </div>${projectHtml}`;
}

/* ── Dashboard budget goals (monthly + fixed only) ── */
function renderDashBudgetGoals() {
  const card = el('dash-bgoals-card'), content = el('dash-bgoals-content');
  if (!card || !content) return;
  const nonProject = budgetGoals.filter(g => goalType(g) !== 'project');
  if (!nonProject.length) { card.style.display = 'none'; return; }
  card.style.display = 'block';

  const monthly = nonProject.filter(g => goalType(g) === 'monthly');
  const fixed   = nonProject.filter(g => goalType(g) === 'fixed');
  let html = '';

  if (monthly.length) {
    html += `<div class="dash-goals-section-label">📅 MONTHLY GOALS</div>`;
    html += monthly.map(g => {
      const spent = calcGoalSpent(g.id), pct = Math.min(spent/g.budget,1), pctW = Math.round(pct*100);
      const { label, cls } = goalStatus(spent, g.budget);
      return `<div class="bgoal-dash-item"><div class="bgoal-dash-icon">${g.icon}</div><div class="bgoal-dash-info"><div class="bgoal-dash-name">${escHtml(g.name)}</div><div class="bgoal-dash-track"><div class="bgoal-dash-fill ${cls}" style="width:${pctW}%"></div></div></div><div class="bgoal-dash-right"><div class="bgoal-dash-spent">${fmt(spent)}</div><div class="bgoal-dash-badge ${cls}">${label}</div></div></div>`;
    }).join('');
  }
  if (fixed.length) {
    html += `<div class="dash-goals-section-label" style="margin-top:${monthly.length?'10px':'0'}">🔒 FIXED GOALS</div>`;
    html += fixed.map(g => {
      const spent = calcGoalSpent(g.id), pct = Math.min(spent/g.budget,1), pctW = Math.round(pct*100);
      const { label, cls } = goalStatus(spent, g.budget);
      return `<div class="bgoal-dash-item"><div class="bgoal-dash-icon">${g.icon}</div><div class="bgoal-dash-info"><div class="bgoal-dash-name">${escHtml(g.name)}</div><div class="bgoal-dash-track"><div class="bgoal-dash-fill ${cls}" style="width:${pctW}%"></div></div></div><div class="bgoal-dash-right"><div class="bgoal-dash-spent">${fmt(spent)}</div><div class="bgoal-dash-badge ${cls}">${label}</div></div></div>`;
    }).join('');
  }
  content.innerHTML = html;
}

/* ── Budget ring ── */
function renderRing(ringSpent) {
  const rp = el('ring-progress'), rPct = el('ring-pct'), rSpent = el('ring-spent'),
        rRemain = el('ring-remain'), rBud = el('ring-budget-label'), rNote = el('ring-source-note'), rBreak = el('ring-breakdown');
  if (!rp || !rPct) return;
  const { amount: eff, source } = getEffectiveDailyBudget();

  if (eff > 0) {
    const pct = Math.min(ringSpent/eff, 1), circ = 2*Math.PI*38, dash = pct*circ, remain = eff - ringSpent;
    rp.style.strokeDasharray = `${dash} ${circ}`;
    rp.style.stroke = remain < 0 ? 'var(--red)' : remain <= eff*0.2 ? 'var(--amber)' : 'var(--green)';
    rPct.textContent = `${Math.round(pct*100)}%`;
    if (rSpent)  rSpent.textContent = fmt(ringSpent);
    if (rRemain) {
      rRemain.textContent = remain < 0 ? `${fmt(Math.abs(remain))} over budget!` : remain === 0 ? 'Budget used up' : `${fmt(remain)} left`;
      rRemain.className = `ring-info-remain ${remain<0?'over':remain<=eff*0.2?'warn':'ok'}`;
    }
    if (rBud) rBud.textContent = `Daily budget: ${fmt(eff)}`;
    if (rNote) {
      if (source === 'goals')   { rNote.style.display = 'none'; }
      else if (source === 'monthly') { rNote.style.display = 'block'; rNote.textContent = `📐 Fallback: monthly limit ${fmt(goals.outGoal)} ÷ ${daysInCurrentMonth()} days = ${fmt(eff)}/day`; }
      else if (source === 'manual')  { rNote.style.display = 'block'; rNote.textContent = `✏️ Manual override active.`; }
      else { rNote.style.display = 'none'; }
    }
    if (rBreak && source === 'goals') {
      const mg = budgetGoals.filter(g => goalType(g) === 'monthly');
      const total = mg.reduce((s, g) => s + g.budget, 0);
      rBreak.style.display = 'block';
      rBreak.innerHTML = `<div class="daily-budget-breakdown-title">📐 Daily budget breakdown</div>` +
        mg.map(g => `<div class="daily-budget-breakdown-row"><span>${g.icon} ${escHtml(g.name)}</span><span>${fmt(g.budget/daysInCurrentMonth())}/day</span></div>`).join('') +
        `<div class="daily-budget-breakdown-total"><span>${fmt(total)}/mo ÷ ${daysInCurrentMonth()} days</span><span>${fmt(eff)}/day</span></div>`;
    } else if (rBreak) { rBreak.style.display = 'none'; }
  } else {
    rp.style.strokeDasharray = '0 239'; rPct.textContent = '0%';
    if (rSpent)  rSpent.textContent = fmt(ringSpent);
    if (rRemain) { rRemain.textContent = 'Add monthly goals in Goals →'; rRemain.className = 'ring-info-remain'; }
    if (rBud)    rBud.textContent = '';
    if (rNote)   rNote.style.display = 'none';
    if (rBreak)  rBreak.style.display = 'none';
  }
}

/* ── Week bars ── */
function renderWeekBars() {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html = '';
  const { amount: eff } = getEffectiveDailyBudget();
  for (let i = 6; i >= 0; i--) {
    const dateStr = dateOffset(i), d = new Date(dateStr+'T00:00:00'), dayName = i===0 ? 'Today' : days[d.getDay()];
    const spent = getRingSpending(dateStr);
    const pct = eff > 0 ? Math.min(spent/eff, 1) : spent > 0 ? 0.3 : 0;
    const cls = eff===0 ? spent>0 ? 'safe':'none' : pct>=1 ? 'over' : pct>=0.8 ? 'warn' : spent>0 ? 'safe':'none';
    html += `<div class="week-row${i===0?' today-row':''}"><span class="week-day-label">${dayName}</span><div class="week-bar-track"><div class="week-bar-fill ${cls}" style="width:${Math.round(pct*100)}%"></div></div><span class="week-amount">${spent>0?fmt(spent):'–'}</span></div>`;
  }
  el('week-grid').innerHTML = html;
}

/* ── Monthly overview progress ── */
function renderDashGoals(mIn, mOut) {
  const gc = el('dash-goals-content'); if (!gc) return;
  if (!goals.inGoal && !goals.outGoal) { gc.innerHTML = '<p style="font-size:13px;color:var(--txt3)">Set monthly goals in the Goals tab →</p>'; return; }
  let html = '';
  if (goals.inGoal)  html += buildProgBar('Monthly Income',   mIn,  goals.inGoal,  false);
  if (goals.outGoal) html += buildProgBar('Monthly Spending', mOut, goals.outGoal, true);
  gc.innerHTML = html;
}

function buildProgBar(label, current, goal, invert) {
  const pct = Math.min(current/goal, 1), pctW = Math.round(pct*100);
  const over = invert && pct>=1, warn = invert && pct>=0.8 && pct<1, ok = invert ? pct<0.8 : pct>=1;
  const cls  = over?'red':warn?'amber':ok?'green':'blue';
  const note = over ? 'Over limit!' : warn ? 'Getting close' : `${pctW}% — ${fmt(Math.abs(goal-current))} ${current<goal?'to go':'achieved'}`;
  return `<div class="prog-wrap"><div class="prog-labels"><span class="prog-l">${label}</span><span class="prog-r">${fmt(current)} / ${fmt(goal)}</span></div><div class="prog-track"><div class="prog-fill ${cls}" style="width:${pctW}%"></div></div><div class="prog-note ${over?'over':warn?'warn':'ok'}">${note}</div></div>`;
}

/* ── Insights ── */
function renderInsights(tRing, mIn, mOut, bal) {
  const [m0, m1] = getMonthRange(), items = [], catTotals = {};
  transactions.filter(t => t.dir==='out' && t.date>=m0 && t.date<=m1).forEach(t => { catTotals[t.cat] = (catTotals[t.cat]||0) + t.amt; });
  const topCat = Object.entries(catTotals).sort((a,b) => b[1]-a[1])[0];
  const { amount: eff } = getEffectiveDailyBudget();

  if (topCat) items.push({ cls:'amber', icon:'💡', title:'Biggest spend category',    text:`You spent the most on <strong>${topCat[0]}</strong> this month — ${fmt(topCat[1])}.` });
  if (eff>0 && tRing>eff) items.push({ cls:'red', icon:'⚠️', title:'Over daily budget today', text:`Daily goals + unlinked spending: ${fmt(tRing)} — ${fmt(tRing-eff)} over your ${fmt(eff)} daily limit.` });
  if (bal<0) items.push({ cls:'red', icon:'📉', title:'Balance is negative', text:'More spending than income recorded. Log missing income or reduce expenses.' });
  if (goals.outGoal>0 && mOut<goals.outGoal*0.8 && mOut>0) items.push({ cls:'green', icon:'✅', title:'On track with spending', text:`Spent ${fmt(mOut)} of ${fmt(goals.outGoal)} limit — ${fmt(goals.outGoal-mOut)} headroom left.` });
  if (goals.outGoal>0 && mOut>=goals.outGoal*0.8 && mOut<goals.outGoal) items.push({ cls:'amber', icon:'🔔', title:'Approaching spending limit', text:`Used ${Math.round(mOut/goals.outGoal*100)}% of monthly limit. Only ${fmt(goals.outGoal-mOut)} left.` });

  budgetGoals.forEach(g => {
    const spent = calcGoalSpent(g.id);
    const type = goalType(g);
    if (type === 'project') {
      if (spent >= g.budget)       items.push({ cls:'green', icon:g.icon, title:`${g.name} goal reached! 🎉`,    text:`You've reached your ${fmt(g.budget)} target for ${g.name}. ✅` });
      else if (spent >= g.budget*0.8) items.push({ cls:'amber', icon:g.icon, title:`${g.name} almost reached`, text:`${Math.round(spent/g.budget*100)}% of target — only ${fmt(g.budget-spent)} left to go!` });
    } else {
      if (spent >= g.budget)       items.push({ cls:'green', icon:g.icon, title:`${g.name} goal complete`,      text:`You've hit your ${fmt(g.budget)} budget for ${g.name} this month.` });
      else if (spent >= g.budget*0.8) items.push({ cls:'amber', icon:g.icon, title:`${g.name} almost full`,    text:`Used ${Math.round(spent/g.budget*100)}% of ${g.name} budget — only ${fmt(g.budget-spent)} left.` });
    }
  });

  el('dash-insights').innerHTML = items.map(i =>
    `<div class="insight-card ${i.cls}"><div class="insight-icon">${i.icon}</div><div class="insight-body"><div class="insight-title">${i.title}</div><div class="insight-text">${i.text}</div></div></div>`
  ).join('');
}