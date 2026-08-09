import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Element, Root } from 'hast';
import { VFile } from 'vfile';
import {
  createDiagramAssetExpectation,
  createDiagramFence,
  createEmptyDiagramAssetManifest,
  findDiagramAssetEntry,
  parseDiagramAssetManifest,
  scanMarkdownDiagrams,
  type DiagramAssetManifest,
  type DiagramFence,
  DIAGRAM_VARIANTS,
} from '../../shared/content/diagram.ts';
import renderDiagramFences from '../../shared/content/diagram-rehype.ts';
import { assertSafeDiagramSvg, themeTikzSvg } from '../../shared/content/diagram-svg.ts';
import { maskMarkdownFrontmatter } from '../../shared/content/frontmatter.ts';
import normalizeArticleImages from '../../shared/content/normalize-article-images.ts';
import { embedTikzFonts } from '../../scripts/diagrams/fonts.ts';

function createManifest(fence: DiagramFence): DiagramAssetManifest {
  const expectation = createDiagramAssetExpectation(fence);
  const manifest = createEmptyDiagramAssetManifest();

  manifest.assets[expectation.identity] = {
    kind: fence.kind,
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

  return manifest;
}

describe('静态图表围栏', () => {
  test('通过MDAST扫描Mermaid与TikZ，并保留原始文章位置', async () => {
    const markdown = [
      '---',
      'title: 图表样本',
      '---',
      '',
      '```mermaid alt="构建流程" width="42rem" align="center"',
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
          presentation: { alt: '构建流程', width: '42rem', align: 'center' },
        },
        {
          kind: 'tikz',
          position: { line: 10, column: 3 },
          presentation: { alt: '坐标图', preview: false },
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
  });

  test('指纹忽略围栏末尾换行，但会区分源码和主题变体', () => {
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
      meta: 'alt="另一个说明"',
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

    assert.ok(base && lineEndingVariant && changedSource);
    const baseExpectation = createDiagramAssetExpectation(base);
    const lineEndingExpectation = createDiagramAssetExpectation(lineEndingVariant);
    const changedExpectation = createDiagramAssetExpectation(changedSource);

    assert.equal(baseExpectation.identity, lineEndingExpectation.identity);
    assert.notEqual(baseExpectation.identity, changedExpectation.identity);
    assert.notEqual(
      baseExpectation.variants.light.fingerprint,
      baseExpectation.variants.dark.fingerprint,
    );
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
            code: `${fence.source}\n`,
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
    });
  });

  test('清单拒绝伪造文件名，并按图表身份匹配两个主题变体', () => {
    const fence = createDiagramFence({
      kind: 'tikz',
      source: '\\begin{document}\\end{document}',
      meta: 'alt="TikZ图"',
      sourcePath: 'example.md',
      position: { line: 1, column: 1 },
    });

    assert.ok(fence);
    const manifest = createManifest(fence);
    const expectation = createDiagramAssetExpectation(fence);

    assert.equal(findDiagramAssetEntry(manifest, expectation)?.kind, 'tikz');
    assert.throws(
      () =>
        parseDiagramAssetManifest({
          ...manifest,
          assets: {
            ...manifest.assets,
            [expectation.identity]: {
              ...manifest.assets[expectation.identity],
              light: {
                ...manifest.assets[expectation.identity]?.light,
                file: '../unsafe.svg',
              },
            },
          },
        }),
      /变体无效/,
    );
  });
});

describe('静态SVG安全边界', () => {
  test('TikZ默认墨色随主题映射，显式蓝色保留', () => {
    const source =
      '<svg viewBox="0 0 10 10"><path stroke="#000"/><path stroke="#00f"/><text>x</text></svg>';
    const dark = themeTikzSvg(source, 'dark');

    assert.match(dark, /fill="#e2dfd2"/);
    assert.match(dark, /stroke="#e2dfd2"/);
    assert.match(dark, /stroke="#00f"/);
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

test('图表资产清单始终包含light与dark变体', () => {
  const variants = new Set(DIAGRAM_VARIANTS);

  assert.deepEqual(variants, new Set(['light', 'dark']));
});
