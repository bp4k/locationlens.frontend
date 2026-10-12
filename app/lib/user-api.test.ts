import { describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "./user-api";
import { saveSession } from "../auth/token-storage";

const userId = "a852a1c9-1384-4571-8c53-7eeeb4975329";
const profile = {
  first_name: "Albert",
  last_name: "Zheng",
  email: "albert@example.com",
};

function jwt(claims: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(claims));
  const payload = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `eyJhbGciOiJSUzI1NiJ9.${payload}.test-signature`;
}

function setup(token: string, body: unknown = profile, status = 200) {
  saveSession(token, 3600);
  vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json(body, { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("current user backend integration", () => {
  it("uses /me profile fields and the same bearer token's subject and admin role", async () => {
    const token = jwt({
      sub: userId,
      realm_access: { roles: ["admin"] },
      email: "ignored@example.com",
      given_name: "Ignored",
    });
    const fetch = setup(token);
    expect(await getCurrentUser()).toMatchObject({
      userId,
      email: profile.email,
      displayName: "Albert Zheng",
      administrator: true,
    });
    expect(fetch.mock.calls[0][0]).toBe("http://localhost:8080/api/v1/me");
    expect(
      new Headers(fetch.mock.calls[0][1]?.headers).get("Authorization"),
    ).toBe(`Bearer ${token}`);
  });
  it("supports UTF-8/base64url token payloads", async () => {
    setup(jwt({ sub: userId, name: "郑 🌳" }));
    expect((await getCurrentUser()).userId).toBe(userId);
  });
  it("captures identity from the token sent even if session storage changes during HTTP", async () => {
    const fetch = setup(jwt({ sub: userId }));
    fetch.mockImplementation(async () => {
      saveSession(
        jwt({
          sub: "b852a1c9-1384-4571-8c53-7eeeb4975329",
          realm_access: { roles: ["admin"] },
        }),
        3600,
      );
      return Response.json(profile);
    });
    expect(await getCurrentUser()).toMatchObject({
      userId,
      administrator: false,
    });
  });
  it.each([401, 403, 500])(
    "preserves backend HTTP %s instead of trusting decoded claims",
    async (status) => {
      setup(
        jwt({ sub: userId, realm_access: { roles: ["admin"] } }),
        { error: String(status), message: "Backend error" },
        status,
      );
      await expect(getCurrentUser()).rejects.toMatchObject({
        status,
        message: "Backend error",
      });
    },
  );
  it.each([
    "not-a-jwt",
    "header.%%%.signature",
    "header.e30.signature",
    jwt([]),
    jwt({ sub: "invalid" }),
  ])("rejects malformed token or subject %s", async (token) => {
    setup(token);
    await expect(getCurrentUser()).rejects.toThrow(/session/);
  });
  it("rejects malformed profile data", async () => {
    setup(jwt({ sub: userId }), { ...profile, email: [] });
    await expect(getCurrentUser()).rejects.toThrow("invalid user response");
  });
  it("propagates network errors", async () => {
    const fetch = setup(jwt({ sub: userId }));
    fetch.mockRejectedValue(new TypeError("offline"));
    await expect(getCurrentUser()).rejects.toThrow("offline");
  });
});
