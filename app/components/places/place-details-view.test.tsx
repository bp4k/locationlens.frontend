import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PlaceModel } from "../../types/place";
import type { ReviewModel } from "../../types/review";
import type { ReviewApiClient } from "../../lib/review-api";
import { PlaceDetailsView } from "./place-details-view";

const park: PlaceModel = {
  placeId: "park-1",
  name: "Piedmont Park",
  address: "1320 Monroe Drive",
  latitude: 33.785,
  longitude: -84.373,
  types: ["PARK", "ATTRACTION"],
};
const cafe: PlaceModel = {
  ...park,
  placeId: "cafe-1",
  name: "Campus Cafe",
  types: ["RESTAURANT"],
};

function client(): ReviewApiClient {
  return {
    getPlaceReviews: vi.fn().mockResolvedValue([]),
    getUserReviewHistory: vi.fn().mockResolvedValue([]),
    submitReview: vi.fn().mockImplementation(async (placeId, rating, text) => ({
      reviewId: "review-1",
      userId: "6a7d1f76-ef09-49ee-a310-25850196740a",
      placeId,
      rating,
      text,
      createdAt: "2026-10-11T12:00:00Z",
    })),
  };
}

describe("PlaceDetailsView", () => {
  it("waits for selection without making review requests", () => {
    const api = client();
    render(<PlaceDetailsView apiClient={api} />);
    expect(
      screen.getByText("Select a place to see its details."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(api.getPlaceReviews).not.toHaveBeenCalled();
  });

  it("displays details and opens claims for the selected place", async () => {
    const user = userEvent.setup();
    const onOpenClaim = vi.fn();
    const { rerender } = render(<PlaceDetailsView place={park} />);
    expect(
      screen.getByRole("heading", { name: park.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(park.address)).toBeInTheDocument();
    expect(screen.getByText("Park · Attraction")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Claim this business" }),
    );
    expect(
      screen.getByRole("button", { name: "Submit business claim" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Selected place:", { exact: false }),
    ).toHaveTextContent(park.name);
    rerender(<PlaceDetailsView place={cafe} onOpenClaim={onOpenClaim} />);
    await user.click(
      screen.getByRole("button", { name: "Claim this business" }),
    );
    expect(onOpenClaim).toHaveBeenCalledExactlyOnceWith(cafe.placeId);
  });

  it("opens reviews on demand, preserves a hidden draft, and submits through ReviewView", async () => {
    const user = userEvent.setup();
    const api = client();
    render(<PlaceDetailsView place={park} apiClient={api} />);
    expect(api.getPlaceReviews).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Show reviews/ }));
    expect(api.getPlaceReviews).toHaveBeenCalledExactlyOnceWith(park.placeId);
    await user.selectOptions(await screen.findByLabelText("Rating"), "5");
    await user.type(screen.getByLabelText("Your experience"), "Lovely park.");
    await user.click(screen.getByRole("button", { name: "Hide reviews" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Show reviews/ }));
    expect(screen.getByLabelText("Your experience")).toHaveValue(
      "Lovely park.",
    );
    expect(api.getPlaceReviews).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Submit review" }));
    expect(api.submitReview).toHaveBeenCalledExactlyOnceWith(
      park.placeId,
      5,
      "Lovely park.",
    );
    expect(
      await screen.findByText("Your review was submitted."),
    ).toBeInTheDocument();
  });

  it("resets drafts on selection changes and ignores an old place's pending reviews", async () => {
    const user = userEvent.setup();
    const api = client();
    let resolve!: (reviews: ReviewModel[]) => void;
    vi.mocked(api.getPlaceReviews).mockReturnValueOnce(
      new Promise<ReviewModel[]>((done) => {
        resolve = done;
      }),
    );
    const { rerender } = render(
      <PlaceDetailsView place={park} apiClient={api} />,
    );
    await user.click(screen.getByRole("button", { name: /Show reviews/ }));
    await user.type(screen.getByLabelText("Your experience"), "Old draft");
    rerender(<PlaceDetailsView place={cafe} apiClient={api} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Show reviews/ }));
    expect(await screen.findByLabelText("Your experience")).toHaveValue("");
    expect(api.getPlaceReviews).toHaveBeenLastCalledWith(cafe.placeId);
    await act(async () =>
      resolve([
        {
          reviewId: "old-review",
          userId: "6a7d1f76-ef09-49ee-a310-25850196740a",
          placeId: park.placeId,
          rating: 4,
          text: "Old place review",
          createdAt: "2026-10-11T12:00:00Z",
        },
      ]),
    );
    expect(screen.queryByText("Old place review")).not.toBeInTheDocument();
    rerender(<PlaceDetailsView place={park} apiClient={api} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Show reviews/ }));
    expect(await screen.findByLabelText("Your experience")).toHaveValue("");
    rerender(<PlaceDetailsView apiClient={api} />);
    expect(
      screen.getByText("Select a place to see its details."),
    ).toBeInTheDocument();
  });
});
