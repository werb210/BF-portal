const REQUIRED_API_BASE = 'https://server.boreal.financial';

export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  REQUIRED_API_BASE;

if (!API_BASE.includes('server.boreal.financial')) {
  console.error('INVALID API BASE:', API_BASE);
  throw new Error('API must point to server.boreal.financial');
}

if (API_BASE !== REQUIRED_API_BASE) {
  console.warn(`API base must be exactly ${REQUIRED_API_BASE}. Received: ${API_BASE}`);
}

// Helper to build URLs safely
export const buildApiUrl = (path: string) => {
  if (!path.startsWith('/')) {
    throw new Error(`Invalid API path: ${path}`);
  }
  return `${API_BASE}${path}`;
};
