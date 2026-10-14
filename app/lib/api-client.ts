import { getAccessToken } from "../auth/token-storage";
import { getApiBaseUrl } from "./env";
import { withRequestTimeout } from "./request-timeout";

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
  const token = getAccessToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

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
