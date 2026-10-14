import { afterEach, describe, expect, it, vi } from "vitest";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

vi.mock("@googlemaps/js-api-loader", () => ({
  importLibrary: vi.fn(),
  setOptions: vi.fn(),
}));

describe("Google Maps loader", () => {
  afterEach(() => vi.useRealTimers());

  it("times out a stalled SDK import and allows a fresh retry", async () => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "test-key");
    vi.mocked(importLibrary).mockReturnValue(new Promise(() => {}));
    const { loadGoogleMaps } = await import("./google-maps");
    const failed = expect(loadGoogleMaps()).rejects.toThrow(
      "map timed out after 10 seconds",
    );
    await vi.advanceTimersByTimeAsync(10000);
    await failed;
    expect(vi.getTimerCount()).toBe(0);
    vi.mocked(importLibrary).mockResolvedValue({} as google.maps.MapsLibrary);
    await expect(loadGoogleMaps()).resolves.toHaveProperty("maps");
    expect(setOptions).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

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
    expect(setOptions).toHaveBeenCalledExactlyOnceWith({
      key: "test-browser-key",
      v: "weekly",
    });
    expect(
      vi.mocked(importLibrary).mock.calls.map(([library]) => library),
    ).toEqual(["maps", "marker", "core", "maps", "marker", "core"]);
  });
});
