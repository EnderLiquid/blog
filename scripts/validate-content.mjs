import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { parse } from 'yaml'

const postsDirectory = path.join(process.cwd(), 'content', 'posts')
const routeManifestPath = path.join(process.cwd(), '.data', 'content-routes.json')
const articleSegmentPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const locales = new Map([
  ['zh-cn', 'zh-CN'],
  ['en', 'en'],
])

const files = await findMarkdownFiles(postsDirectory)
const errors = []
const routes = new Set()

for (const file of files) {
  const relativePath = path.relative(postsDirectory, file).replaceAll('\\', '/')
  const pathSegments = relativePath.split('/')
  const localeFile = pathSegments.pop()
  const localeSlug = localeFile?.replace(/\.md$/, '') ?? ''
  const expectedLocale = locales.get(localeSlug)

  if (pathSegments.length === 0) {
    errors.push(`${relativePath}: 文章必须放在 articleKeyPath 目录中`)
    continue
  }

  for (const segment of pathSegments) {
    if (!articleSegmentPattern.test(segment)) {
      errors.push(`${relativePath}: 路径段 “${segment}” 不符合小写 kebab-case 约定`)
    }
  }

  if (!expectedLocale) {
    errors.push(`${relativePath}: 文件名必须是 ${[...locales.keys()].join(' 或 ')}`)
    continue
  }

  const source = await readFile(file, 'utf8')
  const frontmatter = readFrontmatter(source, relativePath, errors)

  if (!frontmatter) {
    continue
  }

  if (frontmatter.locale !== expectedLocale) {
    errors.push(
      `${relativePath}: locale 应为 “${expectedLocale}”，实际为 “${String(frontmatter.locale)}”`,
    )
  }

  if (frontmatter.draft !== true) {
    const route = `/posts/${pathSegments.join('/')}/${localeSlug}/`

    if (routes.has(route)) {
      errors.push(`${relativePath}: 路由 ${route} 重复`)
    }

    routes.add(route)
  }
}

if (errors.length > 0) {
  console.error('文章结构校验失败：\n')
  console.error(errors.map((error) => `- ${error}`).join('\n'))
  process.exit(1)
}

await mkdir(path.dirname(routeManifestPath), { recursive: true })
await writeFile(routeManifestPath, `${JSON.stringify([...routes].sort(), null, 2)}\n`)
console.log(`文章结构校验通过，共生成 ${routes.size} 条文章路由。`)

async function findMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nestedFiles = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        return findMarkdownFiles(entryPath)
      }

      return entry.isFile() && entry.name.endsWith('.md') ? [entryPath] : []
    }),
  )

  return nestedFiles.flat()
}

function readFrontmatter(source, relativePath, errors) {
  const match = source.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)

  if (!match) {
    errors.push(`${relativePath}: 缺少有效的 YAML Frontmatter`)
    return undefined
  }

  try {
    const frontmatter = parse(match[1])

    if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
      errors.push(`${relativePath}: Frontmatter 必须是 YAML 对象`)
      return undefined
    }

    return frontmatter
  } catch (error) {
    errors.push(`${relativePath}: Frontmatter 解析失败：${error.message}`)
    return undefined
  }
}
