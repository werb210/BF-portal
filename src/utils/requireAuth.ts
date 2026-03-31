import { getToken } from "@/auth/token";

export const requireAuth = () => {
  const token = getToken();

  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  return token;
};
