# Knowledge Base Generator — 设计文档 v3

## 一、总体架构

### 1.1 构建时架构（Node.js Build Pipeline）

```
                          scripts/config.js
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Build Time (Node.js)                        │
│                                                                   │
│  knowledge/  ──►  scripts/build.js  ──►  public/ (GitHub Pages)  │
│  (Markdown)       (orchestrator)          (fully static)          │
│                      │                                            │
│          ┌───────────┼───────────┬────────────┐                   │
│          ▼           ▼           ▼            ▼                   │
│      scan.js     images.js   markdown.js   search.js              │
│          │           │           │            │                   │
│          │      ┌────┴────┐      │            │                   │
│          │      ▼         ▼      │            │                   │
│          │   images.js   cache   │            │                   │
│          │   (sharp)   (.cache)  │            │                   │
│          │      │         │      │            │                   │
│          ▼      ▼         ▼      ▼            ▼                   │
│     tree.json  assets/  image-   pages/    search.json            │
│     categories.json     manifest  *.json    recent.json            │
│     tags.json           .json                                     │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 运行时架构（Browser）

```
┌──────────────────────────────────────────────────────────────────┐
│                      Runtime (Browser)                            │
│                                                                   │
│  Config (siteName, theme, ...)                                    │
│       │                                                           │
│  DataProvider (abstraction — where data comes from)               │
│       │                                                           │
│       ├── StaticDataProvider  (demo: hardcoded objects)           │
│       └── JsonDataProvider    (prod: fetch JSON files)            │
│       │                                                           │
│  Repository (unified data access layer — what data is available)  │
│       │                                                           │
│       ├── getSite()          → Promise<siteConfig>                │
│       ├── getTree()           → Promise<treeNode[]>               │
│       ├── getPage(slug)       → Promise<pageData>                 │
│       ├── getSearchIndex()    → Promise<searchEntry[]>            │
│       ├── getRecent()         → Promise<recentEntry[]>            │
│       ├── getCategories()     → Promise<categoryEntry[]>          │
│       ├── getTags()           → Promise<tagEntry[]>               │
│       └── getImageManifest()  → Promise<imageManifest>            │
│       │                                                           │
│  Renderer (pure functions, accept data, return DOM — NO data access) │
│       │                                                           │
│       ├── renderHeader(container, config)                         │
│       ├── renderHome(container, recent, categories, tags)         │
│       ├── renderTree(container, tree, currentSlug)                │
│       ├── renderArticle(container, pageData)                      │
│       ├── renderSearchPalette(container, searchIndex)             │
│       └── renderSidebarToggle(container, state)                   │
│       │                                                           │
│  View (page-level composition — decides WHAT to render when)      │
│       │                                                           │
│       ├── HomeView       (#/  or  #/home)                         │
│       ├── ArticleView    (#/ai/llm/prompt)                        │
│       └── SearchView     (overlay, any route)                     │
│       │                                                           │
│  App (wires everything: Router → Repository → View → Renderer)    │
└──────────────────────────────────────────────────────────────────┘
```

核心设计原则：
1. **数据层与渲染层完全解耦** — Provider 负责"数据从哪来"，Repository 负责"提供什么数据"，Renderer 只接收数据生成 DOM
2. **Demo 与正式版一致** — 切换 Provider 即可，Renderer / View / HTML / CSS 零改动
3. **渐进增强** — 每个模块独立可替换，不为了第一版而牺牲未来架构

---

## 二、数据模型

### 2.1 节点模型：Folder / Page 无限层级

树中每个节点为两种类型之一，通过 `type` 字段区分：

**Folder 节点：**

```json
{
  "type": "folder",
  "name": "AI",
  "slug": "ai",
  "children": []
}
```

**Page 节点：**

```json
{
  "type": "page",
  "title": "Prompt Engineering",
  "slug": "ai/llm/prompt"
}
```

**字段说明：**

| 字段 | 适用类型 | 类型 | 说明 |
|------|----------|------|------|
| `type` | 两者 | `"folder"` \| `"page"` | 节点类型 |
| `name` | folder | string | 目录名 |
| `slug` | 两者 | string | URL 标识（相对路径去扩展名，对于 folder 即目录路径） |
| `title` | page | string | 页面标题（取自 FrontMatter title 字段） |
| `children` | folder | array | 子节点（可嵌套 Folder 或 Page），无子节点时为空数组 `[]` |

### 2.2 页面数据：每个页面一个独立 JSON 文件

**文件路径映射：**

```
knowledge/AI/LLM/Prompt/index.md  →  public/data/pages/ai/llm/prompt.json
knowledge/Football/Arsenal/index.md  →  public/data/pages/football/arsenal.json
```

**单页面 JSON 结构：**

```json
{
  "title": "Prompt Engineering",
  "slug": "ai/llm/prompt",
  "category": "AI/LLM",
  "tags": ["GPT", "Claude"],
  "type": "page",
  "cover": "assets/ai/llm/prompt/cover.webp",
  "github": null,
  "demo": null,
  "html": "<h1>Prompt Engineering</h1><p>正文内容...</p>",
  "text": "Prompt Engineering\n\n正文内容...",
  "updatedAt": "2026-07-15",
  "toc": [
    { "level": 2, "text": "Core Principles", "anchor": "core-principles" },
    { "level": 2, "text": "Chain-of-Thought", "anchor": "chain-of-thought" },
    { "level": 2, "text": "Best Practices", "anchor": "best-practices" }
  ]
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 页面标题（取自 FrontMatter，回退到文件名） |
| `slug` | string | 唯一标识，即文章目录相对于 knowledge/ 的路径 |
| `category` | string | 所属分类（完整目录路径，用 `/` 分隔） |
| `tags` | string[] | FrontMatter 标签数组 |
| `type` | `"page"` \| `"project"` | 页面类型 |
| `cover` | string\|null | 封面图 URL（已替换为构建后的 WebP 路径） |
| `github` | string\|null | type=project 时的 GitHub 链接 |
| `demo` | string\|null | type=project 时的 Demo 链接 |
| `html` | string | Markdown 渲染后的 HTML，其中图片路径已替换为 WebP |
| `text` | string | 纯文本（搜索用），去除 HTML 和 Markdown 标记 |
| `updatedAt` | string | 文件 mtime 的 ISO 日期（YYYY-MM-DD） |
| `toc` | array | 文章目录（从 HTML 标题解析），每项含 `level`(1-6)、`text`、`anchor` |

### 2.3 `toc` 字段说明

`toc` 是每篇文章页 JSON 的内嵌字段。由 `markdown.js` 在渲染 HTML 时同步提取标题生成。前端可用于：

- **文章内 TOC 侧栏**：在文章右侧展示目录导航，点击跳转到对应标题
- **搜索结果增强**：展示匹配段落所在的章节

每条 TOC 条目：

| 字段 | 类型 | 说明 |
|------|------|------|
| `level` | number | 标题层级 (1=H1, 2=H2, 3=H3...) |
| `text` | string | 标题纯文本（去除 HTML 标签） |
| `anchor` | string | 对应 HTML 中的 `id`，用于 `#anchor` 跳转 |

### 2.4 `search.json` — 搜索索引（Fuse.js 兼容格式）

```json
[
  {
    "title": "Prompt Engineering",
    "slug": "ai/llm/prompt",
    "tags": ["GPT", "Claude"],
    "text": "Prompt Engineering\n\n正文内容..."
  }
]
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 页面标题 |
| `slug` | string | 页面唯一标识 |
| `tags` | string[] | 标签列表 |
| `text` | string | 全文纯文本（供 Fuse.js 搜索正文内容） |

### 2.5 `image-manifest.json` — 图片清单

```json
{
  "ai/llm/prompt/cover.png": {
    "original": "ai/llm/prompt/cover.png",
    "webp": "assets/ai/llm/prompt/cover.webp",
    "width": 1200,
    "hash": "a1b2c3d4e5f6",
    "size": 48200
  },
  "ai/llm/prompt/screenshot.png": {
    "original": "ai/llm/prompt/screenshot.png",
    "webp": "assets/ai/llm/prompt/screenshot.webp",
    "width": 2400,
    "hash": "f6e5d4c3b2a1",
    "size": 128400
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| key | string | 原始图片相对 knowledge/ 的路径 |
| `original` | string | 原始路径（用于 Markdown 中的 `![](path)` 匹配） |
| `webp` | string | 输出后 WebP 路径（相对于 public/） |
| `width` | number | 处理后的像素宽度（受 maxWidth 限制） |
| `hash` | string | 文件内容的 MD5 哈希（前 12 位，缓存键） |
| `size` | number | 输出文件字节数 |

### 2.6 `recent.json` — 最近更新列表

```json
[
  {
    "title": "Prompt Engineering",
    "slug": "ai/llm/prompt",
    "updatedAt": "2026-07-15"
  }
]
```

按 `updatedAt` 降序排列，最多 10 条。用于首页"最近更新"模块。

### 2.7 `categories.json` — 分类索引

```json
[
  {
    "name": "AI",
    "slug": "ai",
    "count": 3,
    "children": [
      {
        "name": "LLM",
        "slug": "ai/llm",
        "count": 2
      }
    ]
  },
  {
    "name": "Football",
    "slug": "football",
    "count": 2,
    "children": []
  }
]
```

每个 `folder` 条目包含该分类下的页面总数（`count`，递归统计）。用于首页分类卡片。

### 2.8 `tags.json` — 标签索引

```json
[
  { "name": "GPT", "count": 2 },
  { "name": "Claude", "count": 3 },
  { "name": "JavaScript", "count": 1 }
]
```

按 `count` 降序排列。用于首页标签云和搜索联想。

### 2.9 `site.json` — 站点配置

```json
{
  "name": "Knowledge Base",
  "description": "Personal knowledge base powered by Markdown",
  "github": "https://github.com/user/repo",
  "hero": {
    "title": "Knowledge Base",
    "subtitle": "Personal notes, thoughts, and references.",
    "cover": null
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 站点名称 |
| `description` | string | 站点描述（SEO / Meta） |
| `github` | string | GitHub 仓库链接 |
| `hero` | object | 首页 Hero Banner 配置 |
| `hero.title` | string | Hero 主标题 |
| `hero.subtitle` | string\|null | Hero 副标题 |
| `hero.cover` | string\|null | Hero 背景图路径（相对于 knowledge/ 根，构建后替换为 public/ 路径） |

数据来源：**`scripts/config.js`** → `build.js` 在构建时写入 `data/site.json`。
Hero 是**站点级配置**，不由任何 Markdown 的 FrontMatter 定义，与具体文章无关。

### 2.10 输出文件完整对照

```
public/
├── index.html
├── style.css
├── app.js
├── data/
│   ├── site.json                          # 站点配置（Hero、名称、GitHub 等）
│   ├── tree.json                          # 目录树（Folder/Page 无限层级）
│   ├── search.json                        # 搜索索引（Fuse.js 兼容）
│   ├── image-manifest.json                # 图片处理清单
│   ├── recent.json                        # 最近更新（最多 10 条）
│   ├── categories.json                    # 分类统计
│   ├── tags.json                          # 标签统计
│   └── pages/                             # 每页一个 JSON（含 toc）
│       ├── ai/
│       │   ├── llm/
│       │   │   ├── prompt.json
│       │   │   └── claude.json
│       │   └── gpt.json
│       └── football/
│           ├── arsenal.json
│           └── fpl.json
└── assets/                                # 处理后的 WebP 图片
    └── ai/
        └── llm/
            └── prompt/
                ├── cover.webp
                └── screenshot.webp
```

---

## 三、构建管线（Build Pipeline）

### 3.1 构建顺序

```
build.js
  │
  ├── 1. scan.js
  │     Input:  knowledge/ 目录
  │     Output: 写入 data/tree.json, data/categories.json
  │     职责:   递归扫描，构造 Folder/Page 无限层级树，
  │             同时统计分类信息供 categories.json
  │
  ├── 2. images.js
  │     Input:  knowledge/ 目录中所有图片
  │     Output: public/assets/ — 处理后的 WebP
  │             .cache/images/ — 缓存清单
  │             data/image-manifest.json
  │     职责:   扫描图片 → 计算 Hash → 检查缓存 →
  │             跳过或 Sharp 转换 WebP → 限制最大宽度 →
  │             压缩 → 写入 assets/ → 生成 manifest
  │
  ├── 3. markdown.js
  │     Input:  knowledge/ 目录 + data/image-manifest.json
  │     Output: data/pages/**/*.json
  │     职责:   解析 FrontMatter + Markdown 正文 →
  │             根据 manifest 替换图片路径为 .webp →
  │             剥离 HTML 标签生成纯文本 →
  │             写入独立 JSON 文件
  │
  └── 4. search.js
        Input:  data/pages/**/*.json
        Output: data/search.json, data/recent.json, data/tags.json
        职责:   遍历所有页面 JSON →
                提取 search index →
                生成 recent.json (按 updatedAt 排序取 top 10) →
                生成 tags.json (按 count 排序)
```

> **补充说明**：上图展示的是核心 4 步。实际 `build.js` 在 scan 之后还会执行一个内联步骤：读取 `config.js` 将站点元信息（`siteName`、`siteDescription`、`hero`、`github` 等）写入 `data/site.json`。两步之间无依赖可并行，但为简单起见串行执行。

### 3.2 图片处理 Pipeline（详细）

```
images.js 主流程:

  1. 扫描阶段
     ┌──────────────────────────────────────────────┐
     │ fast-glob 扫描 knowledge/**/assets/*         │
     │ 匹配: *.png *.jpg *.jpeg *.gif *.webp *.svg  │
     │                                              │
     │ 注意：SVG 不做格式转换（保持矢量），仅复制    │
     └──────────────┬───────────────────────────────┘
                    │
                    ▼
  2. 哈希计算
     ┌──────────────────────────────────────────────┐
     │ crypto.createHash('md5')                     │
     │ 取文件内容的前 64KB + 文件大小 做 Hash        │
     │ （大文件不全量读，取头部足够区分）             │
     └──────────────┬───────────────────────────────┘
                    │
                    ▼
  3. 缓存检查
     ┌──────────────────────────────────────────────┐
     │ 读取 .cache/images/manifest.json              │
     │ key = 原始路径 (如 ai/llm/prompt/cover.png)   │
     │ 比对 hash:                                    │
     │   hash 相同 → 跳过处理，直接复用上次的 WebP   │
     │   hash 不同 → 进入 Sharp 处理                 │
     │   无缓存 → 进入 Sharp 处理                    │
     └──────────────┬───────────────────────────────┘
                    │
                    ▼
  4. Sharp 处理
     ┌──────────────────────────────────────────────┐
     │ sharp(inputPath)                             │
     │   .resize({ width: config.imageMaxWidth,     │
     │             withoutEnlargement: true })       │
     │   .webp({ quality: config.imageQuality })    │
     │   .toFile(outputPath)                        │
     │                                              │
     │ 配置项从 config.js 读取:                      │
     │   imageMaxWidth: 1200  (默认)                 │
     │   imageQuality: 85    (默认)                  │
     └──────────────┬───────────────────────────────┘
                    │
                    ▼
  5. 输出
     ┌──────────────────────────────────────────────┐
     │ public/assets/{slug}/xxx.webp                │
     └──────────────┬───────────────────────────────┘
                    │
                    ▼
  6. 更新缓存 & 生成 manifest
     ┌──────────────────────────────────────────────┐
     │ 写入 .cache/images/manifest.json (缓存用)     │
     │ 写入 public/data/image-manifest.json (前端用) │
     │                                              │
     │ image-manifest.json 供:                      │
     │   a) markdown.js 替换图片路径                 │
     │   b) 前端按需展示原图/WebP 信息               │
     └──────────────────────────────────────────────┘
```

> **TOC 提取**：`markdown.js` 渲染 HTML 后同步解析其中的 `<h1>`～`<h6>` 标签，提取 `level`（数字）、`text`（纯文本）、`anchor`（标签 `id` 属性），生成 `toc` 数组写入页面 JSON。`markdown-it` 需配置 `markdown-it-anchor` 插件自动为标题生成 `id`。

### 3.3 脚本接口约定

每个脚本 export 一个默认函数，签名统一为：

```js
import config from './config.js';

export default async function build(config) { ... }
```

### 3.4 缓存设计（`.cache/`）

```
.cache/
└── images/
    └── manifest.json    # 图片哈希缓存
```

**缓存 manifest.json 结构：**

```json
{
  "ai/llm/prompt/cover.png": {
    "hash": "a1b2c3d4e5f6",
    "webp": "assets/ai/llm/prompt/cover.webp",
    "updatedAt": "2026-07-15"
  }
}
```

缓存逻辑：
- 计算输入文件的 hash
- 在 `.cache/images/manifest.json` 中查找相同 key
- hash 一致 → 跳过处理（文件未变化），直接复制缓存信息到 `image-manifest.json`
- hash 不一致或无缓存 → 执行 Sharp 处理，更新缓存
- 已删除的图片 → 清理缓存条目和输出的 WebP

第一版实现：缓存逻辑在 `images.js` 中直接实现，不单独拆模块。后续可按需拆为 `scripts/cache.js`。

---

## 三.b、Development Mode（开发模式）

### 概述

开发模式提供本地实时预览体验。启动 `npm run dev` 后：

- 首次执行完整 Build
- 启动 BrowserSync 本地静态服务器
- 自动打开浏览器
- 监听文件变化 → 自动 Rebuild → 浏览器自动刷新

整个过程无需人工操作。

### 核心原则

- **不引入后端** — 不增加 Express/Koa/Fastify 等 Web Server
- **不修改 Build 行为** — dev 和 build 使用完全相同的构建逻辑和输出目录 `public/`
- **build.js 可复用** — CLI 和 dev 共用同一套 `build()` 函数

### 技术选型

| 工具 | 用途 |
|------|------|
| `chokidar` | 文件系统监听，跨平台，去抖 |
| `browser-sync` | 静态服务器 + 自动刷新 + CSS 热注入 |

### 架构数据流

```
npm run dev
       │
       ▼
  dev.js
       │
       ├── (1) build({ silent: true })      ← 调用同一个 build()
       │
       ├── (2) browser-sync.init({ server: public/ })
       │         └── localhost:3000
       │
       └── (3) chokidar.watch()
                  │
                  ├── knowledge/**   (.md .png .jpg .webp .svg)
                  │         │ change →
                  │         ▼
                  │      debounce (300ms)
                  │         │
                  │         ▼
                  │      rebuild queue
                  │         │
                  │         ▼
                  │      build({ silent: true })
                  │         │
                  │         ▼
                  │      bs.reload()
                  │
                  ├── demo/**        (.html .css .js)
                  │         │ change →
                  │         ▼
                  │      bs.reload()           ← 无需 rebuild
                  │      bs.reload('*.css')    ← CSS 热注入
                  │
                  └── scripts/**     (.js)
                            │ change →
                            ▼
                         build({ silent: true })
                            │
                            ▼
                         bs.reload()
```

### Build Queue（避免并发）

```
building = false
pending  = false

on file change:
  if building:
    pending = true      // 排队，不启动第二个 Build
  else:
    building = true
    execute build()
    on build done:
      building = false
      if pending:
        pending = false
        execute build() // 排水：立即再 Build 一次
```

### 去抖（Debounce）

- 文件变化事件可能短时间内触发多次（保存时 IDE 可能写入多次）
- 使用 `setTimeout` 300ms 去抖窗口
- 窗口内的所有变化合并为一次 Build

### 日志规范

启动时输出 Banner + 监视路径；文件变化时输出触发文件 + Build 耗时 + Reload 确认：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Knowledge Base — Dev Mode
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Building...
  ✓ Initial build complete (0.10s)

  ✓ BrowserSync started

  Watching:
    knowledge/    *.md  *.png  *.jpg  *.webp  *.svg
    demo/         *.html  *.css  *.js
    scripts/      *.js

  BrowserSync:    http://localhost:3000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[12:34:56]  knowledge/AI/LLM/Prompt/index.md
  → Rebuilding...
  ✓ Build completed in 0.08s
  → Browser reloaded

[12:35:10]  demo/style.css
  → Reloading browser (no rebuild needed)
```

### 配置

开发模式配置统一在 `scripts/config.js` 的 `dev` 字段：

```js
dev: {
  port: 3000,           // BrowserSync 端口
  debounceMs: 300,      // 文件变化去抖间隔 (ms)
  browser: true         // 启动时自动打开浏览器
}
```

### 文件监听规则

| 路径 | 文件类型 | 事件 | 动作 |
|------|---------|------|------|
| `knowledge/**` | `.md` | change / add / unlink | rebuild + reload |
| `knowledge/**` | `.png` `.jpg` `.jpeg` `.gif` `.webp` `.svg` | change / add / unlink | rebuild + reload |
| `demo/**` | `.html` `.js` | change | reload (full page) |
| `demo/**` | `.css` | change | reload (CSS inject) |
| `scripts/**` | `.js` | change / add | rebuild + reload |

### 与生产模式的关系

```
开发模式 (npm run dev)           生产模式 (npm run build)
       │                                │
       ▼                                ▼
  build({ silent: true })         node scripts/build.js
       │                                │
       ▼                                ▼
  输出到 public/                  输出到 public/
       │                                │
       ▼                                ▼
  browser-sync 托管               GitHub Pages 部署
```

两者使用**完全相同的构建逻辑和输出目录**，dev 模式仅额外增加了监听和自动刷新。

---

## 四、Config 系统

### 4.1 `scripts/config.js` — 统一配置中心

```js
/**
 * config.js — 项目统一配置
 * 所有构建模块和前端均从此读取配置。
 */

export default {
  // 站点元信息
  siteName: "Knowledge Base",
  siteDescription: "Personal knowledge base powered by Markdown",

  // 路径配置
  knowledgeDir: "knowledge",
  outputDir: "public",
  dataDir: "public/data",
  assetsDir: "public/assets",

  // 图片处理
  imageQuality: 85,        // WebP 质量 (0-100)
  imageMaxWidth: 1200,     // 最大宽度 (px)，超出等比缩放

  // 首页 Hero
  hero: {
    title: "Knowledge Base",
    subtitle: "Personal notes, thoughts, and references.",
    cover: null            // Hero 背景图路径 (相对于 knowledge/，如 "hero-bg.png")
  },

  // GitHub
  github: "https://github.com",

  // 基础路径 (GitHub Pages 子目录部署时设置，如 "/my-repo")
  base: "",

  // 主题 (预留)
  theme: "light",

  // 构建
  recentLimit: 10,         // recent.json 最多条目数

  // 开发模式
  dev: {
    port: 3000,            // BrowserSync 端口
    debounceMs: 300,       // 文件变化去抖间隔 (ms)
    browser: true          // 启动时自动打开浏览器
  }
};
```

所有构建脚本统一 `import config from './config.js'`，不再各自维护配置。

构建时，`build.js` 负责将 config 中的站点元信息（`siteName` → `name`、`siteDescription` → `description`、`hero`、`github` 等）写入 `data/site.json`。

---

## 五、前端架构

### 5.1 路由：Hash 模式 `#/xxx/xxx`

```
https://xxx.github.io/repo/#/ai/llm/prompt  → ArticleView
https://xxx.github.io/repo/#/                → HomeView
https://xxx.github.io/repo/                  → HomeView
```

**路由规则：**

| Hash | 视图 | 说明 |
|------|------|------|
| `#/` 或 空 | HomeView | 首页 Landing Page |
| `#/ai/llm/prompt` | ArticleView | 文章页 |
| 搜索框聚焦/键入 | SearchPalette (Overlay) | 搜索面板浮层，叠加在任何视图上 |

**路由解析：**

```js
function getCurrentSlug() {
  var hash = location.hash;
  if (!hash || hash === '#' || hash === '#/') return null;
  return hash.slice(2);
}
```

### 5.2 DataProvider 层

```js
// 抽象接口（约定，非 class）
// DataProvider 只关心「数据从哪来」，不关心数据内容。
//
// Demo 版实现：返回写死的 JS 对象
// 正式版实现：fetch JSON 文件并解析

var StaticDataProvider = {
  getSite:         function () { return Promise.resolve(STATIC_SITE); },
  getTree:         function () { return Promise.resolve(STATIC_TREE); },
  getPage:         function (slug) { return Promise.resolve(STATIC_PAGES[slug] || null); },
  getSearchIndex:  function () { return Promise.resolve(STATIC_SEARCH); },
  getRecent:       function () { return Promise.resolve(STATIC_RECENT); },
  getCategories:   function () { return Promise.resolve(STATIC_CATEGORIES); },
  getTags:         function () { return Promise.resolve(STATIC_TAGS); },
  getImageManifest: function () { return Promise.resolve(STATIC_IMAGE_MANIFEST); }
};

var JsonDataProvider = {
  getSite:         function () { return fetch('data/site.json').then(parseJSON); },
  getTree:         function () { return fetch('data/tree.json').then(parseJSON); },
  getPage:         function (slug) { return fetch('data/pages/' + slug + '.json').then(parseJSON); },
  getSearchIndex:  function () { return fetch('data/search.json').then(parseJSON); },
  getRecent:       function () { return fetch('data/recent.json').then(parseJSON); },
  getCategories:   function () { return fetch('data/categories.json').then(parseJSON); },
  getTags:         function () { return fetch('data/tags.json').then(parseJSON); },
  getImageManifest: function () { return fetch('data/image-manifest.json').then(parseJSON); }
};
```

### 5.3 Repository 层

Repository 是 Provider 之上的薄封装。当前第一版直接透传，但预留了以下扩展点：

- **缓存**：Repository 可缓存 `getTree()` 结果避免重复请求
- **兜底**：`getPage()` 返回 `null` 时统一处理为 404 状态
- **转换**：可在此层做数据格式适配（如日期格式化）

```js
var Repository = {
  _cache: {},

  getSite: function () {
    if (this._cache.site) return Promise.resolve(this._cache.site);
    return provider.getSite().then(function (data) {
      this._cache.site = data;
      return data;
    }.bind(this));
  },

  getTree: function () {
    if (this._cache.tree) return Promise.resolve(this._cache.tree);
    return provider.getTree().then(function (data) {
      this._cache.tree = data;
      return data;
    }.bind(this));
  },

  getPage: function (slug) {
    return provider.getPage(slug).then(function (page) {
      return page || null; // null 表示 404
    });
  },

  getSearchIndex: function () {
    return provider.getSearchIndex();
  },

  getRecent: function () {
    return provider.getRecent();
  },

  getCategories: function () {
    return provider.getCategories();
  },

  getTags: function () {
    return provider.getTags();
  }
};
```

### 5.4 Renderer 层

纯函数，接收数据 + 容器，返回/插入 DOM。**不访问 Provider、Repository 或全局状态。**

```js
// 每个渲染函数签名:
// renderXxx(container: HTMLElement, data: object, context?: object) → void

renderHeader(container, config)           // Logo + 搜索框 + Sidebar Toggle + GitHub
renderHome(container, recent, categories, tags, heroConfig)  // 首页 Landing Page
renderSidebarToggle(container, state)     // ☰ 按钮，state ∈ { expanded, collapsed }
renderTree(container, tree, currentSlug)  // 递归渲染 Folder/Page 无限层级树
renderArticle(container, pageData)        // 文章标题 + Meta + Tags + 正文
renderSearchPalette(container, index)     // 搜索浮层 (Command Palette 风格)
renderEmpty(container)                    // 空状态 / 404
```

### 5.5 View 层

组合 Renderer，决定"当前路由应该渲染什么"。

```js
// View 是页面级组合函数
// showXxx() 负责:
//   1. 通过 Repository 获取数据
//   2. 组合多个 Renderer 生成完整页面
//   3. 处理路由上下文

function showHome() {
  Promise.all([
    Repository.getRecent(),
    Repository.getCategories(),
    Repository.getTags()
  ]).then(function (results) {
    renderHome(document.getElementById('content'), results[0], results[1], results[2], CONFIG.hero);
  });
}

function showArticle(slug) {
  Repository.getPage(slug).then(function (page) {
    Repository.getTree().then(function (tree) {
      renderTree(document.getElementById('sidebarTree'), tree, slug);
    });
    if (page) {
      renderArticle(document.getElementById('content'), page);
    } else {
      renderEmpty(document.getElementById('content'));
    }
  });
}
```

### 5.6 App 主控制器

```js
// 职责:
// 1. 监听 hashchange
// 2. 解析路由 → 调用对应 View
// 3. 管理 Sidebar 状态 (expanded / collapsed)
// 4. 管理搜索面板状态 (open / closed)
// 5. 渲染 Header（一次性）

function init() {
  renderHeader(document.getElementById('headerContainer'), CONFIG);
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
```

### 5.7 Search 搜索设计（Command Palette 风格）

#### 5.7.1 交互流程

```
用户点击搜索框 (或按 Ctrl+K / Cmd+K)
       │
       ▼
搜索面板打开 (overlay)
       │
       ├── 显示最近文章列表（无输入时）
       │
       ├── 用户输入关键字
       │     │
       │     ▼
       │   实时筛选（Fuse.js 模糊搜索）
       │     │
       │     ▼
       │   更新候选列表
       │
       └── 用户点击结果 / 按 Enter
             │
             ▼
           关闭面板 → 跳转 #/slug → ArticleView
```

#### 5.7.2 搜索面板 DOM 结构

```html
<!-- 搜索遮罩层 -->
<div class="search-palette" id="searchPalette" style="display:none;">
  <div class="search-palette__overlay"></div>
  <div class="search-palette__dialog">
    <div class="search-palette__input-wrap">
      <input
        class="search-palette__input"
        type="text"
        placeholder="Search articles..."
        id="searchPaletteInput"
        autofocus
      >
    </div>
    <div class="search-palette__results" id="searchPaletteResults">
      <!-- 动态生成结果列表 -->
    </div>
    <div class="search-palette__footer">
      <span>↑↓ Navigate</span>
      <span>↵ Open</span>
      <span>Esc Close</span>
    </div>
  </div>
</div>
```

#### 5.7.3 搜索结果项 DOM

```html
<a class="search-palette__item search-palette__item--active" href="#/ai/llm/prompt">
  <span class="search-palette__item-title">Prompt Engineering</span>
  <span class="search-palette__item-tags">
    <span class="search-palette__item-tag">GPT</span>
    <span class="search-palette__item-tag">Claude</span>
  </span>
</a>
```

#### 5.7.4 Fuse.js 配置

```js
var fuseOptions = {
  keys: [
    { name: 'title', weight: 0.5 },   // 标题权重最高
    { name: 'tags', weight: 0.3 },     // 标签次之
    { name: 'text', weight: 0.2 }      // 正文权重最低
  ],
  threshold: 0.3,       // 模糊匹配阈值（0=精确, 1=宽松）
  distance: 100,
  includeScore: true,
  minMatchCharLength: 1
};
```

#### 5.7.5 Header 搜索按钮

```
Header 布局重新设计:

┌─────────────────────────────────────────────────────────────┐
│  ☰  [Logo]         [🔍 Search articles... (Ctrl+K)]   [GH] │
└─────────────────────────────────────────────────────────────┘

  ☰       = Sidebar Toggle 按钮
  Logo     = 站点名称 (可点击回首页)
  Search   = 搜索输入框 (点击/聚焦 → 打开 SearchPalette)
  GH       = GitHub 按钮 (小尺寸，次要位置)
```

### 5.8 Sidebar 交互设计

#### 5.8.1 状态模型

```js
// Sidebar 状态
var sidebarState = 'expanded';  // 'expanded' | 'collapsed'

// 状态切换逻辑:
//   expanded  → collapsed  (sidebar 收起，content 撑满)
//   collapsed → expanded   (sidebar 展开)
//
// 响应式默认值:
//   桌面端 (> 768px): expanded
//   移动端 (≤ 768px): collapsed
```

#### 5.8.2 Sidebar Toggle 按钮

```html
<button class="header__sidebar-toggle" id="sidebarToggle" aria-label="Toggle sidebar">
  <span class="header__sidebar-toggle-icon">☰</span>
</button>
```

#### 5.8.3 CSS 状态管理

```css
/* Sidebar 收起状态 */
.sidebar--collapsed {
  transform: translateX(-100%);
  /* 或: width: 0; overflow: hidden; */
}

/* Content 在 Sidebar 收起时撑满 */
.sidebar--collapsed ~ .content {
  margin-left: 0;
}
```

#### 5.8.4 状态持久化

当前版本：状态仅存在于内存中（页面刷新重置）。

后续版本（暂不实现）：
- `localStorage.setItem('sidebarState', state)` 持久化
- 移动端默认 collapsed，桌面端默认 expanded

### 5.9 Home Page 首页设计

#### 5.9.1 页面结构

```
+------------------------------------------------------------------+
|  Header (☰ Logo | Search... | GH)                                |
+------------------------------------------------------------------+
|                                                                   |
|  ┌──────────────────────────────────────────────────────────────┐ |
|  │                    Hero Banner                                │ |
|  │                                                               │ |
|  │  # Knowledge Base                                             │ |
|  │  Personal notes, thoughts, and references.                    │ |
|  │                                                               │ |
|  │  [🔍 Start Searching]                                         │ |
|  │                                                               │ |
|  └──────────────────────────────────────────────────────────────┘ |
|                                                                   |
|  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────┐  |
|  │ Recent Updates    │ │ Categories        │ │ Tags           │  |
|  │                   │ │                   │ │                │  |
|  │ • Prompt Eng..    │ │ 📁 AI (3)         │ │ GPT (2)        │  |
|  │ • Claude Guide    │ │ 📁 Football (2)   │ │ Claude (2)     │  |
|  │ • Node.js Notes   │ │ 📁 Programming(2) │ │ JavaScript (1) │  |
|  │                   │ │                   │ │ Node.js (1)   │  |
|  │ [View all →]      │ │                   │ │ [View all →]   │  |
|  └───────────────────┘ └───────────────────┘ └───────────────┘  |
|                                                                   |
+------------------------------------------------------------------+
```

#### 5.9.2 Hero Banner

```html
<section class="hero">
  <div class="hero__inner">
    <h1 class="hero__title">Knowledge Base</h1>
    <p class="hero__subtitle">Personal notes, thoughts, and references.</p>
    <div class="hero__search">
      <input
        class="hero__search-input"
        type="text"
        placeholder="Search articles..."
        id="heroSearchInput"
      >
    </div>
  </div>
</section>
```

Hero 数据来源：
- **构建时**：`config.js` → `build.js` → 写入 `data/site.json`（包含 hero 配置）
- **Demo 时**：`CONFIG` 静态对象

#### 5.9.3 Hero 数据来源

Hero 是**站点级配置**，不由任何 Markdown 的 FrontMatter 定义。数据流：

```
scripts/config.js  →  build.js 写入  →  data/site.json  →  前端 Repository.getSite() 读取
```

`config.js` 中 hero 配置：

```js
hero: {
  title: "Knowledge Base",
  subtitle: "Personal notes, thoughts, and references.",
  cover: null            // 相对于 knowledge/ 根目录的背景图
}
```

构建时 `build.js` 将整个 config 中的站点元信息写入 `data/site.json`，前端通过 `Repository.getSite()` 获取并传给 `renderHome()`。修改 Hero 只需编辑 `config.js` 后重新构建。

---

## 六、知识库目录结构

### 6.1 新版目录结构（一篇文章一个目录）

```
knowledge/
├── index.md                       # (可选) 首页内容
│
├── AI/
│   ├── LLM/
│   │   ├── Prompt/
│   │   │   ├── index.md           # 文章正文
│   │   │   └── assets/            # 文章专属图片
│   │   │       ├── cover.png
│   │   │       └── diagram.png
│   │   └── Claude/
│   │       ├── index.md
│   │       └── assets/
│   │           └── cover.png
│   └── GPT/
│       ├── index.md
│       └── assets/
│
├── Football/
│   ├── Arsenal/
│   │   ├── index.md
│   │   └── assets/
│   └── FPL/
│       ├── index.md
│       └── assets/
│
└── Programming/
    ├── NodeJS/
    │   ├── index.md
    │   └── assets/
    └── Python/
        ├── index.md
        └── assets/
```

### 6.2 slug 计算规则

```
knowledge/AI/LLM/Prompt/index.md  →  slug = "ai/llm/prompt"
knowledge/AI/GPT/index.md         →  slug = "ai/gpt"
knowledge/index.md                →  slug = "index" (首页)
```

规则：取目录路径（去掉 `knowledge/` 前缀和末尾 `index.md`），转为小写，统一使用 `/`。

### 6.3 图片引用规范

Markdown 中引用文章目录下的 `assets/` 图片：

```markdown
![Diagram](assets/diagram.png)

![Cover](assets/cover.png)
```

构建时，`markdown.js` 读取 `image-manifest.json`，将 `assets/diagram.png` 替换为 `assets/ai/llm/prompt/diagram.webp`。

作者只需：
1. 截图保存到 `assets/`
2. 在 Markdown 中写 `![alt](assets/xxx.png)`
3. 构建

其他全部自动完成。

### 6.4 向后兼容（第一版平滑过渡）

当前 `knowledge/` 目录下仍然是旧的扁平结构（`Prompt.md` 直接放在目录下）。`scan.js` 需要同时支持两种结构：

- **新模式**：目录 + `index.md` → slug = 目录路径
- **旧模式**：`.md` 文件直接放在分类目录下 → slug = 文件路径去掉 `.md`

旧模式自动检测：如果一个目录下既有子目录又有 `.md` 文件，则 `.md` 文件作为 Page 节点平级处理。

```js
// scan.js 伪代码
if (entry is directory && contains('index.md')) {
  // 新模式：一篇文章一个目录
  const slug = relativePath; // 目录路径即为 slug
  const page = parseMarkdown(path.join(fullPath, 'index.md'));
  children.push({ type: 'page', title: page.title, slug });
} else if (entry is directory) {
  // 纯分类目录（无 index.md）
  const subChildren = await scanDirectory(fullPath, basePath);
  children.push({ type: 'folder', name, slug, children: subChildren });
} else if (entry.name.endsWith('.md')) {
  // 旧模式：.md 文件直接作为页面
  const slug = relativePath.replace(/\.md$/, '');
  const { data } = matter(content);
  children.push({ type: 'page', title: data.title, slug });
}
```

---

## 七、CSS 架构

### 7.1 文件组织

```
style.css
  ├── 1. CSS Variables (设计令牌)
  ├── 2. Reset / Base
  ├── 3. Layout (.app, .header, .main, .sidebar, .content)
  ├── 4. Header (.header__*, .header__sidebar-toggle)
  ├── 5. Sidebar (.sidebar__*, .sidebar--collapsed)
  ├── 6. Search Palette (.search-palette__*)
  ├── 7. Home Page (.hero__*, .home__section, .home__card)
  ├── 8. Article (.article__*, Markdown body styles)
  ├── 9. Empty State (.content__empty)
  └── 10. Responsive & Utilities
```

### 7.2 BEM 类名完整清单

| Block | Elements | Modifiers |
|-------|----------|-----------|
| `header` | `__inner`, `__sidebar-toggle`, `__sidebar-toggle-icon`, `__logo`, `__search`, `__search-input`, `__search-btn`, `__github` | — |
| `main` | — | — |
| `sidebar` | `__nav`, `__tree`, `__folder`, `__folder-header`, `__folder-toggle`, `__folder-name`, `__folder-children`, `__page`, `__link` | `--collapsed`, `__folder--open`, `__link--active` |
| `content` | — | — |
| `search-palette` | `__overlay`, `__dialog`, `__input-wrap`, `__input`, `__results`, `__item`, `__item-title`, `__item-tags`, `__item-tag`, `__footer` | `__item--active`, `--open` |
| `hero` | `__inner`, `__title`, `__subtitle`, `__search`, `__search-input` | — |
| `home` | `__section`, `__section-title`, `__card`, `__card-title`, `__card-count`, `__list`, `__list-item`, `__tag`, `__tag-count` | — |
| `article` | `__title`, `__meta`, `__date`, `__tags`, `__tag`, `__body`, `__cover` | — |

### 7.3 HTML / CSS / JavaScript 分离原则

- **HTML**：仅 DOM 结构。不允许 `<style>` 和 `<script>` 标签内联（`<script src>` 和 `<link>` 除外）。
- **CSS**：全部在 `style.css`。不允许 HTML 中的 `style=""` attribute。使用 BEM 类名。
- **JavaScript**：全部在 `app.js`。不允许 HTML 中的 `onclick=""` 等事件属性，所有事件通过 `addEventListener` 绑定。

---

## 八、项目完整目录结构

```
repo/
├── knowledge/                          # 用户的 Markdown 知识库（源文件）
│   ├── index.md                        # (可选) 首页内容
│   ├── AI/
│   │   ├── LLM/
│   │   │   ├── Prompt/
│   │   │   │   ├── index.md
│   │   │   │   └── assets/
│   │   │   └── Claude/
│   │   │       ├── index.md
│   │   │       └── assets/
│   │   └── GPT/
│   │       ├── index.md
│   │       └── assets/
│   ├── Football/
│   │   ├── Arsenal/
│   │   │   ├── index.md
│   │   │   └── assets/
│   │   └── FPL/
│   │       ├── index.md
│   │       └── assets/
│   └── Programming/
│       ├── NodeJS/
│       │   ├── index.md
│       │   └── assets/
│       └── Python/
│           ├── index.md
│           └── assets/
│
├── scripts/                            # 构建脚本
│   ├── config.js                       # 统一配置中心
│   ├── build.js                        # 编排器 (可被 import 复用)
│   ├── dev.js                          # 开发模式 (chokidar + browser-sync)
│   ├── scan.js                         # 目录扫描 → tree.json + categories.json
│   ├── images.js                       # 图片处理 → assets/ + image-manifest.json
│   ├── markdown.js                     # Markdown 解析 → pages/*.json
│   └── search.js                       # 搜索索引 → search.json + recent.json + tags.json
│
├── .cache/                             # 构建缓存（不提交 Git）
│   └── images/
│       └── manifest.json               # 图片哈希缓存
│
├── public/                             # 构建输出（GitHub Pages 根目录）
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── data/
│   │   ├── site.json
│   │   ├── tree.json
│   │   ├── search.json
│   │   ├── image-manifest.json
│   │   ├── recent.json
│   │   ├── categories.json
│   │   ├── tags.json
│   │   └── pages/
│   └── assets/
│
├── demo/                               # 纯静态 Demo（数据写死，无需 build）
│   ├── index.html                      # 与 public/index.html 结构一致
│   ├── style.css                       # 与 public/style.css 完全相同
│   └── app.js                          # 使用 StaticDataProvider，其余逻辑一致
│
├── .github/                            # GitHub Actions / Pages 配置
│   └── workflows/
│       └── deploy.yml
│
├── .gitignore                          # .cache/ 不提交
├── design.md                           # 本设计文档
├── package.json
└── README.md
```

**`.gitignore` 新增内容：**

```
.cache/
node_modules/
public/
```

---

## 九、构建输出文件清单

| 文件 | 生成模块 | 说明 |
|------|----------|------|
| `index.html` | build.js (复制自 demo/) | 入口 HTML |
| `style.css` | build.js (复制自 demo/) | 样式 |
| `app.js` | build.js (复制自 demo/) | 前端逻辑 |
| `data/site.json` | build.js | 站点配置（Hero、名称、GitHub 等，来自 config.js） |
| `data/tree.json` | scan.js | 目录树（Folder/Page 无限层级） |
| `data/categories.json` | scan.js | 分类 + 页面计数 |
| `data/image-manifest.json` | images.js | 图片处理清单 |
| `data/pages/**/*.json` | markdown.js | 每页一个 JSON（含 toc 字段） |
| `data/search.json` | search.js | 搜索索引（Fuse.js 兼容） |
| `data/recent.json` | search.js | 最近更新（top 10） |
| `data/tags.json` | search.js | 标签 + 出现次数 |
| `assets/**/*.webp` | images.js | 处理后的 WebP 图片 |

---

## 十、关键设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 知识库目录结构 | 一文章一目录 (`Prompt/index.md + assets/`) | 图片不丢失；文章移动/复制/删除简单 |
| 树结构 | Folder/Page 无限嵌套 | 支持任意深度知识库 |
| 页面数据 | `data/pages/**/*.json`（每页独立） | 按需加载，避免一次拉取全部页面 |
| 路由 | Hash `#/xxx/xxx` | GitHub Pages 原生支持，无需 404 fallback |
| Markdown 引擎 | markdown-it | 生态成熟，插件丰富 |
| 图片格式 | Sharp → WebP（SVG 保持原样） | 体积小，浏览器广泛支持 |
| 图片缓存 | `.cache/images/manifest.json` + Hash 比对 | 增量构建，避免重复压缩 |
| 搜索 | 前端 Fuse.js + Command Palette 浮层 | 实时筛选，无需后端；浮层体验好于传统下拉 |
| Sidebar 状态 | CSS class `sidebar--collapsed` | 无需 JS 动画开销，CSS transition 即可 |
| 首页 | Hero Banner + Recent + Categories + Tags | Landing Page 视觉更好，方便导航 |
| CSS 命名 | BEM | 无样式冲突，语义清晰，方便 Open Design 接手 |
| 架构分层 | Provider → Repository → Renderer → View | 每层职责单一，Demo/正式版切换只改 Provider |
| 配置管理 | `scripts/config.js` 单一配置中心 | 所有模块统一读取，避免配置散落 |
| 模块系统 | ES Module | 标准规范，Node 原生支持 |
| 构建顺序 | scan → images → markdown → search | markdown 需要 image-manifest 来替换图片路径 |
| 向后兼容 | scan.js 同时支持新旧目录结构 | 平滑过渡，不强制迁移 |
| 站点配置 | `config.js` → `site.json`（非 FrontMatter） | Hero 是站点级配置，不应与文章耦合 |
| TOC | markdown-it-anchor 提取标题 → 每页 `toc` 数组 | 支持文章内目录导航，前端按需渲染 |
| 开发模式 | chokidar + browser-sync，共用 build() 函数 | 零后端依赖，纯静态；dev/prod 输出完全一致 |
| Build 可复用 | `build.js` 导出函数，CLI 和 dev 共用 | 避免维护两套构建流程 |

---

## 十一、第一版实现范围

以下能力在 **设计文档中完整定义**，但第一版代码实现时区分优先级：

### 已实现（v2，当前代码库）
- [x] 目录扫描 → `tree.json`
- [x] Markdown 解析 → `pages/*.json`（每页独立）
- [x] 图片复制（原样，不做处理）
- [x] 搜索索引 → `search.json`
- [x] Demo 页面：Header + Sidebar + Article
- [x] DataProvider 模式（StaticDataProvider）
- [x] Hash 路由 `#/xxx/xxx`

### 本次升级需要实现（v3 第一版）
- [x] `scripts/config.js` — 统一配置中心
- [x] `data/site.json` — build.js 写入站点配置（Hero 数据来源）
- [x] Markdown 渲染时提取标题生成 `toc` 数组（markdown-it-anchor）
- [x] 知识库目录结构调整（`index.md + assets/`，同时兼容旧结构）
- [x] 构建顺序调整：scan → images → markdown → search
- [x] 图片处理 Pipeline：Hash → Sharp → WebP（SVG 保持原样）
- [x] `image-manifest.json` 生成
- [x] Markdown 中图片路径自动替换为 WebP
- [x] `data/categories.json` 生成
- [x] `data/recent.json` 生成
- [x] `data/tags.json` 生成
- [x] Demo Search Palette（Command Palette 风格，含 Fuse.js 真实搜索）
- [x] Demo Sidebar Toggle（展开/收起）
- [x] Demo Home Page（Hero + Recent + Categories）
- [x] Repository 层
- [x] View 层（HomeView / ArticleView）
- [x] `scripts/dev.js` — 开发模式（chokidar + browser-sync）
- [x] `npm run dev` — 一键启动，自动 watch + rebuild + reload
- [x] `build.js` 导出为可复用函数，dev 和 CLI 共用
- [x] Build Queue（并发控制）+ Debounce（去抖）
- [x] CSS 热注入（修改 CSS 无需整页刷新）

### 后续版本（暂不实现，设计已预留）
- [ ] `.cache/` 图片增量缓存
- [ ] SVG 优化（svgo）
- [ ] 图片 lazy loading
- [ ] Sidebar 状态 localStorage 持久化
- [ ] 暗色主题
- [ ] 多语言
- [ ] 全文 RSS
- [ ] 评论系统集成
