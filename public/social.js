/* Garage Empire social layer: global chat, private messages with friends, friend requests, block and report.
   Needs a signed-in account (cloud.js starts it after sign-in). No game rules or save data are touched. */
(function () {
  'use strict';
  const ar = () => (typeof S !== 'undefined' && S.lang === 'ar');
  const W = (e, a) => (ar() ? a : e);
  const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const api = async (path, method, body) => {
    const r = await fetch('/api/social' + path, { method: method || 'GET', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await r.json(); } catch (e) {}
    return { s: r.status, j: j || {} };
  };
  const SEEN = 'ge-seen-dm';
  const Soc = window.Social = { started: false };
  let btn, panel, tab = 'global', dmWith = null, lastId = '0', timer = 0, sumTimer = 0, open = false, friends = null, busy = false;

  function css() {
    if (document.getElementById('geSocCss')) return;
    const s = document.createElement('style'); s.id = 'geSocCss';
    s.textContent = '#geSocBtn{position:fixed;z-index:800;bottom:84px;inset-inline-end:14px;width:52px;height:52px;border-radius:50%;border:0;background:linear-gradient(135deg,#ff5a1f,#ff2d95);color:#fff;font-size:22px;box-shadow:0 6px 18px #0008;cursor:pointer}#geSocBtn i{position:absolute;top:-4px;inset-inline-end:-4px;min-width:20px;height:20px;border-radius:10px;background:#19c37d;color:#04110b;font:700 12px/20px sans-serif;font-style:normal;padding:0 5px}'
      + '#geSoc{position:fixed;z-index:850;inset:0;background:#000a;display:grid;place-items:end center}#geSoc .pn{width:100%;max-width:520px;height:min(86vh,640px);background:#0f1220;border:1px solid #2a3050;border-top:3px solid #ff5a1f;border-radius:16px 16px 0 0;display:flex;flex-direction:column;color:#e8ecff;font-family:inherit}'
      + '#geSoc .hd{display:flex;align-items:center;gap:6px;padding:10px;border-bottom:1px solid #2a3050}#geSoc .hd b{flex:1}#geSoc .hd button,#geSoc .tb button{background:#151a2e;color:#e8ecff;border:1px solid #2a3050;border-radius:10px;min-height:40px;padding:0 12px;font:inherit;cursor:pointer}#geSoc .tb{display:flex;gap:6px;padding:8px 10px}#geSoc .tb button{flex:1;position:relative}#geSoc .tb .on{border-color:#ff5a1f;color:#ff8a54}#geSoc .tb em{font-style:normal;background:#19c37d;color:#04110b;border-radius:9px;padding:0 6px;font-size:11px;margin-inline-start:4px}'
      + '#geSoc .bd{flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:8px}#geSoc .m{background:#151a2e;border-radius:12px;padding:8px 10px;max-width:88%;align-self:flex-start;overflow-wrap:anywhere}#geSoc .m.me{align-self:flex-end;background:#2a1f3a}#geSoc .m small{display:block;color:#9aa3c7;font-size:11px;margin-bottom:2px}#geSoc .m a{color:#ff6b84;font-size:11px;cursor:pointer;margin-inline-start:8px}'
      + '#geSoc form{display:flex;gap:6px;padding:10px;border-top:1px solid #2a3050}#geSoc input{flex:1;min-width:0;background:#0a0d1a;color:#e8ecff;border:1px solid #2a3050;border-radius:10px;padding:10px;font:inherit;min-height:44px}#geSoc form button{min-width:70px;border:0;border-radius:10px;background:linear-gradient(90deg,#ff5a1f,#ff2d95);color:#fff;font:700 14px inherit;cursor:pointer}'
      + '#geSoc .rw{display:flex;align-items:center;gap:6px;background:#151a2e;border-radius:10px;padding:8px 10px}#geSoc .rw span{flex:1;overflow-wrap:anywhere}#geSoc .rw button{background:#1c2340;color:#e8ecff;border:1px solid #2a3050;border-radius:8px;min-height:34px;padding:0 10px;font:inherit;cursor:pointer}#geSoc .sec{color:#9aa3c7;font-size:12px;margin-top:6px}#geSoc .er{color:#ff6b84;font-size:13px;min-height:16px;padding:0 10px}';
    document.head.append(s);
  }
  function ensureBtn() {
    css(); if (btn) return;
    btn = document.createElement('button'); btn.id = 'geSocBtn'; btn.setAttribute('aria-label', 'Chat'); btn.innerHTML = '💬<i hidden></i>'; btn.onclick = openPanel; document.body.append(btn);
  }
  function badge(n) { const i = btn && btn.querySelector('i'); if (!i) return; i.hidden = !n; i.textContent = n > 9 ? '9+' : n; }
  async function summary() {
    if (!Soc.started) return;
    const r = await api('/summary?seenDm=' + (localStorage.getItem(SEEN) || '0')).catch(() => null);
    if (r && r.s === 200) { Soc.sum = r.j; badge((r.j.requests || 0) + (r.j.dms || 0)); }
    sumTimer = setTimeout(summary, open ? 30000 : 20000);
  }
  Soc.start = function () { if (Soc.started) return; Soc.started = true; ensureBtn(); btn.hidden = false; summary(); };
  Soc.stop = function () { Soc.started = false; clearTimeout(sumTimer); clearTimeout(timer); if (btn) btn.hidden = true; if (panel) closePanel(); friends = null; };

  function openPanel() { open = true; css(); panel = document.createElement('div'); panel.id = 'geSoc'; panel.dir = ar() ? 'rtl' : 'ltr'; panel.onclick = e => { if (e.target === panel) closePanel(); }; document.body.append(panel); show(tab); }
  function closePanel() { open = false; clearTimeout(timer); if (panel) panel.remove(); panel = null; }
  function frame(title, inner, extra) {
    const reqN = friends ? friends.incoming.length : 0, dmN = (Soc.sum && Soc.sum.dms) || 0;
    panel.innerHTML = `<div class="pn"><div class="hd"><b>${title}</b><button id="gsX">✕</button></div>
      <div class="tb"><button data-t="global" class="${tab === 'global' ? 'on' : ''}">${W('Global chat', 'الشات العام')}</button><button data-t="dm" class="${tab === 'dm' ? 'on' : ''}">${W('Messages', 'الرسايل')}${dmN ? `<em>${dmN}</em>` : ''}</button><button data-t="friends" class="${tab === 'friends' ? 'on' : ''}">${W('Friends', 'الأصحاب')}${reqN ? `<em>${reqN}</em>` : ''}</button></div>${inner}</div>`;
    panel.querySelector('#gsX').onclick = closePanel;
    panel.querySelectorAll('.tb button').forEach(b => b.onclick = () => { dmWith = b.dataset.t === 'dm' ? null : dmWith; show(b.dataset.t); });
  }
  async function loadFriends() { const r = await api('/friends'); if (r.s === 200) friends = r.j; return friends; }
  function show(t) { tab = t; clearTimeout(timer); lastId = '0'; if (t === 'friends') return showFriends(); if (t === 'dm' && !dmWith) return showDmList(); return showChat(t === 'dm' ? dmWith : null); }

  function msgHTML(m) {
    const me = m.username === Cloud.user;
    return `<div class="m${me ? ' me' : ''}" data-id="${esc(m.id)}"><small>${esc(m.username)}${me ? '' : `<a data-rp="${esc(m.id)}">${W('Report', 'بلّغ')}</a>`}</small>${esc(m.text)}</div>`;
  }
  async function showChat(who) {
    await loadFriends();
    frame(who ? esc(who) : W('Global chat', 'الشات العام'), `<div class="bd" id="gsBd"></div><div class="er" id="gsEr"></div><form id="gsF"><input id="gsI" maxlength="300" autocomplete="off" placeholder="${W('Write a message', 'اكتب رسالة')}"><button>${W('Send', 'ابعت')}</button></form>`);
    const bd = panel.querySelector('#gsBd'), er = panel.querySelector('#gsEr');
    const pull = async () => {
      if (!panel || busy) return; busy = true;
      const r = await api('/chat?with=' + encodeURIComponent(who || 'global') + '&after=' + lastId).catch(() => null); busy = false;
      if (!panel) return;
      if (r && r.s === 200 && r.j.messages.length) {
        const atEnd = bd.scrollHeight - bd.scrollTop - bd.clientHeight < 60 || lastId === '0';
        bd.insertAdjacentHTML('beforeend', r.j.messages.map(msgHTML).join('')); lastId = r.j.messages[r.j.messages.length - 1].id;
        if (who) { localStorage.setItem(SEEN, Soc.sum && Soc.sum.lastDm || lastId); summary(); }
        if (atEnd) bd.scrollTop = bd.scrollHeight;
      } else if (r && r.s === 403) er.textContent = r.j.error || '';
      else if (r && r.s === 401) { closePanel(); return; }
      timer = setTimeout(pull, 4000);
    };
    bd.onclick = async e => { const a = e.target.closest('[data-rp]'); if (!a) return; if (!confirm(W('Report this message to the owner?', 'تبلّغ المالك عن الرسالة دي؟'))) return; const r = await api('/report', 'POST', { messageId: a.dataset.rp }); er.textContent = r.s === 200 ? W('Reported. Thank you.', 'اتبلّغ. شكرا.') : (r.j.error || ''); };
    panel.querySelector('#gsF').onsubmit = async e => {
      e.preventDefault(); const i = panel.querySelector('#gsI'), text = i.value.trim(); if (!text) return; er.textContent = '';
      const r = await api('/chat', 'POST', { text, to: who || 'global' });
      if (r.s === 201) { i.value = ''; clearTimeout(timer); pull(); } else er.textContent = r.j.error || W('Could not send.', 'مقدرتش أبعت.');
    };
    pull();
  }
  async function showDmList() {
    await loadFriends(); const list = friends ? friends.friends : [];
    frame(W('Messages', 'الرسايل'), `<div class="bd">${list.length ? list.map(n => `<div class="rw"><span>${esc(n)}</span><button data-dm="${esc(n)}">${W('Chat', 'محادثة')}</button></div>`).join('') : `<div class="sec">${W('Add friends to send private messages.', 'ضيف أصحاب عشان تبعتلهم رسايل خاصة.')}</div>`}</div>`);
    panel.querySelectorAll('[data-dm]').forEach(b => b.onclick = () => { dmWith = b.dataset.dm; show('dm'); });
  }
  async function showFriends(msg) {
    await loadFriends(); const f = friends || { friends: [], incoming: [], outgoing: [], blocked: [] };
    const row = (n, btns) => `<div class="rw"><span>${esc(n)}</span>${btns}</div>`;
    frame(W('Friends', 'الأصحاب'), `<div class="bd"><form id="gsA" style="display:flex;gap:6px;padding:0;border:0"><input id="gsU" maxlength="20" placeholder="${W('Add by username', 'ضيف باسم المستخدم')}" autocapitalize="none"><button>${W('Add', 'ضيف')}</button></form><div class="er" id="gsEr" style="padding:0">${esc(msg || '')}</div>
      ${f.incoming.length ? `<div class="sec">${W('Requests', 'الطلبات')}</div>` + f.incoming.map(n => row(n, `<button data-ok="${esc(n)}">${W('Accept', 'قبول')}</button><button data-no="${esc(n)}">${W('Decline', 'رفض')}</button>`)).join('') : ''}
      <div class="sec">${W('Friends', 'الأصحاب')} (${f.friends.length})</div>${f.friends.length ? f.friends.map(n => row(n, `<button data-dm="${esc(n)}">${W('Message', 'رسالة')}</button><button data-rm="${esc(n)}">${W('Remove', 'شيل')}</button><button data-bl="${esc(n)}">${W('Block', 'حظر')}</button>`)).join('') : `<div class="sec">${W('No friends yet.', 'لسه معندكش أصحاب.')}</div>`}
      ${f.outgoing.length ? `<div class="sec">${W('Sent requests', 'طلبات مبعوتة')}</div>` + f.outgoing.map(n => row(n, `<button data-no="${esc(n)}">${W('Cancel', 'إلغاء')}</button>`)).join('') : ''}
      ${f.blocked.length ? `<div class="sec">${W('Blocked', 'المحظورين')}</div>` + f.blocked.map(n => row(n, `<button data-ub="${esc(n)}">${W('Unblock', 'فك الحظر')}</button>`)).join('') : ''}</div>`);
    const go = async (path, body, ok) => { const r = await api(path, 'POST', body); await showFriends(r.s === 200 ? ok : (r.j.error || '')); summary(); };
    const on = (sel, fn) => panel.querySelectorAll(sel).forEach(b => b.onclick = () => fn(b));
    on('[data-ok]', b => go('/friends/respond', { username: b.dataset.ok, accept: true }, W('Friend added.', 'اتضاف.')));
    on('[data-no]', b => go('/friends/respond', { username: b.dataset.no, accept: false }, ''));
    on('[data-rm]', b => confirm(W('Remove this friend?', 'تشيل الصاحب ده؟')) && go('/friends/remove', { username: b.dataset.rm }, ''));
    on('[data-bl]', b => confirm(W('Block this player? Their messages will be hidden.', 'تحظر اللاعب ده؟ رسايله هتختفي.')) && go('/block', { username: b.dataset.bl }, ''));
    on('[data-ub]', b => go('/unblock', { username: b.dataset.ub }, ''));
    on('[data-dm]', b => { dmWith = b.dataset.dm; show('dm'); });
    panel.querySelector('#gsA').onsubmit = e => { e.preventDefault(); const v = panel.querySelector('#gsU').value.trim(); if (v) go('/friends/request', { username: v }, W('Request sent.', 'الطلب اتبعت.')); };
  }
})();
