let initialized = false;

export function assertApiUsage() {
  if (initialized) return;
  initialized = true;

  const originalFetch = window.fetch;

  window.fetch = function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;

    if (typeof url === 'string' && url.startsWith('/api' + '/')) {
      throw new Error(
        'Direct /api usage is forbidden. Use apiFetch + API_CONTRACT.'
      );
    }

    return originalFetch.apply(this, args as any);
  };
}
