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

静态产物位于 `.output/public/`。构建同时生成中英文摘要 RSS、Sitemap、robots.txt和Pagefind索引。构建期公开资源拓扑记录在 `.data/site-manifest.json`；文章投递、SEO、RSS、Sitemap、robots和Shell导航分别生成职责独立的消费者投影，浏览器打包 `app/generated/site-article-delivery-index.ts`、`app/generated/site-seo-index.ts` 与 `app/generated/site-shell-index.ts`。开发服务器启动及构建来源变化时会自动刷新这些生成产物。

### Shell终端MVP

有效的本地化页面提供跨SPA导航保持挂载的Shell工作区和粘性顶部导航。桌面端终端可展开并拖动宽度，页面面板被压窄后主导航自动收进汉堡菜单；移动端顶部导航始终可见，通过同一个`>_`按钮在Shell和普通页面之间切换。会话只保留到浏览器刷新前，不写入本地存储。

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

### About个人页

`/zh-cn/about/`和`/en/about/`提供双语个人介绍，并接入顶部导航、Manifest、SEO、Sitemap和Shell虚拟路径`/about/`。页面采用作者扉页式不对称布局，Shell压窄页面或进入移动端时通过容器查询切换为单栏。GitHub与哔哩哔哩公开主页集中定义在`shared/site-definitions/profile.ts`，Logo使用本地内联SVG和`currentColor`适配明暗模式。

### Giscus主题调试

开发和生产环境均使用 `shared/comments/giscus.ts` 中基于 `SITE_ORIGIN` 的已部署主题地址。现代浏览器会阻止 `giscus.app` 跨域iframe读取本机loopback资源，因此 `npm run dev` 不会直接加载本地 `/giscus-theme.css`；修改 `public/giscus-theme.css` 后需要部署，或通过独立的公网HTTPS预览流程验证。

## 内容

文章使用 `content/posts/<articleKeyPath>/<contentLocaleCode>.md` 结构：

```text
content/posts/projects/pi/pi-context/zh-cn.md
content/posts/projects/pi/pi-context/en.md
```

对应 `/zh-cn/posts/projects/pi/pi-context/` 和 `/en/posts/projects/pi/pi-context/`。URL前缀表示界面语言；文章缺少该语言版本时，构建会生成回退投递页面并加载优先级解析器选择的真实正文。正文容器会通过`lang`声明实际内容语言，回退页面不会进入Sitemap、RSS或Pagefind正文索引。`/`仅用于选择语言。Frontmatter格式：

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

`updatedAt` 和 `image` 是可选字段，其他字段必须填写。文章正文语言由文件名唯一决定，Frontmatter不再重复保存 locale；`zh-cn` 和 `en` 是站点统一使用的小写 BCP 47语言代码。`shared/i18n/locales.ts`中的语言注册顺序是唯一网站优先级：用户偏好先进行全部精确匹配，再进行全部模糊匹配，最后按网站优先级fallback。文章路径段和标签统一使用小写 ASCII kebab-case，同一文章的所有语言版本必须使用相同标签集合。`title` 与 `description` 是文章当前唯一编辑来源，页面、SEO和RSS投影有意复用它们，但不会将其复制到站点资源清单中。

### Markdown排版

`app/components/article/ArticleBody.vue`是文章正文的唯一渲染与样式边界；文章路由只负责查询、头部、Pagefind边界和评论挂载。纯样式需求通过该组件内有边界的`:deep()`处理；只有代码块和表格需要额外结构，因此分别覆写`app/components/content/ProsePre.vue`与`ProseTable.vue`。

代码块固定使用深色面板和`github-dark` Shiki主题，避免本站`prefers-color-scheme`机制与Shiki默认`html.dark`类切换产生“浅色Token + 深色背景”。主题和显式加载语言维护在`shared/content/markdown.ts`。长代码与宽表格只在自身容器内横向滚动，不得通过隐藏页面溢出来掩盖布局问题。

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
- `shared/i18n/locales.ts`统一定义`LocaleCode`、网站语言优先级和两轮偏好解析；不再维护独立默认语言。
- URL前缀是界面语言，文章正文语言由构建期Article Delivery投影确定；单语言文章会为其他界面语言生成noindex回退投递页面。
- `shared/site/config.ts` 只定义唯一生产源地址；静态页面SEO和RSS协议配置分别位于 `shared/site-definitions/page-seo.ts` 与 `shared/site-definitions/rss.ts`。
- `shared/site-manifest/` 只负责资源拓扑、关系和构建校验；不保存标题、描述、日期、标签或索引策略。
- `shared/site-projections/` 分别生成预渲染、页面SEO、RSS、Sitemap、robots和Shell导航视图；各消费者不再自行发现站点结构。
- Pagefind 索引在静态生成后产生，完整搜索需使用 `npm run generate` 后的静态预览验证。
- Giscus公开仓库配置和稳定Discussion映射集中在 `shared/comments/giscus.ts`；评论界面跟随界面语言，所有正文投递页面按 `articleKeyPath` 共享评论。
- Shell终端MVP已经接通路径浏览、页面导航、文章搜索、语言切换和Route反映；顶部导航统一提供主页面、语言菜单与终端开关，并根据页面容器宽度切换为汉堡菜单。
- About个人页与主页已经建立正式静态页面视觉样板；Markdown正文已建立第一版正式排版，文章列表与其他页面仍需继续统一。
- `public/giscus-theme.css` 暂时验证了Giscus的字体与明暗配色定制能力，后续会随全站视觉系统继续调整。
- `.npmrc` 使用 npmmirror，以规避当前环境访问 npm 官方源过慢的问题。
