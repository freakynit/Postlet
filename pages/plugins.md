---
title: Postlet Plugin Reference
description: Full plugin system documentation for Postlet, including hooks, context, and examples.
keywords:
  - postlet
  - plugins
  - documentation
  - hooks
tags:
  - plugins
  - docs
  - development
date: 2026-05-08
author: Postlet Team
---

{% raw %}

`postlet` is built as a small **plugin pipeline**. The build itself is
just an orchestrator that loads markdown files, asks plugins to transform them,
and writes the result to `dist/`. Every behavior — markdown parsing,
related-post scoring, tag pages, heading anchors, even copying assets — is implemented as
a plugin in `src/plugins/`.

This document describes the plugin contract so you can extend or replace
behavior without forking the core.

---

## Plugin shape

A plugin is a plain object with a `name` and one or more **hook** methods. Hooks
may be sync or async. Unknown methods are ignored.

```js
// my-plugin.js
export default {
  name: 'my-plugin',

  async pageContext(page, ctx) {
    return { wordCount: page.content.split(/\s+/).length };
  },
};
```

Register a plugin by adding its file path to `config.json`:

```json
{
  "plugins": ["./plugins/my-plugin.js"]
}
```

User plugins run **after** all default plugins, in the order listed.

---

## The `ctx` object

Every hook (except `processHtml`) receives `ctx` as its last argument. It holds
shared build state:

| field | description |
| --- | --- |
| `ctx.config` | the parsed `config.json` (after `configResolved` hooks) |
| `ctx.root` | absolute path to project root |
| `ctx.outDir` | absolute path to the output directory (`dist/`) |
| `ctx.nunjucks` | the configured nunjucks environment |
| `ctx.pipeline` | the `Pipeline` instance (rarely needed) |
| `ctx.basePath` | normalized deployment path prefix, e.g. `/showcase/blog-a` or empty string |
| `ctx.pathFor(path)` | prefixes internal paths with `ctx.basePath` |
| `ctx.absoluteUrl(path)` | converts an internal path to an absolute URL using `site.url` |
| `ctx.siteContext` | site-wide template variables (only available from `transformPage` onward) |

`ctx.siteContext` always contains at least `{ config, site, siteTitle, siteUrl, siteBasePath, siteAuthor, pages }` plus whatever `siteContext` hooks have contributed.

---

## Hooks

Hooks fire in the order below. Each row notes how the return value is used.

### `configResolved(config, ctx) -> config`
Mutate or replace the config before anything else runs. Return a new object to
replace it; mutate in place and return nothing to keep the same reference.

### `pagesLoaded(pages, ctx) -> true | Page[] | undefined`
Fired once after every `pages/*.md` is loaded. Use this to enrich frontmatter,
filter pages, or rewrite source files.

- Return `true` to signal that source files were rewritten and pages should be
  reloaded from disk before rendering. The default `embeddings` plugin uses this.
- Return an array to replace the pages list outright.
- Return nothing for in-place mutation.

### `relatedPostStrategies(pages, config, ctx) -> Array<Strategy>`
Contribute one or more related-post scoring strategies. The default
`embeddings` plugin collects these strategies during `pagesLoaded` and runs
exactly one, selected by `relatedPosts.strategy`.

```js
// plugins/my-related-strategy.js
export default {
  name: 'my-related-strategy',
  relatedPostStrategies() {
    return [{
      name: 'my-keywords',
      scorePages(pages, cfg) {
        return pages.map(page => ({
          slug: page.slug,
          related: [], // [{ slug, title, score }]
        }));
      },
    }];
  },
};
```

Strategy names must be unique. `relatedPosts.strategy` must be a single string;
arrays are rejected so only one scoring system runs per build.

### `siteContext(pages, ctx) -> object`
Contribute site-wide template variables. The returned object is merged into
`ctx.siteContext` (and so visible to every page render). Later plugins see
earlier plugins' contributions via `ctx.siteContext`.

The default `markdown` plugin uses this hook to render `_nav.md` and
`_footer.md` into `navHtml` / `footerHtml`.

### `transformPage(page, ctx)`
Called once per non-special, published page. Mutate `page` in place. The
canonical use is to set `page.body` (the rendered HTML the template will inject
via `{{ body | safe }}`). The default `markdown` plugin does this.

If you replace `markdown`, make sure your plugin sets `page.body`.

### `pageContext(page, ctx) -> object`
Contribute per-page template variables. Returned objects are merged into the
final render context. Common keys (provided by default plugins): `tagsHtml`,
`relatedHtml`, `metaHtml`, `dateLine`. Anything you return is available in the
template as `{{ yourKey | safe }}`.

### Template render
Between `pageContext` and `processHtml`, the build renders `templates/page.njk`
with the merged context (`siteContext` ∪ `pageContext`).

### `processHtml(html, page, ctx) -> string`
Reduce-style hook over the rendered HTML. Each plugin receives the output of
the previous one and must return a string. Use this to inject heading IDs,
rewrite links, minify, etc. The default `heading-anchors` plugin uses it.

### `emit(pages, ctx) -> Array<{path, content}>`
Return additional files to write into `dist/`. `path` is relative to `outDir`;
`content` is a string or Buffer. The default `tags` plugin emits
`tags/<tag>/index.html`. Good places for RSS feeds, sitemaps, JSON indexes.

### `copyAssets(ctx)`
Side-effect hook for copying static directories into `dist/`. The default
`assets` plugin copies `styles/` and `themes/`.

### `buildComplete(ctx)`
Final hook. Use for cleanup, logging, deploy hooks, etc.

---

## The `page` object

```ts
{
  slug: string,           // filename without `.md`
  special: boolean,       // true if filename starts with `_`
  isHome: boolean,        // slug === 'index'
  filePath: string,       // absolute path to source .md
  filename: string,       // basename
  frontmatter: object,    // parsed YAML frontmatter
  content: string,        // markdown body (sans frontmatter)
  raw: string,            // full source as read from disk
  body?: string,          // rendered HTML (set by transformPage hooks)
}
```

---

## Default plugins (read these to learn by example)

| file | hook(s) | purpose |
| --- | --- | --- |
| `markdown.js` | `transformPage`, `siteContext` | render markdown + nunjucks → `body` / `navHtml` / `footerHtml` |
| `embeddings.js` | `pagesLoaded`, `relatedPostStrategies` | compute "related posts" via one configured strategy (`keywords` or `embeddings`) |
| `tags.js` | `pageContext`, `emit` | tag chips + `tags/<tag>/` index pages |
| `related-posts.js` | `pageContext` | render the "Related" section from `frontmatter.related` |
| `seo-meta.js` | `pageContext` | `<meta>`, og:, canonical, date line |
| `heading-anchors.js` | `processHtml` | `id="..."` + `<a class="anchor">` on every heading |
| `assets.js` | `copyAssets` | copy `styles/`, `themes/`, and every non-`.md` file under `pages/` |

To turn off a default behavior, write a thin plugin that overrides what it
contributes. There is currently no plugin-disable mechanism — by design: forks
should be small, explicit, and obvious in `git diff`.

---

## Templates

Templates live in `templates/` and are rendered with **nunjucks**
([docs](https://mozilla.github.io/nunjucks/templating.html)). Autoescape is
**off** because the build assembles HTML fragments via plugins and injects
them with `| safe`. Plugins are responsible for escaping any user-provided
text they include.

The single shipped template is `templates/page.njk`. Variables it uses:

| variable | source |
| --- | --- |
| `site`, `siteTitle`, `siteUrl`, `siteBasePath`, `siteAuthor`, `config` | base site context |
| `pageTitle`, `title`, `body`, `frontmatter`, `slug`, `url`, `isHome` | base page context |
| `navHtml`, `footerHtml` | `markdown` plugin |
| `metaHtml`, `dateLine` | `seo-meta` plugin |
| `tagsHtml` | `tags` plugin |
| `relatedHtml` | `related-posts` plugin |

The template environment also exposes two URL helpers:

| helper | purpose |
| --- | --- |
| `pathFor('/about/')` | returns a base-path-aware internal path |
| `absoluteUrl('/about/')` | returns an absolute public URL based on `site.url` |

Markdown source files are **also** processed by nunjucks before being parsed
as markdown. So you can write `{{ siteTitle }}`, `{% if frontmatter.tags %}…`,
etc. directly in `pages/*.md`. This replaces the old `{{siteTitle}}`
config-vars hack.

---

## Worked example: a reading-time plugin

```js
// plugins/reading-time.js
export default {
  name: 'reading-time',
  pageContext(page) {
    const minutes = Math.max(1, Math.round(page.content.split(/\s+/).length / 220));
    return {
      readingTimeHtml: `<p class="text-xs text-slate-400">${minutes} min read</p>`,
    };
  },
};
```

In `templates/page.njk`, add `{{ readingTimeHtml | safe }}` wherever you want it
to appear. In `config.json`:

```json
"plugins": ["./plugins/reading-time.js"]
```

That's it.

---

## Worked example: an RSS plugin

```js
// plugins/rss.js
export default {
  name: 'rss',
  emit(pages, ctx) {
    const site = ctx.config.site;
    const items = pages
      .filter(p => !p.special && p.frontmatter.published !== false)
      .map(p => `<item>
  <title>${esc(p.frontmatter.title || p.slug)}</title>
  <link>${ctx.absoluteUrl(p.isHome ? '/' : `/${p.slug}/`)}</link>
  <description>${esc(p.frontmatter.description || '')}</description>
</item>`).join('\n');

    const xml = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>${esc(site.title)}</title>
  <link>${ctx.absoluteUrl('/')}</link>
  ${items}
</channel></rss>`;
    return [{ path: 'rss.xml', content: xml }];
  },
};

function esc(s) {
  return String(s).replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]));
}
```

---

## Custom plugins in this repo

This repository already ships two **user plugins** under `plugins/`:

- `plugins/image-sizing.js` (custom): reads image markdown title tokens like `"50 contain"` and rewrites `<img>` tags with width/object-fit inline styles in `processHtml`.
- `plugins/analytics.js` (custom): injects HTML before `</body>` in `processHtml`.

They are loaded through `config.json`:

```json
"plugins": [
  "./plugins/image-sizing.js",
  "./plugins/analytics.js"
]
```

`analytics.js` also demonstrates plugin-specific config via `pluginConfigs`:

```json
"pluginConfigs": {
  "analytics": {
    "bodyEndHtml": "<script>/* analytics snippet */</script>"
  }
}
```

The plugin reads `ctx.config.pluginConfigs.analytics.bodyEndHtml`, which is a useful pattern for keeping custom plugin settings in one place.

---

## Styling: don't hardcode Tailwind colors

The Tailwind Play CDN is loaded on every page, so utility classes like
`bg-slate-200` or `text-blue-600` will work — but they are **not theme-aware**.
Themes (under `themes/`) define a small set of CSS variables (`--bg`, `--fg`,
`--muted`, `--accent`, `--border`, `--code-bg`) and style a few semantic
classes:

| class | role |
| --- | --- |
| `.tag-chip` | tag chips |
| `.post-link` | links to other posts (in indexes, "related", etc.) |
| `.meta-date` | small muted date/byline text |
| `.related` | wrapper for the "Related" section (provides the top border) |
| `.site-nav`, `.site-footer`, `.page-content` | layout regions |

When a plugin emits HTML, prefer these semantic classes (and Tailwind utilities
for **layout/spacing only** — `mt-12`, `px-2`, `text-xs`, `inline-block`) so the
output respects whatever theme the site is using. If you need a new color slot,
add a class to every theme file and use `var(--accent)` / `var(--muted)` etc.

## Conventions and gotchas

- **Plugin order matters.** Defaults run in the order listed in
  `src/plugins/index.js`; user plugins run after, in `config.plugins` order.
- **Mutation is idiomatic.** `transformPage` mutates `page`; `siteContext` /
  `pageContext` return objects that are merged. Don't deep-clone unless you
  have a reason.
- **Special pages** (filenames starting with `_`) are loaded but never emitted
  as standalone pages. Plugins decide what to do with them. Currently `_nav.md`
  and `_footer.md` are consumed by the `markdown` plugin.
- **No plugin sandbox.** Plugins run as ESM modules with full Node access. Only
  use plugins you trust.
- **Build is not idempotent for source files** when
  `relatedPosts.writeBackToFrontmatter` is enabled — it rewrites
  `frontmatter.related` on every build. Disable it in `config.json` if that
  bothers you.

{% endraw %}
