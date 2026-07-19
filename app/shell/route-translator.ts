import type { ShellNavigationProjection } from '../../shared/site-projections/shell.ts';
import {
  findShellResourceByPublicPath,
  parseShellLocation,
  serializeVirtualLocation,
} from './navigation-index.ts';

/** 将普通页面产生的最终Route无损表达为一条Shell命令。 */
export function translateRouteToShellCommand(
  projection: ShellNavigationProjection,
  currentFullPath: string,
  previousFullPath?: string,
): string | undefined {
  const currentLocation = parseShellLocation(currentFullPath);

  if (!currentLocation) {
    return undefined;
  }

  const currentResource = findShellResourceByPublicPath(projection, currentFullPath);
  const previousLocation = previousFullPath ? parseShellLocation(previousFullPath) : undefined;
  const previousResource = previousFullPath
    ? findShellResourceByPublicPath(projection, previousFullPath)
    : undefined;

  if (
    previousLocation &&
    previousResource &&
    currentResource &&
    previousLocation.localeCode !== currentLocation.localeCode &&
    logicalResourceIdentity(previousResource) === logicalResourceIdentity(currentResource) &&
    previousLocation.search === currentLocation.search &&
    previousLocation.hash === currentLocation.hash
  ) {
    return `lang ${currentLocation.localeCode}`;
  }

  if (
    previousLocation &&
    currentResource?.kind === 'posts' &&
    previousResource?.kind === 'posts' &&
    previousLocation.localeCode === currentLocation.localeCode
  ) {
    const searchCommand = postsSearchCommand(
      previousLocation.search,
      previousLocation.hash,
      currentLocation.search,
      currentLocation.hash,
    );

    if (searchCommand) {
      return searchCommand;
    }
  }

  return `cd ${serializeVirtualLocation(currentLocation)}`;
}

function logicalResourceIdentity(
  resource: NonNullable<ReturnType<typeof findShellResourceByPublicPath>>,
): string {
  return resource.kind === 'article' ? `article:${resource.articleKeyPath}` : resource.kind;
}

function postsSearchCommand(
  previousSearch: string,
  previousHash: string,
  currentSearch: string,
  currentHash: string,
): string | undefined {
  if (!currentSearch && !currentHash && (previousSearch || previousHash)) {
    return 'search';
  }

  if (currentHash) {
    return undefined;
  }

  const searchParameters = new URLSearchParams(currentSearch);
  const entries = [...searchParameters.entries()];

  if (entries.length !== 1 || entries[0]![0] !== 'q' || !entries[0]![1].trim()) {
    return undefined;
  }

  return `search ${quoteShellArgument(entries[0]![1])}`;
}

export function quoteShellArgument(value: string): string {
  return JSON.stringify(value);
}
