import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ReviewView } from "./review-view";
import { saveSession } from "../../auth/token-storage";

it("renders actual ReviewResponse JSON and submits the backend's ReviewRequest through the shared client", async () => {
  vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
  saveSession("test-token", 3600);
  const existing = {
    review_id: "review-1",
    place_id: "park",
    rating: 4,
    text: "Existing review",
    created_at: "2026-10-10T12:00:00Z",
  };
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(Response.json([existing]))
    .mockResolvedValueOnce(
      Response.json(
        { ...existing, review_id: "review-2", rating: 5, text: "New review" },
        { status: 201 },
      ),
    );
  vi.stubGlobal("fetch", fetch);
  render(<ReviewView target={{ kind: "place", placeId: "park" }} />);
  expect(await screen.findByText("Existing review")).toBeInTheDocument();
  expect(screen.getByText("2026-10-10")).toBeInTheDocument();
  expect(screen.queryByText(/undefined|Reviewer:/)).not.toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText("Rating"), "5");
  await userEvent.type(screen.getByLabelText("Your experience"), "New review");
  await userEvent.click(screen.getByRole("button", { name: "Submit review" }));
  expect(
    await screen.findByText("Your review was submitted."),
  ).toBeInTheDocument();
  expect(screen.getByText("New review")).toBeInTheDocument();
  expect(fetch.mock.calls[1][0]).toBe("http://localhost:8080/api/v1/reviews");
  expect(JSON.parse(fetch.mock.calls[1][1]?.body as string)).toEqual({
    place_id: "park",
    rating: 5,
    text: "New review",
  });
});
