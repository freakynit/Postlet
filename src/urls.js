export function resolveBasePath(site = {}) {
  const explicit = site.basePath;
  if (explicit !== undefined && explicit !== null && explicit !== '') {
    return normalizeBasePath(explicit);
  }

  try {
    return normalizeBasePath(new URL(site.url || '').pathname);
  } catch {
    return '';
  }
}

export function normalizeBasePath(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === '/') return '';
  return `/${raw.replace(/^\/+|\/+$/g, '')}`;
}

export function withBasePath(value, basePath = '') {
  const raw = String(value || '');
  if (!raw) return basePath || '/';
  if (isExternalOrFragment(raw)) return raw;

  const path = `/${raw.replace(/^\/+/, '')}`;
  const base = normalizeBasePath(basePath);
  if (!base) return path;
  if (path === base || path.startsWith(`${base}/`)) return path;
  return path === '/' ? `${base}/` : `${base}${path}`;
}

export function pagePath(page, basePath = '') {
  return withBasePath(page.isHome ? '/' : `/${page.slug}/`, basePath);
}

export function absoluteUrl(siteUrl, value) {
  const raw = String(value || '');
  if (!raw) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) return raw;

  try {
    const parsed = new URL(siteUrl || '');
    return new URL(raw, parsed.origin).toString();
  } catch {
    return raw;
  }
}

export function isExternalOrFragment(value) {
  return /^(https?:|mailto:|tel:|data:|\/\/|#)/i.test(String(value || ''));
}
