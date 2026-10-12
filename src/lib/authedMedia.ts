// BF_PORTAL_v789_AUTHED_MEDIA - recordings, MMS images and documents used to be loaded straight from
// URLs carrying ?token=<staff JWT>, which leaks the token into server logs, proxies and browser
// history. They are now fetched through the api client with the Authorization header and shown from
// a blob: object URL that the caller revokes when it is done.
import { useCallback, useEffect, useRef, useState } from "react";
import { rawApiFetch } from "@/api";
import { ApiError } from "@/api/http";

/** GET an API path with the staff Authorization header and return the body as a Blob. */
export async function fetchAuthedBlob(path: string): Promise<Blob> {
  const res = await rawApiFetch(path, { method: "GET", headers: { Accept: "*/*" } });
  if (!res.ok) {
    throw new ApiError({ status: res.status, message: `Could not load the file (${res.status}).` });
  }
  return res.blob();
}

/** Opens a protected file in a new tab from a blob: URL, revoked once the tab has had time to load it. */
export async function openAuthedFile(path: string): Promise<void> {
  const url = URL.createObjectURL(await fetchAuthedBlob(path));
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export type AuthedObjectUrl = {
  url: string | null;
  loading: boolean;
  error: string | null;
  /** Fetch the file (once) and expose it as an object URL. */
  load: () => Promise<string | null>;
};

/** Lazily loads `path` into an object URL; the URL is revoked on unmount or when `path` changes. */
export function useAuthedObjectUrl(path: string | null | undefined): AuthedObjectUrl {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<string | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (current.current) URL.revokeObjectURL(current.current);
      current.current = null;
      setUrl(null);
    };
  }, [path]);

  const load = useCallback(async (): Promise<string | null> => {
    if (!path) return null;
    if (current.current) return current.current;
    setLoading(true);
    setError(null);
    try {
      const blob = await fetchAuthedBlob(path);
      const next = URL.createObjectURL(blob);
      if (!alive.current) {
        URL.revokeObjectURL(next);
        return null;
      }
      current.current = next;
      setUrl(next);
      return next;
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : "Could not load the file.");
      return null;
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [path]);

  return { url, loading, error, load };
}
