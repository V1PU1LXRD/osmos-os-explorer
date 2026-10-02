/**
 * Runtime performance probe.
 * Run with: node scripts/measure-perf.mjs   (after `npm run build`)
 *
 * Measures what actually makes the app feel sluggish, rather than guessing:
 *   - how long until the shell is interactive (FCP / LCP),
 *   - how much JS is pulled before first paint (the eager-preload problem),
 *   - long tasks and dropped frames while the scene idles,
 *   - heap and render-blocking resource counts.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const PORT = 4181;
const BASE = `http://127.0.0.1:${PORT}/`;

const MOUNT = (
  readFileSync(join(root, 'src', 'config', 'projectConfig.js'), 'utf8').match(/basePath:\s*'([^']+)'/)?.[1] ?? ''
).replace(/\/$/, '');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const server = await new Promise((resolve) => {
  const s = createServer(async (req, res) => {
    const url = new URL(req.url, BASE);
    let pathname = decodeURIComponent(url.pathname);
    if (MOUNT && pathname.startsWith(MOUNT)) pathname = pathname.slice(MOUNT.length) || '/';
    let file = join(dist, normalize(pathname));
    try {
      const info = await stat(file).catch(() => null);
      if (!info || info.isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('nf');
    }
  });
  s.listen(PORT, '127.0.0.1', () => resolve(s));
});

const browser = await chromium.launch({ args: ['--disable-gpu', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const bytes = new Map();
page.on('response', async (response) => {
  try {
    const body = await response.body();
    bytes.set(response.url(), body.length);
  } catch {
    /* ignore */
  }
});

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(4000);

const metrics = await page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const paints = {};
  for (const entry of performance.getEntriesByType('paint')) paints[entry.name] = Math.round(entry.startTime);

  const resources = performance.getEntriesByType('resource');
  const byType = { script: 0, style: 0, other: 0 };
  for (const entry of resources) {
    if (entry.initiatorType === 'script' || /\.js$/.test(entry.name)) byType.script += entry.transferSize;
    else if (entry.initiatorType === 'link' && entry.name.endsWith('.css')) byType.style += entry.transferSize;
    else byType.other += entry.transferSize;
  }

  return {
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
    load: Math.round(nav.loadEventEnd),
    fcp: paints['first-contentful-paint'] ?? null,
    resourceCount: resources.length,
    transferKB: {
      script: Math.round(byType.script / 1024),
      style: Math.round(byType.style / 1024),
      other: Math.round(byType.other / 1024)
    },
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    domNodes: document.querySelectorAll('*').length,
    canvases: document.querySelectorAll('canvas').length,
    longTasks: (performance.getEntriesByType('longtask') || []).length
  };
});

// Frame pacing while the scene animates.
const frames = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const samples = [];
      let last = performance.now();
      let count = 0;
      function tick(now) {
        samples.push(now - last);
        last = now;
        count += 1;
        if (count < 120) requestAnimationFrame(tick);
        else {
          samples.sort((a, b) => a - b);
          resolve({
            frames: samples.length,
            medianFrameMs: Math.round(samples[Math.floor(samples.length / 2)]),
            p95FrameMs: Math.round(samples[Math.floor(samples.length * 0.95)]),
            droppedOver32ms: samples.filter((s) => s > 32).length
          });
        }
      }
      requestAnimationFrame(tick);
    })
);

const biggest = [...bytes.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 6)
  .map(([url, size]) => `${(size / 1024).toFixed(0).padStart(5)} KB  ${url.split('/').pop()}`);

console.log('\n── Navigation ─────────────────────────────');
console.log(`  DOMContentLoaded   ${metrics.domContentLoaded} ms`);
console.log(`  load                ${metrics.load} ms`);
console.log(`  FCP                 ${metrics.fcp} ms`);

console.log('\n── Transferred before idle ────────────────');
console.log(`  requests            ${metrics.resourceCount}`);
console.log(`  JS                  ${metrics.transferKB.script} KB`);
console.log(`  CSS                 ${metrics.transferKB.style} KB`);
console.log(`  other               ${metrics.transferKB.other} KB`);

console.log('\n── Runtime ────────────────────────────────');
console.log(`  DOM nodes           ${metrics.domNodes}`);
console.log(`  canvases            ${metrics.canvases}`);
console.log(`  long tasks          ${metrics.longTasks}`);
console.log(`  JS heap             ${metrics.heapMB ?? 'n/a'} MB`);

console.log('\n── Frame pacing (2s sample) ──────────────');
console.log(`  median frame        ${frames.medianFrameMs} ms  (${Math.round(1000 / frames.medianFrameMs)} fps)`);
console.log(`  p95 frame           ${frames.p95FrameMs} ms`);
console.log(`  frames > 32ms       ${frames.droppedOver32ms} / ${frames.frames}`);

console.log('\n── Largest resources ──────────────────────');
biggest.forEach((line) => console.log(`  ${line}`));

await browser.close();
server.close();
