import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, base, escape as e, loadPublications, validate } from './publications.mjs';

const previewId = process.argv[2];
const all = validate(loadPublications({ includePrivate: Boolean(previewId) }), { publicBuild: !previewId });
const publications = all.filter(p => p.status === 'published' && p.approved === true);
const byId = new Map(publications.map(p => [p.id, p]));
const absolute = path => new URL(path, base).href;
const local = path => '../../' + path;
const audioType = path => path.endsWith('.ogg') ? 'audio/ogg' : path.endsWith('.m4a') ? 'audio/mp4' : path.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';
const fragment = path => readFileSync(resolve(root, path), 'utf8');
const section = (id, label, body) => `<section class="publication-section" id="${id}" aria-labelledby="${id}-title"><h2 id="${id}-title">${label}</h2>${body}</section>`;
const link = (url, label, download = false) => `<a class="publication-link" href="${e(url)}"${download ? ' download' : ''}>${e(label)} <span aria-hidden="true">↗</span></a>`;
function page(p, preview = false) {
  const canonical = absolute(p.url);
  const art = p.artwork || p.thumbnail || { path: 'assets/ministry-logo.webp', alt: 'NEWS ministry crest', width: 900, height: 900 };
  const audio = p.audio?.length ? section('original-audio', 'Original spoken recording', `<p>${e(p.sourceNote || 'Original recording associated with this publication.')}</p><audio controls preload="none" aria-label="Original recording for ${e(p.title)}">${p.audio.map(path => `<source src="${e(local(path))}" type="${audioType(path)}">`).join('')}Your browser does not support audio playback.</audio>`) : '';
  const content = [
    p.transcription && section('transcription', 'Verbatim transcription', `<p class="publication-source">Original spoken words, transcribed without theological rewriting.</p><div class="study-article">${fragment(p.transcription)}</div>`),
    p.writtenMessage && section('written-message', 'Approved written message', `<p class="publication-source">Edited written material. ${e(p.sourceNote || '')}</p><article class="sermon">${fragment(p.writtenMessage)}</article>`),
    p.essay && section('bible-study', 'Extended Bible study', `<p class="publication-source">Approved expanded study. ${e(p.sourceNote || '')}</p><div class="study-article">${fragment(p.essay)}</div>`),
    p.lyrics && section('worship-lyrics', 'Worship lyrics', `<div class="publication-lyrics">${fragment(p.lyrics)}</div>`)
  ].filter(Boolean).join('');
  const refs = p.additionalScriptures?.length ? section('scripture-references', 'Additional Scripture references', `<ul class="publication-references">${p.additionalScriptures.map(x => `<li>${e(x)}</li>`).join('')}</ul>`) : '';
  const questions = p.reflectionQuestions?.length ? section('reflection-questions', 'Personal reflection', `<ol>${p.reflectionQuestions.map(x => `<li>${e(x)}</li>`).join('')}</ol>`) : '';
  const downloads = [p.pdf && link(local(p.pdf), 'Download PDF publication', true), p.infographic && link(local(p.infographic), 'Download infographic', true)].filter(Boolean);
  const resources = downloads.length ? section('downloads', 'Publication downloads', `<div class="publication-links">${downloads.join('')}</div>`) : '';
  const video = p.youtube ? section('video', 'Video', `${p.thumbnail ? `<img class="publication-video-art" src="${e(local(p.thumbnail.path))}" alt="${e(p.thumbnail.alt)}" width="${p.thumbnail.width}" height="${p.thumbnail.height}" loading="lazy">` : ''}${link(p.youtube, 'Watch on YouTube')}`) : '';
  const worship = p.worshipAudio?.length ? section('worship-audio', 'Worship audio', `<audio controls preload="none" aria-label="Worship audio">${p.worshipAudio.map(path => `<source src="${e(local(path))}" type="${audioType(path)}">`).join('')}</audio>`) : '';
  const related = p.related?.length ? section('related-publications', 'Related teachings', `<div class="publication-links">${p.related.map(id => link(local(byId.get(id).url), byId.get(id).title)).join('')}</div>`) : '';
  const dates = [p.recordedAt && 'Recorded ' + e(p.recordedAt), p.publishedAt && 'Published ' + e(p.publishedAt)].filter(Boolean).join(' · ');
  const nav = [['index.html', 'Home'], ['index.html#library', 'Library'], ['gospel.html', 'Bible study'], ['index.html#worship', 'Worship']].map(([url, label]) => `<a href="../../${url}">${label}</a>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#faf8f3"><title>${e(p.title)} | NEWS</title><meta name="description" content="${e(p.summary)}">${preview ? '<meta name="robots" content="noindex,nofollow">' : `<link rel="canonical" href="${e(canonical)}">`}<meta property="og:type" content="article"><meta property="og:site_name" content="Nazarite Early World Synagogue (NEWS)"><meta property="og:title" content="${e(p.title)}"><meta property="og:description" content="${e(p.summary)}"><meta property="og:url" content="${e(canonical)}"><meta property="og:image" content="${e(absolute(art.path))}"><meta property="og:image:alt" content="${e(art.alt)}"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="../../assets/ministry-logo.webp"><link rel="stylesheet" href="../../styles.css"><script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': p.kind === 'song' ? 'MusicComposition' : 'Article', headline: p.title, description: p.summary, mainEntityOfPage: canonical, image: absolute(art.path), publisher: { '@type': 'Organization', name: 'Nazarite Early World Synagogue (NEWS)' }, ...(p.publishedAt ? { datePublished: p.publishedAt } : {}) }).replaceAll('<', '\\u003c')}</script></head>
<body><a class="skip-link" href="#main">Skip to main content</a><header class="publication-header"><div class="shell publication-header-inner"><a class="publication-brand" href="../../index.html"><img src="../../assets/ministry-logo.webp" alt="NEWS ministry crest" width="52" height="52"><span><strong>NEWS</strong><small>Nazarite Early World Synagogue</small></span></a><nav aria-label="Main navigation">${nav}</nav></div></header><main id="main"><div class="publication-hero"><div class="shell publication-hero-grid"><div><a class="back-link" href="../../index.html#library">← Publication library</a><p class="card-eyebrow">${e(p.number)} · ${e(p.categories?.join(' · ') || p.kind)}</p><h1>${e(p.title)}</h1>${p.subtitle ? `<p class="publication-subtitle">${e(p.subtitle)}</p>` : ''}<p class="publication-summary">${e(p.summary)}</p>${p.primaryScripture ? `<p class="publication-primary"><strong>Primary Scripture</strong> ${e(p.primaryScripture)}</p>` : ''}${p.speaker ? `<p>Speaker: ${e(p.speaker)}</p>` : ''}${dates ? `<p class="publication-dates">${dates}</p>` : ''}</div><div class="publication-art"><img src="${e(local(art.path))}" alt="${e(art.alt)}" width="${art.width}" height="${art.height}" decoding="async"></div></div></div><div class="shell publication-content">${audio}${content}${refs}${questions}${resources}${video}${worship}${related}<div class="publication-share"><button type="button" class="share-button" data-share>Share this publication ↗</button></div></div></main><footer class="site-footer"><div class="shell footer-bottom"><span>NEWS · Nazarite Early World Synagogue</span><a href="../../index.html">Return home</a></div></footer><div class="toast" id="toast" role="status" aria-live="polite"></div><script src="../../script.js" defer></script></body></html>
`;
}
if (previewId) {
  const draft = all.find(p => p.id === previewId);
  if (!draft) throw new Error(`Publication not found: ${previewId}`);
  const dir = resolve(root, 'preview', previewId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.html'), page(draft, true));
  console.log(`Prepared local-only preview: preview/${previewId}/`);
  process.exit(0);
}
const manifestPath = resolve(root, 'publications/.generated.json');
const prior = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : [];
for (const id of prior) {
  if (!/^(?:message|song|study|video)-\d{3}$/.test(id)) throw new Error('Invalid generated page manifest');
  if (!publications.some(p => p.id === id)) {
    const stale = resolve(root, 'publications', id, 'index.html');
    if (existsSync(stale)) unlinkSync(stale);
  }
}
for (const p of publications) {
  const dir = resolve(root, p.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.html'), page(p));
}
writeFileSync(manifestPath, JSON.stringify(publications.map(p => p.id), null, 2) + '\n');
const catalog = publications.map(p => ({ id: p.id, kind: p.kind, label: p.label || [p.number, p.primaryScripture].filter(Boolean).join(' · '), title: p.title, summary: p.summary, url: p.url, ...(p.artwork ? { image: p.artwork.path, imageAlt: p.artwork.alt, imageWidth: p.artwork.width, imageHeight: p.artwork.height } : {}), action: p.action || (p.kind === 'song' ? 'Read the lyrics' : 'Explore publication') }));
writeFileSync(resolve(root, 'content/catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
const cards = catalog.map(p => `<a class="library-card" href="${e(p.url)}" data-kind="${e(p.kind)}">${p.image ? `<div class="library-art"><img src="${e(p.image)}" alt="${e(p.imageAlt)}" width="${p.imageWidth}" height="${p.imageHeight}" loading="lazy" decoding="async"></div>` : `<div class="library-art library-art-lyrics" aria-hidden="true"><span>♪</span><strong>${e(p.title)}</strong><small>ORIGINAL WORSHIP LYRICS</small></div>`}<div class="library-body"><span class="card-eyebrow">${e(p.label)}</span><h3>${e(p.title)}</h3><p>${e(p.summary)}</p><span class="card-read">${e(p.action)} <span aria-hidden="true">↗</span></span></div></a>`).join('\n      ');
const indexPath = resolve(root, 'index.html');
let index = readFileSync(indexPath, 'utf8');
if (!index.includes('<!-- catalog:start -->') || !index.includes('<!-- catalog:end -->')) throw new Error('Catalog markers missing from index.html');
index = index.replace(/<!-- catalog:start -->[\s\S]*?<!-- catalog:end -->/, `<!-- catalog:start -->\n      ${cards}\n      <!-- catalog:end -->`);
index = index.replace(/<span class="discover-note">\d+ PUBLISHED RESOURCES<\/span>/, `<span class="discover-note">${publications.length} PUBLISHED RESOURCES</span>`);
const announcement = JSON.parse(readFileSync(resolve(root, 'content/announcements/upcoming-teaching.json'), 'utf8'));
if (announcement.type !== 'upcoming-teaching-announcement' || announcement.status !== 'published' || announcement.approved !== true || !announcement.title || !/^Romans 8:2$/.test(announcement.primaryScripture) || !announcement.summary || /—|&mdash;/.test(JSON.stringify(announcement))) throw new Error('Invalid approved upcoming teaching announcement');
if (!index.includes('<!-- announcement:start -->') || !index.includes('<!-- announcement:end -->')) throw new Error('Announcement markers missing from index.html');
index = index.replace(/<!-- announcement:start -->[\s\S]*?<!-- announcement:end -->/, `<!-- announcement:start --><section class="coming-section" id="upcoming"><div class="shell coming-content"><span class="coming-icon" aria-hidden="true">✦</span><div><div class="small-overline">UPCOMING MESSAGE</div><h2>${e(announcement.title)}</h2><p>${e(announcement.summary)}</p></div><span class="coming-pill">COMING SOON</span></div></section><!-- announcement:end -->`);
writeFileSync(indexPath, index);
const urls = ['', 'gospel.html', ...publications.map(p => p.url)].map(path => `  <url><loc>${e(absolute(path))}</loc></url>`).join('\n');
writeFileSync(resolve(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
console.log(`Built ${publications.length} publications and ${publications.length} library cards.`);
