import type { IPublicClientApplication } from "@azure/msal-browser";

export const GRAPH_SCOPES = [
  "Mail.Send",
  "Calendars.ReadWrite",
  "Tasks.ReadWrite",
];

export async function getMicrosoftAccessToken(
  msalClient: IPublicClientApplication
): Promise<string | null> {
  try {
    const accounts = msalClient.getAllAccounts();
    if (accounts.length === 0) return null;
    const result = await msalClient.acquireTokenSilent({
      account: accounts[0],
      scopes: GRAPH_SCOPES,
    });
    return result.accessToken ?? null;
  } catch {
    return null;
  }
}
