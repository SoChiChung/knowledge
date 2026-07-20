/**
 * images.js — 图片处理模块
 *
 * Pipeline:
 *   1. 扫描 knowledge/ 下所有图片 (*.png *.jpg *.jpeg *.gif *.webp *.svg)
 *   2. 计算文件 Hash（MD5，取前 64KB）
 *   3. 检查 .cache/images/manifest.json 缓存
 *   4. 非 SVG：Sharp 转换 WebP + 限制最大宽度 + 压缩
 *   5. SVG：原样复制（保持矢量）
 *   6. 写入 public/assets/
 *   7. 生成 data/image-manifest.json（供 markdown.js 和前端使用）
 *   8. 更新 .cache/images/manifest.json
 *
 * 输出: public/assets/** *, data/image-manifest.json, .cache/images/manifest.json
 */

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import fg from 'fast-glob';
import sharp from 'sharp';

// Supported image extensions
const IMG_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);

function isImageFile(p) {
  const ext = path.extname(p).toLowerCase().slice(1);
  return IMG_EXTS.has(ext);
}

/**
 * Compute a fast hash from file start + size
 */
function hashFile(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(64 * 1024);
  const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);
  const stat = fs.statSync(filePath);
  const hash = crypto.createHash('md5');
  hash.update(buf.slice(0, bytesRead));
  hash.update(String(stat.size));
  return hash.digest('hex').slice(0, 12);
}

/**
 * Convert image to WebP using sharp
 */
async function convertToWebp(inputPath, outputPath, config) {
  await fs.ensureDir(path.dirname(outputPath));

  const pipeline = sharp(inputPath)
    .resize({ width: config.imageMaxWidth, withoutEnlargement: true })
    .webp({ quality: config.imageQuality });

  await pipeline.toFile(outputPath);

  // Get output info
  const meta = await sharp(outputPath).metadata();
  const stat = await fs.stat(outputPath);
  return { width: meta.width, size: stat.size };
}

export default async function images(config) {
  await fs.ensureDir(config.assetsDir);

  // Find all image files
  const pattern = path.join(config.knowledgeDir, '**', '*').replace(/\\/g, '/');
  const allFiles = await fg(pattern, { dot: false, onlyFiles: true });
  const imgFiles = allFiles.filter(isImageFile);

  if (imgFiles.length === 0) {
    console.log('[images] No images found, skipping');
    // Still write an empty manifest
    await fs.writeJson(path.join(config.dataDir, 'image-manifest.json'), {}, { spaces: 2 });
    return [];
  }

  // Load cache
  const cacheDir = path.resolve('.cache/images');
  const cacheManifestPath = path.join(cacheDir, 'manifest.json');
  await fs.ensureDir(cacheDir);
  const cache = await fs.pathExists(cacheManifestPath)
    ? await fs.readJson(cacheManifestPath)
    : {};

  const manifest = {}; // output: data/image-manifest.json
  const newCache = {}; // new: .cache/images/manifest.json
  let processed = 0;
  let skipped = 0;

  for (const file of imgFiles) {
    const relPath = path.relative(config.knowledgeDir, file).replace(/\\/g, '/');
    const relPathLower = relPath.toLowerCase();
    const ext = path.extname(file).toLowerCase().slice(1);
    const fileHash = hashFile(file);

    // Check cache (key by lowercase path for consistency)
    const cached = cache[relPathLower];
    if (cached && cached.hash === fileHash) {
      // Reuse cached entry
      manifest[relPathLower] = {
        original: relPath,
        webp: cached.webp,
        width: cached.width || 0,
        hash: fileHash,
        size: cached.size || 0
      };
      newCache[relPathLower] = { ...cached, hash: fileHash };
      skipped++;
      continue;
    }

    // Process
    let webpRelPath, width, size;

    // Use lowercase path for output dir structure
    const slugDir = path.dirname(relPathLower);

    if (ext === 'svg') {
      // SVG: copy as-is (to lowercase path)
      const dest = path.join(config.assetsDir, relPathLower);
      await fs.ensureDir(path.dirname(dest));
      await fs.copy(file, dest);
      webpRelPath = path.relative(config.outputDir, dest).replace(/\\/g, '/');
      const meta = await sharp(file).metadata();
      width = meta.width || 0;
      size = (await fs.stat(dest)).size;
    } else {
      // Convert to WebP
      const baseName = path.basename(file, path.extname(file)).toLowerCase();
      const webpName = baseName + '.webp';
      const dest = path.join(config.assetsDir, slugDir, webpName);
      const result = await convertToWebp(file, dest, config);
      width = result.width;
      size = result.size;
      webpRelPath = path.relative(config.outputDir, dest).replace(/\\/g, '/');
    }

    manifest[relPathLower] = {
      original: relPath,
      webp: webpRelPath,
      width: width,
      hash: fileHash,
      size: size
    };

    newCache[relPathLower] = {
      hash: fileHash,
      webp: webpRelPath,
      width: width,
      size: size,
      updatedAt: new Date().toISOString().slice(0, 10)
    };

    processed++;
  }

  // Clean stale cache entries (images that no longer exist)
  for (const key of Object.keys(cache)) {
    if (!newCache[key]) {
      // Optionally delete stale output files — skip for first version
    }
  }

  // Write outputs
  await fs.writeJson(path.join(config.dataDir, 'image-manifest.json'), manifest, { spaces: 2 });
  await fs.writeJson(cacheManifestPath, newCache, { spaces: 2 });

  console.log(`[images] Processed ${processed} images, skipped ${skipped} (cached)`);
  return manifest;
}
