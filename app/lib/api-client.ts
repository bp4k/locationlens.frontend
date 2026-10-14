import { clearSession, getAccessToken, isSessionValid } from "../auth/token-storage";
import { getApiBaseUrl } from "./env";
import { withRequestTimeout } from "./request-timeout";
import { refreshAccessToken, SessionExpiredError } from "./session-api";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  // Bound safe reads, including place searches/details. A cancelled write may
  // still have committed on the server; keep existing mutation semantics.
  const method = (init?.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") {
    return withRequestTimeout(
      (signal) => fetchResponse<T>(path, { ...init, signal }),
      new ApiError(
        504,
        "The request timed out after 10 seconds. Please try again.",
      ),
      init?.signal,
    );
  }
  return fetchResponse<T>(path, init);
}

async function fetchResponse<T>(path: string, init?: RequestInit): Promise<T> {
  let token = getAccessToken();
  if (token && !isSessionValid(30_000)) {
    try {
      token = await refreshAccessToken();
    } catch (error) {
      if (error instanceof SessionExpiredError) throw new ApiError(401, error.message);
      throw error;
    }
  }
  let response = await sendRequest(path, init, token);
  // A 401 rejects authentication before a mutation reaches the controller. Retry
  // it once with a renewed token, preserving its original method/body/headers.
  if (response.status === 401 && token && getAccessToken() === token) {
    try {
      token = await refreshAccessToken();
      response = await sendRequest(path, init, token);
    } catch (error) {
      // Keep the API's original 401 and error body when the server session has
      // ended. refreshAccessToken already clears the stale frontend session.
      if (!(error instanceof SessionExpiredError)) throw error;
    }
  }
  if (response.status === 401 && token && getAccessToken() === token) clearSession();

  if (!response.ok) {
    // Preserve status for review sign-in/permission/conflict states. Support the
    // backend's ErrorResponse and Problem Detail without requiring JSON errors.
    const body: unknown = await response.json().catch(() => null);
    const error =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const message =
      typeof error.message === "string"
        ? error.message
        : typeof error.detail === "string"
          ? error.detail
          : `API request to ${path} failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  // Administrator claim decisions succeed with an empty 204 response.
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function sendRequest(path: string, init: RequestInit | undefined, token: string | null): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

}
