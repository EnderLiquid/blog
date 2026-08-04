import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { MarkdownRoot } from '@nuxt/content';
import { localizeFootnotes } from '../../shared/content/footnotes.ts';
import { validateMarkdownMath } from '../../shared/content/math-validation.ts';
import { describe, test } from 'node:test';
import {
  MARKDOWN_HEADING_ANCHOR_LINKS,
  MARKDOWN_HIGHLIGHT_LANGUAGES,
  MARKDOWN_HIGHLIGHT_THEME,
  MARKDOWN_MATH_REHYPE_PLUGINS,
  MARKDOWN_MATH_REMARK_PLUGINS,
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

  test('关闭所有Markdown标题锚点', () => {
    assert.deepEqual(Object.values(MARKDOWN_HEADING_ANCHOR_LINKS), [
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});

describe('Markdown数学公式配置', () => {
  test('使用构建期KaTeX管线解析美元定界公式并保留MathML', () => {
    assert.equal(MARKDOWN_MATH_REMARK_PLUGINS['remark-math'].options.singleDollarTextMath, true);
    assert.equal(MARKDOWN_MATH_REHYPE_PLUGINS['rehype-katex'].options.output, 'htmlAndMathml');
    assert.equal(MARKDOWN_MATH_REHYPE_PLUGINS['rehype-katex'].options.strict, 'error');
    assert.equal(MARKDOWN_MATH_REHYPE_PLUGINS['rehype-katex'].options.trust, false);
    assert.equal(typeof MARKDOWN_MATH_REHYPE_PLUGINS['strict-katex-errors'].instance, 'function');
    assert.equal(
      MARKDOWN_MATH_REHYPE_PLUGINS['strict-katex-errors'].src,
      '~~/shared/content/strict-katex-errors',
    );
  });

  test('在清单生成前校验行内、块级和错误公式', async () => {
    await assert.doesNotReject(() =>
      validateMarkdownMath(
        '$E = mc^2$\n\n$$\n\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}\n$$',
        'valid-math.md',
      ),
    );

    await assert.rejects(
      () => validateMarkdownMath('$$\\definitelyNotAKaTeXCommand{x}$$', 'invalid-math.md'),
      /Could not render math with KaTeX/,
    );
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

  test('代码和表格组件提供结构化滚动边界并接入统一主题', async () => {
    const prosePre = await readProjectFile('app/components/content/ProsePre.vue');
    const proseTable = await readProjectFile('app/components/content/ProseTable.vue');

    assert.match(prosePre, /article-code-block__label/);
    assert.match(prosePre, /scrollbar-themed/);
    assert.match(prosePre, /<pre[^>]*><slot \/><\/pre>/);
    assert.match(proseTable, /class="article-table-scroll scrollbar-themed"/);
    assert.match(proseTable, /<table>/);
  });

  test('数学公式随文章详情路由加载样式并在自身容器滚动', async () => {
    const articleBody = await readProjectFile('app/components/article/ArticleBody.vue');
    const articlePage = await readProjectFile('app/pages/[locale]/posts/[...articleKeyPath].vue');
    const nuxtConfig = await readProjectFile('nuxt.config.ts');
    const scrollbars = await readProjectFile('app/assets/css/scrollbars.css');

    assert.match(articlePage, /import \{ joinURL \} from 'ufo';/);
    assert.match(articlePage, /joinURL\(runtimeConfig\.app\.baseURL, '_katex\/katex\.min\.css'\)/);
    assert.match(nuxtConfig, /baseURL: '\/_katex'/);
    assert.match(nuxtConfig, /dir: resolve\('node_modules\/katex\/dist'\)/);
    assert.match(
      articlePage,
      /useHead\(\{\n  link: \[\{ href: katexStylesheet, rel: 'stylesheet' \}\],\n\}\);/,
    );
    assert.doesNotMatch(articleBody, /katex\/dist\/katex\.min\.css/);
    assert.match(articleBody, /\.article-body :deep\(\.katex-display\)/);
    assert.match(articleBody, /max-width: 100%;/);
    assert.match(articleBody, /overflow-x: auto;/);
    assert.match(articleBody, /\.katex-display > \.katex/);
    assert.match(scrollbars, /\.article-body \.katex-display::-webkit-scrollbar/);
    assert.match(scrollbars, /\.article-body \.katex-display \{/);
  });

  test('图片组件保留普通链接降级并接入按需灯箱', async () => {
    const articleBody = await readProjectFile('app/components/article/ArticleBody.vue');
    const proseImg = await readProjectFile('app/components/content/ProseImg.vue');
    const messages = await readProjectFile('shared/i18n/messages.ts');

    assert.match(articleBody, /:components="\{ img: 'ProseImg' \}"/);
    assert.match(proseImg, /defineOptions\(\{ inheritAttrs: false \}\)/);
    assert.match(proseImg, /:href="refinedSrc"/);
    assert.match(proseImg, /handlePreviewKeydown/);
    assert.match(proseImg, /import\('v-viewer'\)/);
    assert.match(proseImg, /import\('viewerjs\/dist\/viewer\.css'\)/);
    assert.match(proseImg, /className: 'article-image-viewer'/);
    assert.match(proseImg, /loop: false/);
    assert.match(proseImg, /rotatable: false/);
    assert.match(proseImg, /navbar: false/);
    assert.match(proseImg, /activeViewer\?\.destroy\(\)/);
    assert.match(proseImg, /\.viewer-button:focus\)/);
    assert.match(proseImg, /\.viewer-toolbar > ul > li:focus\)/);
    assert.match(proseImg, /\.viewer-footer\) \{\n  overflow: visible;/);
    assert.match(proseImg, /box-shadow: none;\n  outline: none;/);
    assert.match(messages, /查看图片/);
    assert.match(messages, /View image/);
  });

  test('代码块将高亮与长行保持在同一滚动宽度并提供复制入口', async () => {
    const articleBody = await readProjectFile('app/components/article/ArticleBody.vue');
    const prosePre = await readProjectFile('app/components/content/ProsePre.vue');

    assert.match(articleBody, /\.article-code-block__pre code/);
    assert.match(articleBody, /width: max-content/);
    assert.match(articleBody, /min-width: 100%/);
    assert.match(prosePre, /props\.code/);
    assert.match(prosePre, /navigator\.clipboard\.writeText/);
    assert.match(prosePre, /article-code-block__action-divider/);
    assert.match(prosePre, /<svg/);
    assert.doesNotMatch(prosePre, /copyCodeFailed|is-error/);
    assert.match(prosePre, /article-code-block__copy/);
    assert.match(articleBody, /localizeFootnotes/);
    assert.match(articleBody, /article-footnotes__backref/);
    assert.match(articleBody, /scroll-margin-top: 5rem/);
  });
  test('任务列表使用静态的方形状态标记', async () => {
    const articleBody = await readProjectFile('app/components/article/ArticleBody.vue');

    assert.match(articleBody, /\.task-list-item input\[type='checkbox'\]/);
    assert.match(articleBody, /appearance: none/);
    assert.match(articleBody, /input\[type='checkbox'\]:checked/);
    assert.match(articleBody, /border-color: var\(--signal\)/);
    assert.match(articleBody, /:checked::after/);
    assert.match(articleBody, /pointer-events: none/);
  });
});

describe('GFM脚注投影', () => {
  test('按页面界面语言替换标题和回链说明，同时保持原始树不变', () => {
    const root: MarkdownRoot = {
      type: 'minimark',
      value: [
        [
          'p',
          {},
          '正文引用',
          ['sup', {}, ['a', { href: '#user-content-fn-example', dataFootnoteRef: '' }, '1']],
        ],
        [
          'section',
          { className: ['footnotes'], dataFootnotes: '' },
          ['h2', { className: ['sr-only'], id: 'footnote-label' }, 'Footnotes'],
          [
            'ol',
            {},
            [
              'li',
              { id: 'user-content-fn-example' },
              '脚注正文。 ',
              [
                'a',
                {
                  href: '#user-content-fnref-example',
                  ariaLabel: 'Back to reference 1',
                  className: ['data-footnote-backref'],
                  dataFootnoteBackref: '',
                },
                '↩',
              ],
            ],
          ],
        ],
      ],
    };

    const localized = localizeFootnotes(root, {
      footnotes: '脚注',
      backToReference: (reference) => `返回第${reference}处引用`,
    });
    const localizedTree = JSON.stringify(localized);

    assert.match(localizedTree, /article-footnotes__title/);
    assert.match(localizedTree, /脚注/);
    assert.match(localizedTree, /article-footnotes__reference/);
    assert.match(localizedTree, /article-footnotes__item/);
    assert.match(localizedTree, /article-footnotes__backref/);
    assert.match(localizedTree, /返回第1处引用/);
    assert.doesNotMatch(localizedTree, /sr-only|Back to reference/);
    assert.match(JSON.stringify(root), /sr-only|Back to reference 1/);
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
