const rawClientId = import.meta.env.VITE_MSAL_CLIENT_ID ?? "";
const rawTenantId = import.meta.env.VITE_MSAL_TENANT_ID ?? "common";
const rawRedirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI ?? "";
const scopeValue = String(import.meta.env.VITE_MSAL_SCOPES ?? "User.Read");

const redirectUri =
  rawRedirectUri || "";

export const microsoftAuthConfig = {
  clientId: rawClientId,
  tenantId: rawTenantId,
  authority: `https://login.microsoftonline.com/${rawTenantId}`,
  redirectUri,
  scopes: scopeValue
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean)
};
