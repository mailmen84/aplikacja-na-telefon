'use strict';
/* Homelab Wiki — single-file vanilla JS app. Hash routes:
   #/                       home
   #/c/<cat>                category
   #/a/<cat>/<slug>[/<id>]  article (optionally scrolled to a heading)
   #/s/<query>              search
   #/favorites  #/tools  #/tools/<tool>  #/settings */

const $ = (sel, el = document) => el.querySelector(sel);
const view = $('#view');
const qInput = $('#q');
let DATA, INDEX, byId, catById, articleById;

// ---------- storage (never trusted to exist: private mode etc.) ----------
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};
const favKey = (c) => `${c.platform}:${c.cmd}`;
const favs = () => store.get('favs', { articles: [], commands: [] });
function toggleFav(kind, key) {
  const f = favs();
  const list = f[kind];
  const i = list.indexOf(key);
  if (i >= 0) list.splice(i, 1); else list.unshift(key);
  store.set('favs', f);
  toast(i >= 0 ? 'Removed from saved' : 'Saved');
  return i < 0;
}
function pushRecent(id) {
  const r = store.get('recent', []).filter((x) => x !== id);
  r.unshift(id);
  store.set('recent', r.slice(0, 8));
}

// ---------- helpers ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fold = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function highlight(text, terms) {
  const safe = esc(text);
  if (!terms || !terms.length) return safe;
  const re = new RegExp(`(${terms.filter((t) => t.length > 1).map((t) => reEsc(esc(t))).join('|')})`, 'gi');
  return terms.length ? safe.replace(re, '<mark>$1</mark>') : safe;
}

function snippet(text, terms, len = 150) {
  const low = fold(text);
  let pos = -1;
  for (const t of terms) { pos = low.indexOf(fold(t)); if (pos >= 0) break; }
  if (pos < 0) return text.slice(0, len) + (text.length > len ? '…' : '');
  const start = Math.max(0, pos - 50);
  return (start ? '…' : '') + text.slice(start, start + len) + (start + len < text.length ? '…' : '');
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1400);
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  if (btn) {
    const old = btn.textContent;
    btn.textContent = 'Copied';
    btn.classList.add('done');
    setTimeout(() => { btn.textContent = old; btn.classList.remove('done'); }, 1200);
  } else toast('Copied');
}

const PLATFORM_LABEL = {
  linux: 'Linux', cmd: 'CMD', powershell: 'PowerShell', cisco: 'Cisco IOS', windows: 'Windows',
  proxmox: 'Proxmox', docker: 'Docker', git: 'Git', shell: 'Shell',
};

// ---------- rendering pieces ----------
function commandCard(c, terms) {
  const isFav = favs().commands.includes(favKey(c));
  const cat = catById[c.category];
  return `<div class="card${c.danger ? ' danger' : ''}" data-cmd="${esc(c.id)}">
    <div class="cmdline">
      <code class="cmd">${highlight(c.cmd, terms)}</code>
      <button class="mini-btn" data-copy>Copy</button>
    </div>
    <p class="desc">${highlight(c.desc, terms)}</p>
    ${c.note ? `<p class="note">${esc(c.note)}</p>` : ''}
    ${c.danger ? `<p class="note" style="color:var(--danger)">⚠️ ${esc(typeof c.danger === 'string' ? c.danger : 'Destructive — double-check before running.')}</p>` : ''}
    <div class="meta">
      <span class="badge">${esc(PLATFORM_LABEL[c.platform] || c.platform)}</span>
      ${c.admin ? '<span class="badge admin">admin / sudo</span>' : ''}
      ${c.danger ? '<span class="badge danger">destructive</span>' : ''}
      ${terms ? `<a class="badge" href="#/c/${c.category}">${cat.icon} ${esc(cat.name)}</a>` : ''}
      <span style="flex:1"></span>
      <button class="star${isFav ? ' on' : ''}" data-fav-cmd aria-label="Save">${isFav ? '★' : '☆'}</button>
    </div>
  </div>`;
}

function articleRow(a) {
  const cat = catById[a.category];
  return `<a class="row" href="#/a/${a.id}">
    <div class="crumb">${cat.icon} ${esc(cat.name)}</div>
    <b>${esc(a.title)}</b>${a.summary ? `<small>${esc(a.summary)}</small>` : ''}</a>`;
}

function commandSheets(cmds, platformFilter) {
  const shown = platformFilter ? cmds.filter((c) => c.platform === platformFilter) : cmds;
  let html = '';
  let lastGroup = null;
  for (const c of shown) {
    const g = `${c.sheet} › ${c.group}`;
    if (g !== lastGroup) {
      if (lastGroup !== null) html += '</div>';
      html += `<div class="group-title">${esc(c.group)}</div><div class="list">`;
      lastGroup = g;
    }
    html += commandCard(c);
  }
  return html + (lastGroup !== null ? '</div>' : '');
}

// ---------- views ----------
function viewHome() {
  const counts = {};
  for (const a of DATA.articles) counts[a.category] = (counts[a.category] || 0) + 1;
  const ccounts = {};
  for (const c of DATA.commands) ccounts[c.category] = (ccounts[c.category] || 0) + 1;
  const recent = store.get('recent', []).map((id) => articleById[id]).filter(Boolean);
  view.innerHTML = `
    <h1>What do you need?</h1>
    <p class="lead">${DATA.articles.length} notes · ${DATA.commands.length} commands · works offline</p>
    <div class="grid">${DATA.categories.map((c) => `
      <a class="cat" href="#/c/${c.id}" style="--cat:${c.color}">
        <span class="ico">${c.icon}</span><b>${esc(c.name)}</b>
        <small>${esc(c.description)}</small>
        <small>${counts[c.id] || 0} notes · ${ccounts[c.id] || 0} cmds</small>
      </a>`).join('')}
    </div>
    ${recent.length ? `<div class="section-title">Recently opened</div><div class="list">${recent.map(articleRow).join('')}</div>` : ''}
  `;
}

function viewCategory(catId, platform) {
  const cat = catById[catId];
  if (!cat) return viewNotFound();
  const arts = DATA.articles.filter((a) => a.category === catId)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  const cmds = DATA.commands.filter((c) => c.category === catId);
  const platforms = [...new Set(cmds.map((c) => c.platform))];
  view.innerHTML = `
    <div class="crumbs"><a href="#/">Home</a></div>
    <h1>${cat.icon} ${esc(cat.name)}</h1>
    <p class="lead">${esc(cat.description)}</p>
    ${arts.length ? `<div class="section-title">Notes</div><div class="list">${arts.map(articleRow).join('')}</div>` : ''}
    ${cmds.length ? `<div class="section-title">Command cards (${cmds.length})</div>
      ${platforms.length > 1 ? `<div class="chips">
        <button class="chip${!platform ? ' on' : ''}" data-platform="">All</button>
        ${platforms.map((p) => `<button class="chip${p === platform ? ' on' : ''}" data-platform="${p}">${esc(PLATFORM_LABEL[p] || p)}</button>`).join('')}
      </div>` : ''}
      <div id="sheets">${commandSheets(cmds, platform)}</div>` : ''}
    ${!arts.length && !cmds.length ? '<p class="empty">Nothing here yet.</p>' : ''}
  `;
  view.querySelectorAll('[data-platform]').forEach((b) => b.addEventListener('click', () => {
    view.querySelectorAll('[data-platform]').forEach((x) => x.classList.toggle('on', x === b));
    $('#sheets').innerHTML = commandSheets(cmds, b.dataset.platform);
  }));
}

function viewArticle(id, anchor) {
  const a = articleById[id];
  if (!a) return viewNotFound();
  const cat = catById[a.category];
  const isFav = favs().articles.includes(id);
  pushRecent(id);
  const toc = a.toc.filter((t) => t.depth === 2);
  view.innerHTML = `
    <div class="crumbs"><a href="#/">Home</a> › <a href="#/c/${cat.id}">${cat.icon} ${esc(cat.name)}</a></div>
    <div class="article-head">
      <h1>${esc(a.title)}</h1>
      <button class="star${isFav ? ' on' : ''}" id="fav-art" aria-label="Save" style="font-size:1.5rem">${isFav ? '★' : '☆'}</button>
    </div>
    ${a.summary ? `<p class="lead">${esc(a.summary)}</p>` : ''}
    ${toc.length > 2 ? `<details class="toc"><summary>Contents (${toc.length})</summary><ol>
      ${a.toc.map((t) => `<li class="d${t.depth}"><a href="#/a/${a.id}/${t.id}">${esc(t.title)}</a></li>`).join('')}
    </ol></details>` : ''}
    <article class="prose">${a.html}</article>
  `;
  $('#fav-art').addEventListener('click', (e) => {
    const on = toggleFav('articles', id);
    e.currentTarget.classList.toggle('on', on);
    e.currentTarget.textContent = on ? '★' : '☆';
  });
  if (anchor) scrollToAnchor(anchor);
}

function scrollToAnchor(anchor) {
  const el = document.getElementById(anchor);
  if (!el) return;
  requestAnimationFrame(() => {
    el.scrollIntoView({ block: 'start' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  });
}

let searchCat = '';
function runSearch(q) {
  const opts = {
    prefix: true,
    fuzzy: (term) => (term.length > 4 ? 0.2 : false),
    boost: { cmd: 3, title: 3, tags: 2, group: 1.5, desc: 1.5, articleTitle: 1.2 },
  };
  let res = INDEX.search(q, { ...opts, combineWith: 'AND' });
  if (!res.length) res = INDEX.search(q, { ...opts, combineWith: 'OR' });
  return res;
}

function viewSearch(q) {
  if (document.activeElement !== qInput) qInput.value = q;
  if (!q.trim()) { viewHome(); return; }
  const res = runSearch(q);
  const cats = [...new Set(res.map((r) => byId[r.id].category))];
  if (searchCat && !cats.includes(searchCat)) searchCat = '';
  const filtered = res.filter((r) => !searchCat || byId[r.id].category === searchCat);
  const cmdHits = filtered.filter((r) => r.type === 'command' || byId[r.id].type === 'command').slice(0, 40);
  const secHits = filtered.filter((r) => byId[r.id].type === 'section').slice(0, 40);
  view.innerHTML = `
    <div class="chips">
      <button class="chip${!searchCat ? ' on' : ''}" data-cat="">All (${res.length})</button>
      ${DATA.categories.filter((c) => cats.includes(c.id)).map((c) =>
        `<button class="chip${c.id === searchCat ? ' on' : ''}" data-cat="${c.id}">${c.icon} ${esc(c.name)}</button>`).join('')}
    </div>
    ${!filtered.length ? `<p class="empty">No results for “${esc(q)}”.<br>Try fewer or different words.</p>` : ''}
    ${cmdHits.length ? `<div class="section-title">Commands</div><div class="list">${cmdHits.map((r) => commandCard(byId[r.id], r.terms)).join('')}</div>` : ''}
    ${secHits.length ? `<div class="section-title">Notes</div><div class="list">${secHits.map((r) => {
      const s = byId[r.id];
      const cat = catById[s.category];
      return `<a class="row" href="#/a/${s.article}${s.anchor ? '/' + s.anchor : ''}">
        <div class="crumb">${cat.icon} ${esc(cat.name)} › ${esc(s.articleTitle)}</div>
        <b>${highlight(s.title, r.terms)}</b>
        <small>${highlight(snippet(s.text, r.terms), r.terms)}</small></a>`;
    }).join('')}</div>` : ''}
  `;
  view.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
    searchCat = b.dataset.cat;
    viewSearch(q);
  }));
}

function viewFavorites() {
  const f = favs();
  const arts = f.articles.map((id) => articleById[id]).filter(Boolean);
  const cmds = f.commands.map((k) => DATA.commands.find((c) => favKey(c) === k)).filter(Boolean);
  view.innerHTML = `
    <h1>★ Saved</h1>
    ${!arts.length && !cmds.length ? '<p class="empty">Nothing saved yet.<br>Tap ☆ on a note or a command to keep it here.</p>' : ''}
    ${cmds.length ? `<div class="section-title">Commands</div><div class="list">${cmds.map((c) => commandCard(c, [])).join('')}</div>` : ''}
    ${arts.length ? `<div class="section-title">Notes</div><div class="list">${arts.map(articleRow).join('')}</div>` : ''}
  `;
}

function viewSettings() {
  const theme = store.get('themeChoice', 'auto');
  view.innerHTML = `
    <h1>Settings</h1>
    <div class="panel">
      <div class="settings-row"><span>Theme</span>
        <div class="seg">${['auto', 'light', 'dark'].map((t) => `<button data-theme-set="${t}" class="${t === theme ? 'on' : ''}">${t}</button>`).join('')}</div>
      </div>
      <div class="settings-row"><span>Saved items &amp; history</span><button class="btn" id="clear">Clear</button></div>
      <div class="settings-row"><span>Update content</span><button class="btn" id="update">Check now</button></div>
    </div>
    <div class="panel">
      <dl class="kv">
        <dt>Notes</dt><dd>${DATA.articles.length}</dd>
        <dt>Sections</dt><dd>${DATA.sections.length}</dd>
        <dt>Commands</dt><dd>${DATA.commands.length}</dd>
        <dt>Version</dt><dd id="ver">…</dd>
      </dl>
    </div>
    <p class="lead" style="font-size:.85rem">Tip: on Android open the menu ⋮ in Chrome → “Add to Home screen” / “Install app”.
    After that everything works offline.</p>
  `;
  fetch('version.txt').then((r) => r.text()).then((v) => { $('#ver').textContent = v; }).catch(() => {});
  view.querySelectorAll('[data-theme-set]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.themeSet;
    store.set('themeChoice', t);
    try {
      if (t === 'auto') localStorage.removeItem('theme'); else localStorage.setItem('theme', t);
    } catch { /* ignore */ }
    if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    viewSettings();
  }));
  $('#clear').addEventListener('click', () => {
    if (!confirm('Clear saved items and recent history?')) return;
    store.set('favs', { articles: [], commands: [] });
    store.set('recent', []);
    toast('Cleared');
  });
  $('#update').addEventListener('click', async () => {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (!reg) { location.reload(); return; }
    await reg.update();
    toast(reg.installing || reg.waiting ? 'Update found — reloading…' : 'Already up to date');
    if (reg.installing || reg.waiting) setTimeout(() => location.reload(), 1200);
  });
}

function viewNotFound() {
  view.innerHTML = '<p class="empty">Page not found. <a href="#/">Go home</a></p>';
}

// ---------- tools ----------
function viewTools() {
  view.innerHTML = `
    <h1>🧮 Tools</h1>
    <div class="list">
      <a class="row" href="#/tools/subnet"><b>IPv4 subnet calculator</b><small>Network, broadcast, host range, mask, wildcard, binary view, split into subnets</small></a>
      <a class="row" href="#/tools/chmod"><b>chmod calculator</b><small>Linux permissions: rwx ⇄ octal (755, 644…)</small></a>
    </div>`;
}

const ip2int = (ip) => ip.split('.').reduce((a, o) => (a << 8) + Number(o), 0) >>> 0;
const int2ip = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');
const maskOf = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);
const toBin = (n) => [24, 16, 8, 0].map((s) => ((n >>> s) & 255).toString(2).padStart(8, '0')).join('.');

function parseIpInput(str) {
  const m = str.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\s*(?:\/\s*(\d{1,2})|\s+(\d{1,3}(?:\.\d{1,3}){3}))?$/);
  if (!m) return { error: 'Use the form 192.168.1.10/24 or 192.168.1.10 255.255.255.0' };
  if (m[1].split('.').some((o) => Number(o) > 255)) return { error: 'Each octet must be 0–255' };
  let prefix = 24;
  if (m[2] !== undefined) prefix = Number(m[2]);
  else if (m[3]) {
    const mask = ip2int(m[3]);
    const inv = ~mask >>> 0;
    if ((inv & (inv + 1)) !== 0) return { error: 'That subnet mask is not contiguous' };
    prefix = 32 - Math.log2(inv + 1);
  }
  if (prefix > 32) return { error: 'Prefix must be 0–32' };
  return { ip: ip2int(m[1]), prefix };
}

function classify(ip) {
  const o = ip >>> 24;
  const cls = o < 128 ? 'A' : o < 192 ? 'B' : o < 224 ? 'C' : o < 240 ? 'D (multicast)' : 'E (experimental)';
  const inRange = (net, p) => ((ip & maskOf(p)) >>> 0) === ip2int(net);
  let type = 'Public';
  if (inRange('10.0.0.0', 8) || inRange('172.16.0.0', 12) || inRange('192.168.0.0', 16)) type = 'Private (RFC 1918)';
  else if (inRange('127.0.0.0', 8)) type = 'Loopback';
  else if (inRange('169.254.0.0', 16)) type = 'Link-local / APIPA (no DHCP answer!)';
  else if (inRange('100.64.0.0', 10)) type = 'CGNAT (shared address space)';
  else if (inRange('0.0.0.0', 8)) type = 'This network / unspecified';
  else if (o >= 224 && o < 240) type = 'Multicast';
  else if (o >= 240) type = 'Reserved';
  return { cls, type };
}

function viewSubnet() {
  const last = store.get('subnetInput', '192.168.1.10/26');
  view.innerHTML = `
    <div class="crumbs"><a href="#/tools">Tools</a></div>
    <h1>IPv4 subnet calculator</h1>
    <div class="panel">
      <div class="field"><label for="ipin">IP address / prefix (or IP + mask)</label>
        <input id="ipin" value="${esc(last)}" inputmode="decimal" autocapitalize="off" spellcheck="false"></div>
      <div id="out"></div>
    </div>
    <div class="panel" id="split"></div>`;
  const input = $('#ipin');
  const render = () => {
    const r = parseIpInput(input.value);
    const out = $('#out');
    const split = $('#split');
    if (r.error) { out.innerHTML = `<p class="err">${r.error}</p>`; split.innerHTML = ''; return; }
    store.set('subnetInput', input.value.trim());
    const { ip, prefix } = r;
    const mask = maskOf(prefix);
    const net = (ip & mask) >>> 0;
    const bc = (net | ~mask) >>> 0;
    const total = 2 ** (32 - prefix);
    const usable = prefix >= 31 ? (prefix === 31 ? 2 : 1) : total - 2;
    const first = prefix >= 31 ? net : net + 1;
    const lastHost = prefix >= 31 ? bc : bc - 1;
    const { cls, type } = classify(ip);
    const binIp = toBin(ip);
    let bits = 0;
    const markBin = binIp.split('').map((ch) => {
      if (ch === '.') return '.';
      return bits++ < prefix ? `<span class="n">${ch}</span>` : ch;
    }).join('');
    out.innerHTML = `
      <dl class="kv">
        <dt>Network</dt><dd>${int2ip(net)}/${prefix}</dd>
        <dt>Broadcast</dt><dd>${int2ip(bc)}</dd>
        <dt>Host range</dt><dd>${int2ip(first)} – ${int2ip(lastHost)}</dd>
        <dt>Usable hosts</dt><dd>${usable.toLocaleString('en')}${prefix === 31 ? ' (point-to-point, RFC 3021)' : ''}</dd>
        <dt>Total addresses</dt><dd>${total.toLocaleString('en')}</dd>
        <dt>Subnet mask</dt><dd>${int2ip(mask)}</dd>
        <dt>Wildcard</dt><dd>${int2ip(~mask >>> 0)}</dd>
        <dt>Block size</dt><dd>${prefix > 24 ? 256 - ((mask & 255)) + ' (in 4th octet)' : prefix > 16 ? 256 - ((mask >>> 8) & 255) + ' (in 3rd octet)' : prefix > 8 ? 256 - ((mask >>> 16) & 255) + ' (in 2nd octet)' : '—'}</dd>
        <dt>Class</dt><dd>${cls}</dd>
        <dt>Type</dt><dd>${type}</dd>
      </dl>
      <div class="section-title">Binary (network bits in green)</div>
      <div class="bin">IP&nbsp;&nbsp;&nbsp;${markBin}</div>
      <div class="bin">Mask ${toBin(mask)}</div>`;

    const maxNew = Math.min(30, prefix + 8);
    const opts = [];
    for (let p = prefix + 1; p <= maxNew; p++) opts.push(p);
    const chosen = Math.min(Math.max(store.get('splitPrefix', prefix + 2), prefix + 1), maxNew);
    split.innerHTML = opts.length ? `
      <div class="field"><label for="newp">Split ${int2ip(net)}/${prefix} into…</label>
        <select id="newp">${opts.map((p) => `<option value="${p}"${p === chosen ? ' selected' : ''}>/${p} — ${2 ** (p - prefix)} subnets × ${Math.max(2 ** (32 - p) - 2, 0)} hosts</option>`).join('')}</select></div>
      <div id="splitTable"></div>` : '<p class="lead">Nothing to split.</p>';
    const renderSplit = () => {
      const np = Number($('#newp').value);
      store.set('splitPrefix', np);
      const size = 2 ** (32 - np);
      const n = 2 ** (np - prefix);
      const rows = [];
      for (let i = 0; i < Math.min(n, 256); i++) {
        const s = net + i * size;
        rows.push(`<tr><td>${i + 1}</td><td>${int2ip(s)}/${np}</td><td>${int2ip(s + 1)} – ${int2ip(s + size - 2)}</td><td>${int2ip(s + size - 1)}</td></tr>`);
      }
      $('#splitTable').innerHTML = `<div class="prose"><div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Network</th><th>Usable range</th><th>Broadcast</th></tr></thead>
        <tbody>${rows.join('')}</tbody></table></div>
        ${n > 256 ? `<p class="lead">Showing first 256 of ${n}.</p>` : ''}</div>`;
    };
    if (opts.length) { $('#newp').addEventListener('change', renderSplit); renderSplit(); }
  };
  input.addEventListener('input', render);
  render();
}

function viewChmod() {
  const who = ['Owner (u)', 'Group (g)', 'Others (o)'];
  const perms = [['r', 4], ['w', 2], ['x', 1]];
  view.innerHTML = `
    <div class="crumbs"><a href="#/tools">Tools</a></div>
    <h1>chmod calculator</h1>
    <div class="panel">
      <div class="field"><label for="oct">Octal</label><input id="oct" value="755" inputmode="numeric" maxlength="4"></div>
      <div class="prose"><div class="table-wrap"><table>
        <thead><tr><th></th>${perms.map(([p, v]) => `<th>${p} (${v})</th>`).join('')}</tr></thead>
        <tbody>${who.map((w, i) => `<tr><td>${w}</td>${perms.map(([p, v]) =>
          `<td><input type="checkbox" data-i="${i}" data-v="${v}" aria-label="${w} ${p}"></td>`).join('')}</tr>`).join('')}</tbody>
      </table></div></div>
      <dl class="kv" style="margin-top:10px">
        <dt>Symbolic</dt><dd id="sym"></dd>
        <dt>Command</dt><dd id="cmdout"></dd>
      </dl>
      <p class="lead" style="margin-top:12px;font-size:.85rem">Common: 755 dirs &amp; scripts · 644 regular files · 600 private keys (~/.ssh/id_*) · 700 ~/.ssh</p>
    </div>`;
  const oct = $('#oct');
  const boxes = [...view.querySelectorAll('input[type=checkbox]')];
  const fromOct = () => {
    const digits = oct.value.replace(/[^0-7]/g, '').slice(-3).padStart(3, '0');
    boxes.forEach((b) => { b.checked = (Number(digits[b.dataset.i]) & Number(b.dataset.v)) !== 0; });
    show(digits);
  };
  const fromBoxes = () => {
    const d = [0, 0, 0];
    boxes.forEach((b) => { if (b.checked) d[b.dataset.i] += Number(b.dataset.v); });
    oct.value = d.join('');
    show(d.join(''));
  };
  const show = (digits) => {
    $('#sym').textContent = '-' + [...digits].map((d) => perms.map(([p, v]) => (d & v ? p : '-')).join('')).join('');
    $('#cmdout').textContent = `chmod ${digits} <file>`;
  };
  oct.addEventListener('input', fromOct);
  boxes.forEach((b) => b.addEventListener('change', fromBoxes));
  fromOct();
}

// ---------- router ----------
function upTarget(parts) {
  if (parts[0] === 'a') return `#/c/${parts[1]}`;
  if (parts[0] === 'tools' && parts[1]) return '#/tools';
  return '#/';
}

function route() {
  const hash = decodeURIComponent(location.hash.slice(1) || '/');
  const parts = hash.split('/').filter(Boolean);
  const [head] = parts;
  $('#back').hidden = !head;
  $('#back').dataset.up = upTarget(parts);
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active',
    a.dataset.tab === (head === 'favorites' ? 'favorites' : head === 'tools' ? 'tools' : !head ? 'home' : '')));
  if (head !== 's' && document.activeElement !== qInput) qInput.value = '';

  if (!head) viewHome();
  else if (head === 'c') viewCategory(parts[1]);
  else if (head === 'a') {
    const id = `${parts[1]}/${parts[2]}`;
    if (route.lastArticle === id && $('.prose') && parts[3]) { scrollToAnchor(parts[3]); return; }
    viewArticle(id, parts[3]);
    route.lastArticle = id;
    if (!parts[3]) window.scrollTo(0, 0);
    return;
  } else if (head === 's') viewSearch(hash.slice(3));
  else if (head === 'favorites') viewFavorites();
  else if (head === 'tools') (parts[1] === 'subnet' ? viewSubnet : parts[1] === 'chmod' ? viewChmod : viewTools)();
  else if (head === 'settings') viewSettings();
  else viewNotFound();
  route.lastArticle = null;
  if (head !== 's') window.scrollTo(0, 0);
}

// ---------- global events ----------
let searchTimer;
qInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = qInput.value;
    const target = q.trim() ? `#/s/${encodeURIComponent(q)}` : '#/';
    if (location.hash.startsWith('#/s/') || !q.trim()) history.replaceState(null, '', target);
    else history.pushState(null, '', target);
    route();
  }, 120);
});
qInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') qInput.blur(); });

window.addEventListener('hashchange', route);
window.addEventListener('popstate', () => { if (location.hash.startsWith('#/s/')) route(); });
// The on-screen back arrow goes one level *up*; the phone's back gesture walks history.
$('#back').addEventListener('click', () => { location.hash = $('#back').dataset.up; });

view.addEventListener('click', (e) => {
  const copyBtn = e.target.closest('.code .copy');
  if (copyBtn) {
    copyText(copyBtn.parentElement.querySelector('code').textContent.replace(/\n$/, ''), copyBtn);
    return;
  }
  const card = e.target.closest('.card[data-cmd]');
  if (!card) return;
  const c = byId[card.dataset.cmd];
  if (e.target.closest('[data-copy]')) copyText(c.cmd, e.target.closest('[data-copy]'));
  else if (e.target.closest('[data-fav-cmd]')) {
    const on = toggleFav('commands', favKey(c));
    const star = e.target.closest('[data-fav-cmd]');
    star.classList.toggle('on', on);
    star.textContent = on ? '★' : '☆';
  }
});

// ---------- boot ----------
(async function boot() {
  try {
    DATA = await (await fetch('data.json')).json();
  } catch {
    view.innerHTML = '<p class="empty">Could not load data. Check your connection and reload.</p>';
    return;
  }
  byId = {};
  catById = Object.fromEntries(DATA.categories.map((c) => [c.id, c]));
  articleById = Object.fromEntries(DATA.articles.map((a) => [a.id, a]));
  const docs = [...DATA.commands, ...DATA.sections];
  for (const d of docs) byId[d.id] = d;
  INDEX = new MiniSearch({
    fields: ['cmd', 'title', 'desc', 'tags', 'group', 'articleTitle', 'text', 'note'],
    storeFields: ['type'],
    extractField: (doc, f) => (f === 'tags' && Array.isArray(doc.tags) ? doc.tags.join(' ') : doc[f]),
    processTerm: (t) => {
      const v = fold(t);
      return v.length > 0 ? v : null;
    },
  });
  INDEX.addAll(docs);
  route();
})();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
