import type { PostSortMode } from '~/utils/post-search';

/**
 * 管理文章列表的 q、sort 查询参数。
 * 这里只处理 URL 状态，不执行搜索，也不感知 Pagefind。
 */
export function usePostSearchRoute() {
  const route = useRoute();
  const router = useRouter();
  const query = ref(firstQueryValue(route.query.q));
  const sortMode = ref<PostSortMode>(resolveSortMode(query.value, route.query.sort));
  let applyingRouteQuery = false;
  let routeSyncScheduled = false;

  const hasQuery = computed(() => Boolean(query.value.trim()));

  watch(
    () => route.query,
    () => applyRouteQuery(),
    { deep: true },
  );

  watch(query, (value, previousValue) => {
    if (applyingRouteQuery) {
      return;
    }

    const queryActive = Boolean(value.trim());
    const queryWasActive = Boolean(previousValue.trim());

    if (queryActive) {
      sortMode.value = 'relevance';
    } else if (queryWasActive) {
      sortMode.value = 'latest';
    }

    scheduleRouteSync();
  });

  watch(sortMode, () => {
    if (!applyingRouteQuery) {
      scheduleRouteSync();
    }
  });

  onMounted(() => {
    // 静态页面 hydration 会在 mounted 阶段恢复初始 route。延迟到下一个宏任务，
    // 才能保证规范化结果不会被初始 URL 再次覆盖。
    window.setTimeout(() => {
      void syncRouteQuery();
    }, 0);
  });

  function applyRouteQuery(): void {
    applyingRouteQuery = true;

    const nextQuery = firstQueryValue(route.query.q);
    query.value = nextQuery;
    sortMode.value = resolveSortMode(nextQuery, route.query.sort);

    void nextTick(() => {
      applyingRouteQuery = false;
    });
  }

  function scheduleRouteSync(): void {
    if (routeSyncScheduled) {
      return;
    }

    routeSyncScheduled = true;
    void nextTick(async () => {
      routeSyncScheduled = false;
      await syncRouteQuery();
    });
  }

  async function syncRouteQuery(): Promise<void> {
    const nextQuery = { ...route.query };
    const normalizedQuery = query.value.trim();

    delete nextQuery.q;
    delete nextQuery.sort;
    delete nextQuery.lang;

    if (normalizedQuery) {
      nextQuery.q = normalizedQuery;
    } else if (sortMode.value === 'oldest') {
      nextQuery.sort = 'oldest';
    }

    const canonicalPath = route.path.endsWith('/') ? route.path : `${route.path}/`;
    await router.replace({ path: canonicalPath, query: nextQuery });
  }

  return {
    query,
    sortMode,
    hasQuery,
  };
}

function resolveSortMode(query: string, rawSortMode: unknown): PostSortMode {
  if (query.trim()) {
    return 'relevance';
  }

  return firstQueryValue(rawSortMode) === 'oldest' ? 'oldest' : 'latest';
}

function firstQueryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }

  return typeof value === 'string' ? value : '';
}
