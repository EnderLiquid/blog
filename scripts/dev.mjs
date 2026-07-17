import { execFile, spawn } from 'node:child_process';
import { watch } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();
const nuxtBin = fileURLToPath(new URL('../node_modules/nuxt/bin/nuxt.mjs', import.meta.url));
const manifestScript = fileURLToPath(new URL('./build-site-manifest.mjs', import.meta.url));
const watchTargets = [
  { path: path.join(projectRoot, 'content', 'posts'), recursive: true },
  { path: path.join(projectRoot, 'shared', 'i18n', 'locales.ts'), recursive: false },
  { path: path.join(projectRoot, 'shared', 'routing'), recursive: true },
  { path: path.join(projectRoot, 'shared', 'content'), recursive: true },
  { path: path.join(projectRoot, 'shared', 'site', 'config.ts'), recursive: false },
  { path: path.join(projectRoot, 'shared', 'site-definitions'), recursive: true },
  { path: path.join(projectRoot, 'shared', 'site-manifest'), recursive: true },
  { path: path.join(projectRoot, 'shared', 'site-projections'), recursive: true },
];

await rebuildManifest('启动');

const child = spawn(process.execPath, [nuxtBin, 'dev', ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: 'inherit',
});
const watchers = watchTargets.map((target) =>
  watch(target.path, { recursive: target.recursive }, () => scheduleManifestRebuild()),
);
let rebuildTimer;
let rebuildQueue = Promise.resolve();

function scheduleManifestRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildQueue = rebuildQueue
      .then(() => rebuildManifest('文件变化'))
      .catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
      });
  }, 100);
}

async function rebuildManifest(reason) {
  // 每次使用独立Node进程，避免ESM模块缓存让构建来源变化后仍读取旧值。
  const { stdout, stderr } = await execFileAsync(process.execPath, [manifestScript], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  if (stderr) {
    process.stderr.write(stderr);
  }

  console.log(`[site-manifest] ${reason}`);
  process.stdout.write(stdout);
}

function closeWatchers() {
  clearTimeout(rebuildTimer);
  for (const watcher of watchers) {
    watcher.close();
  }
}

child.on('exit', (code, signal) => {
  closeWatchers();
  process.exitCode = signal ? 1 : (code ?? 0);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    closeWatchers();
    child.kill(signal);
  });
}
