import type { ComputedRef, Ref } from 'vue';
import { createDisplayPosts, type PostSortMode } from '~/utils/post-search';
import type { LogicalPost } from '~/utils/posts';
import type { LocaleKey } from '~~/shared/i18n/locales';

/** 管理防抖、Pagefind 请求和可显示文章；URL 同步由 usePostSearchRoute 负责。 */
export function usePostSearch(
  logicalPosts: ComputedRef<LogicalPost[]>,
  localeKey: ComputedRef<LocaleKey>,
  query: Ref<string>,
  sortMode: Ref<PostSortMode>,
) {
  const { search } = usePagefind();
  const searchScores = shallowRef(new Map<string, number>());
  const loading = ref(false);
  const searchError = shallowRef<unknown>();
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let latestSearchRequestId = 0;
  let mounted = false;

  const hasQuery = computed(() => Boolean(query.value.trim()));
  const displayPosts = computed(() =>
    createDisplayPosts(
      logicalPosts.value,
      localeKey.value,
      searchScores.value,
      hasQuery.value,
      !searchError.value,
      sortMode.value,
    ),
  );

  onMounted(() => {
    mounted = true;
    scheduleSearch();
  });

  watch(query, () => {
    if (mounted) {
      scheduleSearch();
    }
  });

  onBeforeUnmount(() => {
    if (searchTimer) {
      clearTimeout(searchTimer);
    }
  });

  function scheduleSearch(): void {
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    const normalizedQuery = query.value.trim();

    if (!normalizedQuery) {
      latestSearchRequestId += 1;
      searchScores.value = new Map();
      loading.value = false;
      searchError.value = undefined;
      return;
    }

    loading.value = true;
    searchTimer = setTimeout(() => {
      void runSearch(normalizedQuery);
    }, 200);
  }

  async function runSearch(searchQuery: string): Promise<void> {
    const searchRequestId = ++latestSearchRequestId;

    try {
      const results = await search(searchQuery);

      if (searchRequestId !== latestSearchRequestId) {
        return;
      }

      searchScores.value = new Map(results.map((result) => [result.articleKeyPath, result.score]));
      searchError.value = undefined;
    } catch (error) {
      if (searchRequestId !== latestSearchRequestId) {
        return;
      }

      console.error('Pagefind 搜索失败', error);
      searchScores.value = new Map();
      searchError.value = error;
    } finally {
      if (searchRequestId === latestSearchRequestId) {
        loading.value = false;
      }
    }
  }

  return {
    displayPosts,
    hasQuery,
    loading,
    searchError,
  };
}
