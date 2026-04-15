import { normalizePhone } from "@/utils/normalizePhone";

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
      throw new Error(data?.error || data?.message || "Verify failed");
    }

    // Server canonical response: { status: "ok", data: { token: "..." } }
    const token = data?.data?.token ?? data?.token ?? data?.accessToken ?? data?.jwt ?? null;

    if (!token) {
      console.error("[AUTH] Token not found in verify response. Response shape:", JSON.stringify(Object.keys(data)));
      throw new Error("No token returned from server");
    }

    localStorage.setItem("auth_token", token);

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
