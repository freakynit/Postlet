// Default plugin: per-page tag chips and `tags/<tag>/` index pages.

import { slugify } from './heading-anchors.js';

function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function tagsHtml(tags, ctx) {
  return (tags || []).map(t =>
    `<a class="tag-chip inline-block text-xs px-2 py-1 rounded mr-1 no-underline" href="${ctx.pathFor(`/tags/${slugify(t)}/`)}">#${escape(t)}</a>`
  ).join('');
}

export default {
  name: 'tags',

  pageContext(page, ctx) {
    return { tagsHtml: tagsHtml(page.frontmatter.tags, ctx) };
  },

  emit(pages, ctx) {
    const tagMap = new Map();
    for (const p of pages) {
      if (p.special || p.frontmatter.published === false) continue;
      for (const tag of (p.frontmatter.tags || [])) {
        if (!tagMap.has(tag)) tagMap.set(tag, []);
        tagMap.get(tag).push(p);
      }
    }

    const out = [];
    for (const [tag, posts] of tagMap) {
      const sorted = posts.slice().sort((a, b) =>
        new Date(b.frontmatter.date || 0) - new Date(a.frontmatter.date || 0)
      );
      const items = sorted.map(p => {
        const href = ctx.pathFor(p.isHome ? '/' : `/${p.slug}/`);
        const date = p.frontmatter.date
          ? `<span class="meta-date text-sm ml-2">${escape(new Date(p.frontmatter.date).toDateString())}</span>`
          : '';
        return `<li><a class="post-link" href="${href}">${escape(p.frontmatter.title || p.slug)}</a>${date}</li>`;
      }).join('');

      const tagSlug = slugify(tag);
      const fullContext = {
        ...ctx.siteContext,
        page: { slug: `tags/${tagSlug}`, frontmatter: {}, isHome: false },
        frontmatter: {},
        slug: `tags/${tagSlug}`,
        isHome: false,
        pageTitle: `#${tag}`,
        title: `#${tag} — ${ctx.config.site.title}`,
        body: `<ul class="list-disc pl-5">${items}</ul>`,
        url: ctx.pathFor(`/tags/${tagSlug}/`),
        tagsHtml: '',
        relatedHtml: '',
        dateLine: '',
        metaHtml: '',
      };
      const html = ctx.nunjucks.render('page.njk', fullContext);
      out.push({ path: `tags/${tagSlug}/index.html`, content: html });
    }
    return out;
  },
};
