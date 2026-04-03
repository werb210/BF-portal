export function handleAuthError(err: any) {
  if (!err) return;

  const msg = err.message || "";

  if (msg.includes("401") || msg.includes("unauthorized")) {
    window.location.href = "/login";
  }
}
