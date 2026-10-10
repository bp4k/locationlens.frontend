import { describe, expect, it, vi } from "vitest";
import { apiFetch, ApiError } from "./api-client";
import { saveSession } from "../auth/token-storage";

function setup(response = Response.json({ ok: true })) {
  vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async () => response.clone());
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("apiFetch", () => {
  it("preserves the current user endpoint and adds the bearer header", async () => {
    const fetch = setup();
    saveSession("token", 3600);
    expect(await apiFetch("/v1/me")).toEqual({ ok: true });
    expect(fetch.mock.calls[0][0]).toBe("http://localhost:8080/api/v1/me");
    expect(
      new Headers(fetch.mock.calls[0][1]?.headers).get("Authorization"),
    ).toBe("Bearer token");
  });

  it("preserves Headers instances and reads refreshed tokens on each request", async () => {
    const fetch = setup();
    saveSession("old", 3600);
    await apiFetch("/v1/me");
    saveSession("new", 3600);
    await apiFetch("/v1/me", {
      headers: new Headers({ Accept: "application/json" }),
    });
    const headers = new Headers(fetch.mock.calls[1][1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer new");
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("retains existing anonymous request behavior without inventing a token", async () => {
    const fetch = setup();
    await apiFetch("/v1/login");
    expect(
      new Headers(fetch.mock.calls[0][1]?.headers).has("Authorization"),
    ).toBe(false);
  });

  it.each([{ message: "Already reviewed" }, { detail: "Already reviewed" }])(
    "preserves error status and backend messages: %j",
    async (body) => {
      setup(Response.json(body, { status: 409 }));
      await expect(apiFetch("/v1/reviews")).rejects.toMatchObject({
        status: 409,
        message: "Already reviewed",
      });
    },
  );

  it("handles non-JSON errors with the existing fallback message", async () => {
    setup(new Response("Unavailable", { status: 503 }));
    await expect(apiFetch("/v1/me")).rejects.toEqual(
      new ApiError(503, "API request to /v1/me failed with status 503"),
    );
  });

  it("propagates network failures", async () => {
    const fetch = setup();
    fetch.mockRejectedValue(new TypeError("offline"));
    await expect(apiFetch("/v1/me")).rejects.toThrow("offline");
  });
});
