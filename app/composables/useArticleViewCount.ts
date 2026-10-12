import {
  createGoatCounterArticleCountUrl,
  parseGoatCounterCount,
} from '~~/shared/analytics/goatcounter';

type ArticleViewCountState = 'loading' | 'loaded' | 'unavailable';

const VIEW_COUNT_TIMEOUT_MS = 3000;

/**
 * 读取单篇文章的GoatCounter公开访问量。
 *
 * 文章身份变化时重新加载；count为undefined时表示计数尚未加载，state为unavailable
 * 时表示计数不可用，调用方应隐藏访问量展示。
 */
export function useArticleViewCount(articleKeyPath: MaybeRefOrGetter<string>) {
  const state = ref<ArticleViewCountState>('loading');
  const count = ref<number | undefined>(undefined);

  let requestId = 0;
  let activeController: AbortController | undefined;
  let activeTimeout: number | undefined;

  watch(
    () => toValue(articleKeyPath),
    (keyPath) => {
      void load(keyPath);
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    requestId += 1;
    cancelActiveRequest();
  });

  async function load(keyPath: string): Promise<void> {
    const currentRequestId = ++requestId;
    cancelActiveRequest();
    state.value = 'loading';
    count.value = undefined;

    if (!import.meta.client) {
      return;
    }

    const controller = new AbortController();
    activeController = controller;
    activeTimeout = window.setTimeout(() => controller.abort(), VIEW_COUNT_TIMEOUT_MS);

    try {
      const response = await fetch(createGoatCounterArticleCountUrl(keyPath), {
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
        signal: controller.signal,
      });

      if (response.status === 404) {
        // GoatCounter对尚未产生访问的路径返回404，但正文中的计数语义仍然是0。
        if (currentRequestId === requestId) {
          count.value = 0;
          state.value = 'loaded';
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`GoatCounter returned ${response.status}`);
      }

      const payload: unknown = await response.json();

      if (!isViewCountPayload(payload)) {
        throw new Error('GoatCounter returned an invalid count');
      }

      if (currentRequestId !== requestId) {
        return;
      }

      const parsedCount = parseGoatCounterCount(payload.count);

      if (parsedCount === undefined) {
        throw new Error('GoatCounter returned an invalid count');
      }

      count.value = parsedCount;
      state.value = 'loaded';
    } catch {
      if (currentRequestId === requestId) {
        state.value = 'unavailable';
      }
    } finally {
      if (currentRequestId === requestId) {
        cancelActiveRequest();
      }
    }
  }

  function cancelActiveRequest(): void {
    activeController?.abort();
    activeController = undefined;

    if (activeTimeout !== undefined) {
      window.clearTimeout(activeTimeout);
      activeTimeout = undefined;
    }
  }

  return { count, state };
}

function isViewCountPayload(value: unknown): value is { count: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'count' in value &&
    typeof value.count === 'string' &&
    value.count.trim().length > 0
  );
}
