import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlaceApiError } from "../../lib/place-api";
import type { PlaceApiClient } from "../../lib/place-api";
import type { PlaceModel } from "../../types/place";
import { SearchView } from "./search-view";

// These tests exercise search orchestration. The real Google SDK is covered by
// MapView's injected-library tests, keeping this suite independent of API keys.
vi.mock("./map-view", () => ({
  MapView: () => <section aria-label="Map test boundary" />,
}));

const park: PlaceModel = {
  placeId: "park-1", name: "Piedmont Park", address: "Park address",
  latitude: 33.785, longitude: -84.373, types: ["PARK"],
};
const cafe: PlaceModel = { ...park, placeId: "cafe-1", name: "Campus Cafe", types: ["RESTAURANT"] };

function client(): PlaceApiClient {
  return {
    search: vi.fn().mockResolvedValue([park, cafe]),
    getPlaceDetails: vi.fn().mockImplementation(async (id) => id === park.placeId ? park : cafe),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function searchAtlanta(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Location"), "Atlanta");
  await user.click(screen.getByRole("button", { name: "Search" }));
}

describe("SearchView", () => {
  it("waits for valid input and supports coordinates including zero", async () => {
    const user = userEvent.setup();
    const api = client();
    render(<SearchView apiClient={api} />);
    expect(api.search).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a location");
    await user.selectOptions(screen.getByLabelText("Search by"), "coordinates");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByRole("alert")).toHaveTextContent("valid latitude and longitude");
    expect(api.search).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Latitude"), "0");
    await user.type(screen.getByLabelText("Longitude"), "-84.373");
    await user.clear(screen.getByLabelText("Search radius (meters)"));
    await user.type(screen.getByLabelText("Search radius (meters)"), "0");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByRole("alert")).toHaveTextContent("positive whole-number");
    expect(api.search).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("Search radius (meters)"));
    await user.type(screen.getByLabelText("Search radius (meters)"), "500");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(api.search).toHaveBeenCalledWith({ latitude: 0, longitude: -84.373, radiusMeters: 500 });
  });

  it("loads selected details and delegates claims and reviews to the existing views", async () => {
    const user = userEvent.setup();
    const api = client();
    const onOpenClaim = vi.fn();
    const reviews = {
      getPlaceReviews: vi.fn().mockResolvedValue([]),
      getUserReviewHistory: vi.fn().mockResolvedValue([]),
      submitReview: vi.fn(),
    };
    render(<SearchView apiClient={api} reviewApiClient={reviews} onOpenClaim={onOpenClaim} />);
    await searchAtlanta(user);
    await user.click(await screen.findByRole("button", { name: /Piedmont Park/ }));
    expect(api.getPlaceDetails).toHaveBeenCalledWith(park.placeId);
    expect(await screen.findByRole("heading", { name: park.name })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Piedmont Park/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Claim this business" }));
    expect(onOpenClaim).toHaveBeenCalledWith(park.placeId);
    await user.click(screen.getByRole("button", { name: /Show reviews/ }));
    expect(reviews.getPlaceReviews).toHaveBeenCalledWith(park.placeId);
  });

  it("applies and clears server filters using the last submitted location", async () => {
    const user = userEvent.setup();
    const api = client();
    render(<SearchView apiClient={api} />);
    await user.selectOptions(screen.getByLabelText("Place type"), "PARK");
    expect(api.search).not.toHaveBeenCalled();
    await searchAtlanta(user);
    expect(api.search).toHaveBeenLastCalledWith({ locationText: "Atlanta", radiusMeters: 1000, placeType: "PARK" });
    await user.clear(screen.getByLabelText("Location"));
    await user.type(screen.getByLabelText("Location"), "Decatur");
    await user.selectOptions(screen.getByLabelText("Place type"), "RESTAURANT");
    expect(api.search).toHaveBeenLastCalledWith({ locationText: "Atlanta", radiusMeters: 1000, placeType: "RESTAURANT" });
    await user.click(screen.getByRole("button", { name: "Clear filter" }));
    expect(api.search).toHaveBeenLastCalledWith({ locationText: "Atlanta", radiusMeters: 1000, placeType: undefined });
    expect(screen.getByLabelText("Place type")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(api.search).toHaveBeenLastCalledWith({ locationText: "Decatur", radiusMeters: 1000, placeType: undefined });
  });

  it("shows search errors with retry and then an empty-result state", async () => {
    const user = userEvent.setup();
    const api = client();
    vi.mocked(api.search).mockRejectedValueOnce(new PlaceApiError(401, "Unauthorized")).mockResolvedValueOnce([]);
    render(<SearchView apiClient={api} />);
    await searchAtlanta(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign in to search places.");
    await user.click(screen.getByRole("button", { name: "Retry search" }));
    expect(await screen.findByText(/No places found/)).toBeInTheDocument();
    expect(api.search).toHaveBeenCalledTimes(2);
  });

  it("keeps a failed selection highlighted and lets details retry", async () => {
    const user = userEvent.setup();
    const api = client();
    vi.mocked(api.getPlaceDetails).mockRejectedValueOnce(new Error("Network down"));
    render(<SearchView apiClient={api} />);
    await searchAtlanta(user);
    await user.click(await screen.findByRole("button", { name: /Piedmont Park/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load place details");
    expect(screen.getByRole("button", { name: /Piedmont Park/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Retry details" }));
    expect(await screen.findByRole("heading", { name: park.name })).toBeInTheDocument();
  });

  it("ignores older searches when filters change during a pending request", async () => {
    const user = userEvent.setup();
    const api = client();
    const old = deferred<PlaceModel[]>();
    vi.mocked(api.search).mockReturnValueOnce(old.promise).mockResolvedValueOnce([cafe]);
    render(<SearchView apiClient={api} />);
    await searchAtlanta(user);
    expect(screen.getByText("Searching places…")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Place type"), "RESTAURANT");
    expect(await screen.findByRole("button", { name: /Campus Cafe/ })).toBeInTheDocument();
    await act(async () => old.resolve([park]));
    expect(screen.queryByRole("button", { name: /Piedmont Park/ })).not.toBeInTheDocument();
  });

  it("ignores old details after changing selection or starting a new search", async () => {
    const user = userEvent.setup();
    const api = client();
    const old = deferred<PlaceModel>();
    vi.mocked(api.getPlaceDetails).mockReturnValueOnce(old.promise);
    render(<SearchView apiClient={api} />);
    await searchAtlanta(user);
    await user.click(await screen.findByRole("button", { name: /Piedmont Park/ }));
    await user.click(screen.getByRole("button", { name: /Campus Cafe/ }));
    expect(await screen.findByRole("heading", { name: cafe.name })).toBeInTheDocument();
    await act(async () => old.resolve(park));
    expect(screen.queryByRole("heading", { name: park.name })).not.toBeInTheDocument();
    const pending = deferred<PlaceModel>();
    vi.mocked(api.getPlaceDetails).mockReturnValueOnce(pending.promise);
    await user.click(screen.getByRole("button", { name: /Piedmont Park/ }));
    await user.click(screen.getByRole("button", { name: "Search" }));
    await act(async () => pending.resolve(park));
    expect(await screen.findByText("Select a place to see its details.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: park.name })).not.toBeInTheDocument();
  });
});
