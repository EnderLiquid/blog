import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const MERMAN_VERSION = '0.8.0-alpha.3';

interface MermanReleaseAsset {
  archiveName: string;
  sha256: string;
}

const MERMAN_RELEASE_ASSETS: Readonly<Record<string, MermanReleaseAsset>> = {
  'win32-x64': {
    archiveName: 'merman-cli-x86_64-pc-windows-msvc.zip',
    sha256: '026a18b5c00a3141e9537a67f05cd062cff21d72bc1a6304111cf8a6dcba631e',
  },
  'linux-x64': {
    archiveName: 'merman-cli-x86_64-unknown-linux-gnu.tar.xz',
    sha256: 'a20d2d9d47a6f1d9ff44d8e1de8c5119833f80f3115c4a5d45188202555fb06f',
  },
};

/** 获取并校验固定版本Merman二进制；不从系统PATH或未固定源码构建中回退。 */
export async function ensureMermanCli(projectRoot = process.cwd()): Promise<string> {
  const platformKey = `${process.platform}-${process.arch}`;
  const asset = MERMAN_RELEASE_ASSETS[platformKey];

  if (!asset) {
    throw new Error(`当前平台${platformKey}没有受支持的Merman ${MERMAN_VERSION}预构建二进制`);
  }

  const toolDirectory = path.join(
    projectRoot,
    '.data',
    'tools',
    'merman',
    MERMAN_VERSION,
    platformKey,
  );
  const existingBinary = await findMermanBinary(toolDirectory);

  if (existingBinary) {
    try {
      await assertMermanVersion(existingBinary);
      return existingBinary;
    } catch {
      // 缓存二进制损坏或版本不符时丢弃后重新下载；缓存不作为正确性来源。
      await rm(toolDirectory, { recursive: true, force: true });
    }
  }

  const temporaryDirectory = await createTemporaryDirectory(
    path.join(projectRoot, '.data', 'tools'),
  );
  const archivePath = path.join(temporaryDirectory, asset.archiveName);
  const extractionDirectory = path.join(temporaryDirectory, 'extracted');

  try {
    await downloadAndVerifyArchive(asset, archivePath);
    await mkdir(extractionDirectory, { recursive: true });
    await extractArchive(archivePath, extractionDirectory, platformKey);

    const binary = await findMermanBinary(extractionDirectory);

    if (!binary) {
      throw new Error('Merman归档中找不到可执行文件');
    }

    if (process.platform !== 'win32') {
      await chmod(binary, 0o755);
    }

    await assertMermanVersion(binary);
    await mkdir(toolDirectory, { recursive: true });
    const targetBinary = path.join(toolDirectory, path.basename(binary));
    await writeFile(targetBinary, await readFile(binary));

    if (process.platform !== 'win32') {
      await chmod(targetBinary, 0o755);
    }

    await assertMermanVersion(targetBinary);
    return targetBinary;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function downloadAndVerifyArchive(
  asset: MermanReleaseAsset,
  targetPath: string,
): Promise<void> {
  const url = `https://github.com/Latias94/merman/releases/download/v${MERMAN_VERSION}/${asset.archiveName}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`下载Merman失败：${response.status} ${response.statusText}`);
  }

  const content = new Uint8Array(await response.arrayBuffer());
  const actualDigest = createHash('sha256').update(content).digest('hex');

  if (actualDigest !== asset.sha256) {
    throw new Error(`Merman归档SHA-256不匹配，期望${asset.sha256}，实际${actualDigest}`);
  }

  await writeFile(targetPath, content);
}

async function extractArchive(
  archivePath: string,
  destination: string,
  platformKey: string,
): Promise<void> {
  if (platformKey === 'win32-x64') {
    const escapedArchivePath = escapePowerShellLiteral(archivePath);
    const escapedDestination = escapePowerShellLiteral(destination);
    const command = `Expand-Archive -LiteralPath '${escapedArchivePath}' -DestinationPath '${escapedDestination}' -Force`;

    await execFileAsync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command], {
      windowsHide: true,
    });
    return;
  }

  await execFileAsync('tar', ['-xJf', archivePath, '-C', destination]);
}

async function findMermanBinary(directory: string): Promise<string | undefined> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        const nested = await findMermanBinary(entryPath);

        if (nested) {
          return nested;
        }

        continue;
      }

      if (entry.isFile() && (entry.name === 'merman-cli' || entry.name === 'merman-cli.exe')) {
        return entryPath;
      }
    }
  } catch (error) {
    if (!isMissingPathError(error)) {
      throw error;
    }
  }

  return undefined;
}

async function assertMermanVersion(binaryPath: string): Promise<void> {
  const { stdout, stderr } = await execFileAsync(binaryPath, ['--version'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  const versionOutput = `${stdout}\n${stderr}`;

  if (!versionOutput.includes(MERMAN_VERSION)) {
    throw new Error(`Merman版本不匹配，期望${MERMAN_VERSION}，实际输出：${versionOutput.trim()}`);
  }
}

async function createTemporaryDirectory(parentDirectory: string): Promise<string> {
  await mkdir(parentDirectory, { recursive: true });

  return await mkdtemp(path.join(parentDirectory, `merman-${process.pid}-${Date.now()}-`));
}

function escapePowerShellLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

function isMissingPathError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
