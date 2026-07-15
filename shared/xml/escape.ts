const XML_ESCAPE_CHARACTERS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

/** 转义 XML文本和属性中的保留字符。 */
export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => XML_ESCAPE_CHARACTERS[character] ?? character);
}
