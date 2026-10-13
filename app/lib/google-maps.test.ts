import { describe, expect, it, vi } from "vitest";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

vi.mock("@googlemaps/js-api-loader", () => ({
  importLibrary: vi.fn(), setOptions: vi.fn(),
}));

describe("Google Maps loader", () => {
  it("does not load scripts without a configured browser key", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
    const { loadGoogleMaps } = await import("./google-maps");
    await expect(loadGoogleMaps()).rejects.toThrow("map is not configured");
    expect(setOptions).not.toHaveBeenCalled();
    expect(importLibrary).not.toHaveBeenCalled();
  });

  it("configures the singleton once and only imports map rendering libraries", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "test-browser-key");
    vi.mocked(importLibrary).mockResolvedValue({} as google.maps.MapsLibrary);
    const { loadGoogleMaps } = await import("./google-maps");
    await loadGoogleMaps();
    await loadGoogleMaps();
    expect(setOptions).toHaveBeenCalledExactlyOnceWith({ key: "test-browser-key", v: "weekly" });
    expect(vi.mocked(importLibrary).mock.calls.map(([library]) => library)).toEqual([
      "maps", "marker", "core", "maps", "marker", "core",
    ]);
  });
});
