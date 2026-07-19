import type { LocaleCode } from '../../shared/i18n/locales.ts';
import { parseLocalizedPath } from '../../shared/routing/localized-routes.ts';
import type {
  ShellNavigationProjection,
  ShellNavigationResource,
} from '../../shared/site-projections/shell.ts';
import type { ShellLocation } from './types.ts';

const SHELL_URL_ORIGIN = 'https://shell.local';

export interface ResolvedVirtualInput {
  virtualPath: string;
  search: string;
  hash: string;
}

export function findShellResourceByVirtualPath(
  projection: ShellNavigationProjection,
  localeCode: LocaleCode,
  virtualPath: string,
): ShellNavigationResource | undefined {
  return projection.resources.find(
    (resource) => resource.localeCode === localeCode && resource.virtualPath === virtualPath,
  );
}

export function findShellResourceByPublicPath(
  projection: ShellNavigationProjection,
  publicPath: string,
): ShellNavigationResource | undefined {
  const pathname = normalizePublicPagePath(new URL(publicPath, SHELL_URL_ORIGIN).pathname);
  return projection.resources.find(
    (resource) => normalizePublicPagePath(resource.publicPath) === pathname,
  );
}

export function parseShellLocation(fullPath: string): ShellLocation | undefined {
  const url = new URL(fullPath, SHELL_URL_ORIGIN);
  const localizedPath = parseLocalizedPath(url.pathname);

  if (!localizedPath) {
    return undefined;
  }

  return {
    localeCode: localizedPath.localeCode,
    virtualPath: localizedPath.pathWithoutLocale,
    search: url.search,
    hash: url.hash,
    fullPath: `${url.pathname}${url.search}${url.hash}`,
  };
}

/** 解析绝对或相对Shell路径；资源存在性由调用方另行校验。 */
export function resolveVirtualInput(
  input: string,
  currentVirtualPath: string,
): ResolvedVirtualInput {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    throw new Error('路径不能为空。');
  }

  if (/^[a-z][a-z\d+.-]*:/iu.test(trimmedInput)) {
    throw new Error('Shell路径不能包含URL协议。');
  }

  assertPathStaysInsideVirtualRoot(trimmedInput, currentVirtualPath);

  const baseUrl = new URL(normalizeVirtualPath(currentVirtualPath), SHELL_URL_ORIGIN);
  const resolvedUrl = new URL(trimmedInput, baseUrl);

  if (resolvedUrl.origin !== SHELL_URL_ORIGIN) {
    throw new Error('Shell路径不能离开当前站点。');
  }

  return {
    virtualPath: normalizeVirtualPath(resolvedUrl.pathname),
    search: resolvedUrl.search,
    hash: resolvedUrl.hash,
  };
}

export function publicFullPathForResource(
  resource: ShellNavigationResource,
  search = '',
  hash = '',
): string {
  return `${resource.publicPath}${search}${hash}`;
}

export function serializeVirtualLocation(
  location: Pick<ShellLocation, 'virtualPath' | 'search' | 'hash'>,
): string {
  return `${location.virtualPath}${decodeUrlComponentForDisplay(location.search)}${decodeUrlComponentForDisplay(location.hash)}`;
}

/** 当相对`..`落入不可导航的目录前缀时，返回最近的可导航祖先。 */
export function findClosestNavigableAncestor(
  projection: ShellNavigationProjection,
  localeCode: LocaleCode,
  virtualPath: string,
): ShellNavigationResource | undefined {
  return projection.resources
    .filter(
      (resource) =>
        resource.localeCode === localeCode && virtualPath.startsWith(resource.virtualPath),
    )
    .sort((left, right) => right.virtualPath.length - left.virtualPath.length)[0];
}

function assertPathStaysInsideVirtualRoot(input: string, currentVirtualPath: string): void {
  const rawPath = input.split(/[?#]/u, 1)[0] ?? '';

  if (!rawPath) {
    return;
  }

  let depth = rawPath.startsWith('/')
    ? 0
    : normalizeVirtualPath(currentVirtualPath).split('/').filter(Boolean).length;

  for (const segment of rawPath.split('/')) {
    if (!segment || segment === '.') {
      continue;
    }

    if (segment === '..') {
      if (depth === 0) {
        throw new Error('路径不能越过当前语言的虚拟根。');
      }

      depth -= 1;
    } else {
      depth += 1;
    }
  }
}

function normalizePublicPagePath(pathname: string): string {
  if (pathname === '/' || pathname.endsWith('/')) {
    return pathname;
  }

  return `${pathname}/`;
}

function decodeUrlComponentForDisplay(value: string): string {
  try {
    // decodeURI保留?、&、=和#等URL结构字符，只把可读文本从百分号编码还原。
    return decodeURI(value);
  } catch {
    return value;
  }
}

export function normalizeVirtualPath(path: string): string {
  const segments: string[] = [];

  for (const segment of path.split('/')) {
    if (!segment || segment === '.') {
      continue;
    }

    if (segment === '..') {
      segments.pop();
      continue;
    }

    segments.push(segment);
  }

  return segments.length === 0 ? '/' : `/${segments.join('/')}/`;
}
