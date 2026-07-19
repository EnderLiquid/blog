import { isNavigationFailure, NavigationFailureType, type RouteLocationRaw } from 'vue-router';
import { SITE_SHELL_INDEX } from '~/generated/site-shell-index';
import { findShellResourceByPublicPath, parseShellLocation } from '~/shell/navigation-index';
import { reconcileNavigationIntents } from '~/shell/navigation-intents';
import { translateRouteToShellCommand } from '~/shell/route-translator';
import type { PendingNavigationIntent } from '~/shell/types';
import type { ShellSessionController } from './useShellSession';

const QUERY_TRANSLATION_DELAY = 350;

/**
 * 协调Shell导航意图与最终Route。
 * 这里只比较最终fullPath，不推测点击来源，也不依赖Vue Router内部History实现。
 */
export function useShellRouteCoordinator(session: ShellSessionController) {
  const route = useRoute();
  const router = useRouter();
  const pendingIntents = shallowRef<PendingNavigationIntent[]>([]);
  const currentLocation = computed(() => parseNavigableShellLocation(route.fullPath));
  let nextIntentId = 1;
  let initialized = false;
  let translationTimer: ReturnType<typeof setTimeout> | undefined;

  watch(
    () => route.fullPath,
    (currentFullPath, previousFullPath) => {
      handleCommittedRoute(currentFullPath, previousFullPath);
    },
    { flush: 'sync' },
  );

  onMounted(() => {
    if (!initialized && currentLocation.value) {
      appendRouteCommand(route.fullPath);
      initialized = true;
    }
  });

  onScopeDispose(() => {
    clearTranslationTimer();
  });

  function navigate(commandHistoryEntryId: number, target: RouteLocationRaw): void {
    const targetFullPath = router.resolve(target).fullPath;

    if (targetFullPath === route.fullPath) {
      session.updateCommandStatus(commandHistoryEntryId, 'completed');
      return;
    }

    const intent: PendingNavigationIntent = {
      id: nextIntentId,
      commandHistoryEntryId,
      targetFullPath,
    };
    nextIntentId += 1;
    pendingIntents.value = [...pendingIntents.value, intent];

    void router
      .push(target)
      .then((failure) => {
        if (!failure || !findPendingIntent(intent.id)) {
          return;
        }

        if (isNavigationFailure(failure, NavigationFailureType.cancelled)) {
          // 新导航产生的最终Route将统一结算旧意图，避免异步失败回调抢先误判。
          return;
        }

        if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
          settleIntent(intent.id, 'completed');
          return;
        }

        settleIntent(intent.id, 'failed');
        session.appendError('导航未能完成。');
      })
      .catch((error: unknown) => {
        if (!findPendingIntent(intent.id)) {
          return;
        }

        settleIntent(intent.id, 'failed');
        session.appendError(error instanceof Error ? error.message : '导航发生未知错误。');
      });
  }

  function handleCommittedRoute(currentFullPath: string, previousFullPath: string): void {
    const current = parseNavigableShellLocation(currentFullPath);

    if (!current) {
      cancelAllPendingIntents();
      clearTranslationTimer();
      initialized = false;
      return;
    }

    if (!initialized) {
      appendRouteCommand(currentFullPath);
      initialized = true;
      return;
    }

    const intentsBeforeReconciliation = pendingIntents.value;
    const result = reconcileNavigationIntents(intentsBeforeReconciliation, currentFullPath);

    for (const transition of result.transitions) {
      const intent = intentsBeforeReconciliation.find(
        (candidate) => candidate.id === transition.id,
      );

      if (intent) {
        session.updateCommandStatus(intent.commandHistoryEntryId, transition.status);
      }
    }

    pendingIntents.value = result.remainingIntents;

    if (!result.shouldTranslateRoute) {
      clearTranslationTimer();
      return;
    }

    scheduleRouteTranslation(currentFullPath, previousFullPath);
  }

  function scheduleRouteTranslation(currentFullPath: string, previousFullPath: string): void {
    clearTranslationTimer();

    if (!shouldDebounceRouteTranslation(currentFullPath, previousFullPath)) {
      appendRouteCommand(currentFullPath, previousFullPath);
      return;
    }

    translationTimer = setTimeout(() => {
      translationTimer = undefined;

      if (route.fullPath === currentFullPath) {
        appendRouteCommand(currentFullPath, previousFullPath);
      }
    }, QUERY_TRANSLATION_DELAY);
  }

  function appendRouteCommand(currentFullPath: string, previousFullPath?: string): void {
    const command = translateRouteToShellCommand(
      SITE_SHELL_INDEX,
      currentFullPath,
      previousFullPath,
    );

    if (command) {
      const promptPath = previousFullPath
        ? (parseNavigableShellLocation(previousFullPath)?.virtualPath ?? '~')
        : '~';
      session.appendCommand(command, 'route', 'completed', promptPath);
    }
  }

  function shouldDebounceRouteTranslation(
    currentFullPath: string,
    previousFullPath: string,
  ): boolean {
    const current = parseNavigableShellLocation(currentFullPath);
    const previous = parseNavigableShellLocation(previousFullPath);

    return Boolean(
      current &&
      previous &&
      current.localeCode === previous.localeCode &&
      current.virtualPath === previous.virtualPath,
    );
  }

  function parseNavigableShellLocation(fullPath: string) {
    const location = parseShellLocation(fullPath);

    if (!location || !findShellResourceByPublicPath(SITE_SHELL_INDEX, fullPath)) {
      return undefined;
    }

    return location;
  }

  function findPendingIntent(intentId: number): PendingNavigationIntent | undefined {
    return pendingIntents.value.find((intent) => intent.id === intentId);
  }

  function settleIntent(intentId: number, status: 'completed' | 'cancelled' | 'failed'): void {
    const intent = findPendingIntent(intentId);

    if (!intent) {
      return;
    }

    session.updateCommandStatus(intent.commandHistoryEntryId, status);
    pendingIntents.value = pendingIntents.value.filter((candidate) => candidate.id !== intentId);
  }

  function cancelAllPendingIntents(): void {
    for (const intent of pendingIntents.value) {
      session.updateCommandStatus(intent.commandHistoryEntryId, 'cancelled');
    }

    pendingIntents.value = [];
  }

  function clearTranslationTimer(): void {
    if (translationTimer) {
      clearTimeout(translationTimer);
      translationTimer = undefined;
    }
  }

  return {
    projection: SITE_SHELL_INDEX,
    currentLocation,
    pendingIntents: readonly(pendingIntents),
    navigate,
  };
}

export type ShellRouteCoordinator = ReturnType<typeof useShellRouteCoordinator>;
