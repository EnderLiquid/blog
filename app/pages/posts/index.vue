<script setup lang="ts">
const { data: posts } = await useAsyncData('all-posts', () =>
  queryCollection('posts')
    .where('draft', '=', false)
    .order('publishedAt', 'DESC')
    .all(),
)

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'long',
  timeZone: 'UTC',
})

function formatDate(value: Date | string): string {
  return dateFormatter.format(new Date(value))
}

function toDateTime(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10)
}

useSeoMeta({
  title: '全部文章',
  description: '全部中文和英文文章。',
})
</script>

<template>
  <main class="page-shell">
    <NuxtLink class="back-link" to="/">← 返回首页</NuxtLink>

    <header class="article-header">
      <h1>全部文章</h1>
      <p>中文与英文版本分别列出。</p>
    </header>

    <ul class="post-list">
      <li v-for="post in posts" :key="post.path">
        <NuxtLink :to="post.path">
          <span>{{ post.title }} [{{ post.locale }}]</span>
          <time :datetime="toDateTime(post.publishedAt)">
            {{ formatDate(post.publishedAt) }}
          </time>
        </NuxtLink>
      </li>
    </ul>
  </main>
</template>
