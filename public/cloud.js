/* Garage Empire cloud accounts layer. Adds login, cloud save and owner-edit sync on top of the game.
   No game rules, prices or save format are changed here. Guests keep playing with the browser-only save. */
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
    if (r.s === 401) { C.user = null; return setState('expired'); }
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
      else if (r.s === 401) { C.user = null; setState('expired'); }
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
  C.foot = () => C.user ? C.label() : W('Guest: progress is saved in this browser only. Sign in to save it to your account.', 'ضيف: التقدم محفوظ في المتصفح ده بس. سجّل دخول عشان يتحفظ في حسابك.');
  C.settingsHTML = () => `<div class="grp"><small>${W('ACCOUNT', 'الحساب')}</small><p class="sv">${C.user ? C.label() : W('Not signed in. Progress stays in this browser.', 'مش مسجّل دخول. التقدم في المتصفح ده بس.')}</p>
    ${C.user ? `${C.role === 'owner' ? `<a class="act" href="/admin.html">${W('Owner dashboard', 'لوحة المالك')}</a>` : ''}<button class="act" onclick="Cloud.logout()">${W('Sign out', 'تسجيل خروج')}</button>` : `<button class="act" onclick="Cloud.open()">${W('Sign in or create account', 'دخول أو إنشاء حساب')}</button>`}</div>`;

  function css() {
    if (document.getElementById('geAuthCss')) return;
    const s = document.createElement('style'); s.id = 'geAuthCss';
    s.textContent = '#geAuth{position:fixed;inset:0;z-index:9000;background:#000b;display:grid;place-items:center;padding:16px}#geAuth .bx{width:100%;max-width:380px;background:#0f1220;border:1px solid #2a3050;border-top:3px solid #ff5a1f;border-radius:14px;padding:18px;display:grid;gap:12px;color:#e8ecff}#geAuth h3{margin:0;font-size:20px}#geAuth label{display:grid;gap:5px;font-size:13px;color:#9aa3c7}#geAuth input{background:#0a0d1a;color:#e8ecff;border:1px solid #2a3050;border-radius:10px;padding:11px;font:inherit;min-height:44px}#geAuth .tabs{display:flex;gap:6px}#geAuth .tabs button,#geAuth .row button{flex:1;min-height:44px;border-radius:10px;border:1px solid #2a3050;background:#151a2e;color:#e8ecff;font:inherit;cursor:pointer}#geAuth .tabs .on{border-color:#ff5a1f;color:#ff8a54}#geAuth .go{background:linear-gradient(90deg,#ff5a1f,#ff2d95)!important;border:0!important;font-weight:700}#geAuth .err{color:#ff6b84;font-size:13px;min-height:18px}#geAuth .hint{font-size:12px;color:#9aa3c7}';
    document.head.append(s);
  }
  let mode = 'login';
  C.open = function (m) {
    if (C.user) return UI2.sheet('set');
    css(); mode = m || mode;
    let el = document.getElementById('geAuth'); if (el) el.remove();
    el = document.createElement('div'); el.id = 'geAuth'; el.dir = ar() ? 'rtl' : 'ltr';
    el.innerHTML = `<form class="bx" autocomplete="on"><div class="tabs"><button type="button" data-m="login" class="${mode === 'login' ? 'on' : ''}">${W('Sign in', 'دخول')}</button><button type="button" data-m="register" class="${mode === 'register' ? 'on' : ''}">${W('Create account', 'حساب جديد')}</button></div>
      <h3>${mode === 'login' ? W('Welcome back', 'أهلا بيك تاني') : W('Create your account', 'اعمل حسابك')}</h3>
      <label>${W('Username (3-20 letters, digits or _)', 'اسم المستخدم (٣-٢٠ حرف إنجليزي أو رقم أو _)')}<input name="username" autocomplete="username" required maxlength="20" autocapitalize="none"></label>
      <label>${W('Password (8+ characters)', 'كلمة السر (٨ حروف على الأقل)')}<input name="password" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required minlength="${mode === 'login' ? 1 : 8}" maxlength="100"></label>
      <div class="err" id="geErr"></div><div class="row" style="display:flex;gap:8px"><button type="button" id="geCancel">${W('Cancel', 'إلغاء')}</button><button class="go" type="submit">${mode === 'login' ? W('Sign in', 'دخول') : W('Create', 'إنشاء')}</button></div>
      <div class="hint">${W('Your progress on this device can be moved to the account after you sign in.', 'تقدمك على الجهاز ده ممكن يتنقل للحساب بعد الدخول.')}</div></form>`;
    document.body.append(el);
    el.querySelectorAll('.tabs button').forEach(b => b.onclick = () => C.open(b.dataset.m));
    el.querySelector('#geCancel').onclick = () => el.remove();
    el.onclick = e => { if (e.target === el) el.remove(); };
    el.querySelector('form').onsubmit = async e => {
      e.preventDefault(); const f = e.target, err = el.querySelector('#geErr'); err.textContent = '';
      const r = await api('/api/' + (mode === 'login' ? 'login' : 'register'), 'POST', { username: f.username.value.trim(), password: f.password.value });
      if (r.s === 200 || r.s === 201) { C.user = r.j.username; C.role = r.j.role || 'player'; el.remove(); await pull(true); startPoll(); refreshUI(); return; }
      err.textContent = r.s === 503 ? (r.j.message || W('Maintenance right now.', 'صيانة دلوقتي.')) : r.s === 401 ? W('Wrong username or password.', 'اسم المستخدم أو كلمة السر غلط.') : r.s === 409 ? W('Username taken.', 'الاسم ده مستخدم.')
        : r.s === 429 ? W('Too many attempts. Try later.', 'محاولات كتير. جرّب بعدين.') : r.s === 403 ? (r.j.banned ? W('This account is banned.', 'الحساب ده محظور.') : W('Registration is closed right now.', 'التسجيل مقفول دلوقتي.')) : (r.j.error || W('Something went wrong.', 'حصل خطأ.'));
    };
    el.querySelector('input').focus();
  };
  C.logout = async function () {
    if (C.dirty || inflight) { await push(true); await new Promise(r => setTimeout(r, 400)); if (C.dirty && !confirm(W('Your last changes did not sync. Sign out anyway?', 'آخر تغييراتك ماتزامنتش. تسجّل خروج برضه؟'))) return; }
    await api('/api/logout', 'POST', {});
    const keep = { lang: S.lang, theme: S.theme };
    C.user = null; C.role = null; C.state = 'guest'; C.rev = 0; clearTimeout(pollId);
    try { localStorage.removeItem(DEMO_KEY); } catch (e) {}
    applying = true; try { applyState(fresh()); S.lang = keep.lang; S.theme = keep.theme; S.scr = 'home'; render(); } finally { applying = false; }
    UI2.close();
  };
  function startPoll() {
    clearTimeout(pollId);
    const tick = async () => {
      if (C.user && !document.hidden && !C.dirty && !inflight && !(typeof racing !== 'undefined' && racing)) {
        const r = await api('/api/save').catch(() => null);
        if (r && r.s === 200 && r.j.rev !== C.rev && !C.dirty) applyServer(r.j.data, r.j.rev, r.j.byAdmin ? W('The owner updated your account.', 'المالك عدّل في حسابك.') : '');
        else if (r && (r.s === 401 || r.s === 403)) { C.user = null; setState(r.s === 403 ? 'banned' : 'expired'); }
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
      if (r.s === 200) { C.user = r.j.username; C.role = r.j.role; await pull(true); startPoll(); }
      else if (r.s === 403 && r.j.banned) { setState('banned', r.j.reason || ''); }
    } catch (e) {}
    refreshUI();
  })();
})();
