---
title: Markdown 文章编写指南
description: 面向本站作者的 Markdown 写作参考，覆盖基础排版、代码、图片、公式与静态图表。
publishedAt: 2026-08-11
tags:
  - markdown
  - writing
  - blog
draft: false
---

这是一篇可以直接作为模板参考的文章，也是一份覆盖本站文章排版能力的验收样本。写作时优先表达内容和结构；页面会在构建期处理代码高亮、公式、图片与图表，不需要把展示逻辑写进正文。

## 从一份文章文件开始

每篇文章位于 `content/posts/<articleKeyPath>/<localeCode>.md`。目录路径是跨语言共享的文章身份，文件名表示正文语言；例如：

```text
content/posts/notes/my-first-note/zh-cn.md
content/posts/notes/my-first-note/en.md
```

文章开头必须有 Frontmatter。`title`、`description` 与 `publishedAt` 是必填项；标签使用小写 ASCII kebab-case，草稿通过 `draft: true` 排除在公开页面之外。

```yaml
---
title: 一篇文章的标题
description: 供文章列表、搜索结果和订阅源使用的简短摘要。
publishedAt: 2026-08-11
updatedAt: 2026-08-12
tags:
  - markdown
  - writing
draft: false
---
```

## 标题与基础文本

页面会使用文章标题作为唯一的一级标题，因此正文从二级标题开始。按内容层次递进标题，不要为了调节字号跳级。

### 三级标题

段落使用空行分隔。行内可以组合 _强调_、**加粗**、~~删除线~~ 和 `inline code`；也可以使用 <mark>高亮</mark>、H<sub>2</sub>O、2<sup>10</sup>，以及 <kbd>Ctrl</kbd> + <kbd>K</kbd> 这类键盘标记。

#### 四级标题

链接既可以写成 [带说明的链接](https://www.markdownguide.org/)，也可以直接使用 <https://www.markdownguide.org/>。涉及站内页面时优先使用根路径，例如[文章列表](/zh-cn/posts/)。

##### 五级标题

> 引用适合保留原话、结论或需要读者特别注意的上下文。它应该补充正文，而不应替代正常的段落结构。

###### 六级标题

短横线可用于分隔两段相对独立的内容：

---

## 列表与表格

无序列表适合并列事项，缩进两个空格即可形成第二层：

- 先用一句话说明这一组项目的共同目标。
- 每个项目尽量使用相同的语法结构。
  - 第二层项目可以补充前一项。
  - 行内代码仍然保持 `monospace` 字体。

有顺序的步骤应使用有序列表：

1. 新建语言对应的 Markdown 文件。
2. 填写 Frontmatter 并编写正文。
3. 运行内容校验或本地开发服务器。
4. 确认页面后提交发布。

任务列表适合记录尚未完成的写作工作。它用于表达状态，不作为交互控件：

- [x] 明确文章的主题和读者。
- [x] 为图片和图表提供替代文本。
- [ ] 完成校对与链接检查。

表格适合比较结构一致的信息。单元格内容较长或列数较多时，读者可以只在表格区域横向滚动。

| 写作元素 |      推荐写法       |                     适用场景 |
| :------- | :-----------------: | ---------------------------: |
| 标题     |  `##` 至 `######`   |                 组织章节层次 |
| 链接     |    `[说明](URL)`    |             提供可追溯的来源 |
| 代码     | `` `code` `` 或围栏 |       保留命令、标识符和示例 |
| 图片     |    `![alt](src)`    | 补充无法由文字准确表达的信息 |

## 代码与技术片段

短标识符、命令和文件名使用行内代码，例如 `npm run content:check`。多行内容使用代码围栏；注明语言后会获得语法高亮。

```ts [article-metadata.ts]{3,8}
interface ArticleMetadata {
  title: string;
  publishedAt: string;
  tags: string[];
}

const metadata: ArticleMetadata = {
  title: '一篇文章的标题',
  publishedAt: '2026-08-11',
  tags: ['markdown', 'writing'],
};
```

方括号中的文件名和花括号中的行号都是可选的。超长代码行会只在代码块自身内部滚动，不会撑宽整篇文章：

<!-- prettier-ignore -->
```ts
const longLine = '这是一行刻意写得很长的示例代码，用于确认横向滚动被限制在代码块内部，并且不会让文章页面在窄屏上产生额外的水平滚动。';
```

没有对应语言的纯文本也可以使用普通围栏：

```
第一行保持原样。
    缩进和空格同样会保留。
```

## 图片与图注

Markdown 图片必须提供有意义的替代文本。独占段落中的图片默认是块级元素，默认宽度适应正文；点击带替代文本的图片可以打开单图预览。

![Markdown 文章从源文件到静态页面的构建流程](/images/markdown-flow.svg)

图片属性写在图片后的属性块中。下面的示例同时演示定宽、居中、图注、懒加载、异步解码，以及深色主题下替换图源的写法：

![带图注的 Markdown 构建流程](/images/markdown-flow.svg){
width="34rem"
align="center"
caption="图 1：可控制尺寸、对齐方式与图注的块级图片"
loading="lazy"
decoding="async"
dark-src="/images/markdown-flow.svg"
}

行内图片不会中断文字流：构建状态为 ![文章构建状态标记](/images/article-image-marker.svg){layout="inline" width="1em" vertical-align="middle"} 已通过。纯装饰图片使用空替代文本，并显式关闭预览： ![](/images/article-image-marker.svg){layout="inline" width="1em" vertical-align="middle" preview="false"} 。

原始 HTML 的 `<img>` 也会进入同一套图片组件，适合从已有内容迁移；新文章仍优先使用 Markdown 写法：

<img src="/images/markdown-flow.svg" alt="使用 HTML img 元素插入的构建流程图" width="24rem" align="end" preview="false">

块级图片可使用 `width`、`height`、`align`、`caption`、`dark-src`、`loading`、`decoding` 和 `preview`。行内图片使用 `width` 与 `vertical-align`；图注和 `align` 只适用于块级图片。

## 脚注与公式

脚注适合补充不应打断正文的来源或说明。[^content-boundary] 同一篇文章可以有多条脚注，并会在文末自动汇总。

行内公式使用 `$...$`，例如 $E = mc^2$。单独成行的公式使用 `$$...$$`：

$$
\int_0^1 x^2\,\mathrm{d}x = \frac{1}{3}
$$

公式由构建期 KaTeX 处理；较宽的公式只在自身区域内横向滚动。

[^content-boundary]: Frontmatter 描述文章metadata，Markdown正文表达内容；搜索、订阅和页面组件会在构建阶段读取各自需要的信息。

## Mermaid 流程图

`mermaid` 围栏会在构建期变成静态 SVG。它必须提供 `alt`，也支持与块级图片相同的 `caption`、`width`、`align` 和 `preview` 属性。默认 `color-scheme="auto"` 会为浅色和深色页面生成对应图源。

```mermaid alt="文章从 Markdown 源文件到读者页面的构建流程" caption="图 2：构建期转换的 Mermaid 流程图" width="42rem" align="center"
flowchart LR
  source[Markdown 源文件] --> content[Nuxt Content]
  content --> page[静态文章页面]
  page --> reader[读者]
```

图表源码应表达关系本身，不要在浏览器端依赖 Mermaid 运行时或手工嵌入 SVG。

## TikZ 数学图

`tikz` 围栏同样在构建期生成静态 SVG，但必须包含完整的 `\begin{document}` 与 `\end{document}`。下面的示例使用灰色填充，因此固定为 `color-scheme="light"`，让它在深色页面中仍保留浅色画布和足够的对比度。

```tikz alt="带极角标记的单位圆" caption="图 3：固定浅色画布的 TikZ 单位圆" width="26rem" align="center" color-scheme="light"
\begin{document}
\begin{tikzpicture}[scale=2]
  \draw[thick] (0,0) circle (1);
  \fill[gray!30] (0,0) circle (1);
  \draw[->] (-1.3,0) -- (1.3,0) node[right] {$x$};
  \draw[->] (0,-1.3) -- (0,1.3) node[above] {$y$};
  \draw (0,0) -- (60:1.2);
  \draw[->] (0.35,0) arc (0:60:0.35) node[midway, right] {$\theta$};
  \node at (0.5,0.5) {$D$};
\end{tikzpicture}
\end{document}
```

`color-scheme` 可取 `auto`、`light` 或 `dark`。自动模式会随页面主题切换；固定模式只生成一份带背景的 SVG，适合需要稳定纸张色或包含浅灰填充的图。

## 发布前检查

完成文章后，在本地至少执行一次内容校验：

```bash
npm run content:check
```

准备发布时，再运行完整检查与静态生成：

```bash
npm run typecheck
npm run test:unit
npm run generate
```

写作质量最终来自清晰的结构、准确的替代文本、可验证的代码和必要的上下文。Markdown 只是一种表达工具；读者真正需要的是一篇可以顺畅阅读、引用和复查的文章。
