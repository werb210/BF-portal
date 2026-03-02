import { useState } from "react";

export function useOtpAuth() {
  const [state, setState] = useState<"unauthenticated" | "authenticated">(
    "unauthenticated"
  );

  async function verifyOtp(token?: string) {
    if (!token) {
      throw new Error("No token provided");
    }

    setState("authenticated");
  }

  return {
    state,
    verifyOtp,
  };
}
