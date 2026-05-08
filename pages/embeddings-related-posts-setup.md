---
title: Embeddings-Based Related Posts Setup
description: Configure Postlet to generate related posts using OpenAI-compatible embeddings.
keywords:
  - embeddings
  - related posts
  - openai compatible
  - postlet
tags:
  - embeddings
  - plugins
  - seo
date: 2026-05-08
author: Postlet Team
---

Postlet can compute related posts using semantic similarity instead of keyword overlap.

## 1. Enable the embeddings strategy

In `config.json`, set `relatedPosts.strategy` to `embeddings` and provide model settings:

```json
"relatedPosts": {
  "enabled": true,
  "strategy": "embeddings",
  "topK": 3,
  "minScore": 0.05,
  "writeBackToFrontmatter": false,
  "strategies": {
    "embeddings": {
      "baseUrl": "https://api.openai.com/v1",
      "apiKeyEnv": "OPENAI_API_KEY",
      "model": "text-embedding-3-small",
      "cacheFile": ".embeddings-cache.json"
    }
  }
}
```

## 2. Provide the API key

Set `OPENAI_API_KEY` in your shell before running builds.

## 3. Build and verify

Run:

```bash
npm run build
```

Then inspect generated pages to confirm each post now shows semantically related content.

## Notes

- Use `writeBackToFrontmatter: false` if you want clean source files.
- Remove `.embeddings-cache.json` to force full re-embedding.
