// Default plugin: copy static assets into the output directory.
//
// 1. `styles/` and `themes/` are copied verbatim so the rendered HTML can
//    reference them with absolute paths (`/themes/nord.css`, etc.).
// 2. Every non-`.md` file under `pages/` is copied to the same relative path
//    under `dist/`. This lets authors place images, PDFs, etc. anywhere
//    inside `pages/` (e.g. `pages/images/foo.jpg`) and reference them from
//    markdown. The markdown plugin rewrites relative `src`/`href` values to
//    absolute paths so the references resolve correctly from any page URL.

import fs from 'node:fs/promises';
import path from 'node:path';

async function copyDir(src, dst, filter) {
  try { await fs.access(src); } catch { return; }
  await fs.mkdir(dst, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) await copyDir(s, d, filter);
    else if (!filter || filter(s)) await fs.copyFile(s, d);
  }
}

export default {
  name: 'assets',

  async copyAssets(ctx) {
    const dirs = [ctx.config.build.stylesDir, ctx.config.build.themesDir].filter(Boolean);
    for (const d of dirs) {
      await copyDir(path.join(ctx.root, d), path.join(ctx.outDir, d));
    }
    // Page-attached assets: everything under `pages/` except markdown files.
    const pagesDir = path.join(ctx.root, ctx.config.build.pagesDir);
    await copyDir(pagesDir, ctx.outDir, p => !p.endsWith('.md'));
  },
};
