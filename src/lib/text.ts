/** Same rule as Angular's TitleCasePipe: capitalize each word, lowercase the rest. */
export function titleCase(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/[\p{L}\p{M}\p{N}]+/gu, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
}
