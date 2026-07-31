import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';
import {
  MARKDOWN_HIGHLIGHT_LANGUAGES,
  MARKDOWN_HIGHLIGHT_THEME,
} from '../../shared/content/markdown.ts';

const readProjectFile = (relativePath: string): Promise<string> =>
  readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

describe('Markdown代码高亮配置', () => {
  test('固定使用与深色代码面板匹配的Shiki主题', () => {
    assert.equal(MARKDOWN_HIGHLIGHT_THEME, 'github-dark');
  });

  test('加载Shiki全部规范语言ID并覆盖博客常用语言', () => {
    assert.ok(MARKDOWN_HIGHLIGHT_LANGUAGES.length >= 200);

    for (const language of ['typescript', 'vue', 'java', 'kotlin', 'c', 'cpp', 'python']) {
      assert.ok(MARKDOWN_HIGHLIGHT_LANGUAGES.includes(language));
    }
  });
});

describe('文章正文组件边界', () => {
  test('ArticleBody独立承担ContentRenderer和Markdown深层样式', async () => {
    const articleBody = await readProjectFile('app/components/article/ArticleBody.vue');
    const articlePage = await readProjectFile('app/pages/[locale]/posts/[...articleKeyPath].vue');

    assert.match(articleBody, /<ContentRenderer class="article-body"/);
    assert.match(articleBody, /\.article-body :deep\(h2\)/);
    assert.match(articlePage, /<ArticleBody class="article-content" :value="post"/);
    assert.doesNotMatch(articlePage, /article-content :deep\(pre\)/);
  });

  test('代码和表格组件提供结构化滚动边界', async () => {
    const prosePre = await readProjectFile('app/components/content/ProsePre.vue');
    const proseTable = await readProjectFile('app/components/content/ProseTable.vue');

    assert.match(prosePre, /article-code-block__filename/);
    assert.match(prosePre, /<pre[^>]*><slot \/><\/pre>/);
    assert.match(proseTable, /class="article-table-scroll"/);
    assert.match(proseTable, /<table>/);
  });
});

describe('Markdown排版验收文章', () => {
  test('双语hello-world覆盖代码、表格、引用和图片', async () => {
    for (const localeCode of ['zh-cn', 'en']) {
      const markdown = await readProjectFile(`content/posts/examples/hello-world/${localeCode}.md`);

      assert.match(markdown, /> .+/);
      assert.match(markdown, /```ts \[content\.config\.ts\]\{2\}/);
      assert.match(markdown, /```java \[Main\.java\]/);
      assert.match(markdown, /\| [-]+ \| [-]+ \| [-]+ \|/);
      assert.match(markdown, /!\[[^\]]+\]\(\/images\/markdown-flow\.svg\)/);
    }
  });
});
