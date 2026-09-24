/*
 * Send a share link to the right store.
 *
 * One link goes to friends; iPhones land on the App Store, Android phones on
 * Google Play, and anything else (desktop, a bot, a preview crawler) is left
 * on the page to choose for itself. Firebase Dynamic Links used to do this;
 * it stopped resolving links in February 2026 and has no replacement, but the
 * store-redirect half of what it did was never more than this file.
 *
 * A page opts in by naming its two store IDs on the script tag:
 *
 *   <script src="/redirect.js"
 *           data-ios="6797416246"
 *           data-android="com.swingtradesignals.app"></script>
 *
 * so adding an app is a copied folder and two attributes, and a fix to the
 * detection below fixes every app at once.
 */
(function () {
  var tag = document.currentScript;
  if (!tag) return;
  var ios = tag.getAttribute('data-ios');
  var android = tag.getAttribute('data-android');
  var ua = navigator.userAgent || '';

  // An iPad on iPadOS 13+ reports itself as a Mac, so the user agent alone
  // sends every iPad owner to the desktop page. Touch points are the tell: a
  // real Mac reports 0, a touchscreen iPad reports 5.
  var isIOS = /iPhone|iPod|iPad/.test(ua) ||
              (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  // Android phones and tablets, but not Windows Phone, which also said
  // "Android" in some user agents.
  var isAndroid = /Android/.test(ua) && !/Windows Phone/.test(ua);

  // No country code: Apple then sends each visitor to their own country's
  // store. A /us/ link shows an interstitial to everyone outside the US.
  var url = isIOS && ios ? 'https://apps.apple.com/app/id' + ios
          : isAndroid && android ? 'https://play.google.com/store/apps/details?id=' + android
          : null;
  if (!url) return;

  // replace, not assign: the back button from the store should go wherever
  // they came from, not back here to be redirected again.
  location.replace(url);
})();
