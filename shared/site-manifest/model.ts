import { z } from 'zod';
import { isLocaleCode, type LocaleCode } from '../i18n/locales.ts';

export const SITE_MANIFEST_VERSION = 1 as const;

const localeCodeSchema = z
  .string()
  .refine(isLocaleCode, '不支持的语言代码') as z.ZodType<LocaleCode>;
const resourceBaseSchema = z.object({
  id: z.string().min(1),
  path: z.string().startsWith('/'),
});

export const staticPageResourceSchema = resourceBaseSchema
  .extend({
    kind: z.literal('static-page'),
    pageId: z.string().min(1),
    localeCode: localeCodeSchema.optional(),
    indexability: z.enum(['index', 'noindex']),
    localizationGroupId: z.string().min(1).optional(),
    title: z.string().min(1),
    description: z.string().min(1),
  })
  .strict();

export const articlePageResourceSchema = resourceBaseSchema
  .extend({
    kind: z.literal('article-page'),
    articleKeyPath: z.string().min(1),
    localeCode: localeCodeSchema,
    localizationGroupId: z.string().min(1),
    indexability: z.literal('index'),
    title: z.string().min(1),
    description: z.string().min(1),
    publishedAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
    tags: z.array(z.string()),
  })
  .strict();

export const machineResourceSchema = resourceBaseSchema
  .extend({
    kind: z.literal('machine'),
    machineType: z.enum(['rss', 'sitemap', 'robots']),
    localeCode: localeCodeSchema.optional(),
  })
  .strict();

export const siteResourceSchema = z.discriminatedUnion('kind', [
  staticPageResourceSchema,
  articlePageResourceSchema,
  machineResourceSchema,
]);

export const localizationGroupSchema = z
  .object({
    id: z.string().min(1),
    memberResourceIds: z.array(z.string().min(1)).min(1),
    xDefaultPath: z.string().startsWith('/'),
  })
  .strict();

export const siteManifestSchema = z
  .object({
    version: z.literal(SITE_MANIFEST_VERSION),
    siteOrigin: z.string().url(),
    resources: z.array(siteResourceSchema),
    localizationGroups: z.array(localizationGroupSchema),
  })
  .strict();

export type StaticPageResource = z.infer<typeof staticPageResourceSchema>;
export type ArticlePageResource = z.infer<typeof articlePageResourceSchema>;
export type MachineResource = z.infer<typeof machineResourceSchema>;
export type SiteResource = z.infer<typeof siteResourceSchema>;
export type LocalizationGroup = z.infer<typeof localizationGroupSchema>;
export type SiteManifest = z.infer<typeof siteManifestSchema>;
export type PageResource = StaticPageResource | ArticlePageResource;
export type Indexability = PageResource['indexability'];
export type MachineType = MachineResource['machineType'];

export function parseSiteManifest(value: unknown): SiteManifest {
  return siteManifestSchema.parse(value);
}

export function isPageResource(resource: SiteResource): resource is PageResource {
  return resource.kind === 'static-page' || resource.kind === 'article-page';
}
