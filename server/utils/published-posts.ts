import { queryCollection } from '@nuxt/content/server';
import type { H3Event } from 'h3';
import { parsePostContentPath } from '../../shared/content/post-paths';
import type { LocaleCode } from '../../shared/i18n/locales';
import { articlePath } from '../../shared/routing/localized-routes';

/** 机器入口需要的最小文章投影，不携带 Markdown正文 AST。 */
export interface PublishedPostVariant {
  articleKeyPath: string;
  localeCode: LocaleCode;
  path: string;
  title: string;
  description: string;
  publishedAt: Date | string;
  updatedAt?: Date | string;
  tags: string[];
}

/** 查询并规范化所有已发布语言版本；非法内容路径应让构建失败，而不是静默漏收录。 */
export async function queryPublishedPostVariants(event: H3Event): Promise<PublishedPostVariant[]> {
  const posts = await queryCollection(event, 'posts')
    .where('draft', '=', false)
    .order('publishedAt', 'DESC')
    .all();

  return posts.map((post) => {
    const identity = parsePostContentPath(post.path);

    if (!identity) {
      throw new Error(`无法从 Nuxt Content路径解析文章语言：“${post.path}”`);
    }

    return {
      articleKeyPath: identity.articleKeyPath,
      localeCode: identity.localeCode,
      path: articlePath(identity.localeCode, identity.articleKeyPath),
      title: post.title,
      description: post.description,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      tags: post.tags ?? [],
    };
  });
}
