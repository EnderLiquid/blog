# 全站使用语言前缀并以语义路径标识文章

站点的所有可阅读页面统一使用显式语言前缀，例如 `/zh-cn/posts/<articleKeyPath>/` 和 `/en/posts/<articleKeyPath>/`；根路径 `/` 仅作为语言中立的 `x-default` 入口。URL 是页面语言的唯一事实来源，查询参数只描述搜索等页面状态。该方案取代开发期采用的 `/posts/<articleKeyPath>/<locale>/` 文章路由。

文章继续采用 `content/posts/<articleKeyPath>/<locale>.md` 结构，完整的 `articleKeyPath` 是跨语言共享且发布后不可变的文章身份。我们保留语义化路径，不使用随机 UID 或独立 `translationKey`，因为目录可以自然表达翻译关系，也便于在 README、日志和人工维护中识别。

语言前缀会使默认中文 URL 稍长，但它比查询参数更适合 GitHub Pages 静态托管，也比语言后缀更容易统一解析。每种语言因此拥有独立静态 HTML、稳定的 Pagefind 索引以及明确的 canonical 和 hreflang。未来确需修改已发布的 `articleKeyPath` 或语言路由时，必须保留旧 URL 重定向。

# 使用单一小写 BCP 47语言代码

站点使用 `zh-cn`、`en` 形式的单一 `LocaleCode` 表示语言，并直接用于 URL、内容文件名、HTML lang、hreflang、Intl、messages 和 Pagefind。BCP 47标签不区分大小写，因此不再分别维护 `zh-cn`、`zh-CN` 和 Pagefind语言键；外部系统未来确有不同要求时，只在对应适配器中派生转换。

文章语言由 `content/posts/<articleKeyPath>/<localeCode>.md` 的文件名唯一确定，Frontmatter不再重复保存 locale。共享语言模块提供严格完整解析和兼容基础语言匹配；浏览器候选顺序和最终默认回退由根入口页面负责，保证共享模块不依赖浏览器环境。
