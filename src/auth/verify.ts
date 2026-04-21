import { normalizePhone } from "@/utils/normalizePhone";
import { setAuthToken } from "@/lib/authToken";

const SERVER_ERROR_MESSAGES: Record<string, string> = {
  no_account: "Your account hasn't been set up yet. Contact your administrator.",
  no_role: "Your account has no role assigned. Contact your administrator.",
  account_disabled: "Your account has been disabled. Contact your administrator.",
  auth_not_configured: "The server is not configured correctly. Contact support.",
};

export async function verifyOtp(code: string) {
  try {
    const storedPhone = localStorage.getItem("auth_phone");

    if (!storedPhone) {
      throw new Error("Missing phone number. Restart login.");
    }

    const phone = normalizePhone(storedPhone);

    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/otp/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone,
        code,
      }),
    });

    const text = await res.text();

    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid server response");
    }

    if (!res.ok) {
      const errorCode = data?.error ?? "";
      const humanMessage =
        SERVER_ERROR_MESSAGES[errorCode] ?? data?.message ?? "Unable to verify code. Please try again.";
      throw new Error(humanMessage);
    }

    // Server canonical response: { status: "ok", data: { token: "..." } }
    const token = data?.data?.token ?? data?.token ?? data?.accessToken ?? data?.jwt ?? null;

    if (!token) {
      console.error("[AUTH] Token not found in verify response. Response shape:", JSON.stringify(Object.keys(data)));
      throw new Error("No token returned from server");
    }

    setAuthToken(token);

    if (data.user) {
      localStorage.setItem("auth_user", JSON.stringify(data.user));
    }

    return { success: true };
  } catch (err: any) {
    console.error("VERIFY ERROR:", err);
    return {
      success: false,
      error: err.message || "Verification failed",
    };
  }
}
