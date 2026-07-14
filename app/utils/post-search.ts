import type { LogicalPost, RoutedPostVariant } from '~/utils/posts';
import { selectPostVariant } from '~/utils/posts';
import type { LocaleCode } from '~~/shared/i18n/locales';

export type PostSortMode = 'relevance' | 'latest' | 'oldest';

export interface DisplayPost {
  articleKeyPath: string;
  post: RoutedPostVariant;
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

  const displayPosts = visiblePosts.map((logicalPost) => ({
    articleKeyPath: logicalPost.articleKeyPath,
    post: selectPostVariant(logicalPost, preferredLocaleCode),
    score: searchScores.get(logicalPost.articleKeyPath) ?? 0,
  }));

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
