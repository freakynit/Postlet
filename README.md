# postlet

Postlet is a simple static blog publisher built around markdown files and a small plugin pipeline.

## Why Postlet

Postlet keeps blog publishing straightforward: write markdown, run one build command, and ship static files.
It stays small by default, but gives you plugin hooks when you need to extend behavior.

> The official Postlet [homepage](https://postlet.pagey.site/) and author's own [personal blog](https://nb1t.sh) are built and published using Postlet.

## Features

- Markdown + frontmatter pages
- One-level page output (`/<slug>/index.html`)
- Extendable plugin hooks
- Optional related posts from embeddings or local keyword scoring
- Root or subpath deployment via `site.basePath`
- Tag pages, SEO meta, heading anchors
- Theme support plus per-page CSS overrides
- Static asset copying from `pages/` to `dist/`


## Quickstart

```bash
npm install
npm run build
npm run serve
```

`npm run serve` builds once, serves `dist/` at `http://localhost:8080`, and rebuilds
on changes to source pages, templates, styles, themes, plugins, or core build code.

To serve an already-built `dist/` without watching files, use:

```bash
npm run serve:static
```

## Project docs

- Full project documentation: [PROJECT.md](./PROJECT.md)
- Plugin system details: [PLUGINS.md](./PLUGINS.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

[freakynit](https://github.com/freakynit) and Claude (AI assisted, not vibe-coded)

