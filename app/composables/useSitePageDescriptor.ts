import { SITE_SEO_INDEX } from '~/generated/site-seo-index';

/** 只读地提供当前Route对应的构建期页面描述符，不注册任何head标签。 */
export function useSitePageDescriptor() {
  const route = useRoute();

  return computed(() => {
    const exactDescriptor = SITE_SEO_INDEX[route.path];

    if (exactDescriptor || route.path.endsWith('/')) {
      return exactDescriptor;
    }

    return SITE_SEO_INDEX[`${route.path}/`];
  });
}
