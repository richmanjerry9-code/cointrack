

(function(){
const css = `
/* ── RESET & BASE ─────────────────────────────────── */
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%;font-family:'DM Sans',system-ui,-apple-system,sans-serif;background:#050505;color:#f8fafc;overflow-x:hidden;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
input,select,button,textarea{font-family:'DM Sans',sans-serif}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(212,175,55,0.15);border-radius:10px}
button{cursor:pointer;outline:none}

/* ── PREMIUM VARIABLES (EXECUTIVE GOLD) ───────────── */
:root{
  --bg:#050505;
  --surface:rgba(20,20,22,0.75);
  --card:rgba(26,26,28,0.65);
  --card2:rgba(36,36,38,0.75);
  --border:rgba(255,255,255,0.05);
  --border2:rgba(255,255,255,0.12);
  --inner-highlight:inset 0 1px 0 rgba(255,255,255,0.03);
  --green:#d4af37;
  --green-dim:rgba(212,175,55,0.15);
  --red:#e11d48;
  --red-dim:rgba(225,29,72,0.15);
  --amber:#f59e0b;
  --amber-dim:rgba(245,158,11,0.15);
  --blue:#3b82f6;
  --blue-dim:rgba(59,130,246,0.15);
  --txt:#ffffff;
  --txt2:#a1a1aa;
  --txt3:#52525b;
  --r:20px;
  --rs:12px;
  --mono:'DM Mono',monospace;
  --glass-blur:blur(24px);
  --shadow-float:0 16px 40px rgba(0,0,0,0.8);
  --easing:cubic-bezier(0.16,1,0.3,1);
}

/* ── LOGIN ────────────────────────────────────────── */
#login-screen{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at 50% 0%,#151515 0%,var(--bg) 80%)}
.login-wrap{width:100%;max-width:380px;animation:fadeUp 0.8s var(--easing) both}
.login-logo{font-size:42px;font-weight:800;color:var(--txt);margin-bottom:12px;letter-spacing:-1.5px;background:linear-gradient(135deg,#fff,#a1a1aa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.login-logo span{color:var(--green);text-shadow:0 0 20px var(--green-dim);-webkit-text-fill-color:var(--green)}
.login-tagline{font-size:15px;color:var(--txt2);line-height:1.6;margin-bottom:32px;font-weight:500}
.login-features{background:var(--card);backdrop-filter:var(--glass-blur);border:1px solid var(--border);box-shadow:var(--inner-highlight),0 20px 40px rgba(0,0,0,0.6);border-radius:var(--r);padding:24px;margin-bottom:28px;display:flex;flex-direction:column;gap:16px}
.login-feat{display:flex;align-items:center;gap:12px;font-size:14px;color:var(--txt2);font-weight:600}
.google-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:12px;padding:16px 20px;background:#ffffff;color:#000000;border:none;border-radius:var(--rs);font-size:15px;font-weight:700;box-shadow:0 8px 20px rgba(255,255,255,0.1);transition:all 0.3s var(--easing)}
.google-btn:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(255,255,255,0.2)}
.google-btn:active{transform:scale(0.96)}
.google-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}
.google-icon{width:22px;height:22px;flex-shrink:0}
.login-error{font-size:13px;color:var(--red);min-height:16px;margin-top:12px;text-align:center;display:block;font-weight:600}
.login-privacy{font-size:12px;color:var(--txt3);line-height:1.6;text-align:center;margin-top:18px;font-weight:500}

/* ── LOADING ──────────────────────────────────────── */
#loading-screen{position:fixed;inset:0;z-index:9998;background:var(--bg);display:none;align-items:center;justify-content:center}
.loading-box{text-align:center}
.loading-logo{font-size:32px;font-weight:800;color:var(--txt);margin-bottom:24px;letter-spacing:-1px}
.loading-logo span{color:var(--green);text-shadow:0 0 15px var(--green-dim)}
.loading-spinner{width:48px;height:48px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 0.8s cubic-bezier(0.6,0.2,0.4,0.8) infinite;margin:0 auto 20px;box-shadow:0 0 20px var(--green-dim)}
.loading-text{font-size:13px;color:var(--txt2);font-weight:600;letter-spacing:1px;text-transform:uppercase}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── APP SHELL ────────────────────────────────────── */
.app-shell{display:none;flex-direction:column;height:100vh;max-width:480px;margin:0 auto;position:relative;overflow:hidden;background:radial-gradient(ellipse at top,#0c0c0e 0%,var(--bg) 100%)}
@media(min-width:480px){.app-shell{border-left:1px solid var(--border);border-right:1px solid var(--border);box-shadow:0 0 50px rgba(0,0,0,0.9)}}

/* ── HEADER ───────────────────────────────────────── */
.app-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:rgba(5,5,5,0.8);backdrop-filter:var(--glass-blur);border-bottom:1px solid var(--border);flex-shrink:0;z-index:90;position:sticky;top:0}
.header-left{display:flex;flex-direction:column;gap:2px}
.app-logo{font-size:20px;font-weight:800;color:var(--txt);letter-spacing:-0.5px}
.app-logo span{color:var(--green)}
.header-date{font-size:11px;color:var(--txt2);font-family:var(--mono);font-weight:600;letter-spacing:0.5px;text-transform:uppercase}
.header-right{display:flex;align-items:center;gap:14px}
.header-bal-container{text-align:right}
.header-bal-label{font-size:9px;color:var(--txt3);font-family:var(--mono);letter-spacing:1px;text-transform:uppercase}
.header-bal-num{font-size:16px;font-weight:700;color:var(--green);font-family:var(--mono);text-shadow:0 0 15px rgba(212,175,55,0.4)}
.header-bal-num.neg{color:var(--red);text-shadow:0 0 10px var(--red-dim)}
.user-avatar{width:40px;height:40px;border-radius:12px;background:var(--card);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;font-size:14px;font-weight:700;color:var(--txt2);flex-shrink:0;transition:transform 0.2s var(--easing)}
.user-avatar:hover{transform:scale(1.05);border-color:var(--green)}
.user-avatar img{width:100%;height:100%;object-fit:cover}

/* ── USER MENU ────────────────────────────────────── */
.user-menu{position:fixed;top:70px;right:20px;background:rgba(15,15,18,0.9);backdrop-filter:var(--glass-blur);border:1px solid var(--border);border-radius:var(--r);width:240px;z-index:300;box-shadow:var(--shadow-float),var(--inner-highlight);padding:16px;animation:fadeUp 0.3s var(--easing) both}
.user-menu-info{margin-bottom:14px}
.user-menu-name{font-size:15px;font-weight:800;color:var(--txt);margin-bottom:2px}
.user-menu-email{font-size:12px;color:var(--txt2);font-weight:500}
.user-menu-divider{height:1px;background:linear-gradient(to right,transparent,var(--border2),transparent);margin-bottom:14px}
.user-menu-btn{width:100%;padding:10px 14px;border:none;border-radius:10px;font-size:13px;font-weight:700;text-align:left;transition:all 0.2s}
.logout-btn{background:var(--red-dim);color:var(--red);box-shadow:inset 0 0 0 1px rgba(225,29,72,0.2)}
.logout-btn:hover{background:var(--red);color:#fff;box-shadow:0 4px 15px var(--red-dim)}
.user-menu-backdrop{position:fixed;inset:0;z-index:299;background:rgba(0,0,0,0.6);backdrop-filter:blur(3px)}
@media(min-width:480px){.user-menu{right:calc(50% - 220px)}}

/* ── INSTALL BANNER ───────────────────────────────── */
.install-banner{display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,var(--blue-dim),transparent);border:1px solid rgba(59,130,246,0.2);border-radius:var(--r);padding:14px;margin-bottom:16px;box-shadow:0 4px 20px rgba(59,130,246,0.05)}
.install-icon{font-size:24px;flex-shrink:0;filter:drop-shadow(0 0 8px var(--blue))}
.install-text{flex:1;font-size:12px;color:var(--txt2);line-height:1.5;font-weight:500}
.install-text strong{color:var(--txt);display:block;font-size:13px;font-weight:700;margin-bottom:2px}

/* ── PAGE CONTENT ─────────────────────────────────── */
.page-content{flex:1;overflow-y:auto;overflow-x:hidden;padding-bottom:100px;scroll-behavior:smooth}
.page{display:none;padding:16px 16px 0;animation:fadeUp 0.4s var(--easing) both}
.page.active{display:block}
@keyframes fadeUp{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}

/* ── CARDS ────────────────────────────────────────── */
.card{background:var(--card);backdrop-filter:var(--glass-blur);border:1px solid var(--border);box-shadow:var(--inner-highlight),0 8px 24px rgba(0,0,0,0.4);border-radius:var(--r);padding:20px;margin-bottom:16px;transition:transform 0.3s var(--easing),box-shadow 0.3s var(--easing)}
.card:hover{border-color:var(--border2);box-shadow:var(--inner-highlight),0 12px 30px rgba(0,0,0,0.5)}
.card-dark-border{border-color:var(--border2)}
.card-grey-border{border-color:var(--border2)}
.card-title{font-size:11px;font-weight:800;color:var(--txt2);letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;display:flex;align-items:center;gap:8px}

/* ── BALANCE HERO ─────────────────────────────────── */
.balance-hero{background:linear-gradient(145deg,rgba(30,30,30,0.8),rgba(10,10,10,0.9));backdrop-filter:var(--glass-blur);border:1px solid var(--border2);border-radius:24px;padding:24px;margin-bottom:16px;position:relative;overflow:hidden;box-shadow:var(--inner-highlight),0 15px 35px rgba(0,0,0,0.6)}
.balance-hero::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");opacity:0.04;mix-blend-mode:overlay;pointer-events:none}
.balance-hero::after{content:'';position:absolute;width:250px;height:250px;background:radial-gradient(circle,rgba(212,175,55,0.12) 0%,transparent 70%);top:-100px;right:-100px;pointer-events:none;filter:blur(30px)}
.balance-label{font-size:10px;font-weight:700;color:var(--txt2);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;position:relative;z-index:2}
.balance-amount{font-family:var(--mono);font-size:42px;font-weight:600;letter-spacing:-1.5px;margin-bottom:6px;line-height:1;background:linear-gradient(to bottom right,#fff,#ebd38a);-webkit-background-clip:text;-webkit-text-fill-color:transparent;position:relative;z-index:2}
.balance-amount.neg{background:linear-gradient(to bottom right,#ff8a9f,var(--red));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.balance-amount.zero{color:var(--txt3);-webkit-text-fill-color:var(--txt3)}
.balance-sub{font-size:13px;color:var(--txt2);margin-bottom:20px;font-weight:500;position:relative;z-index:2}
.balance-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;position:relative;z-index:2}
.bal-stat{background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.04);border-radius:12px;padding:12px 14px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.02)}
.bal-stat-l{font-size:9px;color:var(--txt3);font-family:var(--mono);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;font-weight:600}
.bal-stat-v{font-family:var(--mono);font-size:15px;font-weight:600;text-shadow:0 0 10px rgba(0,0,0,0.8)}
.bal-stat-v.g{color:var(--green)}.bal-stat-v.r{color:var(--red)}

/* ── ALL TIME DISCLOSURE ──────────────────────────── */
.alltime-disclosure{margin-top:14px;border-top:1px solid var(--border);padding-top:14px;position:relative;z-index:2}
.alltime-summary-trigger{list-style:none;font-size:12px;font-weight:700;color:var(--txt2);cursor:pointer;display:flex;align-items:center;justify-content:space-between;user-select:none;transition:color 0.2s}
.alltime-summary-trigger:hover{color:var(--txt)}
.alltime-summary-trigger::-webkit-details-marker{display:none}
.alltime-summary-trigger::after{content:'+';font-family:var(--mono);font-size:16px;transition:transform 0.3s var(--easing);font-weight:400}
.alltime-disclosure[open] .alltime-summary-trigger::after{transform:rotate(45deg)}
.alltime-grid-expanded{margin-top:14px;animation:fadeUp 0.3s var(--easing) both}

/* ── BUDGET RING ──────────────────────────────────── */
.budget-ring-card{background:var(--card);backdrop-filter:var(--glass-blur);border:1px solid var(--border);box-shadow:var(--inner-highlight),0 8px 24px rgba(0,0,0,0.4);border-radius:24px;padding:24px;margin-bottom:16px}
.budget-ring-inner{display:flex;align-items:center;gap:24px;margin-bottom:16px}
.ring-container{position:relative;width:100px;height:100px;flex-shrink:0}
.ring-container svg{width:100%;height:100%;transform:rotate(-90deg);filter:drop-shadow(0 0 8px rgba(212,175,55,0.3))}
.ring-bg{fill:none;stroke:var(--border2);stroke-width:8}
.ring-progress{fill:none;stroke-width:8;stroke-linecap:round;transition:stroke-dasharray 1.2s var(--easing),stroke 0.4s var(--easing)}
.ring-center-text{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.ring-pct{font-family:var(--mono);font-size:18px;font-weight:700;line-height:1;color:var(--txt)}
.ring-pct-label{font-size:9px;color:var(--txt3);letter-spacing:1px;margin-top:2px;font-weight:600}
.ring-info{flex:1}
.ring-info-title{font-size:10px;color:var(--txt2);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;font-weight:700}
.ring-info-spent{font-family:var(--mono);font-size:24px;font-weight:600;color:var(--txt);margin-bottom:4px;letter-spacing:-0.5px}
.ring-info-remain{font-size:13px;font-weight:700}
.ring-info-remain.ok{color:var(--green);text-shadow:0 0 10px var(--green-dim)}
.ring-info-remain.warn{color:var(--amber);text-shadow:0 0 10px var(--amber-dim)}
.ring-info-remain.over{color:var(--red);text-shadow:0 0 10px var(--red-dim)}
.ring-info-budget{font-size:12px;color:var(--txt3);margin-top:4px;font-weight:500}
.ring-source-note{font-size:12px;color:var(--amber);margin-top:8px;padding:8px 12px;background:var(--amber-dim);border:1px solid rgba(245,158,11,0.2);border-radius:10px;line-height:1.5;font-weight:500;backdrop-filter:blur(4px)}
.budget-edit-row{display:flex;align-items:flex-end;gap:12px}
.budget-edit-field{flex:1}
.budget-edit-field label{display:block;font-size:11px;color:var(--txt2);font-weight:700;margin-bottom:6px;letter-spacing:0.5px}

/* ── WEEK BARS ────────────────────────────────────── */
.week-grid{display:flex;flex-direction:column;gap:10px}
.week-row{display:flex;align-items:center;gap:12px;padding:4px 0;transition:transform 0.2s}
.week-row:hover{transform:translateX(4px)}
.week-row.today-row .week-day-label{color:var(--green);font-weight:800;background:var(--surface);padding:4px 8px;border-radius:6px;margin-left:-8px}
.week-day-label{font-size:12px;color:var(--txt3);width:40px;flex-shrink:0;font-family:var(--mono);font-weight:600}
.week-bar-track{flex:1;height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,0.6)}
.week-bar-fill{height:100%;border-radius:4px;transition:width 1s var(--easing);position:relative}
.week-bar-fill::after{content:'';position:absolute;top:0;right:0;bottom:0;width:10px;background:linear-gradient(to right,transparent,rgba(255,255,255,0.5));border-radius:0 4px 4px 0}
.week-bar-fill.safe{background:linear-gradient(90deg,#9b7f23,var(--green));box-shadow:0 0 12px rgba(212,175,55,0.4)}
.week-bar-fill.warn{background:linear-gradient(90deg,#c2410c,var(--amber));box-shadow:0 0 12px var(--amber-dim)}
.week-bar-fill.over{background:linear-gradient(90deg,#be123c,var(--red));box-shadow:0 0 12px var(--red-dim)}
.week-bar-fill.none{background:transparent}
.week-amount{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--txt2);width:75px;text-align:right;flex-shrink:0}

/* ── PROGRESS BARS ────────────────────────────────── */
.prog-wrap{margin-bottom:16px}
.prog-labels{display:flex;justify-content:space-between;margin-bottom:6px;align-items:flex-end}
.prog-l{font-size:13px;font-weight:700;color:var(--txt)}
.prog-r{font-size:12px;font-family:var(--mono);color:var(--txt2);font-weight:600}
.prog-track{height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;margin-bottom:6px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.6)}
.prog-fill{height:100%;border-radius:4px;transition:width 1s var(--easing);position:relative}
.prog-fill::after{content:'';position:absolute;top:0;right:0;bottom:0;width:10px;background:linear-gradient(to right,transparent,rgba(255,255,255,0.5));border-radius:0 4px 4px 0}
.prog-fill.green{background:linear-gradient(90deg,#9b7f23,var(--green));box-shadow:0 0 12px rgba(212,175,55,0.4)}
.prog-fill.amber{background:linear-gradient(90deg,#c2410c,var(--amber));box-shadow:0 0 12px var(--amber-dim)}
.prog-fill.red{background:linear-gradient(90deg,#be123c,var(--red));box-shadow:0 0 12px var(--red-dim)}
.prog-fill.blue{background:linear-gradient(90deg,#1d4ed8,var(--blue));box-shadow:0 0 12px var(--blue-dim)}
.prog-note{font-size:11px;font-weight:700;letter-spacing:0.5px}
.prog-note.ok{color:var(--green)}.prog-note.warn{color:var(--amber)}.prog-note.over{color:var(--red)}

/* ── INSIGHTS ─────────────────────────────────────── */
.insight-card{display:flex;align-items:flex-start;gap:14px;padding:16px;border-radius:16px;margin-bottom:12px;border:1px solid transparent;backdrop-filter:blur(10px)}
.insight-card.green{background:var(--green-dim);border-color:rgba(212,175,55,0.25);box-shadow:0 4px 20px rgba(212,175,55,0.05)}
.insight-card.red{background:var(--red-dim);border-color:rgba(225,29,72,0.25);box-shadow:0 4px 20px rgba(225,29,72,0.05)}
.insight-card.amber{background:var(--amber-dim);border-color:rgba(245,158,11,0.25);box-shadow:0 4px 20px rgba(245,158,11,0.05)}
.insight-icon{font-size:20px;flex-shrink:0;margin-top:2px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))}
.insight-title{font-size:14px;font-weight:800;color:var(--txt);margin-bottom:4px;letter-spacing:0.2px}
.insight-text{font-size:13px;color:rgba(255,255,255,0.8);line-height:1.6;font-weight:500}
.insight-text strong{color:var(--txt);font-family:var(--mono);font-weight:700;padding:0 2px}

/* ── SECTION TITLES ───────────────────────────────── */
.section-title{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:800;color:var(--txt);margin-bottom:16px;margin-top:8px;letter-spacing:0.5px;text-transform:uppercase}
.dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;box-shadow:inset 0 1px 1px rgba(255,255,255,0.5)}
.dot-black{background:var(--green);box-shadow:0 0 12px var(--green-dim),inset 0 1px 1px rgba(255,255,255,0.5)}
.dot-grey{background:var(--red);box-shadow:0 0 12px var(--red-dim),inset 0 1px 1px rgba(255,255,255,0.5)}
.dot-light{background:var(--blue);box-shadow:0 0 12px var(--blue-dim),inset 0 1px 1px rgba(255,255,255,0.5)}
.section-view-indicator{font-size:12px;color:var(--txt2);margin-bottom:16px;padding:10px 14px;background:var(--surface);border-radius:12px;border:1px solid var(--border);font-weight:600;box-shadow:inset 0 1px 0 rgba(255,255,255,0.03)}

/* ── FORMS ────────────────────────────────────────── */
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
.form-group{margin-bottom:14px}
.form-group label{display:block;font-size:11px;font-weight:700;color:var(--txt2);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px}
.form-group input,.form-group select{width:100%;padding:14px 16px;background:rgba(0,0,0,0.5);border:1px solid var(--border);border-radius:12px;color:var(--txt);font-size:15px;font-weight:500;outline:none;transition:all 0.3s var(--easing);-webkit-appearance:none;appearance:none;box-shadow:inset 0 2px 5px rgba(0,0,0,0.6)}
.form-group input:focus,.form-group select:focus{border-color:var(--green);background:rgba(0,0,0,0.7);box-shadow:inset 0 2px 5px rgba(0,0,0,0.6),0 0 0 3px var(--green-dim)}
.form-group input::placeholder{color:var(--txt3)}
select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='10' viewBox='0 0 14 10'%3E%3Cpath d='M1 1l6 6 6-6' stroke='%23d4af37' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center;padding-right:40px}
select option{background:#1a1a1c;color:var(--txt)}

/* ── BUTTONS ──────────────────────────────────────── */
.btn{border:none;border-radius:12px;font-size:14px;font-weight:800;padding:14px 24px;transition:all 0.3s var(--easing);letter-spacing:0.5px;text-transform:uppercase;position:relative;overflow:hidden}
.btn:active{transform:scale(0.95)}
.btn-black{background:linear-gradient(135deg,#ebd38a,var(--green));color:#000;box-shadow:0 4px 20px rgba(212,175,55,0.3),inset 0 1px 0 rgba(255,255,255,0.5)}
.btn-black:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(212,175,55,0.4),inset 0 1px 0 rgba(255,255,255,0.6);background:linear-gradient(135deg,#f4e3a8,#dfbd69)}
.btn-outline{background:rgba(255,255,255,0.03);color:var(--txt);border:1px solid var(--border2);backdrop-filter:blur(4px)}
.btn-outline:hover{background:rgba(255,255,255,0.08);border-color:rgba(212,175,55,0.5);transform:translateY(-2px)}
.btn-full{width:100%;display:block}
.btn-sm{padding:10px 16px;font-size:12px}

/* ── TX ITEMS ─────────────────────────────────────── */
.tx-item{display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--surface);border:1px solid var(--border);border-radius:16px;margin-bottom:10px;animation:txIn 0.3s var(--easing) both;transition:all 0.2s var(--easing)}
@keyframes txIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
.tx-item:hover{background:var(--card2);border-color:var(--border2);transform:translateX(4px);box-shadow:0 4px 15px rgba(0,0,0,0.4)}
.tx-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.1)}
.tx-icon.in{background:var(--green-dim);color:var(--green);border:1px solid rgba(212,175,55,0.25)}
.tx-icon.out{background:rgba(255,255,255,0.05);color:var(--txt2);border:1px solid rgba(255,255,255,0.05)}
.tx-body{flex:1;min-width:0}
.tx-desc{font-size:14px;font-weight:700;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:0.2px}
.tx-meta{font-size:12px;color:var(--txt2);margin-top:4px;display:flex;align-items:center;gap:8px;font-weight:500}
.tx-cat-pill{background:rgba(0,0,0,0.5);border:1px solid var(--border);color:var(--txt2);padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
.tx-amount{font-family:var(--mono);font-size:15px;font-weight:700;white-space:nowrap;flex-shrink:0;letter-spacing:-0.5px}
.tx-amount.in{color:var(--green);text-shadow:0 0 12px rgba(212,175,55,0.4)}
.tx-amount.out{color:var(--txt)}
.tx-del{background:var(--red-dim);border:1px solid rgba(225,29,72,0.25);color:var(--red);width:32px;height:32px;border-radius:8px;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s}
.tx-del:hover{background:var(--red);color:#fff;transform:scale(1.1) rotate(5deg);box-shadow:0 4px 10px var(--red-dim)}

/* ── TX EDIT BUTTON ───────────────────────────────── */
.tx-edit{background:rgba(10,132,255,0.15);border:1px solid rgba(10,132,255,0.25);color:#3b82f6;width:32px;height:32px;border-radius:8px;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s}
.tx-edit:hover{background:#3b82f6;color:#fff;transform:scale(1.1)}
.tx-actions{display:flex;gap:6px;flex-shrink:0}

/* ── METRICS GRID ─────────────────────────────────── */
.metrics-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.metric{background:var(--card);backdrop-filter:var(--glass-blur);border:1px solid var(--border);border-radius:16px;padding:16px;box-shadow:var(--inner-highlight),0 4px 15px rgba(0,0,0,0.3);transition:transform 0.2s}
.metric:hover{transform:translateY(-2px);border-color:var(--green)}
.metric-label{font-size:10px;font-weight:700;color:var(--txt3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px}
.metric-value{font-family:var(--mono);font-size:18px;font-weight:600;color:var(--txt)}

/* ── CATEGORY CARDS ───────────────────────────────── */
.cat-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cat-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;cursor:pointer;transition:all 0.2s var(--easing);position:relative;overflow:hidden}
.cat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.3),transparent);opacity:0;transition:opacity 0.2s}
.cat-card:hover{background:var(--card2);border-color:var(--border2);transform:translateY(-3px);box-shadow:0 8px 25px rgba(0,0,0,0.5)}
.cat-card:hover::before{opacity:1}
.cat-icon{font-size:24px;display:block;margin-bottom:10px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))}
.cat-name{font-size:14px;font-weight:800;color:var(--txt);margin-bottom:4px;letter-spacing:0.2px}
.cat-amt{font-family:var(--mono);font-size:14px;font-weight:600;color:var(--txt2);margin-bottom:2px}
.cat-count{font-size:11px;color:var(--txt3);margin-bottom:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
.cat-bar{height:6px;background:rgba(0,0,0,0.4);border-radius:3px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,0.6)}
.cat-bar-fill{height:100%;background:linear-gradient(90deg,#9b7f23,var(--green));border-radius:3px;transition:width 1s var(--easing);box-shadow:0 0 12px rgba(212,175,55,0.5)}

/* ── DRILL PANEL ──────────────────────────────────── */
.drill-panel{background:rgba(18,18,20,0.85);backdrop-filter:var(--glass-blur);border:1px solid var(--border);border-radius:var(--r);padding:20px;margin-top:16px;display:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.03),0 15px 40px rgba(0,0,0,0.6)}
.drill-panel.open{display:block;animation:fadeUp 0.3s var(--easing) both}
.drill-title{font-size:15px;font-weight:800;color:var(--txt);margin-bottom:16px;display:flex;align-items:center;gap:8px}

/* ── FILTER CHIPS ─────────────────────────────────── */
.filter-row{display:flex;gap:10px;overflow-x:auto;margin-bottom:16px;padding-bottom:4px;scroll-snap-type:x mandatory}
.filter-row::-webkit-scrollbar{display:none}
.filter-chip{padding:8px 18px;border-radius:30px;border:1px solid var(--border);background:var(--surface);color:var(--txt2);font-size:13px;font-weight:700;white-space:nowrap;transition:all 0.2s;scroll-snap-align:start;cursor:pointer;backdrop-filter:blur(4px)}
.filter-chip:hover{background:var(--card);color:var(--txt)}
.filter-chip.active{background:var(--green);color:#000;border-color:var(--green);box-shadow:0 4px 15px var(--green-dim)}

/* ── HISTORY SUMMARY ──────────────────────────────── */
.hist-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.hist-stat{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px;text-align:center;box-shadow:inset 0 1px 0 rgba(255,255,255,0.02)}
.hist-stat-v{display:block;font-family:var(--mono);font-size:14px;font-weight:700;margin-bottom:4px;color:var(--txt)}
.hist-stat-l{font-size:9px;color:var(--txt3);letter-spacing:1px;text-transform:uppercase;font-weight:600}

/* ── HISTORY DAY GROUPS ─────────────── FIX ──────── */
.hist-day-group{margin-bottom:20px}
.hist-day-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:6px;
  padding:10px 14px;
  background:linear-gradient(90deg,var(--card),transparent);
  border-left:2px solid var(--green);
  border-radius:0 12px 12px 0;
  margin-bottom:10px;
  cursor:pointer;
  user-select:none;
  transition:background 0.2s;
  min-width:0;
}
.hist-day-header:hover{background:linear-gradient(90deg,var(--card2),transparent)}

/* Left side: chevron + label — takes remaining space, clips if needed */
.hist-day-left{
  display:flex;
  align-items:center;
  gap:6px;
  flex:1;
  min-width:0;
  overflow:hidden;
}
.hist-day-label{
  font-size:12px;
  font-weight:800;
  color:var(--txt);
  font-family:var(--mono);
  letter-spacing:0.3px;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.hist-day-label.today-label{color:var(--green)}

/* Chevron */
.hist-day-chev{
  font-size:10px;
  width:12px;
  flex-shrink:0;
  display:inline-block;
  transition:transform 0.25s var(--easing);
  line-height:1;
}
.hist-day-chev.open{transform:rotate(90deg)}

/* Right side: formula + add button — never shrinks, never wraps */
.hist-day-right{
  display:flex;
  align-items:center;
  gap:8px;
  flex-shrink:0;
}

/* ── HISTORY FORMULA (the key fix) ───────────────── */
/* Drop "KSh" prefix from in/out numbers — keep only on net pill.
   Use nowrap on every span so the row never breaks mid-formula.   */
.hist-day-formula{
  display:flex;
  align-items:center;
  gap:2px;
  flex-wrap:nowrap;
  flex-shrink:0;
}
.hist-day-formula .hf-in{
  color:var(--green);
  font-family:var(--mono);
  font-size:11px;
  font-weight:700;
  white-space:nowrap;
}
.hist-day-formula .hf-sep{
  color:var(--txt3);
  font-size:11px;
  padding:0 1px;
  white-space:nowrap;
}
.hist-day-formula .hf-out{
  color:var(--red);
  font-family:var(--mono);
  font-size:11px;
  font-weight:700;
  white-space:nowrap;
}
.hist-day-formula .hf-net{
  font-family:var(--mono);
  font-size:11px;
  font-weight:800;
  padding:2px 6px;
  border-radius:6px;
  white-space:nowrap;
}
.hist-day-formula .hf-net.pos{color:var(--green);background:var(--green-dim)}
.hist-day-formula .hf-net.neg{color:var(--red);background:var(--red-dim)}

.hist-add-btn{
  background:rgba(255,255,255,0.05);
  border:1px solid var(--border);
  color:var(--txt);
  font-size:11px;
  font-weight:800;
  padding:5px 10px;
  border-radius:20px;
  white-space:nowrap;
  flex-shrink:0;
  transition:all 0.2s;
}
.hist-add-btn:hover{background:var(--green);color:#000;transform:scale(1.05);border-color:var(--green)}

/* ── HISTORY DAY TOGGLE ───────────────────────────── */
.hist-day-txs{
  display:grid;
  grid-template-rows:0fr;
  transition:grid-template-rows 0.3s cubic-bezier(0.16,1,0.3,1);
  overflow:hidden;
}
.hist-day-txs>.hist-day-txs-inner{
  min-height:0;
  overflow:hidden;
}
.hist-day-txs.open{
  grid-template-rows:1fr;
}

/* ── ADD TO DAY MODAL ─────────────────────────────── */
.modal-overlay{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;animation:fadeOverlay 0.3s var(--easing) both}
@keyframes fadeOverlay{from{opacity:0}to{opacity:1}}
.modal-sheet{background:rgba(12,12,14,0.98);backdrop-filter:blur(40px);border:1px solid var(--border2);border-radius:28px 28px 0 0;width:100%;max-width:480px;padding:24px 20px 40px;box-shadow:0 -10px 50px rgba(0,0,0,0.8),inset 0 1px 0 rgba(255,255,255,0.05);animation:slideUp 0.4s cubic-bezier(0.2,0.9,0.3,1) both}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.modal-handle{width:40px;height:5px;background:var(--border2);border-radius:3px;margin:0 auto 24px;box-shadow:inset 0 1px 1px rgba(0,0,0,0.4)}
.modal-title{font-size:18px;font-weight:800;color:var(--txt);margin-bottom:6px;letter-spacing:-0.5px}
.modal-date-badge{display:inline-block;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--green);background:var(--green-dim);border:1px solid rgba(212,175,55,0.3);border-radius:20px;padding:4px 12px;margin-bottom:24px;box-shadow:0 0 10px var(--green-dim)}
.modal-tabs{display:flex;gap:10px;margin-bottom:24px;background:rgba(0,0,0,0.4);padding:4px;border-radius:14px;border:1px solid var(--border)}
.modal-tab{flex:1;padding:10px;border:none;border-radius:10px;background:transparent;color:var(--txt2);font-size:14px;font-weight:800;transition:all 0.2s;text-transform:uppercase;letter-spacing:0.5px}
.modal-tab.active-in{background:var(--green);color:#000;box-shadow:0 4px 15px var(--green-dim)}
.modal-tab.active-out{background:var(--red);color:#fff;box-shadow:0 4px 15px var(--red-dim)}
.modal-actions{display:flex;gap:12px;margin-top:8px}
.modal-cancel{flex:1;padding:16px;border:1px solid var(--border);border-radius:14px;background:transparent;color:var(--txt);font-size:15px;font-weight:700;transition:background 0.2s}
.modal-cancel:hover{background:rgba(255,255,255,0.05)}
.modal-save{flex:2;padding:16px;border:none;border-radius:14px;background:linear-gradient(135deg,#ebd38a,var(--green));color:#000;font-size:15px;font-weight:800;box-shadow:0 4px 20px var(--green-dim),inset 0 1px 0 rgba(255,255,255,0.5)}

/* ── EDIT MODAL BADGE ─────────────────────────────── */
.edit-modal-badge{display:inline-block;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;margin-bottom:20px;border:1px solid transparent}

/* ── HABITS ───────────────────────────────────────── */
.habit-item{display:flex;align-items:center;gap:14px;background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px;margin-bottom:12px;transition:all 0.2s}
.habit-item:hover{border-color:var(--green);transform:translateX(4px);box-shadow:0 4px 20px rgba(0,0,0,0.4)}
.habit-icon{font-size:24px;flex-shrink:0;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))}
.habit-body{flex:1;min-width:0}
.habit-name{font-size:14px;font-weight:800;color:var(--txt);margin-bottom:2px;letter-spacing:0.2px}
.habit-desc{font-size:12px;color:var(--txt3);font-weight:500}
.habit-streak{text-align:center;flex-shrink:0;padding:0 8px}
.habit-streak-num{display:block;font-family:var(--mono);font-size:22px;font-weight:700;color:var(--amber);line-height:1;text-shadow:0 0 12px var(--amber-dim)}
.habit-streak-label{font-size:9px;color:var(--txt3);letter-spacing:1.5px;text-transform:uppercase;font-weight:700;margin-top:4px}
.habit-check{width:36px;height:36px;border-radius:50%;border:2px solid var(--border2);background:rgba(0,0,0,0.3);color:transparent;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);flex-shrink:0;box-shadow:inset 0 1px 2px rgba(0,0,0,0.6)}
.habit-check.done{background:var(--green);border-color:var(--green);color:#000;box-shadow:0 0 15px var(--green-dim),inset 0 1px 0 rgba(255,255,255,0.6);transform:scale(1.1)}
.habit-del{background:var(--red-dim);border:1px solid rgba(225,29,72,0.25);color:var(--red);width:32px;height:32px;border-radius:8px;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s}
.habit-del:hover{background:var(--red);color:#fff;transform:scale(1.1)}

/* ── BOTTOM NAV (FLOATING ISLAND) ─────────────────── */
.bottom-nav{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);width:calc(100% - 40px);max-width:440px;background:rgba(12,12,14,0.9);backdrop-filter:blur(30px);border:1px solid var(--border2);border-radius:30px;display:flex;align-items:center;padding:8px 8px;z-index:100;box-shadow:var(--shadow-float),inset 0 1px 0 rgba(255,255,255,0.08)}
.nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;border:none;background:none;color:var(--txt3);font-size:9px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;transition:all 0.3s var(--easing);border-radius:20px;position:relative}
.nav-btn::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);width:40px;height:40px;background:var(--green-dim);border-radius:50%;transition:transform 0.3s var(--easing);z-index:-1}
.nav-btn.active{color:var(--txt)}
.nav-btn.active::before{transform:translate(-50%,-50%) scale(1)}
.nav-btn.active .nav-icon{color:var(--green);filter:drop-shadow(0 0 8px var(--green-dim));transform:translateY(-2px)}
.nav-icon{font-size:20px;line-height:1;transition:all 0.3s var(--easing)}

/* ── TOAST ────────────────────────────────────────── */
.toast{position:fixed;bottom:100px;left:50%;transform:translateX(-50%) translateY(20px) scale(0.9);background:rgba(26,26,28,0.95);backdrop-filter:blur(20px);border:1px solid var(--border2);border-radius:30px;padding:12px 24px;font-size:14px;font-weight:700;color:var(--txt);z-index:999;opacity:0;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);white-space:nowrap;max-width:calc(100% - 40px);pointer-events:none;box-shadow:var(--shadow-float),inset 0 1px 0 rgba(255,255,255,0.05)}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}
.toast.green{color:var(--green);border-color:rgba(212,175,55,0.3);box-shadow:0 10px 30px var(--green-dim)}
.toast.red{color:var(--red);border-color:rgba(225,29,72,0.3);box-shadow:0 10px 30px var(--red-dim)}

/* ── EMPTY STATE ──────────────────────────────────── */
.empty-state{text-align:center;padding:40px 20px;color:var(--txt3);animation:fadeUp 0.5s var(--easing) both}
.empty-state-icon{font-size:40px;margin-bottom:12px;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.6));opacity:0.6}
.empty-state-title{font-size:16px;font-weight:800;color:var(--txt2);margin-bottom:6px;letter-spacing:0.5px}
.empty-state-sub{font-size:13px;line-height:1.6;font-weight:500;max-width:280px;margin:0 auto}
`;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();