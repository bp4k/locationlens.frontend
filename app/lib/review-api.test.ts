import { describe, expect, it, vi } from "vitest";
import { apiFetch } from "./api-client";
import { reviewApiClient } from "./review-api";

vi.mock("./api-client", async (importOriginal) => {
  const original = await importOriginal<typeof import("./api-client")>();
  return { ...original, apiFetch: vi.fn() };
});

const review = {
  reviewId: "r1",
  placeId: "p1",
  userId: "u1",
  rating: 5,
  text: "Great!",
  createdAt: "2026-10-10T12:00:00Z",
};

describe("ReviewApiClient", () => {
  it("gets place reviews via the existing API helper with encoded IDs", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce([review]);
    expect(await reviewApiClient.getPlaceReviews("place/a?b")).toEqual([
      review,
    ]);
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/v1/places/place%2Fa%3Fb/reviews",
    );
  });
  it("gets user history", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce([review]);
    expect(await reviewApiClient.getUserReviewHistory("user/a")).toEqual([
      review,
    ]);
    expect(apiFetch).toHaveBeenLastCalledWith("/v1/users/user%2Fa/reviews");
  });
  it("submits only rating/text, leaving author assignment to the backend", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(review);
    expect(await reviewApiClient.submitReview("p1", 5, "Great!")).toEqual(
      review,
    );
    expect(apiFetch).toHaveBeenLastCalledWith("/v1/places/p1/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 5, text: "Great!" }),
    });
  });
});
