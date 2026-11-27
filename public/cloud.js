/* Garage Empire cloud accounts layer. Adds login, cloud save and owner-edit sync on top of the game.
   No game rules, prices or save format are changed here. An account is required to play: the sign-in screen cannot be dismissed. */
(function () {
  'use strict';
  const ar = () => (typeof S !== 'undefined' && S.lang === 'ar');
  const W = (e, a) => (ar() ? a : e);
  const C = window.Cloud = { user: null, role: null, rev: 0, state: 'guest', dirty: false };
  let timer = 0, inflight = false, again = false, applying = false, pollId = 0, notice = '';

  const api = async (path, method, body, keepalive) => {
    const r = await fetch(path, { method: method || 'GET', credentials: 'same-origin', keepalive: !!keepalive,
      headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await r.json(); } catch (e) {}
    return { s: r.status, j: j || {} };
  };
  const nonFresh = () => S.wins > 0 || S.own.length !== 1 || S.usd !== 8000 || (S.team && S.team.length > 0);
  const snap = () => GarageSave.normalize(S);
  function refreshUI() {
    try {
      const sh = document.getElementById('sheet');
      if (sh && sh.classList.contains('open') && sh.dataset.kind === 'set') UI2.sheet('set');
      if (S.scr !== 'game') renderHome();
      setAcc();
    } catch (e) {}
  }
  function setState(st, msg) { C.state = st; notice = msg || ''; refreshUI(); }
  function applyServer(data, rev, why) {
    applying = true;
    try {
      const keep = { lang: S.lang, theme: S.theme };
      if (data) applyState(data); else { applyState(fresh()); S.lang = keep.lang; S.theme = keep.theme; }
      C.rev = rev; C.dirty = false;
      render();
    } finally { applying = false; }
    if (why) toast(why);
    refreshUI();
  }
  async function pull(first) {
    const r = await api('/api/save');
    if (r.s === 401) { C.user = null; setState('expired'); return C.open('login'); }
    if (r.s === 403) return setState('banned', r.j.reason || '');
    if (r.s === 503) return setState('maint');
    if (r.s !== 200) return setState('offline');
    const d = r.j;
    if (!d.data) {
      if (first && nonFresh() && !confirm(W('Upload the progress on this device to your account?\nOK = upload, Cancel = start a fresh account.', 'ترفع التقدم اللي على الجهاز ده لحسابك؟\nموافق = ارفع، إلغاء = ابدأ حساب جديد.'))) {
        applying = true; try { applyState(fresh()); render(); } finally { applying = false; }
      }
      C.rev = d.rev || 0; return push(true);
    }
    const local = nonFresh() ? JSON.stringify(snap()) : null;
    if (first && local && local !== JSON.stringify(d.data)) {
      const useCloud = confirm(W('This account already has cloud progress, and this device has different progress.\nOK = use the cloud progress, Cancel = replace it with this device.', 'الحساب ده عنده تقدم محفوظ، والجهاز ده عنده تقدم مختلف.\nموافق = استخدم تقدم الحساب، إلغاء = استبدله بتقدم الجهاز ده.'));
      if (!useCloud) { C.rev = d.rev; return push(true); }
    }
    if (first || d.rev !== C.rev) applyServer(d.data, d.rev, !first && d.byAdmin ? W('The owner updated your account.', 'المالك عدّل في حسابك.') : '');
    setState('synced');
  }
  async function push(now) {
    if (!C.user) return;
    clearTimeout(timer);
    if (!now) { timer = setTimeout(() => push(true), 1200); C.dirty = true; if (C.state !== 'syncing') setState('pending'); return; }
    if (inflight) { again = true; return; }
    inflight = true; setState('syncing');
    try {
      const r = await api('/api/save', 'PUT', { data: snap(), base: C.rev });
      if (r.s === 200) { C.rev = r.j.rev; C.dirty = false; setState('synced'); }
      else if (r.s === 409) {
        if (r.j.byAdmin || r.j.data === null) applyServer(r.j.data, r.j.rev, W('The owner updated your account, so your game was refreshed.', 'المالك عدّل حسابك، فاتحدثت اللعبة.'));
        else if (confirm(W('This account was saved from another device.\nOK = load that progress, Cancel = keep this device\'s progress.', 'الحساب ده اتحفظ من جهاز تاني.\nموافق = حمّل التقدم ده، إلغاء = خلي تقدم الجهاز ده.'))) applyServer(r.j.data, r.j.rev, '');
        else { C.rev = r.j.rev; again = true; }
      }
      else if (r.s === 401) { C.user = null; setState('expired'); C.open('login'); }
      else if (r.s === 403) setState('banned', r.j.reason || '');
      else if (r.s === 503) { setState('maint'); setTimeout(() => push(true), 30000); }
      else { setState('offline'); setTimeout(() => push(true), 10000); }
    } catch (e) { setState('offline'); setTimeout(() => push(true), 10000); }
    inflight = false;
    if (again) { again = false; push(true); }
  }
  const _save = window.save;
  window.save = function () { _save.apply(this, arguments); if (C.user && !applying) push(false); };
  const _setAcc = window.setAcc;
  window.setAcc = function () {
    _setAcc.apply(this, arguments);
    const el = document.getElementById('saveState'); if (el && C.user) { el.textContent = C.label(true); el.style.color = (C.state === 'offline' || C.state === 'banned') ? 'var(--bad)' : 'var(--mut)'; }
  };
  C.label = function (short) {
    const m = { synced: W('Cloud save: synced', 'الحفظ السحابي: متزامن'), syncing: W('Cloud save: saving...', 'الحفظ السحابي: بيتحفظ...'), pending: W('Cloud save: saving soon', 'الحفظ السحابي: هيتحفظ حالا'),
      offline: W('Cloud save: offline, will retry', 'الحفظ السحابي: مفيش اتصال، هيحاول تاني'), banned: W('This account is banned.', 'الحساب ده محظور.') + (notice ? ' ' + notice : ''), maint: W('Maintenance, saving paused', 'صيانة، الحفظ متوقف'), expired: W('Session ended. Sign in again.', 'الجلسة خلصت. سجّل دخول تاني.'), guest: '' };
    return (C.user && !short ? C.user + ' · ' : '') + (m[C.state] || '');
  };
  C.chip = () => `<button onclick="Cloud.open()">${C.user ? '☁ ' + C.user : W('Sign in', 'تسجيل الدخول')}</button>`;
  C.foot = () => C.user ? C.label() : '';
  C.settingsHTML = () => `<div class="grp"><small>${W('ACCOUNT', 'الحساب')}</small><p class="sv">${C.user ? C.label() : ''}</p>
    ${C.user ? `${C.role === 'owner' ? `<a class="act" href="/admin.html">${W('Owner dashboard', 'لوحة المالك')}</a>` : ''}<button class="act" onclick="Cloud.logout()">${W('Sign out', 'تسجيل خروج')}</button>` : `<button class="act" onclick="Cloud.open()">${W('Sign in or create account', 'دخول أو إنشاء حساب')}</button>`}</div>`;

  function css() {
    if (document.getElementById('geAuthCss')) return;
    const s = document.createElement('style'); s.id = 'geAuthCss';
    s.textContent = '#geAuth{position:fixed;inset:0;z-index:9000;background:#05070f;display:grid;overflow:auto;place-items:center;padding:16px}#geAuth .bx{width:100%;max-width:380px;background:#0f1220;border:1px solid #2a3050;border-top:3px solid #ff5a1f;border-radius:14px;padding:18px;display:grid;gap:12px;color:#e8ecff}#geAuth h3{margin:0;font-size:20px}#geAuth label{display:grid;gap:5px;font-size:13px;color:#9aa3c7}#geAuth input{background:#0a0d1a;color:#e8ecff;border:1px solid #2a3050;border-radius:10px;padding:11px;font:inherit;min-height:44px}#geAuth .tabs{display:flex;gap:6px}#geAuth .tabs button,#geAuth .row button{flex:1;min-height:44px;border-radius:10px;border:1px solid #2a3050;background:#151a2e;color:#e8ecff;font:inherit;cursor:pointer}#geAuth .tabs .on{border-color:#ff5a1f;color:#ff8a54}#geAuth .go{background:linear-gradient(90deg,#ff5a1f,#ff2d95)!important;border:0!important;font-weight:700}#geAuth .err{color:#ff6b84;font-size:13px;min-height:18px}#geAuth .hint{font-size:12px;color:#9aa3c7}';
    document.head.append(s);
  }
  let mode = 'login', gisReady = null, cfg = null;
  const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  async function loadCfg() { if (!cfg) { const r = await api('/api/status').catch(() => null); cfg = r && r.s === 200 ? r.j : {}; } return cfg; }
  function loadGis() {
    if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
    if (gisReady) return gisReady;
    gisReady = new Promise((res, rej) => {
      const old = document.getElementById('geGis'); if (old) old.remove();
      const s = document.createElement('script'); s.id = 'geGis'; s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      const t = setTimeout(() => { gisReady = null; rej(new Error('timeout')); }, 8000);
      s.onload = () => { clearTimeout(t); res(); }; s.onerror = () => { clearTimeout(t); gisReady = null; rej(new Error('blocked')); };
      document.head.append(s);
    });
    return gisReady;
  }
  async function done(j, el) { C.user = j.username; C.role = j.role || 'player'; el.remove(); await pull(true); startPoll(); refreshUI(); if (window.Social) Social.start(); }
  const errText = r => r.s === 503 ? (r.j.message || W('Maintenance right now.', 'صيانة دلوقتي.')) : r.s === 401 ? (r.j.error && /Google/.test(r.j.error) ? W('Google sign-in failed. Try again.', 'الدخول بجوجل فشل. جرّب تاني.') : W('Wrong username or password.', 'اسم المستخدم أو كلمة السر غلط.'))
    : r.s === 409 ? (r.j.field === 'email' ? W('This email already has an account.', 'الإيميل ده عنده حساب بالفعل.') : W('Username taken. Pick another one.', 'اسم المستخدم ده مستخدم. اختار اسم تاني.'))
    : r.s === 429 ? W('Too many attempts. Try later.', 'محاولات كتير. جرّب بعدين.') : r.s === 403 ? (r.j.banned ? W('This account is banned.', 'الحساب ده محظور.') : W('Registration is closed right now.', 'التسجيل مقفول دلوقتي.')) : (r.s === 400 ? W('Check the username (3-20 letters, digits or _), a valid email, and a password of 8+ characters.', 'راجع اسم المستخدم (٣-٢٠ حرف إنجليزي أو رقم أو _) والإيميل وكلمة السر (٨ حروف على الأقل).') : W('Something went wrong.', 'حصل خطأ.'));
  C.open = async function (m) {
    if (C.user) return UI2.sheet('set');
    css(); mode = m || mode; const cf = await loadCfg();
    let el = document.getElementById('geAuth'); if (el) el.remove();
    el = document.createElement('div'); el.id = 'geAuth'; el.dir = ar() ? 'rtl' : 'ltr';
    const reg = mode === 'register';
    el.innerHTML = `<form class="bx" autocomplete="on"><div class="tabs"><button type="button" data-m="login" class="${!reg ? 'on' : ''}">${W('Sign in', 'دخول')}</button><button type="button" data-m="register" class="${reg ? 'on' : ''}">${W('Create account', 'حساب جديد')}</button></div>
      <h3>${reg ? W('Create your account', 'اعمل حسابك') : W('Welcome back', 'أهلا بيك تاني')}</h3>
      <div class="hint">${W('You need an account to play Garage Empire.', 'لازم يكون عندك حساب عشان تلعب Garage Empire.')}</div>
      ${cf.googleClientId ? `<div id="geG" style="display:flex;justify-content:center;min-height:44px"></div><div class="hint" style="text-align:center">${W('or', 'أو')}</div>` : ''}
      ${reg ? `<label>${W('Email', 'الإيميل')}<input name="email" type="email" autocomplete="email" required maxlength="254" autocapitalize="none"></label>` : ''}
      <label>${reg ? W('Username (3-20 letters, digits or _, must be unique)', 'اسم المستخدم (٣-٢٠ حرف إنجليزي أو رقم أو _، ومينفعش يتكرر)') : W('Username or email', 'اسم المستخدم أو الإيميل')}<input name="username" autocomplete="username" required maxlength="${reg ? 20 : 254}" autocapitalize="none"></label>
      ${reg ? '<div class="hint" id="geU"></div>' : ''}
      <label>${reg ? W('Password (8+ characters)', 'كلمة السر (٨ حروف على الأقل)') : W('Password', 'كلمة السر')}<input name="password" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" required minlength="${reg ? 8 : 1}" maxlength="100"></label>
      <div class="err" id="geErr"></div><div class="row" style="display:flex;gap:8px"><button class="go" type="submit">${reg ? W('Create account', 'إنشاء الحساب') : W('Sign in', 'دخول')}</button></div><div class="hint" style="text-align:center"><a href="/privacy.html" target="_blank" style="color:#9aa3c7">${W('Privacy and terms', 'الخصوصية والشروط')}</a></div></form>`;
    document.body.append(el);
    el.querySelectorAll('.tabs button').forEach(b => b.onclick = () => C.open(b.dataset.m));
    const err = el.querySelector('#geErr');
    const uIn = el.querySelector('input[name=username]');
    if (reg) {
      let tm = 0; const uh = el.querySelector('#geU');
      uIn.oninput = () => { clearTimeout(tm); uh.textContent = ''; const v = uIn.value.trim(); if (!/^[A-Za-z0-9_]{3,20}$/.test(v)) return;
        tm = setTimeout(async () => { const r = await api('/api/username-available?u=' + encodeURIComponent(v)); if (uIn.value.trim() !== v || r.s !== 200) return; uh.style.color = r.j.available ? '#5ee08a' : '#ff6b84'; uh.textContent = r.j.available ? W('Username is available', 'الاسم متاح') : W('Username taken', 'الاسم مستخدم'); }, 350); };
    }
    el.querySelector('form').onsubmit = async e => {
      e.preventDefault(); const f = e.target; err.textContent = '';
      const body = { username: f.username.value.trim(), password: f.password.value };
      if (reg) body.email = f.email.value.trim();
      const r = await api('/api/' + (reg ? 'register' : 'login'), 'POST', body);
      if (r.s === 200 || r.s === 201) return done(r.j, el);
      err.textContent = errText(r);
    };
    const gFail = () => { const g = el.querySelector('#geG'); if (!g || g.dataset.f) return; g.dataset.f = '1'; g.style.flexDirection = 'column'; g.style.alignItems = 'center'; g.style.gap = '6px';
      g.innerHTML = '<div class="hint" style="text-align:center">' + W('Google sign-in did not load on this device or network. Check your connection, turn off ad blockers, or sign in with email below.', 'زرار جوجل مظهرش على الجهاز أو الشبكة دي. اتأكد من النت أو اقفل مانع الإعلانات، أو ادخل بالإيميل تحت.') + '</div><button type="button" class="go" style="max-width:240px">' + W('Retry Google', 'جرّب جوجل تاني') + '</button>';
      g.querySelector('button').onclick = () => { g.dataset.f = ''; g.innerHTML = ''; gisReady = null; C.open(mode); }; };
    if (cf.googleClientId) {
      const g = el.querySelector('#geG');
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'go'; btn.style.cssText = 'width:100%;display:flex;align-items:center;justify-content:center;gap:10px;background:#fff;color:#1f1f1f;border:1px solid #dadce0';
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg><span>' + W('Continue with Google', 'كمّل بجوجل') + '</span>';
      g.style.flexDirection = 'column'; g.style.alignItems = 'stretch'; g.style.gap = '6px'; g.append(btn);
      const note = document.createElement('div'); note.className = 'hint'; note.style.textAlign = 'center'; g.append(note);
      let tc = null;
      const onToken = async resp => {
        if (!resp || !resp.access_token) { note.textContent = W('Google sign-in was cancelled or blocked. Allow popups for this site and try again, or use email below.', 'دخول جوجل اتلغى أو اتحجب. اسمح بالنوافذ المنبثقة للموقع وجرّب تاني، أو ادخل بالإيميل تحت.'); return; }
        err.textContent = ''; const r = await api('/api/auth/google', 'POST', { access_token: resp.access_token });
        if (r.s === 200 && r.j.needUsername) return pickName(el, r.j);
        if (r.s === 200) return done(r.j, el);
        err.textContent = errText(r);
      };
      btn.onclick = async () => {
        note.textContent = '';
        try {
          await loadGis();
          if (!tc) tc = google.accounts.oauth2.initTokenClient({ client_id: cf.googleClientId, scope: 'openid email profile', callback: onToken, error_callback: () => onToken(null) });
          tc.requestAccessToken({ prompt: 'select_account' });
        } catch (e) { note.textContent = W('Google could not load on this device or network. Check your connection or use email below.', 'جوجل مقدرش يتحمل على الجهاز أو الشبكة دي. اتأكد من النت أو ادخل بالإيميل تحت.'); }
      };
      loadGis().catch(() => {});
    }
    uIn.focus();
  };
  function pickName(el, info) {
    el.innerHTML = `<form class="bx"><h3>${W('Pick a username', 'اختار اسم مستخدم')}</h3><div class="hint">${esc(info.email)}</div>
      <label>${W('Username (3-20 letters, digits or _, must be unique)', 'اسم المستخدم (٣-٢٠ حرف إنجليزي أو رقم أو _، ومينفعش يتكرر)')}<input name="username" required maxlength="20" autocapitalize="none" autocomplete="username"></label>
      <div class="hint" id="geU"></div><div class="err" id="geErr"></div><div class="row" style="display:flex;gap:8px"><button class="go" type="submit">${W('Continue', 'كمّل')}</button></div></form>`;
    const uIn = el.querySelector('input'), uh = el.querySelector('#geU'), err = el.querySelector('#geErr'); let tm = 0;
    uIn.oninput = () => { clearTimeout(tm); uh.textContent = ''; const v = uIn.value.trim(); if (!/^[A-Za-z0-9_]{3,20}$/.test(v)) return;
      tm = setTimeout(async () => { const r = await api('/api/username-available?u=' + encodeURIComponent(v)); if (uIn.value.trim() !== v || r.s !== 200) return; uh.style.color = r.j.available ? '#5ee08a' : '#ff6b84'; uh.textContent = r.j.available ? W('Username is available', 'الاسم متاح') : W('Username taken', 'الاسم مستخدم'); }, 350); };
    el.querySelector('form').onsubmit = async e => { e.preventDefault(); err.textContent = '';
      const r = await api('/api/auth/google/username', 'POST', { ticket: info.ticket, username: uIn.value.trim() });
      if (r.s === 201 || r.s === 200) return done(r.j, el);
      if (r.s === 401) { C.open('login'); return; }
      err.textContent = errText(r); };
    uIn.focus();
  }
  C.logout = async function () {
    if (C.dirty || inflight) { await push(true); await new Promise(r => setTimeout(r, 400)); if (C.dirty && !confirm(W('Your last changes did not sync. Sign out anyway?', 'آخر تغييراتك ماتزامنتش. تسجّل خروج برضه؟'))) return; }
    await api('/api/logout', 'POST', {});
    const keep = { lang: S.lang, theme: S.theme };
    C.user = null; C.role = null; C.state = 'guest'; C.rev = 0; clearTimeout(pollId);
    try { localStorage.removeItem(DEMO_KEY); } catch (e) {}
    applying = true; try { applyState(fresh()); S.lang = keep.lang; S.theme = keep.theme; S.scr = 'home'; render(); } finally { applying = false; }
    UI2.close(); if (window.Social) Social.stop(); C.open('login');
  };
  function startPoll() {
    clearTimeout(pollId);
    const tick = async () => {
      if (C.user && !document.hidden && !C.dirty && !inflight && !(typeof racing !== 'undefined' && racing)) {
        const r = await api('/api/save').catch(() => null);
        if (r && r.s === 200 && r.j.rev !== C.rev && !C.dirty) applyServer(r.j.data, r.j.rev, r.j.byAdmin ? W('The owner updated your account.', 'المالك عدّل في حسابك.') : '');
        else if (r && (r.s === 401 || r.s === 403)) { C.user = null; setState(r.s === 403 ? 'banned' : 'expired'); if (r.s === 401) C.open('login'); }
      }
      pollId = setTimeout(tick, 30000);
    };
    pollId = setTimeout(tick, 30000);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && C.user && C.dirty && !inflight) api('/api/save', 'PUT', { data: snap(), base: C.rev }, true).catch(() => {});
  });
  (async function init() {
    try {
      const r = await api('/api/me');
      if (r.s === 200) { C.user = r.j.username; C.role = r.j.role; await pull(true); startPoll(); if (window.Social) Social.start(); }
      else if (r.s === 403 && r.j.banned) { setState('banned', r.j.reason || ''); }
    } catch (e) {}
    refreshUI();
    if (!C.user) C.open('login');
  })();
})();
