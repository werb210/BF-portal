import { apiClient } from "@/lib/apiClient";
import { getToken } from "@/lib/authToken";

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
  if (typeof sessionStorage === "undefined") return;
  const raw = sessionStorage.getItem(QUEUE_KEY);
  if (!raw) return;
  try {
    queue = JSON.parse(raw) as QueuedMutation[];
  } catch {
    queue = [];
  }
};

const persistQueue = () => {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};


const safeSerializeBody = (body: unknown) => {
  if (body === undefined || body === null) return undefined;
  if (body instanceof FormData) return undefined;
  return body;
};

const headersToRecord = (headers: Headers): Record<string, string> => {
  const entries: Array<[string, string]> = [];
  headers.forEach((value, key) => entries.push([key, value]));
  return Object.fromEntries(entries);
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
      const token = getToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      await apiClient(mutation.path, {
        method: mutation.method,
        headers: headersToRecord(headers),
        body: mutation.body
      });
    } catch {
      queue.push(mutation);
    }
  }

  persistQueue();
};
