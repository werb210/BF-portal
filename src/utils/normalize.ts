export function normalizeArray<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[];
  if (input && typeof input === "object" && Array.isArray((input as { items?: unknown }).items)) {
    return (input as { items: T[] }).items;
  }
  if (input && typeof input === "object" && Array.isArray((input as { data?: unknown }).data)) {
    return (input as { data: T[] }).data;
  }
  if (input && typeof input === "object" && Array.isArray((input as { results?: unknown }).results)) {
    return (input as { results: T[] }).results;
  }
  return [];
}
