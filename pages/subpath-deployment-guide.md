---
title: Subpath Deployment Guide
description: Deploy Postlet under a repository or product subpath using site.basePath.
keywords:
  - deployment
  - basePath
  - github pages
  - static hosting
tags:
  - deployment
  - config
  - hosting
date: 2026-05-08
author: Postlet Team
---

If your blog lives at a path like `/engineering/blog`, configure Postlet once and keep links correct.

## Example config

```json
"site": {
  "url": "https://example.com/engineering/blog",
  "basePath": "/engineering/blog"
}
```

## What this changes

- Internal links resolve under `/engineering/blog/...`
- Theme and custom CSS asset URLs include the same prefix
- Canonical URLs are generated from `site.url`

## When to omit basePath

If your blog is hosted at domain root (for example, `https://example.com`), omit `basePath` and Postlet will keep root-relative links.

## Validation checklist

- Open homepage and one post from a nested route
- Confirm CSS and images load
- Confirm canonical tags match the public URL
