// Demo user plugin: control image width and object-fit via the markdown title.
//
// Usage in markdown:
//   ![alt](./images/foo.jpg "50 contain")
//                              │   └── object-fit value
//                              └────── width as a percentage (1–100)
//
// The first token is required; the second is optional and defaults to
// `contain`. Allowed fit values are the standard CSS `object-fit` keywords:
// fill, contain, cover, none, scale-down.
//
// The plugin runs in the `processHtml` hook (after markdown is parsed and
// after relative-path rewriting), so it sees plain `<img ... title="...">`
// tags. It rewrites them to drop the title and add a `style` attribute.

const FITS = new Set(['fill', 'contain', 'cover', 'none', 'scale-down']);
const TITLE_RE = /^\s*(\d{1,3})(?:\s+([a-z-]+))?\s*$/i;
const IMG_WITH_TITLE = /<img\b([^>]*?)\stitle="([^"]+)"([^>]*)>/g;

export default {
  name: 'image-sizing',

  processHtml(html) {
    return html.replace(IMG_WITH_TITLE, (match, pre, title, post) => {
      const m = title.match(TITLE_RE);
      if (!m) return match; // unrecognized title — leave the tag alone

      const width = Math.min(100, Math.max(1, parseInt(m[1], 10)));
      const fit = (m[2] || '').toLowerCase();
      const fitValue = FITS.has(fit) ? fit : 'contain';

      const style = `width:${width}%;height:auto;object-fit:${fitValue};`;
      return `<img${pre}${post} style="${style}">`;
    });
  },
};
