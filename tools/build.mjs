import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const base = 'https://nisongmonyimba.github.io/news-ministry/';
const catalog = JSON.parse(readFileSync(resolve(root, 'content/catalog.json'), 'utf8'));
const validKinds = new Set(['sermon', 'publication', 'song', 'video']);
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const ids = new Set();

for (const entry of catalog) {
  for (const field of ['id', 'kind', 'label', 'title', 'summary', 'url', 'action']) {
    if (typeof entry[field] !== 'string' || !entry[field].trim()) throw new Error(`${entry.id || 'Entry'}: missing ${field}`);
  }
  if (!validKinds.has(entry.kind) || ids.has(entry.id)) throw new Error(`${entry.id}: invalid kind or duplicate ID`);
  ids.add(entry.id);
  if (entry.image) {
    if (typeof entry.imageAlt !== 'string' || !entry.imageAlt.trim()) throw new Error(`${entry.id}: missing image alternative text`);
    if (!Number.isInteger(entry.imageWidth) || !Number.isInteger(entry.imageHeight) || entry.imageWidth < 1 || entry.imageHeight < 1) throw new Error(`${entry.id}: invalid image dimensions`);
  } else if (entry.kind !== 'song') throw new Error(`${entry.id}: an image is required for this resource type`);
  if (!/^(?:#[a-z0-9-]+|[a-z0-9-]+\.html(?:#[a-z0-9-]+)?)$/.test(entry.url)) throw new Error(`${entry.id}: URL must stay inside the project site`);
  if (entry.image && (!/^assets\/[a-z0-9-]+\.webp$/.test(entry.image) || !existsSync(resolve(root, entry.image)))) throw new Error(`${entry.id}: missing image`);
  if (!entry.url.startsWith('#') && !existsSync(resolve(root, entry.url.split('#')[0]))) throw new Error(`${entry.id}: missing destination page`);
}

const cards = catalog.map(entry => {
  const art = entry.image
    ? `<div class="library-art"><img src="${escape(entry.image)}" alt="${escape(entry.imageAlt)}" width="${entry.imageWidth}" height="${entry.imageHeight}" loading="lazy" decoding="async"></div>`
    : `<div class="library-art library-art-lyrics" aria-hidden="true"><span>♪</span><strong>${escape(entry.title)}</strong><small>ORIGINAL WORSHIP LYRICS</small></div>`;
  return `      <a class="library-card" href="${escape(entry.url)}" data-kind="${escape(entry.kind)}">${art}<div class="library-body"><span class="card-eyebrow">${escape(entry.label)}</span><h3>${escape(entry.title)}</h3><p>${escape(entry.summary)}</p><span class="card-read">${escape(entry.action)} <span aria-hidden="true">↗</span></span></div></a>`;
}).join('\n');
const indexPath = resolve(root, 'index.html');
let index = readFileSync(indexPath, 'utf8');
const start = '      <!-- catalog:start -->';
const end = '      <!-- catalog:end -->';
const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
if (!pattern.test(index)) throw new Error('Catalog markers missing from index.html');
index = index.replace(pattern, `${start}\n${cards}\n      ${end.trim()}`);
index = index.replace(/<span class="discover-note">\d+ PUBLISHED RESOURCES<\/span>/, `<span class="discover-note">${catalog.length} PUBLISHED RESOURCES</span>`);
writeFileSync(indexPath, index);

const pages = new Set(['']);
for (const entry of catalog) if (!entry.url.startsWith('#')) pages.add(entry.url.split('#')[0]);
const urls = [...pages].map(page => `  <url><loc>${escape(new URL(page, base).href)}</loc></url>`).join('\n');
writeFileSync(resolve(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
console.log(`Built ${catalog.length} resource cards and ${pages.size} sitemap URLs.`);
