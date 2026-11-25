import { readFileSync, existsSync, readdirSync, realpathSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

export const root = resolve(import.meta.dirname, '..');
export const base = 'https://nisongmonyimba.github.io/news-ministry/';
export const states = new Set(['draft', 'under_review', 'approved', 'published', 'archived']);
const types = { artwork: ['webp', 'png', 'jpg', 'jpeg'], thumbnail: ['webp', 'png', 'jpg', 'jpeg'], infographic: ['webp', 'png', 'jpg', 'jpeg', 'pdf'], pdf: ['pdf'], audio: ['mp3', 'ogg', 'm4a', 'wav'], worshipAudio: ['mp3', 'ogg', 'm4a', 'wav'], transcription: ['html'], writtenMessage: ['html'], essay: ['html'], lyrics: ['html'] };
const locks = {
  'message-001/written.html': '8132ee55a8ef024fdabb394763217a043d9065bfb59fad7ab1370de98c8f8432',
  'message-002/essay.html': '8d680b0a918883f94f11bddecde580903bfb85f708e0a00c261e440ce00ce3e3',
  'song-001/lyrics.html': 'f30f835e3a7fec5bd8a66d0ef56a70bce0c22840dc6f87c3949e18d98df59189'
};
export const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export function safePath(path) {
  if (typeof path !== 'string' || !/^[a-zA-Z0-9_./-]+$/.test(path) || path.startsWith('/') || path.split('/').includes('..') || path.split('/').includes('.')) throw new Error(`Unsafe path: ${path}`);
  const full = resolve(root, path);
  if (relative(root, full).startsWith('..' + sep)) throw new Error(`Unsafe path: ${path}`);
  return full;
}
function checkFile(path, allowed, id) {
  const full = safePath(path);
  const ext = path.split('.').pop().toLowerCase();
  if (!allowed.includes(ext)) throw new Error(`${id}: unsupported file type: ${path}`);
  if (!existsSync(full)) throw new Error(`${id}: missing file: ${path}`);
  if (!realpathSync(full).startsWith(root + sep)) throw new Error(`${id}: file escapes repository: ${path}`);
  const bytes = readFileSync(full);
  if (ext === 'pdf' && bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error(`${id}: invalid PDF: ${path}`);
  if (ext === 'webp' && (bytes.subarray(0, 4).toString() !== 'RIFF' || bytes.subarray(8, 12).toString() !== 'WEBP')) throw new Error(`${id}: invalid WebP: ${path}`);
  if (ext === 'ogg' && bytes.subarray(0, 4).toString() !== 'OggS') throw new Error(`${id}: invalid Ogg: ${path}`);
  if (ext === 'png' && !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`${id}: invalid PNG: ${path}`);
  if (['jpg', 'jpeg'].includes(ext) && (bytes[0] !== 0xff || bytes[1] !== 0xd8)) throw new Error(`${id}: invalid JPEG: ${path}`);
  if (ext === 'wav' && (bytes.subarray(0, 4).toString() !== 'RIFF' || bytes.subarray(8, 12).toString() !== 'WAVE')) throw new Error(`${id}: invalid WAV: ${path}`);
  if (ext === 'm4a' && bytes.subarray(4, 8).toString() !== 'ftyp') throw new Error(`${id}: invalid M4A: ${path}`);
  if (ext === 'mp3' && bytes.subarray(0, 3).toString() !== 'ID3' && !(bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) throw new Error(`${id}: invalid MP3: ${path}`);
  const text = ext === 'html' ? readFileSync(full, 'utf8') : '';
  if (/—|&mdash;|&#(?:8212|x2014);/i.test(text)) throw new Error(`${id}: em dash in ${path}`);
  if (/<(?:script|iframe|object|embed|form)\b|\bon\w+\s*=|javascript:/i.test(text)) throw new Error(`${id}: unsafe HTML in ${path}`);
  for (const match of text.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = match[1];
    if (url.startsWith('#')) {
      if (!new RegExp(`\\bid="${url.slice(1)}"`).test(text)) throw new Error(`${id}: broken fragment link ${url} in ${path}`);
    } else if (!/^https:\/\//.test(url)) {
      const target = resolve(root, path, '..', url.split('#')[0]);
      if (!target.startsWith(root + sep) || !existsSync(target)) throw new Error(`${id}: broken internal link ${url} in ${path}`);
    }
  }
  const key = path.replace('content/publications/', '');
  if (locks[key] && createHash('sha256').update(readFileSync(full)).digest('hex') !== locks[key]) throw new Error(`${id}: approved source changed: ${path}`);
  return text;
}
export function loadPublications({ includePrivate = false } = {}) {
  const dir = resolve(root, 'content/publications');
  const paths = readdirSync(dir, { withFileTypes: true }).filter(x => x.isDirectory() && x.name !== 'TEMPLATE').map(x => `content/publications/${x.name}/publication.json`);
  if (includePrivate) {
    const privateDir = resolve(root, '.news-private');
    if (existsSync(privateDir)) paths.push(...readdirSync(privateDir).filter(x => x.endsWith('.json')).map(x => `.news-private/${x}`));
  }
  return paths.sort().map(path => ({ ...JSON.parse(readFileSync(safePath(path), 'utf8')), _file: path }));
}
export function validate(records, { publicBuild = false } = {}) {
  const ids = new Set(), urls = new Set(), numbers = new Set();
  for (const p of records) {
    const id = p.id || p._file;
    for (const field of ['id', 'number', 'kind', 'title', 'summary', 'status', 'url']) if (typeof p[field] !== 'string' || !p[field].trim()) throw new Error(`${id}: required field missing: ${field}`);
    if (!/^(?:message|song|study|video)-\d{3}$/.test(p.id)) throw new Error(`${id}: invalid permanent ID`);
    if (!/^(?:MESSAGE|SONG|STUDY|VIDEO) \d{3}$/.test(p.number)) throw new Error(`${id}: invalid publication number`);
    if (p.number.toLowerCase().replace(' ', '-') !== p.id) throw new Error(`${id}: number does not match ID`);
    if (!['sermon', 'publication', 'song', 'video'].includes(p.kind)) throw new Error(`${id}: invalid kind`);
    if (!states.has(p.status)) throw new Error(`${id}: invalid status`);
    if (ids.has(p.id) || urls.has(p.url) || numbers.has(p.number)) throw new Error(`${id}: duplicate ID, URL, or number`);
    ids.add(p.id); urls.add(p.url); numbers.add(p.number);
    if (p.url !== `publications/${p.id}/`) throw new Error(`${id}: URL must match permanent ID`);
    if (p.status === 'published' && p.approved !== true) throw new Error(`${id}: publication needs explicit approval`);
    if (publicBuild && p.status !== 'published' && p._file.startsWith('content/publications/')) throw new Error(`${id}: unpublished record in public content directory`);
    for (const field of ['primaryScripture', 'additionalScriptures']) {
      for (const value of (field === 'primaryScripture' ? (p[field] ? [p[field]] : []) : (p[field] || []))) {
        if (!/^(?:[1-3] )?[A-Z][a-z]+(?: [A-Z][a-z]+)* \d{1,3}:\d{1,3}(?:-\d{1,3})?$/.test(value)) throw new Error(`${id}: invalid Scripture reference: ${value}`);
      }
    }
    for (const field of ['categories', 'topics', 'related', 'additionalScriptures']) if (p[field] !== undefined && (!Array.isArray(p[field]) || p[field].some(v => typeof v !== 'string' || !v.trim()))) throw new Error(`${id}: invalid ${field}`);
    for (const [field, allowed] of Object.entries(types)) {
      const value = field === 'artwork' || field === 'thumbnail' ? p[field]?.path : p[field];
      if (value == null) continue;
      for (const path of Array.isArray(value) ? value : [value]) checkFile(path, allowed, id);
    }
    for (const field of ['artwork', 'thumbnail']) if (p[field] && (!p[field].alt || !Number.isInteger(p[field].width) || !Number.isInteger(p[field].height) || p[field].width < 1 || p[field].height < 1)) throw new Error(`${id}: invalid ${field} dimensions or alternative text`);
    if (p.youtube && !/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(p.youtube) && !/^https:\/\/youtu\.be\/[A-Za-z0-9_-]{11}$/.test(p.youtube)) throw new Error(`${id}: invalid YouTube URL`);
    for (const field of ['recordedAt', 'publishedAt']) if (p[field] !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(p[field]) || Number.isNaN(Date.parse(p[field])) || new Date(p[field]).toISOString().slice(0, 10) !== p[field])) throw new Error(`${id}: invalid ${field}`);
    if (/—|&mdash;|&#(?:8212|x2014);/i.test(JSON.stringify(p))) throw new Error(`${id}: em dash in metadata`);
    if (p.status === 'published' && ![p.writtenMessage, p.essay, p.lyrics, p.transcription].some(Boolean)) throw new Error(`${id}: no approved public content`);
  }
  for (const p of records) for (const id of p.related || []) if (!ids.has(id) || id === p.id || records.find(x => x.id === id)?.status !== 'published') throw new Error(`${p.id}: invalid related publication ${id}`);
  return records;
}
