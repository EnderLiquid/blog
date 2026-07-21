<script setup lang="ts">
import { homePath } from '~~/shared/routing/localized-routes';
import {
  LOCALE_DEFINITIONS,
  resolveLocalePreference,
  SUPPORTED_LOCALE_CODES,
} from '~~/shared/i18n/locales';
import { ROOT_PAGE_MESSAGES } from '~~/shared/i18n/messages';

const languageLinks = LOCALE_DEFINITIONS.map((definition) => ({
  ...definition,
  path: homePath(definition.code),
}));

onMounted(() => {
  // GitHub Pages无法在服务端协商语言。共享解析器先完成全部精确匹配，再执行模糊匹配，
  // 并在完全无法匹配时按网站语言优先级fallback。
  const browserLocaleCode = resolveLocalePreference(navigator.languages, SUPPORTED_LOCALE_CODES);

  if (browserLocaleCode) {
    void navigateTo(homePath(browserLocaleCode), { replace: true });
  }
});
</script>

<template>
  <LayoutPageShell>
    <section class="language-entry" aria-labelledby="language-entry-title">
      <p class="prompt">visitor@blog:~$ locale</p>
      <h1 id="language-entry-title">{{ ROOT_PAGE_MESSAGES.title }}</h1>
      <p>{{ ROOT_PAGE_MESSAGES.description }}</p>

      <ul>
        <li v-for="link in languageLinks" :key="link.code">
          <NuxtLink :to="link.path" :lang="link.code">
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
  margin: 0.5rem 0 1rem;
  font-family: var(--font-serif);
  font-size: clamp(3.5rem, 14vw, 8rem);
  font-weight: 400;
  line-height: 0.9;
  letter-spacing: -0.06em;
}

ul {
  display: flex;
  gap: 1.5rem;
  margin-top: 2rem;
  padding: 0;
  list-style: none;
}
</style>
