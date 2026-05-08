// Default plugin: render the "Related" section using the `related` frontmatter
// (populated by the related-post strategy coordinator or written by hand).

function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default {
  name: 'related-posts',

  pageContext(page, ctx) {
    const related = (page.frontmatter.related || []).filter(r =>
      ctx.siteContext.pages.some(p => p.slug === r.slug)
    );
    if (related.length === 0) return { relatedHtml: '' };

    const items = related.map(r => {
      const href = ctx.pathFor(r.slug === 'index' ? '/' : `/${r.slug}/`);
      return `<li><a class="post-link" href="${href}">${escape(r.title)}</a></li>`;
    }).join('');

    return {
      relatedHtml: `<section class="related mt-12 pt-6"><h2 class="text-xl font-semibold mb-3">Related</h2><ul class="list-disc pl-5">${items}</ul></section>`,
    };
  },
};
