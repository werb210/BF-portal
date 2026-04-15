const CANONICAL_API_HOST = 'server.boreal.financial';

export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  `https://${CANONICAL_API_HOST}`;

// Warn in development if pointing away from canonical host.
// Do NOT throw — this breaks local dev, staging, and tests.
if (typeof import.meta.env !== 'undefined' && import.meta.env.PROD) {
  if (!API_BASE.includes(CANONICAL_API_HOST)) {
    console.error('[CONFIG ERROR] API_BASE does not point to the expected host:', API_BASE);
  }
}

export const buildApiUrl = (path: string): string => {
  if (!path.startsWith('/')) {
    throw new Error(`Invalid API path: "${path}" — must start with /`);
  }
  return `${API_BASE}${path}`;
};
