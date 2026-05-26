/* ============================================================
   COINTRACK — app.js
   Personal finance tracker with Google login & cloud sync
   ============================================================ */

'use strict';

/* ══════════════════════════════════════════════════════════
   🔥 FIREBASE CONFIG
   ══════════════════════════════════════════════════════════
   1. Go to https://console.firebase.google.com
   2. Click "Add project" → give it a name → Continue
   3. Once created: Project Settings (gear icon) → "Your apps"
      → click </> (Web) → register app → copy the config below
   4. In Firebase console:
      - Authentication → Sign-in method → enable "Google"
      - Firestore Database → Create database → Start in
        production mode → choose a region near Kenya (e.g.
        europe-west1) → Enable
   5. Paste your values below replacing the placeholders
   ═══════════════════════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCW6G3J3lBx64xb-wekpDcCSvTpqzVgsjI",
  authDomain:        "cointrack4.firebaseapp.com",
  projectId:         "cointrack4",
  storageBucket:     "cointrack4.firebasestorage.app",
  messagingSenderId: "33912410283",
  appId:             "1:33912410283:web:019eb03985bdbe2ad167ee"
};

/* ── INIT FIREBASE ─────────────────────────────────────── */
firebase.initializeApp(FIREBASE_CONFIG);
const auth           = firebase.auth();
const db             = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

/* ── CONSTANTS ─────────────────────────────────────────── */
const CAT_ICONS = {
  Food:          '🍽️',
  Transport:     '🚌',
  Bills:         '💡',
  Health:        '🏥',
  Entertainment: '🎉',
  Clothing:      '👗',
  Savings:       '🏦',
  Airtime:       '📱',
  Education:     '📚',
  Other:         '📦',
  Income:        '💵',
};

const CIRC = 2 * Math.PI * 38;

/* ── STATE ─────────────────────────────────────────────── */
let currentUser  = null;
let transactions = [];
let dailyBudget  = 0;
let goals        = { inGoal: 0, outGoal: 0, saveGoal: 0 };
let habits       = [];
let histFilter   = 'all';
let openDrillCat = null;
let saveTimer    = null;

/* ── DOM HELPERS ───────────────────────────────────────── */
function el(id) { return document.getElementById(id); }

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── FORMAT ────────────────────────────────────────────── */
function fmt(n) {
  return 'KSh ' + Math.round(n).toLocaleString('en-KE');
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function todayLabel() {
  return new Date().toLocaleDateString('en-KE', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
}

function getMonthRange() {
  const n    = new Date();
  const from = new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10);
  const to   = new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().slice(0, 10);
  return [from, to];
}

function dateOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/* ── TOAST ─────────────────────────────────────────────── */
let toastTimer;
function toast(msg, type = '') {
  const t = el('toast');
  t.textContent = msg;
  t.className   = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ══════════════════════════════════════════════════════════
   AUTH
   ═══════════════════════════════════════════════════════ */

function signInWithGoogle() {
  const btn = el('google-signin-btn');
  btn.disabled    = true;
  btn.textContent = 'Signing in…';

  auth.signInWithPopup(googleProvider)
    .catch(err => {
      console.error('Auth error:', err);
      const errEl = el('login-error');
      errEl.textContent = err.code === 'auth/popup-blocked'
        ? 'Popup was blocked. Please allow popups for this site.'
        : 'Sign-in failed. Please try again.';
      btn.disabled    = false;
      btn.innerHTML   = `<svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Continue with Google`;
    });
}

function handleSignOut() {
  closeUserMenu();
  auth.signOut().then(() => {
    // Clear state
    transactions = [];
    dailyBudget  = 0;
    goals        = { inGoal: 0, outGoal: 0, saveGoal: 0 };
    habits       = [];
    currentUser  = null;
  });
}

/* Auth state listener — this is the app's main entry point */
auth.onAuthStateChanged(async user => {
  if (user) {
    currentUser = user;
    showLoadingScreen();
    await loadFromCloud();
    hideLoadingScreen();
    updateUserUI(user);
    initApp();
    showAppShell();
  } else {
    currentUser = null;
    showLoginScreen();
  }
});

/* ── SCREEN HELPERS ────────────────────────────────────── */
function showLoginScreen() {
  el('login-screen').style.display  = 'flex';
  el('loading-screen').style.display = 'none';
  el('app-shell').style.display     = 'none';
  // Reset sign-in button
  const btn = el('google-signin-btn');
  if (btn) {
    btn.disabled  = false;
    btn.innerHTML = `<svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Continue with Google`;
  }
  const errEl = el('login-error');
  if (errEl) errEl.textContent = '';
}

function showLoadingScreen() {
  el('login-screen').style.display  = 'none';
  el('loading-screen').style.display = 'flex';
  el('app-shell').style.display     = 'none';
}

function hideLoadingScreen() {
  el('loading-screen').style.display = 'none';
}

function showAppShell() {
  el('login-screen').style.display  = 'none';
  el('loading-screen').style.display = 'none';
  el('app-shell').style.display     = 'flex';
}

/* ── USER UI ───────────────────────────────────────────── */
function updateUserUI(user) {
  const photo    = el('user-photo');
  const initials = el('user-initials');
  const name     = user.displayName || 'User';
  const email    = user.email || '';

  if (user.photoURL) {
    photo.src              = user.photoURL;
    photo.style.display    = 'block';
    initials.style.display = 'none';
  } else {
    photo.style.display    = 'none';
    initials.textContent   = name.charAt(0).toUpperCase();
    initials.style.display = 'block';
  }

  el('user-menu-name').textContent  = name;
  el('user-menu-email').textContent = email;
}

function toggleUserMenu() {
  const menu     = el('user-menu');
  const backdrop = el('user-menu-backdrop');
  const isOpen   = menu.style.display !== 'none';
  if (isOpen) {
    closeUserMenu();
  } else {
    menu.style.display     = 'block';
    backdrop.style.display = 'block';
  }
}

function closeUserMenu() {
  el('user-menu').style.display     = 'none';
  el('user-menu-backdrop').style.display = 'none';
}

/* ══════════════════════════════════════════════════════════
   CLOUD STORAGE (FIRESTORE)
   ═══════════════════════════════════════════════════════ */

function getUserRef() {
  return db.collection('users').doc(currentUser.uid);
}

async function loadFromCloud() {
  try {
    const doc = await getUserRef().get();
    if (doc.exists) {
      const data   = doc.data();
      transactions = data.transactions || [];
      dailyBudget  = data.dailyBudget  || 0;
      goals        = data.goals        || { inGoal: 0, outGoal: 0, saveGoal: 0 };
      habits       = data.habits       || defaultHabits();
    } else {
      // Brand-new user
      resetState();
    }
    // Mirror to localStorage as a local cache
    cacheLocally();
  } catch (err) {
    console.error('Cloud load failed, using local cache:', err);
    loadFromLocalCache();
  }
}

/* Debounced save — batches rapid changes into one write */
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistToCloud, 1200);
}

async function persistToCloud() {
  if (!currentUser) return;
  try {
    await getUserRef().set({
      transactions,
      dailyBudget,
      goals,
      habits,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    cacheLocally();
  } catch (err) {
    console.error('Cloud save failed, saved locally:', err);
    cacheLocally();
    toast('⚠️ Saved locally — check internet connection', 'amber');
  }
}

/* Local cache (localStorage) as offline fallback */
function cacheLocally() {
  try {
    localStorage.setItem('ct_transactions', JSON.stringify(transactions));
    localStorage.setItem('ct_daily_budget', JSON.stringify(dailyBudget));
    localStorage.setItem('ct_goals',        JSON.stringify(goals));
    localStorage.setItem('ct_habits',       JSON.stringify(habits));
  } catch (e) { /* quota exceeded — ignore */ }
}

function loadFromLocalCache() {
  try {
    transactions = JSON.parse(localStorage.getItem('ct_transactions')) || [];
    dailyBudget  = JSON.parse(localStorage.getItem('ct_daily_budget')) || 0;
    goals        = JSON.parse(localStorage.getItem('ct_goals'))        || { inGoal: 0, outGoal: 0, saveGoal: 0 };
    habits       = JSON.parse(localStorage.getItem('ct_habits'))       || defaultHabits();
  } catch (e) {
    resetState();
  }
}

function resetState() {
  transactions = [];
  dailyBudget  = 0;
  goals        = { inGoal: 0, outGoal: 0, saveGoal: 0 };
  habits       = defaultHabits();
}

/* Save wrappers — all call scheduleSave() now */
function saveTxs()    { scheduleSave(); }
function saveBudget() { scheduleSave(); }
function saveGoalsFn(){ scheduleSave(); }
function saveHabits() { scheduleSave(); }

/* ══════════════════════════════════════════════════════════
   DEFAULT HABITS
   ═══════════════════════════════════════════════════════ */
function defaultHabits() {
  return [
    { id: 1, icon: '📝', name: 'Log every transaction',         streak: 0, lastDone: '' },
    { id: 2, icon: '🚫', name: 'No impulse purchases',          streak: 0, lastDone: '' },
    { id: 3, icon: '💰', name: 'Review my balance daily',       streak: 0, lastDone: '' },
    { id: 4, icon: '🥗', name: 'Cook at home (save food money)', streak: 0, lastDone: '' },
  ];
}

/* ══════════════════════════════════════════════════════════
   PAGE NAVIGATION
   ═══════════════════════════════════════════════════════ */
function showPage(name, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  el('page-' + name).classList.add('active');
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');

  if (name === 'spent')  renderSpent();
  if (name === 'hist')   renderHist();
  if (name === 'goals')  { renderGoalProgress(); renderHabits(); }
}

/* ══════════════════════════════════════════════════════════
   TRANSACTIONS
   ═══════════════════════════════════════════════════════ */
function addTx(dir) {
  if (dir === 'in') {
    const amt  = parseFloat(el('in-amt').value);
    const desc = el('in-desc').value.trim();
    const date = el('in-date').value || todayStr();
    if (!amt || amt <= 0) { toast('Enter a valid amount', 'red'); return; }
    if (!desc)            { toast('Add a description', 'red'); return; }
    transactions.unshift({ id: Date.now(), dir: 'in', amt, desc, date, cat: 'Income' });
    el('in-amt').value  = '';
    el('in-desc').value = '';
    toast('✓ Money in recorded', 'green');
  } else {
    const amt  = parseFloat(el('out-amt').value);
    const desc = el('out-desc').value.trim();
    const date = el('out-date').value || todayStr();
    const cat  = el('out-cat').value;
    if (!amt || amt <= 0) { toast('Enter a valid amount', 'red'); return; }
    if (!desc)            { toast('Describe what you bought', 'red'); return; }
    transactions.unshift({ id: Date.now(), dir: 'out', amt, desc, date, cat });
    el('out-amt').value  = '';
    el('out-desc').value = '';
    toast('✓ Expense recorded', 'green');
  }

  saveTxs();
  renderDash();
  renderLog();
}

function deleteTx(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveTxs();
  renderDash();
  renderLog();
  renderHist();
  renderSpent();
  toast('Transaction deleted');
}

/* ══════════════════════════════════════════════════════════
   DAILY BUDGET
   ═══════════════════════════════════════════════════════ */
function saveDailyBudget() {
  const v = parseFloat(el('daily-budget-inp').value);
  if (!v || v <= 0) { toast('Enter a valid budget amount', 'red'); return; }
  dailyBudget = v;
  saveBudget();
  renderDash();
  toast('Daily budget saved!', 'green');
}

/* ══════════════════════════════════════════════════════════
   GOALS
   ═══════════════════════════════════════════════════════ */
function saveGoals() {
  goals.inGoal   = parseFloat(el('goal-in').value)   || 0;
  goals.outGoal  = parseFloat(el('goal-out').value)  || 0;
  goals.saveGoal = parseFloat(el('goal-save').value) || 0;
  saveGoalsFn();
  renderDash();
  renderGoalProgress();
  toast('Goals saved!', 'green');
}

/* ══════════════════════════════════════════════════════════
   HABITS
   ═══════════════════════════════════════════════════════ */
function addHabit() {
  const name = el('habit-name').value.trim();
  const icon = el('habit-icon').value.trim() || '⭐';
  if (!name) { toast('Enter a habit name', 'red'); return; }
  habits.push({ id: Date.now(), icon, name, streak: 0, lastDone: '' });
  el('habit-name').value = '';
  el('habit-icon').value = '';
  saveHabits();
  renderHabits();
  toast('Habit added!', 'green');
}

function toggleHabit(id) {
  const h = habits.find(x => x.id === id);
  if (!h) return;
  const t  = todayStr();
  const yd = dateOffset(1);
  if (h.lastDone === t) {
    h.streak   = Math.max(0, h.streak - 1);
    h.lastDone = yd;
  } else {
    h.streak   = h.lastDone === yd ? h.streak + 1 : 1;
    h.lastDone = t;
  }
  saveHabits();
  renderHabits();
}

function deleteHabit(id) {
  habits = habits.filter(h => h.id !== id);
  saveHabits();
  renderHabits();
  toast('Habit removed');
}

/* ══════════════════════════════════════════════════════════
   RENDER: DASHBOARD
   ═══════════════════════════════════════════════════════ */
function renderDash() {
  const today     = todayStr();
  const [m0, m1]  = getMonthRange();

  const allIn  = transactions.filter(t => t.dir === 'in').reduce((s,t) => s + t.amt, 0);
  const allOut = transactions.filter(t => t.dir === 'out').reduce((s,t) => s + t.amt, 0);
  const bal    = allIn - allOut;

  const mIn  = transactions.filter(t => t.dir === 'in'  && t.date >= m0 && t.date <= m1).reduce((s,t) => s+t.amt, 0);
  const mOut = transactions.filter(t => t.dir === 'out' && t.date >= m0 && t.date <= m1).reduce((s,t) => s+t.amt, 0);
  const tOut = transactions.filter(t => t.dir === 'out' && t.date === today).reduce((s,t) => s+t.amt, 0);

  const hb = el('header-balance');
  hb.textContent = fmt(bal);
  hb.className   = 'header-bal-num' + (bal < 0 ? ' neg' : '');

  const db_ = el('dash-balance');
  db_.textContent = fmt(bal);
  db_.className   = 'balance-amount' + (bal > 0 ? '' : bal < 0 ? ' neg' : ' zero');
  el('dash-balance-sub').textContent = transactions.length
    ? `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} tracked`
    : 'Log your first transaction below';

  el('dash-total-in').textContent  = fmt(allIn);
  el('dash-total-out').textContent = fmt(allOut);
  el('dash-month-in').textContent  = fmt(mIn);
  el('dash-month-out').textContent = fmt(mOut);

  renderBudgetRing(tOut);
  renderWeekBars();
  renderDashGoals(mIn, mOut, bal);
  renderInsights(tOut, mIn, mOut, bal);
}

function renderBudgetRing(todaySpent) {
  el('ring-spent').textContent = fmt(todaySpent);

  if (dailyBudget > 0) {
    const pct    = Math.min(todaySpent / dailyBudget, 1);
    const colour = pct >= 1 ? '#ff5252' : pct >= 0.8 ? '#ffab40' : '#00e676';
    el('ring-progress').setAttribute('stroke-dasharray', `${pct * CIRC} ${CIRC}`);
    el('ring-progress').setAttribute('stroke', colour);

    const pctNum = Math.round(pct * 100);
    el('ring-pct').textContent = pctNum + '%';
    el('ring-pct').style.color = colour;

    const rem    = dailyBudget - todaySpent;
    const remain = el('ring-remain');
    if (rem < 0) {
      remain.textContent = fmt(Math.abs(rem)) + ' over budget!';
      remain.className   = 'ring-info-remain over';
    } else if (pct >= 0.8) {
      remain.textContent = fmt(rem) + ' remaining — be careful';
      remain.className   = 'ring-info-remain warn';
    } else {
      remain.textContent = fmt(rem) + ' remaining';
      remain.className   = 'ring-info-remain ok';
    }
    el('ring-budget-label').textContent = 'Budget: ' + fmt(dailyBudget);
  } else {
    el('ring-progress').setAttribute('stroke-dasharray', '0 239');
    el('ring-pct').textContent      = '–';
    el('ring-pct').style.color      = '';
    el('ring-remain').textContent   = 'Set a daily budget below';
    el('ring-remain').className     = 'ring-info-remain';
    el('ring-budget-label').textContent = '';
  }
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
    gc.innerHTML = '<p style="font-size:12px;color:var(--text3)">Set monthly goals in the Goals tab →</p>';
    return;
  }
  let html = '';
  if (goals.inGoal)  html += buildProgBar('Monthly Income',   mIn,  goals.inGoal,  false);
  if (goals.outGoal) html += buildProgBar('Monthly Spending',  mOut, goals.outGoal, true);
  gc.innerHTML = html;
}

function buildProgBar(label, current, goal, invert) {
  const pct   = Math.min(current / goal, 1);
  const pctW  = Math.round(pct * 100);
  const over  = invert ? pct >= 1 : false;
  const warn  = invert ? (pct >= 0.8 && pct < 1) : (pct >= 0.5 && pct < 1);
  const ok    = invert ? pct < 0.8 : pct >= 1;
  const cls   = over ? 'red' : warn ? 'amber' : ok ? 'green' : 'blue';
  const note  = over
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
  const icon   = t.dir === 'in' ? '💵' : (CAT_ICONS[t.cat] || '💸');
  const delBtn = showDel
    ? `<button class="tx-del" onclick="deleteTx(${t.id})" aria-label="Delete transaction">🗑️</button>`
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
  const from    = el('sp-from').value || getMonthRange()[0];
  const to      = el('sp-to').value   || getMonthRange()[1];

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
        <div class="tx-item out" style="margin-bottom:6px">
          <div class="tx-icon out">${CAT_ICONS[t.cat]||'📦'}</div>
          <div class="tx-body">
            <div class="tx-desc">${escHtml(t.desc)}</div>
            <div class="tx-meta">${t.date}</div>
          </div>
          <div class="tx-amount out">${fmt(t.amt)}</div>
          <button class="tx-del" onclick="deleteTx(${t.id});drillCategory('');renderSpent();" aria-label="Delete">🗑️</button>
        </div>`).join('')
    : '<p style="font-size:13px;color:var(--text3);text-align:center;padding:12px">No items found</p>';

  drillEl.classList.add('open');
}

/* ══════════════════════════════════════════════════════════
   RENDER: HISTORY TAB
   ═══════════════════════════════════════════════════════ */
function renderHist() {
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
  const [m0, m1] = getMonthRange();
  const mIn   = transactions.filter(t => t.dir === 'in'  && t.date >= m0 && t.date <= m1).reduce((s,t) => s+t.amt, 0);
  const mOut  = transactions.filter(t => t.dir === 'out' && t.date >= m0 && t.date <= m1).reduce((s,t) => s+t.amt, 0);
  const saved = transactions.filter(t => t.cat === 'Savings').reduce((s,t) => s+t.amt, 0);

  function renderProg(elId, cur, goal, invert) {
    const progEl = el(elId);
    if (!goal) { progEl.innerHTML = ''; return; }
    progEl.innerHTML = buildProgBar('Progress', cur, goal, invert);
  }
  renderProg('goal-in-progress',   mIn,  goals.inGoal,   false);
  renderProg('goal-out-progress',  mOut, goals.outGoal,  true);
  renderProg('goal-save-progress', saved, goals.saveGoal, false);
}

function renderHabits() {
  const listEl = el('habits-list');
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
          <span class="habit-streak-num">${h.streak}</span>
          <span class="habit-streak-label">streak</span>
        </div>
        <button class="habit-check ${done ? 'done' : ''}"
          onclick="toggleHabit(${h.id})"
          aria-label="${done ? 'Mark incomplete' : 'Mark done for today'}">
          ${done ? '✓' : ''}
        </button>
        <button class="habit-del" onclick="deleteHabit(${h.id})" aria-label="Delete habit">🗑️</button>
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
  el('install-banner').style.display = 'flex';
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
   INIT (called after login + data load)
   ═══════════════════════════════════════════════════════ */
function initApp() {
  const today    = todayStr();
  const [m0, m1] = getMonthRange();

  el('header-date').textContent = todayLabel();

  ['in-date', 'out-date'].forEach(id => {
    const input = el(id);
    if (input && !input.value) input.value = today;
  });

  const spFrom = el('sp-from'), spTo = el('sp-to');
  if (spFrom && !spFrom.value) { spFrom.value = m0; spTo.value = m1; }

  const hFrom = el('h-from'), hTo = el('h-to');
  if (hFrom && !hFrom.value) { hFrom.value = m0; hTo.value = today; }

  if (goals.inGoal)   el('goal-in').value   = goals.inGoal;
  if (goals.outGoal)  el('goal-out').value  = goals.outGoal;
  if (goals.saveGoal) el('goal-save').value = goals.saveGoal;
  if (dailyBudget)    el('daily-budget-inp').value = dailyBudget;

  renderDash();
  renderLog();
}