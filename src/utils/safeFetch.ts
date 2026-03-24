export async function safeFetch(url: string, options?: RequestInit) {
  try {
    const res = await fetch (url, options);

    if (!res.ok) {
      console.warn("API returned non-200", url);
      return {};
    }

    const text = await res.text();

    if (!text || text.length === 0) {
      return {};
    }

    return JSON.parse(text);
  } catch {
    console.warn("API unavailable:", url);
    return {};
  }
}
