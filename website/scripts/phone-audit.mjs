/**
 * PHONE AUDIT — every route of the website, at 390px, in one run.
 *
 * For each route: signs in as the role that route belongs to (a seeded
 * localStorage session), answers every API call with sample rows carrying
 * deliberately LONG names/emails/titles, then reports any element wider than
 * the screen and saves a phone-sized screenshot.
 *
 * The route list is READ FROM src/App.tsx, so a screen added there is audited
 * with no change here. `:params` become `x`; the `/cms` children are joined to
 * their parent.
 *
 * Needs: the website dev server on :5173 (`npx vite --port 5173`), the backend
 * on :5000 for the public pages, Chrome, Node 22+ (global WebSocket).
 *
 *   node scripts/phone-audit.mjs                       # every route
 *   node scripts/phone-audit.mjs <outDir> /member      # only routes containing "/member"
 *
 * "OVER" means something is wider than a phone. An element listed at a
 * negative left edge inside a sidebar is the closed drawer, parked off-screen —
 * expected. Errors reading `.map`/`.length` come from the generic mock data,
 * not from the layout.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] || join(tmpdir(), 'activ-phone-audit');
const FILTER = process.argv[3] || '';
const W = 390, H = 844, BASE = process.env.BASE_URL || 'http://localhost:5173';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
mkdirSync(OUT, { recursive: true });

const appSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'App.tsx'), 'utf8');
const ROUTES = [...new Set(
  [...appSource.matchAll(/<Route\s+(?:index\s+)?(?:path="([^"]*)")?/g)]
    .map(m => m[1] === undefined ? '/cms' : m[1])
    .filter(p => p !== '*' && !p.includes('*'))
    .map(p => (p.startsWith('/') ? p : `/cms/${p}`).replace(/:[A-Za-z]+/g, (s) => (s === ':kind' ? 'membership' : 'x'))),
)].filter(r => r.includes(FILTER));

const roleFor = (p) => (p.startsWith('/block-admin') || (p.startsWith('/admin/') && p !== '/admin/login')) ? 'block_admin'
  : p.startsWith('/district-admin') ? 'district_admin'
  : p.startsWith('/state-admin') ? 'state_admin'
  : p.startsWith('/super-admin') || p.startsWith('/cms') ? 'super_admin'
  : p.startsWith('/events-admin') ? 'events_admin'
  : /^\/(member|payment|business)/.test(p) ? 'member' : null;

// Sample rows with deliberately LONG values — the strings that break phone layouts.
const row = (i) => ({
  _id: `64f0c0ffee00000000000${i}`, id: `64f0c0ffee00000000000${i}`, userId: `u${i}`,
  fullName: 'Thiruvenkadam Balasubramanian Rajendran', name: 'Sri Lakshmi Enterprises Private Limited',
  title: 'SCST Economic Liberty Conference and Entrepreneurship Summit 2026', email: 'thiruvenkadam.balasubramanian@example-enterprises.co.in',
  phone: '+91 98765 43210', phoneNumber: '+91 98765 43210', status: ['Pending', 'Approved', 'Rejected'][i % 3],
  role: 'block_admin', state: 'Tamil Nadu', district: 'Kanchipuram', block: 'Sriperumbudur', memberId: 'ACTIV-TN-2026-000123',
  businessName: 'Sri Lakshmi Enterprises Private Limited', category: 'Conferences', createdAt: '2026-09-20T10:00:00Z',
  startAt: '2026-10-10T10:00:00Z', amount: 5000, amountPaise: 500000, key: `plan${i}`, label: 'Growth Member', isActive: true,
  seats: { total: 100, booked: 40, remaining: 60 }, stage: 'pending', canAct: true, outcome: 'Pending', message: 'Sample message body that is rather long to see wrapping in a card on a phone screen.',
});
const rows = [row(1), row(2), row(3)];
const LIST = /(users|admins|events|bookings|attendees|plans|notifications|categories|updates|companies|products|directory|messages|conversations|applications|members|gallery|news|schemes|logs)(\/)?(\?|$)/;
const PLAN = {
  id: 'growth', key: 'growth', name: 'Growth Member', price: 5000, audience: 'business',
  description: 'For established businesses ready to grow their network.', experience: '5 – 10 years',
  features: ['Full member directory and messaging', 'Members-only events and conclaves', 'Membership certificate and 80G receipt',
    'Company page, catalogue and reach analytics'], popular: true, active: true,
};
const mockFor = (url) => {
  const path = url.split('?')[0];
  // The membership plans screen needs a real plan shape to draw anything.
  if (/membership\/plans/.test(path)) {
    return { success: true, data: { plans: [PLAN], matched: PLAN, years: 7, reason: 'band', showAllPlans: false } };
  }
  const listish = { items: rows, users: rows, admins: rows, events: rows, bookings: rows, plans: rows, notifications: rows,
    members: rows, conversations: rows, messages: rows, logs: rows, all: rows, pending: rows, approved: rows, rejected: rows,
    applicants: { all: rows, pending: rows, approved: rows, rejected: rows }, stats: { total: 1234, pending: 56, approved: 789, rejected: 12 },
    total: 3, count: 3, page: 1, pages: 1 };
  return LIST.test(path)
    ? { success: true, data: rows, ...listish }
    : { success: true, data: { ...row(0), ...listish }, ...listish };
};


const PORT = 9600 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}/p${PORT}`, '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let list;
for (let i = 0; i < 80; i++) { try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (list.some(t => t.type === 'page')) break; } catch { } await sleep(250); }
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
const errors = [];
ws.addEventListener('message', async (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); return; }
  if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails?.exception?.description?.split('\n')[0] || 'exception');
  if (d.method === 'Fetch.requestPaused') {
    const { requestId, request } = d.params;
    const headers = [
      { name: 'Access-Control-Allow-Origin', value: BASE },
      { name: 'Access-Control-Allow-Credentials', value: 'true' },
      { name: 'Access-Control-Allow-Headers', value: '*' },
      { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
      { name: 'Content-Type', value: 'application/json' },
    ];
    const body = request.method === 'OPTIONS' ? '' : JSON.stringify(mockFor(request.url));
    send('Fetch.fulfillRequest', { requestId, responseCode: request.method === 'OPTIONS' ? 204 : 200, responseHeaders: headers, body: Buffer.from(body).toString('base64') });
  }
});
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (expression) => send('Runtime.evaluate', { expression, returnByValue: true });

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

await send('Page.navigate', { url: BASE + '/404-seed' }); await sleep(2500);
const report = [];
for (const p of ROUTES) {
  const role = roleFor(p);
  // Signed-in routes: every API call mocked (a real backend would 401 the fake
  // token and sign the session out). Public routes: the real backend.
  if (role) await send('Fetch.enable', { patterns: [{ urlPattern: '*localhost:5000*' }] });
  else await send('Fetch.disable');
  await ev(`(() => { localStorage.clear(); ${role ? `
    const s = { token: 'aaa.bbb.ccc', adminToken: 'aaa.bbb.ccc', role: '${role}', userId: 'u1', userName: 'Audit User',
      userEmail: 'audit@example.com', isLoggedIn: 'true', paymentStatus: 'paid',
      adminData: JSON.stringify({ id: 'u1', fullName: 'Audit Admin', email: 'audit@example.com', role: '${role}', state: 'Tamil Nadu', district: 'Chennai', block: 'Guindy' }),
      userData: JSON.stringify({ id: 'u1', _id: 'u1', fullName: 'Audit User', email: 'audit@example.com', role: '${role}' }) };
    for (const k in s) localStorage.setItem(k, s[k]);` : ''} })()`);
  errors.length = 0;
  await send('Page.navigate', { url: BASE + p });
  await sleep(Number(process.env.WAIT || 5000));
  const { result } = await ev(`(() => {
    const vw = document.documentElement.clientWidth;
    const over = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.right > vw + 1 || r.left < -1) {
        let clipped = false;
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const s = getComputedStyle(a);
          if (/(hidden|clip|auto|scroll)/.test(s.overflowX)) { clipped = true; break; }
        }
        const st = getComputedStyle(el);
        if (!clipped && st.position !== 'fixed' && st.visibility !== 'hidden') {
          const cls = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');
          over.push(el.tagName.toLowerCase() + ' [' + cls.slice(0, 110) + '] ' + Math.round(r.left) + '..' + Math.round(r.right) + ' "' + (el.innerText || '').slice(0, 30).replace(/\\s+/g,' ') + '"');
        }
      }
    }
    return { url: location.pathname, scrollW: document.documentElement.scrollWidth, over: over.slice(0, 8) };
  })()`);
  const v = result.result.value || {};
  report.push({ route: p, landed: v.url, scrollW: v.scrollW, over: v.over, errors: [...new Set(errors)].slice(0, 3) });
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${p.replace(/\W+/g, '_') || 'home'}.png`, Buffer.from(shot.result.data, 'base64'));
}
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
const bad = report.filter(r => r.scrollW > W || (r.over || []).length);
console.log(`routes: ${report.length}  with overflow: ${bad.length}`);
for (const r of report) console.log(`${r.scrollW > W || r.over?.length ? 'OVER' : ' ok '} ${r.route}${r.landed !== r.route ? ' -> ' + r.landed : ''}  w=${r.scrollW}${r.errors?.length ? '  ERR ' + r.errors.join(' | ') : ''}`);
ws.close(); chrome.kill(); process.exit(0);
