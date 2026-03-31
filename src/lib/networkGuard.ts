let installed = false;

export function installNetworkGuard() {
  if (installed || typeof window === "undefined") return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (!url.startsWith("/api/")) {
      throw new Error("DIRECT_FETCH_BLOCKED");
    }

    return originalFetch(input, init);
  }) as typeof window.fetch;

  installed = true;
}

installNetworkGuard();
