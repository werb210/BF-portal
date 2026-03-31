export type LogContext = Record<string, unknown>;

export function logError(err: unknown, context?: LogContext): void {
  console.error("[CLIENT_ERROR]", {
    err: err instanceof Error ? err.message : err,
    context,
    timestamp: new Date().toISOString(),
  });
}
