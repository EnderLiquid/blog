import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { addSvgCanvasBackground } from '../../shared/content/diagram-svg.ts';
import {
  DIAGRAM_THEMES,
  DIAGRAM_VARIANTS,
  getDiagramRendererConfig,
  getFixedDiagramRendererConfig,
  resolveDiagramAppearance,
  resolveFixedDiagramAppearance,
  type DiagramColorScheme,
  type DiagramVariant,
  type EffectiveDiagramAppearance,
  type RenderedDiagramAssets,
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

/** 使用固定Merman CLI先lint，再按实际资源形态输出resvg-safe静态SVG。 */
export async function renderMermaidDiagram(
  binaryPath: string,
  source: string,
  colorScheme: DiagramColorScheme = 'auto',
): Promise<RenderedDiagramAssets> {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'blog-merman-'));
  const inputPath = path.join(temporaryDirectory, 'diagram.mmd');

  try {
    await writeFile(inputPath, source, 'utf8');
    await lintMermaid(binaryPath, inputPath);

    if (colorScheme === 'auto') {
      const [light, dark] = await Promise.all(
        DIAGRAM_VARIANTS.map((variant) =>
          renderMermaidAsset(binaryPath, inputPath, temporaryDirectory, {
            name: variant,
            config: getDiagramRendererConfig('mermaid', variant),
            appearance: resolveDiagramAppearance(colorScheme, variant),
          }),
        ),
      );

      if (light === undefined || dark === undefined) {
        throw new Error('Mermaid自动配色渲染结果不完整');
      }

      return { colorScheme, light, dark };
    }

    return {
      colorScheme,
      fixed: await renderMermaidAsset(binaryPath, inputPath, temporaryDirectory, {
        name: 'fixed',
        config: getFixedDiagramRendererConfig('mermaid', colorScheme),
        appearance: resolveFixedDiagramAppearance(colorScheme),
      }),
    };
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

interface MermaidRenderTarget {
  name: DiagramVariant | 'fixed';
  config: Record<string, unknown>;
  appearance: EffectiveDiagramAppearance;
}

async function renderMermaidAsset(
  binaryPath: string,
  inputPath: string,
  temporaryDirectory: string,
  target: MermaidRenderTarget,
): Promise<string> {
  const configPath = path.join(temporaryDirectory, `${target.name}.json`);
  const outputPath = path.join(temporaryDirectory, `${target.name}.svg`);

  await writeFile(configPath, `${JSON.stringify(target.config, null, 2)}\n`, 'utf8');

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

  const svg = await readFile(outputPath, 'utf8');

  return target.appearance.canvas === 'paper'
    ? addSvgCanvasBackground(svg, DIAGRAM_THEMES[target.appearance.palette].paper)
    : svg;
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
