/* ══════════════════════════════════════════════════════════
   CoinTrack — app.js  (compat SDK, no type=module)
   ═══════════════════════════════════════════════════════ */

// === PASTE YOUR CONFIG HERE ===
const firebaseConfig = {
  apiKey: "AIzaSyCW6G3J3lBx64xb-wekpDcCSvTpqzVgsjI",
  authDomain: "cointrack4.firebaseapp.com",
  databaseURL: "https://cointrack4-default-rtdb.firebaseio.com",
  projectId: "cointrack4",
  storageBucket: "cointrack4.firebasestorage.app",
  messagingSenderId: "33912410283",
  appId: "1:33912410283:web:019eb03985bdbe2ad167ee",
  measurementId: "G-1N44JGWKDV"
};


firebase.initializeApp(firebaseConfig);
const db   = firebase.firestore();
const auth = firebase.auth();

let currentUser  = null;
let transactions = [];
let goals        = { inGoal: 0, outGoal: 0, saveGoal: 0 };
let habits       = [];
let dailyBudget  = 0;
let histFilter   = 'all';
let openDrillCat = null;

const CAT_ICONS = {
  Food:'🍔', Transport:'🚗', Housing:'🏠', Bills:'🧾',
  Shopping:'🛍️', Entertainment:'🎬', Health:'💊', Savings:'💰',
  Airtime:'📱', Education:'📚', Clothing:'👗', Other:'📦'
};

/* ── Utilities ─────────────────────────────────────────── */
const el  = id  => document.getElementById(id);
const fmt = num => 'KSh ' + Number(num).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const escHtml = s => s.replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t]||t));

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function dateOffset(n) {
  const d = new Date(); d.setDate(d.getDate()-n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getMonthRange() {
  const d = new Date();
  const m = String(d.getMonth()+1).padStart(2,'0');
  return [`${d.getFullYear()}-${m}-01`, `${d.getFullYear()}-${m}-31`];
}
function todayLabel() {
  return new Date().toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});
}
function showToast(msg, type='green') {
  const t = el('toast'); if (!t) return;
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}

/* ══════════════════════════════════════════════════════════
   AUTH
   ═══════════════════════════════════════════════════════ */
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  el('login-error').textContent = '';
  if (isMobile) {
    auth.signInWithRedirect(provider).catch(e => {
      el('login-error').textContent = e.message;
    });
  } else {
    auth.signInWithPopup(provider).catch(e => {
      el('login-error').textContent = e.message;
    });
  }
}

function handleSignOut() {
  closeUserMenu();
  auth.signOut();
}

// Handle redirect result on page load (mobile auth)
auth.getRedirectResult().then(result => {
  // onAuthStateChanged below will handle the signed-in user
}).catch(e => {
  if (el('login-error')) el('login-error').textContent = e.message;
});

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    el('login-screen').style.display  = 'none';
    el('loading-screen').style.display = 'flex';
    setupUserUI(user);
    listenToTransactions();
    listenToSettings();
    listenToHabits();
  } else {
    currentUser = null;
    el('login-screen').style.display   = 'flex';
    el('loading-screen').style.display = 'none';
    el('app-shell').style.display      = 'none';
  }
});

function setupUserUI(user) {
  if (el('user-menu-name'))  el('user-menu-name').textContent  = user.displayName || 'User';
  if (el('user-menu-email')) el('user-menu-email').textContent = user.email || '';
  if (user.photoURL) {
    const img = el('user-photo');
    if (img) { img.src = user.photoURL; img.style.display = 'block'; el('user-initials').style.display = 'none'; }
  } else {
    const ini = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
    if (el('user-initials')) el('user-initials').textContent = ini;
  }
}

/* ── User Menu ─────────────────────────────────────────── */
function toggleUserMenu() {
  const m = el('user-menu'), b = el('user-menu-backdrop');
  const open = m.style.display !== 'none';
  m.style.display = open ? 'none' : 'block';
  b.style.display = open ? 'none' : 'block';
}
function closeUserMenu() {
  el('user-menu').style.display          = 'none';
  el('user-menu-backdrop').style.display = 'none';
}

/* ══════════════════════════════════════════════════════════
   FIRESTORE LISTENERS
   ═══════════════════════════════════════════════════════ */
function listenToTransactions() {
  const q = db.collection(`users/${currentUser.uid}/transactions`).orderBy('date','desc');
  q.onSnapshot(snap => {
    transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDash(); renderLog(); renderSpent(); renderHist(); renderGoalProgress();
  });
}

function listenToSettings() {
  db.doc(`users/${currentUser.uid}/settings/config`).onSnapshot(snap => {
    if (snap.exists) {
      const data = snap.data();
      goals       = data.goals       || { inGoal:0, outGoal:0, saveGoal:0 };
      dailyBudget = data.dailyBudget || 0;
    }
    // Populate inputs
    if (goals.inGoal   && el('goal-in'))          el('goal-in').value          = goals.inGoal;
    if (goals.outGoal  && el('goal-out'))          el('goal-out').value         = goals.outGoal;
    if (goals.saveGoal && el('goal-save'))         el('goal-save').value        = goals.saveGoal;
    if (dailyBudget    && el('daily-budget-inp'))  el('daily-budget-inp').value = dailyBudget;
    renderDash(); renderGoalProgress();
    // Show app once settings loaded
    el('loading-screen').style.display = 'none';
    el('app-shell').style.display      = 'flex';
    initApp();
  });
}

function listenToHabits() {
  db.collection(`users/${currentUser.uid}/habits`).onSnapshot(snap => {
    habits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderHabits();
  });
}

/* ══════════════════════════════════════════════════════════
   MUTATIONS
   ═══════════════════════════════════════════════════════ */
async function addTx(dir) {
  if (!currentUser) return;
  const amtEl  = el(dir === 'in' ? 'in-amt'  : 'out-amt');
  const descEl = el(dir === 'in' ? 'in-desc' : 'out-desc');
  const dateEl = el(dir === 'in' ? 'in-date' : 'out-date');
  const catEl  = el('out-cat');

  const amt  = parseFloat(amtEl.value);
  const desc = descEl.value.trim();
  const date = dateEl.value || todayStr();

  if (!amt || amt <= 0) { showToast('Enter a valid amount', 'amber'); return; }
  if (!desc)            { showToast('Add a description', 'amber'); return; }

  const tx = { dir, amt, desc, date, cat: dir === 'in' ? 'Income' : (catEl ? catEl.value : 'Other') };
  try {
    await db.collection(`users/${currentUser.uid}/transactions`).add(tx);
    amtEl.value = ''; descEl.value = '';
    showToast(dir === 'in' ? '💵 Income recorded!' : '➖ Expense recorded!');
    showPage('dash', document.querySelector('.nav-btn'));
  } catch(e) { showToast('Error saving: ' + e.message, 'red'); }
}

async function deleteTx(firebaseId) {
  if (!currentUser) return;
  try {
    await db.doc(`users/${currentUser.uid}/transactions/${firebaseId}`).delete();
    showToast('Transaction deleted', 'amber');
    drillCategory('');
  } catch(e) { showToast('Error deleting', 'red'); }
}

async function saveDailyBudget() {
  if (!currentUser) return;
  const val = parseFloat(el('daily-budget-inp').value);
  if (!val || val <= 0) { showToast('Enter a valid budget', 'amber'); return; }
  dailyBudget = val;
  await db.doc(`users/${currentUser.uid}/settings/config`).set({ dailyBudget }, { merge: true });
  showToast('Daily budget saved ✓');
  renderDash();
}

async function saveGoals() {
  if (!currentUser) return;
  goals = {
    inGoal:   parseFloat(el('goal-in').value)   || 0,
    outGoal:  parseFloat(el('goal-out').value)  || 0,
    saveGoal: parseFloat(el('goal-save').value) || 0,
  };
  await db.doc(`users/${currentUser.uid}/settings/config`).set({ goals }, { merge: true });
  showToast('Goals saved ✓');
  renderGoalProgress();
  renderDash();
}

async function addHabit() {
  if (!currentUser) return;
  const name = el('habit-name').value.trim();
  const icon = el('habit-icon').value.trim() || '🎯';
  if (!name) { showToast('Enter a habit name', 'amber'); return; }
  await db.collection(`users/${currentUser.uid}/habits`).add({ name, icon, streak:0, lastDone:'' });
  el('habit-name').value = ''; el('habit-icon').value = '';
  showToast('Habit added ✓');
}

async function toggleHabit(firebaseId) {
  if (!currentUser) return;
  const habit = habits.find(h => h.id === firebaseId); if (!habit) return;
  const today = todayStr();
  const doneToday = habit.lastDone === today;
  const newStreak = doneToday ? Math.max(0, (habit.streak||0)-1) : (habit.streak||0)+1;
  await db.doc(`users/${currentUser.uid}/habits/${firebaseId}`).update({
    streak: newStreak, lastDone: doneToday ? '' : today
  });
}

async function deleteHabit(firebaseId) {
  if (!currentUser) return;
  await db.doc(`users/${currentUser.uid}/habits/${firebaseId}`).delete();
  showToast('Habit deleted', 'amber');
}

/* ══════════════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════════ */
function showPage(name, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
  const page = el(`page-${name}`);
  if (page) page.classList.add('active');
  if (btn)  { btn.classList.add('active'); btn.setAttribute('aria-selected','true'); }
  if (name === 'spent') renderSpent();
  if (name === 'hist')  renderHist();
  if (name === 'goals') { renderGoalProgress(); renderHabits(); }
}

/* ══════════════════════════════════════════════════════════
   RENDER: DASHBOARD
   ═══════════════════════════════════════════════════════ */
function renderDash() {
  const today  = todayStr();
  const [m0,m1]= getMonthRange();

  const tIn  = transactions.filter(t=>t.dir==='in'  && t.date===today).reduce((s,t)=>s+t.amt,0);
  const tOut = transactions.filter(t=>t.dir==='out' && t.date===today).reduce((s,t)=>s+t.amt,0);
  const mIn  = transactions.filter(t=>t.dir==='in'  && t.date>=m0 && t.date<=m1).reduce((s,t)=>s+t.amt,0);
  const mOut = transactions.filter(t=>t.dir==='out' && t.date>=m0 && t.date<=m1).reduce((s,t)=>s+t.amt,0);
  const allIn  = transactions.filter(t=>t.dir==='in' ).reduce((s,t)=>s+t.amt,0);
  const allOut = transactions.filter(t=>t.dir==='out').reduce((s,t)=>s+t.amt,0);
  const bal    = allIn - allOut;

  const balEl = el('dash-bal');
  if (balEl) {
    balEl.textContent = fmt(bal);
    balEl.className   = `balance-amount${bal<0?' neg':bal===0?' zero':''}`;
  }
  const sub = el('dash-balance-sub');
  if (sub) sub.textContent = bal === 0 ? 'Log your first transaction below' : (bal < 0 ? 'Spending exceeds income' : 'Looking good!');

  if (el('header-balance')) el('header-balance').textContent = fmt(bal);
  if (el('dash-today-in'))  el('dash-today-in').textContent  = fmt(tIn);
  if (el('dash-today-out')) el('dash-today-out').textContent = fmt(tOut);
  if (el('dash-month-in'))  el('dash-month-in').textContent  = fmt(mIn);
  if (el('dash-month-out')) el('dash-month-out').textContent = fmt(mOut);
  if (el('dash-total-in'))  el('dash-total-in').textContent  = fmt(allIn);
  if (el('dash-total-out')) el('dash-total-out').textContent = fmt(allOut);

  // Budget ring
  const ringProgress = el('ring-progress');
  const ringPct      = el('ring-pct');
  const ringSpent    = el('ring-spent');
  const ringRemain   = el('ring-remain');
  const ringBudLbl   = el('ring-budget-label');

  if (ringProgress && ringPct) {
    if (dailyBudget > 0) {
      const pct    = Math.min(tOut / dailyBudget, 1);
      const circ   = 2 * Math.PI * 38; // r=38
      const dash   = pct * circ;
      const remain = dailyBudget - tOut;

      ringProgress.style.strokeDasharray = `${dash} ${circ}`;
      ringProgress.style.stroke = remain < 0 ? 'var(--color-red)' : remain <= dailyBudget * 0.2 ? 'var(--color-amber)' : '#000000';
      ringPct.textContent    = `${Math.round(pct*100)}%`;
      if (ringSpent)   ringSpent.textContent   = fmt(tOut);
      if (ringRemain)  { ringRemain.textContent = remain < 0 ? `${fmt(Math.abs(remain))} over` : `${fmt(remain)} left`; ringRemain.className = `ring-info-remain ${remain<0?'over':remain<=dailyBudget*0.2?'warn':'ok'}`; }
      if (ringBudLbl)  ringBudLbl.textContent   = `Budget: ${fmt(dailyBudget)}`;
    } else {
      ringProgress.style.strokeDasharray = '0 239';
      ringPct.textContent = '0%';
      if (ringSpent)  ringSpent.textContent  = fmt(tOut);
      if (ringRemain) { ringRemain.textContent = 'Set a budget below'; ringRemain.className = 'ring-info-remain'; }
    }
  }

  if (el('week-grid'))         renderWeekBars();
  if (el('dash-goals-content')) renderDashGoals(mIn, mOut);
  if (el('dash-insights'))      renderInsights(tOut, mIn, mOut, bal);
}

function renderWeekBars() {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const dateStr = dateOffset(i);
    const d       = new Date(dateStr + 'T00:00:00');
    const dayName = i === 0 ? 'Today' : days[d.getDay()];
    const spent   = transactions.filter(t=>t.dir==='out'&&t.date===dateStr).reduce((s,t)=>s+t.amt,0);
    const pct     = dailyBudget > 0 ? Math.min(spent/dailyBudget,1) : 0;
    const cls     = dailyBudget===0?'none':pct>=1?'over':pct>=0.8?'warn':spent>0?'safe':'none';
    html += `<div class="week-row${i===0?' today-row':''}">
      <span class="week-day-label${i===0?' today':''}">${dayName}</span>
      <div class="week-bar-track"><div class="week-bar-fill ${cls}" style="width:${Math.round(pct*100)}%"></div></div>
      <span class="week-amount">${spent>0?fmt(spent):'–'}</span>
    </div>`;
  }
  el('week-grid').innerHTML = html;
}

function renderDashGoals(mIn, mOut) {
  const gc = el('dash-goals-content'); if (!gc) return;
  if (!goals.inGoal && !goals.outGoal) {
    gc.innerHTML = '<p style="font-size:13px;color:var(--text3)">Set monthly goals in the Goals tab →</p>';
    return;
  }
  let html = '';
  if (goals.inGoal)  html += buildProgBar('Monthly Income',   mIn,  goals.inGoal,  false);
  if (goals.outGoal) html += buildProgBar('Monthly Spending', mOut, goals.outGoal, true);
  gc.innerHTML = html;
}

function buildProgBar(label, current, goal, invert) {
  const pct  = Math.min(current/goal, 1);
  const pctW = Math.round(pct*100);
  const over = invert && pct >= 1;
  const warn = invert ? (pct>=0.8&&pct<1) : false;
  const ok   = invert ? pct<0.8 : pct>=1;
  const cls  = over?'red':warn?'amber':ok?'green':'blue';
  const note = over ? 'Over limit!' : warn ? 'Getting close' : `${pctW}% — ${fmt(Math.abs(goal-current))} ${current<goal?'to go':'achieved'}`;
  const noteCls = over?'over':warn?'warn':'ok';
  return `<div class="prog-wrap">
    <div class="prog-labels"><span class="prog-l">${label}</span><span class="prog-r">${fmt(current)} / ${fmt(goal)}</span></div>
    <div class="prog-track"><div class="prog-fill ${cls}" style="width:${pctW}%"></div></div>
    <div class="prog-note ${noteCls}">${note}</div>
  </div>`;
}

function renderInsights(tOut, mIn, mOut, bal) {
  const [m0,m1] = getMonthRange();
  const items   = [];
  const catTotals = {};
  transactions.filter(t=>t.dir==='out'&&t.date>=m0&&t.date<=m1).forEach(t=>{ catTotals[t.cat]=(catTotals[t.cat]||0)+t.amt; });
  const topCat = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
  if (topCat) items.push({ cls:'amber', icon:'💡', title:'Biggest spend category', text:`You spent the most on <strong>${topCat[0]}</strong> this month — ${fmt(topCat[1])}.` });
  if (dailyBudget>0&&tOut>dailyBudget) items.push({ cls:'red', icon:'⚠️', title:'Over daily budget today', text:`Spent ${fmt(tOut)} — ${fmt(tOut-dailyBudget)} over your ${fmt(dailyBudget)} limit.` });
  if (bal<0) items.push({ cls:'red', icon:'📉', title:'Balance is negative', text:'More spending than income recorded. Log missing income or reduce expenses.' });
  if (goals.outGoal>0&&mOut<goals.outGoal*0.8&&mOut>0) items.push({ cls:'green', icon:'✅', title:'On track with spending', text:`Spent ${fmt(mOut)} of ${fmt(goals.outGoal)} limit — ${fmt(goals.outGoal-mOut)} headroom left.` });
  if (goals.outGoal>0&&mOut>=goals.outGoal*0.8&&mOut<goals.outGoal) items.push({ cls:'amber', icon:'🔔', title:'Approaching spending limit', text:`Used ${Math.round(mOut/goals.outGoal*100)}% of monthly limit. Only ${fmt(goals.outGoal-mOut)} left.` });
  el('dash-insights').innerHTML = items.map(i=>`<div class="insight-card ${i.cls}"><div class="insight-icon">${i.icon}</div><div class="insight-body"><div class="insight-title">${i.title}</div><div class="insight-text">${i.text}</div></div></div>`).join('');
}

/* ══════════════════════════════════════════════════════════
   RENDER: LOG
   ═══════════════════════════════════════════════════════ */
function renderLog() {
  const recEl = el('log-recent'); if (!recEl) return;
  const recent = transactions.slice(0,7);
  if (!recent.length) {
    recEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🧾</div><div class="empty-state-title">No transactions yet</div><div class="empty-state-sub">Use the forms above to record money in or out</div></div>`;
    return;
  }
  recEl.innerHTML = recent.map(t=>txItemHTML(t,true)).join('');
}

function txItemHTML(t, showDel=false) {
  const icon   = t.dir==='in' ? '💵' : (CAT_ICONS[t.cat]||'📦');
  const delBtn = showDel ? `<button class="tx-del" onclick="deleteTx('${t.id}')" aria-label="Delete">🗑️</button>` : '';
  return `<div class="tx-item ${t.dir}">
    <div class="tx-icon ${t.dir}">${icon}</div>
    <div class="tx-body">
      <div class="tx-desc">${escHtml(t.desc)}</div>
      <div class="tx-meta">${t.date}<span class="tx-cat-pill">${t.cat||'Income'}</span></div>
    </div>
    <div class="tx-amount ${t.dir}">${t.dir==='in'?'+':'-'}${fmt(t.amt)}</div>
    ${delBtn}
  </div>`;
}

/* ══════════════════════════════════════════════════════════
   RENDER: SPENT
   ═══════════════════════════════════════════════════════ */
function renderSpent() {
  if (!el('sp-metrics')) return;
  const from = el('sp-from').value || getMonthRange()[0];
  const to   = el('sp-to').value   || getMonthRange()[1];
  const filtered   = transactions.filter(t=>t.date>=from&&t.date<=to);
  const incomeAmt  = filtered.filter(t=>t.dir==='in').reduce((s,t)=>s+t.amt,0);
  const spentAmt   = filtered.filter(t=>t.dir==='out').reduce((s,t)=>s+t.amt,0);
  const netAmt     = incomeAmt-spentAmt;
  const spentCount = filtered.filter(t=>t.dir==='out').length;

  el('sp-metrics').innerHTML = `
    <div class="metric"><div class="metric-label">Total in</div><div class="metric-value" style="color:var(--color-green)">${fmt(incomeAmt)}</div></div>
    <div class="metric"><div class="metric-label">Total out</div><div class="metric-value" style="color:var(--color-red)">${fmt(spentAmt)}</div></div>
    <div class="metric"><div class="metric-label">Net</div><div class="metric-value" style="color:${netAmt>=0?'var(--color-green)':'var(--color-red)'}">${fmt(netAmt)}</div></div>
    <div class="metric"><div class="metric-label">Purchases</div><div class="metric-value" style="color:var(--color-blue)">${spentCount}</div></div>`;

  const cats = {};
  filtered.filter(t=>t.dir==='out').forEach(t=>{ if(!cats[t.cat]) cats[t.cat]={amt:0,items:[]}; cats[t.cat].amt+=t.amt; cats[t.cat].items.push(t); });
  const sorted = Object.entries(cats).sort((a,b)=>b[1].amt-a[1].amt);
  const maxAmt = sorted.length ? sorted[0][1].amt : 1;
  const catGrid = el('sp-cats');
  if (!sorted.length) {
    catGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📂</div><div class="empty-state-title">No spending in this period</div></div>`;
    return;
  }
  catGrid.innerHTML = sorted.map(([cat,data])=>{
    const pct = Math.round(data.amt/maxAmt*100);
    return `<div class="cat-card" onclick="drillCategory('${cat}')" role="button" aria-label="View ${cat}">
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
  if (!cat) { drillEl.classList.remove('open'); openDrillCat=null; return; }
  const from = el('sp-from').value || getMonthRange()[0];
  const to   = el('sp-to').value   || getMonthRange()[1];
  if (openDrillCat===cat && drillEl.classList.contains('open')) { drillEl.classList.remove('open'); openDrillCat=null; return; }
  openDrillCat = cat;
  const items = transactions.filter(t=>t.dir==='out'&&t.cat===cat&&t.date>=from&&t.date<=to);
  el('drill-title').textContent = `${CAT_ICONS[cat]||'📦'} ${cat} — ${items.length} purchase${items.length!==1?'s':''}`;
  el('drill-list').innerHTML = items.length
    ? items.map(t=>`<div class="tx-item out" style="margin-bottom:8px">
        <div class="tx-icon out">${CAT_ICONS[t.cat]||'📦'}</div>
        <div class="tx-body"><div class="tx-desc">${escHtml(t.desc)}</div><div class="tx-meta">${t.date}</div></div>
        <div class="tx-amount out">${fmt(t.amt)}</div>
        <button class="tx-del" onclick="deleteTx('${t.id}')" aria-label="Delete">🗑️</button>
      </div>`).join('')
    : '<p style="font-size:13px;color:var(--text3);text-align:center;padding:12px">No items found</p>';
  drillEl.classList.add('open');
}

/* ══════════════════════════════════════════════════════════
   RENDER: HISTORY
   ═══════════════════════════════════════════════════════ */
function renderHist() {
  if (!el('h-from')) return;
  const from = el('h-from').value || getMonthRange()[0];
  const to   = el('h-to').value   || todayStr();
  let filtered = transactions.filter(t=>t.date>=from&&t.date<=to);
  if      (histFilter==='in')  filtered = filtered.filter(t=>t.dir==='in');
  else if (histFilter==='out') filtered = filtered.filter(t=>t.dir==='out');
  else if (histFilter!=='all') filtered = filtered.filter(t=>t.cat===histFilter);

  const sumIn  = filtered.filter(t=>t.dir==='in').reduce((s,t)=>s+t.amt,0);
  const sumOut = filtered.filter(t=>t.dir==='out').reduce((s,t)=>s+t.amt,0);
  const sumEl  = el('hist-summary');
  if (filtered.length) {
    sumEl.innerHTML = `<div class="hist-summary">
      <div class="hist-stat"><span class="hist-stat-v" style="color:var(--color-green)">${fmt(sumIn)}</span><span class="hist-stat-l">In</span></div>
      <div class="hist-stat"><span class="hist-stat-v" style="color:var(--color-red)">${fmt(sumOut)}</span><span class="hist-stat-l">Out</span></div>
      <div class="hist-stat"><span class="hist-stat-v" style="color:${(sumIn-sumOut)>=0?'var(--color-green)':'var(--color-red)'}">${fmt(sumIn-sumOut)}</span><span class="hist-stat-l">Net</span></div>
      <div class="hist-stat"><span class="hist-stat-v" style="color:var(--color-blue)">${filtered.length}</span><span class="hist-stat-l">Count</span></div>
    </div>`;
  } else { sumEl.innerHTML=''; }

  const listEl = el('hist-list');
  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">No transactions found</div><div class="empty-state-sub">Try adjusting the date range or filter</div></div>`;
    return;
  }
  listEl.innerHTML = filtered.map(t=>txItemHTML(t,true)).join('');
}

function setHistFilter(filter, btn) {
  histFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');
  renderHist();
}

/* ══════════════════════════════════════════════════════════
   RENDER: GOALS & HABITS
   ═══════════════════════════════════════════════════════ */
function renderGoalProgress() {
  if (!el('goal-in-progress')) return;
  const [m0,m1] = getMonthRange();
  const mIn   = transactions.filter(t=>t.dir==='in' &&t.date>=m0&&t.date<=m1).reduce((s,t)=>s+t.amt,0);
  const mOut  = transactions.filter(t=>t.dir==='out'&&t.date>=m0&&t.date<=m1).reduce((s,t)=>s+t.amt,0);
  const saved = transactions.filter(t=>t.cat==='Savings').reduce((s,t)=>s+t.amt,0);
  const rp = (id,cur,goal,inv) => { const e=el(id); if(!e)return; if(!goal){e.innerHTML='';return;} e.innerHTML=buildProgBar('Progress',cur,goal,inv); };
  rp('goal-in-progress',  mIn,  goals.inGoal,  false);
  rp('goal-out-progress', mOut, goals.outGoal, true);
  rp('goal-save-progress',saved,goals.saveGoal,false);
}

function renderHabits() {
  const listEl = el('habits-list'); if (!listEl) return;
  if (!habits.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-title">No habits yet</div><div class="empty-state-sub">Add habits below to start building streaks</div></div>`;
    return;
  }
  const today = todayStr();
  listEl.innerHTML = habits.map(h=>{
    const done = h.lastDone===today;
    return `<div class="habit-item">
      <span class="habit-icon">${h.icon}</span>
      <div class="habit-body"><div class="habit-name">${escHtml(h.name)}</div><div class="habit-desc">${done?'✓ Done today!':'Not done yet today'}</div></div>
      <div class="habit-streak"><span class="habit-streak-num">${h.streak||0}</span><span class="habit-streak-label">streak</span></div>
      <button class="habit-check ${done?'done':''}" onclick="toggleHabit('${h.id}')" aria-label="${done?'Mark incomplete':'Mark done'}">${done?'✓':''}</button>
      <button class="habit-del" onclick="deleteHabit('${h.id}')" aria-label="Delete habit">🗑️</button>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════════
   PWA / SERVICE WORKER
   ═══════════════════════════════════════════════════════ */
let deferredInstall;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstall = e;
  if (el('install-banner')) el('install-banner').style.display = 'flex';
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
}

/* ══════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════ */
function initApp() {
  const today = todayStr();
  const [m0,m1] = getMonthRange();
  if (el('header-date')) el('header-date').textContent = todayLabel();
  ['in-date','out-date'].forEach(id=>{ const inp=el(id); if(inp&&!inp.value) inp.value=today; });
  const sf=el('sp-from'),st=el('sp-to'); if(sf&&!sf.value){sf.value=m0;st.value=m1;}
  const hf=el('h-from'), ht=el('h-to');  if(hf&&!hf.value){hf.value=m0;ht.value=today;}

  const installBtn = el('install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', ()=>{
      if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.then(c=>{ if(c.outcome==='accepted') el('install-banner').style.display='none'; }); }
    });
  }
}