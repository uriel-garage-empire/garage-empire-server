/* Shows the owner's announcement banner and maintenance screen. Reads /api/status only. */
(function () {
  function show(s) {
    const old = document.getElementById('ge-status'); if (old) old.remove(); document.body.style.paddingTop = '';
    let el;
    if (s.maintenance && s.maintenance.on) {
      el = document.createElement('div');
      el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#07080f;color:#e8ecff;display:grid;place-items:center;text-align:center;padding:24px;font:18px system-ui,sans-serif';
      const b = document.createElement('div'); b.textContent = (s.maintenance.message || 'Maintenance. Back soon / صيانة، راجعين قريب'); el.append(b);
    } else if (s.announcement) {
      const c = { info: '#0aa7c0', warn: '#b8860b', good: '#1f9d63' }[s.announcement.level] || '#0aa7c0';
      el = document.createElement('div');
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99998;background:' + c + ';color:#fff;text-align:center;padding:8px 12px;font:14px system-ui,sans-serif';
      el.textContent = s.announcement.text;
    }
    if (el) { el.id = 'ge-status'; document.body.append(el); if (!(s.maintenance && s.maintenance.on)) document.body.style.paddingTop = el.offsetHeight + 'px'; }
  }
  function poll() { fetch('/api/status', { cache: 'no-store' }).then(r => r.json()).then(show).catch(() => {}); }
  poll(); setInterval(poll, 60000);
})();
