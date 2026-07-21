import { findArticleDeliveryByPath } from '~/utils/article-delivery';

/** 从当前公开文章路径读取构建期生成的正文投递关系。 */
export function useArticleDeliveryDescriptor() {
  const route = useRoute();
  const descriptor = computed(() => findArticleDeliveryByPath(route.path));

  return {
    descriptor,
  };
}
