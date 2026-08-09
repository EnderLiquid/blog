import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { themeTikzSvg } from '../../shared/content/diagram-svg.ts';
import { embedTikzFonts } from './fonts.ts';
import { DIAGRAM_VARIANTS, type DiagramVariant } from '../../shared/content/diagram.ts';

type Tex2Svg = (
  source: string,
  options: {
    disableOptimize: boolean;
    embedFontCss: boolean;
    showConsole?: boolean;
  },
) => Promise<string>;

// node-tikzjax会在作者源码前始终插入一个以换行结束的内部preamble。
const TIKZ_PREAMBLE_LINE_OFFSET = 1;

let tex2svgPromise: Promise<Tex2Svg> | undefined;
let tikzRenderQueue: Promise<void> = Promise.resolve();

/** node-tikzjax共享WASM状态，不允许并发实例；整个双主题任务进入同一队列。 */
export function renderTikzDiagram(source: string): Promise<Record<DiagramVariant, string>> {
  return enqueueTikzRender(async () => {
    const tex2svg = await loadTex2Svg();
    const rendered = {} as Record<DiagramVariant, string>;

    for (const variant of DIAGRAM_VARIANTS) {
      try {
        const svg = await tex2svg(source, {
          embedFontCss: false,
          disableOptimize: false,
        });
        rendered[variant] = themeTikzSvg(await embedTikzFonts(svg), variant);
      } catch (error) {
        const diagnostic = await captureTikzDiagnostic(source);
        throw new TikzRenderError(diagnostic || formatTikzDiagnostic(error));
      }
    }

    return rendered;
  });
}

export class TikzRenderError extends Error {
  readonly sourceLine: number | undefined;

  constructor(message: string) {
    super(message);
    this.name = 'TikzRenderError';
    this.sourceLine = extractTikzSourceLine(message);
  }
}

function enqueueTikzRender<Result>(task: () => Promise<Result>): Promise<Result> {
  const next = tikzRenderQueue.then(task, task);
  tikzRenderQueue = next.then(
    () => undefined,
    () => undefined,
  );

  return next;
}

async function loadTex2Svg(): Promise<Tex2Svg> {
  tex2svgPromise ??= import('node-tikzjax').then((module) => {
    const outerDefault = module.default as unknown;
    const candidate =
      typeof outerDefault === 'function'
        ? outerDefault
        : typeof outerDefault === 'object' &&
            outerDefault !== null &&
            'default' in outerDefault &&
            typeof outerDefault.default === 'function'
          ? outerDefault.default
          : undefined;

    if (!candidate) {
      throw new Error('无法从node-tikzjax加载tex2svg');
    }

    return candidate as Tex2Svg;
  });

  return tex2svgPromise;
}

function formatTikzDiagnostic(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function captureTikzDiagnostic(source: string): Promise<string | undefined> {
  const scriptPath = fileURLToPath(new URL('./tikz-diagnostic.mjs', import.meta.url));

  return await new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const output: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => output.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => output.push(chunk));
    child.on('error', () => resolve(undefined));
    child.on('close', () => {
      const diagnostic = Buffer.concat(output).toString('utf8').trim();
      resolve(diagnostic || undefined);
    });
    child.stdin.end(source, 'utf8');
  });
}

function extractTikzSourceLine(message: string): number | undefined {
  const match = message.match(/\bl\.(\d+)\b/);

  if (!match?.[1]) {
    return undefined;
  }

  const sourceLine = Number(match[1]) - TIKZ_PREAMBLE_LINE_OFFSET;

  return sourceLine >= 1 ? sourceLine : undefined;
}
