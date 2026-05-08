// Inject custom analytics / tracking HTML just before </body> on every page.
//
// Reads the snippet from config.json:
//
//   "analytics": {
//     "bodyEndHtml": "<script>/* ... */</script>"
//   }
//
// If the key is missing or empty, the plugin is a no-op.

export default {
  name: 'analytics',

  processHtml(html, _page, ctx) {
    const snippet = ctx?.config?.pluginConfigs?.analytics?.bodyEndHtml;
    if (!snippet || typeof snippet !== 'string') return html;

    const idx = html.lastIndexOf('</body>');
    if (idx === -1) return html + snippet;
    return html.slice(0, idx) + snippet + html.slice(idx);
  },
};
