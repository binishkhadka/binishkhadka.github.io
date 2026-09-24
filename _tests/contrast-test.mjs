/*
 * Checks every text token in assets/base.css against the surface it is used on.
 *
 *   node _tests/contrast-test.mjs
 *
 * This exists because the previous palette shipped a real failure: --faint was
 * #A2A2A9 on a #FCFCFB page, which is 2.47:1 — a quarter of what WCAG AA asks
 * for — and it was the colour on every small-caps label, at 11-12px, which is
 * the hardest case there is. It was invisible to me because I was reading the
 * page in dark mode, where the same token passes.
 *
 * Ratios are parsed out of the real stylesheet, so the check cannot drift from
 * what the site actually serves.
 */
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../assets/base.css', import.meta.url), 'utf8');

/** Pull a :root-ish block's token values out of the stylesheet. */
function tokens(afterMarker) {
  const at = css.indexOf(afterMarker);
  if (at === -1) throw new Error(`marker not found in base.css: ${afterMarker}`);
  const block = css.slice(at, css.indexOf('}', at));
  const out = {};
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g)) out[m[1]] = m[2];
  return out;
}

const hex = (h) => {
  h = h.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
// WCAG 2.x relative luminance
const lum = (h) => {
  const [r, g, b] = hex(h).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [token, surface it sits on, minimum, why]
const RULES = [
  ['--text',   '--canvas',  4.5, 'body and headings'],
  ['--text-2', '--canvas',  4.5, 'body copy'],
  ['--text-3', '--canvas',  4.5, 'small-caps metadata labels — the one that failed before'],
  ['--text-3', '--surface', 4.5, 'metadata on a card'],
  ['--text-2', '--surface', 4.5, 'body copy on a card'],
  ['--text',   '--surface', 4.5, 'headings on a card'],
  // 1.4.11: a control boundary needs 3:1, decorative hairlines are exempt
  ['--field',  '--canvas',  3.0, 'input borders (WCAG 1.4.11 non-text contrast)'],
  ['--field',  '--surface', 3.0, 'input borders on a card'],
];

let failed = 0;
for (const mode of ['light', 'dark']) {
  const t = tokens(mode === 'light' ? '/* TOKENS:LIGHT */' : '/* TOKENS:DARK */');
  console.log(`\n${mode}`);
  for (const [fg, bg, min, why] of RULES) {
    if (!t[fg] || !t[bg]) {
      console.log(`  SKIP ${fg} on ${bg} — not defined in ${mode}`);
      continue;
    }
    const r = ratio(t[fg], t[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${fg} on ${bg}  ${r.toFixed(2)}:1 (needs ${min}) — ${why}`);
  }
}

console.log(failed ? `\n${failed} FAILED` : '\nall contrast checks passed');
process.exit(failed ? 1 : 0);
