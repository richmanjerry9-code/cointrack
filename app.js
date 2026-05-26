import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  deleteDoc, doc, setDoc, query, orderBy, updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// === PASTE YOUR CONFIG HERE ===
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let currentUser = null;

// Global State
let transactions = [];
let goals = { inGoal: 0, outGoal: 0, saveGoal: 0 };
let habits = [];
let dailyBudget = 0;
let histFilter = 'all';
let openDrillCat = null;

const CAT_ICONS = {
  'Food': '🍔', 'Transport': '🚗', 'Housing': '🏠', 'Bills': '🧾',
  'Shopping': '🛍️', 'Entertainment': '🎬', 'Health': '💊', 'Savings': '💰'
};

// Utilities
const el = id => document.getElementById(id);
const fmt = num => '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const escHtml = str => str.replace(/[&<>'"]/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[tag] || tag));

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateOffset(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonthRange() {
  const d = new Date();
  const m0 = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  const m1 = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-31`;
  return [m0, m1];
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function showToast(msg, type = 'green') {
  const toast = el('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

/* ══════════════════════════════════════════════════════════
   FIREBASE AUTH & LISTENERS
   ═══════════════════════════════════════════════════════ */
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    listenToTransactions();
    listenToSettings();
    listenToHabits();
    // After state is synced, UI will render via onSnapshot callbacks
  } else {
    currentUser = null;
    console.log("No user logged in. Add your auth UI flow here.");
  }
});

function listenToTransactions() {
  const q = query(collection(db, `users/${currentUser.uid}/transactions`), orderBy("date", "desc"));
  onSnapshot(q, (snapshot) => {
    transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Re-render UI pieces relying on transactions
    renderDash();
    renderLog();
    renderSpent();
    renderHist();
    renderGoalProgress();
  });
}

function listenToSettings() {
  const settingsRef = doc(db, `users/${currentUser.uid}/settings`, 'config');
  onSnapshot(settingsRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      goals = data.goals || { inGoal: 0, outGoal: 0, saveGoal: 0 };
      dailyBudget = data.dailyBudget || 0;
    }
    renderDash();
    renderGoalProgress();
  });
}

function listenToHabits() {
  const q = collection(db, `users/${currentUser.uid}/habits`);
  onSnapshot(q, (snapshot) => {
    habits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderHabits();
  });
}

/* ══════════════════════════════════════════════════════════
   FIREBASE MUTATION FUNCTIONS
   ═══════════════════════════════════════════════════════ */
async function deleteTx(firebaseId) {
  if (!currentUser) return;
  try {
    await deleteDoc(doc(db, `users/${currentUser.uid}/transactions`, firebaseId));
    showToast('Transaction deleted', 'amber');
    // If deleted from drill panel, re-render spent tab
    drillCategory(''); 
    renderSpent();
  } catch (error) {
    showToast('Error deleting transaction', 'red');
  }
}

async function toggleHabit(firebaseId) {
  if (!currentUser) return;
  const habit = habits.find(h => h.id === firebaseId);
  if (!habit) return;
  
  const today = todayStr();
  const doneToday = habit.lastDone === today;
  
  let newStreak = habit.streak || 0;
  let newLastDone = habit.lastDone;
  
  if (doneToday) {
    newStreak = Math.max(0, newStreak - 1);
    newLastDone = ''; // simplify undo logic
  } else {
    newStreak++;
    newLastDone = today;
  }
  
  await updateDoc(doc(db, `users/${currentUser.uid}/habits`, firebaseId), {
    streak: newStreak,
    lastDone: newLastDone
  });
}

async function deleteHabit(firebaseId) {
  if (!currentUser) return;
  await deleteDoc(doc(db, `users/${currentUser.uid}/habits`, firebaseId));
  showToast('Habit deleted', 'amber');
}

/* ══════════════════════════════════════════════════════════
   RENDER: DASHBOARD
   ═══════════════════════════════════════════════════════ */
function renderDash() {
  const today = todayStr();
  const [m0, m1] = getMonthRange();
  
  const tIn  = transactions.filter(t => t.dir === 'in' && t.date === today).reduce((s,t) => s + t.amt, 0);
  const tOut = transactions.filter(t => t.dir === 'out' && t.date === today).reduce((s,t) => s + t.amt, 0);
  const mIn  = transactions.filter(t => t.dir === 'in' && t.date >= m0 && t.date <= m1).reduce((s,t) => s + t.amt, 0);
  const mOut = transactions.filter(t => t.dir === 'out' && t.date >= m0 && t.date <= m1).reduce((s,t) => s + t.amt, 0);
  const bal  = transactions.filter(t => t.dir === 'in').reduce((s,t) => s + t.amt, 0) - 
               transactions.filter(t => t.dir === 'out').reduce((s,t) => s + t.amt, 0);

  const balEl = el('dash-bal');
  if (balEl) {
    balEl.textContent = fmt(bal);
    balEl.className = `balance-amount ${bal < 0 ? 'neg' : bal === 0 ? 'zero' : ''}`;
  }

  if (el('dash-in'))  el('dash-in').textContent  = fmt(mIn);
  if (el('dash-out')) el('dash-out').textContent = fmt(mOut);
  if (el('dash-today-spent')) el('dash-today-spent').textContent = fmt(tOut);
  
  if (el('dash-today-remain') && el('dash-ring-pct') && el('dash-ring-progress')) {
    if (dailyBudget > 0) {
      const remain = dailyBudget - tOut;
      const pct = Math.min(tOut / dailyBudget, 1);
      const strokeDash = pct * 251.2; 
      
      const rEl = el('dash-today-remain');
      rEl.textContent = remain < 0 ? `${fmt(Math.abs(remain))} over` : `${fmt(remain)} left`;
      rEl.className = `ring-info-remain ${remain < 0 ? 'over' : remain <= dailyBudget * 0.2 ? 'warn' : 'ok'}`;
      
      el('dash-ring-pct').textContent = `${Math.round(pct * 100)}%`;
      el('dash-ring-progress').style.strokeDasharray = `${strokeDash}, 251.2`;
      el('dash-ring-progress').style.stroke = remain < 0 ? 'var(--text3)' : remain <= dailyBudget * 0.2 ? 'var(--text2)' : 'var(--white)';
    } else {
      el('dash-today-remain').textContent = 'No budget set';
      el('dash-ring-pct').textContent = '0%';
      el('dash-ring-progress').style.strokeDasharray = '0, 251.2';
    }
  }

  if (el('week-grid')) renderWeekBars();
  if (el('dash-goals-content')) renderDashGoals(mIn, mOut);
  if (el('dash-insights')) renderInsights(tOut, mIn, mOut, bal);
}

function renderWeekBars() {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html   = '';
  for (let i = 6; i >= 0; i--) {
    const dateStr = dateOffset(i);
    const d       = new Date(dateStr + 'T00:00:00');
    const dayName = i === 0 ? 'Today' : days[d.getDay()];
    const spent   = transactions
      .filter(t => t.dir === 'out' && t.date === dateStr)
      .reduce((s,t) => s + t.amt, 0);
    const pct = dailyBudget > 0 ? Math.min(spent / dailyBudget, 1) : 0;
    const cls = dailyBudget === 0 ? 'none' : pct >= 1 ? 'over' : pct >= 0.8 ? 'warn' : spent > 0 ? 'safe' : 'none';
    html += `
      <div class="week-row${i === 0 ? ' today-row' : ''}">
        <span class="week-day-label${i === 0 ? ' today' : ''}">${dayName}</span>
        <div class="week-bar-track">
          <div class="week-bar-fill ${cls}" style="width:${Math.round(pct*100)}%"></div>
        </div>
        <span class="week-amount">${spent > 0 ? fmt(spent) : '–'}</span>
      </div>`;
  }
  el('week-grid').innerHTML = html;
}

function renderDashGoals(mIn, mOut) {
  const gc = el('dash-goals-content');
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
  const pct  = Math.min(current / goal, 1);
  const pctW = Math.round(pct * 100);
  const over = invert ? pct >= 1 : false;
  const warn = invert ? (pct >= 0.8 && pct < 1) : (pct >= 0.5 && pct < 1);
  const ok   = invert ? pct < 0.8 : pct >= 1;
  const cls  = over ? 'red' : warn ? 'amber' : ok ? 'green' : 'blue';
  const note = over
    ? 'Over limit!'
    : warn ? 'Getting close'
    : `${pctW}% — ${fmt(Math.abs(goal - current))} ${current < goal ? 'to go' : 'achieved'}`;
  const noteCls = over ? 'over' : warn ? 'warn' : 'ok';
  return `
    <div class="prog-wrap">
      <div class="prog-labels">
        <span class="prog-l">${label}</span>
        <span class="prog-r">${fmt(current)} / ${fmt(goal)}</span>
      </div>
      <div class="prog-track">
        <div class="prog-fill ${cls}" style="width:${pctW}%"></div>
      </div>
      <div class="prog-note ${noteCls}">${note}</div>
    </div>`;
}

function renderInsights(tOut, mIn, mOut, bal) {
  const [m0, m1] = getMonthRange();
  const items    = [];

  const catTotals = {};
  transactions
    .filter(t => t.dir === 'out' && t.date >= m0 && t.date <= m1)
    .forEach(t => { catTotals[t.cat] = (catTotals[t.cat] || 0) + t.amt; });

  const topCat = Object.entries(catTotals).sort((a,b) => b[1] - a[1])[0];
  if (topCat) items.push({
    cls: 'amber', icon: '💡',
    title: 'Biggest spend category',
    text: `You spent the most on <strong>${topCat[0]}</strong> this month — ${fmt(topCat[1])}.`
  });

  if (dailyBudget > 0 && tOut > dailyBudget) items.push({
    cls: 'red', icon: '⚠️',
    title: 'Over daily budget today',
    text: `You've spent ${fmt(tOut)} — that's ${fmt(tOut - dailyBudget)} over your ${fmt(dailyBudget)} limit.`
  });

  if (bal < 0) items.push({
    cls: 'red', icon: '📉',
    title: 'Balance is negative',
    text: 'You\'ve recorded more spending than income. Log missing income or cut back on expenses.'
  });

  if (goals.outGoal > 0 && mOut < goals.outGoal * 0.8 && mOut > 0) items.push({
    cls: 'green', icon: '✅',
    title: 'On track with spending',
    text: `Spent ${fmt(mOut)} of ${fmt(goals.outGoal)} limit — ${fmt(goals.outGoal - mOut)} headroom left.`
  });

  if (goals.outGoal > 0 && mOut >= goals.outGoal * 0.8 && mOut < goals.outGoal) items.push({
    cls: 'amber', icon: '🔔',
    title: 'Approaching spending limit',
    text: `You've used ${Math.round(mOut / goals.outGoal * 100)}% of your monthly limit. Only ${fmt(goals.outGoal - mOut)} left.`
  });

  el('dash-insights').innerHTML = items.map(i => `
    <div class="insight-card ${i.cls}">
      <div class="insight-icon">${i.icon}</div>
      <div class="insight-body">
        <div class="insight-title">${i.title}</div>
        <div class="insight-text">${i.text}</div>
      </div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════════════
   RENDER: LOG TAB
   ═══════════════════════════════════════════════════════ */
function renderLog() {
  const recent = transactions.slice(0, 7);
  const recEl  = el('log-recent');
  if (!recEl) return;
  
  if (!recent.length) {
    recEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🧾</div>
        <div class="empty-state-title">No transactions yet</div>
        <div class="empty-state-sub">Use the forms above to record money in or out</div>
      </div>`;
    return;
  }
  recEl.innerHTML = recent.map(t => txItemHTML(t, true)).join('');
}

function txItemHTML(t, showDel = false) {
  const icon   = t.dir === 'in' ? '💵' : (CAT_ICONS[t.cat] || '📦');
  // Pass string ID wrapped in single quotes for Firebase string IDs
  const delBtn = showDel
    ? `<button class="tx-del" onclick="deleteTx('${t.id}')" aria-label="Delete transaction">🗑️</button>`
    : '';
  return `
    <div class="tx-item ${t.dir}">
      <div class="tx-icon ${t.dir}">${icon}</div>
      <div class="tx-body">
        <div class="tx-desc">${escHtml(t.desc)}</div>
        <div class="tx-meta">
          ${t.date}
          <span class="tx-cat-pill">${t.cat || 'Income'}</span>
        </div>
      </div>
      <div class="tx-amount ${t.dir}">${t.dir === 'in' ? '+' : '-'}${fmt(t.amt)}</div>
      ${delBtn}
    </div>`;
}

/* ══════════════════════════════════════════════════════════
   RENDER: SPENT TAB
   ═══════════════════════════════════════════════════════ */
function renderSpent() {
  if (!el('sp-metrics')) return;
  const from = el('sp-from').value || getMonthRange()[0];
  const to   = el('sp-to').value   || getMonthRange()[1];

  const filtered   = transactions.filter(t => t.date >= from && t.date <= to);
  const incomeAmt  = filtered.filter(t => t.dir === 'in').reduce((s,t) => s+t.amt, 0);
  const spentAmt   = filtered.filter(t => t.dir === 'out').reduce((s,t) => s+t.amt, 0);
  const netAmt     = incomeAmt - spentAmt;
  const spentCount = filtered.filter(t => t.dir === 'out').length;

  el('sp-metrics').innerHTML = `
    <div class="metric"><div class="metric-label">Total in</div><div class="metric-value green">${fmt(incomeAmt)}</div></div>
    <div class="metric"><div class="metric-label">Total out</div><div class="metric-value red">${fmt(spentAmt)}</div></div>
    <div class="metric"><div class="metric-label">Net</div><div class="metric-value ${netAmt >= 0 ? 'green' : 'red'}">${fmt(netAmt)}</div></div>
    <div class="metric"><div class="metric-label">Purchases</div><div class="metric-value blue">${spentCount}</div></div>`;

  const outTxs = filtered.filter(t => t.dir === 'out');
  const cats   = {};
  outTxs.forEach(t => {
    if (!cats[t.cat]) cats[t.cat] = { amt: 0, items: [] };
    cats[t.cat].amt += t.amt;
    cats[t.cat].items.push(t);
  });

  const sorted  = Object.entries(cats).sort((a,b) => b[1].amt - a[1].amt);
  const maxAmt  = sorted.length ? sorted[0][1].amt : 1;
  const catGrid = el('sp-cats');

  if (!sorted.length) {
    catGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">📂</div>
        <div class="empty-state-title">No spending in this period</div>
      </div>`;
    return;
  }

  catGrid.innerHTML = sorted.map(([cat, data]) => {
    const pct = Math.round(data.amt / maxAmt * 100);
    return `
      <div class="cat-card" onclick="drillCategory('${cat}')" role="button" aria-label="View ${cat} purchases">
        <span class="cat-icon">${CAT_ICONS[cat] || '📦'}</span>
        <div class="cat-name">${cat}</div>
        <div class="cat-amt">${fmt(data.amt)}</div>
        <div class="cat-count">${data.items.length} purchase${data.items.length !== 1 ? 's' : ''}</div>
        <div class="cat-bar"><div class="cat-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}

function drillCategory(cat) {
  const drillEl = el('drill-panel');
  if (!drillEl) return;
  
  if (cat === '') {
    drillEl.classList.remove('open');
    openDrillCat = null;
    return;
  }

  const from = el('sp-from').value || getMonthRange()[0];
  const to   = el('sp-to').value   || getMonthRange()[1];

  if (openDrillCat === cat && drillEl.classList.contains('open')) {
    drillEl.classList.remove('open');
    openDrillCat = null;
    return;
  }
  openDrillCat = cat;

  const items = transactions.filter(t =>
    t.dir === 'out' && t.cat === cat && t.date >= from && t.date <= to
  );

  el('drill-title').textContent = `${CAT_ICONS[cat] || '📦'} ${cat} — ${items.length} purchase${items.length !== 1 ? 's' : ''}`;
  el('drill-list').innerHTML = items.length
    ? items.map(t => `
        <div class="tx-item out" style="margin-bottom:8px">
          <div class="tx-icon out">${CAT_ICONS[t.cat]||'📦'}</div>
          <div class="tx-body">
            <div class="tx-desc">${escHtml(t.desc)}</div>
            <div class="tx-meta">${t.date}</div>
          </div>
          <div class="tx-amount out">${fmt(t.amt)}</div>
          <button class="tx-del" onclick="deleteTx('${t.id}')" aria-label="Delete">🗑️</button>
        </div>`).join('')
    : '<p style="font-size:13px;color:var(--text3);text-align:center;padding:12px">No items found</p>';

  drillEl.classList.add('open');
}

/* ══════════════════════════════════════════════════════════
   RENDER: HISTORY TAB
   ═══════════════════════════════════════════════════════ */
function renderHist() {
  if (!el('h-from')) return;
  const from = el('h-from').value || getMonthRange()[0];
  const to   = el('h-to').value   || todayStr();
  let filtered = transactions.filter(t => t.date >= from && t.date <= to);

  if      (histFilter === 'in')  filtered = filtered.filter(t => t.dir === 'in');
  else if (histFilter === 'out') filtered = filtered.filter(t => t.dir === 'out');
  else if (histFilter !== 'all') filtered = filtered.filter(t => t.cat === histFilter);

  const sumIn  = filtered.filter(t => t.dir === 'in').reduce((s,t) => s+t.amt, 0);
  const sumOut = filtered.filter(t => t.dir === 'out').reduce((s,t) => s+t.amt, 0);
  const sumEl  = el('hist-summary');

  if (filtered.length) {
    sumEl.innerHTML = `
      <div class="hist-summary">
        <div class="hist-stat"><span class="hist-stat-v" style="color:var(--green)">${fmt(sumIn)}</span><span class="hist-stat-l">In</span></div>
        <div class="hist-stat"><span class="hist-stat-v" style="color:var(--red)">${fmt(sumOut)}</span><span class="hist-stat-l">Out</span></div>
        <div class="hist-stat"><span class="hist-stat-v" style="color:${(sumIn-sumOut)>=0?'var(--green)':'var(--red)'}">${fmt(sumIn-sumOut)}</span><span class="hist-stat-l">Net</span></div>
        <div class="hist-stat"><span class="hist-stat-v" style="color:var(--blue)">${filtered.length}</span><span class="hist-stat-l">Count</span></div>
      </div>`;
  } else {
    sumEl.innerHTML = '';
  }

  const listEl = el('hist-list');
  if (!filtered.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No transactions found</div>
        <div class="empty-state-sub">Try adjusting the date range or filter</div>
      </div>`;
    return;
  }
  listEl.innerHTML = filtered.map(t => txItemHTML(t, true)).join('');
}

function setHistFilter(filter, btn) {
  histFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderHist();
}

/* ══════════════════════════════════════════════════════════
   RENDER: GOALS & HABITS
   ═══════════════════════════════════════════════════════ */
function renderGoalProgress() {
  if (!el('goal-in-progress')) return;
  const [m0, m1] = getMonthRange();
  const mIn   = transactions.filter(t => t.dir === 'in'  && t.date >= m0 && t.date <= m1).reduce((s,t) => s+t.amt, 0);
  const mOut  = transactions.filter(t => t.dir === 'out' && t.date >= m0 && t.date <= m1).reduce((s,t) => s+t.amt, 0);
  const saved = transactions.filter(t => t.cat === 'Savings').reduce((s,t) => s+t.amt, 0);

  function renderProg(elId, cur, goal, invert) {
    const progEl = el(elId);
    if (!progEl) return;
    if (!goal) { progEl.innerHTML = ''; return; }
    progEl.innerHTML = buildProgBar('Progress', cur, goal, invert);
  }
  renderProg('goal-in-progress',   mIn,  goals.inGoal,   false);
  renderProg('goal-out-progress',  mOut, goals.outGoal,  true);
  renderProg('goal-save-progress', saved, goals.saveGoal, false);
}

function renderHabits() {
  const listEl = el('habits-list');
  if (!listEl) return;
  if (!habits.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <div class="empty-state-title">No habits yet</div>
        <div class="empty-state-sub">Add habits below to start building streaks</div>
      </div>`;
    return;
  }
  const today = todayStr();
  listEl.innerHTML = habits.map(h => {
    const done = h.lastDone === today;
    return `
      <div class="habit-item">
        <span class="habit-icon">${h.icon}</span>
        <div class="habit-body">
          <div class="habit-name">${escHtml(h.name)}</div>
          <div class="habit-desc">${done ? '✓ Done today!' : 'Not done yet today'}</div>
        </div>
        <div class="habit-streak">
          <span class="habit-streak-num">${h.streak || 0}</span>
          <span class="habit-streak-label">streak</span>
        </div>
        <button class="habit-check ${done ? 'done' : ''}"
          onclick="toggleHabit('${h.id}')"
          aria-label="${done ? 'Mark incomplete' : 'Mark done for today'}">
          ${done ? '✓' : ''}
        </button>
        <button class="habit-del" onclick="deleteHabit('${h.id}')" aria-label="Delete habit">🗑️</button>
      </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════════
   PWA INSTALL
   ═══════════════════════════════════════════════════════ */
let deferredInstall;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  if(el('install-banner')) el('install-banner').style.display = 'flex';
});

document.addEventListener('DOMContentLoaded', () => {
  const installBtn = el('install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', () => {
      if (deferredInstall) {
        deferredInstall.prompt();
        deferredInstall.userChoice.then(choice => {
          if (choice.outcome === 'accepted') el('install-banner').style.display = 'none';
        });
      }
    });
  }
});

/* Service Worker */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .catch(err => console.warn('SW registration failed:', err));
  });
}

/* ══════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════ */
function initApp() {
  const today    = todayStr();
  const [m0, m1] = getMonthRange();

  if (el('header-date')) el('header-date').textContent = todayLabel();

  ['in-date', 'out-date'].forEach(id => {
    const input = el(id);
    if (input && !input.value) input.value = today;
  });

  const spFrom = el('sp-from'), spTo = el('sp-to');
  if (spFrom && !spFrom.value) { spFrom.value = m0; spTo.value = m1; }

  const hFrom = el('h-from'), hTo = el('h-to');
  if (hFrom && !hFrom.value) { hFrom.value = m0; hTo.value = today; }

  if (goals.inGoal && el('goal-in'))   el('goal-in').value   = goals.inGoal;
  if (goals.outGoal && el('goal-out')) el('goal-out').value  = goals.outGoal;
  if (goals.saveGoal && el('goal-save')) el('goal-save').value = goals.saveGoal;
  if (dailyBudget && el('daily-budget-inp')) el('daily-budget-inp').value = dailyBudget;
}

// Bind ES Module functions to window so HTML inline handlers can reach them
window.deleteTx = deleteTx;
window.toggleHabit = toggleHabit;
window.deleteHabit = deleteHabit;
window.drillCategory = drillCategory;
window.setHistFilter = setHistFilter;
window.renderSpent = renderSpent;
window.renderHist = renderHist;

document.addEventListener('DOMContentLoaded', initApp);