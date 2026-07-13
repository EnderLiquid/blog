# 使用语义化路径标识多语言文章

文章采用 `content/posts/<articleKeyPath>/<locale>.md` 结构，并生成 `/posts/<articleKeyPath>/<locale>/` 永久链接。完整的 `articleKeyPath` 是跨语言共享且发布后不可变的文章身份，同一目录下的 `zh-cn.md` 与 `en.md` 是该文章的不同语言版本。我们不使用随机 UID 或独立 `translationKey`，因为语义化路径更便于在项目 README、日志和人工维护中识别，也能通过目录天然表达翻译关系；代价是已发布目录不能移动，未来确需调整时必须保留旧 URL 重定向。
