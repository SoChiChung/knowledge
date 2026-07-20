/**
 * scan.js — 目录扫描模块
 *
 * 递归扫描 knowledge/ 目录，构造 Folder/Page 无限层级树。
 *
 * 支持两种目录结构：
 *   New: Prompt/index.md + assets/  → slug = ai/llm/prompt
 *   Old: Prompt.md                  → slug = ai/prompt  (向后兼容)
 *
 * 输出: data/tree.json, data/categories.json
 */

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';

/**
 * 递归扫描目录，返回节点数组
 * @param {string} dirPath - 当前扫描的绝对路径
 * @param {string} basePath - knowledge 根目录绝对路径
 * @returns {Promise<Array>} 节点数组
 */
async function scanDirectory(dirPath, basePath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const children = [];

  // 排序：目录优先，同类型按名称字母序
  const sorted = entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  for (const entry of sorted) {
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      // Skip assets directory (article-local images)
      if (entry.name === 'assets') continue;

      // Check if it's an article directory (contains index.md)
      const indexMd = path.join(fullPath, 'index.md');
      if (await fs.pathExists(indexMd)) {
        // New mode: directory with index.md = a page
        const content = await fs.readFile(indexMd, 'utf-8');
        const { data } = matter(content);
        children.push({
          type: 'page',
          title: data.title || entry.name,
          slug: relativePath.toLowerCase()
        });
      } else {
        // Pure category folder: recurse
        const subChildren = await scanDirectory(fullPath, basePath);
        children.push({
          type: 'folder',
          name: entry.name,
          slug: relativePath.toLowerCase(),
          children: subChildren
        });
      }
    } else if (entry.name.endsWith('.md') && entry.name !== 'index.md') {
      // Old mode: .md file directly in category dir (backward compat)
      const slug = relativePath.replace(/\.md$/, '');
      const content = await fs.readFile(fullPath, 'utf-8');
      const { data } = matter(content);
      children.push({
        type: 'page',
        title: data.title || entry.name.replace(/\.md$/, ''),
        slug: slug.toLowerCase()
      });
    }
    // Skip non-md files (images handled by images.js)
  }

  return children;
}

/**
 * Recursively count pages under a node
 */
function countPages(nodes) {
  let count = 0;
  for (const node of nodes) {
    if (node.type === 'page') {
      count++;
    } else if (node.type === 'folder') {
      count += countPages(node.children);
    }
  }
  return count;
}

/**
 * Build categories.json structure from tree
 */
function buildCategories(nodes) {
  return nodes
    .filter(n => n.type === 'folder')
    .map(n => ({
      name: n.name,
      slug: n.slug,
      count: countPages(n.children),
      children: buildCategories(n.children)
    }));
}

/**
 * Total node count for logging
 */
function countNodes(nodes) {
  let c = 0;
  for (const n of nodes) {
    c++;
    if (n.type === 'folder' && n.children) c += countNodes(n.children);
  }
  return c;
}

/**
 * Main: scan knowledge dir, generate tree.json and categories.json
 */
export default async function scan(config) {
  const tree = await scanDirectory(config.knowledgeDir, config.knowledgeDir);

  await fs.ensureDir(config.dataDir);

  // Write tree.json
  await fs.writeJson(path.join(config.dataDir, 'tree.json'), tree, { spaces: 2 });

  // Write categories.json
  const categories = buildCategories(tree);
  await fs.writeJson(path.join(config.dataDir, 'categories.json'), categories, { spaces: 2 });

  console.log(`[scan] Generated tree.json (${countNodes(tree)} nodes) + categories.json (${categories.length} categories)`);
  return tree;
}
