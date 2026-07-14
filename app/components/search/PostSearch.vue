<script setup lang="ts">
import type { LogicalPost, PostVariant, SupportedLocale } from '~/utils/posts'
import { groupPostVariants, selectPostVariant } from '~/utils/posts'

type SortMode = 'relevance' | 'latest' | 'oldest'

interface DisplayPost {
  articleKeyPath: string
  post: PostVariant
  score: number
}

const props = defineProps<{
  posts: PostVariant[]
}>()

const route = useRoute()
const router = useRouter()
const { search } = usePagefind()
const logicalPosts = computed(() => groupPostVariants(props.posts))
const query = ref('')
const pageLocale = ref<SupportedLocale>('zh-CN')
const sort = ref<SortMode>('latest')
const hits = shallowRef(new Map<string, number>())
const loading = ref(false)
const error = ref('')
const initialized = ref(false)
const hasQuery = computed(() => Boolean(query.value.trim()))
let searchTimer: ReturnType<typeof setTimeout> | undefined
let requestId = 0
let applyingRouteQuery = false

const text = computed(() =>
  pageLocale.value === 'en'
    ? {
        searchLabel: 'Search posts',
        searchPlaceholder: 'Search titles and content…',
        languageLabel: 'Display language',
        sortLabel: 'Sort by',
        relevance: 'Relevance',
        latest: 'Newest',
        oldest: 'Oldest',
        loading: 'Searching…',
        noResults: 'No matching posts.',
        allPosts: 'posts',
        results: 'results',
        searchUnavailable: 'Full-text search is unavailable. Showing all posts.',
      }
    : {
        searchLabel: '搜索文章',
        searchPlaceholder: '搜索标题和正文…',
        languageLabel: '显示语言',
        sortLabel: '排序',
        relevance: '相关度',
        latest: '最新发布',
        oldest: '最早发布',
        loading: '正在搜索…',
        noResults: '没有匹配的文章。',
        allPosts: '篇文章',
        results: '条结果',
        searchUnavailable: '全文搜索暂不可用，当前展示全部文章。',
      },
)

const displayPosts = computed<DisplayPost[]>(() => {
  const normalizedQuery = query.value.trim()
  const searchableGroups = normalizedQuery && !error.value
    ? logicalPosts.value.filter((post) => hits.value.has(post.articleKeyPath))
    : logicalPosts.value
  const selectedPosts = searchableGroups.map((logicalPost) => ({
    articleKeyPath: logicalPost.articleKeyPath,
    post: selectPostVariant(logicalPost, pageLocale.value),
    score: hits.value.get(logicalPost.articleKeyPath) ?? 0,
  }))

  return selectedPosts.sort(comparePosts)
})

const resultSummary = computed(() => {
  if (loading.value) {
    return text.value.loading
  }

  if (query.value.trim() && !error.value) {
    return `${displayPosts.value.length} ${text.value.results}`
  }

  return `${displayPosts.value.length} ${text.value.allPosts}`
})

useHead(() => ({
  htmlAttrs: {
    lang: pageLocale.value,
  },
}))

onMounted(() => {
  initialized.value = true
  applyRouteQuery()
})

watch(
  () => route.query,
  () => {
    if (initialized.value) {
      applyRouteQuery()
    }
  },
  { deep: true },
)

watch(query, (value, previousValue) => {
  if (!initialized.value || applyingRouteQuery) {
    return
  }

  const hasQuery = Boolean(value.trim())
  const hadQuery = Boolean(previousValue.trim())

  if (hasQuery && !hadQuery) {
    sort.value = 'relevance'
  } else if (!hasQuery && hadQuery && sort.value === 'relevance') {
    sort.value = 'latest'
  }

  scheduleSearch()
  void syncRouteQuery()
})

watch([pageLocale, sort], () => {
  if (initialized.value && !applyingRouteQuery) {
    void syncRouteQuery()
  }
})

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
})

function scheduleSearch(): void {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  const normalizedQuery = query.value.trim()

  if (!normalizedQuery) {
    requestId += 1
    hits.value = new Map()
    loading.value = false
    error.value = ''
    return
  }

  loading.value = true
  searchTimer = setTimeout(() => {
    void runSearch(normalizedQuery)
  }, 200)
}

async function runSearch(searchQuery: string): Promise<void> {
  const currentRequestId = ++requestId

  try {
    const results = await search(searchQuery)

    if (currentRequestId !== requestId) {
      return
    }

    hits.value = new Map(results.map((result) => [result.articleKeyPath, result.score]))
    error.value = ''
  } catch (searchError) {
    if (currentRequestId !== requestId) {
      return
    }

    console.error('Pagefind 搜索失败', searchError)
    hits.value = new Map()
    error.value = text.value.searchUnavailable
  } finally {
    if (currentRequestId === requestId) {
      loading.value = false
    }
  }
}

function applyRouteQuery(): void {
  applyingRouteQuery = true
  const nextQuery = firstQueryValue(route.query.q)
  const nextLocale: SupportedLocale = firstQueryValue(route.query.lang) === 'en' ? 'en' : 'zh-CN'
  const requestedSort = firstQueryValue(route.query.sort)
  const nextSort: SortMode = nextQuery.trim()
    ? 'relevance'
    : requestedSort === 'oldest'
      ? 'oldest'
      : 'latest'

  if (query.value !== nextQuery) {
    query.value = nextQuery
  }

  if (pageLocale.value !== nextLocale) {
    pageLocale.value = nextLocale
  }

  if (sort.value !== nextSort) {
    sort.value = nextSort
  }

  if (nextQuery.trim()) {
    scheduleSearch()
  }

  void nextTick(() => {
    applyingRouteQuery = false
    void syncRouteQuery()
  })
}

async function syncRouteQuery(): Promise<void> {
  const nextQuery = { ...route.query }
  const normalizedQuery = query.value.trim()
  const defaultSort: SortMode = normalizedQuery ? 'relevance' : 'latest'

  delete nextQuery.q
  delete nextQuery.lang
  delete nextQuery.sort

  if (normalizedQuery) {
    nextQuery.q = normalizedQuery
  }

  if (pageLocale.value === 'en') {
    nextQuery.lang = 'en'
  }

  if (sort.value !== defaultSort) {
    nextQuery.sort = sort.value
  }

  await router.replace({ query: nextQuery })
}

function comparePosts(left: DisplayPost, right: DisplayPost): number {
  if (sort.value === 'relevance' && query.value.trim() && !error.value) {
    return right.score - left.score || left.articleKeyPath.localeCompare(right.articleKeyPath)
  }

  const direction = sort.value === 'oldest' ? 1 : -1
  const dateDifference =
    new Date(left.post.publishedAt).getTime() - new Date(right.post.publishedAt).getTime()

  return dateDifference * direction || left.articleKeyPath.localeCompare(right.articleKeyPath)
}

function formatDate(value: Date | string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function toDateTime(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10)
}

function firstQueryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : ''
  }

  return typeof value === 'string' ? value : ''
}

</script>

<template>
  <section class="post-search">
    <form class="post-search__controls" role="search" @submit.prevent>
      <label class="post-search__query">
        <span>{{ text.searchLabel }}</span>
        <input
          v-model="query"
          type="search"
          name="q"
          :placeholder="text.searchPlaceholder"
          autocomplete="off"
        >
      </label>

      <label>
        <span>{{ text.languageLabel }}</span>
        <select v-model="pageLocale" name="lang">
          <option value="zh-CN">中文</option>
          <option value="en">English</option>
        </select>
      </label>

      <label>
        <span>{{ text.sortLabel }}</span>
        <select v-model="sort" name="sort" :disabled="hasQuery">
          <option v-if="hasQuery" value="relevance">{{ text.relevance }}</option>
          <option value="latest">{{ text.latest }}</option>
          <option value="oldest">{{ text.oldest }}</option>
        </select>
      </label>
    </form>

    <p v-if="error" class="search-status" role="status">
      {{ error }}
    </p>
    <p v-else class="search-status" aria-live="polite">
      {{ resultSummary }}
    </p>

    <p v-if="query.trim() && !loading && !error && displayPosts.length === 0">
      {{ text.noResults }}
    </p>

    <ul v-else class="search-results">
      <li v-for="item in displayPosts" :key="item.articleKeyPath">
        <article :lang="item.post.locale">
          <h2>
            <NuxtLink :to="item.post.path">{{ item.post.title }}</NuxtLink>
          </h2>
          <p>{{ item.post.description }}</p>
          <footer>
            <time :datetime="toDateTime(item.post.publishedAt)">
              {{ formatDate(item.post.publishedAt, item.post.locale) }}
            </time>
            <span v-for="tag in item.post.tags ?? []" :key="tag">#{{ tag }}</span>
          </footer>
        </article>
      </li>
    </ul>
  </section>
</template>
