import { clearSession, getAccessToken, saveSession } from "../auth/token-storage";
import { getApiBaseUrl } from "./env";
import { withRequestTimeout } from "./request-timeout";

export class SessionExpiredError extends Error {
  constructor() {
    super("Your sign-in session expired. Please sign in again.");
    this.name = "SessionExpiredError";
  }
}

let refreshing: Promise<string> | undefined;

/** Share renewal between background checks and concurrent authenticated requests. */
export function refreshAccessToken(): Promise<string> {
  if (refreshing) return refreshing;
  const originalToken = getAccessToken();
  if (!originalToken) return Promise.reject(new SessionExpiredError());
  refreshing = withRequestTimeout(async (signal) => {
    const response = await fetch(`${getApiBaseUrl()}/v1/session/refresh`, {
      method: "POST",
      // Only this endpoint uses the existing OIDC cookie. API calls still use
      // bearer tokens; no refresh token is sent to or stored in the browser.
      credentials: "include",
      signal,
    });
    if (!response.ok) {
      if (response.status === 401 && getAccessToken() === originalToken) clearSession();
      if (response.status === 401) throw new SessionExpiredError();
      throw new Error("Unable to renew your sign-in session. Please try again.");
    }
    const body: unknown = await response.json();
    const token = body && typeof body === "object" ? body as Record<string, unknown> : {};
    if (typeof token.access_token !== "string" || !token.access_token
        || token.token_type !== "Bearer" || typeof token.expires_in !== "number"
        || !Number.isFinite(token.expires_in) || token.expires_in <= 0) {
      throw new Error("The server returned an invalid session response.");
    }
    // A response started before sign-out or a different login must never restore
    // the old session or overwrite the newer login's token.
    if (getAccessToken() !== originalToken) {
      const current = getAccessToken();
      if (!current) throw new SessionExpiredError();
      return current;
    }
    saveSession(token.access_token, token.expires_in);
    return token.access_token;
  }, new Error("Renewing your sign-in session timed out. Please try again."))
    .finally(() => { refreshing = undefined; });
  return refreshing;
}
