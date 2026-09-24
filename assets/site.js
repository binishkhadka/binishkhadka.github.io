/*
 * Shared behaviour for every page. Loaded with `defer`, so it only ever
 * enhances markup that is already in the HTML response — nothing here renders
 * content. Link-preview scrapers (Slack, iMessage, WhatsApp, Facebook) do not
 * run JavaScript, so anything they need must be static.
 */

// Year stamp. The markup ships a plausible year so the footer is correct with
// JS off; this only corrects it after a new year rolls over.
for (const el of document.querySelectorAll('[data-year]')) {
  el.textContent = new Date().getFullYear();
}

/*
 * "Copy share link" — hands over the device-aware link so whoever receives it
 * lands on their own store rather than being asked which phone they have.
 *
 * The confirmation is announced through a separate live region rather than by
 * rewriting the button's label: changing the accessible name of the element
 * that currently has focus is announced inconsistently across screen readers,
 * and the fallback path would otherwise leave a raw URL as the button's name.
 */
const status = document.getElementById('shareStatus');
for (const btn of document.querySelectorAll('[data-share]')) {
  let timer;
  const say = (visible, spoken) => {
    clearTimeout(timer);
    btn.textContent = visible;
    if (status) status.textContent = spoken || visible;
    timer = setTimeout(() => { btn.textContent = 'Copy link'; }, 1800);
  };

  btn.addEventListener('click', async () => {
    const url = location.origin + btn.dataset.share;
    try {
      await navigator.clipboard.writeText(url);
      say('Link copied');
    } catch {
      // Clipboard access can be refused outright — an insecure context, or the
      // user declined. Falling back to the share sheet, then to showing the
      // link, means the button always does something.
      if (navigator.share) {
        try { await navigator.share({ url }); return; } catch { /* dismissed */ }
      }
      say(url.replace(/^https?:\/\//, ''), 'Could not copy automatically. The link is shown on the button.');
    }
  });
}
