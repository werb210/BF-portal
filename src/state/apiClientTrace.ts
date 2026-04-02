export type ApiClientTrace = {
  method: string;
  path: string;
  requestId?: string;
  response?: unknown;
  status?: number;
  error?: string;
  timestamp: number;
};

let lastApiRequest: ApiClientTrace | null = null;

export const setLastApiRequest = (trace: ApiClientTrace) => {
  lastApiRequest = trace;
};

export const getLastApiRequest = () => lastApiRequest;

export const clearLastApiRequest = () => {
  lastApiRequest = null;
};
