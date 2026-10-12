import { describe, expect, it, vi } from "vitest";
import { saveSession } from "../auth/token-storage";
import type { SearchCriteriaModel } from "../types/search-criteria";
import { placeApiClient } from "./place-api";

// Matches the pending backend PlaceResponse DTO, not a UI-shaped mock response.
const response = {
  place_id: "place-123",
  name: "Piedmont Park",
  address: "1320 Monroe Drive",
  latitude: 33.785,
  longitude: -84.373,
  types: ["PARK", "ATTRACTION"],
};
const model = {
  placeId: response.place_id,
  name: response.name,
  address: response.address,
  latitude: response.latitude,
  longitude: response.longitude,
  types: response.types,
};
const criteria: SearchCriteriaModel = { locationText: "Atlanta", radiusMeters: 1000 };

function setup(body: unknown, status = 200) {
  vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
  saveSession("authenticated-token", 3600);
  // Each request needs its own Response because reading a body consumes it.
  const fetch = vi.fn<typeof globalThis.fetch>()
    .mockImplementation(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("PlaceApiClient proposed contract", () => {
  it("encodes text/filters and maps the wire response with bearer auth", async () => {
    const fetch = setup([response]);
    const results = await placeApiClient.search({
      ...criteria, locationText: "  Atlanta & Decatur?  ", placeType: "PARK",
    });
    expect(results).toEqual([model]);
    const url = new URL(fetch.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe("http://localhost:8080/api/v1/places/search");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      location_text: "Atlanta & Decatur?", radius_meters: "1000", place_type: "PARK",
    });
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get("Authorization"))
      .toBe("Bearer authenticated-token");
    expect(fetch.mock.calls[0][1]?.body).toBeUndefined();
  });

  it("supports zero and fractional coordinates and omits unset text/type", async () => {
    const fetch = setup([]);
    expect(await placeApiClient.search({ latitude: 0, longitude: -84.373, radiusMeters: 500 }))
      .toEqual([]);
    const url = new URL(fetch.mock.calls[0][0] as string);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      latitude: "0", longitude: "-84.373", radius_meters: "500",
    });
  });

  it("encodes provider place IDs and maps details", async () => {
    const fetch = setup(response);
    expect(await placeApiClient.getPlaceDetails("place/a?b#c")).toEqual(model);
    expect(fetch.mock.calls[0][0])
      .toBe("http://localhost:8080/api/v1/places/place%2Fa%3Fb%23c");
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get("Authorization"))
      .toBe("Bearer authenticated-token");
  });

  it.each([400, 401, 403, 404, 503])("preserves HTTP %s errors", async (status) => {
    setup({ message: "Backend error" }, status);
    await expect(placeApiClient.search(criteria)).rejects.toMatchObject({ status, message: "Backend error" });
    await expect(placeApiClient.getPlaceDetails("place-123"))
      .rejects.toMatchObject({ status, message: "Backend error" });
  });

  it("propagates network failures", async () => {
    const fetch = setup([]);
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(placeApiClient.search(criteria)).rejects.toThrow("Failed to fetch");
    await expect(placeApiClient.getPlaceDetails("place-123")).rejects.toThrow("Failed to fetch");
  });
});

describe("PlaceApiClient input validation", () => {
  it.each([
    { radiusMeters: 1000 },
    { ...criteria, locationText: "   " },
    { ...criteria, latitude: 33 },
    { ...criteria, longitude: -84 },
    { ...criteria, latitude: 91, longitude: 0 },
    { ...criteria, latitude: 0, longitude: -181 },
    { ...criteria, latitude: Number.NaN, longitude: 0 },
    { ...criteria, latitude: 0, longitude: Infinity },
    { ...criteria, radiusMeters: 0 },
    { ...criteria, radiusMeters: -1 },
    { ...criteria, radiusMeters: 1.5 },
    { ...criteria, radiusMeters: Infinity },
    { ...criteria, placeType: "UNKNOWN" },
  ])("rejects invalid criteria %j before HTTP", async (input) => {
    const fetch = setup([]);
    await expect(placeApiClient.search(input as SearchCriteriaModel))
      .rejects.toMatchObject({ status: 400 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["", "   "])("rejects blank place ID %j before HTTP", async (placeId) => {
    const fetch = setup(response);
    await expect(placeApiClient.getPlaceDetails(placeId)).rejects.toMatchObject({ status: 400 });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("PlaceApiClient response validation", () => {
  it.each([
    null,
    { ...response, place_id: "" },
    { ...response, name: " " },
    { ...response, address: null },
    { ...response, latitude: "33.785" },
    { ...response, latitude: 91 },
    { ...response, longitude: -181 },
    { ...response, types: null },
    { ...response, types: ["UNKNOWN"] },
  ])("rejects malformed details and list items %j", async (body) => {
    const fetch = setup(body);
    await expect(placeApiClient.getPlaceDetails("place-123"))
      .rejects.toThrow("invalid place response");
    fetch.mockResolvedValue(Response.json([response, body]));
    await expect(placeApiClient.search(criteria)).rejects.toThrow("invalid place response");
  });

  it("rejects a non-array search response", async () => {
    setup(response);
    await expect(placeApiClient.search(criteria)).rejects.toThrow("invalid place list");
  });

  it("accepts coordinate boundaries and empty categories", async () => {
    setup({ ...response, latitude: -90, longitude: 180, types: [] });
    expect(await placeApiClient.getPlaceDetails("place-123"))
      .toEqual({ ...model, latitude: -90, longitude: 180, types: [] });
  });
});
