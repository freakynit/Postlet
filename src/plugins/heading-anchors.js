// Default plugin: give every heading a slug-based id and wrap its content in
// an anchor link, so in-page TOCs work and headings are deep-linkable.

function slugify(text) {
  return String(text)
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp|mdash|ndash|hellip|rsquo|lsquo|rdquo|ldquo);/g, ' ')
    .replace(/&[#a-z0-9]+;/gi, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export default {
  name: 'heading-anchors',

  processHtml(html) {
    const seen = new Map();
    return html.replace(/<(h[1-6])>([\s\S]*?)<\/\1>/g, (_, tag, inner) => {
      const plain = inner.replace(/<[^>]+>/g, '');
      let id = slugify(plain);
      if (!id) return `<${tag}>${inner}</${tag}>`;
      const n = seen.get(id) || 0;
      seen.set(id, n + 1);
      if (n > 0) id = `${id}-${n}`;
      const wrapped = /<a\s/i.test(inner)
        ? inner
        : `<a class="anchor" href="#${id}">${inner}</a>`;
      return `<${tag} id="${id}">${wrapped}</${tag}>`;
    });
  },
};

export { slugify };
