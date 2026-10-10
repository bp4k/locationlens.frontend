import { getAccessToken } from "../auth/token-storage";
import { getApiBaseUrl } from "./env";

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

  return response.json() as Promise<T>;
}
