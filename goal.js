'use strict';
/* ═══════════════════════════════════════
   GOALS  (page-goals)
═══════════════════════════════════════ */

/* ── Goal type selector ── */
function setBgoalType(type) {
  newBgoalType = type;
  ['monthly','fixed','project'].forEach(t => {
    const btn = el(`bgoal-type-${t}`);
    if (btn) btn.className = `goal-type-tab${type===t?' active-'+t:''}`;
  });
  const hint = el('bgoal-type-hint'); if (hint) hint.textContent = BGOAL_TYPE_HINTS[type];
  const lbl  = el('bgoal-budget-label'); if (lbl) lbl.textContent = BGOAL_BUDGET_LABELS[type];
}

/* ── Add / delete budget goals ── */
async function addBudgetGoal() {
  if (!currentUser) return;
  const name   = el('bgoal-name').value.trim();
  const icon   = el('bgoal-icon').value.trim() || '🎯';
  const budget = parseFloat(el('bgoal-budget').value);
  if (!name)            { showToast('Enter a goal name', 'amber'); return; }
  if (!budget||budget<=0) { showToast('Enter a valid amount', 'amber'); return; }
  await db.collection(`users/${currentUser.uid}/budgetGoals`).add({ name, icon, budget, goalType: newBgoalType, createdAt: Date.now() });
  el('bgoal-name').value = ''; el('bgoal-icon').value = ''; el('bgoal-budget').value = '';
  showToast('Goal added ✓');
}

async function deleteBudgetGoal(id) {
  if (!currentUser) return;
  await db.doc(`users/${currentUser.uid}/budgetGoals/${id}`).delete();
  showToast('Goal deleted', 'amber');
}

/* ── Habits ── */
async function addHabit() {
  if (!currentUser) return;
  const name = el('habit-name').value.trim();
  const icon = el('habit-icon').value.trim() || '🎯';
  if (!name) { showToast('Enter a habit name', 'amber'); return; }
  await db.collection(`users/${currentUser.uid}/habits`).add({ name, icon, streak: 0, lastDone: '' });
  el('habit-name').value = ''; el('habit-icon').value = '';
  showToast('Habit added ✓');
}

async function toggleHabit(firebaseId) {
  if (!currentUser) return;
  const habit = habits.find(h => h.id === firebaseId); if (!habit) return;
  const today = todayStr(), doneToday = habit.lastDone === today;
  const newStreak = doneToday ? Math.max(0, (habit.streak||0)-1) : (habit.streak||0)+1;
  await db.doc(`users/${currentUser.uid}/habits/${firebaseId}`).update({ streak: newStreak, lastDone: doneToday ? '' : today });
}

async function deleteHabit(firebaseId) {
  if (!currentUser) return;
  await db.doc(`users/${currentUser.uid}/habits/${firebaseId}`).delete();
  showToast('Habit deleted', 'amber');
}

/* ── Render: goal progress bars ── */
function renderGoalProgress() {
  if (!el('goal-in-progress')) return;
  const [m0, m1] = getMonthRange();
  const mIn  = transactions.filter(t => t.dir==='in'  && t.date>=m0 && t.date<=m1).reduce((s,t)=>s+t.amt,0);
  const mOut = transactions.filter(t => t.dir==='out' && t.date>=m0 && t.date<=m1).reduce((s,t)=>s+t.amt,0);
  const saved = transactions.filter(t => t.cat==='Savings').reduce((s,t)=>s+t.amt,0);
  const rp = (id, cur, goal, inv) => {
    const e = el(id); if (!e) return;
    if (!goal) { e.innerHTML = ''; return; }
    e.innerHTML = buildProgBar('Progress', cur, goal, inv);
  };
  rp('goal-in-progress',  mIn,  goals.inGoal,  false);
  rp('goal-out-progress', mOut, goals.outGoal, true);
  rp('goal-save-progress', saved, goals.saveGoal, false);
}

/* ── Render: budget goals lists (monthly / fixed / project) ── */
function renderBudgetGoals() {
  ['monthly','fixed','project'].forEach(type => {
    const listEl = el(`bgoal-list-${type}`); if (!listEl) return;
    const typeGoals = budgetGoals.filter(g => goalType(g) === type);
    if (!typeGoals.length) {
      listEl.innerHTML = `<div class="goal-type-empty">No ${type} goals yet — add one below.</div>`;
      return;
    }
    listEl.innerHTML = typeGoals.map(g => {
      const spent = calcGoalSpent(g.id), pct = Math.min(spent/g.budget, 1), pctW = Math.round(pct*100), remain = g.budget - spent;
      const { label, cls } = type==='project' ? projectGoalStatus(spent, g.budget) : goalStatus(spent, g.budget);
      const typeTag = `<span class="bgoal-type-tag ${type}">${type==='monthly'?'📅 Monthly':type==='fixed'?'🔒 Fixed':'💰 Project'}</span>`;
      const remainLabel = type==='project'
        ? (remain>0 ? fmt(remain)+' to go' : '🎉 Reached!')
        : (remain<0 ? fmt(Math.abs(remain))+' over' : fmt(remain)+' left');
      return `<div class="bgoal-item ${cls}">
        <button class="bgoal-del" onclick="deleteBudgetGoal('${g.id}')" title="Delete goal">🗑️</button>
        <div class="bgoal-top">
          <div class="bgoal-icon">${g.icon}</div>
          <div class="bgoal-name">${escHtml(g.name)}</div>
          ${typeTag}
          <div class="bgoal-status-pill ${cls}">${label}</div>
        </div>
        <div class="bgoal-bar-track"><div class="bgoal-bar-fill ${cls}" style="width:${pctW}%"></div></div>
        <div class="bgoal-meta">
          <span>${pctW}% used</span>
          <span class="bgoal-meta-amt">${fmt(spent)} / ${fmt(g.budget)}</span>
          <span style="color:${remain<0&&type!=='project'?'var(--red)':'var(--txt3)'}">${remainLabel}</span>
        </div>
      </div>`;
    }).join('');
  });
}

/* ── Render: habits ── */
function renderHabits() {
  const listEl = el('habits-list'); if (!listEl) return;
  if (!habits.length) {
    listEl.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">✅</div>
      <div class="empty-state-title">No habits yet</div>
      <div class="empty-state-sub">Add habits below to start building streaks</div>
    </div>`;
    return;
  }
  const today = todayStr();
  listEl.innerHTML = habits.map(h => {
    const done = h.lastDone === today;
    return `<div class="habit-item">
      <span class="habit-icon">${h.icon}</span>
      <div class="habit-body">
        <div class="habit-name">${escHtml(h.name)}</div>
        <div class="habit-desc">${done?'✓ Done today!':'Not done yet today'}</div>
      </div>
      <div class="habit-streak">
        <span class="habit-streak-num">${h.streak||0}</span>
        <span class="habit-streak-label">streak</span>
      </div>
      <button class="habit-check ${done?'done':''}" onclick="toggleHabit('${h.id}')">${done?'✓':''}</button>
      <button class="habit-del" onclick="deleteHabit('${h.id}')">🗑️</button>
    </div>`;
  }).join('');
}