import { decodeJwt as decodeJwtPayload } from "./jwt";

export const getToken = () => {
  return localStorage.getItem("token") || "";
};

export const getAuthToken = () => getToken() || null;

export const decodeJwt = (token?: string | null) => {
  if (!token) return null;
  return decodeJwtPayload(token);
};

export const setToken = (token: string) => {
  localStorage.setItem("token", token);
};

export const clearToken = () => {
  localStorage.removeItem("token");
};
