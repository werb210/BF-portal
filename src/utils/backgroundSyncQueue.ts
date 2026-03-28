import { API_BASE_URL } from "@/config/api";
import { getAccessToken } from "@/lib/authToken";

export type QueuedMutation = {
  id: string;
  path: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  createdAt: number;
};

type BackgroundSyncManager = {
  register: (tag: string) => Promise<void>;
};

const QUEUE_KEY = "bf-offline-mutation-queue";
const trackedPathPattern = /\/(lenders|products|users)\b/i;

let queue: QueuedMutation[] = [];

const loadQueue = () => {
  if (typeof localStorage === "undefined") return;
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return;
  try {
    queue = JSON.parse(raw) as QueuedMutation[];
  } catch {
    queue = [];
  }
};

const persistQueue = () => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

const buildMutationUrl = (path: string) => {
  const base = API_BASE_URL;
  const trimmedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const trimmedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${trimmedBase}/${trimmedPath}`;
};

const safeSerializeBody = (body: unknown) => {
  if (body === undefined || body === null) return undefined;
  if (body instanceof FormData) return undefined;
  return body;
};

const shouldQueuePath = (path: string) => trackedPathPattern.test(path);

export const queueFailedMutation = (mutation: Omit<QueuedMutation, "id" | "createdAt">) => {
  if (!shouldQueuePath(mutation.path)) return false;
  if (queue.length === 0) {
    loadQueue();
  }

  const serializedBody = safeSerializeBody(mutation.body);
  if (mutation.body && serializedBody === undefined) {
    return false;
  }

  queue.push({
    ...mutation,
    body: serializedBody,
    id: `offline_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: Date.now()
  });
  persistQueue();
  void registerBackgroundSync();
  return true;
};

export const registerBackgroundSync = async () => {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const syncManager = (registration as ServiceWorkerRegistration & { sync?: BackgroundSyncManager }).sync;
    if (syncManager) {
      await syncManager.register("sync-offline-queue");
    }
  } catch (error) {
    console.info("Background sync registration skipped", error);
  }
};

export const flushQueuedMutations = async () => {
  if (typeof navigator === "undefined" || !navigator.onLine) return;
  if (queue.length === 0) {
    loadQueue();
  }
  if (queue.length === 0) return;

  const pending = [...queue];
  queue = [];
  persistQueue();

  for (const mutation of pending) {
    try {
      const headers = new Headers({ "Content-Type": "application/json" });
      const token = getAccessToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      const response = await fetch (buildMutationUrl(mutation.path), {
        method: mutation.method,
        headers,
        body: mutation.body ? JSON.stringify(mutation.body) : undefined
      });
      if (!response.ok) {
        throw new Error(`Replay failed with status ${response.status}`);
      }
    } catch {
      queue.push(mutation);
    }
  }

  persistQueue();
};
