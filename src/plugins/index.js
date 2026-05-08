// Default plugins, in execution order.
//
// Order matters: `markdown` produces `body` and special-page HTML; `embeddings`
// coordinates related-post scoring strategies at `pagesLoaded` and may rewrite
// frontmatter; `tags` and `related-posts` contribute to the per-page template
// context; `heading-anchors` post-processes the rendered HTML; `seo-meta`
// provides <meta>/og/date snippets; `assets` copies static directories.

import markdown from './markdown.js';
import embeddings from './embeddings.js';
import tags from './tags.js';
import relatedPosts from './related-posts.js';
import seoMeta from './seo-meta.js';
import headingAnchors from './heading-anchors.js';
import assets from './assets.js';

export const defaultPlugins = [
  markdown,
  embeddings,
  tags,
  relatedPosts,
  seoMeta,
  headingAnchors,
  assets,
];
