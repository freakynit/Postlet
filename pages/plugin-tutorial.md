---
title: Build Your First Postlet Plugin
description: Learn the core plugin hooks by implementing a tiny custom feature.
keywords:
  - plugins
  - postlet
  - hooks
  - nodejs
tags:
  - plugins
  - tutorial
  - development
date: 2026-05-08
author: Postlet Team
---

Postlet is organized around hook-based plugins.

## Minimal plugin idea

Create a plugin that adds a site-wide notice banner through `siteContext`.

## Typical hook flow

- `pagesLoaded(pages)` for content analysis
- `transformPage(page)` for page body changes
- `pageContext(page)` for per-page template data
- `emit(pages)` for extra generated files

## Where to continue

Read the **[full plugin reference](/plugins/)** and copy one of the built-in plugins as a starting template.
