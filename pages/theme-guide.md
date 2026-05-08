---
title: Theme and Styling Guide
description: How to switch themes and apply per-page CSS in Postlet.
keywords:
  - themes
  - css
  - design
  - postlet
tags:
  - themes
  - styling
  - css
date: 2026-05-08
author: Postlet Team
---

Postlet themes are plain CSS files, so customization stays straightforward.

## Switch the global theme

Edit `config.json` and set:

```json
"build": { "theme": "themes/nord.css" }
```

## Add page-specific CSS

In frontmatter:

```yaml
css: styles/custom/about.css
```

Use CSS variables from the active theme to keep a consistent visual style.
