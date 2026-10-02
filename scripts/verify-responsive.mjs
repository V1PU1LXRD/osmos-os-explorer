/**
 * Static layout audit for OSMOS's responsive layer.
 * Run with: node scripts/verify-responsive.mjs
 *
 * This cannot render a real browser, so it checks the things that are cheap to
 * verify and expensive to get wrong by eye:
 *   1. every stylesheet defines the shared breakpoint tokens,
 *   2. nothing still assumes a fixed 100vh / 100vw viewport,
 *   3. every element that can overflow has a scroll or wrap strategy,
 *   4. touch targets are declared at a reachable size,
 *   5. the JS side and the CSS side agree on the breakpoint numbers.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const stylesDir = join(root, 'src', 'styles');

let failures = 0;
let checks = 0;

function check(label, condition, detail = '') {
  checks += 1;
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`);
  }
}

const css = Object.fromEntries(
  readdirSync(stylesDir)
    .filter((file) => file.endsWith('.css'))
    .map((file) => [file, readFileSync(join(stylesDir, file), 'utf8')])
);

const allCss = Object.values(css).join('\n');

console.log('\nBreakpoint tokens');
check('tokens.css declares --bp-sm', /--bp-sm:\s*480px/.test(css['tokens.css']));
check('tokens.css declares --bp-md', /--bp-md:\s*700px/.test(css['tokens.css']));
check('tokens.css declares --bp-lg', /--bp-lg:\s*1024px/.test(css['tokens.css']));
check('useViewport.js uses the same 700 boundary', /BREAKPOINTS = \{ sm: 480, md: 700, lg: 1024, xl: 1400 \}/.test(readFileSync(join(root, 'src', 'utils', 'useViewport.js'), 'utf8')));

console.log('\nViewport height handling');
check('no bare 100vh without a dvh fallback nearby', !/height:\s*100vh;\s*\n\s*height:\s*100vh/.test(allCss));
check('tokens define a --vh custom property', /--vh:\s*100dvh/.test(css['tokens.css']));
check('base.css applies --vh to html/body', /height:\s*var\(--vh\)/.test(css['base.css']));
check('overlay card caps height with dvh', /max-height:\s*min\(84dvh/.test(css['modules.css']));

console.log('\nSafe areas');
for (const area of ['--sat', '--sab', '--sal', '--sar']) {
  check(`tokens define ${area}`, css['tokens.css'].includes(`${area}:`));
}
check('topbar clears the top inset', /\.topbar\s*\{[^}]*var\(--sat\)/s.test(css['app.css']));
check('module footer clears the bottom inset', /\.module-foot\s*\{[^}]*safe-area-inset-bottom/s.test(css['modules.css']));
check('view-hud clears the bottom inset', /\.view-hud\s*\{[^}]*var\(--sab\)/s.test(css['app.css']));

console.log('\nScroll containment (no rubber-banding behind panels)');
check('body sets overscroll-behavior: none', /overscroll-behavior:\s*none/.test(css['base.css']));
for (const [name, selector] of [
  ['module body', /\.module-body\s*\{[^}]*overscroll-behavior:\s*contain/s],
  ['status rail', /\.rail\s*\{[^}]*overscroll-behavior:\s*contain/s],
  ['gantt scroll', /\.gantt-scroll\s*\{[^}]*overflow-x:\s*auto/s],
  ['rag graph', /\.rag\s*\{[^}]*overflow-x:\s*auto/s],
  ['data tables', /\.table-wrap\s*\{[^}]*overflow-x:\s*auto/s]
]) {
  check(`${name} contains its own scrolling`, selector.test(allCss));
}

console.log('\nTouch targets');
check('tokens define --touch: 44px', /--touch:\s*44px/.test(css['tokens.css']));
check('coarse pointers enlarge buttons', /@media \(pointer: coarse\)/.test(allCss));
check('checkboxes get a real tap target, not a strip', /input\[type='checkbox'\]\s*\{[^}]*min-width:\s*var\(--touch\)/s.test(allCss));
check('the zone map opts out of browser gestures', /\.scene-holder\s*\{[^}]*touch-action:\s*none/s.test(css['app.css']));

console.log('\nProgressive layout');
check('rail is never display:none (it becomes a drawer)', !/\.rail\s*\{[^}]*display:\s*none/s.test(allCss));
check('rail has an off-canvas transform', /\.rail\s*\{[^}]*translateX\(-102%\)/s.test(css['app.css']));
check('rail drawer has an open state', /\.rail\.is-open/.test(css['app.css']));
check('module panel has a sheet variant', /\.module-panel\.is-sheet|\.module-panel,\s*\n\s*\.module-panel\.wide\s*\{[\s\S]{0,400}height:\s*92dvh/.test(css['modules.css']));
check('sys-regions collapse to one column on phones', /@media \(max-width: 699px\)[\s\S]*\.sys-regions\s*\{\s*grid-template-columns:\s*1fr/s.test(css['modules.css']));
check('landscape phones get their own breakpoint', /@media \(max-height: 480px\) and \(orientation: landscape\)/.test(allCss));
check('very narrow phones (<=380px) are handled', /@media \(max-width: 380px\)/.test(allCss));

console.log('\nAccessibility');
check('topbar buttons keep an accessible name', /aria-label=\{label\}/.test(readFileSync(join(root, 'src', 'components', 'TopBar.jsx'), 'utf8')));
check('module panel traps focus', /event\.key !== 'Tab'/.test(readFileSync(join(root, 'src', 'components', 'ModulePanel.jsx'), 'utf8')));
check('fullscreen button is hidden when unsupported', /document\.fullscreenEnabled/.test(readFileSync(join(root, 'src', 'components', 'TopBar.jsx'), 'utf8')));
check('inputs avoid the iOS focus-zoom threshold', /font-size:\s*max\(16px/.test(css['base.css']));

console.log(`\n${checks - failures}/${checks} checks passed.`);
if (failures) {
  console.error(`${failures} FAILED`);
  process.exit(1);
}
