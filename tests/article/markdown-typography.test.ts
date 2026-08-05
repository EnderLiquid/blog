import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { MarkdownRoot } from '@nuxt/content';
import { localizeFootnotes } from '../../shared/content/footnotes.ts';
import { validateMarkdownImages } from '../../shared/content/image-validation.ts';
import { validateMarkdownMath } from '../../shared/content/math-validation.ts';
import normalizeArticleImages from '../../shared/content/normalize-article-images.ts';
import { parseMarkdown } from '@nuxtjs/mdc/runtime';
import { describe, test } from 'node:test';
import {
  MARKDOWN_HEADING_ANCHOR_LINKS,
  MARKDOWN_HIGHLIGHT_LANGUAGES,
  MARKDOWN_HIGHLIGHT_THEME,
  MARKDOWN_IMAGE_REHYPE_PLUGINS,
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

describe('Markdown图片配置', () => {
  test('注册图片结构归一化插件', () => {
    assert.equal(
      typeof MARKDOWN_IMAGE_REHYPE_PLUGINS['normalize-article-images'].instance,
      'function',
    );
    assert.equal(
      MARKDOWN_IMAGE_REHYPE_PLUGINS['normalize-article-images'].src,
      '~~/shared/content/normalize-article-images',
    );
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

  test('KaTeX样式与rehype-katex的渲染版本一致', async () => {
    const packageJson = JSON.parse(await readProjectFile('package.json')) as {
      dependencies: Record<string, string>;
    };
    const katexCss = await readProjectFile('node_modules/katex/dist/katex.min.css');

    assert.equal(packageJson.dependencies.katex, '0.16.47');
    assert.match(katexCss, /\.katex \.sizing\.reset-size6\.size3/);
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

describe('统一图片Markdown构建链', () => {
  const imageParserOptions = {
    rehype: {
      plugins: {
        'normalize-article-images': {
          instance: normalizeArticleImages,
        },
      },
    },
  } as const;

  test('将独占Markdown图片提升为块级article-image节点，并保留图注和尺寸属性', async () => {
    const parsed = await parseMarkdown(
      '![系统流程](/images/flow.svg){width="42rem" align="center" caption="图 1：系统流程"}',
      imageParserOptions,
    );
    const image = parsed.body.children[0];

    assert.deepEqual(image, {
      type: 'element',
      tag: 'article-image',
      props: {
        alt: '系统流程',
        align: 'center',
        caption: '图 1：系统流程',
        layout: 'block',
        src: '/images/flow.svg',
        width: '42rem',
      },
      children: [],
    });
  });

  test('将独立原始HTML图片也归一化为块级节点', async () => {
    const parsed = await parseMarkdown(
      '<img src="/images/flow.svg" alt="原始HTML流程" width="320">',
      imageParserOptions,
    );
    const image = parsed.body.children[0];

    assert.equal(image?.tag, 'article-image');
    assert.equal(image?.props?.layout, 'block');
    assert.equal(image?.props?.width, 320);
  });

  test('将文字段落中的图片保持为行内节点，并保留纵向对齐属性', async () => {
    const parsed = await parseMarkdown(
      '文字前 ![状态图标](/images/status.svg){width="1em" vertical-align="middle"} 文字后。',
      imageParserOptions,
    );
    const paragraph = parsed.body.children[0];

    assert.equal(paragraph?.tag, 'p');
    const image = paragraph?.children?.[1];
    assert.equal(image?.tag, 'img');
    assert.equal(image?.props?.layout, 'inline');
    assert.equal(image?.props?.width, '1em');
    assert.equal(image?.props?.['vertical-align'], 'middle');
  });

  test('校验图片排版冲突、替代文本和静态布尔属性', async () => {
    await assert.doesNotReject(() =>
      validateMarkdownImages(
        '![深色流程图](/images/flow-light.svg){dark-src="/images/flow-dark.svg" preview="false"}',
        'valid-image.md',
      ),
    );
    await assert.doesNotReject(() =>
      validateMarkdownImages(
        '<img src="https://cdn.example.com/icon.svg" alt="HTTPS图片">',
        'https.md',
      ),
    );
    await assert.doesNotReject(() =>
      validateMarkdownImages('<img src="http://localhost/icon.svg" alt="HTTP图片">', 'http.md'),
    );

    await assert.rejects(
      () =>
        validateMarkdownImages(
          '![图标](/images/icon.svg){layout="inline" caption="不应出现的图注"}',
          'inline-caption.md',
        ),
      /caption只能用于block图片/,
    );
    await assert.rejects(
      () => validateMarkdownImages('<img src="/images/icon.svg">', 'missing-alt.md'),
      /图片必须提供alt属性/,
    );
    await assert.rejects(
      () => validateMarkdownImages('![](/images/icon.svg){preview="true"}', 'empty-alt.md'),
      /alt为空的装饰图片不能打开灯箱预览/,
    );
    await assert.rejects(
      () =>
        validateMarkdownImages('![独立图](/images/icon.svg){layout="inline"}', 'block-inline.md'),
      /独立段落中的图片不能使用inline布局/,
    );
    await assert.rejects(
      () =>
        validateMarkdownImages(
          '文字 ![图标](/images/icon.svg){align="center"} 文字',
          'inline-align.md',
        ),
      /align只能用于block图片/,
    );
    await assert.rejects(
      () => validateMarkdownImages('<img src="javascript:alert(1)" alt="危险图">', 'unsafe-src.md'),
      /图片地址不安全/,
    );
    await assert.rejects(
      () =>
        validateMarkdownImages(
          '<img src="data:image/png;base64,AA==" alt="内嵌图">',
          'data-src.md',
        ),
      /图片地址不安全/,
    );
    await assert.rejects(
      () =>
        validateMarkdownImages(
          '<img src="//cdn.example.com/icon.svg" alt="协议相对图">',
          'protocol-relative.md',
        ),
      /图片地址不安全/,
    );
  });
});

describe('文章正文组件边界', () => {
  test('ArticleBody独立承担ContentRenderer和Markdown深层样式', async () => {
    const articleBody = await readProjectFile('app/components/article/ArticleBody.vue');
    const articlePage = await readProjectFile('app/pages/[locale]/posts/[...articleKeyPath].vue');

    assert.match(articleBody, /<ContentRenderer\s+class="article-body"/);
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

  test('统一图片组件保留灯箱能力，并支持块级、行内和深色图源', async () => {
    const articleBody = await readProjectFile('app/components/article/ArticleBody.vue');
    const articleImage = await readProjectFile('app/components/content/ArticleImage.vue');
    const messages = await readProjectFile('shared/i18n/messages.ts');

    assert.match(articleBody, /img: 'ArticleImage'/);
    assert.match(articleBody, /'article-image': 'ArticleImage'/);
    assert.match(articleBody, /article-image--block/);
    assert.match(articleBody, /article-image--inline/);
    assert.match(articleBody, /article-image-vertical-align/);
    assert.match(articleImage, /defineOptions\(\{ inheritAttrs: false \}\)/);
    assert.match(articleImage, /previewEnabled/);
    assert.match(articleImage, /handlePreviewKeydown/);
    assert.match(articleImage, /imageElement\.value\?\.currentSrc/);
    assert.match(articleImage, /darkSrc/);
    assert.match(articleImage, /<figcaption v-if="hasCaption">/);
    assert.match(articleImage, /import\('v-viewer'\)/);
    assert.match(articleImage, /import\('viewerjs\/dist\/viewer\.css'\)/);
    assert.match(articleImage, /className: 'article-image-viewer'/);
    assert.match(articleImage, /loop: false/);
    assert.match(articleImage, /rotatable: false/);
    assert.match(articleImage, /navbar: false/);
    assert.match(articleImage, /activeViewer\?\.destroy\(\)/);
    assert.match(articleImage, /\.viewer-button:focus\)/);
    assert.match(articleImage, /\.viewer-toolbar > ul > li:focus\)/);
    assert.match(articleImage, /\.viewer-footer\) \{\n  overflow: visible;/);
    assert.match(articleImage, /box-shadow: none;\n  outline: none;/);
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
