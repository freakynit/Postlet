---
title: Postlet Demo Blog
description: Sample homepage for a Postlet-powered static blog.
keywords:
  - postlet
  - static blog
  - markdown
  - demo
tags:
  - intro
  - postlet
date: 2026-05-08
author: Postlet Team
---

Welcome to the sample content pack for **Postlet**.

Postlet is a tiny static blog generator. One level of pages, markdown + frontmatter, optional "related posts" from embeddings or local keyword scoring, and per-page CSS overrides on top of a global stylesheet (with inline Tailwind via the Play CDN). ESM throughout.

Built as a small **plugin pipeline** — every behavior (markdown parsing, related-post scoring, tag pages, anchors, asset copying) is a plugin under `src/plugins/`, and you can extend it with your own. See **[Plugin Reference](/plugins/)**.

> This demo site itself is built and published using **Postlet**.

This site shows a practical setup for a technical blog built with markdown files, frontmatter, and a plugin pipeline. Start with **[How Postlet Works](/how-postlet-works/)** for the full architecture and configuration guide.

## What this demo includes

- A homepage and about page
- Practical posts about writing, themes, SEO, and plugins
- A draft page using `published: false`
- Tag metadata so tag pages can be generated automatically

## Start editing

Open the `pages/` folder and change any file. Then run:

```bash
npm run serve
```

Postlet will rebuild and serve updated pages at `http://localhost:8080`.
