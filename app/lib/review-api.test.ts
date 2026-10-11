import { describe, expect, it, vi } from "vitest";
import { reviewApiClient } from "./review-api";
import { saveSession } from "../auth/token-storage";

// Exact JSON representation of the backend's ReviewResponse record.
const response = {
  review_id: "6a7d1f76-ef09-49ee-a310-25850196740a",
  place_id: "place-123",
  rating: 5,
  text: "Great!",
  created_at: "2026-10-10T12:00:00Z",
};
const model = {
  reviewId: response.review_id,
  placeId: response.place_id,
  rating: response.rating,
  text: response.text,
  createdAt: response.created_at,
};

function setup(body: unknown, status = 200) {
  vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
  saveSession("authenticated-token", 3600);
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json(body, { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("ReviewApiClient backend contract", () => {
  it("gets place reviews and maps snake_case fields without inventing an author", async () => {
    const fetch = setup([response]);
    expect(await reviewApiClient.getPlaceReviews("place/a?b")).toEqual([model]);
    expect(fetch.mock.calls[0][0]).toBe(
      "http://localhost:8080/api/v1/reviews/place/place%2Fa%3Fb",
    );
    expect(
      new Headers(fetch.mock.calls[0][1]?.headers).get("Authorization"),
    ).toBe("Bearer authenticated-token");
    expect(model).not.toHaveProperty("userId");
  });
  it("loads only the signed-in user's history with no user parameter", async () => {
    const fetch = setup([response]);
    expect(await reviewApiClient.getUserReviewHistory()).toEqual([model]);
    expect(fetch.mock.calls[0][0]).toBe(
      "http://localhost:8080/api/v1/reviews/history",
    );
    expect(fetch.mock.calls[0][1]?.body).toBeUndefined();
  });
  it("posts the required place_id and maps the created response", async () => {
    const fetch = setup(response, 201);
    expect(
      await reviewApiClient.submitReview("place-123", 5, "Great!"),
    ).toEqual(model);
    expect(fetch.mock.calls[0][0]).toBe("http://localhost:8080/api/v1/reviews");
    expect(fetch.mock.calls[0][1]?.method).toBe("POST");
    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({
      place_id: "place-123",
      rating: 5,
      text: "Great!",
    });
  });
  it("handles empty result lists", async () => {
    setup([]);
    expect(await reviewApiClient.getUserReviewHistory()).toEqual([]);
  });
  it.each([400, 401, 409])(
    "preserves the backend ErrorResponse for HTTP %s",
    async (status) => {
      setup({ error: String(status), message: "Backend error" }, status);
      await expect(
        reviewApiClient.submitReview("place-123", 5, "Great!"),
      ).rejects.toMatchObject({ status, message: "Backend error" });
    },
  );
});

describe("ReviewApiClient validation", () => {
  it.each([
    ["", 5, "Great!"],
    ["   ", 5, "Great!"],
    ["place-123", 0, "Great!"],
    ["place-123", 6, "Great!"],
    ["place-123", 2.5, "Great!"],
    ["place-123", Number.NaN, "Great!"],
    ["place-123", 5, ""],
    ["place-123", 5, "   "],
    ["place-123", 5, "x".repeat(2001)],
  ] as [string, number, string][])(
    "rejects invalid submission %s / %s before HTTP",
    async (placeId, rating, text) => {
      const fetch = setup(response, 201);
      await expect(
        reviewApiClient.submitReview(placeId, rating, text),
      ).rejects.toMatchObject({ status: 400 });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("rejects blank IDs for place reads", async () => {
    const fetch = setup([]);
    await expect(reviewApiClient.getPlaceReviews(" ")).rejects.toMatchObject({
      status: 400,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([1, 5])(
    "accepts rating %s and text at the backend's length limit",
    async (rating) => {
      const fetch = setup({ ...response, rating, text: "x".repeat(2000) }, 201);
      const saved = await reviewApiClient.submitReview(
        "place-123",
        rating,
        "x".repeat(2000),
      );
      expect(saved.rating).toBe(rating);
      expect(saved.text).toHaveLength(2000);
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it.each([null, {}, { reviews: [response] }])(
    "rejects malformed history list %j",
    async (body) => {
      setup(body);
      await expect(reviewApiClient.getUserReviewHistory()).rejects.toThrow(
        "invalid review list",
      );
    },
  );

  it.each([
    null,
    { ...response, review_id: undefined },
    { ...response, place_id: undefined },
    { ...response, rating: "5" },
    { ...response, rating: 6 },
    { ...response, rating: 1.5 },
    { ...response, text: null },
    { ...response, created_at: "invalid date" },
    model,
  ])("rejects malformed created review %j", async (body) => {
    setup(body, 201);
    await expect(
      reviewApiClient.submitReview("place-123", 5, "Great!"),
    ).rejects.toThrow("invalid review response");
  });

  it("rejects a malformed item rather than returning a partial place list", async () => {
    setup([response, { ...response, created_at: null }]);
    await expect(reviewApiClient.getPlaceReviews("place-123")).rejects.toThrow(
      "invalid review response",
    );
  });

  it("propagates a network error from history reads", async () => {
    const fetch = setup([]);
    fetch.mockRejectedValue(new TypeError("Network unavailable"));
    await expect(reviewApiClient.getUserReviewHistory()).rejects.toThrow(
      "Network unavailable",
    );
  });
});
