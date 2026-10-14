import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, ApiError } from "./api-client";
import { getAccessToken, saveSession } from "../auth/token-storage";

function setup(response = Response.json({ ok: true })) {
  vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async () => response.clone());
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("apiFetch", () => {
  afterEach(() => vi.useRealTimers());

  it("renews an expired token before sending a claim instead of posting with stale credentials", async () => {
    const fetch = setup();
    saveSession("expired-token", 1);
    vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(2000);
    fetch.mockResolvedValueOnce(Response.json({ access_token: "renewed-token", token_type: "Bearer", expires_in: 300 }));
    await apiFetch("/v1/business-claims", { method: "POST", body: '{"placeId":"business"}' });
    expect(fetch.mock.calls[0][0]).toBe("http://localhost:8080/api/v1/session/refresh");
    expect(fetch.mock.calls[1][0]).toBe("http://localhost:8080/api/v1/business-claims");
    expect(new Headers(fetch.mock.calls[1][1]?.headers).get("Authorization")).toBe("Bearer renewed-token");
  });

  it("recovers a rejected account or claim request once and preserves the claim body", async () => {
    const fetch = setup();
    saveSession("rejected-token", 300);
    fetch.mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ access_token: "renewed-token", token_type: "Bearer", expires_in: 300 }));
    const init = { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"placeId":"business"}' };
    expect(await apiFetch("/v1/business-claims", init)).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[2][1]).toEqual(expect.objectContaining({ method: init.method, body: init.body }));
    expect(new Headers(fetch.mock.calls[2][1]?.headers).get("Content-Type")).toBe("application/json");
    expect(new Headers(fetch.mock.calls[2][1]?.headers).get("Authorization")).toBe("Bearer renewed-token");
  });

  it("ends a repeatedly rejected session without a retry loop", async () => {
    const fetch = setup(new Response(null, { status: 401 }));
    saveSession("rejected-token", 300);
    fetch.mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ access_token: "renewed-token", token_type: "Bearer", expires_in: 300 }));
    await expect(apiFetch("/v1/me")).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(getAccessToken()).toBeNull();
  });

  it("never retries a forbidden claim as an authentication failure", async () => {
    const fetch = setup(new Response(null, { status: 403 }));
    saveSession("token", 300);
    await expect(apiFetch("/v1/business-claims", { method: "POST" })).rejects.toMatchObject({ status: 403 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("token");
  });

  it("aborts a stalled read at ten seconds even if fetch ignores cancellation", async () => {
    vi.useFakeTimers();
    const fetch = setup();
    fetch.mockReturnValue(new Promise(() => {}));
    const result = apiFetch("/v1/places/search");
    const failed = expect(result).rejects.toMatchObject({
      status: 504,
      message: expect.stringContaining("10 seconds"),
    });
    const signal = fetch.mock.calls[0][1]?.signal;
    await vi.advanceTimersByTimeAsync(9999);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await failed;
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    fetch.mockResolvedValue(Response.json({ ok: true }));
    expect(await apiFetch("/v1/places/search")).toEqual({ ok: true });
    expect(fetch.mock.calls[1][1]?.signal?.aborted).toBe(false);
  });

  it("also bounds reading a stalled JSON response body", async () => {
    vi.useFakeTimers();
    const fetch = setup();
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => new Promise(() => {}),
    } as Response);
    const failed = expect(apiFetch("/v1/places/place-1")).rejects.toMatchObject(
      { status: 504 },
    );
    await vi.advanceTimersByTimeAsync(10000);
    await failed;
    expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("preserves caller cancellation instead of reporting a timeout", async () => {
    vi.useFakeTimers();
    const fetch = setup();
    fetch.mockReturnValue(new Promise(() => {}));
    const controller = new AbortController();
    const reason = new DOMException("Selection changed", "AbortError");
    const failed = expect(
      apiFetch("/v1/places/place-1", { signal: controller.signal }),
    ).rejects.toBe(reason);
    controller.abort(reason);
    await failed;
    expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not start a read that was already cancelled", async () => {
    const fetch = setup();
    const controller = new AbortController();
    controller.abort();
    await expect(
      apiFetch("/v1/places/place-1", { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("clears the deadline on success and does not add read timeouts to writes", async () => {
    vi.useFakeTimers();
    const fetch = setup();
    await apiFetch("/v1/places/place-1");
    expect(vi.getTimerCount()).toBe(0);
    await apiFetch("/v1/business-claims", { method: "POST" });
    expect(fetch.mock.calls[1][1]?.signal).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("accepts a successful 204 response without parsing JSON", async () => {
    setup(new Response(null, { status: 204 }));
    await expect(
      apiFetch<void>("/v1/business-claims/claim/approve", {
        method: "POST",
      }),
    ).resolves.toBeUndefined();
  });

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
