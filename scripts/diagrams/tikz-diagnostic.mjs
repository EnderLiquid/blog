import process from 'node:process';

const chunks = [];

for await (const chunk of process.stdin) {
  chunks.push(chunk);
}

const source = Buffer.concat(chunks).toString('utf8');
const module = await import('node-tikzjax');
const outerDefault = module.default;
const tex2svg =
  typeof outerDefault === 'function'
    ? outerDefault
    : typeof outerDefault === 'object' &&
        outerDefault !== null &&
        typeof outerDefault.default === 'function'
      ? outerDefault.default
      : undefined;

if (!tex2svg) {
  console.error('无法从node-tikzjax加载tex2svg');
  process.exitCode = 1;
} else {
  try {
    await tex2svg(source, {
      embedFontCss: false,
      disableOptimize: false,
      showConsole: true,
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
