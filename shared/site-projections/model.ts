import { z } from 'zod';
import { LOCALE_DEFINITIONS, isLocaleCode, type LocaleCode } from '../i18n/locales.ts';

const localeCodeSchema = z
  .string()
  .refine(isLocaleCode, '不支持的语言代码') as z.ZodType<LocaleCode>;
const localizedAlternateSchema = z
  .object({
    localeCode: z.union([localeCodeSchema, z.literal('x-default')]),
    url: z.string().url(),
  })
  .strict();

const feedDiscoverySchema = z
  .object({
    localeCode: localeCodeSchema,
    title: z.string().min(1),
    url: z.string().url(),
  })
  .strict();

const pageSeoDescriptorSchema = z
  .object({
    path: z.string().startsWith('/'),
    title: z.string().min(1),
    description: z.string().min(1),
    indexability: z.enum(['index', 'noindex']),
    canonicalUrl: z.string().url().optional(),
    languageAlternates: z.array(localizedAlternateSchema),
    feeds: z.array(feedDiscoverySchema),
  })
  .strict();

const pageSeoIndexSchema = z.record(z.string().startsWith('/'), pageSeoDescriptorSchema);

const rssItemSchema = z
  .object({
    articleKeyPath: z.string().min(1),
    guid: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    url: z.string().url(),
    publishedAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
    tags: z.array(z.string()),
  })
  .strict();

const rssChannelSchema = z
  .object({
    localeCode: localeCodeSchema,
    title: z.string().min(1),
    description: z.string().min(1),
    homeUrl: z.string().url(),
    selfUrl: z.string().url(),
    items: z.array(rssItemSchema),
  })
  .strict();

const rssProjectionSchema = z.array(rssChannelSchema);

const sitemapEntrySchema = z
  .object({
    url: z.string().url(),
    lastModified: z.string().datetime().optional(),
    languageAlternates: z.array(localizedAlternateSchema),
  })
  .strict();

const sitemapProjectionSchema = z.array(sitemapEntrySchema);

const robotsViewSchema = z
  .object({
    sitemapUrl: z.string().url(),
  })
  .strict();

export type LocalizedAlternateView = z.infer<typeof localizedAlternateSchema>;
export type FeedDiscoveryView = z.infer<typeof feedDiscoverySchema>;
export type PageSeoDescriptor = z.infer<typeof pageSeoDescriptorSchema>;
export type PageSeoIndexView = z.infer<typeof pageSeoIndexSchema>;
export type RssItemView = z.infer<typeof rssItemSchema>;
export type RssChannelView = z.infer<typeof rssChannelSchema>;
export type RssProjectionView = z.infer<typeof rssProjectionSchema>;
export type SitemapEntryView = z.infer<typeof sitemapEntrySchema>;
export type SitemapProjectionView = z.infer<typeof sitemapProjectionSchema>;
export type RobotsView = z.infer<typeof robotsViewSchema>;

export function parsePageSeoIndexView(value: unknown): PageSeoIndexView {
  return pageSeoIndexSchema.parse(value);
}

export function parseRssProjectionView(value: unknown): RssProjectionView {
  const projection = rssProjectionSchema.parse(value);
  const localeCodes = projection.map((channel) => channel.localeCode);

  for (const { code } of LOCALE_DEFINITIONS) {
    if (localeCodes.filter((candidate) => candidate === code).length !== 1) {
      throw new Error(`RSS投影必须恰好包含一个${code}频道`);
    }
  }

  if (localeCodes.length !== LOCALE_DEFINITIONS.length) {
    throw new Error('RSS投影包含重复或未注册频道');
  }

  return projection;
}

export function parseSitemapProjectionView(value: unknown): SitemapProjectionView {
  return sitemapProjectionSchema.parse(value);
}

export function parseRobotsView(value: unknown): RobotsView {
  return robotsViewSchema.parse(value);
}
