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
npm run content:check  # 校验文章目录、语言并生成路由清单
npm run typecheck      # 类型检查
npm run generate       # 静态生成并建立 Pagefind 索引
npm run preview        # 预览 Nuxt 构建结果
```

静态产物位于 `.output/public/`。

## 内容

文章使用 `content/posts/<articleKeyPath>/<locale>.md` 结构：

```text
content/posts/projects/pi/pi-context/zh-cn.md
content/posts/projects/pi/pi-context/en.md
```

对应 `/posts/projects/pi/pi-context/zh-cn/` 和 `/posts/projects/pi/pi-context/en/`。Frontmatter 格式：

```yaml
---
title: 文章标题
description: 文章摘要
locale: zh-CN
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

`updatedAt` 和 `image` 是可选字段，其他字段必须填写。文件名 `zh-cn.md` 对应 `locale: zh-CN`，`en.md` 对应 `locale: en`；文章路径段统一使用小写 ASCII kebab-case。

## GitHub Pages

`.github/workflows/deploy-pages.yml` 会在 `main` 分支更新时执行类型检查、静态生成、Pagefind 索引和部署。

创建 GitHub 仓库后，在仓库设置中将 Pages 的 Source 设为 **GitHub Actions**。自定义域名确定后，再配置 DNS 和 GitHub Pages 域名。

## 当前边界

- 已接通文章内容、文章路由、静态生成和 Pagefind 索引。
- 尚未实现搜索界面、主页 Shell 和 Giscus。Giscus 需要先确定 GitHub 仓库及 Discussions 配置。
- `.npmrc` 使用 npmmirror，以规避当前环境访问 npm 官方源过慢的问题。
