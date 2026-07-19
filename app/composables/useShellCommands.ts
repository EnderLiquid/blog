import { parseLocaleCode } from '~~/shared/i18n/locales';
import {
  findClosestNavigableAncestor,
  findShellResourceByPublicPath,
  findShellResourceByVirtualPath,
  publicFullPathForResource,
  resolveVirtualInput,
} from '~/shell/navigation-index';
import { SHELL_MESSAGES } from '~/shell/messages';
import { parseShellCommand } from '~/shell/parser';
import type { ShellRouteCoordinator } from './useShellRouteCoordinator';
import type { ShellSessionController } from './useShellSession';

/** 注册并执行Shell MVP命令。 */
export function useShellCommands(
  session: ShellSessionController,
  coordinator: ShellRouteCoordinator,
) {
  const messages = computed(() => {
    const localeCode = coordinator.currentLocation.value?.localeCode ?? 'zh-cn';
    return SHELL_MESSAGES[localeCode];
  });

  function execute(input: string): void {
    const normalizedInput = input.trim();

    if (!normalizedInput) {
      return;
    }

    const historyEntry = session.appendCommand(
      normalizedInput,
      'user',
      'pending',
      coordinator.currentLocation.value?.virtualPath ?? '/',
    );
    session.state.commandCursor = undefined;

    try {
      const parsedCommand = parseShellCommand(normalizedInput);

      if (!parsedCommand) {
        session.updateCommandStatus(historyEntry.id, 'completed');
        return;
      }

      switch (parsedCommand.name) {
        case 'help':
          requireArgumentCount(parsedCommand.args, 0, 'help');
          session.updateCommandStatus(historyEntry.id, 'completed');
          session.appendOutput(messages.value.help);
          return;
        case 'pwd':
          requireArgumentCount(parsedCommand.args, 0, 'pwd');
          session.updateCommandStatus(historyEntry.id, 'completed');
          session.appendOutput(requireCurrentLocation().virtualPath);
          return;
        case 'url':
          requireArgumentCount(parsedCommand.args, 0, 'url');
          session.updateCommandStatus(historyEntry.id, 'completed');
          session.appendOutput(window.location.href);
          return;
        case 'ls':
          requireArgumentRange(parsedCommand.args, 0, 1, 'ls [path]');
          session.updateCommandStatus(historyEntry.id, 'completed');
          session.appendOutput(listPath(parsedCommand.args[0]));
          return;
        case 'cd':
          requireArgumentCount(parsedCommand.args, 1, 'cd <path>');
          navigateToVirtualPath(historyEntry.id, parsedCommand.args[0]!);
          return;
        case 'search':
          navigateToSearch(historyEntry.id, parsedCommand.args.join(' ').trim());
          return;
        case 'lang':
          requireArgumentCount(parsedCommand.args, 1, 'lang <zh-cn|en>');
          navigateToLocale(historyEntry.id, parsedCommand.args[0]!);
          return;
        case 'history':
          requireArgumentCount(parsedCommand.args, 0, 'history');
          session.updateCommandStatus(historyEntry.id, 'completed');
          session.appendOutput(formatHistory());
          return;
        case 'clear':
          requireArgumentCount(parsedCommand.args, 0, 'clear');
          session.clearHistory();
          return;
        default:
          failCommand(historyEntry.id, messages.value.unknownCommand(parsedCommand.name));
      }
    } catch (error) {
      failCommand(historyEntry.id, error instanceof Error ? error.message : 'Shell命令执行失败。');
    }
  }

  function navigateToVirtualPath(commandHistoryEntryId: number, input: string): void {
    const current = requireCurrentLocation();
    const resolvedInput = resolveVirtualInput(input, current.virtualPath);
    let resource = findShellResourceByVirtualPath(
      coordinator.projection,
      current.localeCode,
      resolvedInput.virtualPath,
    );

    if (!resource && containsParentSegment(input)) {
      resource = findClosestNavigableAncestor(
        coordinator.projection,
        current.localeCode,
        resolvedInput.virtualPath,
      );
    }

    if (!resource) {
      throw new Error(messages.value.pathNotFound(resolvedInput.virtualPath));
    }

    coordinator.navigate(
      commandHistoryEntryId,
      publicFullPathForResource(resource, resolvedInput.search, resolvedInput.hash),
    );
  }

  function navigateToSearch(commandHistoryEntryId: number, query: string): void {
    const current = requireCurrentLocation();
    const postsResource = coordinator.projection.resources.find(
      (resource) => resource.localeCode === current.localeCode && resource.kind === 'posts',
    );

    if (!postsResource) {
      throw new Error(messages.value.pathNotFound('/posts/'));
    }

    const target = query
      ? {
          path: postsResource.publicPath,
          query: { q: query },
        }
      : { path: postsResource.publicPath };

    coordinator.navigate(commandHistoryEntryId, target);
  }

  function navigateToLocale(commandHistoryEntryId: number, rawLocaleCode: string): void {
    const targetLocaleCode = parseLocaleCode(rawLocaleCode);
    const current = requireCurrentLocation();
    const currentResource = findShellResourceByPublicPath(coordinator.projection, current.fullPath);

    if (!currentResource) {
      throw new Error(messages.value.pathNotFound(current.virtualPath));
    }

    const targetResource = coordinator.projection.resources.find((resource) => {
      if (resource.localeCode !== targetLocaleCode || resource.kind !== currentResource.kind) {
        return false;
      }

      return (
        resource.kind !== 'article' || resource.articleKeyPath === currentResource.articleKeyPath
      );
    });

    if (!targetResource) {
      throw new Error(messages.value.translationMissing);
    }

    coordinator.navigate(
      commandHistoryEntryId,
      publicFullPathForResource(targetResource, current.search, current.hash),
    );
  }

  function listPath(input?: string): string {
    const current = requireCurrentLocation();
    const resolvedInput = input
      ? resolveVirtualInput(input, current.virtualPath)
      : { virtualPath: current.virtualPath, search: '', hash: '' };
    const resource = findShellResourceByVirtualPath(
      coordinator.projection,
      current.localeCode,
      resolvedInput.virtualPath,
    );

    if (!resource) {
      throw new Error(messages.value.pathNotFound(resolvedInput.virtualPath));
    }

    if (resource.kind === 'home') {
      return coordinator.projection.resources
        .filter(
          (candidate) =>
            candidate.localeCode === current.localeCode && candidate.navigableParentPath === '/',
        )
        .map((candidate) => candidate.virtualPath.slice(1))
        .join('\n');
    }

    if (resource.kind === 'posts') {
      return coordinator.projection.resources
        .filter(
          (candidate) =>
            candidate.localeCode === current.localeCode && candidate.kind === 'article',
        )
        .map((candidate) => {
          const relativePath = candidate.virtualPath.slice('/posts/'.length);
          return candidate.title ? `${relativePath}  ${candidate.title}` : relativePath;
        })
        .join('\n');
    }

    return resource.title ? `${resource.virtualPath}  ${resource.title}` : resource.virtualPath;
  }

  function formatHistory(): string {
    return session.state.history
      .filter((entry) => entry.type === 'command')
      .map(
        (entry) =>
          `${String(entry.id).padStart(4, '0')}  ${entry.status.padEnd(9)}  ${entry.command}`,
      )
      .join('\n');
  }

  function requireCurrentLocation() {
    const location = coordinator.currentLocation.value;

    if (!location) {
      throw new Error('当前页面不属于Shell虚拟目录。');
    }

    return location;
  }

  function requireArgumentCount(args: string[], expected: number, usage: string): void {
    if (args.length !== expected) {
      throw new Error(messages.value.usage(usage));
    }
  }

  function requireArgumentRange(
    args: string[],
    minimum: number,
    maximum: number,
    usage: string,
  ): void {
    if (args.length < minimum || args.length > maximum) {
      throw new Error(messages.value.usage(usage));
    }
  }

  function failCommand(commandHistoryEntryId: number, message: string): void {
    session.updateCommandStatus(commandHistoryEntryId, 'failed');
    session.appendError(message);
  }

  return {
    messages,
    execute,
  };
}

function containsParentSegment(input: string): boolean {
  return input.split(/[/?#]/u).some((segment) => segment === '..');
}

export type ShellCommandController = ReturnType<typeof useShellCommands>;
