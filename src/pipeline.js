// Plugin pipeline: loads plugins, runs hooks in registration order.
//
// A plugin is a plain object with a `name` and zero or more hook methods.
// See PLUGINS.md for the list of hooks and their semantics.

export class Pipeline {
  constructor() {
    this.plugins = [];
  }

  use(plugin) {
    if (!plugin || !plugin.name) throw new Error('Plugin must have a name');
    this.plugins.push(plugin);
  }

  // Run a hook on every plugin that defines it, in order.
  // - "reduce" hooks pass an accumulator through each plugin and return the final value.
  // - "each" hooks call every plugin for side effects; returns nothing.
  // - "merge" hooks collect each plugin's returned object and merge into one.
  // - "collect" hooks collect arrays from each plugin and concatenate.

  async runEach(hook, ...args) {
    for (const p of this.plugins) {
      const fn = p[hook];
      if (typeof fn === 'function') await fn.call(p, ...args);
    }
  }

  async runReduce(hook, value, ...rest) {
    for (const p of this.plugins) {
      const fn = p[hook];
      if (typeof fn === 'function') {
        const out = await fn.call(p, value, ...rest);
        if (out !== undefined) value = out;
      }
    }
    return value;
  }

  // Merges each plugin's returned object into `target` in order.
  // Plugins can read the current state via `target` (or via ctx if it points there).
  async runMerge(hook, target, ...args) {
    for (const p of this.plugins) {
      const fn = p[hook];
      if (typeof fn === 'function') {
        const out = await fn.call(p, ...args);
        if (out && typeof out === 'object') Object.assign(target, out);
      }
    }
    return target;
  }

  async runCollect(hook, ...args) {
    const all = [];
    for (const p of this.plugins) {
      const fn = p[hook];
      if (typeof fn === 'function') {
        const out = await fn.call(p, ...args);
        if (Array.isArray(out)) all.push(...out);
      }
    }
    return all;
  }
}
