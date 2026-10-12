/** 按英文规则根据数量选择单数或复数；默认复数为单数加`s`。 */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}
