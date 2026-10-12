/** Existing account profile fields, retained for the account page. */
export interface User {
  first_name: string;
  last_name: string;
  email: string;
}

/** User identity for frontend views. UUIDs are represented as strings. */
export interface UserModel {
  userId: string;
  email: string;
  displayName: string;
  administrator: boolean;
}

/** GET /api/v1/me returns nullable OIDC profile claims. */
export interface MeResponse {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export type CurrentUser = UserModel & User;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

/**
 * Combine the backend profile with claims from the bearer token used for /me.
 * Call only after /me succeeds. Decoding does not verify a JWT signature and
 * this model must never grant permissions; the backend authorizes requests.
 */
export function parseUserModel(
  response: unknown,
  claims: unknown,
): CurrentUser {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    throw new Error("The server returned an invalid user response.");
  }
  const profile = response as Record<string, unknown>;
  if (
    !isNullableString(profile.first_name) ||
    !isNullableString(profile.last_name) ||
    !isNullableString(profile.email)
  ) {
    throw new Error("The server returned an invalid user response.");
  }
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    throw new Error("The session does not contain a valid user UUID.");
  }
  const identity = claims as Record<string, unknown>;
  if (typeof identity.sub !== "string" || !uuidPattern.test(identity.sub)) {
    throw new Error("The session does not contain a valid user UUID.");
  }
  const access = identity.realm_access;
  const roles =
    access && typeof access === "object" && !Array.isArray(access)
      ? (access as Record<string, unknown>).roles
      : undefined;
  const firstName = profile.first_name ?? "";
  const lastName = profile.last_name ?? "";
  return {
    userId: identity.sub,
    email: profile.email ?? "",
    displayName: [firstName.trim(), lastName.trim()].filter(Boolean).join(" "),
    administrator: Array.isArray(roles) && roles.includes("admin"),
    first_name: firstName,
    last_name: lastName,
  };
}
