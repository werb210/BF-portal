export type RequestTrackingConfig = {
  baseURL?: string;
  url?: string;
  method?: string;
};

export type PendingRequest = {
  id: string;
  method?: string;
  url?: string;
  startedAt: number;
};

const pendingRequests = new Map<string, PendingRequest>();

const createPendingId = () => `pending_${Math.random().toString(36).slice(2, 10)}`;

const buildRequestUrl = (config: RequestTrackingConfig) => {
  const base = config.baseURL ?? "";
  const url = config.url ?? "";
  if (!base) return url;
  if (!url) return base;
  if (base.endsWith("/") && url.startsWith("/")) {
    return `${base}${url.slice(1)}`;
  }
  if (!base.endsWith("/") && !url.startsWith("/")) {
    return `${base}/${url}`;
  }
  return `${base}${url}`;
};

export const startPendingRequest = (config: RequestTrackingConfig) => {
  const id = createPendingId();
  pendingRequests.set(id, {
    id,
    method: config.method?.toUpperCase(),
    url: buildRequestUrl(config),
    startedAt: Date.now()
  });
  return id;
};

export const endPendingRequest = (id?: string) => {
  if (!id) return;
  pendingRequests.delete(id);
};

export const getPendingRequests = () => Array.from(pendingRequests.values());
