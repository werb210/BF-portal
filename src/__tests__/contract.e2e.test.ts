import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { apiRequest } from "@/lib/api";

let server: ReturnType<typeof createServer>;
let baseUrl = "";
let originalFetch: typeof fetch;

type State = { verified: boolean; token: string };
const state: State = { verified: false, token: "session-token-1" };

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
}

beforeAll(async () => {
  server = createServer(async (req, res) => {
    if (req.url === "/auth/otp/start" && req.method === "POST") {
      const body = await readBody(req);
      if (!body.phone) return sendJson(res, 400, { error: "missing phone" });
      return sendJson(res, 200, { ok: true, message: "OTP sent" });
    }

    if (req.url === "/auth/otp/verify" && req.method === "POST") {
      const body = await readBody(req);
      if (!body.phone || body.code !== "000000") return sendJson(res, 401, { error: "invalid otp" });
      state.verified = true;
      return sendJson(res, 200, { ok: true, token: state.token });
    }

    if (req.url === "/telephony/token" && req.method === "GET") {
      const auth = req.headers.authorization;
      if (!state.verified || auth !== `Bearer ${state.token}`) {
        return sendJson(res, 403, { error: "forbidden" });
      }
      return sendJson(res, 200, { token: "voice-token-1" });
    }

    return sendJson(res, 404, { error: "not found" });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Failed to resolve test server address");

  baseUrl = `http://127.0.0.1:${addr.port}`;
  originalFetch = globalThis.fetch;
  const proxiedFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input.toString();
    const rewritten = raw.startsWith("https://api.staff.boreal.financial")
      ? raw.replace("https://api.staff.boreal.financial", baseUrl)
      : raw.startsWith("http://localhost:3000")
        ? raw.replace("http://localhost:3000", baseUrl)
        : raw;
    return originalFetch(rewritten, init);
  }) as typeof fetch;

  (globalThis as any).fetch = proxiedFetch;
  if (typeof window !== "undefined") {
    window.fetch = proxiedFetch;
  }
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  (globalThis as any).fetch = originalFetch;
  if (typeof window !== "undefined") {
    window.fetch = originalFetch;
  }
});

describe("contract:e2e", () => {
  it("otp -> verify -> telephony", async () => {
    await apiRequest("/auth/otp/start", {
      method: "POST",
      body: { phone: "+61400000000" }
    });

    const v = await apiRequest<{ token: string }>("/auth/otp/verify", {
      method: "POST",
      body: { phone: "+61400000000", code: "000000" }
    });

    const t = await apiRequest<{ token: string }>("/telephony/token", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${v.token}`
      }
    });

    expect(v.token).toBeTruthy();
    expect(t.token).toBeTruthy();
  });
});
