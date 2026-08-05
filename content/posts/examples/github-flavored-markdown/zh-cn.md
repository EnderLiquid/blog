---
title: GitHub Flavored Markdown 样式测试
description: 基于 GitHub Flavored Markdown 测试 README 的完整排版验收文章。
publishedAt: 2026-08-03
tags:
  - markdown
  - gfm
  - testing
draft: false
---

> 本文前半部分复制自 [suan/github-flavored-markdown-test](https://github.com/suan/github-flavored-markdown-test/blob/master/README.md)，用于本站 GitHub Flavored Markdown 基础排版验收；文末补充本站扩展功能的验收样本。

### This README can be used as a reference for github-flavored-markdown styling (and possibly behavior).

---

# H1
followed by some text

## H2
followed by some text

### H3
followed by some text

#### H4
followed by some text

##### H5
followed by some text

###### H6
followed by some text

Auto-detected link: http://www.france.com

Some Ignored_multiple_underscore_italics here

A line of normal text with `inline code` and *italics*, **strong font**, and even some μ†ℱ ╋ℯ╳╋. Followed by lots of Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis id sem purus, eu commodo tortor. Donec malesuada ultricies dolor a eleifend. In hac habitasse platea dictumst. Vivamus a faucibus ligula. Nullam molestie tristique arcu, eu elementum metus ultricies sed. Aenean luctus congue lectus, vitae semper erat rhoncus non. Nulla facilisi.

Followed by another line of normal text with `inline code` and *italics*, **strong font**, and even some μ†ℱ ╋ℯ╳╋. Followed by lots of Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis id sem purus, eu commodo tortor. Donec malesuada ultricies dolor a eleifend. In hac habitasse platea dictumst. Vivamus a faucibus ligula. Nullam molestie tristique arcu, eu elementum metus ultricies sed. Aenean luctus congue lectus, vitae semper erat rhoncus non. Nulla facilisi.

Thin horizontal rule:

--

Thick horizontal rule:

------

|Table Header 1|Table Header 2           |
|--------------|-------------------------|
|Content       |http://example.org       |
|Content       |http://localhost:\<port\>|
Text right below table. Follows is a table with an empty cell, and unaligned indenting.

|Table Header 1|Table Header 2|
|--------------|--------------|
|Content  |  Cntent        |
|Content       |      |

Empty line between table and this text

    def this_is
      puts "some #{4-space-indent} code"
    end

<code>
def this_is
  puts "some #{code tag} code"
end
</code>

<pre>
def this_is
  puts "some #{pre tag} code"
end
</pre>

```
def this_is
  puts "some #{fenced} code"
end
```

```ruby
class Classy
  def this_is
    puts "some #{colored} ruby code with ruby syntax highlighting"
    @someobj.do_it(1, 2)
  end
end
```

```javascript
var test = function this_is(){
  console.log("some" + colored + "javascript code with javascript syntax highlighting really long");
}
```

```clojure
(defproject myproject "0.5.0-SNAPSHOT"
  :description "Some clojure code with syntax highlighting."
  :dependencies [[org.clojure/clojure "1.5.1"]]
  :plugins [[lein-tar "3.2.0"]])
```

```js
var test = function this_is(){
  console.log("language declared as 'js' instead");
}
```

```bogus_language
var test = function this_is(){
  console.log("language declared as bogus_language");
}
```

> here is blockquote

[Relative image link](afu.png)

---

## 本站扩展验收

这一节用于验证文章详情页在基础 GFM 之外提供的阅读体验。数学公式和 Mermaid 图表会在对应功能接入后，以本节内容作为最终验收样本。

### 扩展文字与列表

这里包含 ~~删除线~~、<mark>高亮文字</mark>、H<sub>2</sub>O、2<sup>10</sup>，以及 <kbd>Ctrl</kbd> + <kbd>K</kbd> 这类键盘按键标记。

- [x] 已完成的任务应保持清晰但不过分抢眼。
- [ ] 未完成的任务应与已完成项有可辨识的状态差异。
- 嵌套列表应维持稳定的缩进节奏。
  - 第二层项目。
  - 第二层中的 `inline code`。

### 带元数据的代码块

```ts [acceptance.ts]{2,4,11}
interface AcceptanceResult {
  passed: boolean;
  features: string[];
}

const result: AcceptanceResult = {
  passed: true,
  features: ['filename', 'highlighted lines', 'horizontal scrolling'],
};

const longLine = 'This deliberately long source line verifies that horizontal scrolling stays inside the code block and never expands the article page beyond its container.';
```

这段代码同时检验文件名、语言名、指定高亮行，以及超长代码行在代码块内部滚动的表现。

### 图片与灯箱

![Markdown文章构建流程：从Markdown源文件经Nuxt Content生成文章页面](/images/markdown-flow.svg)

图片应保留替代文本、在窄屏内缩放且不撑破正文宽度。图片灯箱接入后，点击此图应能打开预览，并可通过键盘关闭。

### 统一图片排版

![定宽且靠起点对齐的文章构建流程](/images/markdown-flow.svg){
  width="34rem"
  align="start"
  caption="图 1：定宽块级图片与可见图注"
}

上图验证块级图片的定宽、起点对齐和图注。图注不能写在行内图片上；关闭预览时仍应保留图注：

![关闭灯箱的居中图片](/images/markdown-flow.svg){
  width="28rem"
  align="center"
  caption="图 2：不创建灯箱入口的图注图片"
  preview="false"
}

行内图片不应打断文字流：状态为 ![图片排版验收标记](/images/article-image-marker.svg){
  width="1em"
  vertical-align="middle"
} 已验证。这个图标仍可通过键盘打开单图灯箱。

![深色模式图片源验收](/images/markdown-flow.svg){
  dark-src="/images/markdown-flow.svg"
  width="30rem"
  align="end"
}

装饰图标不应创建灯箱入口： ![](/images/article-image-marker.svg){
  layout="inline"
  width="1em"
  vertical-align="middle"
  preview="false"
} 。

### 脚注

脚注引用应在行文中保持低干扰，并能跳转到文末说明。[^gfm-extension]

同一段落也可以引用第二个脚注。[^multiline-footnote]

[^gfm-extension]: 本站将 GFM 作为文章的基础语法，并在其上增加适合长文阅读的组件与交互。

[^multiline-footnote]: 多行脚注用于验证较长说明的排版。

    这一段是同一条脚注的续行内容，并包含 `inline code`。

### 数学公式

行内公式：$E = mc^2$，以及 $\int_0^1 x^2\,\mathrm{d}x = \frac{1}{3}$。

块级公式：

$$
\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}
$$

超宽块级公式应只在公式区域横向滚动：

$$
\mathbf{v} = \begin{bmatrix} v_{1,1} & v_{1,2} & v_{1,3} & v_{1,4} & v_{1,5} & v_{1,6} & v_{1,7} & v_{1,8} & v_{1,9} & v_{1,10} & v_{1,11} & v_{1,12} \end{bmatrix}^{\mathsf{T}}
$$

公式功能接入后，应正确排版行内与块级公式，并在小屏幕上保持可读性。

### Mermaid 图表

```mermaid
flowchart LR
  markdown[Markdown source] --> parser[Nuxt Content]
  parser --> renderer[Article renderer]
  renderer --> reader[Reader]
```

Mermaid 功能接入后，这个代码块应渲染为流程图，并适应明暗主题和窄屏容器。
