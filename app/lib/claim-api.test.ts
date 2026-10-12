import { describe, expect, it, vi } from "vitest";
import { claimApiClient, ClaimApiError } from "./claim-api";
import { saveSession } from "../auth/token-storage";

const response = {
  id: "6a7d1f76-ef09-49ee-a310-25850196740a",
  userId: "a852a1c9-1384-4571-8c53-7eeeb4975329",
  placeId: "place-123",
  status: "PENDING",
};
const model = {
  claimId: response.id,
  userId: response.userId,
  placeId: response.placeId,
  status: response.status,
};

function setup(body: unknown = response, status = 200) {
  vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
  saveSession("authenticated-token", 3600);
  const result = status === 204 ? new Response(null, { status }) : Response.json(body, { status });
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(result);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("ClaimApiClient backend contract", () => {
  it("submits only placeId and maps the backend claim response", async () => {
    const fetch = setup(response, 201);
    expect(await claimApiClient.submitClaim("place-123")).toEqual(model);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/v1/business-claims");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ placeId: "place-123" });
    const headers = new Headers(init?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer authenticated-token");
  });

  it("loads the pending list with bearer authentication", async () => {
    const fetch = setup([response]);
    expect(await claimApiClient.getPendingClaims()).toEqual([model]);
    expect(fetch.mock.calls[0][0]).toBe("http://localhost:8080/api/v1/business-claims/pending");
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get("Authorization"))
      .toBe("Bearer authenticated-token");
  });

  it("accepts an empty pending list", async () => {
    setup([]);
    expect(await claimApiClient.getPendingClaims()).toEqual([]);
  });

  it.each(["approveClaim", "rejectClaim"] as const)(
    "%s posts no caller identity and accepts 204 with no body", async (method) => {
      const fetch = setup(null, 204);
      await expect(claimApiClient[method](response.id)).resolves.toBeUndefined();
      const action = method === "approveClaim" ? "approve" : "reject";
      expect(fetch.mock.calls[0][0]).toBe(
        `http://localhost:8080/api/v1/business-claims/${response.id}/${action}`,
      );
      expect(fetch.mock.calls[0][1]?.method).toBe("POST");
      expect(fetch.mock.calls[0][1]?.body).toBeUndefined();
      expect(new Headers(fetch.mock.calls[0][1]?.headers).get("Authorization"))
        .toBe("Bearer authenticated-token");
    },
  );

  it("reads a refreshed access token for subsequent decisions", async () => {
    const fetch = setup(null, 204);
    await claimApiClient.approveClaim(response.id);
    saveSession("refreshed-token", 3600);
    await claimApiClient.rejectClaim(response.id);
    expect(new Headers(fetch.mock.calls[1][1]?.headers).get("Authorization"))
      .toBe("Bearer refreshed-token");
  });

  it.each([400, 401, 403, 404, 409, 503])(
    "preserves status and Problem Detail for HTTP %s", async (status) => {
      setup({ detail: "Claim could not be reviewed" }, status);
      await expect(claimApiClient.approveClaim(response.id)).rejects.toMatchObject({
        status, message: "Claim could not be reviewed", name: "ApiError",
      });
    },
  );

  it("preserves the backend ErrorResponse on a submission failure", async () => {
    setup({ error: "400", message: "Invalid place" }, 400);
    await expect(claimApiClient.submitClaim("place-123")).rejects.toEqual(
      new ClaimApiError(400, "Invalid place"),
    );
  });

  it("does not turn an admin permission failure into an empty pending list", async () => {
    setup({ detail: "Administrator access is required" }, 403);
    await expect(claimApiClient.getPendingClaims()).rejects.toMatchObject({ status: 403 });
  });

  it("propagates non-JSON server errors from rejection", async () => {
    const fetch = setup();
    fetch.mockResolvedValue(new Response("Unavailable", { status: 503 }));
    await expect(claimApiClient.rejectClaim(response.id)).rejects.toMatchObject({ status: 503 });
  });

  it("propagates network failures", async () => {
    const fetch = setup();
    fetch.mockRejectedValue(new TypeError("Network unavailable"));
    await expect(claimApiClient.getPendingClaims()).rejects.toThrow("Network unavailable");
  });
});

describe("ClaimApiClient validation", () => {
  it.each(["", "   ", "a".repeat(256)])("rejects invalid place IDs before HTTP: %s", async (placeId) => {
    const fetch = setup();
    await expect(claimApiClient.submitClaim(placeId)).rejects.toMatchObject({ status: 400 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("accepts a provider place ID at the backend length limit without modifying it", async () => {
    const placeId = "a".repeat(255);
    const fetch = setup({ ...response, placeId }, 201);
    expect((await claimApiClient.submitClaim(placeId)).placeId).toBe(placeId);
    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({ placeId });
  });

  it.each(["", " ", "claim-123", "1-1-1-1-1", `${response.id}/approve`])(
    "rejects malformed claim IDs for both decisions before HTTP: %s", async (claimId) => {
      const fetch = setup(null, 204);
      await expect(claimApiClient.approveClaim(claimId)).rejects.toMatchObject({ status: 400 });
      await expect(claimApiClient.rejectClaim(claimId)).rejects.toMatchObject({ status: 400 });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each([null, {}, { claims: [response] }])("rejects malformed claim lists: %j", async (body) => {
    setup(body);
    await expect(claimApiClient.getPendingClaims()).rejects.toThrow("invalid business claim list");
  });

  it.each([
    null,
    [],
    { ...response, id: undefined },
    { ...response, id: "bad-id" },
    { ...response, userId: "bad-id" },
    { ...response, placeId: " " },
    { ...response, placeId: "a".repeat(256) },
    { ...response, status: "pending" },
    { ...response, status: "UNKNOWN" },
    model,
  ])("rejects malformed submission responses: %j", async (body) => {
    setup(body, 201);
    await expect(claimApiClient.submitClaim("place-123")).rejects.toThrow("invalid business claim response");
  });

  it("rejects a malformed list item rather than returning partial results", async () => {
    setup([response, { ...response, userId: null }]);
    await expect(claimApiClient.getPendingClaims()).rejects.toThrow("invalid business claim response");
  });
});
