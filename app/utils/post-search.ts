import { findArticleDelivery } from '~/utils/article-delivery';
import { requirePostVariant, type LogicalPost, type RoutedPostVariant } from '~/utils/posts';
import type { LocaleCode } from '~~/shared/i18n/locales';

export type PostSortMode = 'relevance' | 'latest' | 'oldest';

export interface DisplayPost {
  articleKeyPath: string;
  post: RoutedPostVariant;
  displayPath: string;
  score: number;
}

/** 根据搜索命中、页面语言和排序方式生成最终可渲染列表。 */
export function createDisplayPosts(
  logicalPosts: LogicalPost[],
  preferredLocaleCode: LocaleCode,
  searchScores: ReadonlyMap<string, number>,
  queryActive: boolean,
  searchAvailable: boolean,
  sortMode: PostSortMode,
): DisplayPost[] {
  const visiblePosts =
    queryActive && searchAvailable
      ? logicalPosts.filter((post) => searchScores.has(post.articleKeyPath))
      : logicalPosts;

  const displayPosts = visiblePosts.map((logicalPost) => {
    const delivery = findArticleDelivery(logicalPost.articleKeyPath, preferredLocaleCode);

    if (!delivery) {
      throw new Error(`文章 ${logicalPost.articleKeyPath} 缺少${preferredLocaleCode}投递页面`);
    }

    return {
      articleKeyPath: logicalPost.articleKeyPath,
      post: requirePostVariant(logicalPost, delivery.contentLocaleCode),
      displayPath: delivery.path,
      score: searchScores.get(logicalPost.articleKeyPath) ?? 0,
    };
  });

  return displayPosts.sort((left, right) =>
    compareDisplayPosts(left, right, queryActive, searchAvailable, sortMode),
  );
}

function compareDisplayPosts(
  left: DisplayPost,
  right: DisplayPost,
  queryActive: boolean,
  searchAvailable: boolean,
  sortMode: PostSortMode,
): number {
  if (queryActive && searchAvailable && sortMode === 'relevance') {
    return right.score - left.score || left.articleKeyPath.localeCompare(right.articleKeyPath);
  }

  const direction = sortMode === 'oldest' ? 1 : -1;
  const dateDifference =
    new Date(left.post.publishedAt).getTime() - new Date(right.post.publishedAt).getTime();

  return dateDifference * direction || left.articleKeyPath.localeCompare(right.articleKeyPath);
}
