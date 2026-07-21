/**
 * config.js — 项目统一配置中心
 *
 * 所有构建模块和前端 Demo 均从此读取配置。
 * 构建时 build.js 将站点元信息写入 data/site.json。
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

  // 首页 Hero（写入 data/site.json）
  hero: {
    title: "每一条笔记\n都在帮助\n下一次思考。",
    subtitle: "记录、整理、沉淀，每一次思考都值得被再次翻阅\r\n把零散的知识，整理成可以反复阅读的答案。",
    cover: "./hero-bg.png"            // Hero 背景图路径 (相对于 knowledge/，如 "hero-bg.png")
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
    debounceMs: 300,       // 文件变化去抖间隔
    browser: true          // 是否自动打开浏览器
  }
};
