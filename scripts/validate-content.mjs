import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parse } from 'yaml';
import { parseLocaleCode, SUPPORTED_LOCALE_CODES } from '../shared/i18n/locales.ts';

const postsDirectory = path.join(process.cwd(), 'content', 'posts');
const routeManifestPath = path.join(process.cwd(), '.data', 'content-routes.json');
const articleSegmentPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const tagPattern = articleSegmentPattern;

const files = await findMarkdownFiles(postsDirectory);
const errors = [];
const routes = new Set();
const tagsByArticle = new Map();

for (const file of files) {
  const relativePath = path.relative(postsDirectory, file).replaceAll('\\', '/');
  const pathSegments = relativePath.split('/');
  const localeFile = pathSegments.pop();
  const localeValue = localeFile?.replace(/\.md$/, '') ?? '';
  let localeCode;

  try {
    localeCode = parseLocaleCode(localeValue);
  } catch {
    errors.push(`${relativePath}: 文件名必须是 ${SUPPORTED_LOCALE_CODES.join(' 或 ')}`);
    continue;
  }

  if (pathSegments.length === 0) {
    errors.push(`${relativePath}: 文章必须放在 articleKeyPath 目录中`);
    continue;
  }

  for (const segment of pathSegments) {
    if (!articleSegmentPattern.test(segment)) {
      errors.push(`${relativePath}: 路径段 “${segment}” 不符合小写 kebab-case 约定`);
    }
  }

  const source = await readFile(file, 'utf8');
  const frontmatter = readFrontmatter(source, relativePath, errors);

  if (!frontmatter) {
    continue;
  }

  const tags = validateTags(frontmatter.tags, relativePath, errors);
  const articleKeyPath = pathSegments.join('/');
  const articleTags = tagsByArticle.get(articleKeyPath) ?? [];
  articleTags.push({ relativePath, tags });
  tagsByArticle.set(articleKeyPath, articleTags);

  if (frontmatter.draft !== true) {
    // 静态主机不会根据查询参数协商语言，每个语言版本必须拥有独立前缀路由。
    const route = `/${localeCode}/posts/${pathSegments.join('/')}/`;

    if (routes.has(route)) {
      errors.push(`${relativePath}: 路由 ${route} 重复`);
    }

    routes.add(route);
  }
}

for (const [articleKeyPath, versions] of tagsByArticle) {
  const expectedTags = versions[0]?.tags ?? [];

  for (const version of versions.slice(1)) {
    if (!sameValues(expectedTags, version.tags)) {
      errors.push(
        `${articleKeyPath}: 各语言版本的标签必须一致；${versions[0].relativePath} 为 ` +
          `[${expectedTags.join(', ')}]，${version.relativePath} 为 [${version.tags.join(', ')}]`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error('文章结构校验失败：\n');
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

await mkdir(path.dirname(routeManifestPath), { recursive: true });
await writeFile(routeManifestPath, `${JSON.stringify([...routes].sort(), null, 2)}\n`);
console.log(`文章结构校验通过，共生成 ${routes.size} 条文章路由。`);

async function findMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return findMarkdownFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith('.md') ? [entryPath] : [];
    }),
  );

  return nestedFiles.flat();
}

function validateTags(value, relativePath, errors) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((tag) => typeof tag !== 'string')) {
    errors.push(`${relativePath}: tags 必须是字符串数组`);
    return [];
  }

  const tags = [...new Set(value)].sort();

  if (tags.length !== value.length) {
    errors.push(`${relativePath}: tags 不能包含重复值`);
  }

  for (const tag of tags) {
    if (!tagPattern.test(tag)) {
      errors.push(`${relativePath}: 标签 “${tag}” 不符合小写 kebab-case 约定`);
    }
  }

  return tags;
}

function sameValues(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function readFrontmatter(source, relativePath, errors) {
  const match = source.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

  if (!match) {
    errors.push(`${relativePath}: 缺少有效的 YAML Frontmatter`);
    return undefined;
  }

  try {
    const frontmatter = parse(match[1]);

    if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
      errors.push(`${relativePath}: Frontmatter 必须是 YAML 对象`);
      return undefined;
    }

    return frontmatter;
  } catch (error) {
    errors.push(`${relativePath}: Frontmatter 解析失败：${error.message}`);
    return undefined;
  }
}
