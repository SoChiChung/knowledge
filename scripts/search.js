/**
 * search.js — 搜索索引 + 聚合数据生成模块
 *
 * 遍历 public/data/pages/ 下所有页面 JSON，生成：
 *   1. search.json   — Fuse.js 兼容搜索索引  (title, slug, tags, text)
 *   2. recent.json   — 最近更新列表 (按 updatedAt 降序, top N)
 *   3. tags.json     — 标签出现次数统计 (按 count 降序)
 *
 * 输出: data/search.json, data/recent.json, data/tags.json
 */

import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';

export default async function search(config) {
  const pagesDir = path.join(config.dataDir, 'pages');

  if (!(await fs.pathExists(pagesDir))) {
    console.log('[search] No pages directory found, skipping');
    return;
  }

  // Load all page JSON files
  const pattern = path.join(pagesDir, '**', '*.json').replace(/\\/g, '/');
  const jsonFiles = await fg(pattern);
  const pages = [];

  for (const file of jsonFiles) {
    pages.push(await fs.readJson(file));
  }

  // --- search.json ---
  const searchIndex = pages.map(p => ({
    title: p.title,
    slug: p.slug,
    tags: p.tags || [],
    text: p.text || ''
  }));
  searchIndex.sort((a, b) => a.title.localeCompare(b.title));
  await fs.writeJson(path.join(config.dataDir, 'search.json'), searchIndex, { spaces: 2 });

  // --- recent.json ---
  const recent = pages
    .map(p => ({ title: p.title, slug: p.slug, updatedAt: p.updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, config.recentLimit || 10);
  await fs.writeJson(path.join(config.dataDir, 'recent.json'), recent, { spaces: 2 });

  // --- tags.json ---
  const tagMap = {};
  for (const p of pages) {
    if (!p.tags) continue;
    for (const t of p.tags) {
      tagMap[t] = (tagMap[t] || 0) + 1;
    }
  }
  const tags = Object.entries(tagMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  await fs.writeJson(path.join(config.dataDir, 'tags.json'), tags, { spaces: 2 });

  console.log(`[search] Generated search index (${searchIndex.length}), recent (${recent.length}), tags (${tags.length})`);
}
