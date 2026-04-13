export async function verifyOtp(code: string) {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/otp/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    console.log("VERIFY STATUS:", res.status);
    const headerEntries: Array<[string, string]> = [];
    res.headers.forEach((value, key) => {
      headerEntries.push([key, value]);
    });
    console.log("VERIFY HEADERS:", headerEntries);

    const text = await res.text();

    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.error("VERIFY PARSE ERROR:", text);
      throw new Error("Invalid server response");
    }

    console.log("VERIFY RESPONSE:", data);

    if (!res.ok) {
      throw new Error(data?.message || "Verify failed");
    }

    const token = data.token || data.accessToken || data.jwt || data?.data?.token;

    if (!token) {
      console.error("NO TOKEN IN RESPONSE:", data);
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
