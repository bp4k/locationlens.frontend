import { apiFetch, ApiError } from "./api-client";
import type { ReviewModel } from "../types/review";

export { ApiError as ReviewApiError };

/** ReviewResponse's exact wire shape; the backend deliberately omits user ID. */
interface ReviewResponse {
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

function toReviewModel(response: unknown): ReviewModel {
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

function toReviewList(response: unknown): ReviewModel[] {
  if (!Array.isArray(response)) {
    throw new Error("The server returned an invalid review list.");
  }
  return response.map(toReviewModel);
}

function validatePlaceId(placeId: string): void {
  if (!placeId.trim()) {
    throw new ApiError(
      400,
      "Select a place before requesting or submitting reviews.",
    );
  }
}

function validateSubmission(
  placeId: string,
  rating: number,
  text: string,
): void {
  validatePlaceId(placeId);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError(400, "Choose a rating from 1 to 5.");
  }
  if (!text.trim() || text.length > 2000) {
    throw new ApiError(400, "Enter a review between 1 and 2,000 characters.");
  }
}

export interface ReviewApiClient {
  getPlaceReviews(placeId: string): Promise<ReviewModel[]>;
  /** The backend derives the current user from the bearer token. */
  getUserReviewHistory(): Promise<ReviewModel[]>;
  submitReview(
    placeId: string,
    rating: number,
    text: string,
  ): Promise<ReviewModel>;
}

// VITE_APP_API_URL includes /api, following the existing user-api convention.
export const reviewApiClient: ReviewApiClient = {
  getPlaceReviews: async (placeId) => {
    validatePlaceId(placeId);
    const reviews = await apiFetch<unknown>(
      `/v1/reviews/place/${encodeURIComponent(placeId)}`,
    );
    return toReviewList(reviews);
  },
  getUserReviewHistory: async () => {
    const reviews = await apiFetch<unknown>("/v1/reviews/history");
    return toReviewList(reviews);
  },
  submitReview: async (placeId, rating, text) => {
    validateSubmission(placeId, rating, text);
    const review = await apiFetch<unknown>("/v1/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place_id: placeId, rating, text }),
    });
    return toReviewModel(review);
  },
};
