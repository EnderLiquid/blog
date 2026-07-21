import { parseLocalizedPath } from '../routing/localized-routes.ts';
import { findPostSource, type SiteBuildContext } from '../site-manifest/context.ts';
import type { ArticleDeliveryPageResource, StaticPageResource } from '../site-manifest/model.ts';
import { SUPPORTED_LOCALE_CODES, type LocaleCode } from '../i18n/locales.ts';

export const SHELL_NAVIGATION_PROJECTION_VERSION = 1 as const;

export type ShellNavigationResourceKind = 'home' | 'posts' | 'article';

export interface ShellNavigationResource {
  resourceId: string;
  publicPath: string;
  virtualPath: string;
  localeCode: LocaleCode;
  kind: ShellNavigationResourceKind;
  articleKeyPath?: string;
  title?: string;
  navigableParentPath?: string;
}

export interface ShellNavigationProjection {
  version: typeof SHELL_NAVIGATION_PROJECTION_VERSION;
  resources: ShellNavigationResource[];
}

/**
 * 将站点公开页面拓扑投影为Shell可浏览的虚拟路径。
 * 文章标题来自PostSource，只服务于ls输出，不进入Manifest。
 */
export function createShellNavigationProjection(
  context: SiteBuildContext,
): ShellNavigationProjection {
  const resources = context.manifest.resources
    .flatMap((resource): ShellNavigationResource[] => {
      if (resource.kind === 'article-page' || resource.kind === 'article-fallback-page') {
        return [createArticleResource(context, resource)];
      }

      if (resource.kind === 'static-page' && resource.localeCode) {
        const shellKind = staticPageKind(resource);
        return shellKind ? [createStaticResource(resource, resource.localeCode, shellKind)] : [];
      }

      return [];
    })
    .sort(compareShellResources);

  validateShellResources(resources);

  return {
    version: SHELL_NAVIGATION_PROJECTION_VERSION,
    resources,
  };
}

function createStaticResource(
  resource: StaticPageResource,
  localeCode: LocaleCode,
  kind: 'home' | 'posts',
): ShellNavigationResource {
  return {
    resourceId: resource.id,
    publicPath: resource.path,
    virtualPath: virtualPathFromPublicPath(resource.path, localeCode),
    localeCode,
    kind,
    ...(kind === 'posts' ? { navigableParentPath: '/' } : {}),
  };
}

function createArticleResource(
  context: SiteBuildContext,
  resource: ArticleDeliveryPageResource,
): ShellNavigationResource {
  const post = findPostSource(context, resource);

  return {
    resourceId: resource.id,
    publicPath: resource.path,
    virtualPath: virtualPathFromPublicPath(resource.path, resource.localeCode),
    localeCode: resource.localeCode,
    kind: 'article',
    articleKeyPath: resource.articleKeyPath,
    title: post.metadata.title,
    navigableParentPath: '/posts/',
  };
}

function staticPageKind(resource: StaticPageResource): 'home' | 'posts' | undefined {
  if (resource.pageId === 'home') {
    return 'home';
  }

  if (resource.pageId === 'posts') {
    return 'posts';
  }

  return undefined;
}

function virtualPathFromPublicPath(publicPath: string, localeCode: LocaleCode): string {
  const localizedPath = parseLocalizedPath(publicPath);

  if (!localizedPath || localizedPath.localeCode !== localeCode) {
    throw new Error(`${publicPath}: Shell导航资源缺少一致的语言前缀`);
  }

  return localizedPath.pathWithoutLocale;
}

function compareShellResources(
  left: ShellNavigationResource,
  right: ShellNavigationResource,
): number {
  return (
    SUPPORTED_LOCALE_CODES.indexOf(left.localeCode) -
      SUPPORTED_LOCALE_CODES.indexOf(right.localeCode) ||
    left.virtualPath.localeCompare(right.virtualPath) ||
    left.resourceId.localeCompare(right.resourceId)
  );
}

function validateShellResources(resources: readonly ShellNavigationResource[]): void {
  const publicPaths = new Set<string>();
  const virtualPaths = new Set<string>();
  const errors: string[] = [];

  for (const resource of resources) {
    const virtualIdentity = `${resource.localeCode}:${resource.virtualPath}`;

    if (publicPaths.has(resource.publicPath)) {
      errors.push(`公开路径重复：“${resource.publicPath}”`);
    }

    if (virtualPaths.has(virtualIdentity)) {
      errors.push(`虚拟路径重复：“${virtualIdentity}”`);
    }

    publicPaths.add(resource.publicPath);
    virtualPaths.add(virtualIdentity);
  }

  if (errors.length > 0) {
    throw new Error(`Shell导航投影校验失败：\n${errors.map((error) => `- ${error}`).join('\n')}`);
  }
}
