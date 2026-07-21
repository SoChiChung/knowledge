/**
 * markdown.js — Markdown 解析模块
 *
 * 逐个解析 knowledge/ 下所有 .md 文件：
 *   1. gray-matter 解析 FrontMatter
 *   2. 读取 image-manifest.json 获取图片映射
 *   3. markdown-it + markdown-it-anchor 渲染正文为 HTML（带 anchor id）
 *   4. 根据 manifest 替换图片路径为 .webp
 *   5. 从渲染后的 HTML 中提取 TOC（h1～h6）
 *   6. 剥离 HTML 标签生成纯文本（供搜索用）
 *   7. 写入 public/data/pages/{slug}.json
 *
 * 输出: public/data/pages/** /*.json
 */

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import fg from 'fast-glob';

/**
 * Generate a clean anchor ID from heading text
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w一-鿿\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Init markdown-it with anchor plugin
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true
}).use(markdownItAnchor, {
  level: [1, 2, 3, 4, 5, 6],
  slugify: slugify,
  permalink: false
});

/**
 * Strip HTML tags and decode entities, return plain text
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract TOC from rendered HTML (H2-H6 only, H1 is page title)
 * Returns [{ level, text, anchor }]
 */
function extractToc(html) {
  const toc = [];
  const regex = /<h([2-6])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    toc.push({
      level: parseInt(match[1]),
      text: stripHtml(match[3]),
      anchor: match[2]
    });
  }
  return toc;
}

/**
 * Replace image paths in HTML using manifest.
 * Case-insensitive matching since manifest keys are lowercase but
 * Markdown may reference images with mixed case.
 */
function replaceImagePaths(html, manifest, pageSlug) {
  if (!manifest || Object.keys(manifest).length === 0) return html;

  // Build a map of lowercase filename → webp path
  const fileMap = {};
  for (const [origRel, entry] of Object.entries(manifest)) {
    const origFile = path.basename(origRel); // already lowercase
    if (!fileMap[origFile]) {
      fileMap[origFile] = entry.webp;
    }
  }

  let result = html;

  // Replace image sources: match src="...filename" case-insensitively
  for (const [origFile, webpPath] of Object.entries(fileMap)) {
    const webpSrc = webpPath;

    // Regex to match src="...filename" with any case
    const srcRegex = new RegExp(
      'src="([^"]*\\/)?' + escapeRegex(origFile) + '"',
      'gi'
    );
    result = result.replace(srcRegex, 'src="' + webpSrc + '"');

    // Also replace bare path references like assets/filename
    const assetRegex = new RegExp(
      '(?<=")([^"]*\\/)?' + escapeRegex(origFile) + '(?=")',
      'gi'
    );
    // Only do this for non-src attributes (src already handled)
    // This catches srcset, poster, etc.
    result = result.replace(
      new RegExp('(srcset|poster|href)="([^"]*\\/)?' + escapeRegex(origFile) + '"', 'gi'),
      function (match, attr) {
        return attr + '="' + webpSrc + '"';
      }
    );
  }

  return result;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Process a single .md file
 */
async function processFile(filePath, knowledgeDir, pagesOutputDir, manifest) {
  const raw = await fs.readFile(filePath, 'utf-8');
  const { data: frontMatter, content: body } = matter(raw);

  // Calculate slug
  const relativePath = path.relative(knowledgeDir, filePath).replace(/\\/g, '/');
  const dirName = path.dirname(relativePath).replace(/\\/g, '/');
  const baseName = path.basename(filePath);

  let slug, category;

  // index.md → slug = dir path; category = parent dir
  // other .md → slug = path minus .md; category = dir containing the .md
  if (baseName === 'index.md') {
    slug = dirName === '.' ? 'index' : dirName;
    // category = parent of the article directory
    var catDir = path.dirname(dirName);
    category = catDir === '.' ? '' : catDir;
  } else {
    slug = relativePath.replace(/\.md$/, '');
    category = dirName === '.' ? '' : dirName;
  }

  // Normalize slug and category to lowercase for URL consistency
  slug = slug.toLowerCase();
  if (category) category = category.toLowerCase();

  // Render markdown → HTML
  let html = md.render(body);

  // Replace image paths using manifest
  html = replaceImagePaths(html, manifest, slug);

  // Extract TOC
  const toc = extractToc(html);

  // Extract plain text
  const text = stripHtml(html);

  // File modification time
  const stat = await fs.stat(filePath);

  // Resolve cover from frontmatter or auto-detect cover asset
  let cover = null;

  if (frontMatter.cover) {
    // Lookup cover in manifest (both slug and manifest keys are lowercase)
    const coverKey = slug + '/' + frontMatter.cover.toLowerCase();
    if (manifest[coverKey]) {
      cover = manifest[coverKey].webp;
    } else {
      cover = frontMatter.cover; // keep as-is if not in manifest
    }
  } else {
    // Auto-detect: look for any cover file in manifest for this slug
    const coverFiles = ['cover.png', 'cover.jpg', 'cover.webp',
      'assets/cover.png', 'assets/cover.jpg', 'assets/cover.webp'];
    for (const cf of coverFiles) {
      const ck = slug + '/' + cf;
      if (manifest[ck]) {
        cover = manifest[ck].webp;
        break;
      }
    }
  }

  const page = {
    title: frontMatter.title || path.basename(filePath, '.md'),
    slug: slug,
    category: category,
    tags: Array.isArray(frontMatter.tags) ? frontMatter.tags : [],
    type: frontMatter.type || 'page',
    cover: cover,
    github: frontMatter.github || null,
    demo: frontMatter.demo || null,
    html: html,
    text: text,
    updatedAt: stat.mtime.toISOString().slice(0, 10),
    toc: toc
  };

  // Write independent JSON file
  const outputPath = path.join(pagesOutputDir, `${slug}.json`);
  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeJson(outputPath, page, { spaces: 2 });

  return page;
}

/**
 * Main: parse all markdown files, generate page JSONs
 */
export default async function markdown(config) {
  const pagesDir = path.join(config.dataDir, 'pages');
  await fs.ensureDir(pagesDir);

  // Load image manifest (may be empty if no images)
  const manifestPath = path.join(config.dataDir, 'image-manifest.json');
  const manifest = await fs.pathExists(manifestPath)
    ? await fs.readJson(manifestPath)
    : {};

  // Find all .md files (both index.md and old-format *.md)
  const pattern = path.join(config.knowledgeDir, '**', '*.md').replace(/\\/g, '/');
  const files = await fg(pattern, { dot: false });

  const pages = [];
  const seenSlugs = new Set();

  for (const file of files) {
    const page = await processFile(file, config.knowledgeDir, pagesDir, manifest);
    // Avoid duplicates (e.g. both index.md and Prompt.md resolving to same slug)
    if (!seenSlugs.has(page.slug)) {
      seenSlugs.add(page.slug);
      pages.push(page);
    }
  }

  console.log(`[markdown] Generated ${pages.length} page files (with TOC)`);
  return pages;
}
