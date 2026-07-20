/**
 * dev.js — 开发模式入口
 *
 * 启动后自动:
 *   1. 执行一次完整 Build
 *   2. 启动 BrowserSync 本地服务器 (localhost:3000)
 *   3. 打开浏览器
 *   4. 监听文件变化自动重新 Build + 刷新
 *
 * 监听规则:
 *   knowledge/**  → .md/.png/.jpg/.webp/.svg 变化 → rebuild + reload
 *   demo/**       → .html/.css/.js 变化 → 直接 reload (无需 rebuild)
 *   scripts/**    → .js 变化 → rebuild + reload
 *
 * 去抖: 300ms 内多次变化只触发一次 Build
 * 队列: Build 执行期间的新变化排队等待，Build 完成后立即再执行一次
 *
 * Usage: npm run dev
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { watch } from 'chokidar';
import bs from 'browser-sync';
import config from './config.js';
import build, { buildConfig } from './build.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// --- State ---
let building = false;
let pending = false;
let bsInstance = null;
let debounceTimer = null;

// --- Helpers ---

function timestamp() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false });
}

function banner() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Knowledge Base — Dev Mode');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

function watching() {
  console.log('');
  console.log('  Watching:');
  console.log('    knowledge/    *.md  *.png  *.jpg  *.webp  *.svg');
  console.log('    demo/         *.html  *.css  *.js');
  console.log('    scripts/      *.js');
  console.log('');
  console.log(`  BrowserSync:    http://localhost:${config.dev.port}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

function logBuildStart(trigger) {
  const file = path.relative(rootDir, trigger).replace(/\\/g, '/');
  console.log(`[${timestamp()}]  ${file}`);
  console.log('  → Rebuilding...');
}

function logBuildDone(elapsedMs) {
  const s = (elapsedMs / 1000).toFixed(2);
  console.log(`  ✓ Build completed in ${s}s`);
  console.log('  → Browser reloaded');
  console.log('');
}

// --- Debounced rebuild trigger ---

function triggerRebuild(filePath) {
  // Clear existing debounce
  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    executeRebuild(filePath);
  }, config.dev.debounceMs);
}

function executeRebuild(filePath) {
  if (building) {
    pending = true;
    return;
  }

  building = true;
  pending = false;
  logBuildStart(filePath);

  build({ silent: true, clean: false })
    .then((elapsed) => {
      logBuildDone(elapsed);
      if (bsInstance) bsInstance.reload();
      building = false;
      // Drain pending
      if (pending) {
        pending = false;
        executeRebuild('(queued change)');
      }
    })
    .catch((err) => {
      console.error('Build failed:', err.message);
      building = false;
      pending = false;
    });
}

// --- Initialise relay (demo changes = just reload) ---

function triggerReload(filePath) {
  const file = path.relative(rootDir, filePath).replace(/\\/g, '/');
  console.log(`[${timestamp()}]  ${file}`);
  console.log('  → Reloading browser (no rebuild needed)');
  console.log('');
  if (bsInstance) {
    // Inject CSS changes without full reload
    if (filePath.endsWith('.css')) {
      bsInstance.reload('*.css');
    } else {
      bsInstance.reload();
    }
  }
}

// --- Start ---

async function startDev() {
  banner();

  // Initial build
  console.log('  Building...');
  const elapsed = await build({ silent: true, clean: true });
  console.log(`  ✓ Initial build complete (${(elapsed / 1000).toFixed(2)}s)`);
  console.log('');

  // Start BrowserSync
  bsInstance = bs.create();

  await new Promise((resolve) => {
    bsInstance.init(
      {
        server: buildConfig.outputDir,
        port: config.dev.port,
        open: config.dev.browser ? 'local' : false,
        notify: false,
        logLevel: 'silent',
        ghostMode: false
      },
      resolve
    );
  });

  console.log(`  ✓ BrowserSync started`);
  watching();

  // Shared chokidar options for cross-platform reliability.
  // usePolling is required on Windows (Git Bash / WSL) to detect filesystem events.
  // Debounce is handled by dev.js itself, so no awaitWriteFinish needed here.
  const watchOpts = {
    ignored: /(^|[\\/])\./,
    ignoreInitial: true,
    usePolling: true,
    interval: 300,
    depth: 99
  };

  // Watch knowledge/ — Markdown and image changes → rebuild.
  // Must watch the directory itself (not a glob) so polling detects new subdirectories.
  const knowledgePattern = /\.(md|png|jpe?g|gif|webp|svg)$/i;
  const isKnowledgeFile = (p) => knowledgePattern.test(p);

  const knowledgeWatcher = watch(buildConfig.knowledgeDir, watchOpts);
  knowledgeWatcher.on('change', (p) => { if (isKnowledgeFile(p)) triggerRebuild(p); });
  knowledgeWatcher.on('add', (p) => { if (isKnowledgeFile(p)) triggerRebuild(p); });
  knowledgeWatcher.on('unlink', (p) => { if (isKnowledgeFile(p)) triggerRebuild(p); });

  // Watch demo/ — HTML/CSS/JS changes → direct reload.
  const demoPattern = /\.(html|css|js)$/i;
  const isDemoFile = (p) => demoPattern.test(p);

  const demoWatcher = watch(buildConfig.demoDir, watchOpts);
  demoWatcher.on('change', (p) => { if (isDemoFile(p)) triggerReload(p); });
  demoWatcher.on('add', (p) => { if (isDemoFile(p)) triggerReload(p); });

  // Watch scripts/ — JS changes → rebuild.
  const scriptsDir = path.join(rootDir, 'scripts');
  const scriptsPattern = /\.js$/i;
  const isScriptFile = (p) => scriptsPattern.test(p);

  const scriptsWatcher = watch(scriptsDir, watchOpts);
  scriptsWatcher.on('change', (p) => { if (isScriptFile(p)) triggerRebuild(p); });
  scriptsWatcher.on('add', (p) => { if (isScriptFile(p)) triggerRebuild(p); });

  // Cleanup on exit
  const cleanup = () => {
    knowledgeWatcher.close();
    demoWatcher.close();
    scriptsWatcher.close();
    if (bsInstance) bsInstance.exit();
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

startDev().catch((err) => {
  console.error('Dev server failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
