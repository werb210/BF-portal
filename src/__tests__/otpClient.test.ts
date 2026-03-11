import { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENV } from "@/config/env";
import { attachRequestIdAndLog } from "@/utils/apiLogging";

describe("otp client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("starts otp requests with base url and no custom headers", async () => {
    const client = await import("@/api/client");
    const apiInstance = client.default;

    const apiPostSpy = vi
      .spyOn(apiInstance, "post")
      .mockResolvedValue({ data: null } as any);

    await client.otpStart({ phone: "+15555550100" });

    expect(apiInstance.defaults.baseURL).toBe(ENV.API_BASE_URL);
    expect(apiPostSpy).toHaveBeenCalledWith("/api/auth/otp/start", { phone: "+15555550100" });

    const config: InternalAxiosRequestConfig & { skipRequestId?: boolean } = {
      headers: new AxiosHeaders(),
      method: "post",
      url: "/api/auth/otp/start",
      skipRequestId: true
    };
    const updatedConfig = attachRequestIdAndLog(config);
    expect(updatedConfig.headers.get("X-Request-Id")).toBeUndefined();
  });
});
