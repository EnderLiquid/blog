---
title: 环境已经就绪
description: 第一篇用于验证 Nuxt Content、多语言路由和静态生成流程的文章。
publishedAt: 2026-07-12
tags:
  - nuxt
  - blog
draft: false
---

这是博客的第一篇文章。

## 从 Markdown 到页面

当前项目已经接通 **Nuxt 4**、**Nuxt Content**、静态页面生成和 Pagefind 索引。文章正文仍然只需要写 Markdown，构建流程会把它变成可以直接访问的 HTML。

文章页面的地址由文章目录和语言文件共同决定。比如这篇文章的正文来源位于 `content/posts/examples/hello-world/zh-cn.md`，中文页面会被投递到 `/zh-cn/posts/examples/hello-world/`。

> Markdown负责表达内容，页面组件负责表达阅读体验。两者应该相互配合，但不应该把样式细节写回每一篇文章。

当前的公开链路可以概括为：

1. 编写 Markdown 正文；
2. Nuxt Content 解析文章和代码块；
3. Nuxt 生成语言前缀页面；
4. Pagefind 为真实文章建立搜索索引。

![Markdown文章构建流程](/images/markdown-flow.svg)

### 构建期配置

站点的内容配置集中在 `content.config.ts`。文章metadata由统一schema校验，正文则保留Markdown本身的表达能力。

```ts [content.config.ts]{2}
const message: string = 'hello, blog'
console.log(message)
```

代码块会保留空格和换行，长行只在代码块内部横向滚动，不应该把整个文章页面撑出水平滚动条。

### 不同语言的代码

博客的文章可能同时涉及Java上游工具和嵌入式下游代码，因此代码高亮不会只为TypeScript准备：

```java [Main.java]
public final class Main {
    public static void main(String[] args) {
        System.out.println("hello, blog");
    }
}
```

```cpp [player.cpp]
#include <Arduino.h>

void setup() {
    Serial.begin(115200);
}
```

| 来源 | 构建阶段 | 最终结果 |
| --- | --- | --- |
| Markdown | Nuxt Content | 正文结构 |
| 代码块 | Shiki | 语法颜色 |
| 文章页面 | Nitro prerender | 静态HTML |
| 静态HTML | Pagefind | 客户端搜索 |

---

## 文章页面的边界

文章头部、Markdown正文、搜索索引和评论区承担不同职责：

- 标题、描述、日期和标签属于文章metadata；
- 正文属于文章内容；
- Pagefind只索引真实文章页面；
- Giscus位于正文搜索边界之外。

这条边界暂时不会改变。后续如果需要增加目录、代码复制或图片灯箱，也应该作为独立增强加入，而不是让每篇文章承担更多模板逻辑。

### 目前的检查清单

- [x] 文章可以由Markdown生成
- [x] 中文和英文使用稳定的文章路径
- [x] 代码块保持源码格式
- [ ] 为文章增加更多真实内容

接下来会继续完善文章排版，让长文阅读、代码阅读和中英文混排都保持同一套视觉节奏。
