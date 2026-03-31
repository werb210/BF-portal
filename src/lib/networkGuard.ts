const originalFetch = window.fetch.bind(window)

window.fetch = ((input, init) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof Request
      ? input.url
      : input.toString()

  if (!url.includes("/api/")) {
    throw new Error("DIRECT_FETCH_BLOCKED")
  }

  return originalFetch(input, init)
}) as typeof window.fetch
