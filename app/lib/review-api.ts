import { apiFetch, ApiError } from "./api-client";
import type { ReviewModel } from "../types/review";
import { parseReviewModel, parseReviewModels } from "../types/review";

export { ApiError as ReviewApiError };

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
    return parseReviewModels(reviews);
  },
  getUserReviewHistory: async () => {
    const reviews = await apiFetch<unknown>("/v1/reviews/history");
    return parseReviewModels(reviews);
  },
  submitReview: async (placeId, rating, text) => {
    validateSubmission(placeId, rating, text);
    const review = await apiFetch<unknown>("/v1/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place_id: placeId, rating, text }),
    });
    return parseReviewModel(review);
  },
};
