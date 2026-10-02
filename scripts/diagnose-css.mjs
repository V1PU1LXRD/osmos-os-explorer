/**
 * Attributes frame cost to individual CSS animations.
 * Run with: node scripts/diagnose-css.mjs
 *
 * Enabling everything at once cannot tell you which animation is expensive, so
 * each is enabled in isolation on top of an animation-free baseline.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const PORT = 4184;
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
      res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404);
      res.end('nf');
    }
  });
  s.listen(PORT, '127.0.0.1', () => resolve(s));
});

const browser = await chromium.launch({ args: ['--disable-gpu', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(2500);
const skip = page.locator('.boot-skip');
if (await skip.count()) await skip.click().catch(() => {});
await page.waitForTimeout(800);

async function sample(label) {
  const result = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const samples = [];
        let last = performance.now();
        let n = 0;
        function tick(now) {
          samples.push(now - last);
          last = now;
          n += 1;
          if (n < 70) requestAnimationFrame(tick);
          else {
            samples.sort((a, b) => a - b);
            const median = samples[Math.floor(samples.length / 2)];
            resolve({ median: Math.round(median), fps: Math.round(1000 / median) });
          }
        }
        requestAnimationFrame(tick);
      })
  );
  console.log(`  ${label.padEnd(38)} ${String(result.fps).padStart(3)} fps  (${result.median} ms)`);
  return result.fps;
}

const reset = () =>
  page.evaluate(() => {
    for (const tag of document.querySelectorAll('style[data-probe]')) tag.remove();
    if (!document.querySelector('style[data-base]')) {
      const style = document.createElement('style');
      style.dataset.base = '1';
      style.textContent = '*,*::before,*::after{animation:none !important}';
      document.head.append(style);
    }
  });

const probe = (css) =>
  page.evaluate((rules) => {
    const style = document.createElement('style');
    style.dataset.probe = '1';
    style.textContent = rules;
    document.head.append(style);
  }, css);

console.log('\nFrame pacing, one animation at a time\n');

await reset();
await sample('baseline (no animations)');

const CASES = [
  ['mote drift', '.mote{animation:mote-drift 30s linear infinite !important}'],
  ['kernel pulse', '.kernel-shell{animation:kernel-pulse 4.4s ease-in-out infinite !important}'],
  [
    'kernel rings',
    '.kernel-ring-a{animation:ring-spin-a 11s linear infinite !important}' +
      '.kernel-ring-b{animation:ring-spin-b 15s linear infinite !important}' +
      '.kernel-ring-c{animation:ring-spin-c 21s linear infinite !important}'
  ],
  ['node breathe', '.node-core::after{animation:node-breathe 5.5s ease-in-out infinite !important}']
];

for (const [label, css] of CASES) {
  await reset();
  await probe(css);
  await page.waitForTimeout(500);
  await sample(label);
}

// Now the expensive paint-only properties, with no animation at all.
await reset();
await probe('.node-label{backdrop-filter:none !important}');
await page.waitForTimeout(400);
await sample('backdrop-filter removed');

await reset();
await probe('.kernel-halo,.stage-floor{display:none !important}');
await page.waitForTimeout(400);
await sample('soft glows removed');

await reset();
await probe('.node-core{box-shadow:none !important}.kernel-shell{box-shadow:none !important}');
await page.waitForTimeout(400);
await sample('box-shadows removed');

await browser.close();
server.close();
