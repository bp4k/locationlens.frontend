import { PlaceTypeModel } from "../../types/place";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  latitude: 33.785, longitude: -84.373, types: [PlaceTypeModel.PARK],
};
const cafe: PlaceModel = { ...park, placeId: "cafe-1", name: "Campus Cafe", types: [PlaceTypeModel.RESTAURANT] };

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
  afterEach(() => vi.useRealTimers());

  it("keeps the same map mounted before, during, and after a failed or successful search", async () => {
    const user = userEvent.setup();
    const api = client();
    const pending = deferred<PlaceModel[]>();
    vi.mocked(api.search).mockReturnValueOnce(pending.promise)
      .mockRejectedValueOnce(new Error("Search unavailable"));
    render(<SearchView apiClient={api} />);
    const map = screen.getByRole("region", { name: "Map test boundary" });
    await searchAtlanta(user);
    expect(screen.getByRole("region", { name: "Map test boundary" })).toBe(map);
    await act(async () => pending.resolve([park]));
    expect(screen.getByRole("region", { name: "Map test boundary" })).toBe(map);
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to search places");
    expect(screen.getByRole("region", { name: "Map test boundary" })).toBe(map);
  });

  it("stops timed-out search/detail loading and retries through the real place client", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
    const wirePlace = {
      place_id: park.placeId,
      name: park.name,
      address: park.address,
      latitude: park.latitude,
      longitude: park.longitude,
      types: park.types,
    };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockReturnValueOnce(new Promise(() => {}))
      .mockResolvedValueOnce(Response.json([wirePlace]))
      .mockReturnValueOnce(new Promise(() => {}))
      .mockResolvedValueOnce(Response.json(wirePlace));
    vi.stubGlobal("fetch", fetch);
    render(<SearchView />);
    fireEvent.change(screen.getByLabelText("Location"), {
      target: { value: "Atlanta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByText(/Searching places/)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(screen.queryByText(/Searching places/)).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("timed out");
    expect(screen.queryByText(/No places found/)).not.toBeInTheDocument();
    expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry search" }));
    });
    expect(screen.getByLabelText("Location")).toHaveValue("Atlanta");
    fireEvent.click(screen.getByRole("button", { name: /Piedmont Park/ }));
    expect(screen.getByText(/Loading place details/)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(screen.queryByText(/Loading place details/)).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("timed out");
    expect(fetch.mock.calls[2][1]?.signal?.aborted).toBe(true);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry details" }));
    });
    expect(
      screen.getByRole("heading", { name: park.name }),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(4);
  });
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
    expect(api.search).toHaveBeenLastCalledWith({ locationText: "Atlanta", radiusMeters: 1000, placeType: PlaceTypeModel.PARK });
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
