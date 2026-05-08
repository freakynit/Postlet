// Default plugin: parse markdown to HTML.
//
// The page's `content` is first rendered by nunjucks (so authors can use
// {{ siteTitle }}, {{ frontmatter.title }}, conditionals, loops, etc. inside
// markdown), then parsed by `marked`. The result is exposed as `body` to the
// page template via {{ body | safe }}.
//
// We also rewrite relative <img src> and <a href> values to base-path-aware
// site paths. `pages/*.md` is flat (one .md per slug, rendered to /<slug>/), but
// authors may store images, PDFs, etc. anywhere under `pages/` (e.g.
// `pages/images/foo.jpg`). Those files are copied to the same relative path
// under `dist/` by the `assets` plugin — but a markdown reference like
// `./images/foo.jpg` would otherwise resolve relative to the page URL
// (`/about/images/foo.jpg`) and 404. Rewriting to a site path fixes it.

import { marked } from 'marked';
import { isExternalOrFragment, withBasePath } from '../urls.js';

marked.setOptions({ gfm: true });

function rewriteHref(value, basePath) {
  if (!value || isExternalOrFragment(value)) return value;
  return withBasePath(value.replace(/^(\.\/)+/, ''), basePath);
}

function rewriteRelativeRefs(html, basePath) {
  return html
    .replace(/<img\b([^>]*?)\bsrc="([^"]+)"/gi, (_, pre, src) => `<img${pre}src="${rewriteHref(src, basePath)}"`)
    .replace(/<a\b([^>]*?)\bhref="([^"]+)"/gi,  (_, pre, href) => `<a${pre}href="${rewriteHref(href, basePath)}"`);
}

function njkContext(page, ctx) {
  return { ...ctx.siteContext, page, frontmatter: page.frontmatter };
}

function renderMarkdown(content, njkCtx, nunjucks, basePath) {
  const rendered = nunjucks.renderString(content, njkCtx);
  return rewriteRelativeRefs(marked.parse(rendered), basePath);
}

export default {
  name: 'markdown',

  transformPage(page, ctx) {
    page.body = renderMarkdown(page.content, njkContext(page, ctx), ctx.nunjucks, ctx.basePath);
  },

  // Special pages (_nav, _footer, ...) are rendered the same way and exposed
  // to templates as `<name>Html` (e.g. `_nav.md` -> `navHtml`).
  siteContext(pages, ctx) {
    const out = {};
    for (const p of pages) {
      if (!p.special) continue;
      const key = p.slug.replace(/^_/, '') + 'Html';
      out[key] = renderMarkdown(p.content, ctx.siteContext, ctx.nunjucks, ctx.basePath);
    }
    return out;
  },
};
