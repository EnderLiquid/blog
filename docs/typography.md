# 全站字体系统

站点不自托管字体，全部依赖系统回退。设计上分三个声部，避免中文正文在小字号下使用衬线。

| 声部 | 令牌 | 用途 | 主要规则 |
| --- | --- | --- | --- |
| 展示 | `--font-serif` | 文章 h1-h3、页面标题、特稿标题、404 | 字重 500/600，行高 1.14-1.2，字距 0 |
| 阅读 | `--font-sans` | 正文、列表、表格、说明段落 | 17-18px，行高 1.9，移动端 1.85，字距 0.01em |
| 机器 | `--font-mono` | 导航、日期、标签、代码、终端、图注、灯箱、Giscus 控件 | 元数据 13px 起，字距 0.02em |

字体栈、字号和行高统一定义在 `app/assets/css/tokens.css`：

```css
--font-serif: 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia,
  'Source Han Serif SC', 'Noto Serif SC', 'Noto Serif CJK SC', 'Songti SC',
  'STSong', SimSun, serif;
--font-sans: 'Source Han Sans SC', 'Noto Sans SC', 'Noto Sans CJK SC',
  'PingFang SC', 'HarmonyOS Sans SC', 'MiSans', system-ui,
  'Microsoft YaHei', sans-serif;
--font-mono: 'Cascadia Code', 'SF Mono', 'SFMono-Regular', Menlo, Consolas,
  'Mono CJK Fallback', ui-monospace, monospace, 'Noto Sans SC',
  'Noto Sans CJK SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
--text-body: clamp(1.0625rem, 0.35vw + 1rem, 1.125rem);
--text-meta: 0.82rem;
--leading-body: 1.9;
--leading-display: 1.18;
--tracking-body: 0.01em;
--tracking-meta: 0.02em;
```

当前实际渲染取系统可用字体。Windows 上常见 Palatino Linotype、Noto Serif SC 或 SimSun，Noto Sans SC 或微软雅黑，Cascadia 或 Consolas；macOS 上常见 Palatino、Songti SC、PingFang SC 和 SF Mono。

`--font-mono` 的顺序是刻意的：命名拉丁等宽在前，`ui-monospace` / `monospace` 之前插一个只覆盖 CJK 码位的本地字族 `Mono CJK Fallback`。这样 Windows 的 generic monospace 不会先用宋体，手机也仍能用系统好看的通用等宽。

## 声明位置

新增或审查字体时，按这张表逐项检查。

| 位置 | 负责 | 读取全局令牌 |
| --- | --- | --- |
| `app/assets/css/tokens.css` | 三套字体栈、字号、行高、字距 | 源头 |
| `app/assets/css/base.css` | `html` 默认等宽，字号调整；`Mono CJK Fallback` 本地字族 | 是 |
| `app/components/article/ArticleBody.vue` | 正文 sans；h1-h3 serif；h4 sans；h5/h6 mono；引文 sans；代码、表格、图注 mono | 是 |
| `app/pages/[locale]/posts/[...articleKeyPath].vue` | 文章标题 serif，导语 sans，元数据 mono | 是 |
| `app/pages/[locale]/posts/index.vue` | 列表页标题 serif，说明 sans | 是 |
| `app/pages/[locale]/index.vue` | 字标 mono，欢迎语 sans，特稿标题 serif，摘要 sans | 是 |
| `app/pages/[locale]/about/index.vue` | 引文 serif，正文 sans，身份和链接 mono | 是 |
| `app/pages/index.vue` | 语言入口标题 serif，说明 sans | 是 |
| `app/components/search/PostSearch.vue` | 结果标题 serif，摘要 sans，状态和日期 mono | 是 |
| `app/components/comments/ArticleComments.vue` | 评论标题 serif，加载文案 sans | 是 |
| `app/components/error/NotFoundView.vue` | 404 标题 serif，说明 sans，状态和按钮 mono | 是 |
| `app/components/content/ProsePre.vue` | 代码块标题栏 mono | 是 |
| `app/components/content/ArticleImageLightbox.vue` | 灯箱界面 mono | 是 |
| `app/components/navigation/SiteNavigation.vue` | 导航 mono；语言图标为 Arial 加 Noto Sans SC 的图标例外 | 部分 |
| `app/components/shell/*` | Shell 和终端继承 mono | 是 |
| `public/giscus-theme.css` | Giscus iframe 的字体副本 | 否，手工同步 |
| `shared/content/diagram.ts` | Mermaid SVG 的 `fontFamily` | 否，手工同步 |
| `public/images/markdown-flow.svg` | 静态示例 SVG 的 `font-family` | 否，手工同步 |
| `scripts/diagrams/fonts.ts`、KaTeX | TikZ 和数学公式字体 | 不参与文本声部 |

Giscus 运行在跨域 iframe 中，Mermaid 和静态 SVG 以 `<img>` 独立加载。这三处都读不到页面的 CSS 变量，修改全局令牌后必须手动同步它们；`giscus-theme.css` 还要复制 `Mono CJK Fallback` 的 `@font-face`。

## 修改规则

- 组件内优先使用 `var(--font-serif)`、`var(--font-sans)`、`var(--font-mono)`，不要复制新的字体栈。
- 正文、文章导语与文章引文用阅读声部，标题与展示性文案用展示声部，等宽只留给界面、元数据和代码。
- 隔离上下文要写完整系统字体栈。
- 修改 Mermaid 渲染配置后，升级 `DIAGRAM_RENDER_CONFIG_VERSION`，并同步 GitHub Actions 的 `diagram-assets-vN` 缓存前缀。只改配置不升版本，文章会继续引用旧 SVG 指纹。
- 修改 `public/giscus-theme.css` 后，本地 Giscus 仍加载生产主题地址，需要部署后强刷验证。
- 提交前至少执行一次：

```bash
rg -n "font-family|fontFamily" app shared public scripts
```

结果应能覆盖上表中的所有位置。新增条目时同步更新本文件。
