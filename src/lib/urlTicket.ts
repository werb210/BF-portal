// BF_PORTAL_v789_URL_TICKET - EventSource and WebSocket cannot send an Authorization header, so the
// realtime stream and the team socket put a credential in the query string. That credential is now a
// short-lived, single-purpose ticket from BF-Server (POST /api/auth/url-ticket) instead of the staff
// JWT, which would otherwise sit in proxy and server access logs for its whole lifetime.
// A server that predates v789 answers 404; until it is upgraded the current auth token is used, as before.
import { api } from "@/api";
import { ApiError } from "@/api/http";
import { getAuthToken } from "@/lib/authToken";

type TicketResponse = { ticket?: unknown; token?: unknown } | null | undefined;

/** A fresh ticket for one connection. Call it again for every connect and reconnect. */
export async function getUrlTicket(): Promise<string | null> {
  try {
    const r = await api.post<TicketResponse>("/api/auth/url-ticket", {});
    const ticket = typeof r?.ticket === "string" ? r.ticket : typeof r?.token === "string" ? r.token : "";
    if (!ticket) throw new Error("url_ticket_missing");
    return ticket;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return getAuthToken();
    throw error;
  }
}

/** The team WebSocket URL with a fresh ticket. */
export async function teamSocketUrl(apiBase: string): Promise<string | null> {
  const ticket = await getUrlTicket();
  return ticket ? `${apiBase.replace(/^http/, "ws")}/api/team/ws?token=${encodeURIComponent(ticket)}` : null;
}
