import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nunjucks from 'nunjucks';
import { Pipeline } from './pipeline.js';
import { loadPages } from './pages.js';
import { defaultPlugins } from './plugins/index.js';
import { absoluteUrl, pagePath, resolveBasePath, withBasePath } from './urls.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function main() {
  let config = JSON.parse(await fs.readFile(path.join(root, 'config.json'), 'utf8'));
  const outDir = path.join(root, config.build.outDir);

  const pipeline = new Pipeline();
  for (const p of defaultPlugins) pipeline.use(p);
  for (const userPluginPath of (config.plugins || [])) {
    const mod = await import(path.resolve(root, userPluginPath));
    pipeline.use(mod.default || mod);
  }

  const njk = nunjucks.configure(path.join(root, config.build.templatesDir), {
    autoescape: false,
    noCache: true,
  });
  njk.addFilter('stripLeadingSlash', s => String(s || '').replace(/^\/+/, ''));

  const ctx = {
    config,
    root,
    outDir,
    nunjucks: njk,
    pipeline,
  };

  config = await pipeline.runReduce('configResolved', config, ctx);
  const basePath = resolveBasePath(config.site);
  config.site.basePath = basePath;
  njk.addGlobal('pathFor', value => withBasePath(value, basePath));
  njk.addGlobal('absoluteUrl', value => absoluteUrl(config.site.url, withBasePath(value, basePath)));
  ctx.config = config;
  ctx.basePath = basePath;
  ctx.pathFor = value => withBasePath(value, basePath);
  ctx.absoluteUrl = value => absoluteUrl(config.site.url, withBasePath(value, basePath));

  console.log('[1/5] Loading pages...');
  const pagesDir = path.join(root, config.build.pagesDir);
  let pages = await loadPages(pagesDir);
  console.log(`     ${pages.length} pages loaded.`);

  console.log('[2/5] Running pagesLoaded hooks...');
  const reload = await pipeline.runReduce('pagesLoaded', pages, ctx);
  // pagesLoaded may signal that source files were rewritten and a reload is needed.
  if (reload === true) {
    pages = await loadPages(pagesDir);
  } else if (Array.isArray(reload)) {
    pages = reload;
  }

  console.log('[3/5] Building site context...');
  const siteContext = {
    config,
    site: config.site,
    siteTitle: config.site.title,
    siteUrl: config.site.url,
    siteBasePath: basePath,
    siteAuthor: config.site.author,
    pages: pages.filter(p => !p.special && p.frontmatter.published !== false),
  };
  ctx.siteContext = siteContext;
  await pipeline.runMerge('siteContext', siteContext, pages, ctx);

  console.log('[4/5] Rendering pages...');
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  const tplName = 'page.njk';
  for (const page of pages) {
    if (page.special) continue;
    if (page.frontmatter.published === false) {
      console.log(`     skip (unpublished): ${page.slug}`);
      continue;
    }

    await pipeline.runEach('transformPage', page, ctx);

    const pageContext = {
      page,
      frontmatter: page.frontmatter,
      slug: page.slug,
      isHome: page.isHome,
      pageTitle: page.frontmatter.title || config.site.title,
      title: pageFullTitle(page, config),
      body: page.body || '',
      url: pagePath(page, basePath),
    };
    await pipeline.runMerge('pageContext', pageContext, page, ctx);

    const fullContext = { ...ctx.siteContext, ...pageContext };
    let html = ctx.nunjucks.render(tplName, fullContext);
    html = await pipeline.runReduce('processHtml', html, page, ctx);

    const outPath = page.isHome
      ? path.join(outDir, 'index.html')
      : path.join(outDir, page.slug, 'index.html');
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, html);
    console.log(`     wrote ${path.relative(outDir, outPath)}`);
  }

  console.log('[5/5] Emitting extra files & copying assets...');
  const extras = await pipeline.runCollect('emit', pages, ctx);
  for (const f of extras) {
    const out = path.join(outDir, f.path);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, f.content);
    console.log(`     emit ${f.path}`);
  }
  await pipeline.runEach('copyAssets', ctx);
  await pipeline.runEach('buildComplete', ctx);

  console.log(`\nBuild complete -> ${path.relative(root, outDir)}/`);
}

function pageFullTitle(page, config) {
  const t = page.frontmatter.title || config.site.title;
  return page.isHome ? t : `${t} — ${config.site.title}`;
}

main().catch(e => { console.error(e); process.exit(1); });
