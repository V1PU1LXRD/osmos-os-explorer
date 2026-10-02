/**
 * Isolates what is costing frames.
 * Run with: node scripts/diagnose-perf.mjs
 *
 * Measures frame pacing for the shipped shell, then again with individual
 * layers disabled, so the fix targets the real cost instead of a guess.
 *
 * The scenarios target the CSS constellation. This script originally toggled a
 * WebGL canvas, and it is the measurement behind the decision to drop one — so
 * if the constellation regresses, this is the script that shows which layer
 * is responsible.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const PORT = 4182;
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

async function sample(page, label) {
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
          if (n < 90) requestAnimationFrame(tick);
          else {
            samples.sort((a, b) => a - b);
            const median = samples[Math.floor(samples.length / 2)];
            resolve({ median: Math.round(median), fps: Math.round(1000 / median) });
          }
        }
        requestAnimationFrame(tick);
      })
  );
  console.log(`  ${label.padEnd(34)} ${String(result.fps).padStart(3)} fps  (${result.median} ms/frame)`);
  return result.fps;
}

console.log('\nFrame pacing at 1280x800\n');

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(3500);
const skip = page.locator('.boot-skip');
if (await skip.count()) await skip.click().catch(() => {});
await page.waitForTimeout(1200);

/** Toggles a layer off, samples, then restores it. */
async function without(label, selector, style) {
  await page.evaluate(
    ([sel, prop]) => {
      const element = document.querySelector(sel);
      if (element) element.style.setProperty(prop, 'none');
    },
    [selector, style]
  );
  await page.waitForTimeout(250);
  await sample(page, label);
  await page.evaluate(
    ([sel, prop]) => {
      const element = document.querySelector(sel);
      if (element) element.style.removeProperty(prop);
    },
    [selector, style]
  );
  await page.waitForTimeout(250);
}

await sample(page, 'shipped shell');

await without('constellation hidden', '.scene-holder', 'display');
await without('star field removed', '.sky', 'display');
await without('zone nodes removed', '.stage', 'display');
await without('kernel core removed', '.kernel', 'display');

// The constellation's depth is CSS `filter`/opacity work, which is fill-rate
// bound rather than layout bound. Shrinking the whole stage to a fraction of
// its size shows whether paint area, not node count, is the limit.
for (const scale of [0.75, 0.5]) {
  await page.evaluate((ratio) => {
    const stage = document.querySelector('.constellation');
    if (stage) stage.style.transform = `scale(${ratio})`;
  }, scale);
  await page.waitForTimeout(300);
  await sample(page, `constellation scaled to ${scale * 100}%`);
  await page.evaluate(() => {
    const stage = document.querySelector('.constellation');
    if (stage) stage.style.removeProperty('transform');
  });
  await page.waitForTimeout(250);
}

await browser.close();
server.close();
