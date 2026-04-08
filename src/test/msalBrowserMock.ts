export class BrowserAuthError extends Error {
  errorCode: string;

  constructor(message: string, errorCode = "mock_error") {
    super(message);
    this.errorCode = errorCode;
  }
}

export class PublicClientApplication {
  handleRedirectPromise = async () => null;
  loginRedirect = async () => undefined;
  loginPopup = async () => ({
    accessToken: "mock-token",
    account: { username: "test@example.com" }
  });
  acquireTokenSilent = async () => ({
    accessToken: "mock-token",
    account: { username: "test@example.com" }
  });
}
