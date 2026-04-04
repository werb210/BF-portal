export function handleSessionError(error) {
    if (error instanceof Error && error.message === "unauthorized") {
        window.location.href = "/login";
    }
}
