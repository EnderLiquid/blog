# Blog

基于 Nuxt 4、Nuxt Content、Pagefind 和 GitHub Pages 的个人博客。

## 开发

当前项目要求 Node.js 24.11 或更高版本。

```bash
npm install
npm run dev
```

常用命令：

```bash
npm run format          # 使用 Prettier 格式化代码
npm run format:check    # 检查代码格式
npm run site:manifest   # 生成并校验统一站点资源清单
npm run content:check   # 兼容命令，同样生成并校验站点清单
npm run test:unit       # 运行清单、语言和机器文件纯函数测试
npm run typecheck       # 生成清单后执行类型检查
npm run generate        # 生成清单、静态站点及 Pagefind 索引
npm run preview         # 预览 Nuxt 构建结果
```

静态产物位于 `.output/public/`。构建同时生成中英文摘要 RSS、Sitemap、robots.txt和Pagefind索引。构建期公开页面与机器资源统一记录在 `.data/site-manifest.json`；浏览器只打包由它派生的SEO投影，不加载完整清单。开发服务器启动及内容变化时会自动刷新这两份生成产物。

## 内容

文章使用 `content/posts/<articleKeyPath>/<locale>.md` 结构：

```text
content/posts/projects/pi/pi-context/zh-cn.md
content/posts/projects/pi/pi-context/en.md
```

对应 `/zh-cn/posts/projects/pi/pi-context/` 和 `/en/posts/projects/pi/pi-context/`。语言是全站 URL 前缀，`/` 仅用于选择语言。Frontmatter 格式：

```yaml
---
title: 文章标题
description: 文章摘要
publishedAt: 2026-07-12
updatedAt: 2026-07-20
tags:
  - nuxt
image:
  src: /images/posts/example/cover.webp
  alt: 文章封面说明
draft: false
---
```

`updatedAt` 和 `image` 是可选字段，其他字段必须填写。文章语言由文件名唯一决定，Frontmatter不再重复保存 locale；`zh-cn` 和 `en` 是站点统一使用的小写 BCP 47语言代码。文章路径段和标签统一使用小写 ASCII kebab-case，同一文章的所有语言版本必须使用相同标签集合。

## GitHub Pages

`.github/workflows/deploy-pages.yml` 会在 `main` 分支更新时执行格式检查、单元测试、站点清单生成、类型检查、静态生成、Pagefind索引和部署。

公开仓库使用 `EnderLiquid/blog`，生产地址固定为 `https://blog.enderliquid.top`。创建并推送仓库后：

1. 在仓库设置中将 Pages 的 Source 设为 **GitHub Actions**；
2. 将 Custom domain 设置为 `blog.enderliquid.top`；
3. 在域名服务商添加 `blog CNAME enderliquid.github.io`；
4. 证书签发后启用 **Enforce HTTPS**。

项目使用自定义 GitHub Actions工作流，不需要提交 `CNAME` 文件。

机器入口：

```text
https://blog.enderliquid.top/zh-cn/rss.xml
https://blog.enderliquid.top/en/rss.xml
https://blog.enderliquid.top/sitemap.xml
https://blog.enderliquid.top/robots.txt
```

## 当前边界

- 已接通文章内容、全站语言前缀、静态生成、摘要 RSS、Sitemap、robots.txt，以及 `/<locale>/posts/` 中的跨语言 Pagefind 搜索。
- URL 是页面语言的唯一来源；`shared/i18n/locales.ts` 统一定义 `LocaleCode` 及严格、兼容两套匹配逻辑。
- `shared/site/config.ts` 是生产源地址和本地化站点metadata的唯一配置来源。
- `shared/site-manifest/` 负责资源模型、构建校验和消费者视图；Nuxt预渲染、页面SEO、RSS、Sitemap和robots不再各自发现站点结构。
- Pagefind 索引在静态生成后产生，完整搜索需使用 `npm run generate` 后的静态预览验证。
- 尚未实现主页 Shell 和 Giscus。Giscus 需要先确定 GitHub 仓库及 Discussions 配置。
- `.npmrc` 使用 npmmirror，以规避当前环境访问 npm 官方源过慢的问题。
