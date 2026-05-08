import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chokidar from 'chokidar';
import { startServer } from './serve.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(root, 'config.json'), 'utf8'));
const outDir = path.resolve(root, config.build?.outDir || 'dist');
const port = Number(process.env.PORT) || 8080;
const host = process.env.HOST || '127.0.0.1';

let building = false;
let queuedReason = null;

function runBuildProcess(reason) {
  return new Promise(resolve => {
    console.log(`\n[watch] build started (${reason})`);
    const child = spawn('npm', ['run', 'build'], {
      cwd: root,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });

    child.on('close', code => {
      if (code === 0) {
        console.log('[watch] build complete');
        resolve(true);
      } else {
        console.error(`[watch] build failed with exit code ${code}`);
        resolve(false);
      }
    });

    child.on('error', err => {
      console.error('[watch] build failed to start:', err);
      resolve(false);
    });
  });
}

async function build(reason) {
  if (building) {
    queuedReason = reason;
    return false;
  }

  building = true;
  const ok = await runBuildProcess(reason);
  building = false;

  if (queuedReason) {
    const nextReason = queuedReason;
    queuedReason = null;
    void build(nextReason);
  }

  return ok;
}

await build('initial');
startServer({ port, host, rootDir: outDir });

const watchPaths = [
  'config.json',
  'package.json',
  'pages',
  'plugins',
  'src',
  'styles',
  'templates',
  'themes',
];

const watcher = chokidar.watch(watchPaths, {
  cwd: root,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 150,
    pollInterval: 50,
  },
  ignored: [
    /(^|[/\\])\../,
    /(^|[/\\])dist([/\\]|$)/,
    /(^|[/\\])node_modules([/\\]|$)/,
  ],
});

watcher.on('all', (event, changedPath) => {
  console.log(`[watch] ${event}: ${changedPath}`);
  void build(`${event} ${changedPath}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await watcher.close();
    process.exit(0);
  });
}
