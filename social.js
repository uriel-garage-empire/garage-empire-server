'use strict';
// Friends, chat, blocks, reports and the owner moderation routes. Everything needs a signed-in, non-banned user.
const crypto = require('node:crypto');
const express = require('express');

const MAX_TEXT = 300;
// Small starter word list (English + Arabic). Matching is on normalized text; the owner can also delete messages and mute players.
const BAD = ['fuck', 'shit', 'bitch', 'asshole', 'cunt', 'nigger', 'dick', 'كس', 'شرموط', 'شرموطة', 'منيوك', 'متناك', 'خول', 'عرص', 'ابن الكلب', 'ابن المتناكة', 'كسمك', 'زب'];
const norm = s => String(s).toLowerCase().replace(/[\u064B-\u065F\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^a-z0-9\u0600-\u06FF ]/g, ' ').replace(/\s+/g, ' ');
const BADN = BAD.map(norm);
function dirty(text) {
  const t = ' ' + norm(text) + ' ';
  return BADN.some(w => (w.length <= 2 ? t.includes(' ' + w + ' ') : t.includes(w)));
}

module.exports = function createSocial({ pool, requireAuth, gate }) {
  const router = express.Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.use(requireAuth, gate);
  const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const q = (sql, p) => pool.query(sql, p).then(r => r.rows);
  const pair = (a, b) => (BigInt(a) < BigInt(b) ? [a, b] : [b, a]);
  const nameOk = s => typeof s === 'string' && /^[A-Za-z0-9_]{3,20}$/.test(s);
  async function findUser(name) {
    if (!nameOk(name)) return null;
    return (await q('SELECT id::text id,username,banned FROM users WHERE lower(username)=lower($1)', [name]))[0] || null;
  }
  async function isBlocked(a, b) {
    return (await q('SELECT 1 FROM blocks WHERE (blocker=$1 AND blocked=$2) OR (blocker=$2 AND blocked=$1)', [a, b])).length > 0;
  }
  async function areFriends(a, b) {
    const [x, y] = pair(a, b);
    return (await q("SELECT 1 FROM friendships WHERE user_a=$1 AND user_b=$2 AND status='accepted'", [x, y])).length > 0;
  }

  router.get('/users', wrap(async (req, res) => {
    const s = String(req.query.q || '').trim().replace(/[^A-Za-z0-9_]/g, '').slice(0, 20);
    if (s.length < 2) return res.json({ users: [] });
    const rows = await q(`SELECT username FROM users WHERE lower(username) LIKE lower($1) AND id<>$2 AND NOT banned
      AND id NOT IN (SELECT blocked FROM blocks WHERE blocker=$2) AND id NOT IN (SELECT blocker FROM blocks WHERE blocked=$2)
      ORDER BY lower(username) LIMIT 10`, [s + '%', req.user.id]);
    res.json({ users: rows.map(r => r.username) });
  }));

  router.get('/friends', wrap(async (req, res) => {
    const me = req.user.id;
    const rows = await q(`SELECT f.status, f.requester::text requester, u.username FROM friendships f
      JOIN users u ON u.id = CASE WHEN f.user_a=$1 THEN f.user_b ELSE f.user_a END
      WHERE (f.user_a=$1 OR f.user_b=$1) AND NOT u.banned ORDER BY lower(u.username)`, [me]);
    const blocked = await q('SELECT u.username FROM blocks b JOIN users u ON u.id=b.blocked WHERE b.blocker=$1 ORDER BY lower(u.username)', [me]);
    res.json({
      friends: rows.filter(r => r.status === 'accepted').map(r => r.username),
      incoming: rows.filter(r => r.status === 'pending' && r.requester !== me).map(r => r.username),
      outgoing: rows.filter(r => r.status === 'pending' && r.requester === me).map(r => r.username),
      blocked: blocked.map(r => r.username)
    });
  }));

  router.post('/friends/request', wrap(async (req, res) => {
    const me = req.user.id, u = await findUser(req.body?.username);
    if (!u || u.banned) return res.status(404).json({ error: 'No player with that username.' });
    if (u.id === me) return res.status(400).json({ error: 'You cannot add yourself.' });
    if (await isBlocked(me, u.id)) return res.status(403).json({ error: 'You cannot send a request to this player.' });
    const [a, b] = pair(me, u.id);
    const cur = (await q('SELECT status,requester::text requester FROM friendships WHERE user_a=$1 AND user_b=$2', [a, b]))[0];
    if (cur?.status === 'accepted') return res.status(409).json({ error: 'Already friends.' });
    if (cur?.status === 'pending') {
      if (cur.requester === me) return res.status(409).json({ error: 'Request already sent.' });
      await pool.query("UPDATE friendships SET status='accepted' WHERE user_a=$1 AND user_b=$2", [a, b]);
      return res.json({ ok: true, accepted: true });
    }
    const [{ n }] = await q("SELECT count(*)::int n FROM friendships WHERE requester=$1 AND status='pending'", [me]);
    if (n >= 50) return res.status(429).json({ error: 'Too many pending requests.' });
    await pool.query("INSERT INTO friendships(user_a,user_b,requester) VALUES($1,$2,$3) ON CONFLICT DO NOTHING", [a, b, me]);
    res.json({ ok: true });
  }));

  router.post('/friends/respond', wrap(async (req, res) => {
    const me = req.user.id, u = await findUser(req.body?.username);
    if (!u) return res.status(404).json({ error: 'Not found.' });
    const [a, b] = pair(me, u.id);
    const cur = (await q("SELECT requester::text requester FROM friendships WHERE user_a=$1 AND user_b=$2 AND status='pending'", [a, b]))[0];
    if (!cur || cur.requester === me) return res.status(404).json({ error: 'No request from this player.' });
    if (req.body.accept === true) await pool.query("UPDATE friendships SET status='accepted' WHERE user_a=$1 AND user_b=$2", [a, b]);
    else await pool.query('DELETE FROM friendships WHERE user_a=$1 AND user_b=$2', [a, b]);
    res.json({ ok: true });
  }));

  router.post('/friends/remove', wrap(async (req, res) => {
    const u = await findUser(req.body?.username);
    if (!u) return res.status(404).json({ error: 'Not found.' });
    const [a, b] = pair(req.user.id, u.id);
    await pool.query('DELETE FROM friendships WHERE user_a=$1 AND user_b=$2', [a, b]);
    res.json({ ok: true });
  }));

  router.post('/block', wrap(async (req, res) => {
    const me = req.user.id, u = await findUser(req.body?.username);
    if (!u || u.id === me) return res.status(404).json({ error: 'Not found.' });
    const [a, b] = pair(me, u.id);
    await pool.query('DELETE FROM friendships WHERE user_a=$1 AND user_b=$2', [a, b]);
    await pool.query('INSERT INTO blocks(blocker,blocked) VALUES($1,$2) ON CONFLICT DO NOTHING', [me, u.id]);
    res.json({ ok: true });
  }));
  router.post('/unblock', wrap(async (req, res) => {
    const u = await findUser(req.body?.username);
    if (!u) return res.status(404).json({ error: 'Not found.' });
    await pool.query('DELETE FROM blocks WHERE blocker=$1 AND blocked=$2', [req.user.id, u.id]);
    res.json({ ok: true });
  }));

  // after = last message id the client has. Global chat: newest 50. DM: newest 50 with a friend.
  router.get('/chat', wrap(async (req, res) => {
    const me = req.user.id, after = /^\d{1,15}$/.test(String(req.query.after || '')) ? req.query.after : '0';
    const who = String(req.query.with || '');
    if (!who || who === 'global') {
      const rows = await q(`SELECT m.id::text id, u.username, m.text, m.created_at ts FROM messages m JOIN users u ON u.id=m.sender
        WHERE m.recipient IS NULL AND NOT m.deleted AND m.id>$1 AND NOT u.banned
        AND m.sender NOT IN (SELECT blocked FROM blocks WHERE blocker=$2) AND m.sender NOT IN (SELECT blocker FROM blocks WHERE blocked=$2)
        ORDER BY m.id DESC LIMIT 50`, [after, me]);
      return res.json({ messages: rows.reverse() });
    }
    const u = await findUser(who);
    if (!u || !(await areFriends(me, u.id))) return res.status(403).json({ error: 'Private messages are for friends only.' });
    const rows = await q(`SELECT m.id::text id, s.username, m.text, m.created_at ts FROM messages m JOIN users s ON s.id=m.sender
      WHERE NOT m.deleted AND m.id>$3 AND ((m.sender=$1 AND m.recipient=$2) OR (m.sender=$2 AND m.recipient=$1))
      ORDER BY m.id DESC LIMIT 50`, [me, u.id, after]);
    res.json({ messages: rows.reverse() });
  }));

  router.post('/chat', wrap(async (req, res) => {
    const me = req.user.id;
    const text = typeof req.body?.text === 'string' ? req.body.text.replace(/\s+/g, ' ').trim() : '';
    if (!text || text.length > MAX_TEXT) return res.status(400).json({ error: `Message must be 1-${MAX_TEXT} characters.` });
    const mu = (await q('SELECT muted_until FROM users WHERE id=$1', [me]))[0];
    if (mu?.muted_until && new Date(mu.muted_until) > new Date()) return res.status(403).json({ error: 'You are muted.', muted: true, until: mu.muted_until });
    if (dirty(text)) return res.status(422).json({ error: 'Message blocked: please keep the chat clean.', filtered: true });
    const [r] = await q(`SELECT count(*) FILTER (WHERE created_at > now()-interval '10 seconds')::int s10,
      count(*) FILTER (WHERE created_at > now()-interval '1 minute')::int s60 FROM messages WHERE sender=$1`, [me]);
    if (r.s10 >= 3 || r.s60 >= 15) return res.status(429).json({ error: 'Slow down.' });
    let rid = null;
    if (req.body.to && req.body.to !== 'global') {
      const u = await findUser(req.body.to);
      if (!u || u.banned || u.id === me || !(await areFriends(me, u.id)) || (await isBlocked(me, u.id))) return res.status(403).json({ error: 'Private messages are for friends only.' });
      rid = u.id;
    }
    const [m] = await q('INSERT INTO messages(sender,recipient,text) VALUES($1,$2,$3) RETURNING id::text id, created_at ts', [me, rid, text]);
    res.status(201).json({ message: { id: m.id, username: req.user.username, text, ts: m.ts } });
  }));

  router.get('/summary', wrap(async (req, res) => {
    const me = req.user.id, seenDm = /^\d{1,15}$/.test(String(req.query.seenDm || '')) ? req.query.seenDm : '0';
    const [r] = await q(`SELECT
      (SELECT count(*)::int FROM friendships WHERE (user_a=$1 OR user_b=$1) AND status='pending' AND requester<>$1) requests,
      (SELECT count(*)::int FROM messages WHERE recipient=$1 AND id>$2 AND NOT deleted) dms,
      (SELECT COALESCE(max(id),0)::text FROM messages WHERE recipient=$1) "lastDm"`, [me, seenDm]);
    res.json(r);
  }));

  router.post('/report', wrap(async (req, res) => {
    const me = req.user.id, id = String(req.body?.messageId || '');
    if (!/^\d{1,15}$/.test(id)) return res.status(400).json({ error: 'Bad message.' });
    const m = (await q('SELECT sender::text sender, recipient::text recipient FROM messages WHERE id=$1 AND NOT deleted', [id]))[0];
    if (!m || m.sender === me || (m.recipient && m.recipient !== me)) return res.status(404).json({ error: 'Message not found.' });
    const reason = typeof req.body.reason === 'string' ? req.body.reason.slice(0, 200) : null;
    await pool.query('INSERT INTO reports(reporter,message_id,reason) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [me, id, reason]);
    res.json({ ok: true });
  }));

  return router;
};

// Owner-only moderation. Mounted at /api/admin/social after the admin router's own owner check pattern.
module.exports.admin = function createSocialAdmin({ pool, requireAuth }) {
  const router = express.Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.use(requireAuth);
  const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  router.use(wrap(async (req, res, next) => {
    const { rows } = await pool.query('SELECT username,role FROM users WHERE id=$1', [req.user.id]);
    if (!rows[0] || rows[0].role !== 'owner') return res.status(403).json({ error: 'Owner only' });
    req.owner = rows[0]; next();
  }));
  const audit = (req, action, target, detail) => pool.query('INSERT INTO audit_log(actor,action,target,detail) VALUES($1,$2,$3,$4)',
    [req.owner.username, action, target == null ? null : String(target), detail ? JSON.stringify(detail) : null]);
  router.get('/chat', wrap(async (_req, res) => {
    const msgs = (await pool.query(`SELECT m.id::text id, u.id::text uid, u.username, m.text, m.created_at ts, m.recipient IS NOT NULL dm, m.deleted
      FROM messages m JOIN users u ON u.id=m.sender WHERE m.recipient IS NULL ORDER BY m.id DESC LIMIT 100`)).rows;
    const reports = (await pool.query(`SELECT r.id::text id, m.id::text mid, s.username sender, s.id::text sid, rp.username reporter, m.text, r.reason, r.created_at ts, m.recipient IS NOT NULL dm
      FROM reports r JOIN messages m ON m.id=r.message_id JOIN users s ON s.id=m.sender JOIN users rp ON rp.id=r.reporter
      WHERE NOT r.resolved ORDER BY r.id DESC LIMIT 50`)).rows;
    res.json({ messages: msgs, reports });
  }));
  router.post('/delete', wrap(async (req, res) => {
    const id = String(req.body?.id || ''); if (!/^\d{1,15}$/.test(id)) return res.status(400).json({ error: 'Bad id' });
    await pool.query('UPDATE messages SET deleted=true WHERE id=$1', [id]);
    await pool.query('UPDATE reports SET resolved=true WHERE message_id=$1', [id]);
    await audit(req, 'chat.delete', id); res.json({ ok: true });
  }));
  router.post('/dismiss', wrap(async (req, res) => {
    const id = String(req.body?.id || ''); if (!/^\d{1,15}$/.test(id)) return res.status(400).json({ error: 'Bad id' });
    await pool.query('UPDATE reports SET resolved=true WHERE id=$1', [id]);
    await audit(req, 'chat.report.dismiss', id); res.json({ ok: true });
  }));
  router.post('/mute', wrap(async (req, res) => {
    const id = String(req.body?.userId || ''), mins = Number(req.body?.minutes);
    if (!/^\d{1,15}$/.test(id) || !Number.isFinite(mins) || mins < 0 || mins > 525600) return res.status(400).json({ error: 'Bad input' });
    const until = mins === 0 ? null : new Date(Date.now() + Math.floor(mins) * 60000).toISOString();
    const r = await pool.query('UPDATE users SET muted_until=$3 WHERE id=$1 AND role<>$2 RETURNING username', [id, 'owner', until]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    await audit(req, mins === 0 ? 'chat.unmute' : 'chat.mute', r.rows[0].username, { minutes: mins }); res.json({ ok: true });
  }));
  return router;
};
