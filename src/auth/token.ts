import { decodeJwt as decodeJwtPayload } from "./jwt";
import { clearToken as clearAuthToken, getToken as readAuthToken, setToken as setAuthToken } from "@/services/token";

export const getToken = () => {
  return readAuthToken() || "";
};

export const getAuthToken = () => getToken() || null;

export const decodeJwt = (token?: string | null) => {
  if (!token) return null;
  return decodeJwtPayload(token);
};

export const setToken = (token: string) => {
  setAuthToken(token);
};

export const clearToken = () => {
  clearAuthToken();
};
