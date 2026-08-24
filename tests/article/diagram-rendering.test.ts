import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Element, Root } from 'hast';
import { VFile } from 'vfile';
import {
  createDiagramAssetExpectation,
  createDiagramFence,
  createEmptyDiagramAssetManifest,
  findDiagramAssetEntry,
  getDiagramEntryAssets,
  getDiagramRendererConfig,
  parseDiagramAssetManifest,
  resolveDiagramAppearance,
  resolveFixedDiagramAppearance,
  scanMarkdownDiagrams,
  type DiagramAssetManifest,
  type DiagramFence,
  DIAGRAM_VARIANTS,
} from '../../shared/content/diagram.ts';
import renderDiagramFences from '../../shared/content/diagram-rehype.ts';
import {
  addSvgCanvasBackground,
  assertSafeDiagramSvg,
  themeTikzSvg,
} from '../../shared/content/diagram-svg.ts';
import { maskMarkdownFrontmatter } from '../../shared/content/frontmatter.ts';
import normalizeArticleImages from '../../shared/content/normalize-article-images.ts';
import { embedTikzFonts } from '../../scripts/diagrams/fonts.ts';

function createManifest(fence: DiagramFence): DiagramAssetManifest {
  const expectation = createDiagramAssetExpectation(fence);
  const manifest = createEmptyDiagramAssetManifest();

  if (expectation.colorScheme === 'auto') {
    manifest.assets[expectation.identity] = {
      kind: fence.kind,
      colorScheme: 'auto',
      light: {
        fingerprint: expectation.variants.light.fingerprint,
        file: expectation.variants.light.file,
        contentDigest: 'a'.repeat(64),
      },
      dark: {
        fingerprint: expectation.variants.dark.fingerprint,
        file: expectation.variants.dark.file,
        contentDigest: 'b'.repeat(64),
      },
    };
  } else {
    manifest.assets[expectation.identity] = {
      kind: fence.kind,
      colorScheme: expectation.colorScheme,
      fixed: {
        fingerprint: expectation.fixed.fingerprint,
        file: expectation.fixed.file,
        contentDigest: 'c'.repeat(64),
      },
    };
  }

  return manifest;
}

describe('静态图表围栏', () => {
  test('通过MDAST扫描Mermaid与TikZ，并保留原始文章位置', async () => {
    const markdown = [
      '---',
      'title: 图表样本',
      '---',
      '',
      '```mermaid alt="构建流程" width="42rem" align="center" color-scheme="light"',
      'flowchart LR',
      '  A --> B',
      '```',
      '',
      '> ```tikz alt="坐标图" preview="false"',
      '> \\begin{document}',
      '> \\begin{tikzpicture}\\end{tikzpicture}',
      '> \\end{document}',
      '> ```',
    ].join('\n');
    const diagrams = await scanMarkdownDiagrams(
      maskMarkdownFrontmatter(markdown),
      'examples/diagram.md',
    );

    assert.equal(diagrams.length, 2);
    assert.deepEqual(
      diagrams.map((diagram) => ({
        kind: diagram.kind,
        position: diagram.position,
        presentation: diagram.presentation,
      })),
      [
        {
          kind: 'mermaid',
          position: { line: 5, column: 1 },
          presentation: { alt: '构建流程', colorScheme: 'light', width: '42rem', align: 'center' },
        },
        {
          kind: 'tikz',
          position: { line: 10, column: 3 },
          presentation: { alt: '坐标图', colorScheme: 'auto', preview: false },
        },
      ],
    );
  });

  test('严格校验图表元数据，拒绝空替代文本和未知属性', async () => {
    await assert.rejects(
      () => scanMarkdownDiagrams('```mermaid\nflowchart LR\n```', 'missing-alt.md'),
      /必须提供非空alt属性/,
    );
    await assert.rejects(
      () =>
        scanMarkdownDiagrams(
          '```tikz alt="图" layout="inline"\n\\begin{document}\\end{document}\n```',
          'unknown-property.md',
        ),
      /不是支持的图表属性/,
    );
    await assert.rejects(
      () =>
        scanMarkdownDiagrams(
          '```mermaid alt="图" preview="sometimes"\nflowchart LR\n```',
          'invalid-preview.md',
        ),
      /preview必须是true或false/,
    );
    await assert.rejects(
      () =>
        scanMarkdownDiagrams(
          '```tikz alt="图" color-scheme="paper"\n\\begin{document}\\end{document}\n```',
          'invalid-color-scheme.md',
        ),
      /color-scheme必须是auto、light或dark/,
    );
  });

  test('指纹忽略围栏末尾换行，并区分源码、页面变体和固定配色', () => {
    const base = createDiagramFence({
      kind: 'mermaid',
      source: 'flowchart LR\n  A --> B',
      meta: 'alt="流程"',
      sourcePath: 'diagram.md',
      position: { line: 1, column: 1 },
    });
    const lineEndingVariant = createDiagramFence({
      kind: 'mermaid',
      source: 'flowchart LR\r\n  A --> B\r\n',
      meta: 'alt="另一个说明" color-scheme="auto"',
      sourcePath: 'other.md',
      position: { line: 1, column: 1 },
    });
    const changedSource = createDiagramFence({
      kind: 'mermaid',
      source: 'flowchart LR\n  A --> C',
      meta: 'alt="流程"',
      sourcePath: 'diagram.md',
      position: { line: 1, column: 1 },
    });
    const fixedLight = createDiagramFence({
      kind: 'mermaid',
      source: 'flowchart LR\n  A --> B',
      meta: 'alt="流程" color-scheme="light"',
      sourcePath: 'diagram.md',
      position: { line: 1, column: 1 },
    });
    const fixedDark = createDiagramFence({
      kind: 'mermaid',
      source: 'flowchart LR\n  A --> B',
      meta: 'alt="流程" color-scheme="dark"',
      sourcePath: 'diagram.md',
      position: { line: 1, column: 1 },
    });

    assert.ok(base && lineEndingVariant && changedSource && fixedLight && fixedDark);
    const baseExpectation = createDiagramAssetExpectation(base);
    const lineEndingExpectation = createDiagramAssetExpectation(lineEndingVariant);
    const changedExpectation = createDiagramAssetExpectation(changedSource);
    const fixedLightExpectation = createDiagramAssetExpectation(fixedLight);
    const fixedDarkExpectation = createDiagramAssetExpectation(fixedDark);

    assert.equal(baseExpectation.colorScheme, 'auto');
    assert.equal(fixedLightExpectation.colorScheme, 'light');
    assert.equal(fixedDarkExpectation.colorScheme, 'dark');

    if (
      baseExpectation.colorScheme !== 'auto' ||
      fixedLightExpectation.colorScheme === 'auto' ||
      fixedDarkExpectation.colorScheme === 'auto'
    ) {
      throw new Error('图表资产期望的配色方案与测试输入不一致');
    }

    assert.equal(baseExpectation.identity, lineEndingExpectation.identity);
    assert.notEqual(baseExpectation.identity, changedExpectation.identity);
    assert.notEqual(baseExpectation.identity, fixedLightExpectation.identity);
    assert.notEqual(fixedLightExpectation.identity, fixedDarkExpectation.identity);
    assert.notEqual(
      baseExpectation.variants.light.fingerprint,
      baseExpectation.variants.dark.fingerprint,
    );
    assert.match(fixedLightExpectation.fixed.file, /^[a-f0-9]{64}\.fixed\.svg$/);
    assert.match(fixedDarkExpectation.fixed.file, /^[a-f0-9]{64}\.fixed\.svg$/);
    assert.notEqual(
      fixedLightExpectation.fixed.fingerprint,
      fixedDarkExpectation.fixed.fingerprint,
    );
    assert.deepEqual(resolveDiagramAppearance('auto', 'dark'), {
      palette: 'dark',
      canvas: 'transparent',
    });
    assert.deepEqual(resolveDiagramAppearance('light', 'dark'), {
      palette: 'light',
      canvas: 'paper',
    });
    assert.deepEqual(resolveFixedDiagramAppearance('light'), {
      palette: 'light',
      canvas: 'paper',
    });
  });

  test('Merman主题变量使用有效调色板，而画布由静态SVG处理器统一注入', () => {
    const automaticDark = getDiagramRendererConfig('mermaid', 'dark', 'auto');
    const fixedLightInDarkPage = getDiagramRendererConfig('mermaid', 'dark', 'light');
    const automaticTheme = automaticDark.themeVariables as Record<string, unknown>;
    const fixedLightTheme = fixedLightInDarkPage.themeVariables as Record<string, unknown>;

    assert.equal(automaticDark.backgroundColor, 'transparent');
    assert.equal(fixedLightInDarkPage.backgroundColor, 'transparent');
    assert.equal(automaticTheme.primaryColor, '#22231f');
    assert.equal(automaticTheme.primaryTextColor, '#e2dfd2');
    assert.equal(fixedLightTheme.primaryColor, '#e9e5d8');
    assert.equal(fixedLightTheme.primaryTextColor, '#252720');
  });
});

describe('静态图表资产清单与rehype转换', () => {
  test('匹配清单后将代码围栏替换为受统一图片契约校验的article-image', () => {
    const fence = createDiagramFence({
      kind: 'mermaid',
      source: 'flowchart LR\n  A --> B',
      meta: 'alt="构建流程" caption="图 1：构建流程" width="42rem" align="center"',
      sourcePath: 'example.md',
      position: { line: 3, column: 1 },
    });

    assert.ok(fence);
    const manifest = createManifest(fence);
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {
            language: 'mermaid',
            code: 'flowchart LR\r\n  A --> B\r\n',
            meta: 'alt="构建流程" caption="图 1：构建流程" width="42rem" align="center"',
          },
          children: [],
          position: {
            start: { line: 3, column: 1, offset: 0 },
            end: { line: 6, column: 4, offset: 56 },
          },
        },
      ],
    };
    const file = new VFile({ path: 'example.md' });

    renderDiagramFences({ manifest })(tree, file);
    normalizeArticleImages()(tree, file);

    const image = tree.children[0] as Element;
    const expectation = createDiagramAssetExpectation(fence);

    if (expectation.colorScheme !== 'auto') {
      throw new Error('自动配色围栏错误地产生固定资源期望');
    }

    assert.equal(image.tagName, 'article-image');
    assert.deepEqual(image.properties, {
      alt: '构建流程',
      src: `/_diagram-assets/${expectation.variants.light.file}`,
      'dark-src': `/_diagram-assets/${expectation.variants.dark.file}`,
      layout: 'block',
      caption: '图 1：构建流程',
      width: '42rem',
      align: 'center',
      loading: 'lazy',
      decoding: 'async',
      'data-diagram-kind': 'mermaid',
      'diagram-source': fence.source,
    });
  });

  test('固定配色图表只投影一个SVG图源，不生成dark-src', () => {
    const fence = createDiagramFence({
      kind: 'tikz',
      source: '\\begin{document}\\end{document}',
      meta: 'alt="固定浅色TikZ图" color-scheme="light"',
      sourcePath: 'fixed-example.md',
      position: { line: 2, column: 1 },
    });

    assert.ok(fence);
    const manifest = createManifest(fence);
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {
            language: 'tikz',
            code: `${fence.source}\n`,
            meta: 'alt="固定浅色TikZ图" color-scheme="light"',
          },
          children: [],
          position: {
            start: { line: 2, column: 1, offset: 0 },
            end: { line: 4, column: 4, offset: 40 },
          },
        },
      ],
    };
    const file = new VFile({ path: 'fixed-example.md' });

    renderDiagramFences({ manifest })(tree, file);
    normalizeArticleImages()(tree, file);

    const expectation = createDiagramAssetExpectation(fence);

    if (expectation.colorScheme === 'auto') {
      throw new Error('固定配色围栏错误地产生自动资源期望');
    }

    const entry = manifest.assets[expectation.identity];
    assert.ok(entry && entry.colorScheme !== 'auto');
    assert.deepEqual(
      getDiagramEntryAssets(entry).map((asset) => asset.file),
      [expectation.fixed.file],
    );

    const image = tree.children[0] as Element;
    assert.deepEqual(image.properties, {
      alt: '固定浅色TikZ图',
      src: `/_diagram-assets/${expectation.fixed.file}`,
      layout: 'block',
      loading: 'lazy',
      decoding: 'async',
      'data-diagram-kind': 'tikz',
      'diagram-source': fence.source,
    });
    assert.equal('dark-src' in image.properties, false);
  });

  test('关闭预览的图表不向文章内容投影源码', () => {
    const fence = createDiagramFence({
      kind: 'mermaid',
      source: 'flowchart LR\n  A --> B',
      meta: 'alt="不预览的构建流程" preview="false"',
      sourcePath: 'preview-disabled.md',
      position: { line: 2, column: 1 },
    });

    assert.ok(fence);
    const manifest = createManifest(fence);
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {
            language: 'mermaid',
            code: `${fence.source}\n`,
            meta: 'alt="不预览的构建流程" preview="false"',
          },
          children: [],
        },
      ],
    };
    const file = new VFile({ path: 'preview-disabled.md' });

    renderDiagramFences({ manifest })(tree, file);
    normalizeArticleImages()(tree, file);

    const image = tree.children[0] as Element;
    assert.equal(image.properties.preview, false);
    assert.equal('diagram-source' in image.properties, false);
  });

  test('清单拒绝伪造文件名和与配色方案不匹配的资源形态', () => {
    const automaticFence = createDiagramFence({
      kind: 'tikz',
      source: '\\begin{document}\\end{document}',
      meta: 'alt="TikZ图"',
      sourcePath: 'example.md',
      position: { line: 1, column: 1 },
    });
    const fixedFence = createDiagramFence({
      kind: 'tikz',
      source: '\\begin{document}\\end{document}',
      meta: 'alt="固定TikZ图" color-scheme="dark"',
      sourcePath: 'fixed-example.md',
      position: { line: 1, column: 1 },
    });

    assert.ok(automaticFence && fixedFence);
    const automaticManifest = createManifest(automaticFence);
    const fixedManifest = createManifest(fixedFence);
    const automaticExpectation = createDiagramAssetExpectation(automaticFence);
    const fixedExpectation = createDiagramAssetExpectation(fixedFence);

    if (automaticExpectation.colorScheme !== 'auto' || fixedExpectation.colorScheme === 'auto') {
      throw new Error('图表资产期望的配色方案与测试输入不一致');
    }

    const automaticEntry = automaticManifest.assets[automaticExpectation.identity];
    const fixedEntry = fixedManifest.assets[fixedExpectation.identity];

    if (
      !automaticEntry ||
      automaticEntry.colorScheme !== 'auto' ||
      !fixedEntry ||
      fixedEntry.colorScheme === 'auto'
    ) {
      throw new Error('图表资产清单的配色方案与测试输入不一致');
    }

    assert.equal(findDiagramAssetEntry(automaticManifest, automaticExpectation)?.kind, 'tikz');
    assert.equal(findDiagramAssetEntry(fixedManifest, fixedExpectation)?.kind, 'tikz');
    assert.throws(
      () =>
        parseDiagramAssetManifest({
          ...automaticManifest,
          assets: {
            ...automaticManifest.assets,
            [automaticExpectation.identity]: {
              ...automaticEntry,
              light: {
                ...automaticEntry.light,
                file: '../unsafe.svg',
              },
            },
          },
        }),
      /light资源无效/,
    );
    assert.throws(
      () =>
        parseDiagramAssetManifest({
          ...automaticManifest,
          assets: {
            ...automaticManifest.assets,
            [automaticExpectation.identity]: {
              ...automaticEntry,
              fixed: automaticEntry.light,
            },
          },
        }),
      /与配色方案不匹配/,
    );
    assert.throws(
      () =>
        parseDiagramAssetManifest({
          ...fixedManifest,
          assets: {
            ...fixedManifest.assets,
            [fixedExpectation.identity]: {
              ...fixedEntry,
              light: fixedEntry.fixed,
            },
          },
        }),
      /与配色方案不匹配/,
    );
  });
});

describe('静态SVG安全边界', () => {
  test('TikZ默认墨色随有效调色板映射，显式蓝色保留', () => {
    const source =
      '<svg viewBox="0 0 10 10"><path stroke="#000"/><path stroke="#00f"/><text>x</text></svg>';
    const dark = themeTikzSvg(source, resolveDiagramAppearance('auto', 'dark'));

    assert.match(dark, /fill="#e2dfd2"/);
    assert.match(dark, /stroke="#e2dfd2"/);
    assert.match(dark, /stroke="#00f"/);
  });

  test('固定图表使用完整viewBox的内部画布，并锁定默认墨色', () => {
    const source =
      '<svg viewBox="-2 -3 10 12"><defs><style>.shape{stroke:#000}</style></defs><path class="shape" fill="#d9d9d9"/></svg>';
    const fixedLightInLightPage = themeTikzSvg(source, resolveDiagramAppearance('light', 'light'));
    const fixedLightInDarkPage = themeTikzSvg(source, resolveDiagramAppearance('light', 'dark'));
    const fixedDarkInLightPage = themeTikzSvg(source, resolveDiagramAppearance('dark', 'light'));
    const automaticDark = themeTikzSvg(source, resolveDiagramAppearance('auto', 'dark'));

    assert.equal(fixedLightInLightPage, fixedLightInDarkPage);
    assert.match(fixedLightInDarkPage, /fill="#252720"/);
    assert.match(
      fixedLightInDarkPage,
      /<rect x="-2" y="-3" width="10" height="12" fill="#e9e5d8"\/>/,
    );
    assert.match(fixedDarkInLightPage, /fill="#e2dfd2"/);
    assert.match(
      fixedDarkInLightPage,
      /<rect x="-2" y="-3" width="10" height="12" fill="#22231f"\/>/,
    );
    assert.ok(fixedLightInDarkPage.indexOf('</defs><rect') < fixedLightInDarkPage.indexOf('<path'));
    assert.doesNotMatch(automaticDark, /<rect\b/);
    assert.doesNotThrow(() => assertSafeDiagramSvg(fixedLightInDarkPage, 'tikz'));
  });

  test('画布注入支持没有defs的SVG，并拒绝无效viewBox', () => {
    const withoutDefinitions = addSvgCanvasBackground(
      '<svg viewBox="0 0 4 5"><path/></svg>',
      '#22231f',
    );

    assert.match(
      withoutDefinitions,
      /<svg viewBox="0 0 4 5"><rect x="0" y="0" width="4" height="5" fill="#22231f"\/>/,
    );
    assert.throws(
      () => addSvgCanvasBackground('<svg viewBox="0 0 0 5"><path/></svg>', '#22231f'),
      /有效viewBox/,
    );
  });

  test('仅嵌入当前TikZ SVG实际使用的BaKoMa字体，避免图片文档请求外部CSS', async () => {
    const embedded = await embedTikzFonts(
      '<svg viewBox="0 0 10 10"><text font-family="cmmi10">x</text></svg>',
    );

    assert.match(embedded, /font-family:'cmmi10'/);
    assert.match(embedded, /data:font\/ttf;base64,/);
    assert.doesNotMatch(embedded, /fonts\/fonts\.css|@import/);
    assert.doesNotThrow(() => assertSafeDiagramSvg(embedded, 'tikz'));
  });

  test('拒绝活跃元素、事件属性和外部资源，仅允许TikZ内嵌字体数据', () => {
    assert.doesNotThrow(() =>
      assertSafeDiagramSvg(
        '<svg viewBox="0 0 10 10"><defs><style>@font-face{src:url(data:font/ttf;base64,AA==)}</style></defs><path fill="none"/></svg>',
        'tikz',
      ),
    );
    assert.throws(
      () => assertSafeDiagramSvg('<svg viewBox="0 0 1 1"><script/></svg>', 'mermaid'),
      /动态或HTML嵌入元素/,
    );
    assert.throws(
      () =>
        assertSafeDiagramSvg(
          '<svg viewBox="0 0 1 1"><image href="https://example.com/image.svg"/></svg>',
          'mermaid',
        ),
      /外部资源/,
    );
    assert.throws(
      () =>
        assertSafeDiagramSvg('<svg viewBox="0 0 1 1"><path onclick="alert(1)"/></svg>', 'mermaid'),
      /事件处理属性/,
    );
    assert.throws(
      () =>
        assertSafeDiagramSvg(
          '<svg viewBox="0 0 1 1"><style>@import "https://example.com/style.css";</style></svg>',
          'mermaid',
        ),
      /@import/,
    );
  });
});

test('自动图表资产使用light与dark页面变体', () => {
  const variants = new Set(DIAGRAM_VARIANTS);

  assert.deepEqual(variants, new Set(['light', 'dark']));
});
