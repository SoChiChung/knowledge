# Knowledge Base Generator

Markdown 知识库静态站生成器。将本地 Markdown 知识库构建为 GitHub Pages 可直接部署的静态站点。

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（实时预览, 自动刷新）
npm run dev

# 生产构建
npm run build

# 构建输出在 public/ 目录，可直接部署到 GitHub Pages
```

---

## 开发模式 vs 生产模式

| | 开发模式 | 生产模式 |
|---|---|---|
| 命令 | `npm run dev` | `npm run build` |
| 用途 | 本地写作，实时预览 | 部署到 GitHub Pages |
| 构建 | 启动时首次 Build，文件变化自动 Rebuild | 执行一次 Build |
| 服务器 | BrowserSync（`localhost:3000`） | 无（纯静态文件） |
| 浏览器 | 自动打开，修改后自动刷新 | 手动打开 `public/index.html` |
| CSS 修改 | 热注入（无需整页刷新） | — |

**切换方式**：开发模式下，切换到底部终端按 `Ctrl+C` 停止 dev server，然后运行 `npm run build` 生成生产文件。两者使用完全相同的构建逻辑和输出目录 `public/`。

### 开发模式详解

```bash
npm run dev
```

启动后自动完成：

1. **首次 Build** — 扫描 knowledge/、处理图片、解析 Markdown、生成 JSON
2. **启动 BrowserSync** — 在 `localhost:3000` 托管 `public/` 目录
3. **打开浏览器** — 自动显示站点
4. **开始监听**：

   | 文件变化 | 动作 |
   |---------|------|
   | `knowledge/` 下的 `.md` / 图片 | 自动 Rebuild → 浏览器刷新 |
   | `demo/` 下的 `.html` / `.js` | 浏览器整页刷新 |
   | `demo/` 下的 `.css` | CSS 热注入（不刷新页面，即时生效） |
   | `scripts/` 下的 `.js` | 自动 Rebuild → 浏览器刷新 |

整个过程无需人工操作。写完 Markdown 按 `Ctrl+S`，浏览器自动显示最新结果。

---

## 知识库编写规范

### 一篇文章一个目录（推荐）

每篇文章是一个**独立的目录**，文章正文文件名为 `index.md`，图片放在同目录下的 `assets/` 中。

```
knowledge/
│
├── AI/
│   └── LLM/
│       ├── Prompt/              ← 目录名 = 文章 slug
│       │   ├── index.md         ← 文章正文（必须）
│       │   └── assets/          ← 文章图片（可选）
│       │       ├── cover.png
│       │       └── diagram.png
│       │
│       └── Claude/
│           ├── index.md
│           └── assets/
│               └── cover.png
│
├── Football/
│   ├── Arsenal/
│   │   ├── index.md
│   │   └── assets/
│   │       └── squad.jpg
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

**为什么推荐这种结构？**

文章的所有资源（正文、图片）都在一个目录内。移动文章、复制文章、删除文章时，图片不会丢失或错位。

### 兼容旧格式（扁平 .md 文件）

如果不想用目录结构，也可以直接把 `.md` 文件放在分类目录下：

```
knowledge/
├── AI/
│   ├── Prompt.md           ← 直接放 .md 文件，不建子目录
│   └── Claude.md
```

构建脚本同时支持两种格式，可以混用。

### 目录如何映射为 URL

```
knowledge/AI/LLM/Prompt/index.md  →  #/ai/llm/prompt
knowledge/AI/Prompt.md            →  #/ai/prompt
knowledge/Football/Arsenal/       →  #/football/arsenal
```

规则：取相对于 `knowledge/` 的路径，去掉末尾 `index.md` 或 `.md`，全部转为小写，用 `/` 分隔。

---

## 插图放在哪里

### 文章插图

图片放在**文章目录下的 `assets/` 子目录**：

```
Prompt/
├── index.md
└── assets/
    ├── cover.png       ← 封面图
    ├── screenshot.png  ← 正文插图
    └── diagram.png
```

### 在 Markdown 中引用图片

直接用相对路径引用 `assets/` 下的文件：

```markdown
![Cover](assets/cover.png)

![Screenshot](assets/screenshot.png)

![Diagram](assets/diagram.png)
```

### 图片处理流程（自动）

构建时会自动执行：

1. **扫描** `assets/` 下的所有图片（支持 png / jpg / jpeg / gif / webp）
2. **计算 Hash** 判断文件是否有变化
3. **转换 WebP** — 自动压缩，限制最大宽度（默认 1200px），质量 85%
4. **SVG 保持原样** — 矢量图不做格式转换
5. **输出到 `public/assets/`** — 路径结构与知识库目录一致
6. **Markdown 中的引用自动替换** — `assets/screenshot.png` 变为 `assets/ai/llm/prompt/screenshot.webp`

作者只需要截图、放进 `assets/`、写 Markdown。其他全部自动完成。

### 封面图

封面图会自动检测。优先级：

1. **FrontMatter 指定** — `cover: cover.png`
2. **自动检测** — 构建时查找 `assets/` 下是否有名为 `cover` 的图片（png / jpg / webp）

```yaml
---
title: Prompt Engineering
tags:
  - GPT
  - Claude
cover: cover.png    # 指定封面图（相对于文章目录）
---
```

### 全局图片（站点级）

放在 `knowledge/` 根目录，例如：

```
knowledge/
├── hero-bg.png          ← 首页 Hero 背景图
├── favicon.png
└── AI/
    └── ...
```

在 `scripts/config.js` 中配置 Hero 背景图：

```js
hero: {
  title: "Knowledge Base",
  subtitle: "Personal notes, thoughts, and references.",
  cover: "hero-bg.png"   // 相对于 knowledge/ 的路径
}
```

---

## FrontMatter 参考

每篇文章的 `index.md` 顶部使用 YAML FrontMatter：

```yaml
---
title: 文章标题          # 必填，同时也是浏览器标签页标题
tags:                    # 可选，用于搜索和标签聚合
  - GPT
  - Claude
  - LLM
type: page               # page（默认）或 project
cover: cover.png         # 可选，封面图文件名（相对于文章目录）
github: https://...      # 可选，type=project 时显示
demo: https://...        # 可选，type=project 时显示
---

# 正文从这里开始

支持标准 Markdown 语法。
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | string | 文件名 | 文章标题 |
| `tags` | string[] | `[]` | 标签列表 |
| `type` | `"page"` \| `"project"` | `"page"` | 文章类型 |
| `cover` | string\|null | null | 封面图文件名 |
| `github` | string\|null | null | GitHub 链接 |
| `demo` | string\|null | null | 在线 Demo 链接 |

---

## 站点配置

编辑 `scripts/config.js` 修改站点信息：

```js
export default {
  // 站点元信息
  siteName: "Knowledge Base",
  siteDescription: "Personal knowledge base powered by Markdown",

  // 首页 Hero
  hero: {
    title: "Knowledge Base",
    subtitle: "Personal notes, thoughts, and references.",
    cover: null            // 背景图路径，相对于 knowledge/
  },

  // 图片处理
  imageQuality: 85,        // WebP 质量 (0-100)
  imageMaxWidth: 1200,     // 最大宽度

  // GitHub 链接（Header 右上角按钮）
  github: "https://github.com",

  // 近期文章条数
  recentLimit: 10,

  // 开发模式
  dev: {
    port: 3000,            // 本地服务器端口
    debounceMs: 300,       // 文件变化去抖间隔
    browser: true          // 是否自动打开浏览器
  }
};
```

修改后重新运行 `npm run dev` 或 `npm run build` 即可生效。

---

## 构建输出

```
public/
├── index.html              # 入口页面
├── style.css               # 样式
├── app.js                  # 前端逻辑
├── data/
│   ├── site.json           # 站点配置
│   ├── tree.json           # 目录树（Folder/Page 无限层级）
│   ├── search.json         # 搜索索引（Fuse.js 兼容）
│   ├── image-manifest.json # 图片处理清单
│   ├── recent.json         # 最近更新
│   ├── categories.json     # 分类统计
│   ├── tags.json           # 标签统计
│   └── pages/              # 每页一个 JSON（含 TOC）
│       └── ai/
│           └── llm/
│               └── prompt.json
└── assets/                 # 处理后的 WebP 图片
    └── ai/
        └── llm/
            └── prompt/
                └── cover.webp
```

---

## Demo 模式

Demo 模式使用写死的数据，无需构建即可预览页面 UI：

```bash
# 直接用浏览器打开 demo/index.html
# 或
npx http-server demo -p 3001 -c-1
```

Demo 的 HTML / CSS / JS 结构与正式版完全一致，切换方式：将 `app.js` 中的 `var provider = StaticDataProvider` 替换为 `JsonDataProvider`。

---

## 技术栈

- **构建**: Node.js + fast-glob + fs-extra + gray-matter + markdown-it (anchor) + sharp
- **开发**: chokidar + browser-sync
- **前端**: 原生 HTML / CSS / JS，BEM 命名，Provider → Repository → Renderer → View 四层架构
- **部署**: GitHub Pages + GitHub Actions

完整设计文档见 [design.md](design.md)。

## License

MIT
