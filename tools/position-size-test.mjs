/*
 * Checks the position size calculator's arithmetic.
 *
 *   node tools/position-size-test.mjs
 *
 * It runs the real <script> out of the page against a stub DOM rather than a
 * copy of the formula, so a change to the page is a change to what is tested.
 * Getting this wrong is not a cosmetic bug: someone sizes a real trade on the
 * number it prints.
 */
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./position-size/index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const src = scripts.find((s) => s.includes('function calc'));
if (!src) throw new Error('could not find the calculator script in the page');

const IDS = ['account', 'risk', 'entry', 'stop', 'shares', 'sharesUnit', 'answerlabel',
             'riskAmt', 'riskShare', 'posValue', 'posPct', 'note', 'y'];

function run({ account, risk, entry, stop }) {
  const nodes = {};
  for (const id of IDS) nodes[id] = { value: '', textContent: '', hidden: false, addEventListener() {} };
  nodes.account.value = String(account);
  nodes.risk.value = String(risk);
  nodes.entry.value = String(entry);
  nodes.stop.value = String(stop);

  const document = { getElementById: (id) => nodes[id] ?? null };
  new Function('document', src)(document);
  return {
    label: nodes.answerlabel.textContent,
    shares: nodes.shares.textContent,
    unit: nodes.sharesUnit.textContent,
    riskAmt: nodes.riskAmt.textContent,
    riskShare: nodes.riskShare.textContent,
    posValue: nodes.posValue.textContent,
    posPct: nodes.posPct.textContent,
    note: nodes.note.hidden ? '' : nodes.note.textContent,
  };
}

const CASES = [
  {
    name: 'the worked example from the page',
    in: { account: 10000, risk: 1, entry: 50, stop: 47.5 },
    want: { shares: '40', label: 'Buy', posPct: '20.0%', riskShare: '$2.50' },
  },
  {
    name: 'a short (stop above entry) sizes the same',
    in: { account: 10000, risk: 1, entry: 50, stop: 52.5 },
    want: { shares: '40', label: 'Short', posPct: '20.0%' },
  },
  {
    name: 'rounds down, never up past the risk limit',
    // 100 / 3 = 33.33 -> 33, never 34
    in: { account: 10000, risk: 1, entry: 50, stop: 47 },
    want: { shares: '33' },
  },
  {
    name: 'one share reads "share", not "shares"',
    in: { account: 100, risk: 1, entry: 10, stop: 9 },
    want: { shares: '1', unit: 'share' },
  },
  {
    name: 'a tight stop needing margin is flagged',
    in: { account: 10000, risk: 1, entry: 100, stop: 99.9 },
    want: { shares: '1,000', posValue: '$100,000.00', noteHas: 'more than the account holds' },
  },
  {
    name: 'risk budget below one share says so',
    in: { account: 100, risk: 1, entry: 50, stop: 40 },
    want: { shares: '0', noteHas: 'smaller than the loss on a single share' },
  },
  {
    name: 'stop equal to entry is refused, not divided by zero',
    in: { account: 10000, risk: 1, entry: 50, stop: 50 },
    want: { shares: '—', noteHas: 'same as the entry' },
  },
  {
    name: 'risk above 100% is refused',
    in: { account: 10000, risk: 101, entry: 50, stop: 45 },
    want: { shares: '—', noteHas: 'more than the whole account' },
  },
  {
    name: 'zero risk is refused',
    in: { account: 10000, risk: 0, entry: 50, stop: 45 },
    want: { shares: '—', noteHas: 'above zero' },
  },
  {
    name: 'a blank field shows nothing rather than NaN',
    in: { account: '', risk: 1, entry: 50, stop: 45 },
    want: { shares: '—', note: '' },
  },
];

let failed = 0;
for (const c of CASES) {
  const got = run(c.in);
  const problems = [];
  for (const [key, want] of Object.entries(c.want)) {
    if (key === 'noteHas') {
      if (!got.note.includes(want)) problems.push(`note should mention "${want}", got "${got.note || '(none)'}"`);
    } else if (got[key] !== want) {
      problems.push(`${key}: got "${got[key]}", want "${want}"`);
    }
  }
  if (problems.length) {
    failed++;
    console.log(`FAIL ${c.name}`);
    for (const p of problems) console.log(`       ${p}`);
  } else {
    console.log(`ok   ${c.name}`);
  }
}

console.log(failed ? `\n${failed} FAILED` : `\nall ${CASES.length} passed`);
process.exit(failed ? 1 : 0);
