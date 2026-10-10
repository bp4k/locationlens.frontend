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

function toReviewModel(response: ReviewResponse): ReviewModel {
  return {
    reviewId: response.review_id,
    placeId: response.place_id,
    rating: response.rating,
    text: response.text,
    createdAt: response.created_at,
  };
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
    const reviews = await apiFetch<ReviewResponse[]>(
      `/v1/reviews/place/${encodeURIComponent(placeId)}`,
    );
    return reviews.map(toReviewModel);
  },
  getUserReviewHistory: async () => {
    const reviews = await apiFetch<ReviewResponse[]>("/v1/reviews/history");
    return reviews.map(toReviewModel);
  },
  submitReview: async (placeId, rating, text) => {
    const review = await apiFetch<ReviewResponse>("/v1/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place_id: placeId, rating, text }),
    });
    return toReviewModel(review);
  },
};
