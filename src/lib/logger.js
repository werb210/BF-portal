export function logError(err, context) {
    console.error("[CLIENT_ERROR]", {
        err: err instanceof Error ? err.message : err,
        context,
        timestamp: new Date().toISOString(),
    });
}
