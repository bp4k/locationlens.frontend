import { apiFetch } from "./api-client";
import { getAccessToken } from "../auth/token-storage";
import { parseUserModel, type CurrentUser } from "../types/user";

function readTokenClaims(token: string | null): unknown {
  try {
    const parts = token?.split(".");
    if (!parts || parts.length !== 3 || !parts[1]) throw new Error();
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("The session contains an invalid access token.");
  }
}

export async function getCurrentUser(): Promise<CurrentUser> {
  // Capture the same token apiFetch reads synchronously for the bearer header.
  const token = getAccessToken();
  const profile = await apiFetch<unknown>("/v1/me");
  return parseUserModel(profile, readTokenClaims(token));
}
