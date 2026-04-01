export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  capabilities?: string[];
  exp: number;
};

export function decodeJwt(token: string | null): JwtPayload | null {
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}
