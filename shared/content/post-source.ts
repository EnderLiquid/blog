import type { LocaleCode } from '../i18n/locales.ts';
import type { PostMetadata } from './post-schema.ts';

/** 已完成路径、语言和Frontmatter校验的构建期文章来源。 */
export interface PostSource {
  sourcePath: string;
  articleKeyPath: string;
  localeCode: LocaleCode;
  metadata: PostMetadata;
}
