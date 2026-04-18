/**
 * All three silos hit the SAME server (server.boreal.financial).
 * Silo context is passed via X-Silo request header — the server
 * filters data accordingly. There are no separate bi-server / slf-server.
 */
import { getActiveBusinessUnit } from "@/context/BusinessUnitContext";

const SERVER_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BF_API_URL ||
  "https://server.boreal.financial";

export function getApiBase(): string {
  return SERVER_URL;
}

export function getActiveSilo(): string {
  return getActiveBusinessUnit() ?? "BF";
}

export const API_BASE = SERVER_URL;

export const buildApiUrl = (path: string): string => {
  if (!path.startsWith("/")) {
    throw new Error(`Invalid API path: "${path}" — must start with /`);
  }
  return `${SERVER_URL}${path}`;
};
