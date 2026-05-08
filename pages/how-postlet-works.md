---
title: How Postlet Works
description: End-to-end project documentation for Postlet architecture, pipeline, configuration, and authoring workflow.
keywords:
  - postlet
  - architecture
  - documentation
  - static site generator
tags:
  - docs
  - architecture
  - development
date: 2026-05-08
author: Postlet Team
---

{% raw %}

## Quickstart

```bash
npm install
npm run build      # writes dist/
npm run serve      # builds, watches changes, serves http://localhost:8080
```

Use `npm run serve:static` to serve an already-built `dist/` without watching.

## Layout

```
config.json                    site + build + related-post + plugin config
                               (including pluginConfigs for user plugins)
pages/
  index.md                     home page (also markdown, slug = "index")
  *.md                         each becomes /<slug>/index.html
  _nav.md                      special: rendered into the header nav slot
  _footer.md                   special: rendered into the footer slot
themes/                        CSS themes; active one is config.build.theme
styles/custom/<page>.css       per-page overrides (referenced from frontmatter `css:`)
templates/page.njk             nunjucks template
src/
  build.js                     entrypoint: orchestrates the plugin pipeline
  dev.js                       watch mode: rebuilds on changes and serves dist/
  pipeline.js                  plugin manager and hook runner
  pages.js                     load `pages/*.md` into Page records
  serve.js                     dev static file server
  plugins/
    index.js                   default plugin list (in execution order)
    markdown.js                nunjucks → marked → page.body
    embeddings.js              related-post strategy coordinator
    tags.js                    tag chips + /tags/<tag>/ index pages
    related-posts.js           "Related" section from frontmatter.related
    seo-meta.js                <meta>, og:, canonical, date line
    heading-anchors.js         id + <a class="anchor"> on every heading
    assets.js                  copy styles/ and themes/ into dist/
plugins/                       custom user plugins loaded from config.plugins
  image-sizing.js              custom plugin: markdown image title -> width/object-fit style
  analytics.js                 custom plugin: inject body-end HTML from pluginConfigs.analytics
```

Filenames starting with `_` are **special**: not emitted, only consumed by plugins. The default `markdown` plugin renders them and exposes them to templates as `<name>Html` (so `_nav.md` → `navHtml`, `_footer.md` → `footerHtml`).

## Build pipeline

`src/build.js` is just an orchestrator. Hooks fire in this order:

1. `configResolved(config)` — plugins may mutate config.
2. **Load** every `pages/*.md` via gray-matter.
3. `pagesLoaded(pages)` — e.g. the related-post coordinator computes related posts and writes them back into source frontmatter.
4. `siteContext(pages)` — plugins contribute site-wide template variables (e.g. `navHtml`).
5. For every non-special, published page:
   - `transformPage(page)` — markdown plugin sets `page.body`.
   - `pageContext(page)` — plugins contribute per-page variables (e.g. `tagsHtml`, `metaHtml`).
   - Render `templates/page.njk` with the merged context.
   - `processHtml(html, page)` — heading-anchors plugin post-processes.
   - Write to `dist/<slug>/index.html` (homepage → `dist/index.html`).
6. `emit(pages)` — plugins return extra files (tag pages, RSS, sitemap, …).
7. `copyAssets()` — copy static directories into `dist/`.
8. `buildComplete()`.

`dist/` is wiped at the start of every build. See **[PLUGINS.md](./PLUGINS.md)** to write your own plugin.

## Custom plugins in this repo

This repo already includes two user plugins under `plugins/` and registers them in `config.json`:

- `./plugins/image-sizing.js`
- `./plugins/analytics.js`

These run after default plugins (because user plugins run after defaults).

### `image-sizing.js` (custom plugin example)

Uses the `processHtml` hook to parse image `title` values like `"50 contain"` and rewrite `<img>` tags with inline `style` (width percentage + `object-fit`).

This allows markdown authors to control image presentation without editing templates.

### `analytics.js` + `pluginConfigs` (custom config example)

Uses the `processHtml` hook to inject HTML before `</body>`, reading from:

```json
"pluginConfigs": {
  "analytics": {
    "bodyEndHtml": "<script>/* analytics snippet */</script>"
  }
}
```

The plugin reads `ctx.config.pluginConfigs.analytics.bodyEndHtml`, so plugin-specific settings live in `config.json` without touching core code.

## Frontmatter fields

| field | purpose |
| --- | --- |
| `title` | page title (drives `<title>` and the rendered `<h1>`) |
| `description` | meta description + `og:description` |
| `keywords` | array → `<meta name="keywords">` |
| `tags` | array → clickable tag chips linking to `/tags/<tag>/`; also a strong keyword-scoring signal for related posts |
| `date` | ISO date string, displayed under title (`new Date(...)`)|
| `author` | overrides `site.author` |
| `published` | `false` skips the page entirely |
| `canonical` | `<link rel="canonical">` |
| `ogImage` | `og:image` URL |
| `noindex` | `true` adds `robots: noindex` |
| `css` | path under repo root (e.g. `styles/custom/foo.css`); loaded after `global.css` |
| `related` | **auto-filled** by step 2 — don't write by hand |

All fields are optional. Missing fields render as empty strings.

## Deployment Paths

`site.url` is the canonical public URL. `site.basePath` controls the path prefix
used for internal links and assets:

```json
"site": {
  "url": "https://example.com/showcase/blog-a",
  "basePath": "/showcase/blog-a"
}
```

This generates links like `/showcase/blog-a/`,
`/showcase/blog-a/my-post/`, `/showcase/blog-a/themes/nord.css`, and canonical
URLs like `https://example.com/showcase/blog-a/my-post/`.

If `site.basePath` is omitted or empty, the build derives it from the path part
of `site.url`. For `https://example.com/showcase/blog-a`, the derived base path
is `/showcase/blog-a`; for `https://example.com`, it is empty and links stay
root-relative.

## Related Posts

Configured under `relatedPosts` in `config.json`. Choose exactly one strategy with `relatedPosts.strategy`:

- `keywords` uses local token/keyword scoring. It has no network calls, no API key, and is the easiest default for public projects.
- `embeddings` uses any OpenAI-compatible `/embeddings` endpoint (OpenAI, OpenRouter, Ollama, vLLM, ...). Set `apiKey` directly or via `apiKeyEnv` (env var name).

```json
"relatedPosts": {
  "enabled": true,
  "strategy": "keywords",
  "topK": 3,
  "minScore": 0.05,
  "writeBackToFrontmatter": false
}
```

To use embeddings instead, change only the selected strategy and configure the
embedding strategy block:

```json
"relatedPosts": {
  "enabled": true,
  "strategy": "embeddings",
  "strategies": {
    "embeddings": {
      "baseUrl": "https://openrouter.ai/api/v1",
      "apiKeyEnv": "OPENROUTER_API_KEY",
      "model": "perplexity/pplx-embed-v1-0.6b",
      "cacheFile": ".embeddings-cache.json"
    }
  }
}
```

Embedding cache: `.embeddings-cache.json` (gitignored). Keyed by `sha256(model + text)` — change either and the page re-embeds. Delete the file to force a full re-embed.

`relatedPosts.writeBackToFrontmatter: false` keeps `related` in memory only (won't touch source files).

## Markdown nuances (important for adding new pages)

- **Don't start the body with `# Title`.** The template already renders an `<h1>` from `frontmatter.title`. Start with `## ` or a paragraph. The research importer strips a leading `# ...` automatically; hand-written pages should just not have one.
- **Headings get auto-generated IDs** by the `heading-anchors` plugin using a GitHub-style slugify (lowercase, strip punctuation, decode common HTML entities like `&amp;`, spaces → hyphens, dedupe collisions with `-1`/`-2`). This makes in-page TOCs work — markdown links like `[Foo](#foo)` resolve naturally.
- **Inline HTML passes through.** Citation anchors like `<a href="#reference-1">[1]</a>` work; so do tailwind-class divs (e.g. `<div class="p-4 bg-yellow-100">…</div>`) thanks to the Tailwind Play CDN.
- **GFM features enabled by default** in `marked` v12: tables, fenced code, autolinks, task lists, strikethrough.
- **Headings that already contain an `<a>`** are not double-wrapped — the post-processor detects existing anchors and only adds the `id`.
- **Slug = filename** (without `.md`). Don't rename files casually; related-post frontmatter, embedding cache entries, and any external links break.
- **Drafts**: set `published: false`. The page is loaded (still gets parsed) but neither embedded nor emitted.

## Themes

The active theme is the CSS file at `config.build.theme` (path relative to project root). Five samples ship in `themes/`:

| theme | feel |
| --- | --- |
| `themes/default.css` | clean light, neutral, indigo accent |
| `themes/sepia.css` | warm cream, serif, book-like |
| `themes/nord.css` | soft cool blue-gray |
| `themes/solarized-light.css` | classic warm parchment |
| `themes/dark-soft.css` | low-strain dark mode |

Switch themes by editing one line in `config.json`:

```json
"build": { "theme": "themes/sepia.css" }
```

Each theme is fully self-contained (no shared base) — palette via CSS custom properties at the top, then complete rule set. To author a new theme, copy `themes/default.css` and tweak the `:root` variables. Theme files are copied verbatim into `dist/themes/`.

The template body no longer hardcodes background/text colors (only `antialiased`); themes own those. Per-page `css:` still layers on top of the active theme.

## Tailwind

`build.tailwindPlayCdn: true` injects `https://cdn.tailwindcss.com` into every page so utility classes work in markdown HTML. The template itself uses Tailwind classes; turning the CDN off will leave the template looking unstyled unless you replace those classes in `templates/page.njk` and the relevant plugins.

## Per-page CSS

```yaml
---
title: My Page
css: styles/custom/my-page.css
---
```

The theme loads first, then the page-specific file layers on top. The path is relative to the generated site root (i.e. resolves to `/styles/custom/my-page.css` at the domain root, or `/your/basePath/styles/custom/my-page.css` under a subpath). Per-page CSS should use the theme's CSS custom properties (e.g. `var(--accent)`) rather than hardcoded colors so the active theme is still respected.

## Images and other static files

Drop images, PDFs, etc. anywhere under `pages/` (any nesting). The `assets` plugin copies every non-`.md` file from `pages/` into `dist/` preserving its directory structure, and the `markdown` plugin rewrites relative `src`/`href` values in the rendered HTML to base-path-aware site paths.

```markdown
<!-- in pages/about.md, with the file at pages/images/me.jpg -->
![me](./images/me.jpg)
![me](images/me.jpg)
![me](/images/me.jpg)
```

All three forms render to `<img src="/images/me.jpg">` at the domain root, or `<img src="/your/basePath/images/me.jpg">` under a subpath, and resolve correctly from any page URL. External URLs (`http://`, `https://`, `mailto:`, `data:`, etc.) and in-page anchors (`#section`) are left untouched.

## Templating in content

Markdown source files are rendered through **nunjucks** before being parsed as markdown, so any nunjucks expression works directly inside `.md` files:

```markdown
Read more at [{{ siteTitle }}]({{ siteUrl }}).

{% if frontmatter.tags %}Tagged with: {{ frontmatter.tags | join(', ') }}.{% endif %}
```

Available variables: `site`, `siteTitle`, `siteUrl`, `siteBasePath`, `siteAuthor`, `config`, `pages`, `page`, `frontmatter`, plus anything plugins contribute via the `siteContext` hook. The template environment also exposes `pathFor(path)` for base-path-aware internal URLs and `absoluteUrl(path)` for absolute public URLs. See [PLUGINS.md](./PLUGINS.md#templates) for the full list and template reference.

## Gotchas / tips for future edits

- The build is **not idempotent for source files** by design when `relatedPosts.writeBackToFrontmatter` is enabled: the related-post coordinator rewrites every page's frontmatter with `related`. Expect markdown files to change on each build (gray-matter normalizes YAML — quotes, dates as ISO timestamps, list expansion). This is intentional so the rendered output is fully static and self-contained. Disable with `relatedPosts.writeBackToFrontmatter: false`.
- `loadPages` may be called twice per build (once before related-post scoring, once after writeback). Keep it cheap.
- Adding a new template variable: contribute it from a plugin's `pageContext` or `siteContext` hook, then reference it in `templates/page.njk` as `{{ yourVar | safe }}`. No core changes needed.
- The dev server (`src/serve.js`) is ~30 lines and serves `dist/` only. No watch/reload — re-run `npm run build`.
- `gray-matter` writes dates back as `YYYY-MM-DDTHH:mm:ss.sssZ`. Don't be alarmed by the diff churn after first build.

{% endraw %}
