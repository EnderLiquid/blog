<script setup lang="ts">
const route = useRoute()

const { data: post } = await useAsyncData(`post:${route.path}`, () =>
  queryCollection('posts').path(route.path).first(),
)

if (!post.value || post.value.draft) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在' })
}

useSeoMeta({
  title: () => post.value?.title,
  description: () => post.value?.description,
})
</script>

<template>
  <main v-if="post" class="page-shell article-shell">
    <NuxtLink class="back-link" to="/">← 返回首页</NuxtLink>

    <article>
      <header class="article-header">
        <h1>{{ post.title }}</h1>
        <p>{{ post.description }}</p>
      </header>

      <ContentRenderer class="article-content" :value="post" />
    </article>
  </main>
</template>
