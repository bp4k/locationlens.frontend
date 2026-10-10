import { apiFetch, ApiError } from "./api-client";
import type { ReviewModel } from "../types/review";

export { ApiError as ReviewApiError };

/** Operations and JSON model follow the project's ReviewApiClient diagram. */
export interface ReviewApiClient {
  getPlaceReviews(placeId: string): Promise<ReviewModel[]>;
  getUserReviewHistory(userId: string): Promise<ReviewModel[]>;
  submitReview(
    placeId: string,
    rating: number,
    text: string,
  ): Promise<ReviewModel>;
}

// API base URL already includes /api, just as in user-api.ts.
// These review routes are a proposed contract pending backend implementation.
export const reviewApiClient: ReviewApiClient = {
  getPlaceReviews: (placeId) =>
    apiFetch(`/v1/places/${encodeURIComponent(placeId)}/reviews`),
  getUserReviewHistory: (userId) =>
    apiFetch(`/v1/users/${encodeURIComponent(userId)}/reviews`),
  submitReview: (placeId, rating, text) =>
    apiFetch(`/v1/places/${encodeURIComponent(placeId)}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, text }),
    }),
};
