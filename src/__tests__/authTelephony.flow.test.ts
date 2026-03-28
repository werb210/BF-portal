import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { apiRequest } from "@/lib/api";
import { getTelephonyToken } from "@/telephony/getVoiceToken";
import { assertAuthTelephonyFlow } from "./helpers/authTelephonyFlowAssertions";

type FlowState = {
  otpCode: string;
  verified: boolean;
  token: string;
};

const state: FlowState = {
  otpCode: "123456",
  verified: false,
  token: "session-token-1"
};


async function startOtp(payload: { phone: string }) {
  return apiRequest<{ ok: boolean }>("/auth/otp/start", {
    method: "POST",
    body: { phone: payload.phone },
  });
}

async function verifyOtp(payload: { phone: string; code: string }) {
  const res = await apiRequest<{ ok: boolean; token: string }>("/auth/otp/verify", {
    method: "POST",
    body: { phone: payload.phone, code: payload.code },
  });

  if (!res?.token) throw new Error("Missing token");
  localStorage.setItem("token", res.token);
  return res;
}

let server: ReturnType<typeof createServer>;
let baseUrl = "";
let originalFetch: typeof fetch;

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
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
      if (!body.phone) {
        sendJson(res, 400, { error: "missing phone" });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        message: "OTP sent"
      });
      return;
    }

    if (req.url === "/auth/otp/verify" && req.method === "POST") {
      const body = await readBody(req);
      if (body.code !== state.otpCode) {
        sendJson(res, 401, { error: "invalid otp" });
        return;
      }

      state.verified = true;
      sendJson(res, 200, { ok: true, token: state.token });
      return;
    }

    if (req.url === "/telephony/token" && req.method === "GET") {
      if (!state.verified) {
        sendJson(res, 403, { error: "verify otp first" });
        return;
      }

      sendJson(res, 200, { token: "voice-token-1" });
      return;
    }

    if (req.url === "/telephony/token-missing-field" && req.method === "GET") {
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: "not found" });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = server.address();
  if (!addr || typeof addr === "string") {
    throw new Error("failed to resolve address");
  }

  baseUrl = `http://127.0.0.1:${addr.port}`;
  originalFetch = globalThis.fetch;
  const proxiedFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input.toString();
    const rewritten = raw.startsWith("https://server.boreal.financial")
      ? raw.replace("https://server.boreal.financial", baseUrl)
      : raw;
    return originalFetch(rewritten, init);
  }) as typeof fetch;

  (globalThis as any).fetch = proxiedFetch;
  if (typeof window !== "undefined") {
    window.fetch = proxiedFetch;
  }
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  (globalThis as any).fetch = originalFetch;
  if (typeof window !== "undefined") {
    window.fetch = originalFetch;
  }
});

describe("real auth/telephony flow contract checks", () => {
  it("runs OTP -> verify -> telephony token against a real HTTP server", async () => {
    await assertAuthTelephonyFlow(
      { startOtp, verifyOtp, getTelephonyToken },
      {
        phone: "15551234567",
        otp: state.otpCode,
        expectedSessionToken: state.token,
        expectedVoiceToken: "voice-token-1"
      }
    );
  });

  it("fails when response shape is invalid", async () => {
    const currentFetch = globalThis.fetch;
    const interceptingFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const rewritten = url.replace("/telephony/token", "/telephony/token-missing-field");
      return currentFetch(rewritten, init);
    }) as typeof fetch;

    (globalThis as any).fetch = interceptingFetch;
    if (typeof window !== "undefined") {
      window.fetch = interceptingFetch;
    }

    await expect(getTelephonyToken()).rejects.toThrow();

    (globalThis as any).fetch = currentFetch;
    if (typeof window !== "undefined") {
      window.fetch = currentFetch;
    }
  });
});
