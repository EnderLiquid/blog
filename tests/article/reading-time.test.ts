import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  estimateReadingTimeMinutes,
  extractArticleReadingText,
  READING_TIME_TOKENS_PER_MINUTE,
} from '../../shared/content/reading-time.ts';

const SOURCE_PATH = 'fixtures/reading-time.md';

describe('文章阅读时长文本提取', () => {
  it('保留语义文本和代码，排除图片资源与图表源码', async () => {
    const markdown = `# 文章标题

正文包含[链接文字](https://example.com/hidden-url)、\`行内代码\`和公式 $E = mc^2$。

![不应计入的替代文本](/images/ignored.svg){caption="图注应当计入"}

\`\`\`ts
const value = 1;
\`\`\`

\`\`\`mermaid alt="不应计入的图表替代文本" caption="图表说明应当计入"
flowchart LR
  source[源码] --> page[页面]
\`\`\`
`;

    const readingText = await extractArticleReadingText(markdown, SOURCE_PATH);

    assert.match(readingText, /文章标题/);
    assert.match(readingText, /链接文字/);
    assert.match(readingText, /行内代码/);
    assert.match(readingText, /E = mc\^2/);
    assert.match(readingText, /图注应当计入/);
    assert.match(readingText, /const value = 1/);
    assert.match(readingText, /图表说明应当计入/);
    assert.doesNotMatch(readingText, /hidden-url/);
    assert.doesNotMatch(readingText, /ignored\.svg/);
    assert.doesNotMatch(readingText, /不应计入的替代文本/);
    assert.doesNotMatch(readingText, /flowchart LR/);
    assert.doesNotMatch(readingText, /源码.*页面/);
  });
});

describe('文章阅读时长估算', () => {
  it('最少显示一分钟，并按300个估算token向上取整', () => {
    assert.equal(estimateReadingTimeMinutes(''), 1);
    assert.equal(estimateReadingTimeMinutes('中'.repeat(344)), 1);
    assert.equal(estimateReadingTimeMinutes('中'.repeat(346)), 2);
    assert.equal(READING_TIME_TOKENS_PER_MINUTE, 300);
  });
});
