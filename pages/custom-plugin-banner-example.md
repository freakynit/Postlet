---
title: "Custom Plugin Example: Global Notice Banner"
description: Add a lightweight custom plugin that injects a global notice into every page.
keywords:
  - custom plugin
  - postlet plugin
  - siteContext
  - tutorial
tags:
  - plugins
  - tutorial
  - development
date: 2026-05-08
author: Postlet Team
---

This example shows a minimal plugin that contributes one template variable to all pages.

## 1. Create a plugin file

Create `plugins/notice-banner.js`:

```js
export default function noticeBanner() {
  return {
    name: "notice-banner",
    siteContext() {
      return {
        noticeBannerHtml:
          '<div class="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">Postlet demo: replace this banner in production.</div>'
      };
    }
  };
}
```

## 2. Register it

Load it in your plugin list and return it before page rendering hooks run.

## 3. Render in template

In `templates/page.njk`, add:

```njk
{% if noticeBannerHtml %}
  {{ noticeBannerHtml | safe }}
{% endif %}
```

This pattern is ideal for site-wide announcements, beta labels, or migration notices.
