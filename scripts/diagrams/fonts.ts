import { readFile } from 'node:fs/promises';
import path from 'node:path';

const nodeTikzjaxDirectory = path.join(process.cwd(), 'node_modules', 'node-tikzjax');
const fontDirectory = path.join(nodeTikzjaxDirectory, 'css', 'bakoma', 'ttf');

/**
 * SVG作为img加载时不会稳定加载外部SVG CSS，因此仅嵌入当前图实际使用的BaKoMa字体。
 * 每个字体以data URI写入SVG，避免浏览器、路径和子路径部署差异。
 */
export async function embedTikzFonts(svg: string): Promise<string> {
  const families = extractTikzFontFamilies(svg);

  if (families.length === 0) {
    return svg;
  }

  const fontFaces = await Promise.all(
    families.map(async (family) => {
      const source = await readFile(path.join(fontDirectory, `${family}.ttf`));
      const encoded = source.toString('base64');

      return `@font-face{font-family:'${family}';src:url(data:font/ttf;base64,${encoded}) format('truetype');}`;
    }),
  );

  return svg.replace(
    /<svg\b[^>]*>/i,
    (root) => `${root}<defs><style>${fontFaces.join('')}</style></defs>`,
  );
}

function extractTikzFontFamilies(svg: string): string[] {
  const families = new Set<string>();
  const pattern = /font-family\s*=\s*(?:"([^"]+)"|'([^']+)')/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(svg))) {
    const family = (match[1] ?? match[2] ?? '').trim();

    if (isBundledTikzFontFamily(family)) {
      families.add(family);
    }
  }

  return [...families].sort();
}

function isBundledTikzFontFamily(value: string): boolean {
  return /^[a-z0-9]+$/i.test(value);
}
