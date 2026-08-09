import { access, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIAGRAM_FONT_ASSET_VERSION } from '../../shared/content/diagram.ts';

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

/** 保留TikZJax与BaKoMa许可证，同时移除早期外部字体CSS迁移留下的无用字体副本。 */
export async function ensureTikzFontLicenses(assetDirectory: string): Promise<void> {
  const licensesDirectory = path.join(assetDirectory, 'licenses');
  const versionPath = path.join(licensesDirectory, '.asset-version');

  if (await hasExpectedLicenses(versionPath, licensesDirectory)) {
    return;
  }

  await rm(licensesDirectory, { recursive: true, force: true });
  await mkdir(licensesDirectory, { recursive: true });
  await copyFile(
    path.join(nodeTikzjaxDirectory, 'LICENSE'),
    path.join(licensesDirectory, 'node-tikzjax-LICENSE'),
  );
  await copyFile(
    path.join(nodeTikzjaxDirectory, 'css', 'bakoma', 'LICENCE'),
    path.join(licensesDirectory, 'bakoma-LICENCE'),
  );
  await writeFile(versionPath, `${DIAGRAM_FONT_ASSET_VERSION}\n`, 'utf8');
  await rm(path.join(assetDirectory, 'fonts'), { recursive: true, force: true });
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

async function hasExpectedLicenses(
  versionPath: string,
  licensesDirectory: string,
): Promise<boolean> {
  try {
    const [version] = await Promise.all([
      readFile(versionPath, 'utf8'),
      access(path.join(licensesDirectory, 'node-tikzjax-LICENSE')),
      access(path.join(licensesDirectory, 'bakoma-LICENCE')),
    ]);

    return version.trim() === DIAGRAM_FONT_ASSET_VERSION;
  } catch {
    return false;
  }
}

function isBundledTikzFontFamily(value: string): boolean {
  return /^[a-z0-9]+$/i.test(value);
}
