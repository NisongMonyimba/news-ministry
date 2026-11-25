import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { root, loadPublications, validate } from './publications.mjs';

const [command, id] = process.argv.slice(2);
const usage = 'Usage: npm run publish -- <create|validate|list|preview|media|build|readiness> [publication-id]';
function records() { return validate(loadPublications({ includePrivate: true })); }
function one() {
  if (!id) throw new Error('Publication ID is required.');
  const p = records().find(x => x.id === id);
  if (!p) throw new Error(`Publication not found: ${id}`);
  return p;
}
try {
  if (command === 'create') {
    if (!id || !/^(?:message|song|study|video)-\d{3}$/.test(id)) throw new Error('Use an ID such as message-003 or song-002.');
    if (loadPublications({ includePrivate: true }).some(p => p.id === id)) throw new Error(`ID already exists: ${id}`);
    const dir = resolve(root, '.news-private');
    mkdirSync(dir, { recursive: true });
    const kind = id.startsWith('song') ? 'song' : id.startsWith('video') ? 'video' : id.startsWith('study') ? 'publication' : 'sermon';
    const number = id.split('-')[0].toUpperCase() + ' ' + id.split('-')[1];
    const draft = { id, number, kind, title: 'Replace with approved title', summary: 'Replace with approved summary', status: 'draft', approved: false, url: `publications/${id}/`, categories: [], topics: [] };
    writeFileSync(resolve(dir, `${id}.json`), JSON.stringify(draft, null, 2) + '\n', { flag: 'wx' });
    console.log(`Created ignored local draft: .news-private/${id}.json`);
  } else if (command === 'validate') {
    if (id) one(); else records();
    console.log(id ? `Valid: ${id}` : 'All publication metadata and files are valid.');
  } else if (command === 'list') {
    for (const p of records()) console.log(`${p.number.padEnd(12)} ${p.status.padEnd(12)} ${p.title} [${p.id}]`);
  } else if (command === 'media') {
    const p = one();
    for (const field of ['artwork', 'thumbnail', 'audio', 'worshipAudio', 'pdf', 'infographic', 'transcription', 'writtenMessage', 'essay', 'lyrics']) {
      const v = field === 'artwork' || field === 'thumbnail' ? p[field]?.path : p[field];
      if (v) for (const path of Array.isArray(v) ? v : [v]) console.log(`${field}: ${path} ✓`);
    }
  } else if (command === 'readiness') {
    const p = one();
    const issues = [];
    if (!['approved', 'published'].includes(p.status)) issues.push('status must be approved or published');
    if (p.approved !== true) issues.push('explicit approval is required');
    if (![p.writtenMessage, p.essay, p.lyrics, p.transcription].some(Boolean)) issues.push('approved written content is required');
    if (p.title === 'Replace with approved title' || p.summary === 'Replace with approved summary') issues.push('replace template metadata');
    if (issues.length) { console.error(`Not ready: ${p.id}\n- ${issues.join('\n- ')}`); process.exitCode = 1; }
    else console.log(p.status === 'published'
      ? `Published record ready: ${p.id}. Build and review the generated page.`
      : `Approved record ready: ${p.id}. Move approved files into content/publications/${p.id}/, set status to published, then build and review.`);
  } else if (command === 'build') {
    const result = spawnSync(process.execPath, [resolve(root, 'tools/build.mjs')], { stdio: 'inherit' });
    process.exitCode = result.status || 0;
  } else if (command === 'preview') {
    const p = one();
    const result = spawnSync(process.execPath, [resolve(root, 'tools/build.mjs'), id], { stdio: 'inherit' });
    if (result.status) throw new Error('Preview generation failed.');
    console.log(`Open http://localhost:8000/news-ministry/preview/${p.id}/`);
    const server = spawn('python3', ['-m', 'http.server', '8000', '--directory', resolve(root, '..')], { stdio: 'inherit' });
    process.on('SIGINT', () => server.kill('SIGINT'));
  } else throw new Error(usage);
} catch (error) {
  console.error(`Publishing error: ${error.message}`);
  process.exitCode = 1;
}
