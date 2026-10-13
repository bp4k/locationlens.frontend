import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { GoogleMapsLibraries } from "../../lib/google-maps";
import type { PlaceModel } from "../../types/place";
import { MapView } from "./map-view";
import { SearchView } from "./search-view";
import { loadGoogleMaps } from "../../lib/google-maps";

vi.mock("../../lib/google-maps", () => ({ loadGoogleMaps: vi.fn() }));

const park: PlaceModel = {
  placeId: "park-1", name: "Piedmont Park", address: "Atlanta",
  latitude: 33.785, longitude: -84.373, types: ["PARK"],
};
const cafe: PlaceModel = { ...park, placeId: "cafe-1", name: "Campus Cafe", longitude: -84.39 };

/** Minimal Google SDK boundary: real DOM events, no network or Google account. */
function sdk() {
  let container: HTMLElement;
  const map = {
    setCenter: vi.fn(), setZoom: vi.fn(), fitBounds: vi.fn(), panTo: vi.fn(),
    getZoom: vi.fn().mockReturnValue(14),
    addListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  };
  const Map = vi.fn(function (element: HTMLElement) { container = element; return map; });
  const bounds = { extend: vi.fn() };
  const LatLngBounds = vi.fn(function () { return bounds; });
  const clearInstanceListeners = vi.fn();
  const PinElement = vi.fn(function () {
    return Object.assign(document.createElement("span"), { background: "", scale: 1 });
  });
  const AdvancedMarkerElement = vi.fn(function (options: { title: string; position: unknown; map: unknown }) {
    const marker = Object.assign(document.createElement("button"), {
      position: options.position, title: options.title, zIndex: 0,
    });
    marker.setAttribute("aria-label", options.title);
    marker.addEventListener("click", () => marker.dispatchEvent(new Event("gmp-click")));
    Object.defineProperty(marker, "map", {
      set: (value: unknown) => { if (value === null) marker.remove(); },
      get: () => options.map,
    });
    container.append(marker);
    return marker;
  });
  const libraries = {
    maps: { Map }, marker: { AdvancedMarkerElement, PinElement },
    core: { LatLngBounds, event: { clearInstanceListeners } },
  } as unknown as GoogleMapsLibraries;
  const loadMaps = vi.fn().mockResolvedValue(libraries);
  return { libraries, loadMaps, Map, map, bounds, clearInstanceListeners, AdvancedMarkerElement };
}

describe("MapView", () => {
  it("synchronizes map and list selection through SearchView", async () => {
    const api = sdk();
    vi.mocked(loadGoogleMaps).mockResolvedValue(api.libraries);
    const user = userEvent.setup();
    const places = {
      search: vi.fn().mockResolvedValue([park, cafe]),
      getPlaceDetails: vi.fn().mockImplementation(async (id) => id === park.placeId ? park : cafe),
    };
    render(<SearchView apiClient={places} />);
    await user.type(screen.getByLabelText("Location"), "Atlanta");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.click(await screen.findByRole("button", { name: park.name }));
    expect(await screen.findByRole("heading", { name: park.name })).toBeInTheDocument();
    const list = within(screen.getByRole("list", { name: "Places" }));
    expect(list.getByRole("button", { name: /Piedmont Park/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(list.getByRole("button", { name: /Campus Cafe/ }));
    expect(await screen.findByRole("heading", { name: cafe.name })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: cafe.name })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: park.name })).toHaveAttribute("aria-pressed", "false");
    expect(places.getPlaceDetails).toHaveBeenLastCalledWith(cafe.placeId);
  });
  it("fits results and selects markers using keyboard activation", async () => {
    const user = userEvent.setup();
    const api = sdk();
    const onSelect = vi.fn();
    render(<MapView places={[park, cafe]} onSelect={onSelect} loadMaps={api.loadMaps} />);
    const marker = await screen.findByRole("button", { name: park.name });
    expect(api.bounds.extend).toHaveBeenCalledWith({ lat: park.latitude, lng: park.longitude });
    expect(api.map.fitBounds).toHaveBeenCalledWith(api.bounds, 48);
    marker.focus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(park.placeId);
    await user.click(screen.getByRole("button", { name: "Center map on results" }));
    expect(api.map.fitBounds).toHaveBeenCalledTimes(2);
  });

  it("highlights parent selection without rebuilding the map and uses the latest callback", async () => {
    const api = sdk();
    const user = userEvent.setup();
    const places = [park, cafe];
    const oldSelect = vi.fn();
    const nextSelect = vi.fn();
    const { rerender } = render(<MapView places={places} onSelect={oldSelect} loadMaps={api.loadMaps} />);
    await screen.findByRole("button", { name: park.name });
    rerender(<MapView places={places} selectedPlaceId={park.placeId} onSelect={nextSelect} loadMaps={api.loadMaps} />);
    expect(screen.getByRole("button", { name: park.name })).toHaveAttribute("aria-pressed", "true");
    expect(api.map.panTo).toHaveBeenCalledWith({ lat: park.latitude, lng: park.longitude });
    expect(api.Map).toHaveBeenCalledTimes(1);
    expect(api.AdvancedMarkerElement).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: cafe.name }));
    expect(nextSelect).toHaveBeenCalledWith(cafe.placeId);
    expect(oldSelect).not.toHaveBeenCalled();
  });

  it("replaces old markers, centers a single result, and cleans up on unmount", async () => {
    const api = sdk();
    const { rerender, unmount } = render(<MapView places={[park, cafe]} onSelect={vi.fn()} loadMaps={api.loadMaps} />);
    await screen.findByRole("button", { name: park.name });
    rerender(<MapView places={[cafe]} onSelect={vi.fn()} loadMaps={api.loadMaps} />);
    expect(screen.queryByRole("button", { name: park.name })).not.toBeInTheDocument();
    expect(api.map.setCenter).toHaveBeenCalledWith({ lat: cafe.latitude, lng: cafe.longitude });
    expect(api.map.setZoom).toHaveBeenCalledWith(14);
    unmount();
    expect(api.clearInstanceListeners).toHaveBeenCalledWith(api.map);
  });

  it("shows empty results without fitting invalid bounds", async () => {
    const api = sdk();
    render(<MapView places={[]} onSelect={vi.fn()} loadMaps={api.loadMaps} />);
    await waitFor(() => expect(api.Map).toHaveBeenCalled());
    expect(screen.getByText("No places to display on the map.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Center map on results" })).toBeDisabled();
    expect(api.map.fitBounds).not.toHaveBeenCalled();
  });

  it("retries loader failures and ignores a load that finishes after unmount", async () => {
    const api = sdk();
    const user = userEvent.setup();
    api.loadMaps.mockRejectedValueOnce(new Error("Map network unavailable"));
    const { unmount } = render(<MapView places={[park]} onSelect={vi.fn()} loadMaps={api.loadMaps} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Map network unavailable");
    await user.click(screen.getByRole("button", { name: "Retry map" }));
    await screen.findByRole("button", { name: park.name });
    unmount();
    let resolve!: (libraries: GoogleMapsLibraries) => void;
    const pending = new Promise<GoogleMapsLibraries>((done) => { resolve = done; });
    const late = render(<MapView places={[park]} onSelect={vi.fn()} loadMaps={() => pending} />);
    late.unmount();
    await act(async () => resolve(api.libraries));
    expect(api.Map).toHaveBeenCalledTimes(1);
  });
});
