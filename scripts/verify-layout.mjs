/**
 * Real-browser layout audit.
 * Run with: node scripts/verify-layout.mjs            (after `npm run build`)
 *
 * The static checks in verify-responsive.mjs cannot see a broken layout. This
 * script serves dist/ from a built-in static server, drives a headless
 * Chromium across ten device profiles, opens every module, and fails on:
 *   - horizontal overflow of the page (the classic "it works but you scroll
 *     sideways on a phone" bug),
 *   - any element wider than the viewport that is not deliberately scrollable,
 *   - interactive controls below a reachable tap size on touch profiles,
 *   - console errors or unhandled exceptions,
 *   - a module panel that renders off-screen.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const PORT = Number(process.env.OSMOS_PORT || 4180);
const BASE = `http://127.0.0.1:${PORT}/`;

// The production build bakes the GitHub Pages base path into every asset URL.
// The audit serves dist/ from the origin root, so that prefix is stripped here.
const BUILD_BASE = readFileSync(join(root, 'vite.config.js'), 'utf8').includes('basePath')
  ? (readFileSync(join(root, 'src', 'config', 'projectConfig.js'), 'utf8').match(/basePath:\s*'([^']+)'/)?.[1] ?? '')
  : '/';
const MOUNT = BUILD_BASE.replace(/\/$/, '');

/** Static file server that mounts dist/ at the root, ignoring the build base. */
function serveDist() {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json'
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, BASE);

    // Strip the baked-in Pages base path so assets resolve from the root.
    let pathname = decodeURIComponent(url.pathname);
    if (MOUNT && pathname.startsWith(MOUNT)) pathname = pathname.slice(MOUNT.length) || '/';

    let filePath = join(dist, normalize(pathname));

    try {
      const info = await stat(filePath).catch(() => null);
      if (!info || info.isDirectory()) filePath = join(filePath, 'index.html');

      const body = await readFile(filePath);
      res.writeHead(200, { 'content-type': types[extname(filePath)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end(`not found: ${pathname}`);
    }
  });

  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

/** Real device viewports, portrait and landscape. */
const PROFILES = [
  { name: 'iPhone SE', width: 375, height: 667, touch: true },
  { name: 'iPhone 13', width: 390, height: 844, touch: true },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932, touch: true },
  { name: 'iPhone landscape', width: 844, height: 390, touch: true },
  { name: 'Galaxy S8', width: 360, height: 740, touch: true },
  { name: 'iPad mini', width: 768, height: 1024, touch: true },
  { name: 'iPad Pro 11', width: 834, height: 1194, touch: true },
  { name: 'iPad landscape', width: 1194, height: 834, touch: true },
  { name: 'Laptop', width: 1280, height: 800, touch: false },
  { name: 'Desktop', width: 1920, height: 1080, touch: false }
];

const ZONES = [
  'Process Lab',
  'CPU Scheduler',
  'Memory Matrix',
  'Deadlock Observatory',
  'File System Vault',
  'System Call Gateway'
];

let failures = 0;
let checks = 0;

function record(label, ok, detail = '') {
  checks += 1;
  if (ok) {
    console.log(`    ok    ${label}`);
  } else {
    failures += 1;
    console.error(`    FAIL  ${label}${detail ? `\n          ${detail}` : ''}`);
  }
}

/** Measures layout defects inside the page. */
const AUDIT = () => {
  const doc = document.documentElement;
  const problems = [];

  if (doc.scrollWidth > doc.clientWidth + 1) {
    problems.push(`page scrollWidth ${doc.scrollWidth} > clientWidth ${doc.clientWidth}`);
  }

  const viewportWidth = doc.clientWidth;

  for (const element of document.body.querySelectorAll('*')) {
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.right <= viewportWidth + 1 && rect.left >= -1) continue;

    // Poking past the edge is only acceptable inside a deliberately
    // scrollable/fixed container, or for the off-canvas rail itself.
    const inScrollable = element.closest(
      '.table-wrap, .gantt-scroll, .rag, .fs-tree-mini, .module-body, .overlay, .overlay-body, .module-panel, .rail, .fallback, .boot, .sys-trace, .event-log'
    );
    const positioned = style.position === 'fixed' || style.position === 'absolute';
    const drawer = element.closest('.rail, .rail-scrim');

    if (inScrollable || positioned || drawer) continue;

    problems.push(
      `${element.tagName.toLowerCase()}.${String(element.className).split(' ').filter(Boolean).slice(0, 2).join('.')} left=${Math.round(rect.left)} right=${Math.round(rect.right)} (viewport ${viewportWidth})`
    );
  }

  return problems.slice(0, 8);
};

/** Finds interactive controls too small to hit reliably. */
const TINY_TARGETS = () => {
  const tiny = [];
  for (const element of document.querySelectorAll('button, a[href], input, select')) {
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.height < 28 || rect.width < 24) {
      tiny.push(
        `${element.tagName.toLowerCase()}.${String(element.className).split(' ').filter(Boolean).slice(0, 2).join('.')} ${Math.round(rect.width)}x${Math.round(rect.height)}`
      );
    }
  }
  return [...new Set(tiny)].slice(0, 8);
};

/**
 * Measures the constellation's zone nodes specifically. They scale with the
 * node's depth on the orbit, so the generic tap-target sweep is not enough on
 * its own — this asserts a floor on the smallest one.
 */
const NODE_SIZES = () => {
  const nodes = [...document.querySelectorAll('.zone-node')];
  if (!nodes.length) return { count: 0, medianHeight: 0, smallest: 0 };
  const heights = nodes.map((element) => element.getBoundingClientRect().height).sort((a, b) => a - b);
  return {
    count: nodes.length,
    medianHeight: heights[Math.floor(heights.length / 2)],
    smallest: heights[0]
  };
};

const server = await serveDist();
const browser = await chromium.launch({ args: ['--disable-gpu', '--no-sandbox'] });

for (const profile of PROFILES) {
  console.log(`\n${profile.name} (${profile.width}x${profile.height}${profile.touch ? ', touch' : ''})`);

  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    hasTouch: profile.touch,
    isMobile: profile.touch,
    deviceScaleFactor: profile.touch ? 2 : 1
  });

  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

  await page.goto(BASE, { waitUntil: 'networkidle' });

  // The boot screen either shows a Skip button or finishes on its own; racing
  // it must not fail the run.
  await page.waitForSelector('.boot-skip, .topbar', { timeout: 15000 }).catch(() => {});
  const skip = page.locator('.boot-skip');
  if (await skip.count()) await skip.click({ timeout: 3000 }).catch(() => {});
  await page.waitForSelector('.topbar', { timeout: 15000 });
  await page.waitForTimeout(600);

  const shell = await page.evaluate(AUDIT);
  record('shell: no layout overflow', shell.length === 0, shell.join('\n          '));

  if (profile.touch) {
    const tiny = await page.evaluate(TINY_TARGETS);
    record('shell: tap targets reachable', tiny.length === 0, tiny.join('\n          '));

    const nodes = await page.evaluate(NODE_SIZES);
    if (nodes.count) {
      record(
        'shell: constellation zone nodes are tappable',
        nodes.smallest >= 24,
        `${nodes.count} nodes, smallest ${Math.round(nodes.smallest)}px, median ${Math.round(nodes.medianHeight)}px`
      );
    }
  }

  // The rail is never removed: it is either docked or opened as a drawer.
  const railToggle = page.locator('.topbar-rail-toggle');
  if (await railToggle.isVisible()) {
    await railToggle.click();
    await page.waitForTimeout(450);
    const box = await page.locator('.rail').boundingBox();
    record('rail drawer opens on screen', Boolean(box) && box.x >= -1 && box.width > 100, JSON.stringify(box));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
    const closed = await page.locator('.rail').boundingBox();
    record('rail drawer closes again', Boolean(closed) && closed.x + closed.width <= 2, JSON.stringify(closed));
  } else {
    const box = await page.locator('.rail').boundingBox();
    record('rail is docked on wide screens', Boolean(box) && box.x >= -1 && box.width > 100, JSON.stringify(box));
  }

  for (const zone of ZONES) {
    const card = page.locator('.fallback-card').filter({ hasText: zone }).first();
    if ((await card.count()) === 0) {
      const menu = page.locator('.topbar button[aria-label="Modules"]');
      if (await menu.count()) {
        await menu.click();
        await page.waitForTimeout(350);
        await page.locator('.fallback-card').filter({ hasText: zone }).first().click();
      }
    } else {
      await card.click();
    }

    await page.waitForSelector('.module-panel', { timeout: 15000 });
    await page.waitForTimeout(800);

    const panel = await page.locator('.module-panel').boundingBox();
    record(
      `${zone}: panel fits the viewport`,
      Boolean(panel) && panel.x >= -1 && panel.width <= profile.width + 1 && panel.height <= profile.height + 1,
      JSON.stringify(panel)
    );

    const inner = await page.evaluate(AUDIT);
    record(`${zone}: content has no overflow`, inner.length === 0, inner.join('\n          '));

    if (profile.touch) {
      const tiny = await page.evaluate(TINY_TARGETS);
      record(`${zone}: tap targets reachable`, tiny.length === 0, tiny.join('\n          '));
    }

    const body = await page.locator('.module-body').innerText();
    record(`${zone}: renders real content`, body.trim().length > 120, `${body.trim().length} chars`);

    await page.locator('.module-head button').first().click();
    await page.waitForTimeout(500);
  }

  record('no console errors', errors.length === 0, errors.slice(0, 4).join('\n          '));
  await context.close();
}

await browser.close();
server.close();

console.log(`\n${checks - failures}/${checks} checks passed.`);
if (failures) {
  console.error(`${failures} FAILED`);
  process.exit(1);
}
