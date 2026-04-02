export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const res = await fetch(path, options);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ERROR ${res.status}: ${text}`);
  }

  return res.json();
}
