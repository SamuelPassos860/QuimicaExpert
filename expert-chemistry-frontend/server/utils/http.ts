export function getSearchTerm(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function toLikePattern(value: string) {
  return value ? `%${value}%` : '';
}
