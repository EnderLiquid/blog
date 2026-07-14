<script setup lang="ts">
import { homePath } from '~/utils/localized-routes';
import { DEFAULT_LOCALE_KEY, LOCALE_DEFINITIONS, type LocaleKey } from '~~/shared/i18n/locales';

const languageLinks = LOCALE_DEFINITIONS.map((definition) => ({
  ...definition,
  path: homePath(definition.localeKey),
}));

useSeoMeta({
  title: 'Blog',
  description: 'Choose a language / 选择语言',
  robots: 'noindex, follow',
});

useHead({
  link: [
    { rel: 'canonical', href: '/' },
    ...LOCALE_DEFINITIONS.map((definition) => ({
      rel: 'alternate',
      hreflang: definition.languageTag,
      href: homePath(definition.localeKey),
    })),
    { rel: 'alternate', hreflang: 'x-default', href: '/' },
  ],
});

onMounted(() => {
  // GitHub Pages 无法在服务端协商语言。根入口只在浏览器中自动选择，
  // 模板中的普通链接保证禁用 JavaScript 时仍然可以进入站点。
  const browserLocaleKey: LocaleKey = navigator.language.toLowerCase().startsWith('en')
    ? 'en'
    : DEFAULT_LOCALE_KEY;

  void navigateTo(homePath(browserLocaleKey), { replace: true });
});
</script>

<template>
  <LayoutPageShell>
    <section class="language-entry" aria-labelledby="language-entry-title">
      <p class="prompt">visitor@blog:~$ locale</p>
      <h1 id="language-entry-title">Blog</h1>
      <p>Choose a language / 选择语言</p>

      <ul>
        <li v-for="link in languageLinks" :key="link.localeKey">
          <NuxtLink :to="link.path" :lang="link.languageTag">
            {{ link.label }}
          </NuxtLink>
        </li>
      </ul>
    </section>
  </LayoutPageShell>
</template>

<style scoped>
.language-entry {
  max-width: 34rem;
}

.prompt {
  color: var(--signal);
}

h1 {
  margin: 0.25rem 0 1rem;
  font-family: var(--font-serif);
  font-size: clamp(3rem, 11vw, 7rem);
  font-weight: 400;
  line-height: 0.9;
  letter-spacing: -0.06em;
}

ul {
  display: flex;
  gap: 1.5rem;
  margin: 2.5rem 0 0;
  padding: 0;
  list-style: none;
}
</style>
