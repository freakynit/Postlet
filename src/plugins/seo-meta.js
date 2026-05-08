// Default plugin: produce the <meta> block, date line, and canonical/og tags
// for the page template.

function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default {
  name: 'seo-meta',

  pageContext(page, ctx) {
    const fm = page.frontmatter;
    const site = ctx.config.site;
    const pageUrl = ctx.pathFor(page.isHome ? '/' : `/${page.slug}/`);
    const canonical = fm.canonical || ctx.absoluteUrl(pageUrl);
    const ogImage = fm.ogImage ? ctx.absoluteUrl(fm.ogImage) : '';

    const meta = [
      fm.description ? `<meta name="description" content="${escape(fm.description)}">` : '',
      fm.keywords ? `<meta name="keywords" content="${escape((fm.keywords || []).join(', '))}">` : '',
      (fm.author || site.author) ? `<meta name="author" content="${escape(fm.author || site.author)}">` : '',
      `<meta property="og:title" content="${escape(fm.title || site.title)}">`,
      fm.description ? `<meta property="og:description" content="${escape(fm.description)}">` : '',
      `<meta property="og:url" content="${escape(canonical)}">`,
      ogImage ? `<meta property="og:image" content="${escape(ogImage)}">` : '',
      canonical ? `<link rel="canonical" href="${escape(canonical)}">` : '',
      fm.noindex ? `<meta name="robots" content="noindex">` : '',
    ].filter(Boolean).join('\n  ');

    const dateLine = fm.date
      ? `<p class="meta-date text-sm">${escape(new Date(fm.date).toDateString())}${fm.author ? ' · ' + escape(fm.author) : ''}</p>`
      : '';

    return { metaHtml: meta, dateLine };
  },
};
