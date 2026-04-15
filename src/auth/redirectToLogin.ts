export function redirectToLogin() {
  if (typeof window === "undefined") return;

  if (import.meta.env.MODE === "test") {
    window.history.replaceState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
    return;
  }

  window.location.assign("/login");
}
