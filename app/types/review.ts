/**
 * Public review data used by the view. Matches the backend ReviewResponse,
 * including the author UUID supplied by the server.
 * UUIDs and Instants remain strings so timestamp precision is not lost.
 */
export interface ReviewModel {
  reviewId: string;
  userId: string;
  rating: number;
  text: string;
  createdAt: string;
  placeId: string;
}

export type ReviewTarget =
  | { kind: "place"; placeId: string }
  | { kind: "history" };

/** ReviewResponse's exact wire shape. */
export interface ReviewResponse {
  review_id: string;
  user_id: string;
  place_id: string;
  rating: number;
  text: string;
  created_at: string;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isReviewResponse(value: unknown): value is ReviewResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const review = value as Record<string, unknown>;
  return (
    typeof review.review_id === "string" &&
    uuidPattern.test(review.review_id) &&
    typeof review.user_id === "string" &&
    uuidPattern.test(review.user_id) &&
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
    userId: response.user_id,
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
