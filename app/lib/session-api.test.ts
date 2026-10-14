import { describe, expect, it, vi } from "vitest";
import { clearSession, getAccessToken, saveSession } from "../auth/token-storage";
import { refreshAccessToken, SessionExpiredError } from "./session-api";

function setup() {
  saveSession("old-token", 60);
  vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json({
    access_token: "renewed-token", token_type: "Bearer", expires_in: 300,
  }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("session renewal", () => {
  it("uses the existing server session cookie and stores only the relayed access token", async () => {
    const fetch = setup();
    expect(await refreshAccessToken()).toBe("renewed-token");
    expect(getAccessToken()).toBe("renewed-token");
    expect(fetch).toHaveBeenCalledWith("http://localhost:8080/api/v1/session/refresh", expect.objectContaining({
      method: "POST", credentials: "include",
    }));
    expect(new Headers(fetch.mock.calls[0][1]?.headers).has("Authorization")).toBe(false);
    expect(localStorage.length).toBe(2);
  });

  it("deduplicates concurrent renewals", async () => {
    const fetch = setup();
    const responses = await Promise.all([refreshAccessToken(), refreshAccessToken(), refreshAccessToken()]);
    expect(responses).toEqual(["renewed-token", "renewed-token", "renewed-token"]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not restore a session after logout while a refresh is in flight", async () => {
    const fetch = setup();
    let resolve!: (response: Response) => void;
    fetch.mockReturnValue(new Promise((done) => { resolve = done; }));
    const renewal = refreshAccessToken();
    clearSession();
    resolve(Response.json({ access_token: "old-user-token", token_type: "Bearer", expires_in: 300 }));
    await expect(renewal).rejects.toBeInstanceOf(SessionExpiredError);
    expect(getAccessToken()).toBeNull();
  });

  it("does not overwrite a newer login with a late refresh response", async () => {
    const fetch = setup();
    let resolve!: (response: Response) => void;
    fetch.mockReturnValue(new Promise((done) => { resolve = done; }));
    const renewal = refreshAccessToken();
    saveSession("different-user-token", 300);
    resolve(Response.json({ access_token: "old-user-token", token_type: "Bearer", expires_in: 300 }));
    expect(await renewal).toBe("different-user-token");
    expect(getAccessToken()).toBe("different-user-token");
  });

  it("clears a revoked session and permits a later new login", async () => {
    const fetch = setup();
    fetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(refreshAccessToken()).rejects.toBeInstanceOf(SessionExpiredError);
    expect(getAccessToken()).toBeNull();
    saveSession("new-login", 300);
    expect(await refreshAccessToken()).toBe("renewed-token");
  });

  it.each([{}, { access_token: "token", token_type: "Bearer", expires_in: 0 },
    { access_token: "token", token_type: "Bearer", expires_in: "300" }])("rejects malformed renewal %j", async (body) => {
    const fetch = setup();
    fetch.mockResolvedValue(Response.json(body));
    await expect(refreshAccessToken()).rejects.toThrow("invalid session response");
    expect(getAccessToken()).toBe("old-token");
  });

  it("keeps a valid token during temporary provider outages", async () => {
    const fetch = setup();
    fetch.mockResolvedValue(new Response(null, { status: 503 }));
    await expect(refreshAccessToken()).rejects.toThrow("Unable to renew");
    expect(getAccessToken()).toBe("old-token");
  });
});
