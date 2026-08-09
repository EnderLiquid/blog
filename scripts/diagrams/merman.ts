import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  DIAGRAM_VARIANTS,
  getDiagramRendererConfig,
  type DiagramVariant,
} from '../../shared/content/diagram.ts';

const execFileAsync = promisify(execFile);

export class MermaidRenderError extends Error {
  readonly sourceLine: number | undefined;
  readonly sourceColumn: number | undefined;

  constructor(message: string, sourceLine?: number, sourceColumn?: number) {
    super(message);
    this.name = 'MermaidRenderError';
    this.sourceLine = sourceLine;
    this.sourceColumn = sourceColumn;
  }
}

/** 使用固定Merman CLI先lint，再为两个主题输出resvg-safe静态SVG。 */
export async function renderMermaidDiagram(
  binaryPath: string,
  source: string,
): Promise<Record<DiagramVariant, string>> {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'blog-merman-'));
  const inputPath = path.join(temporaryDirectory, 'diagram.mmd');

  try {
    await writeFile(inputPath, source, 'utf8');
    await lintMermaid(binaryPath, inputPath);
    const rendered = await Promise.all(
      DIAGRAM_VARIANTS.map(async (variant) => [
        variant,
        await renderMermaidVariant(binaryPath, inputPath, temporaryDirectory, variant),
      ]),
    );

    return Object.fromEntries(rendered) as Record<DiagramVariant, string>;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function lintMermaid(binaryPath: string, inputPath: string): Promise<void> {
  try {
    await execFileAsync(binaryPath, ['lint', inputPath, '--format', 'json'], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
  } catch (error) {
    const diagnostic = parseMermanDiagnostic(formatCommandDiagnostic(error));
    throw new MermaidRenderError(
      `Mermaid语法校验失败：${diagnostic.message}`,
      diagnostic.line,
      diagnostic.column,
    );
  }
}

async function renderMermaidVariant(
  binaryPath: string,
  inputPath: string,
  temporaryDirectory: string,
  variant: DiagramVariant,
): Promise<string> {
  const configPath = path.join(temporaryDirectory, `${variant}.json`);
  const outputPath = path.join(temporaryDirectory, `${variant}.svg`);
  const config = getDiagramRendererConfig('mermaid', variant);

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  try {
    await execFileAsync(
      binaryPath,
      [
        'render',
        inputPath,
        '--output',
        outputPath,
        '--configFile',
        configPath,
        '--backgroundColor',
        'transparent',
        '--svg-pipeline',
        'resvg-safe',
      ],
      {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      },
    );
  } catch (error) {
    throw new MermaidRenderError(`Mermaid SVG渲染失败：${formatCommandDiagnostic(error)}`);
  }

  return await readFile(outputPath, 'utf8');
}

function parseMermanDiagnostic(value: string): {
  message: string;
  line?: number;
  column?: number;
} {
  try {
    const parsed: unknown = JSON.parse(value);

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'diagnostics' in parsed &&
      Array.isArray(parsed.diagnostics)
    ) {
      const diagnostic = parsed.diagnostics.find(
        (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
      );

      if (diagnostic) {
        const span =
          typeof diagnostic.span === 'object' && diagnostic.span !== null
            ? (diagnostic.span as Record<string, unknown>)
            : undefined;

        return {
          message: typeof diagnostic.message === 'string' ? diagnostic.message : value,
          ...(typeof span?.line === 'number' ? { line: span.line } : {}),
          ...(typeof span?.column === 'number' ? { column: span.column } : {}),
        };
      }
    }
  } catch {
    // 非JSON输出继续作为原始渲染器诊断保留。
  }

  return { message: value };
}

function formatCommandDiagnostic(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return String(error);
  }

  const stdout = 'stdout' in error && typeof error.stdout === 'string' ? error.stdout.trim() : '';
  const stderr = 'stderr' in error && typeof error.stderr === 'string' ? error.stderr.trim() : '';
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : String(error);
  const output = [stdout, stderr].filter(Boolean).join('\n');

  return output || message;
}
