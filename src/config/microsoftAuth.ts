import { withRequiredO365Scopes } from "@/auth/o365Scopes"; // BF_PORTAL_O365_SCOPES_v275
const rawClientId = import.meta.env.VITE_MSAL_CLIENT_ID ?? "";
const rawRedirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI ?? "";
const rawTenantId = import.meta.env.VITE_MSAL_TENANT_ID ?? "";
const scopeValue = String(
  import.meta.env.VITE_MSAL_SCOPES
    ?? "User.Read,Mail.Send,Mail.ReadWrite,Calendars.ReadWrite,Tasks.ReadWrite,offline_access"
);

const tenantId = rawTenantId.trim() || "common";

if (!rawTenantId.trim()) {
  console.warn(
    "[msal] VITE_MSAL_TENANT_ID not set — falling back to /common (will fail against single-tenant app registrations)"
  );
}

const redirectUri =
  rawRedirectUri || (typeof window !== "undefined" ? window.location.origin : "");

export const microsoftAuthConfig = {
  clientId: rawClientId,
  tenantId,
  authority: `https://login.microsoftonline.com/${tenantId}`,
  redirectUri,
  scopes: withRequiredO365Scopes(scopeValue), // BF_PORTAL_O365_SCOPES_v275
};
