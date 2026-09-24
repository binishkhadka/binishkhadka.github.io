/*
 * Checks redirect.js against real user-agent strings.
 *
 *   node tools/redirect-test.mjs
 *
 * Run it after any edit to redirect.js. The case that matters is "iPad
 * iPadOS 17": an iPad and a Mac send the SAME user-agent string, and only
 * maxTouchPoints tells them apart. Get that wrong and every iPad owner you
 * share a link with lands on a desktop page instead of the App Store.
 *
 * The "iOS only" cases cover an app that is live on one store and not the
 * other: the visitor on the missing platform must stay on the page and see
 * the badges, never be sent to a store listing that does not exist.
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../redirect.js', import.meta.url), 'utf8');

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const APPLE_DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const PIXEL = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';

const BOTH = { ios: '6797416246', android: 'com.swingtradesignals.app' };
const IOS_ONLY = { ios: '6810429342', android: null };

// [name, userAgent, maxTouchPoints, store IDs the page declares, expected]
const CASES = [
  ['iPhone Safari',     IPHONE, 5, BOTH, 'ios'],
  ['iPhone Chrome',     'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1', 5, BOTH, 'ios'],
  ['iPad iOS 12',       'Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1', 5, BOTH, 'ios'],
  ['iPad iPadOS 17',    APPLE_DESKTOP_UA, 5, BOTH, 'ios'],
  ['Mac Safari',        APPLE_DESKTOP_UA, 0, BOTH, 'none'],
  ['Pixel Chrome',      PIXEL, 5, BOTH, 'android'],
  ['Samsung Internet',  'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0 Mobile Safari/537.36', 5, BOTH, 'android'],
  ['Android tablet',    'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', 5, BOTH, 'android'],
  ['Windows Chrome',    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', 0, BOTH, 'none'],
  ['Windows touch',     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', 10, BOTH, 'none'],
  ['Windows Phone',     'Mozilla/5.0 (Mobile; Windows Phone 8.1; Android 4.0; ARM) like Gecko Version/11.0 Safari/537.36 Edge/12', 5, BOTH, 'none'],
  ['WhatsApp preview',  'WhatsApp/2.23 A', 0, BOTH, 'none'],
  ['Googlebot',         'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 0, BOTH, 'none'],
  // an app that is on the App Store but not yet public on Play
  ['iPhone, iOS only',  IPHONE, 5, IOS_ONLY, 'ios'],
  ['Android, iOS only', PIXEL, 5, IOS_ONLY, 'none'],
];

let failed = 0;
for (const [name, ua, touch, ids, want] of CASES) {
  let got = 'none';
  const doc = {
    currentScript: {
      getAttribute: (a) => (a === 'data-ios' ? ids.ios : a === 'data-android' ? ids.android : null),
    },
  };
  const nav = { userAgent: ua, maxTouchPoints: touch };
  const loc = {
    replace: (u) => {
      got = u.includes('apps.apple.com') ? 'ios' : u.includes('play.google.com') ? 'android' : `? ${u}`;
    },
  };
  new Function('document', 'navigator', 'location', src)(doc, nav, loc);
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(18)} -> ${got.padEnd(8)} (want ${want})`);
}

console.log(failed ? `\n${failed} FAILED` : `\nall ${CASES.length} passed`);
process.exit(failed ? 1 : 0);
