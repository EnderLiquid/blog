<script setup lang="ts">
const route = useRoute()
const contentPath = route.path.replace(/\/+$/, '') || '/'
const articleBasePath = contentPath.slice(0, contentPath.lastIndexOf('/'))
const articleKeyPath = articleBasePath.replace(/^\/posts\//, '')
const localePaths = {
  'zh-CN': `${articleBasePath}/zh-cn`,
  en: `${articleBasePath}/en`,
} as const

const { data: post } = await useAsyncData(`post:${contentPath}`, () =>
  queryCollection('posts').path(contentPath).first(),
)

if (!post.value || post.value.draft) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在' })
}

const { data: translations } = await useAsyncData(`translations:${articleBasePath}`, async () => {
  const entries = await Promise.all(
    Object.entries(localePaths).map(async ([locale, path]) => {
      const translatedPost = await queryCollection('posts').path(path).first()

      if (!translatedPost || translatedPost.draft) {
        return undefined
      }

      return {
        locale,
        label: locale === 'zh-CN' ? '中文' : 'English',
        path: `${path}/`,
      }
    }),
  )

  return entries.filter((entry) => entry !== undefined)
})

const dateFormatter = new Intl.DateTimeFormat(post.value.locale, {
  dateStyle: 'long',
  timeZone: 'UTC',
})

function formatDate(value: Date | string): string {
  return dateFormatter.format(new Date(value))
}

function toDateTime(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10)
}

const isEnglish = computed(() => post.value?.locale === 'en')
const postTags = computed(() => post.value?.tags ?? [])

useSeoMeta({
  title: () => post.value?.title,
  description: () => post.value?.description,
})

useHead(() => {
  const alternateLinks = (translations.value ?? []).map((translation) => ({
    rel: 'alternate',
    hreflang: translation.locale,
    href: translation.path,
  }))
  const chineseTranslation = translations.value?.find(
    (translation) => translation.locale === 'zh-CN',
  )

  return {
    htmlAttrs: {
      lang: post.value?.locale ?? 'zh-CN',
    },
    link: [
      {
        rel: 'canonical',
        href: `${contentPath}/`,
      },
      ...alternateLinks,
      ...(chineseTranslation
        ? [
            {
              rel: 'alternate',
              hreflang: 'x-default',
              href: chineseTranslation.path,
            },
          ]
        : []),
    ],
  }
})
</script>

<template>
  <main v-if="post" class="page-shell article-shell">
    <nav class="article-nav" aria-label="文章导航">
      <NuxtLink class="back-link" to="/posts/">
        ← {{ isEnglish ? 'All posts' : '全部文章' }}
      </NuxtLink>

      <span v-if="translations && translations.length > 1">
        <NuxtLink
          v-for="translation in translations"
          :key="translation.locale"
          :to="translation.path"
          :aria-current="translation.locale === post.locale ? 'page' : undefined"
        >
          {{ translation.label }}
        </NuxtLink>
      </span>
    </nav>

    <article data-pagefind-body>
      <header class="article-header">
        <h1
          :data-article-key-path="articleKeyPath"
          :data-locale="post.locale"
          data-pagefind-meta="title, articleKeyPath[data-article-key-path], locale[data-locale]"
        >
          {{ post.title }}
        </h1>
        <p data-pagefind-meta="description">{{ post.description }}</p>
        <p>
          <time
            :datetime="toDateTime(post.publishedAt)"
            data-pagefind-meta="publishedAt[datetime]"
            data-pagefind-sort="publishedAt[datetime]"
          >
            {{ formatDate(post.publishedAt) }}
          </time>
          <template v-if="post.updatedAt">
            · {{ isEnglish ? 'Updated' : '更新于' }}
            <time :datetime="toDateTime(post.updatedAt)">
              {{ formatDate(post.updatedAt) }}
            </time>
          </template>
        </p>
        <ul v-if="postTags.length" class="article-tags" aria-label="标签">
          <li
            v-for="tag in postTags"
            :key="tag"
            :data-tag="tag"
            data-pagefind-filter="tag[data-tag]"
          >
            #{{ tag }}
          </li>
        </ul>
      </header>

      <ContentRenderer class="article-content" :value="post" />
    </article>
  </main>
</template>
