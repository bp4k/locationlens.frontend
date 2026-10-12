import { describe, expect, it } from "vitest";
import { parseReviewModel, parseReviewModels } from "./review";

// Fields/serialization match the backend's public ReviewResponse record.
const response = {
  review_id: "6a7d1f76-ef09-49ee-a310-25850196740a",
  user_id: "a852a1c9-1384-4571-8c53-7eeeb4975329",
  place_id: "ChIJ_place_123",
  rating: 4,
  text: "A lovely park.",
  created_at: "2026-10-11T12:30:00.123456789Z",
};

const model = {
  reviewId: response.review_id,
  userId: response.user_id,
  placeId: response.place_id,
  rating: response.rating,
  text: response.text,
  createdAt: response.created_at,
};

describe("ReviewModel", () => {
  it("constructs the frontend model from the backend's exact wire fields", () => {
    expect(parseReviewModel(response)).toEqual(model);
  });

  it("preserves opaque place IDs, UUIDs, text, and Instant precision", () => {
    const text = "  First line\nSecond line 🌳  ";
    const parsed = parseReviewModel({ ...response, text });
    expect(parsed.createdAt).toBe(response.created_at);
    expect(parsed.reviewId).toBe(response.review_id);
    expect(parsed.placeId).toBe(response.place_id);
    expect(parsed.text).toBe(text);
  });

  it("uses the wire author UUID and does not retain the source object", () => {
    const source = { ...response, userId: "ignored-camel-case" };
    const parsed = parseReviewModel(source);
    expect(parsed.userId).toBe(response.user_id);
    expect(parsed).not.toHaveProperty("user_id");
    source.text = "Changed source";
    expect(parsed.text).toBe(response.text);
  });

  it.each([null, [], {}, model])(
    "rejects unsupported input shape %j",
    (value) => {
      expect(() => parseReviewModel(value)).toThrow("invalid review response");
    },
  );

  it.each([
    { review_id: " " },
    { review_id: "not-a-uuid" },
    { user_id: undefined },
    { user_id: "not-a-uuid" },
    { user_id: null },
    { place_id: " " },
    { rating: "4" },
    { rating: 0 },
    { rating: 6 },
    { rating: 2.5 },
    { rating: NaN },
    { text: null },
    { created_at: "not a timestamp" },
    { created_at: null },
  ])("rejects malformed wire fields %j", (overrides) => {
    expect(() => parseReviewModel({ ...response, ...overrides })).toThrow(
      "invalid review response",
    );
  });

  it("maps every review in order and accepts empty lists", () => {
    const second = {
      ...response,
      review_id: "f86ed47b-3fd1-46c9-9404-2162d583976d",
      rating: 5,
    };
    expect(parseReviewModels([response, second])).toEqual([
      model,
      { ...model, reviewId: second.review_id, rating: 5 },
    ]);
    expect(parseReviewModels([])).toEqual([]);
  });

  it("rejects invalid lists instead of returning partial data", () => {
    expect(() => parseReviewModels({ reviews: [response] })).toThrow(
      "invalid review list",
    );
    expect(() => parseReviewModels([response, null])).toThrow(
      "invalid review response",
    );
  });
});
