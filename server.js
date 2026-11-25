const { normalize: normalizeSave } = require('./public/save-schema');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const createAdmin = require('./admin');
const { readSettings } = createAdmin;

const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;
const IS_PROD = process.env.NODE_ENV === 'production';
if (!SECRET || SECRET.length < 32) { console.error('Set JWT_SECRET to a random value of at least 32 characters.'); process.exit(1); }
if (!DATABASE_URL) { console.error('DATABASE_URL is required.'); process.exit(1); }

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: IS_PROD ? { rejectUnauthorized: true } : undefined,
  max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000
});
pool.on('error', err => console.error('Unexpected PostgreSQL pool error:', err.message));

const app = express();
app.set('trust proxy', IS_PROD ? 1 : false);
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb', strict: true }));
app.use((req, res, next) => { if (req.path.startsWith('/admin')) res.set('X-Robots-Tag', 'noindex, nofollow'); next(); });
app.use(express.static(path.join(__dirname, 'public'), { etag: true, maxAge: IS_PROD ? '1h' : 0 }));

// Minimal cookie parser; no additional dependency required.
app.use((req, _res, next) => {
  req.cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(part => {
    const i = part.indexOf('=');
    if (i < 0) return ['', ''];
    const key = part.slice(0, i).trim(), value = part.slice(i + 1).trim();
    try { return [key, decodeURIComponent(value)]; } catch { return [key, value]; }
  }).filter(([key]) => key));
  next();
});

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const COOKIE = 'ge';
const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: IS_PROD, path: '/', maxAge: 30 * 864e5 };
function issueCookie(res, user) {
  const token = jwt.sign({ id: String(user.id), username: user.username, tv: user.token_ver || 0 }, SECRET,
    { expiresIn: '30d', issuer: 'garage-empire', audience: 'garage-empire-web' });
  res.cookie(COOKIE, token, cookieOpts);
}
async function requireAuth(req, res, next) {
  try {
    if (!req.cookies?.[COOKIE]) return res.status(401).json({ error: 'Not logged in' });
    const claims = jwt.verify(req.cookies[COOKIE], SECRET, { issuer: 'garage-empire', audience: 'garage-empire-web' });
    const { rows } = await pool.query('SELECT id,username,role,banned,ban_reason,token_ver FROM users WHERE id=$1', [claims.id]);
    const u = rows[0];
    if (!u || (claims.tv || 0) !== u.token_ver) return res.status(401).json({ error: 'Not logged in' });
    if (u.banned) return res.status(403).json({ error: 'Account banned', banned: true, reason: u.ban_reason || '' });
    req.user = { id: String(u.id), username: u.username, role: u.role };
    return next();
  } catch { return res.status(401).json({ error: 'Not logged in' }); }
}
async function gate(req, res, next) { // maintenance blocks everyone except the owner
  try {
    const st = await readSettings(pool);
    req.settings = st;
    if (st.maintenance.on && req.user?.role !== 'owner') return res.status(503).json({ error: 'Maintenance', maintenance: true, message: st.maintenance.message });
    next();
  } catch (e) { next(e); }
}
const adminLimit = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Slow down.' } });
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: Number(process.env.AUTH_RATE_LIMIT || 20), standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' } });
function validCredentials(body) {
  return !!body && typeof body === 'object' && !Array.isArray(body) &&
    typeof body.username === 'string' && /^[A-Za-z0-9_]{3,20}$/.test(body.username) &&
    typeof body.password === 'string' && body.password.length >= 8 && body.password.length <= 100;
}
app.get('/api/status', asyncRoute(async (_req, res) => {
  const st = await readSettings(pool);
  res.set('Cache-Control', 'no-store');
  res.json({ maintenance: st.maintenance, announcement: st.announcement.active ? st.announcement : null, registrationOpen: st.registration.open });
}));
app.post('/api/register', authLimit, asyncRoute(async (req, res) => {
  const st0 = await readSettings(pool);
  if (st0.maintenance.on) return res.status(503).json({ error: 'Maintenance', maintenance: true, message: st0.maintenance.message });
  if (!st0.registration.open) return res.status(403).json({ error: 'Registration is closed right now.' });
  if (!validCredentials(req.body)) return res.status(400).json({ error: 'Username: 3-20 letters, digits or _. Password: 8-100 characters.' });
  const username = req.body.username.trim();
  const hash = await bcrypt.hash(req.body.password, 12);
  try {
    const { rows } = await pool.query('INSERT INTO users(username,pass_hash) VALUES($1,$2) RETURNING id,username,token_ver', [username, hash]);
    issueCookie(res, rows[0]);
    return res.status(201).json({ username: rows[0].username });
  } catch (e) { if (e.code === '23505') return res.status(409).json({ error: 'Username taken' }); throw e; }
}));
app.post('/api/login', authLimit, asyncRoute(async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!username || password.length > 100) return res.status(400).json({ error: 'Enter a valid username and password.' });
  const { rows } = await pool.query('SELECT id,username,pass_hash,role,banned,ban_reason,token_ver FROM users WHERE lower(username)=lower($1)', [username]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.pass_hash))) return res.status(401).json({ error: 'Wrong username or password' });
  if (user.banned) return res.status(403).json({ error: 'Account banned', banned: true, reason: user.ban_reason || '' });
  const st = await readSettings(pool);
  if (st.maintenance.on && user.role !== 'owner') return res.status(503).json({ error: 'Maintenance', maintenance: true, message: st.maintenance.message });
  await pool.query('UPDATE users SET last_login_at=now() WHERE id=$1', [user.id]);
  issueCookie(res, user);
  return res.json({ username: user.username, role: user.role });
}));
app.post('/api/logout', (_req, res) => {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: IS_PROD, path: '/' });
  res.json({ ok: true });
});
app.get('/api/me', requireAuth, (req, res) => res.json({ username: req.user.username, role: req.user.role }));
app.get('/api/save', requireAuth, gate, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT data,rev,by_admin FROM saves WHERE user_id=$1', [req.user.id]);
  res.set('Cache-Control', 'no-store');
  res.json({ data: rows[0] ? rows[0].data : null, rev: rows[0] ? Number(rows[0].rev) : 0, byAdmin: rows[0] ? rows[0].by_admin : false });
}));
// Optimistic concurrency: the client sends the revision it last saw. A stale revision (another device, or an owner edit) gets 409 + the server copy.
app.put('/api/save', requireAuth, gate, asyncRoute(async (req, res) => {
  const data = normalizeSave(req.body?.data);
  if (!data) return res.status(400).json({ error: 'Invalid save data' });
  const base = req.body?.base;
  if (base !== undefined && !(Number.isSafeInteger(base) && base >= 0)) return res.status(400).json({ error: 'Invalid revision' });
  const cur = (await pool.query('SELECT data,rev,by_admin FROM saves WHERE user_id=$1', [req.user.id])).rows[0];
  if (!cur && base > 0) return res.status(409).json({ error: 'Conflict', conflict: true, data: null, rev: 0, byAdmin: true });
  if (!cur) {
    const ins = await pool.query('INSERT INTO saves(user_id,data) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING RETURNING rev', [req.user.id, JSON.stringify(data)]);
    if (ins.rows[0]) return res.json({ ok: true, rev: Number(ins.rows[0].rev) });
    return res.status(409).json({ error: 'Conflict', conflict: true });
  }
  const upd = await pool.query('UPDATE saves SET data=$2,updated_at=now(),rev=rev+1,by_admin=false WHERE user_id=$1 AND ($3::bigint IS NULL OR rev=$3) RETURNING rev',
    [req.user.id, JSON.stringify(data), base === undefined ? null : base]);
  if (upd.rows[0]) return res.json({ ok: true, rev: Number(upd.rows[0].rev) });
  const now = (await pool.query('SELECT data,rev,by_admin FROM saves WHERE user_id=$1', [req.user.id])).rows[0];
  return res.status(409).json({ error: 'Conflict', conflict: true, data: now.data, rev: Number(now.rev), byAdmin: now.by_admin });
}));
app.use('/api/admin', adminLimit, createAdmin({ pool, requireAuth }));
app.use((err, _req, res, _next) => {
  console.error('Request failed:', err.message);
  if (res.headersSent) return;
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
  if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ error: 'Invalid JSON' });
  return res.status(500).json({ error: 'Server error' });
});

async function ensureOwner() {
  const name = process.env.ADMIN_USERNAME, pass = process.env.ADMIN_PASSWORD;
  if (!name && !pass) { const { rows } = await pool.query("SELECT 1 FROM users WHERE role='owner' LIMIT 1"); if (!rows[0]) console.warn('No owner account. Set ADMIN_USERNAME and ADMIN_PASSWORD to create one.'); return; }
  if (!/^[A-Za-z0-9_]{3,20}$/.test(name || '') || !pass || pass.length < 12 || pass.length > 100) throw new Error('ADMIN_USERNAME must be 3-20 letters/digits/_ and ADMIN_PASSWORD 12-100 characters.');
  const hash = await bcrypt.hash(pass, 12);
  const { rows } = await pool.query('SELECT id,role FROM users WHERE lower(username)=lower($1)', [name]);
  if (!rows[0]) { await pool.query("INSERT INTO users(username,pass_hash,role) VALUES($1,$2,'owner')", [name, hash]); console.log('Owner account created.'); }
  else if (rows[0].role === 'owner') { await pool.query('UPDATE users SET pass_hash=$2,token_ver=token_ver+1 WHERE id=$1', [rows[0].id, hash]); console.log('Owner password synced from ADMIN_PASSWORD.'); }
  else throw new Error('ADMIN_USERNAME belongs to an existing player. Pick another name.');
}
async function start() {
  await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  await ensureOwner();
  const server = app.listen(PORT, () => console.log(`GARAGE EMPIRE server listening on port ${PORT}`));
  const shutdown = signal => { console.log(`${signal}: shutting down`); server.close(() => pool.end().finally(() => process.exit(0))); };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}
start().catch(error => { console.error('Startup failed:', error.message); process.exit(1); });
