import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import PlaceReviews from "./place-reviews";
import ReviewHistory from "./review-history";
import ProtectedLayout from "../layouts/protected-layout";
import { AuthProvider } from "../auth/auth-context";
import { reviewApiClient } from "../lib/review-api";

vi.mock("../lib/review-api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/review-api")>();
  return {
    ...original,
    reviewApiClient: {
      getPlaceReviews: vi.fn().mockResolvedValue([]),
      getUserReviewHistory: vi.fn().mockResolvedValue([]),
      submitReview: vi.fn(),
    },
  };
});

describe("review routes", () => {
  it("redirects signed-out users before loading reviews", async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/places/place-123/reviews"]}>
          <Routes>
            <Route path="/login" element={<p>Sign in to LocationLens</p>} />
            <Route element={<ProtectedLayout />}>
              <Route
                path="/places/:placeId/reviews"
                element={<PlaceReviews />}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(
      await screen.findByText("Sign in to LocationLens"),
    ).toBeInTheDocument();
    expect(reviewApiClient.getPlaceReviews).not.toHaveBeenCalled();
  });

  it("passes the route place ID to the default API client", async () => {
    render(
      <MemoryRouter initialEntries={["/places/place-123/reviews"]}>
        <Routes>
          <Route path="/places/:placeId/reviews" element={<PlaceReviews />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/No reviews yet/)).toBeInTheDocument();
    expect(reviewApiClient.getPlaceReviews).toHaveBeenCalledWith("place-123");
  });
  it("loads authenticated history without supplying a user ID", async () => {
    render(
      <MemoryRouter initialEntries={["/reviews/history"]}>
        <Routes>
          <Route path="/reviews/history" element={<ReviewHistory />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/have not written any reviews/),
    ).toBeInTheDocument();
    expect(reviewApiClient.getUserReviewHistory).toHaveBeenCalledWith();
  });
});
