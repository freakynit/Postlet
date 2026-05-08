// Default plugin: compute "related posts" through one configured strategy.
//
// Built-in strategies:
// - embeddings: OpenAI-compatible embeddings + cosine similarity.
// - keywords: local keyword/token scoring, no network or API key.
//
// User plugins can contribute additional strategies with `relatedPostStrategies`.

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';

const DEFAULT_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'for', 'from',
  'has', 'have', 'if', 'in', 'into', 'is', 'it', 'its', 'of', 'on', 'or', 'our',
  'that', 'the', 'their', 'then', 'there', 'these', 'this', 'to', 'was', 'we',
  'were', 'what', 'when', 'where', 'which', 'with', 'you', 'your',
]);

export default {
  name: 'embeddings',

  async pagesLoaded(pages, ctx) {
    const cfg = normalizeRelatedConfig(ctx.config);
    if (!cfg.enabled) {
      console.log('     related-posts: disabled, skipping.');
      return;
    }

    const eligible = pages.filter(p => !p.special && p.frontmatter.published !== false);
    if (eligible.length < 2) {
      console.log('     related-posts: not enough pages.');
      return;
    }

    const strategies = await collectStrategies(eligible, cfg, ctx);
    const strategy = strategies.get(cfg.strategy);
    if (!strategy) {
      throw new Error(`Unknown relatedPosts.strategy "${cfg.strategy}". Available strategies: ${[...strategies.keys()].join(', ')}`);
    }

    console.log(`     related-posts: using ${cfg.strategy} strategy.`);
    const strategyCfg = {
      ...cfg,
      ...(cfg.strategies?.[cfg.strategy] || {}),
    };
    const updates = await strategy.scorePages(eligible, strategyCfg, ctx);

    if (cfg.writeBackToFrontmatter) {
      for (const u of updates) {
        const p = pages.find(x => x.slug === u.slug);
        if (!p) continue;
        const raw = await fs.readFile(p.filePath, 'utf8');
        const parsed = matter(raw);
        parsed.data.related = u.related;
        await fs.writeFile(p.filePath, matter.stringify(parsed.content, parsed.data));
      }
      // Tell the pipeline to reload pages so rewritten `related` frontmatter is
      // visible to downstream plugins.
      return true;
    }

    for (const u of updates) {
      const p = pages.find(x => x.slug === u.slug);
      if (p) p.frontmatter.related = u.related;
    }
  },

  relatedPostStrategies() {
    return [embeddingStrategy, keywordStrategy];
  },
};

const embeddingStrategy = {
  name: 'embeddings',
  async scorePages(pages, cfg, ctx) {
    const apiKey = cfg.apiKey || process.env[cfg.apiKeyEnv || 'OPENAI_API_KEY'] || '';
    if (!apiKey) {
      throw new Error('relatedPosts.strategy is "embeddings" but no API key was provided. Set relatedPosts.strategy to "keywords" for offline scoring, or set relatedPosts.strategies.embeddings.apiKey/apiKeyEnv.');
    }
    if (!cfg.baseUrl || !cfg.model) {
      throw new Error('relatedPosts.strategy is "embeddings" but baseUrl/model is missing under relatedPosts.strategies.embeddings.');
    }
    return embedAndScore(pages, cfg, apiKey, ctx.root);
  },
};

const keywordStrategy = {
  name: 'keywords',
  scorePages(pages, cfg) {
    return keywordScore(pages, cfg);
  },
};

function normalizeRelatedConfig(config) {
  const related = config.relatedPosts;
  const legacy = config.embeddings;

  if (related && legacy?.enabled) {
    throw new Error('Configure only one related-post system: use `relatedPosts`, or the legacy `embeddings`, not both.');
  }

  if (related) {
    const strategy = related.strategy ?? 'keywords';
    if (Array.isArray(strategy)) {
      throw new Error('relatedPosts.strategy must be a single string, not an array. Choose exactly one strategy.');
    }
    if (typeof strategy !== 'string') {
      throw new Error('relatedPosts.strategy must be a single string. Choose exactly one strategy.');
    }
    return {
      enabled: related.enabled !== false,
      strategy,
      topK: related.topK ?? 3,
      minScore: related.minScore ?? (strategy === 'keywords' ? 0.05 : 0),
      writeBackToFrontmatter: related.writeBackToFrontmatter ?? false,
      strategies: related.strategies || {},
    };
  }

  // Backward compatibility for existing sites.
  if (legacy) {
    const hasLegacyApiKey = Boolean(legacy.apiKey || process.env[legacy.apiKeyEnv || 'OPENAI_API_KEY']);
    const strategy = hasLegacyApiKey ? 'embeddings' : 'keywords';
    return {
      ...legacy,
      enabled: legacy.enabled !== false,
      strategy,
      topK: legacy.topK ?? 3,
      minScore: legacy.minScore ?? (strategy === 'keywords' ? 0.05 : 0),
      writeBackToFrontmatter: legacy.writeBackToFrontmatter ?? false,
      strategies: {
        embeddings: legacy,
        keywords: {
          minTokenLength: 3,
          maxContentChars: 12000,
        },
      },
    };
  }

  return { enabled: false, strategy: 'keywords', topK: 3, minScore: 0, writeBackToFrontmatter: false, strategies: {} };
}

async function collectStrategies(pages, cfg, ctx) {
  const provided = await ctx.pipeline.runCollect('relatedPostStrategies', pages, cfg, ctx);
  const strategies = new Map();
  for (const strategy of provided) {
    if (!strategy?.name || typeof strategy.scorePages !== 'function') {
      throw new Error('relatedPostStrategies must return objects with `name` and `scorePages(pages, cfg, ctx)`.');
    }
    if (strategies.has(strategy.name)) {
      throw new Error(`Duplicate related post strategy "${strategy.name}". Strategy names must be unique.`);
    }
    strategies.set(strategy.name, strategy);
  }
  return strategies;
}

async function embedAndScore(pages, cfg, apiKey, root) {
  const cachePath = path.join(root, cfg.cacheFile || '.embeddings-cache.json');
  let cache = {};
  try { cache = JSON.parse(await fs.readFile(cachePath, 'utf8')); } catch {}

  const vectors = {};
  for (const p of pages) {
    const text = textForEmbedding(p);
    const hash = crypto.createHash('sha256').update(`${cfg.model}|${text}`).digest('hex');
    if (cache[p.slug]?.hash === hash) {
      vectors[p.slug] = cache[p.slug].vector;
      continue;
    }
    console.log(`     embedding: ${p.slug}`);
    const vector = await embed(text, cfg, apiKey);
    vectors[p.slug] = vector;
    cache[p.slug] = { hash, vector };
  }
  await fs.writeFile(cachePath, JSON.stringify(cache));

  return scoreFromVectors(pages, vectors, cfg);
}

function scoreFromVectors(pages, vectors, cfg) {
  return pages.map(p => {
    const scores = pages
      .filter(q => q.slug !== p.slug)
      .map(q => ({
        slug: q.slug,
        title: q.frontmatter.title || q.slug,
        score: cosine(vectors[p.slug], vectors[q.slug]),
      }))
      .sort(byScoreDescThenTitle);

    return { slug: p.slug, related: topRelated(scores, cfg) };
  });
}

function textForEmbedding(p) {
  const fm = p.frontmatter;
  return [
    fm.title || p.slug,
    fm.description || '',
    Array.isArray(fm.tags) ? fm.tags.join(' ') : '',
    Array.isArray(fm.keywords) ? fm.keywords.join(' ') : '',
    p.content,
  ].filter(Boolean).join('\n').slice(0, 8000);
}

async function embed(input, cfg, apiKey) {
  const url = `${cfg.baseUrl.replace(/\/$/, '')}/embeddings`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: cfg.model, input }),
  });
  if (!res.ok) throw new Error(`Embedding API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data[0].embedding;
}

function keywordScore(pages, cfg) {
  const docs = pages.map(p => ({ page: p, terms: weightedTerms(p, cfg) }));
  const idf = inverseDocumentFrequency(docs);
  const vectors = Object.fromEntries(docs.map(doc => [doc.page.slug, tfIdf(doc.terms, idf)]));
  return scoreFromVectors(pages, vectors, cfg);
}

function weightedTerms(page, cfg) {
  const fm = page.frontmatter;
  const weights = {
    title: 4,
    description: 2,
    tags: 5,
    keywords: 5,
    content: 1,
    ...(cfg.fieldWeights || {}),
  };
  const chunks = [
    [fm.title || page.slug, weights.title],
    [fm.description || '', weights.description],
    [Array.isArray(fm.tags) ? fm.tags.join(' ') : '', weights.tags],
    [Array.isArray(fm.keywords) ? fm.keywords.join(' ') : '', weights.keywords],
    [String(page.content || '').slice(0, cfg.maxContentChars ?? 12000), weights.content],
  ];

  const terms = new Map();
  for (const [text, weight] of chunks) {
    if (!text || weight <= 0) continue;
    for (const token of tokenize(text, cfg)) {
      terms.set(token, (terms.get(token) || 0) + weight);
    }
  }
  return terms;
}

function tokenize(text, cfg) {
  const minLength = cfg.minTokenLength ?? 3;
  const stopWords = new Set([...DEFAULT_STOP_WORDS, ...(cfg.stopWords || [])]);
  const matches = String(text).toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) || [];
  return matches.filter(t => t.length >= minLength && !stopWords.has(t));
}

function inverseDocumentFrequency(docs) {
  const df = new Map();
  for (const doc of docs) {
    for (const term of doc.terms.keys()) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }

  const total = docs.length;
  return Object.fromEntries([...df].map(([term, count]) => [
    term,
    Math.log((1 + total) / (1 + count)) + 1,
  ]));
}

function tfIdf(terms, idf) {
  const vector = {};
  for (const [term, count] of terms) {
    vector[term] = (1 + Math.log(count)) * idf[term];
  }
  return vector;
}

function cosine(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) return arrayCosine(a, b);
  return objectCosine(a || {}, b || {});
}

function arrayCosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) dot += a[i] * b[i];
  for (const x of a) na += x * x;
  for (const x of b) nb += x * x;
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

function objectCosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const [term, av] of Object.entries(a)) {
    na += av * av;
    if (b[term]) dot += av * b[term];
  }
  for (const bv of Object.values(b)) nb += bv * bv;
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

function topRelated(scores, cfg) {
  return scores
    .filter(s => s.score >= (cfg.minScore ?? 0))
    .slice(0, cfg.topK ?? 3)
    .map(s => ({ slug: s.slug, title: s.title, score: Number(s.score.toFixed(4)) }));
}

function byScoreDescThenTitle(a, b) {
  return b.score - a.score || a.title.localeCompare(b.title) || a.slug.localeCompare(b.slug);
}
