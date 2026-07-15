<script setup lang="ts">
import { homePath } from '~~/shared/routing/localized-routes';
import {
  DEFAULT_LOCALE_CODE,
  LOCALE_DEFINITIONS,
  matchCompatibleLocaleCode,
} from '~~/shared/i18n/locales';
import { ROOT_PAGE_METADATA } from '~~/shared/site/config';

const languageLinks = LOCALE_DEFINITIONS.map((definition) => ({
  ...definition,
  path: homePath(definition.code),
}));

onMounted(() => {
  // GitHub Pages无法在服务端协商语言。逐项检查浏览器偏好，全部不支持时才回退默认语言；
  // 模板中的普通链接保证禁用 JavaScript时仍然可以进入站点。
  let browserLocaleCode = DEFAULT_LOCALE_CODE;

  for (const preferredLanguage of navigator.languages) {
    const matchedLocaleCode = matchCompatibleLocaleCode(preferredLanguage);

    if (matchedLocaleCode) {
      browserLocaleCode = matchedLocaleCode;
      break;
    }
  }

  void navigateTo(homePath(browserLocaleCode), { replace: true });
});
</script>

<template>
  <LayoutPageShell>
    <section class="language-entry" aria-labelledby="language-entry-title">
      <p class="prompt">visitor@blog:~$ locale</p>
      <h1 id="language-entry-title">{{ ROOT_PAGE_METADATA.title }}</h1>
      <p>{{ ROOT_PAGE_METADATA.description }}</p>

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
