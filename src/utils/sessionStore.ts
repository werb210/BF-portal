import type { AuthenticatedUser } from "@/types/auth";

type SessionPayload = {
  accessToken: string | null;
  user: AuthenticatedUser | null;
};

const DB_NAME = "staff-portal";
const STORE_NAME = "session";
const SESSION_KEY = "auth-session";

const canUseIndexedDb = () => typeof indexedDB !== "undefined";

const openSessionDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

export const readSession = async (): Promise<SessionPayload | null> => {
  if (!canUseIndexedDb()) return null;
  try {
    const db = await openSessionDb();
    return await new Promise<SessionPayload | null>((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(SESSION_KEY);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve((request.result as SessionPayload | undefined) ?? null);
    });
  } catch {
    return null;
  }
};

export const writeSession = async (payload: SessionPayload) => {
  if (!canUseIndexedDb()) return;
  try {
    const db = await openSessionDb();
    await new Promise<void>((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.put(payload, SESSION_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  } catch {
    // ignore storage errors
  }
};

export const clearSession = async () => {
  if (!canUseIndexedDb()) return;
  try {
    const db = await openSessionDb();
    await new Promise<void>((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.delete(SESSION_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  } catch {
    // ignore storage errors
  }
};
