import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/osmos-os-explorer/';
const browser = await chromium.launch({ args: ['--disable-gpu', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });

page.on('console', (m) => console.log(`[console.${m.type()}]`, m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('requestfailed', (r) => console.log('[requestfailed]', r.url(), r.failure()?.errorText));

const response = await page.goto(url, { waitUntil: 'networkidle' });
console.log('status', response.status(), response.url());

await page.waitForTimeout(2500);

console.log('\n--- root html (first 1500 chars) ---');
console.log((await page.content()).slice(0, 1500));

console.log('\n--- counts ---');
for (const sel of ['.app', '.boot', '.boot-skip', '.topbar', '.scene-holder', '.constellation', '.zone-node', '.fallback', 'canvas']) {
  console.log(sel, await page.locator(sel).count());
}

await browser.close();
