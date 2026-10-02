// Builds the static PWA into dist/:
//   content/**/*.md   -> articles (rendered HTML + per-section search docs)
//   commands/*.yaml   -> command cards
//   src/*             -> app shell, copied as-is
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync, copyFileSync } from 'node:fs';
import { join, basename, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import yaml from 'js-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const errors = [];

const slugify = (s) =>
  s.toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stripMd = (s) =>
  s.replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*/g, ' '))
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:#+|>+)\s?/gm, '')
    .replace(/\*\*|__|\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function walk(dir, ext) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, ext));
    else if (name.endsWith(ext)) out.push(p);
  }
  return out.sort();
}

function parseFrontmatter(src, file) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) {
    errors.push(`${file}: missing frontmatter`);
    return { meta: {}, body: src };
  }
  return { meta: yaml.load(m[1]) || {}, body: src.slice(m[0].length) };
}

// ---------- categories ----------
const categories = yaml.load(readFileSync(join(root, 'content/categories.yaml'), 'utf8'));
const catIds = new Set(categories.map((c) => c.id));

// ---------- articles ----------
const articles = [];
const sections = [];

for (const file of walk(join(root, 'content'), '.md')) {
  const rel = relative(join(root, 'content'), file);
  const category = rel.split('/')[0];
  const slug = basename(file, '.md');
  const { meta, body } = parseFrontmatter(readFileSync(file, 'utf8'), rel);
  if (!catIds.has(category)) errors.push(`${rel}: unknown category folder "${category}"`);
  if (!meta.title) errors.push(`${rel}: missing title`);

  // Split body on h2 so every section is its own search hit.
  const parts = [];
  let cur = { title: null, md: '' };
  for (const line of body.split('\n')) {
    const h = !cur.inFence && line.match(/^## (.+)/);
    if (/^```/.test(line)) cur.inFence = !cur.inFence;
    if (h) {
      parts.push(cur);
      cur = { title: h[1].trim(), md: '' };
    } else cur.md += line + '\n';
  }
  parts.push(cur);

  const toc = [];
  const usedIds = new Set();
  const uniqueId = (base) => {
    let id = base, n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    return id;
  };

  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        const id = uniqueId(slugify(text));
        if (depth === 3) toc.push({ id, title: text.replace(/<[^>]+>/g, ''), depth });
        return `<h${depth} id="${id}">${text}</h${depth}>\n`;
      },
      code({ text, lang }) {
        return `<div class="code"><pre><code${lang ? ` data-lang="${escapeHtml(lang)}"` : ''}>${escapeHtml(text)}</code></pre><button class="copy" aria-label="Copy">Copy</button></div>\n`;
      },
      table(token) {
        return `<div class="table-wrap">${this.constructor.prototype.table.call(this, token)}</div>`;
      },
      link({ href, tokens }) {
        const text = this.parser.parseInline(tokens);
        const ext = /^https?:/.test(href);
        return `<a href="${escapeHtml(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
      },
    },
  });

  let html = '';
  parts.forEach((p, i) => {
    if (p.title) {
      const titleHtml = marked.parseInline(p.title);
      const id = uniqueId(slugify(titleHtml));
      toc.push({ id, title: titleHtml.replace(/<[^>]+>/g, ''), depth: 2 });
      html += `<h2 id="${id}">${titleHtml}</h2>\n`;
      sections.push({
        id: `${category}/${slug}#${id}`,
        type: 'section',
        article: `${category}/${slug}`,
        anchor: id,
        title: stripMd(p.title),
        articleTitle: meta.title,
        category,
        tags: (meta.tags || []).join(' '),
        text: stripMd(p.md),
      });
    } else if (i === 0 && p.md.trim()) {
      sections.push({
        id: `${category}/${slug}#`,
        type: 'section',
        article: `${category}/${slug}`,
        anchor: '',
        title: meta.title,
        articleTitle: meta.title,
        category,
        tags: (meta.tags || []).join(' '),
        text: `${meta.summary || ''} ${stripMd(p.md)}`,
      });
    }
    html += marked.parse(p.md);
  });

  // Rewrite links between wiki articles: "../linux/files.md#x" -> "#/a/linux/files/x"
  html = html.replace(/href="((?:\.\.\/)?(?:([\w-]+)\/)?([\w-]+)\.md)(?:#([\w-]+))?"/g, (_, _p, cat, s, anchor) =>
    `href="#/a/${cat || category}/${s}${anchor ? '/' + anchor : ''}"`);

  articles.push({
    id: `${category}/${slug}`,
    category,
    slug,
    title: meta.title,
    summary: meta.summary || '',
    tags: meta.tags || [],
    order: meta.order ?? 100,
    toc,
    html,
  });
}

// Validate internal links point at real articles.
const articleIds = new Set(articles.map((a) => a.id));
for (const a of articles) {
  for (const [, target] of a.html.matchAll(/href="#\/a\/([\w-]+\/[\w-]+)/g)) {
    if (!articleIds.has(target)) errors.push(`${a.id}: broken link to ${target}`);
  }
}

// ---------- commands ----------
const commands = [];
const PLATFORMS = new Set(['linux', 'cmd', 'powershell', 'cisco', 'windows', 'proxmox', 'docker', 'git', 'shell']);
for (const file of walk(join(root, 'commands'), '.yaml')) {
  const rel = relative(root, file);
  const doc = yaml.load(readFileSync(file, 'utf8'));
  const defaults = doc.defaults || {};
  for (const [gi, group] of (doc.groups || []).entries()) {
    for (const [ci, raw] of (group.commands || []).entries()) {
      const c = { ...defaults, ...(group.defaults || {}), ...raw };
      const where = `${rel} > ${group.name} > ${c.cmd}`;
      if (!c.cmd || !c.desc) errors.push(`${where}: needs cmd and desc`);
      if (!catIds.has(c.category)) errors.push(`${where}: unknown category "${c.category}"`);
      if (!PLATFORMS.has(c.platform)) errors.push(`${where}: unknown platform "${c.platform}"`);
      commands.push({
        id: `${basename(file, '.yaml')}-${gi}-${ci}`,
        type: 'command',
        cmd: String(c.cmd),
        desc: c.desc,
        note: c.note || '',
        platform: c.platform,
        category: c.category,
        group: group.name,
        sheet: doc.title,
        tags: c.tags || [],
        admin: !!c.admin,
        danger: c.danger || false,
      });
    }
  }
}

if (errors.length) {
  console.error('Content errors:\n  ' + errors.join('\n  '));
  if (!process.env.ALLOW_ERRORS) process.exit(1);
}

// ---------- output ----------
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const data = { categories, articles, sections, commands };
const dataJson = JSON.stringify(data);
writeFileSync(join(dist, 'data.json'), dataJson);

const copyDir = (from, to) => {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    const p = join(from, name);
    if (statSync(p).isDirectory()) copyDir(p, join(to, name));
    else copyFileSync(p, join(to, name));
  }
};
copyDir(join(root, 'src'), dist);
copyFileSync(join(root, 'node_modules/minisearch/dist/umd/index.js'), join(dist, 'minisearch.js'));

// Service worker gets a content hash so every deploy invalidates the old cache.
const shellFiles = walk(dist, '').map((p) => relative(dist, p)).filter((p) => p !== 'sw.js');
const hash = createHash('sha256');
for (const f of shellFiles) hash.update(f).update(readFileSync(join(dist, f)));
const version = hash.digest('hex').slice(0, 12);
const sw = readFileSync(join(dist, 'sw.js'), 'utf8')
  .replace('__VERSION__', version)
  .replace('__FILES__', JSON.stringify(['./', ...shellFiles.filter((f) => f !== 'index.html')]));
writeFileSync(join(dist, 'sw.js'), sw);
writeFileSync(join(dist, 'version.txt'), version);

console.log(
  `Built ${articles.length} articles, ${sections.length} sections, ${commands.length} commands ` +
  `(${(dataJson.length / 1024).toFixed(0)} KB data, version ${version})`,
);
