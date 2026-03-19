export function redirectToLogin() {
  if (typeof window === "undefined") return;

  if (process.env.NODE_ENV === "test") {
    window.history.replaceState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
    return;
  }

  window.location.assign("/login");
}
