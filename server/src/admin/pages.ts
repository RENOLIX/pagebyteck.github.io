// Server-rendered admin UI. Every value that could hold user data goes through esc().
import { config } from '../config'

export function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
const fmtDate = (d: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 16).replace('T', ' ') : '')
const badge = (text: string, kind = '') => `<span class="badge ${kind}">${esc(text)}</span>`
const pageUrl = (username: string) => `https://${config.PUBLIC_BASE_DOMAIN}/${username}`
const editorUrl = (siteId: string) => `https://${config.DASHBOARD_DOMAIN}/edit/${siteId}`

const CSS = `
:root{--bg:#f7f8fa;--panel:#fff;--panel2:#f2f4f7;--bd:#e6e9ef;--tx:#0c1220;--mut:#667085;--acc:#2563eb;--tint:#2563eb1c;--danger:#dc2626;--r:12px}
@media(prefers-color-scheme:dark){:root{--bg:#080a0e;--panel:#0f141c;--panel2:#151b25;--bd:#212936;--tx:#e8ecf3;--mut:#8b93a7;--tint:#2563eb38}}
*{box-sizing:border-box}body{margin:0;font:14px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--tx)}
a{color:var(--acc);text-decoration:none}a:hover{text-decoration:underline}
.top{display:flex;align-items:center;gap:20px;flex-wrap:wrap;padding:11px 22px;background:var(--panel);border-bottom:1px solid var(--bd);position:sticky;top:0;z-index:10}
.brand{font-weight:700;font-size:16px;color:var(--tx)}.brand .tag{font-size:10.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);border:1px solid var(--bd);border-radius:6px;padding:2px 6px;margin-inline-start:8px}
.nav{display:flex;gap:2px;flex-wrap:wrap}.nav a{padding:6px 12px;border-radius:8px;color:var(--mut);font-weight:500}.nav a:hover{color:var(--tx);text-decoration:none;background:var(--panel2)}.nav a.on{background:var(--tint);color:var(--acc)}
.who{margin-inline-start:auto;color:var(--mut);font-size:13px}
.wrap{max-width:1100px;margin:0 auto;padding:26px 22px 90px}
h1{font-size:24px;margin:0 0 20px}h2{font-size:12px;font-weight:600;margin:28px 0 12px;color:var(--mut);text-transform:uppercase;letter-spacing:.07em}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.kpi{background:var(--panel);border:1px solid var(--bd);border-radius:var(--r);padding:15px 17px}.kpi .n{font-size:26px;font-weight:700}.kpi .l{color:var(--mut);font-size:12.5px}
.card{background:var(--panel);border:1px solid var(--bd);border-radius:var(--r);overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13.5px}th,td{text-align:start;padding:10px 15px;border-bottom:1px solid var(--bd);vertical-align:middle}
th{color:var(--mut);font-weight:600;font-size:11.5px;text-transform:uppercase;background:var(--panel2)}tr:last-child td{border-bottom:0}
.mono{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--mut)}
.badge{display:inline-flex;padding:1.5px 9px;border-radius:999px;font-size:11.5px;font-weight:600;background:var(--panel2);border:1px solid var(--bd);color:var(--mut)}
.badge.ok{color:#15a34a;border-color:#16a34a40}.badge.danger{color:#dc2626;border-color:#dc262640}
.row{display:flex;gap:22px;flex-wrap:wrap}.col{flex:1;min-width:290px}
.btn{display:inline-flex;align-items:center;padding:7px 13px;border-radius:9px;border:1px solid var(--bd);background:var(--panel);color:var(--tx);font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.btn:hover{background:var(--panel2)}.btn.p{background:var(--acc);color:#fff;border-color:transparent}.btn.d{color:#fff;background:var(--danger);border-color:transparent}
input,select{font:inherit;font-size:14px;padding:8px 11px;border-radius:9px;border:1px solid var(--bd);background:var(--bg);color:var(--tx);min-width:0}
form.inline{display:inline-flex;gap:6px;align-items:center;margin:0 8px 8px 0;flex-wrap:wrap}
form.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;align-items:end}
.act{background:var(--panel);border:1px solid var(--bd);border-radius:var(--r);padding:15px 17px;margin-bottom:12px}.act h3{margin:0 0 6px;font-size:14px}.act p{margin:0 0 10px;color:var(--mut);font-size:12.5px}
.search{display:flex;gap:8px;margin-bottom:16px}.search input{flex:1;max-width:360px}
.pg{display:flex;gap:8px;margin-top:16px}.empty{padding:30px;color:var(--mut);text-align:center}
.kv{display:grid;grid-template-columns:auto 1fr;gap:6px 18px;font-size:13px}.kv dt{color:var(--mut)}.kv dd{margin:0}
.note{background:var(--tint);border-radius:10px;padding:11px 15px;margin-bottom:18px}.err{background:#dc262618;color:var(--danger)}
.authbox{max-width:380px;margin:9vh auto 0}`

const NAV: [string, string, string][] = [['/', 'Overview', 'overview'], ['/users', 'Accounts', 'users'], ['/analytics', 'Statistics', 'analytics'], ['/audit', 'Audit', 'audit']]

export function shell(o: { title: string; active: string; adminEmail?: string }, body: string): string {
  const authed = !!o.adminEmail
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(o.title)} · ${esc(config.BRAND_NAME)} admin</title>
<style>${CSS}</style></head><body>
<header class="top"><span class="brand">${esc(config.BRAND_NAME)}<span class="tag">admin</span></span>
${authed ? `<nav class="nav">${NAV.map(([h, l, id]) => `<a class="${id === o.active ? 'on' : ''}" href="${h}">${l}</a>`).join('')}</nav>
<span class="who">${esc(o.adminEmail)} · <a href="/logout">Sign out</a></span>` : ''}</header>
<main class="wrap">${body}</main></body></html>`
}

const csrfField = (csrf: string) => `<input type="hidden" name="_csrf" value="${esc(csrf)}">`

export function loginPage(): string {
  return shell({ title: 'Sign in', active: '' }, `
<div class="authbox">
  <h1>Admin sign-in</h1>
  <div class="note">Authorized admins only.</div>
  <div class="card" style="padding:18px">
    <form id="lf" style="display:flex;flex-direction:column;gap:10px">
      <input name="email" type="email" placeholder="you@email.com" autocomplete="username" required>
      <input name="password" type="password" placeholder="Password" autocomplete="current-password" required>
      <button class="btn p" type="submit">Sign in</button>
      <p id="msg" style="color:var(--danger);font-size:13px;margin:2px 0 0"></p>
    </form>
  </div>
</div>
<script>${LOGIN_JS}</script>`)
}

export function forbiddenPage(msg: string): string {
  return shell({ title: 'Forbidden', active: '' }, `<div style="max-width:460px;margin:10vh auto 0;text-align:center">
  <h1>Not authorized</h1><p style="color:var(--mut)">${esc(msg)}</p><p><a href="/logout">Sign out</a></p></div>`)
}

export function overviewPage(d: Awaited<ReturnType<typeof import('./data').overview>>, adminEmail: string): string {
  const kpi = (n: string | number, l: string) => `<div class="kpi"><div class="n">${esc(String(n))}</div><div class="l">${esc(l)}</div></div>`
  return shell({ title: 'Overview', active: 'overview', adminEmail }, `<h1>Overview</h1>
<div class="kpis">${kpi(d.users, 'Accounts')}${kpi(d.suspended, 'Suspended')}${kpi(d.pages, 'Pages')}${kpi(d.published, 'Published')}${kpi(d.views30, 'Views (30 days)')}${kpi(d.clicks30, 'Clicks (30 days)')}</div>
<h2>Newest accounts</h2><div class="card">${d.recentUsers.length ? `<table><tr><th>Account</th><th>Created</th></tr>${d.recentUsers.map((u) => `<tr><td><a href="/users/${esc(u.id)}">${esc(u.email)}</a>${u.suspended ? ' ' + badge('suspended', 'danger') : ''}</td><td class="mono">${fmtDate(u.createdAt)}</td></tr>`).join('')}</table>` : '<div class="empty">No accounts yet.</div>'}</div>`)
}

export function usersPage(d: Awaited<ReturnType<typeof import('./data').listUsers>>, csrf: string, adminEmail: string, error = ''): string {
  const rows = d.rows.map((u) => `<tr>
    <td><a href="/users/${esc(u.id)}">${esc(u.email)}</a></td><td>${esc(u.name)}</td>
    <td>${u.pages.map((p) => `<a href="${esc(pageUrl(p))}" target="_blank" rel="noopener">/${esc(p)}</a>`).join(' ')}</td>
    <td>${u.suspended ? badge('suspended', 'danger') : badge('active', 'ok')}</td>
    <td class="mono">${fmtDate(u.createdAt)}</td></tr>`).join('')
  return shell({ title: 'Accounts', active: 'users', adminEmail }, `<h1>Accounts</h1>
${error ? `<div class="note err">${esc(error)}</div>` : ''}
<div class="act"><h3>Create account</h3><p>Creates the login and an empty page. Send the email and password to the client yourself.</p>
<form class="grid" method="post" action="/users/create">${csrfField(csrf)}
  <input name="name" placeholder="Name" maxlength="80">
  <input name="email" type="email" placeholder="Email" required>
  <input name="username" placeholder="Page name (letters, digits, -)" pattern="[a-z0-9][a-z0-9-]{1,30}[a-z0-9]" required>
  <input name="password" type="text" placeholder="Password (8+ characters)" minlength="8" required autocomplete="off">
  <button class="btn p">Create</button>
</form></div>
<form class="search" method="get" action="/users"><input name="q" value="${esc(d.q)}" placeholder="Search email or name"><button class="btn">Search</button></form>
<div class="card">${d.rows.length ? `<table><tr><th>Email</th><th>Name</th><th>Page</th><th>Status</th><th>Created</th></tr>${rows}</table>` : '<div class="empty">No matching accounts.</div>'}</div>
<div class="pg">${d.page > 0 ? `<a class="btn" href="/users?q=${encodeURIComponent(d.q)}&page=${d.page - 1}">Previous</a>` : ''}${d.hasNext ? `<a class="btn" href="/users?q=${encodeURIComponent(d.q)}&page=${d.page + 1}">Next</a>` : ''}</div>`)
}

export function userDetailPage(x: NonNullable<Awaited<ReturnType<typeof import('./data').getUserDetail>>>, csrf: string, adminEmail: string, msg: string): string {
  const { u } = x
  const post = (action: string, inner: string) => `<form class="inline" method="post" action="/users/${esc(u.id)}/${action}">${csrfField(csrf)}${inner}</form>`
  const sitesTbl = x.sites.length ? `<table><tr><th>Page</th><th>Status</th><th>Updated</th><th></th></tr>${x.sites.map((s) => `<tr>
    <td><a href="${esc(pageUrl(s.username))}" target="_blank" rel="noopener">/${esc(s.username)}</a><div><a href="${esc(editorUrl(s.id))}" target="_blank" rel="noopener">Open in editor</a></div></td>
    <td>${badge(s.status, s.status === 'published' ? 'ok' : '')}</td><td class="mono">${fmtDate(s.updatedAt)}</td>
    <td><form class="inline" method="post" action="/sites/${esc(s.id)}/delete">${csrfField(csrf)}<input name="confirm" placeholder="type: ${esc(s.username)}" required style="width:150px"><button class="btn d">Delete page</button></form></td></tr>`).join('')}</table>` : '<div class="empty">No page.</div>'
  return shell({ title: u.email, active: 'users', adminEmail }, `<p><a href="/users">Accounts</a></p>
<h1>${esc(u.email)} ${u.suspended ? badge('suspended', 'danger') : ''}</h1>
${msg ? `<div class="note">${esc(msg)}</div>` : ''}
<div class="row">
  <div class="col"><dl class="kv"><dt>Name</dt><dd>${esc(u.name)}</dd><dt>Created</dt><dd class="mono">${fmtDate(u.createdAt)}</dd><dt>ID</dt><dd class="mono">${esc(u.id)}</dd></dl></div>
  <div class="col">
    <div class="act"><h3>Access</h3>
      ${post('suspend', `<input type="hidden" name="suspend" value="${u.suspended ? '0' : '1'}"><button class="btn ${u.suspended ? '' : 'd'}">${u.suspended ? 'Unsuspend' : 'Suspend'}</button>`)}
      ${post('password', `<input name="password" type="text" minlength="8" placeholder="New password" required autocomplete="off"><button class="btn">Set password</button>`)}
    </div>
    <div class="act"><h3>Delete account</h3><p>Deletes the login, the page and uploaded images. Type the email to confirm.</p>
      ${post('delete', `<input name="confirm" placeholder="${esc(u.email)}" required style="width:220px"><button class="btn d">Delete</button>`)}</div>
  </div>
</div>
<h2>Page</h2><div class="card">${sitesTbl}</div>`)
}

export function analyticsPage(top: Awaited<ReturnType<typeof import('./data').topSites>>, adminEmail: string): string {
  const rows = top.length ? `<table><tr><th>Page</th><th>Account</th><th>Views (30 days)</th><th>Clicks (30 days)</th></tr>${top.map((t) => `<tr><td><a href="${esc(pageUrl(t.username))}" target="_blank" rel="noopener">/${esc(t.username)}</a></td><td>${t.userId ? `<a href="/users/${esc(t.userId)}">${esc(t.email ?? t.userId)}</a>` : ''}</td><td>${t.views}</td><td>${t.clicks}</td></tr>`).join('')}</table>` : '<div class="empty">No views recorded yet.</div>'
  return shell({ title: 'Statistics', active: 'analytics', adminEmail }, `<h1>Statistics</h1><div class="card">${rows}</div>`)
}

export function auditPage(rows: Awaited<ReturnType<typeof import('./data').recentAudit>>, adminEmail: string): string {
  const body = rows.length ? `<table><tr><th>When</th><th>Admin</th><th>Action</th><th>Target</th><th>Detail</th></tr>${rows.map((a) => `<tr><td class="mono">${fmtDate(a.createdAt)}</td><td>${esc(a.adminEmail)}</td><td>${badge(a.action)}</td><td class="mono">${a.targetUserId ? `<a href="/users/${esc(a.targetUserId)}">account</a> ` : ''}${esc(a.targetId ?? '')}</td><td class="mono">${esc(JSON.stringify(a.detail))}</td></tr>`).join('')}</table>` : '<div class="empty">No admin actions yet.</div>'
  return shell({ title: 'Audit log', active: 'audit', adminEmail }, `<h1>Audit log</h1><div class="card">${body}</div>`)
}

// Calls Better-Auth on this host.
const LOGIN_JS = `var f=document.getElementById('lf'),msg=document.getElementById('msg');
f.onsubmit=async function(e){e.preventDefault();msg.textContent='';
 try{
  var r=await fetch('/api/auth/sign-in/email',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:f.email.value,password:f.password.value})});
  var j=await r.json().catch(function(){return{}});
  if(!r.ok){msg.textContent=(j&&j.message)||'Sign-in failed';return}
  location.href='/';
 }catch(err){msg.textContent='Network error'}
};`
