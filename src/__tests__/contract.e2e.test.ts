import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { apiRequest } from "@/lib/api";
import { Contracts } from "bf-contracts";

let server: ReturnType<typeof createServer>;

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
    if (req.url === "/api/auth/otp/start" && req.method === "POST") {
      const body = await readBody(req);
      if (!body.phone) return sendJson(res, 400, { error: "missing phone" });
      return sendJson(res, 200, { success: true, otpRequestId: "otp-1", message: "OTP sent" });
    }

    if (req.url === "/api/auth/otp/verify" && req.method === "POST") {
      const body = await readBody(req);
      const otp = body.otp ?? body.code;
      if (!body.phone || otp !== "000000") return sendJson(res, 401, { error: "invalid otp" });
      state.verified = true;
      return sendJson(res, 200, { token: state.token, refreshToken: "refresh-1" });
    }

    if (req.url === "/api/telephony/token" && req.method === "GET") {
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
  (window as any).__BF_API_BASE_URL__ = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  delete (window as any).__BF_API_BASE_URL__;
});

describe("contract:e2e", () => {
  it("otp -> verify -> telephony", async () => {
    await apiRequest(Contracts.authOtpStart.path, {
      method: "POST",
      body: JSON.stringify({ phone: "+61400000000" })
    });

    const verify = await apiRequest(Contracts.authOtpVerify.path, {
      method: "POST",
      body: JSON.stringify({ phone: "+61400000000", code: "000000" })
    });

    const v = Contracts.authOtpVerify.response.parse(verify);

    const tel = await apiRequest(Contracts.telephonyToken.path, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${v.token}`
      }
    });

    const t = Contracts.telephonyToken.response.parse(tel);

    expect(v.token).toBeTruthy();
    expect(t.token).toBeTruthy();
  });
});
