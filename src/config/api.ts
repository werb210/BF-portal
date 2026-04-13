const REQUIRED_API_BASE = 'https://server.boreal.financial';

// Fail fast if missing or wrong
const envBase = import.meta.env.VITE_API_BASE_URL;

if (!envBase) {
  throw new Error('VITE_API_BASE_URL is missing. Portal cannot call API.');
}

if (!envBase.includes('server.boreal.financial')) {
  console.error('INVALID API BASE:', envBase);
  throw new Error('API must point to server.boreal.financial');
}

if (envBase !== REQUIRED_API_BASE) {
  console.warn(`API base must be exactly ${REQUIRED_API_BASE}. Received: ${envBase}`);
}

export const API_BASE = envBase;

// Helper to build URLs safely
export const buildApiUrl = (path: string) => {
  if (!path.startsWith('/')) {
    throw new Error(`Invalid API path: ${path}`);
  }
  return `${API_BASE}${path}`;
};
