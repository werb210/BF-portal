const SESSION_DEATH_PATHS = [
  "/api/auth/me",
  "/api/auth/otp/verify",
  "/api/auth/microsoft",
];

export function shouldLogoutOn401(url: string): boolean {
  try {
    const path = new URL(url, window.location.origin).pathname;
    return SESSION_DEATH_PATHS.some((sessionPath) => path.endsWith(sessionPath));
  } catch {
    return false;
  }
}

