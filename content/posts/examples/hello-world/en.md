---
title: The environment is ready
description: A sample article for verifying Nuxt Content, localized routes, and static generation.
publishedAt: 2026-07-12
tags:
  - nuxt
  - blog
draft: false
---

This is the first article of the blog.

## From Markdown to a page

The project now includes **Nuxt 4**, **Nuxt Content**, static page generation, and Pagefind indexing. Articles still only need to be written in Markdown; the build pipeline turns them into directly accessible HTML.

An article URL is determined by its directory and locale filename. This article comes from `content/posts/examples/hello-world/en.md`, so its English page is delivered at `/en/posts/examples/hello-world/`.

> Markdown expresses the content. The page component expresses the reading experience. They should work together without pushing styling details back into every article.

The public pipeline can be summarized as:

1. Write the Markdown body;
2. Let Nuxt Content parse the article and code blocks;
3. Generate locale-prefixed pages with Nuxt;
4. Build a search index for real articles with Pagefind.

![The Markdown article build pipeline](/images/markdown-flow.svg)

### Build-time configuration

The site's content configuration lives in `content.config.ts`. Article metadata is checked by a shared schema while the body keeps the expressive range of Markdown.

```ts [content.config.ts]{2}
const message: string = 'hello, blog'
console.log(message)
```

Code blocks preserve their whitespace and line breaks. Long lines scroll inside the code block instead of forcing the entire article page to become wider than its container.

### Code in different languages

A blog article may involve both Java tooling upstream and embedded code downstream, so syntax highlighting should not be prepared only for TypeScript:

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

| Source | Build stage | Result |
| --- | --- | --- |
| Markdown | Nuxt Content | Body structure |
| Code block | Shiki | Syntax colors |
| Article page | Nitro prerender | Static HTML |
| Static HTML | Pagefind | Client-side search |

---

## Boundaries of an article page

The article header, Markdown body, search index, and comments have different responsibilities:

- Title, description, dates, and tags are article metadata;
- The body is article content;
- Pagefind indexes only real article pages;
- Giscus stays outside the searchable body boundary.

That boundary will remain stable for now. If the site later needs a table of contents, code copying, or an image lightbox, each should be an independent enhancement rather than more template logic pushed into every article.

### Current checklist

- [x] Articles can be generated from Markdown
- [x] Chinese and English use stable article paths
- [x] Code blocks preserve source formatting
- [ ] Add more real articles

The next step is to keep improving article typography so long-form reading, code reading, and bilingual text share the same visual rhythm.
