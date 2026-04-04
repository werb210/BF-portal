export function reportError(error) {
    if (import.meta.env.PROD) {
        // future: send to monitoring service
        return;
    }
    console.error(error);
}
