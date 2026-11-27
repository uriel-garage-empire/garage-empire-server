'use strict';
const $ = s => document.querySelector(s);
const T = {
ar:{ownerOnly:'لوحة تحكم المالك فقط',username:'اسم المستخدم',password:'كلمة السر',signin:'دخول',owner:'المالك',logout:'خروج',
tabOverview:'نظرة عامة',tabPlayers:'اللاعبين',tabGame:'التحكم في اللعبة',tabAudit:'السجل',tabChat:'الشات',chatReports:'البلاغات',chatRecent:'آخر رسايل الشات العام',del:'مسح',mute:'كتم ساعة',unmute:'فك الكتم',dismiss:'تجاهل',by:'من',rep:'بلّغ',
players:'لاعب',newDay:'جدد (٢٤ ساعة)',newWeek:'جدد (٧ أيام)',active:'نشطين (٢٤ ساعة)',banned:'محظورين',cash:'إجمالي الفلوس',cars:'إجمالي العربيات',wins:'إجمالي الانتصارات',
richest:'أغنى اللاعبين',popular:'أكتر عربيات مملوكة',none:'لا يوجد',search:'ابحث باسم اللاعب',sortCreated:'الأحدث',sortCash:'الأغنى',sortWins:'الأكتر فوزا',sortSeen:'آخر نشاط',sortName:'الاسم',
prev:'السابق',next:'التالي',of:'من',noSave:'مفيش حفظ سحابي',bannedTag:'محظور',
cashL:'الفلوس (USD)',winsL:'الانتصارات',garage:'الجراج',remove:'شيل',addCar:'إضافة عربية',add:'إضافة',set:'تعيين',
ban:'حظر',unban:'فك الحظر',reason:'سبب الحظر (اختياري)',forceLogout:'تسجيل خروج من كل الأجهزة',resetPw:'إعادة تعيين كلمة السر',delete:'حذف الحساب',resetSave:'مسح التقدم',
joined:'انضم',lastLogin:'آخر دخول',lastSave:'آخر حفظ',never:'أبدا',close:'إغلاق',
pwNote:'كلمة سر مؤقتة تظهر مرة واحدة. ابعتها للاعب بنفسك.',confirmDel:'اكتب اسم اللاعب للتأكيد',confirmReset:'تمسح تقدم اللاعب بالكامل؟',
editNote:'التعديل بيوصل للاعب في حفظه التلقائي الجاي، واللعبة بتحمّل نسختك وتنبّهه.',
maint:'وضع الصيانة',maintD:'بيوقف الدخول والحفظ لكل اللاعبين ما عدا إنت',maintMsg:'رسالة الصيانة',
ann:'إعلان للاعبين',annD:'يظهر شريط في اللعبة',annText:'نص الإعلان',lvInfo:'معلومة',lvWarn:'تحذير',lvGood:'خبر حلو',
reg:'التسجيل مفتوح',regD:'اقفله لو مش عايز حسابات جديدة',save:'حفظ',saved:'اتحفظ',done:'تم',
econ:'تعديل الأسعار والمكافآت جاي لاحقا: الاقتصاد لسه بيتحسب جوه المتصفح.',
audit:'آخر ٢٠٠ إجراء',bad:'اسم المستخدم أو كلمة السر غلط',notOwner:'الحساب ده مش مالك',err:'حصل خطأ'},
en:{ownerOnly:'Owner-only control panel',username:'Username',password:'Password',signin:'Sign in',owner:'OWNER',logout:'Log out',
tabOverview:'Overview',tabPlayers:'Players',tabGame:'Game control',tabAudit:'Audit log',tabChat:'Chat',chatReports:'Reports',chatRecent:'Recent global chat',del:'Delete',mute:'Mute 1h',unmute:'Unmute',dismiss:'Dismiss',by:'From',rep:'reported by',
players:'Players',newDay:'New (24h)',newWeek:'New (7d)',active:'Active (24h)',banned:'Banned',cash:'Total cash',cars:'Total cars',wins:'Total wins',
richest:'Richest players',popular:'Most owned cars',none:'None',search:'Search username',sortCreated:'Newest',sortCash:'Richest',sortWins:'Most wins',sortSeen:'Last active',sortName:'Name',
prev:'Prev',next:'Next',of:'of',noSave:'No cloud save',bannedTag:'banned',
cashL:'Cash (USD)',winsL:'Wins',garage:'Garage',remove:'Remove',addCar:'Add a car',add:'Add',set:'Set',
ban:'Ban',unban:'Unban',reason:'Ban reason (optional)',forceLogout:'Log out all devices',resetPw:'Reset password',delete:'Delete account',resetSave:'Wipe progress',
joined:'Joined',lastLogin:'Last login',lastSave:'Last save',never:'never',close:'Close',
pwNote:'Temporary password, shown once. Send it to the player yourself.',confirmDel:'Type the username to confirm',confirmReset:'Wipe all of this player\'s progress?',
editNote:'The player\'s game picks up the edit on its next save and shows them a notice, so it is not overwritten.',
maint:'Maintenance mode',maintD:'Blocks login and saving for every player except you',maintMsg:'Maintenance message',
ann:'Announcement',annD:'Shows a banner in the game',annText:'Announcement text',lvInfo:'Info',lvWarn:'Warning',lvGood:'Good news',
reg:'Registration open',regD:'Close it to stop new accounts',save:'Save',saved:'Saved',done:'Done',
econ:'Price and reward tuning comes later: the economy is still computed in the browser.',
audit:'Last 200 actions',bad:'Wrong username or password',notOwner:'This account is not the owner',err:'Something went wrong'}};
let lang = localStorage.getItem('ge-admin-lang') || 'ar', cars = [], pageState = { q: '', sort: 'created', page: 0 };
const t = k => T[lang][k] || k;
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, ''); else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
const fmt = n => Number(n || 0).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: 0 });
const usd = n => '$' + fmt(n);
const when = d => d ? new Date(d).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : t('never');
const carName = id => { const c = cars[id]; return c ? `${c.name} ${c.year}` : '#' + id; };
function toast(msg, bad) { const e = $('#toast'); e.textContent = msg; e.className = 'toast show' + (bad ? ' bad' : ''); clearTimeout(toast.t); toast.t = setTimeout(() => e.className = 'toast', 2600); }
async function api(path, method = 'GET', body) {
  const r = await fetch('/api/admin' + path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 || r.status === 403 && j.error === 'Owner only') { showLogin(); throw new Error(j.error); }
  if (!r.ok) { toast(j.error || t('err'), true); throw new Error(j.error || 'err'); }
  return j;
}
function applyLang() {
  document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-t]').forEach(e => e.textContent = t(e.dataset.t));
  $('#lang').textContent = lang === 'ar' ? 'EN' : 'ع';
}
function showLogin() { $('#app').classList.add('hidden'); $('#login').classList.remove('hidden'); }
function showApp() { $('#login').classList.add('hidden'); $('#app').classList.remove('hidden'); }

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault(); $('#loginErr').textContent = '';
  const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: $('#u').value, password: $('#p').value }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { $('#loginErr').textContent = r.status === 401 ? t('bad') : (j.error || t('err')); return; }
  $('#p').value = '';
  if (j.role !== 'owner') { await fetch('/api/logout', { method: 'POST' }); $('#loginErr').textContent = t('notOwner'); return; }
  boot();
});
$('#logout').onclick = async () => { await fetch('/api/logout', { method: 'POST' }); showLogin(); };
$('#lang').onclick = () => { lang = lang === 'ar' ? 'en' : 'ar'; localStorage.setItem('ge-admin-lang', lang); applyLang(); renderTab(curTab); };
let curTab = 'overview';
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; curTab = b.dataset.tab; renderTab(curTab); });
function renderTab(name) {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('.pane').forEach(p => p.classList.toggle('hidden', p.id !== name));
  ({ overview: rOverview, players: rPlayers, game: rGame, chat: rChat, audit: rAudit })[name]();
}

async function rOverview() {
  const s = await api('/stats'), el = $('#overview');
  const stat = (n, l) => h('div', { class: 'card stat' }, h('div', { class: 'n' }, n), h('div', { class: 'l' }, l));
  el.replaceChildren(
    h('div', { class: 'grid' }, stat(fmt(s.total), t('players')), stat(fmt(s.active24), t('active')), stat(fmt(s.new24), t('newDay')), stat(fmt(s.new7), t('newWeek')), stat(fmt(s.banned), t('banned')),
      stat(usd(s.economy.cash), t('cash')), stat(fmt(s.economy.cars), t('cars')), stat(fmt(s.economy.wins), t('wins'))),
    h('div', { class: 'two' },
      h('div', { class: 'card' }, h('h2', {}, t('richest')), s.richest.length ? s.richest.map(p => h('div', { class: 'row' }, h('span', {}, p.username), h('span', { class: 'num' }, usd(p.usd)))) : h('div', { class: 'note' }, t('none'))),
      h('div', { class: 'card' }, h('h2', {}, t('popular')), s.popularCars.length ? s.popularCars.map(p => h('div', { class: 'row' }, h('span', {}, carName(p.cid)), h('span', { class: 'num' }, '×' + p.n))) : h('div', { class: 'note' }, t('none')))));
}

async function rPlayers() {
  const el = $('#players'), st = pageState;
  const d = await api(`/players?q=${encodeURIComponent(st.q)}&sort=${st.sort}&page=${st.page}`);
  const search = h('input', { type: 'search', placeholder: t('search'), value: st.q });
  search.addEventListener('keydown', e => { if (e.key === 'Enter') { st.q = search.value; st.page = 0; rPlayers(); } });
  const sel = h('select', { onchange: e => { st.sort = e.target.value; st.page = 0; rPlayers(); } },
    ...['created', 'cash', 'wins', 'seen', 'name'].map(k => h('option', { value: k, selected: st.sort === k }, t('sort' + k[0].toUpperCase() + k.slice(1)))));
  const pages = Math.max(1, Math.ceil(d.total / d.size));
  el.replaceChildren(h('div', { class: 'bar' }, search, sel),
    h('div', { class: 'plist' }, d.players.map(p => h('div', { class: 'prow', tabindex: 0, onclick: () => openPlayer(p.id) },
      h('div', {}, h('div', { class: 'nm' }, p.username + ' '), h('div', { class: 'mu' }, when(p.created_at)),
        p.banned ? h('span', { class: 'tag bad' }, t('bannedTag')) : null, p.role === 'owner' ? h('span', { class: 'tag ok' }, t('owner')) : null),
      h('div', { class: 'num' }, p.usd != null ? usd(p.usd) : t('noSave')),
      h('div', { class: 'num' }, p.wins != null ? `${t('winsL')}: ${fmt(p.wins)}` : ''),
      h('div', { class: 'num' }, p.cars != null ? `${t('garage')}: ${p.cars}` : ''),
      h('div', { class: 'mu' }, when(p.save_at))))),
    h('div', { class: 'pager' }, h('button', { class: 'btn sm', disabled: st.page <= 0, onclick: () => { st.page--; rPlayers(); } }, t('prev')),
      `${st.page + 1} ${t('of')} ${pages}`, h('button', { class: 'btn sm', disabled: st.page + 1 >= pages, onclick: () => { st.page++; rPlayers(); } }, t('next'))));
}

function closeDrawer() { $('#drawer').classList.add('hidden'); }
$('#drawerBg').onclick = closeDrawer;
async function openPlayer(id) {
  const { player: p } = await api('/players/' + id), box = $('#drawerBox'), d = p.data;
  const act = async (path, method, body, ok) => { const r = await api(path, method, body); toast(ok || t('done')); return r; };
  const refresh = () => openPlayer(id);
  const cash = h('input', { type: 'number', min: 0, step: '0.01', value: d ? d.usd : '' }), wins = h('input', { type: 'number', min: 0, step: 1, value: d ? d.wins : '' });
  const addSel = h('select', {}, ...cars.map(c => h('option', { value: c.id }, `${c.name} ${c.year}`)));
  const reason = h('input', { placeholder: t('reason') });
  const o = p.role === 'owner';
  box.replaceChildren(...[
    h('div', { class: 'inl' }, h('h3', { style: 'margin:0;flex:1' }, p.username), p.banned ? h('span', { class: 'tag bad' }, t('bannedTag')) : null, h('button', { class: 'btn sm', onclick: closeDrawer }, t('close'))),
    h('div', { class: 'note' }, `${t('joined')}: ${when(p.created_at)} · ${t('lastLogin')}: ${when(p.last_login_at)} · ${t('lastSave')}: ${when(p.save_at)}`),
    p.banned && p.ban_reason ? h('div', { class: 'note' }, p.ban_reason) : null,
    d && !o ? h('div', { class: 'sec' },
      h('div', { class: 'inl' }, h('label', { style: 'flex:1' }, t('cashL'), cash), h('button', { class: 'btn sm', onclick: async () => { await act(`/players/${id}/save`, 'POST', { op: 'setCash', value: Number(cash.value) }); refresh(); } }, t('set'))),
      h('div', { class: 'inl' }, h('label', { style: 'flex:1' }, t('winsL'), wins), h('button', { class: 'btn sm', onclick: async () => { await act(`/players/${id}/save`, 'POST', { op: 'setWins', value: Number(wins.value) }); refresh(); } }, t('set'))),
      h('div', { class: 'note' }, t('garage') + ` (${d.own.length}/8)`),
      h('div', { class: 'cars' }, d.own.map(c => h('div', { class: 'car' }, h('span', {}, carName(c.cid)), h('button', { class: 'btn sm danger', onclick: async () => { await act(`/players/${id}/save`, 'POST', { op: 'removeCar', carId: c.id }); refresh(); } }, t('remove'))))),
      h('div', { class: 'inl' }, addSel, h('button', { class: 'btn sm', onclick: async () => { await act(`/players/${id}/save`, 'POST', { op: 'addCar', cid: Number(addSel.value) }); refresh(); } }, t('addCar'))),
      h('div', { class: 'note' }, t('editNote'))) : (!o ? h('div', { class: 'note' }, t('noSave')) : null),
    !o ? h('div', { class: 'sec' },
      p.banned ? h('button', { class: 'btn', onclick: async () => { await act(`/players/${id}/unban`, 'POST', {}); refresh(); } }, t('unban'))
        : h('div', { class: 'inl' }, reason, h('button', { class: 'btn danger', onclick: async () => { await act(`/players/${id}/ban`, 'POST', { reason: reason.value }); refresh(); } }, t('ban'))),
      h('button', { class: 'btn', onclick: async () => { await act(`/players/${id}/logout`, 'POST', {}); } }, t('forceLogout')),
      h('button', { class: 'btn', onclick: async () => { const r = await api(`/players/${id}/reset-password`, 'POST', {}); const pw = h('div', { class: 'pw' }, r.temporaryPassword); box.append(h('div', { class: 'sec' }, pw, h('div', { class: 'note' }, t('pwNote')))); } }, t('resetPw')),
      d ? h('button', { class: 'btn danger', onclick: async () => { if (confirm(t('confirmReset'))) { await act(`/players/${id}/save`, 'POST', { op: 'reset' }); refresh(); } } }, t('resetSave')) : null,
      h('button', { class: 'btn danger', onclick: async () => { const n = prompt(t('confirmDel') + ': ' + p.username); if (n === null) return; await act('/players/' + id, 'DELETE', { confirm: n }); closeDrawer(); rPlayers(); } }, t('delete'))) : null].filter(Boolean));
  $('#drawer').classList.remove('hidden');
}

async function rGame() {
  const s = await api('/settings'), el = $('#game');
  const mOn = h('input', { type: 'checkbox', class: 'sw', checked: s.maintenance.on }), mMsg = h('input', { value: s.maintenance.message, placeholder: t('maintMsg'), maxlength: 300 });
  const aOn = h('input', { type: 'checkbox', class: 'sw', checked: s.announcement.active }), aTx = h('input', { value: s.announcement.text, placeholder: t('annText'), maxlength: 300 });
  const aLv = h('select', {}, ...[['info', 'lvInfo'], ['warn', 'lvWarn'], ['good', 'lvGood']].map(([v, k]) => h('option', { value: v, selected: s.announcement.level === v }, t(k))));
  const rOp = h('input', { type: 'checkbox', class: 'sw', checked: s.registration.open });
  const sv = (body) => async () => { await api('/settings', 'PUT', body()); toast(t('saved')); };
  const block = (title, desc, sw, ...rest) => h('div', { class: 'card sec' }, h('div', { class: 'toggle' }, h('div', {}, h('b', {}, title), h('div', { class: 'note' }, desc)), sw), ...rest);
  el.replaceChildren(
    block(t('maint'), t('maintD'), mOn, mMsg, h('button', { class: 'btn primary', onclick: sv(() => ({ maintenance: { on: mOn.checked, message: mMsg.value } })) }, t('save'))),
    block(t('ann'), t('annD'), aOn, aTx, aLv, h('button', { class: 'btn primary', onclick: sv(() => ({ announcement: { active: aOn.checked, text: aTx.value, level: aLv.value } })) }, t('save'))),
    block(t('reg'), t('regD'), rOp, h('button', { class: 'btn primary', onclick: sv(() => ({ registration: { open: rOp.checked } })) }, t('save'))),
    h('div', { class: 'note' }, t('econ')));
  el.style.display = 'grid'; el.style.gap = '12px';
}

async function rChat() {
  const d = await api('/social/chat'), el = $('#chat');
  const act = (path, body, ok) => async () => { await api(path, 'POST', body); toast(ok || t('done')); rChat(); };
  const line = (m, extra) => h('div', { class: 'row' }, h('span', { class: 'tm' }, when(m.ts)), h('b', {}, m.username || m.sender), h('span', {}, m.text), ...extra);
  el.replaceChildren(
    h('div', { class: 'card log' }, h('h2', {}, t('chatReports')), d.reports.length ? d.reports.map(r => h('div', {}, line(r, [h('span', { class: 'note' }, t('rep') + ' ' + r.reporter)]),
      h('button', { class: 'btn ghost', onclick: act('/social/delete', { id: r.mid }) }, t('del')), h('button', { class: 'btn ghost', onclick: act('/social/mute', { userId: r.sid, minutes: 60 }) }, t('mute')), h('button', { class: 'btn ghost', onclick: act('/social/dismiss', { id: r.id }) }, t('dismiss')))) : h('div', { class: 'note' }, t('none'))),
    h('div', { class: 'card log' }, h('h2', {}, t('chatRecent')), d.messages.length ? d.messages.filter(m => !m.deleted).map(m => h('div', {}, line(m, []),
      h('button', { class: 'btn ghost', onclick: act('/social/delete', { id: m.id }) }, t('del')), h('button', { class: 'btn ghost', onclick: act('/social/mute', { userId: m.uid, minutes: 60 }) }, t('mute')), h('button', { class: 'btn ghost', onclick: act('/social/mute', { userId: m.uid, minutes: 0 }) }, t('unmute')))) : h('div', { class: 'note' }, t('none'))));
  el.style.display = 'grid'; el.style.gap = '12px';
}

async function rAudit() {
  const { entries } = await api('/audit'), el = $('#audit');
  el.replaceChildren(h('div', { class: 'card log' }, h('h2', {}, t('audit')), entries.length ? entries.map(e => h('div', { class: 'row' },
    h('span', { class: 'tm' }, when(e.ts)), h('b', {}, e.actor), h('span', {}, e.action + (e.target ? ' → ' + e.target : '') + (e.detail ? ' ' + JSON.stringify(e.detail) : '')))) : h('div', { class: 'note' }, t('none'))));
}

async function boot() {
  applyLang();
  try {
    await api('/me'); if (!cars.length) cars = await (await fetch('cars.json')).json();
    showApp(); renderTab(curTab);
  } catch { showLogin(); }
}
boot();
