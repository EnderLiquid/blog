<script setup lang="ts">
const { data: posts } = await useAsyncData('posts', () =>
  queryCollection('posts')
    .where('draft', '=', false)
    .order('publishedAt', 'DESC')
    .all(),
)

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'long',
  timeZone: 'UTC',
})

function toDate(value: Date | string): Date {
  return new Date(value)
}

function toDateTime(value: Date | string): string {
  return toDate(value).toISOString().slice(0, 10)
}

function formatDate(value: Date | string): string {
  return dateFormatter.format(toDate(value))
}

useSeoMeta({
  title: 'Blog',
  description: '一个使用 Nuxt 构建的开发者博客。',
})
</script>

<template>
  <main class="page-shell">
    <header class="site-header">
      <p class="prompt">visitor@blog:~$</p>
      <h1>Blog</h1>
      <p>Nuxt 环境已经就绪。Shell 交互将在这里生长。</p>
    </header>

    <section aria-labelledby="posts-title">
      <h2 id="posts-title">文章</h2>

      <ul class="post-list">
        <li v-for="post in posts" :key="post.path">
          <NuxtLink :to="post.path">
            <span>{{ post.title }}</span>
            <time :datetime="toDateTime(post.publishedAt)">
              {{ formatDate(post.publishedAt) }}
            </time>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </main>
</template>
