/**
 * Public review data used by the view. Matches the backend ReviewResponse,
 * rather than the persistence entity: author/user ID is not exposed by the API.
 * UUIDs and Instants remain strings so timestamp precision is not lost.
 */
export interface ReviewModel {
  reviewId: string;
  rating: number;
  text: string;
  createdAt: string;
  placeId: string;
}

export type ReviewTarget =
  | { kind: "place"; placeId: string }
  | { kind: "history" };

/** ReviewResponse's exact wire shape; the backend deliberately omits user ID. */
export interface ReviewResponse {
  review_id: string;
  place_id: string;
  rating: number;
  text: string;
  created_at: string;
}

function isReviewResponse(value: unknown): value is ReviewResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const review = value as Record<string, unknown>;
  return (
    typeof review.review_id === "string" &&
    review.review_id.trim().length > 0 &&
    typeof review.place_id === "string" &&
    review.place_id.trim().length > 0 &&
    typeof review.rating === "number" &&
    Number.isInteger(review.rating) &&
    review.rating >= 1 &&
    review.rating <= 5 &&
    typeof review.text === "string" &&
    typeof review.created_at === "string" &&
    Number.isFinite(Date.parse(review.created_at))
  );
}

export function parseReviewModel(response: unknown): ReviewModel {
  if (!isReviewResponse(response)) {
    throw new Error("The server returned an invalid review response.");
  }
  return {
    reviewId: response.review_id,
    placeId: response.place_id,
    rating: response.rating,
    text: response.text,
    createdAt: response.created_at,
  };
}

export function parseReviewModels(response: unknown): ReviewModel[] {
  if (!Array.isArray(response)) {
    throw new Error("The server returned an invalid review list.");
  }
  return response.map(parseReviewModel);
}
