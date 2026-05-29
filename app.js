'use strict';

/* ═══════════════════════════════════════
   SCREEN SWITCHING
═══════════════════════════════════════ */
function show(id, displayVal) { const e = document.getElementById(id); if (e) e.style.setProperty('display', displayVal, 'important'); }
function showApp()     { show('loading-screen','none'); show('login-screen','none'); show('app-shell','flex'); }
function showLogin()   { show('loading-screen','none'); show('app-shell','none'); show('login-screen','flex'); }
function showLoading() { show('login-screen','none'); show('app-shell','none'); show('loading-screen','flex'); }
showLoading();
const authTimeout = setTimeout(() => { console.warn('CoinTrack: auth timeout'); showLogin(); }, 8000);

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */
const el       = id  => document.getElementById(id);
const fmt      = num => 'KSh ' + Number(num).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const escHtml  = s   => String(s).replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t] || t));

function todayStr()  { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function dateOffset(n) { const d = new Date(); d.setDate(d.getDate()-n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function getMonthRange() { const d = new Date(), m = String(d.getMonth()+1).padStart(2,'0'); return [`${d.getFullYear()}-${m}-01`, `${d.getFullYear()}-${m}-31`]; }
function todayLabel() { return new Date().toLocaleDateString(undefined, { weekday:'long', month:'short', day:'numeric' }); }
function daysInCurrentMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth()+1, 0).getDate(); }
function showToast(msg, type = 'green') { const t = el('toast'); if (!t) return; t.textContent = msg; t.className = `toast show ${type}`; setTimeout(() => { t.className = 'toast'; }, 3000); }

/* ═══════════════════════════════════════
   APP STATE  (shared globals)
═══════════════════════════════════════ */
let currentUser     = null;
let transactions    = [];
let goals           = { inGoal: 0, outGoal: 0, saveGoal: 0 };
let habits          = [];
let budgetGoals     = [];
let dailyBudget     = 0;
let histFilter      = 'all';
let openDrillCat    = null;
let modalDir        = 'in';
let modalTargetDate = '';
let newBgoalType    = 'monthly';

const CAT_ICONS = { Food:'🍔', Transport:'🚗', Housing:'🏠', Bills:'🧾', Shopping:'🛍️', Entertainment:'🎬', Health:'💊', Savings:'💰', Airtime:'📱', Education:'📚', Clothing:'👗', Other:'📦' };

const BGOAL_TYPE_HINTS = {
  monthly: 'Monthly goals (food, gym, transport etc.) feed your daily budget ring. Budget resets at the start of each month.',
  fixed:   "Fixed expenses (rent, insurance, subscriptions) come off your balance but are ring-exempt — they don't count against your daily budget. Resets each month.",
  project: 'Project goals (phone, holiday, emergency fund) track all-time spending toward a target. Ring-exempt. Carries forward every month until you reach the target.'
};
const BGOAL_BUDGET_LABELS = {
  monthly: 'Monthly budget (KSh)',
  fixed:   'Monthly cost (KSh)',
  project: 'Total target amount (KSh)'
};

/* ── Helpers ── */
function goalType(g) { return g.goalType || 'monthly'; }

function getEffectiveDailyBudget() {
  if (dailyBudget > 0) return { amount: dailyBudget, source: 'manual' };
  const monthlySum = budgetGoals.filter(g => goalType(g) === 'monthly').reduce((s, g) => s + g.budget, 0);
  if (monthlySum > 0) return { amount: monthlySum / daysInCurrentMonth(), source: 'goals' };
  if (goals.outGoal > 0) return { amount: goals.outGoal / daysInCurrentMonth(), source: 'monthly' };
  return { amount: 0, source: 'none' };
}

function getRingSpending(dateStr) {
  return transactions.filter(t => {
    if (t.dir !== 'out' || t.date !== dateStr) return false;
    if (!t.goalId) return true;
    const g = budgetGoals.find(g => g.id === t.goalId);
    if (!g) return true;
    return goalType(g) === 'monthly';
  }).reduce((s, t) => s + t.amt, 0);
}

function calcGoalSpent(goalId) {
  const g = budgetGoals.find(g => g.id === goalId);
  if (g && goalType(g) === 'project') {
    return transactions.filter(t => t.dir === 'out' && t.goalId === goalId).reduce((s, t) => s + t.amt, 0);
  }
  const [m0, m1] = getMonthRange();
  return transactions.filter(t => t.dir === 'out' && t.goalId === goalId && t.date >= m0 && t.date <= m1).reduce((s, t) => s + t.amt, 0);
}

function goalStatus(spent, budget) {
  if (spent >= budget)     return { label: '✅ Completed',    cls: 'completed' };
  if (spent >= budget*0.8) return { label: '⚠️ Almost full', cls: 'warn' };
  return                          { label: '🟢 On track',    cls: 'ok' };
}
function projectGoalStatus(spent, target) {
  if (spent >= target)     return { label: '✅ Reached!',         cls: 'completed' };
  if (spent >= target*0.8) return { label: '🔥 Almost there',    cls: 'warn' };
  return                          { label: `${Math.round(spent/target*100)}% to goal`, cls: 'ok' };
}

/* ── Shared tx item HTML ── */
function txItemHTML(t, showDel = false) {
  const icon = t.dir === 'in' ? '💵' : (CAT_ICONS[t.cat] || '📦');
  const delBtn = showDel ? `<button class="tx-del" onclick="deleteTx('${t.id}')">🗑️</button>` : '';
  const linkedGoal = t.goalId ? budgetGoals.find(g => g.id === t.goalId) : null;
  const goalPill   = linkedGoal ? `<span class="tx-cat-pill" style="background:rgba(52,199,89,.15);color:#34c759">${linkedGoal.icon} ${escHtml(linkedGoal.name)}</span>` : '';
  return `<div class="tx-item ${t.dir}"><div class="tx-icon ${t.dir}">${icon}</div><div class="tx-body"><div class="tx-desc">${escHtml(t.desc)}</div><div class="tx-meta">${t.date}<span class="tx-cat-pill">${t.cat||'Income'}</span>${goalPill}</div></div><div class="tx-amount ${t.dir}">${t.dir==='in'?'+':'-'}${fmt(t.amt)}</div>${delBtn}</div>`;
}

/* ── Goal selectors (shared) ── */
function updateGoalSelectors() {
  const monthly = budgetGoals.filter(g => goalType(g) === 'monthly');
  const fixed   = budgetGoals.filter(g => goalType(g) === 'fixed');
  const project = budgetGoals.filter(g => goalType(g) === 'project');
  let opts = '<option value="">— No specific goal —</option>';
  if (monthly.length) opts += `<optgroup label="📅 Monthly Goals">${monthly.map(g=>`<option value="${g.id}">${g.icon} ${escHtml(g.name)} (${fmt(g.budget)}/mo)</option>`).join('')}</optgroup>`;
  if (fixed.length)   opts += `<optgroup label="🔒 Fixed Goals">${fixed.map(g=>`<option value="${g.id}">${g.icon} ${escHtml(g.name)} (${fmt(g.budget)})</option>`).join('')}</optgroup>`;
  if (project.length) opts += `<optgroup label="💰 Project Goals">${project.map(g=>`<option value="${g.id}">${g.icon} ${escHtml(g.name)} — target ${fmt(g.budget)}</option>`).join('')}</optgroup>`;
  if (!budgetGoals.length) opts = '<option value="">— No goals set yet —</option>';
  const osel = el('out-goal'); if (osel) osel.innerHTML = opts;
  const orow = el('out-goal-row'); if (orow) orow.style.display = budgetGoals.length > 0 ? 'block' : 'none';
  const msel = el('modal-goal'); if (msel) msel.innerHTML = opts;
}

/* ═══════════════════════════════════════
   FIREBASE
═══════════════════════════════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyCW6G3J3lBx64xb-wekpDcCSvTpqzVgsjI",
  authDomain: "cointrack4.firebaseapp.com",
  databaseURL: "https://cointrack4-default-rtdb.firebaseio.com",
  projectId: "cointrack4",
  storageBucket: "cointrack4.firebasestorage.app",
  messagingSenderId: "33912410283",
  appId: "1:33912410283:web:019eb03985bdbe2ad167ee"
};
firebase.initializeApp(firebaseConfig);
const db   = firebase.firestore();
const auth = firebase.auth();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(console.warn);
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (!isMobile) { db.enablePersistence({ synchronizeTabs: true }).catch(e => console.warn('Persistence:', e.code)); }

/* ═══════════════════════════════════════
   AUTH
═══════════════════════════════════════ */
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  el('login-error').textContent = '';
  const btn = el('google-signin-btn'); btn.disabled = true;
  btn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid #333;border-top-color:#000;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:8px"></span>Signing in…';
  auth.signInWithPopup(provider).catch(err => {
    btn.disabled = false; btn.innerHTML = googleBtnHTML();
    if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user')
      el('login-error').textContent = err.message || 'Sign in failed. Please try again.';
  });
}
function googleBtnHTML() {
  return `<svg class="google-icon" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Continue with Google`;
}
function handleSignOut() { closeUserMenu(); auth.signOut(); }

auth.onAuthStateChanged(user => {
  clearTimeout(authTimeout);
  if (user) {
    currentUser = user; setupUserUI(user); showApp(); initApp();
    listenToTransactions(); listenToSettings(); listenToHabits(); listenToBudgetGoals();
  } else {
    currentUser = null; showLogin();
    const btn = el('google-signin-btn'); if (btn) { btn.disabled = false; btn.innerHTML = googleBtnHTML(); }
  }
});

function setupUserUI(user) {
  if (el('user-menu-name'))  el('user-menu-name').textContent  = user.displayName || 'User';
  if (el('user-menu-email')) el('user-menu-email').textContent = user.email || '';
  if (user.photoURL) { const img = el('user-photo'); if (img) { img.src = user.photoURL; img.style.display = 'block'; el('user-initials').style.display = 'none'; } }
  else { const ini = (user.displayName || user.email || 'U').charAt(0).toUpperCase(); if (el('user-initials')) el('user-initials').textContent = ini; }
}
function toggleUserMenu() { const m = el('user-menu'), b = el('user-menu-backdrop'), open = m.style.display !== 'none'; m.style.display = open ? 'none' : 'block'; b.style.display = open ? 'none' : 'block'; }
function closeUserMenu()  { el('user-menu').style.display = 'none'; el('user-menu-backdrop').style.display = 'none'; }

/* ═══════════════════════════════════════
   FIRESTORE LISTENERS
═══════════════════════════════════════ */
function listenToTransactions() {
  db.collection(`users/${currentUser.uid}/transactions`).orderBy('date', 'desc').onSnapshot(snap => {
    transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDash(); renderLog(); renderSpent(); renderHist(); renderGoalProgress(); renderBudgetGoals();
  });
}
function listenToSettings() {
  db.doc(`users/${currentUser.uid}/settings/config`).onSnapshot(snap => {
    if (snap.exists) { const data = snap.data(); goals = data.goals || { inGoal:0,outGoal:0,saveGoal:0 }; dailyBudget = data.dailyBudget || 0; }
    if (goals.inGoal    && el('goal-in'))          el('goal-in').value          = goals.inGoal;
    if (goals.outGoal   && el('goal-out'))          el('goal-out').value         = goals.outGoal;
    if (goals.saveGoal  && el('goal-save'))         el('goal-save').value        = goals.saveGoal;
    if (dailyBudget     && el('daily-budget-inp'))  el('daily-budget-inp').value = dailyBudget;
    renderDash(); renderGoalProgress();
  });
}
function listenToHabits() {
  db.collection(`users/${currentUser.uid}/habits`).onSnapshot(snap => {
    habits = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderHabits();
  });
}
function listenToBudgetGoals() {
  db.collection(`users/${currentUser.uid}/budgetGoals`).orderBy('createdAt', 'asc').onSnapshot(snap => {
    budgetGoals = snap.docs.map(d => ({ id: d.id, goalType: 'monthly', ...d.data() }));
    renderBudgetGoals(); renderDashBudgetGoals(); updateGoalSelectors(); renderDash();
  });
}

/* ═══════════════════════════════════════
   MUTATIONS
═══════════════════════════════════════ */
async function addTx(dir) {
  if (!currentUser) return;
  const amtEl  = el(dir==='in' ? 'in-amt'  : 'out-amt');
  const descEl = el(dir==='in' ? 'in-desc' : 'out-desc');
  const dateEl = el(dir==='in' ? 'in-date' : 'out-date');
  const catEl  = el('out-cat');
  const amt = parseFloat(amtEl.value), desc = descEl.value.trim(), date = dateEl.value || todayStr();
  if (!amt || amt <= 0) { showToast('Enter a valid amount', 'amber'); return; }
  if (!desc) { showToast('Add a description', 'amber'); return; }
  const tx = { dir, amt, desc, date, cat: dir==='in' ? 'Income' : (catEl ? catEl.value : 'Other') };
  if (dir === 'out') { const gs = el('out-goal'); if (gs && gs.value) tx.goalId = gs.value; }
  try {
    await db.collection(`users/${currentUser.uid}/transactions`).add(tx);
    amtEl.value = ''; descEl.value = '';
    if (dir === 'out' && el('out-goal')) el('out-goal').value = '';
    showToast(dir==='in' ? '💵 Income recorded!' : '➖ Expense recorded!');
    showPage('dash', document.querySelector('.nav-btn'));
  } catch(e) { showToast('Error saving: ' + e.message, 'red'); }
}

async function deleteTx(firebaseId) {
  if (!currentUser) return;
  try { await db.doc(`users/${currentUser.uid}/transactions/${firebaseId}`).delete(); showToast('Deleted', 'amber'); drillCategory(''); }
  catch(e) { showToast('Error deleting', 'red'); }
}

async function saveDailyBudget() {
  if (!currentUser) return;
  const raw = el('daily-budget-inp').value;
  if (!raw || parseFloat(raw) <= 0) {
    dailyBudget = 0;
    await db.doc(`users/${currentUser.uid}/settings/config`).set({ dailyBudget: 0 }, { merge: true });
    showToast('Override cleared — using monthly goals ÷ 30'); renderDash(); return;
  }
  dailyBudget = parseFloat(raw);
  await db.doc(`users/${currentUser.uid}/settings/config`).set({ dailyBudget }, { merge: true });
  showToast('Daily budget override saved ✓'); renderDash();
}

async function saveGoals() {
  if (!currentUser) return;
  goals = { inGoal: parseFloat(el('goal-in').value)||0, outGoal: parseFloat(el('goal-out').value)||0, saveGoal: parseFloat(el('goal-save').value)||0 };
  await db.doc(`users/${currentUser.uid}/settings/config`).set({ goals }, { merge: true });
  showToast('Goals saved ✓'); renderGoalProgress(); renderDash();
}

/* ═══════════════════════════════════════
   DAY MODAL
═══════════════════════════════════════ */
function openDayModal(dateStr) {
  modalTargetDate = dateStr; modalDir = 'in';
  el('modal-amt').value = ''; el('modal-desc').value = ''; el('modal-cat').value = 'Food';
  el('modal-cat-group').style.display = 'none';
  if (el('modal-goal-group')) el('modal-goal-group').style.display = 'none';
  el('modal-tab-in').className = 'modal-tab active-in'; el('modal-tab-out').className = 'modal-tab'; el('modal-save-btn').className = 'modal-save';
  const d = new Date(dateStr + 'T00:00:00');
  el('modal-date-badge').textContent = '📅 ' + d.toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  el('day-modal').style.display = 'block'; document.body.style.overflow = 'hidden';
  setTimeout(() => el('modal-amt').focus(), 300);
}
function closeDayModal(e) {
  if (e && e.target !== e.currentTarget) return;
  el('day-modal').style.display = 'none'; document.body.style.overflow = '';
}
function setModalDir(dir) {
  modalDir = dir;
  el('modal-tab-in').className  = 'modal-tab' + (dir==='in'  ? ' active-in'  : '');
  el('modal-tab-out').className = 'modal-tab' + (dir==='out' ? ' active-out' : '');
  el('modal-cat-group').style.display = dir === 'out' ? 'block' : 'none';
  el('modal-save-btn').className = 'modal-save' + (dir==='out' ? ' modal-save-out' : '');
  const mg = el('modal-goal-group'); if (mg) mg.style.display = (dir==='out' && budgetGoals.length > 0) ? 'block' : 'none';
}
async function saveModalTx() {
  if (!currentUser) return;
  const amt = parseFloat(el('modal-amt').value), desc = el('modal-desc').value.trim();
  if (!amt || amt <= 0) { showToast('Enter a valid amount', 'amber'); return; }
  if (!desc) { showToast('Add a description', 'amber'); return; }
  const cat = modalDir === 'in' ? 'Income' : el('modal-cat').value;
  const tx = { dir: modalDir, amt, desc, date: modalTargetDate, cat };
  if (modalDir === 'out') { const mg = el('modal-goal'); if (mg && mg.value) tx.goalId = mg.value; }
  try {
    await db.collection(`users/${currentUser.uid}/transactions`).add(tx);
    el('day-modal').style.display = 'none'; document.body.style.overflow = '';
    showToast(modalDir==='in' ? '💵 Income added to ' + modalTargetDate : '➖ Expense added to ' + modalTargetDate);
  } catch(e) { showToast('Error saving: ' + e.message, 'red'); }
}

/* ═══════════════════════════════════════
   NAV
═══════════════════════════════════════ */
function showPage(name, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const page = el(`page-${name}`); if (page) page.classList.add('active');
  if (btn) btn.classList.add('active');
  if (name === 'spent') renderSpent();
  if (name === 'hist')  renderHist();
  if (name === 'goals') { renderGoalProgress(); renderHabits(); renderBudgetGoals(); }
}

/* ═══════════════════════════════════════
   PWA
═══════════════════════════════════════ */
let deferredInstall;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstall = e;
  const banner = el('install-banner'); if (banner) banner.style.setProperty('display', 'flex', 'important');
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
function initApp() {
  const today = todayStr(), [m0, m1] = getMonthRange();
  if (el('header-date')) el('header-date').textContent = todayLabel();
  ['in-date', 'out-date'].forEach(id => { const inp = el(id); if (inp && !inp.value) inp.value = today; });
  const sf = el('sp-from'), st = el('sp-to'); if (sf && !sf.value) { sf.value = m0; st.value = m1; }
  const hf = el('h-from'),  ht = el('h-to');  if (hf && !hf.value) { hf.value = today; ht.value = today; }
  setBgoalType('monthly');
  const installBtn = el('install-btn');
  if (installBtn) installBtn.addEventListener('click', () => {
    if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.then(c => { if (c.outcome==='accepted') el('install-banner').style.display = 'none'; }); }
  });
}