export async function safeFetch<T = unknown>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as T;
  } catch {
    console.warn("API failure:", url);
    return null;
  }
}
