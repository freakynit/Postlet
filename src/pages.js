// Load every `pages/*.md` into a uniform Page record.
//
// Pages whose filename starts with `_` are flagged `special` — the build does
// not emit them as standalone pages. Plugins are free to consume them
// (e.g. the markdown plugin renders `_nav.md` into the template's `navHtml`).

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

export async function loadPages(pagesDir) {
  const entries = await fs.readdir(pagesDir, { withFileTypes: true });
  const pages = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.md')) continue;
    const filePath = path.join(pagesDir, e.name);
    const raw = await fs.readFile(filePath, 'utf8');
    const { data, content } = matter(raw);
    const slug = e.name.replace(/\.md$/, '');
    const special = slug.startsWith('_');
    pages.push({
      slug,
      special,
      isHome: slug === 'index',
      filePath,
      filename: e.name,
      frontmatter: data,
      content,
      raw,
    });
  }
  return pages;
}
