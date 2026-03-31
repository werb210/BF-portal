export function logError(err: unknown, context?: unknown) {
  console.error("[API_ERROR]", {
    err,
    context,
    timestamp: new Date().toISOString(),
  });
}
