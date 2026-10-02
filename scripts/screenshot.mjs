/**
 * Captures screenshots of the shell and each module across device sizes.
 * Run with: node scripts/screenshot.mjs   (or `npm run screenshots`)
 * Output: docs/screenshots/
 *
 * These ARE committed: the README embeds them, so ignoring them would render
 * a broken README on every fresh clone. Regenerate and commit them together
 * with whatever UI change made them stale.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const outDir = join(root, 'docs', 'screenshots');
const PORT = 4185;
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

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ args: ['--disable-gpu', '--no-sandbox'] });

const SHOTS = [
  { name: 'desktop', width: 1440, height: 900, touch: false, shot: 'shell' },
  { name: 'phone', width: 390, height: 844, touch: true, shot: 'shell' },
  { name: 'tablet', width: 834, height: 1112, touch: true, shot: 'shell' }
];

const MODULES = ['Process Lab', 'CPU Scheduler', 'Memory Matrix', 'Deadlock Observatory', 'File System Vault', 'System Call Gateway'];

for (const target of SHOTS) {
  const context = await browser.newContext({
    viewport: { width: target.width, height: target.height },
    hasTouch: target.touch,
    isMobile: target.touch,
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(2200);
  const skip = page.locator('.boot-skip');
  if (await skip.count()) await skip.click().catch(() => {});
  await page.waitForTimeout(1200);

  await page.screenshot({ path: join(outDir, `${target.name}-shell.png`) });

  for (const module of MODULES) {
    const menu = page.locator('.topbar button[aria-label="Modules"]');
    if (await menu.count()) {
      await menu.click();
      await page.waitForTimeout(350);
    }
    await page.locator('.fallback-card').filter({ hasText: module }).first().click();
    await page.waitForSelector('.module-panel');
    await page.waitForTimeout(800);
    const slug = module.toLowerCase().replace(/[^a-z]+/g, '-');
    await page.screenshot({ path: join(outDir, `${target.name}-${slug}.png`) });
    await page.locator('.module-head button').first().click();
    await page.waitForTimeout(450);
  }

  await context.close();
}

await browser.close();
server.close();
console.log('screenshots written to docs/screenshots/');
