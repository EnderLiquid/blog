<script setup lang="ts">
const { data: posts } = await useAsyncData('all-posts', () =>
  queryCollection('posts')
    .where('draft', '=', false)
    .order('publishedAt', 'DESC')
    .all(),
)

useSeoMeta({
  title: '全部文章',
  description: '浏览和搜索博客中的文章。',
})
</script>

<template>
  <main class="page-shell">
    <NuxtLink class="back-link" to="/">← 返回首页</NuxtLink>

    <header class="article-header">
      <h1>文章</h1>
      <p>搜索标题和正文，或按发布时间浏览。</p>
    </header>

    <SearchPostSearch :posts="posts ?? []" />
  </main>
</template>
