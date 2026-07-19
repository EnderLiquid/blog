import { SITE_SEO_INDEX } from '~/generated/site-seo-index';

/**
 * 将构建期SEO投影集中映射到Nuxt head。
 *
 * 该适配器只负责响应当前route并注册标签，不重新推导页面、语言组或机器资源。
 */
export function useSiteSeo() {
  const route = useRoute();
  const descriptor = computed(() => {
    const exactDescriptor = SITE_SEO_INDEX[route.path];

    if (exactDescriptor || route.path.endsWith('/')) {
      return exactDescriptor;
    }

    return SITE_SEO_INDEX[`${route.path}/`];
  });

  useSeoMeta({
    title: () => descriptor.value?.title,
    description: () => descriptor.value?.description,
    robots: () => (descriptor.value?.indexability === 'noindex' ? 'noindex, follow' : undefined),
  });

  useHead(() => {
    const seo = descriptor.value;

    if (!seo) {
      return {};
    }

    return {
      link: [
        ...(seo.canonicalUrl
          ? [
              {
                rel: 'canonical',
                href: seo.canonicalUrl,
              },
            ]
          : []),
        ...seo.languageAlternates.map((alternate) => ({
          rel: 'alternate',
          hreflang: alternate.localeCode,
          href: alternate.url,
        })),
        ...seo.feeds.map((feed) => ({
          rel: 'alternate',
          type: 'application/rss+xml',
          title: feed.title,
          href: feed.url,
        })),
      ],
    };
  });

  return {
    descriptor,
  };
}
