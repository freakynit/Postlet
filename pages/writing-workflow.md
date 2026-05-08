---
title: A Simple Writing Workflow with Postlet
description: A repeatable process for drafting, reviewing, and publishing markdown posts.
keywords:
  - writing
  - workflow
  - markdown
  - publishing
tags:
  - writing
  - workflow
  - markdown
date: 2026-05-08
author: Postlet Team
---

A static blog is easiest to maintain when writing follows a predictable routine.

## 1. Start with frontmatter

Define `title`, `description`, `tags`, and `date` first. This keeps metadata complete from day one.

## 2. Write body content in sections

Use short sections with `##` headings. It improves scanning and generates useful heading anchors.

## 3. Review locally

Run `npm run serve` and check:

- heading structure
- link paths
- tag relevance
- readability on mobile

## 4. Publish intentionally

Set `published: false` while drafting, then switch to `true` (or remove the field) when ready.
