import { copyFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  createDiagramAssetExpectation,
  createEmptyDiagramAssetManifest,
  findDiagramAssetEntry,
  parseDiagramAssetManifest,
  scanMarkdownDiagrams,
  sha256,
  type DiagramAssetEntry,
  type DiagramAssetExpectation,
  type DiagramAssetManifest,
  type DiagramFence,
  type DiagramKind,
  type DiagramVariant,
  DIAGRAM_VARIANTS,
} from '../../shared/content/diagram.ts';
import { assertSafeDiagramSvg } from '../../shared/content/diagram-svg.ts';
import { maskMarkdownFrontmatter } from '../../shared/content/frontmatter.ts';
import { MermaidRenderError, renderMermaidDiagram } from './merman.ts';
import { TikzRenderError, renderTikzDiagram } from './tikz.ts';
import { ensureMermanCli } from './toolchain.ts';

const LOCK_WAIT_MILLISECONDS = 100;
const LOCK_TIMEOUT_MILLISECONDS = 10 * 60 * 1000;
const STALE_LOCK_MILLISECONDS = 20 * 60 * 1000;

const activePreparations = new Map<string, Promise<DiagramPreparationResult>>();

export interface DiagramPreparationResult {
  diagramCount: number;
  renderedDiagramCount: number;
  renderedVariantCount: number;
  reusedDiagramCount: number;
}

interface ExpectedDiagram {
  fence: DiagramFence;
  expectation: DiagramAssetExpectation;
}

/**
 * 准备所有文章的静态图表资产。无论由本地、Nuxt钩子还是CI调用，均执行同一套扫描和指纹校验。
 */
export function prepareDiagramAssets(
  projectRoot = process.cwd(),
): Promise<DiagramPreparationResult> {
  const normalizedRoot = path.resolve(projectRoot);
  const active = activePreparations.get(normalizedRoot);

  if (active) {
    return active;
  }

  const preparation = prepareDiagramAssetsLocked(normalizedRoot).finally(() => {
    activePreparations.delete(normalizedRoot);
  });
  activePreparations.set(normalizedRoot, preparation);

  return preparation;
}

async function prepareDiagramAssetsLocked(projectRoot: string): Promise<DiagramPreparationResult> {
  const dataDirectory = path.join(projectRoot, '.data');
  const assetDirectory = path.join(dataDirectory, 'diagram-assets');
  const lockDirectory = path.join(dataDirectory, 'diagram-assets.lock');

  await mkdir(dataDirectory, { recursive: true });

  return await withPreparationLock(lockDirectory, async () => {
    await mkdir(assetDirectory, { recursive: true });
    const expected = await collectExpectedDiagrams(projectRoot);
    const previousManifest = await readExistingManifest(assetDirectory);
    const stagingDirectory = await createStagingDirectory(dataDirectory);

    try {
      const nextManifest = createEmptyDiagramAssetManifest();
      const renderedFiles = new Map<string, string>();
      const errors: string[] = [];
      let renderedDiagramCount = 0;
      let reusedDiagramCount = 0;
      let mermanBinary: string | undefined;

      for (const diagram of [...expected.values()].sort(compareExpectedDiagram)) {
        const reusableEntry = await findReusableEntry(previousManifest, diagram, assetDirectory);

        if (reusableEntry) {
          nextManifest.assets[diagram.expectation.identity] = reusableEntry;
          reusedDiagramCount += 1;
          continue;
        }

        try {
          const svgByVariant = await renderDiagram(diagram.fence, async () => {
            if (diagram.fence.kind !== 'mermaid') {
              return undefined;
            }

            mermanBinary ??= await ensureMermanCli(projectRoot);
            return mermanBinary;
          });
          const entry = await stageDiagramAssets(
            diagram,
            svgByVariant,
            stagingDirectory,
            renderedFiles,
          );

          nextManifest.assets[diagram.expectation.identity] = entry;
          renderedDiagramCount += 1;
        } catch (error) {
          errors.push(formatRenderError(diagram.fence, error));
        }
      }

      if (errors.length > 0) {
        throw new Error(`图表渲染失败：\n${errors.map((error) => `- ${error}`).join('\n')}`);
      }

      await commitRenderedAssets(renderedFiles, assetDirectory);
      await atomicWriteFile(
        path.join(assetDirectory, 'manifest.json'),
        `${JSON.stringify(nextManifest, null, 2)}\n`,
      );
      await removeStaleSvgAssets(assetDirectory, nextManifest);

      return {
        diagramCount: expected.size,
        renderedDiagramCount,
        renderedVariantCount: renderedDiagramCount * DIAGRAM_VARIANTS.length,
        reusedDiagramCount,
      };
    } finally {
      await rm(stagingDirectory, { recursive: true, force: true });
    }
  });
}

async function collectExpectedDiagrams(projectRoot: string): Promise<Map<string, ExpectedDiagram>> {
  const postsDirectory = path.join(projectRoot, 'content', 'posts');
  const sourceFiles = await findMarkdownFiles(postsDirectory);
  const expected = new Map<string, ExpectedDiagram>();
  const errors: string[] = [];

  for (const sourceFile of sourceFiles) {
    const sourcePath = path.relative(postsDirectory, sourceFile).replaceAll('\\', '/');
    const source = await readFile(sourceFile, 'utf8');

    try {
      const fences = await scanMarkdownDiagrams(maskMarkdownFrontmatter(source), sourcePath);

      for (const fence of fences) {
        const expectation = createDiagramAssetExpectation(fence);

        if (!expected.has(expectation.identity)) {
          expected.set(expectation.identity, { fence, expectation });
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `图表内容校验失败：\n${errors
        .sort()
        .map((error) => `- ${error}`)
        .join('\n')}`,
    );
  }

  return expected;
}

async function readExistingManifest(assetDirectory: string): Promise<DiagramAssetManifest> {
  try {
    const source = await readFile(path.join(assetDirectory, 'manifest.json'), 'utf8');

    return parseDiagramAssetManifest(JSON.parse(source) as unknown);
  } catch {
    return createEmptyDiagramAssetManifest();
  }
}

async function findReusableEntry(
  manifest: DiagramAssetManifest,
  diagram: ExpectedDiagram,
  assetDirectory: string,
): Promise<DiagramAssetEntry | undefined> {
  const entry = findDiagramAssetEntry(manifest, diagram.expectation);

  if (!entry) {
    return undefined;
  }

  try {
    for (const variant of DIAGRAM_VARIANTS) {
      const asset = entry[variant];
      const source = await readFile(path.join(assetDirectory, asset.file), 'utf8');

      if (sha256(source) !== asset.contentDigest) {
        return undefined;
      }

      assertSafeDiagramSvg(source, diagram.fence.kind);
    }
  } catch {
    return undefined;
  }

  return entry;
}

async function renderDiagram(
  fence: DiagramFence,
  getMermanBinary: () => Promise<string | undefined>,
): Promise<Record<DiagramVariant, string>> {
  if (fence.kind === 'tikz') {
    return await renderTikzDiagram(fence.source);
  }

  const binary = await getMermanBinary();

  if (!binary) {
    throw new Error('无法准备Merman CLI');
  }

  return await renderMermaidDiagram(binary, fence.source);
}

async function stageDiagramAssets(
  diagram: ExpectedDiagram,
  svgByVariant: Record<DiagramVariant, string>,
  stagingDirectory: string,
  renderedFiles: Map<string, string>,
): Promise<DiagramAssetEntry> {
  const variants = {} as Record<DiagramVariant, DiagramAssetEntry[DiagramVariant]>;

  for (const variant of DIAGRAM_VARIANTS) {
    const expected = diagram.expectation.variants[variant];
    const svg = svgByVariant[variant];

    assertSafeDiagramSvg(svg, diagram.fence.kind);
    await writeFile(path.join(stagingDirectory, expected.file), svg, 'utf8');
    renderedFiles.set(expected.file, path.join(stagingDirectory, expected.file));
    variants[variant] = {
      fingerprint: expected.fingerprint,
      file: expected.file,
      contentDigest: sha256(svg),
    };
  }

  return {
    kind: diagram.fence.kind,
    light: variants.light,
    dark: variants.dark,
  };
}

async function commitRenderedAssets(
  renderedFiles: Map<string, string>,
  assetDirectory: string,
): Promise<void> {
  for (const [file, stagingPath] of renderedFiles) {
    const targetPath = path.join(assetDirectory, file);

    await copyFile(stagingPath, targetPath);
  }
}

async function removeStaleSvgAssets(
  assetDirectory: string,
  manifest: DiagramAssetManifest,
): Promise<void> {
  const expectedFiles = new Set(
    Object.values(manifest.assets).flatMap((entry) =>
      DIAGRAM_VARIANTS.map((variant) => entry[variant].file),
    ),
  );
  const entries = await readdir(assetDirectory, { withFileTypes: true });

  await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          /^[a-f0-9]{64}\.(?:light|dark)\.svg$/.test(entry.name) &&
          !expectedFiles.has(entry.name),
      )
      .map((entry) => rm(path.join(assetDirectory, entry.name), { force: true })),
  );
}

async function atomicWriteFile(targetPath: string, content: string): Promise<void> {
  const temporaryPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, content, 'utf8');
  await rename(temporaryPath, targetPath);
}

async function createStagingDirectory(dataDirectory: string): Promise<string> {
  const stagingDirectory = path.join(
    dataDirectory,
    'diagram-assets-staging',
    `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(stagingDirectory, { recursive: true });

  return stagingDirectory;
}

async function findMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return await findMarkdownFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith('.md') ? [entryPath] : [];
    }),
  );

  return nestedFiles.flat().sort();
}

async function withPreparationLock<Result>(
  lockDirectory: string,
  task: () => Promise<Result>,
): Promise<Result> {
  await acquirePreparationLock(lockDirectory);

  try {
    return await task();
  } finally {
    await rm(lockDirectory, { recursive: true, force: true });
  }
}

async function acquirePreparationLock(lockDirectory: string): Promise<void> {
  const startedAt = Date.now();

  while (true) {
    try {
      await mkdir(lockDirectory);
      await writeFile(
        path.join(lockDirectory, 'owner.json'),
        `${JSON.stringify({ pid: process.pid, startedAt: Date.now() })}\n`,
        'utf8',
      );
      return;
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        throw error;
      }

      if (Date.now() - startedAt > LOCK_TIMEOUT_MILLISECONDS) {
        throw new Error('等待图表资产准备锁超时');
      }

      await removeStaleLock(lockDirectory);
      await wait(LOCK_WAIT_MILLISECONDS);
    }
  }
}

async function removeStaleLock(lockDirectory: string): Promise<void> {
  try {
    const lockStats = await stat(lockDirectory);

    if (Date.now() - lockStats.mtimeMs < STALE_LOCK_MILLISECONDS) {
      return;
    }

    const ownerSource = await readFile(path.join(lockDirectory, 'owner.json'), 'utf8').catch(
      () => '',
    );
    const owner = parseLockOwner(ownerSource);

    if (owner?.pid !== undefined && isProcessAlive(owner.pid)) {
      return;
    }

    await rm(lockDirectory, { recursive: true, force: true });
  } catch (error) {
    if (!isMissingPathError(error)) {
      throw error;
    }
  }
}

function compareExpectedDiagram(left: ExpectedDiagram, right: ExpectedDiagram): number {
  return (
    left.fence.sourcePath.localeCompare(right.fence.sourcePath) ||
    left.fence.position.line - right.fence.position.line ||
    left.expectation.identity.localeCompare(right.expectation.identity)
  );
}

function formatRenderError(fence: DiagramFence, error: unknown): string {
  if (error instanceof MermaidRenderError && error.sourceLine !== undefined) {
    return `${fence.sourcePath}:${fence.position.line + error.sourceLine}:${error.sourceColumn ?? fence.position.column}：Mermaid渲染失败：${error.message}`;
  }

  if (error instanceof TikzRenderError && error.sourceLine !== undefined) {
    return `${fence.sourcePath}:${fence.position.line + error.sourceLine}:列未知（TikZ引擎未提供）：TikZ渲染失败：${error.message}`;
  }

  const message = error instanceof Error ? error.message : String(error);

  return `${fence.sourcePath}:${fence.position.line}:${fence.position.column}：${fence.kind === 'mermaid' ? 'Mermaid' : 'TikZ'}渲染失败：${message}`;
}

function parseLockOwner(value: string): { pid?: number } | undefined {
  try {
    const parsed: unknown = JSON.parse(value);

    if (typeof parsed === 'object' && parsed !== null && 'pid' in parsed) {
      const pid = parsed.pid;

      return typeof pid === 'number' ? { pid } : {};
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ESRCH'
    );
  }
}

function isAlreadyExistsError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST';
}

function isMissingPathError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
