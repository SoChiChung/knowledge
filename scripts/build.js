/**
 * build.js — 构建编排器
 *
 * Build pipeline:
 *   1. scan.js     — 目录扫描 → tree.json + categories.json
 *   2. site meta   — 读取 config.js → data/site.json
 *   3. images.js   — 图片处理 → assets/ + image-manifest.json
 *   4. markdown.js — Markdown 解析 → pages/*.json (with TOC)
 *   5. search.js   — 聚合数据 → search.json + recent.json + tags.json
 *
 * Finally copies frontend files (index.html, style.css, app.js) from demo/ to public/.
 *
 * Usage:
 *   CLI:   npm run build
 *   Import: import build from './build.js'; await build(silent);
 *
 * @param {boolean} [silent=false] — suppress timeline logs (dev mode)
 * @returns {Promise<number>} elapsed ms
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

import scan from './scan.js';
import images from './images.js';
import markdown from './markdown.js';
import search from './search.js';
import config from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function normalizeBase(base) {
  if (!base || base === '/') return '';
  return '/' + String(base).replace(/^\/+|\/+$/g, '');
}

function withBase(base, assetPath) {
  const normalizedBase = normalizeBase(base);
  const cleanPath = String(assetPath).replace(/^\/+/, '');
  return normalizedBase ? normalizedBase + '/' + cleanPath : cleanPath;
}

// Resolve paths from config
export const buildConfig = {
  rootDir,
  demoDir: path.join(rootDir, 'demo'),
  knowledgeDir: path.resolve(rootDir, config.knowledgeDir),
  outputDir: path.resolve(rootDir, config.outputDir),
  dataDir: path.resolve(rootDir, config.dataDir),
  assetsDir: path.resolve(rootDir, config.assetsDir),
  imageQuality: config.imageQuality,
  imageMaxWidth: config.imageMaxWidth,
  recentLimit: config.recentLimit
};

/**
 * Execute full build pipeline. Can be called from CLI or imported as module.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.silent=false]  — suppress per-step logs
 * @param {boolean} [opts.clean=true]    — empty output dir before build
 * @returns {Promise<number>} elapsed time in ms
 */
export default async function build(opts = {}) {
  const silent = opts.silent === true;
  const clean = opts.clean !== false;
  const startTime = Date.now();

  if (!silent) {
    console.log('=== Knowledge Base Generator ===');
    console.log('');
  }

  // Clean output dir
  if (clean) {
    await fs.emptyDir(buildConfig.outputDir);
  }
  await fs.ensureDir(buildConfig.dataDir);
  await fs.ensureDir(buildConfig.assetsDir);

  // Step 1
  if (!silent) console.log('[1/5] Scanning directory tree...');
  await scan(buildConfig);

  // Step 2
  if (!silent) console.log('[2/5] Writing site config...');
  const siteJson = {
    name: config.siteName,
    description: config.siteDescription,
    github: config.github,
    base: normalizeBase(config.base),
    hero: config.hero
  };
  await fs.writeJson(path.join(buildConfig.dataDir, 'site.json'), siteJson, { spaces: 2 });
  if (!silent) console.log('[build] Generated site.json');

  // Step 3
  if (!silent) console.log('[3/5] Processing images...');
  await images(buildConfig);

  // Step 4
  if (!silent) console.log('[4/5] Parsing Markdown files...');
  await markdown(buildConfig);

  // Step 5
  if (!silent) console.log('[5/5] Generating search index and aggregates...');
  await search(buildConfig);

  // Copy frontend files
  const { demoDir: d } = buildConfig;
  const frontendFiles = ['index.html', 'style.css', 'app.js'];
  for (const filename of frontendFiles) {
    const src = path.join(d, filename);
    if (await fs.pathExists(src)) {
      const dest = path.join(buildConfig.outputDir, filename);
      await fs.copy(src, dest);
      if (filename === 'index.html') {
        let html = await fs.readFile(dest, 'utf8');
        const base = normalizeBase(config.base);
        html = html
          .replace('href="style.css"', `href="${withBase(base, 'style.css')}"`)
          .replace('src="app.js"', `src="${withBase(base, 'app.js')}"`)
          .replace(
            '</head>',
            `  <script>window.__KB_BASE__ = ${JSON.stringify(base)};</script>\n</head>`
          );
        await fs.writeFile(dest, html, 'utf8');
      }
      if (filename === 'app.js') {
        let app = await fs.readFile(dest, 'utf8');
        // The demo embeds sample data; the generated site reads build JSON.
        app = app.replace('var provider = StaticDataProvider;', 'var provider = JsonDataProvider;');
        // Encode each slug segment so non-ASCII folders work as static URLs.
        app = app.replace(
          "fetch('data/pages/' + s + '.json')",
          "fetch('data/pages/' + s.split('/').map(encodeURIComponent).join('/') + '.json')"
        );
        await fs.writeFile(dest, app, 'utf8');
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  if (!silent) {
    console.log('');
    console.log('[build] Copied frontend files (index.html, style.css, app.js) to public/');
    console.log('');
    console.log(`=== Build complete in ${elapsed}s ===`);
    console.log(`Output: ${buildConfig.outputDir}`);
  }

  return Math.round(Date.now() - startTime);
}

// CLI entry
const isMain = process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMain) {
  build().catch((err) => {
    console.error('');
    console.error('Build failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}
