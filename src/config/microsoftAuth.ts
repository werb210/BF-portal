const rawClientId = import.meta.env.VITE_MSAL_CLIENT_ID ?? "";
const rawRedirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI ?? "";
const scopeValue = String(import.meta.env.VITE_MSAL_SCOPES ?? "User.Read");

const redirectUri =
  rawRedirectUri || (typeof window !== "undefined" ? window.location.origin : "");

export const microsoftAuthConfig = {
  clientId: rawClientId,
  tenantId: "common",
  authority: "https://login.microsoftonline.com/common",
  redirectUri,
  scopes: scopeValue
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean)
};
