'use strict';
// Owner-only admin API. Every route re-checks role='owner' in the database; the JWT alone is never enough.
const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const { normalize } = require('./public/save-schema');

const MAX_OWN = 8;
const DEFAULTS = {
  maintenance: { on: false, message: '' },
  announcement: { active: false, text: '', level: 'info' },
  registration: { open: true }
};
const LEVELS = ['info', 'warn', 'good'];

module.exports = function createAdmin({ pool, requireAuth, bumpTokens }) {
  const router = express.Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.use(requireAuth);
  const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  router.use(wrap(async (req, res, next) => {
    const { rows } = await pool.query('SELECT id,username,role FROM users WHERE id=$1', [req.user.id]);
    if (!rows[0] || rows[0].role !== 'owner') return res.status(403).json({ error: 'Owner only' });
    req.owner = rows[0];
    next();
  }));

  const audit = (req, action, target, detail) =>
    pool.query('INSERT INTO audit_log(actor,action,target,detail) VALUES($1,$2,$3,$4)',
      [req.owner.username, action, target == null ? null : String(target), detail ? JSON.stringify(detail) : null]);
  const pid = req => (/^\d{1,15}$/.test(req.params.id) ? req.params.id : null);
  const summary = d => d ? { usd: d.usd, wins: d.wins, cars: Array.isArray(d.own) ? d.own.length : 0 } : null;

  router.get('/me', (req, res) => res.json({ username: req.owner.username }));

  router.get('/stats', wrap(async (_req, res) => {
    const q = async (sql, p) => (await pool.query(sql, p)).rows;
    const [t] = await q(`SELECT count(*)::int total,
      count(*) FILTER (WHERE banned)::int banned,
      count(*) FILTER (WHERE created_at > now()-interval '24 hours')::int new24,
      count(*) FILTER (WHERE created_at > now()-interval '7 days')::int new7
      FROM users WHERE role<>'owner'`);
    const [a] = await q(`SELECT count(*)::int active24 FROM saves s JOIN users u ON u.id=s.user_id
      WHERE u.role<>'owner' AND s.updated_at > now()-interval '24 hours'`);
    const [e] = await q(`SELECT COALESCE(sum((s.data->>'usd')::numeric),0)::float8 cash,
      COALESCE(sum((s.data->>'wins')::int),0)::int wins,
      COALESCE(sum(jsonb_array_length(s.data->'own')),0)::int cars
      FROM saves s JOIN users u ON u.id=s.user_id WHERE u.role<>'owner'`);
    const rich = await q(`SELECT u.id,u.username,(s.data->>'usd')::float8 usd,(s.data->>'wins')::int wins
      FROM saves s JOIN users u ON u.id=s.user_id WHERE u.role<>'owner' ORDER BY (s.data->>'usd')::numeric DESC LIMIT 5`);
    const pop = await q(`SELECT (c->>'cid')::int cid, count(*)::int n FROM saves s
      JOIN users u ON u.id=s.user_id, jsonb_array_elements(s.data->'own') c
      WHERE u.role<>'owner' GROUP BY 1 ORDER BY n DESC, cid LIMIT 5`);
    res.json({ ...t, ...a, economy: e, richest: rich, popularCars: pop });
  }));

  router.get('/players', wrap(async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 40);
    const sorts = { created: 'u.created_at DESC', cash: "(s.data->>'usd')::numeric DESC NULLS LAST", wins: "(s.data->>'wins')::int DESC NULLS LAST", seen: 's.updated_at DESC NULLS LAST', name: 'lower(u.username)' };
    const order = sorts[req.query.sort] || sorts.created;
    const page = Math.max(0, parseInt(req.query.page, 10) || 0), size = 25;
    const like = '%' + q.replace(/[\\%_]/g, m => '\\' + m) + '%';
    const where = q ? "WHERE u.username ILIKE $1 ESCAPE '\\'" : '';
    const params = q ? [like] : [];
    const total = (await pool.query(`SELECT count(*)::int n FROM users u ${where}`, params)).rows[0].n;
    const { rows } = await pool.query(
      `SELECT u.id,u.username,u.role,u.banned,u.created_at,u.last_login_at,s.updated_at save_at,s.data
       FROM users u LEFT JOIN saves s ON s.user_id=u.id ${where} ORDER BY ${order}, u.id LIMIT ${size} OFFSET ${page * size}`, params);
    res.json({ total, page, size, players: rows.map(r => ({ id: r.id, username: r.username, role: r.role, banned: r.banned,
      created_at: r.created_at, last_login_at: r.last_login_at, save_at: r.save_at, ...(summary(r.data) || {}) })) });
  }));

  router.get('/players/:id', wrap(async (req, res) => {
    const id = pid(req); if (!id) return res.status(400).json({ error: 'Bad id' });
    const { rows } = await pool.query(
      `SELECT u.id,u.username,u.role,u.banned,u.ban_reason,u.created_at,u.last_login_at,s.updated_at save_at,s.data
       FROM users u LEFT JOIN saves s ON s.user_id=u.id WHERE u.id=$1`, [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ player: rows[0] });
  }));

  async function guardTarget(req, res) {
    const id = pid(req); if (!id) { res.status(400).json({ error: 'Bad id' }); return null; }
    const { rows } = await pool.query('SELECT id,username,role FROM users WHERE id=$1', [id]);
    if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return null; }
    if (rows[0].role === 'owner') { res.status(400).json({ error: 'Cannot change the owner account here' }); return null; }
    return rows[0];
  }

  router.post('/players/:id/save', wrap(async (req, res) => {
    const t = await guardTarget(req, res); if (!t) return;
    const b = req.body || {};
    const cur = (await pool.query('SELECT data FROM saves WHERE user_id=$1', [t.id])).rows[0];
    if (!cur && b.op !== 'reset') return res.status(409).json({ error: 'Player has no cloud save yet' });
    let d = cur ? cur.data : null;
    const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);
    switch (b.op) {
      case 'setCash': if (!(num(b.value) >= 0 && b.value < 1e10)) return res.status(400).json({ error: 'Cash must be 0 to under 10 billion' }); d.usd = Math.round(b.value * 100) / 100; break;
      case 'setWins': if (!Number.isInteger(b.value) || b.value < 0 || b.value > 1e7) return res.status(400).json({ error: 'Bad wins' }); d.wins = b.value; break;
      case 'addCar': {
        if (!Number.isInteger(b.cid) || b.cid < 0) return res.status(400).json({ error: 'Bad car' });
        if (d.own.length >= MAX_OWN) return res.status(400).json({ error: 'Garage full (8 cars)' });
        const nid = Math.max(0, ...d.own.map(c => c.id)) + 1;
        d.own.push({ id: nid, cid: b.cid, w: [100, 100, 100], col: '#c0c0c0', sp: 0, st: 0, up: { tu: 0, ti: 0, wt: 0 } });
        break; }
      case 'removeCar': {
        const n = d.own.length; d.own = d.own.filter(c => c.id !== b.carId);
        if (d.own.length === n) return res.status(404).json({ error: 'Car not found in garage' });
        break; }
      case 'reset': d = null; break;
      default: return res.status(400).json({ error: 'Unknown operation' });
    }
    if (b.op === 'reset') {
      await pool.query('DELETE FROM saves WHERE user_id=$1', [t.id]);
      await audit(req, 'save.reset', t.username, null);
      return res.json({ ok: true, save: null });
    }
    const clean = normalize(d);
    if (!clean) return res.status(400).json({ error: 'Result is not a valid save (unknown car id?)' });
    await pool.query('UPDATE saves SET data=$2,updated_at=now(),rev=rev+1,by_admin=true WHERE user_id=$1', [t.id, JSON.stringify(clean)]);
    await audit(req, 'save.' + b.op, t.username, { value: b.value, cid: b.cid, carId: b.carId });
    res.json({ ok: true, save: clean });
  }));

  router.post('/players/:id/ban', wrap(async (req, res) => {
    const t = await guardTarget(req, res); if (!t) return;
    const reason = String(req.body?.reason || '').slice(0, 200);
    await pool.query('UPDATE users SET banned=true,ban_reason=$2,token_ver=token_ver+1 WHERE id=$1', [t.id, reason]);
    await audit(req, 'player.ban', t.username, { reason });
    res.json({ ok: true });
  }));
  router.post('/players/:id/unban', wrap(async (req, res) => {
    const t = await guardTarget(req, res); if (!t) return;
    await pool.query('UPDATE users SET banned=false,ban_reason=NULL WHERE id=$1', [t.id]);
    await audit(req, 'player.unban', t.username, null);
    res.json({ ok: true });
  }));
  router.post('/players/:id/logout', wrap(async (req, res) => {
    const t = await guardTarget(req, res); if (!t) return;
    await pool.query('UPDATE users SET token_ver=token_ver+1 WHERE id=$1', [t.id]);
    await audit(req, 'player.logout', t.username, null);
    res.json({ ok: true });
  }));
  router.post('/players/:id/reset-password', wrap(async (req, res) => {
    const t = await guardTarget(req, res); if (!t) return;
    // Shown once to the owner in this response. Never stored in plain text or written to logs/audit.
    const temp = crypto.randomBytes(9).toString('base64url');
    const hash = await bcrypt.hash(temp, 12);
    await pool.query('UPDATE users SET pass_hash=$2,token_ver=token_ver+1 WHERE id=$1', [t.id, hash]);
    await audit(req, 'player.reset_password', t.username, null);
    res.json({ ok: true, temporaryPassword: temp });
  }));
  router.delete('/players/:id', wrap(async (req, res) => {
    const t = await guardTarget(req, res); if (!t) return;
    if (req.body?.confirm !== t.username) return res.status(400).json({ error: 'Type the username to confirm' });
    await pool.query('DELETE FROM users WHERE id=$1', [t.id]);
    await audit(req, 'player.delete', t.username, null);
    res.json({ ok: true });
  }));

  router.get('/settings', wrap(async (_req, res) => res.json(await readSettings(pool))));
  router.put('/settings', wrap(async (req, res) => {
    const b = req.body || {}, out = {};
    if (b.maintenance) out.maintenance = { on: !!b.maintenance.on, message: String(b.maintenance.message || '').slice(0, 300) };
    if (b.announcement) out.announcement = { active: !!b.announcement.active, text: String(b.announcement.text || '').slice(0, 300),
      level: LEVELS.includes(b.announcement.level) ? b.announcement.level : 'info' };
    if (b.registration) out.registration = { open: !!b.registration.open };
    for (const [k, v] of Object.entries(out)) {
      await pool.query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()', [k, JSON.stringify(v)]);
      await audit(req, 'settings.' + k, null, v);
    }
    res.json(await readSettings(pool));
  }));

  router.get('/audit', wrap(async (_req, res) => {
    const { rows } = await pool.query('SELECT id,ts,actor,action,target,detail FROM audit_log ORDER BY id DESC LIMIT 200');
    res.json({ entries: rows });
  }));

  return router;
};

async function readSettings(pool) {
  const out = JSON.parse(JSON.stringify(DEFAULTS));
  const { rows } = await pool.query('SELECT key,value FROM settings');
  for (const r of rows) if (r.key in out) out[r.key] = { ...out[r.key], ...r.value };
  return out;
}
module.exports.readSettings = readSettings;
