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

静态产物位于 `.output/public/`。构建同时生成中英文摘要 RSS、Sitemap、robots.txt和Pagefind索引。构建期公开资源拓扑记录在 `.data/site-manifest.json`；SEO、RSS、Sitemap、robots和Shell导航分别生成职责独立的消费者投影，浏览器打包 `app/generated/site-seo-index.ts` 与 `app/generated/site-shell-index.ts`。开发服务器启动及构建来源变化时会自动刷新这些生成产物。

### Shell终端MVP

有效的本地化页面左侧提供跨SPA导航保持挂载的Shell工作区。桌面端可展开并拖动宽度，窄屏通过按钮在Shell和普通页面之间切换。会话只保留到浏览器刷新前，不写入本地存储。

MVP命令：

```text
help
pwd
url
ls [path]
cd <path>
search [query]
lang <zh-cn|en>
clear
```

Shell将当前语言目录投影为虚拟根，例如公开地址`/zh-cn/posts/`在Shell中显示为`/posts/`。`ls`和`cd`只消费构建期导航投影；普通页面仍然独立工作。Shell导航通过待处理意图与最终Route对账，不依赖Vue Router内部History状态。MVP不提供Shell内的`back`和`forward`，浏览器工具栏的前进和后退仍会反映到Shell历史。

### Giscus主题调试

开发和生产环境均使用 `shared/comments/giscus.ts` 中基于 `SITE_ORIGIN` 的已部署主题地址。现代浏览器会阻止 `giscus.app` 跨域iframe读取本机loopback资源，因此 `npm run dev` 不会直接加载本地 `/giscus-theme.css`；修改 `public/giscus-theme.css` 后需要部署，或通过独立的公网HTTPS预览流程验证。

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

`updatedAt` 和 `image` 是可选字段，其他字段必须填写。文章语言由文件名唯一决定，Frontmatter不再重复保存 locale；`zh-cn` 和 `en` 是站点统一使用的小写 BCP 47语言代码。文章路径段和标签统一使用小写 ASCII kebab-case，同一文章的所有语言版本必须使用相同标签集合。`title` 与 `description` 是文章当前唯一编辑来源，页面、SEO和RSS投影有意复用它们，但不会将其复制到站点资源清单中。

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

- 已接通文章内容、全站语言前缀、静态生成、摘要 RSS、Sitemap、robots.txt、Giscus评论，以及 `/<locale>/posts/` 中的跨语言 Pagefind 搜索。
- URL 是页面语言的唯一来源；`shared/i18n/locales.ts` 统一定义 `LocaleCode` 及严格、兼容两套匹配逻辑。
- `shared/site/config.ts` 只定义唯一生产源地址；静态页面SEO和RSS协议配置分别位于 `shared/site-definitions/page-seo.ts` 与 `shared/site-definitions/rss.ts`。
- `shared/site-manifest/` 只负责资源拓扑、关系和构建校验；不保存标题、描述、日期、标签或索引策略。
- `shared/site-projections/` 分别生成预渲染、页面SEO、RSS、Sitemap、robots和Shell导航视图；各消费者不再自行发现站点结构。
- Pagefind 索引在静态生成后产生，完整搜索需使用 `npm run generate` 后的静态预览验证。
- Giscus公开仓库配置和稳定Discussion映射集中在 `shared/comments/giscus.ts`；中英文版本按 `articleKeyPath` 共享评论。
- Shell终端MVP已经接通路径浏览、页面导航、文章搜索、语言切换、Route反映、桌面分栏和移动端切换；完整首页交互和正式视觉方案仍待设计。
- `public/giscus-theme.css` 暂时验证了Giscus的字体与明暗配色定制能力，正式视觉方案仍待设计。
- `.npmrc` 使用 npmmirror，以规避当前环境访问 npm 官方源过慢的问题。
