import type { NavigationIntentTransition, PendingNavigationIntent } from './types.ts';

export interface NavigationIntentReconciliation {
  remainingIntents: PendingNavigationIntent[];
  transitions: NavigationIntentTransition[];
  shouldTranslateRoute: boolean;
}

/**
 * 用最终Route结算待处理导航意图。
 * 最新匹配项代表用户最后一次仍能解释当前状态的Shell意图。
 */
export function reconcileNavigationIntents(
  intents: readonly PendingNavigationIntent[],
  finalFullPath: string,
): NavigationIntentReconciliation {
  const matchedIndex = findLastMatchingIntentIndex(intents, finalFullPath);

  if (matchedIndex === -1) {
    return {
      remainingIntents: [],
      transitions: intents.map((intent) => ({
        id: intent.id,
        status: 'cancelled' as const,
        reason: 'superseded-by-route' as const,
      })),
      shouldTranslateRoute: true,
    };
  }

  const transitions: NavigationIntentTransition[] = [];

  for (let index = 0; index < matchedIndex; index += 1) {
    transitions.push({
      id: intents[index]!.id,
      status: 'cancelled',
      reason: 'superseded-by-later-intent',
    });
  }

  transitions.push({
    id: intents[matchedIndex]!.id,
    status: 'completed',
  });

  return {
    remainingIntents: intents.slice(matchedIndex + 1),
    transitions,
    shouldTranslateRoute: false,
  };
}

function findLastMatchingIntentIndex(
  intents: readonly PendingNavigationIntent[],
  finalFullPath: string,
): number {
  for (let index = intents.length - 1; index >= 0; index -= 1) {
    if (intents[index]!.targetFullPath === finalFullPath) {
      return index;
    }
  }

  return -1;
}
