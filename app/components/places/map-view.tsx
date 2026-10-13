import { useEffect, useId, useRef, useState } from "react";
import { Button, Spinner, makeStyles, tokens } from "@fluentui/react-components";
import { loadGoogleMaps } from "../../lib/google-maps";
import type { GoogleMapsLibraries } from "../../lib/google-maps";
import type { PlaceModel } from "../../types/place";

const useStyles = makeStyles({
  container: { display: "grid", rowGap: tokens.spacingVerticalS },
  canvas: {
    height: "25rem",
    width: "100%",
    borderRadius: tokens.borderRadiusMedium,
    // Google renders positioned panes inside this element. Isolate their stacking
    // context so they cannot cover the account menu or other application controls.
    position: "relative",
    isolation: "isolate",
    backgroundColor: tokens.colorNeutralBackground3,
  },
  error: { color: tokens.colorPaletteRedForeground1 },
});

export interface MapViewProps {
  places: readonly PlaceModel[];
  selectedPlaceId?: string;
  onSelect: (placeId: string) => void;
  /** Injected in tests to avoid network requests, API keys, and real billing. */
  loadMaps?: () => Promise<GoogleMapsLibraries>;
}

interface MapMarker {
  marker: google.maps.marker.AdvancedMarkerElement;
  pin: google.maps.marker.PinElement;
  name: string;
  onClick: () => void;
}

interface MapRuntime {
  map: google.maps.Map;
  libraries: GoogleMapsLibraries;
  markers: Map<string, MapMarker>;
}

function removeMarkers(runtime: MapRuntime) {
  for (const { marker, onClick } of runtime.markers.values()) {
    marker.removeEventListener("gmp-click", onClick);
    marker.map = null;
  }
  runtime.markers.clear();
}

/** Same controlled-selection interface as PlaceListView: SearchView owns the ID. */
export function MapView({ places, selectedPlaceId, onSelect, loadMaps = loadGoogleMaps }: MapViewProps) {
  const styles = useStyles();
  const id = useId();
  const canvas = useRef<HTMLDivElement>(null);
  const runtime = useRef<MapRuntime | undefined>(undefined);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  // Marker listeners outlive React renders. Read the latest callback without
  // rebuilding the map each time SearchView updates its detail-loading state.
  const select = useRef(onSelect);
  select.current = onSelect;

  useEffect(() => {
    let disposed = false;
    const element = canvas.current;
    setStatus("loading");
    setError(undefined);
    void loadMaps().then((libraries) => {
      // Loading the external script can finish after unmount or a retry. A stale
      // completion must never attach another map to the same DOM container.
      if (disposed || !element) return;
      const map = new libraries.maps.Map(element, {
        center: { lat: 0, lng: 0 },
        zoom: 2,
        mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID",
        gestureHandling: "cooperative",
        streetViewControl: false,
        mapTypeControl: false,
      });
      runtime.current = { map, libraries, markers: new Map() };
      setStatus("ready");
    }).catch((failure: unknown) => {
      if (disposed) return;
      setError(failure instanceof Error ? failure.message : "Unable to load the map.");
      setStatus("error");
    });
    return () => {
      disposed = true;
      if (runtime.current) {
        removeMarkers(runtime.current);
        runtime.current.libraries.core.event.clearInstanceListeners(runtime.current.map);
        // Google Maps has no destroy method. Detach listeners/markers and release
        // our map reference and generated DOM; the shared script stays loaded.
        runtime.current = undefined;
      }
      element?.replaceChildren();
    };
  }, [loadMaps, attempt]);

  function centerMap() {
    const current = runtime.current;
    if (!current || places.length === 0) return;
    if (places.length === 1) {
      current.map.setCenter({ lat: places[0].latitude, lng: places[0].longitude });
      current.map.setZoom(14);
      return;
    }
    const bounds = new current.libraries.core.LatLngBounds();
    places.forEach((place) => bounds.extend({ lat: place.latitude, lng: place.longitude }));
    current.map.fitBounds(bounds, 48);
    // Coincident locations can otherwise fit to street-level zoom unexpectedly.
    const listener = current.map.addListener("idle", () => {
      if ((current.map.getZoom() ?? 0) > 16) current.map.setZoom(16);
      listener.remove();
    });
  }

  useEffect(() => {
    const current = runtime.current;
    if (status !== "ready" || !current) return;
    removeMarkers(current);
    places.forEach((place) => {
      const pin = new current.libraries.marker.PinElement({ background: "#2563eb", glyphColor: "#ffffff" });
      const marker = new current.libraries.marker.AdvancedMarkerElement({
        map: current.map,
        position: { lat: place.latitude, lng: place.longitude },
        title: place.name,
        // Google's accessible interaction handles keyboard focus and activation.
        gmpClickable: true,
      });
      marker.append(pin);
      const onClick = () => select.current(place.placeId);
      marker.addEventListener("gmp-click", onClick);
      current.markers.set(place.placeId, { marker, pin, name: place.name, onClick });
    });
    // New result sets get their own viewport. Selection changes only pan/highlight
    // an existing marker, preserving user zoom rather than recreating the map.
    centerMap();
    return () => removeMarkers(current);
    // centerMap reads the same places captured by this effect. Changing only
    // onSelect/selectedPlaceId should not rebuild markers or refit the viewport.
  }, [places, status]);

  useEffect(() => {
    const current = runtime.current;
    if (status !== "ready" || !current) return;
    for (const [placeId, { marker, pin, name }] of current.markers) {
      const selected = placeId === selectedPlaceId;
      pin.background = selected ? "#b45309" : "#2563eb";
      pin.scale = selected ? 1.3 : 1;
      marker.zIndex = selected ? 1 : 0;
      marker.title = selected ? `${name} (selected)` : name;
      marker.setAttribute("aria-pressed", String(selected));
      if (selected && marker.position) current.map.panTo(marker.position);
    }
  }, [selectedPlaceId, places, status]);

  return (
    <section className={styles.container} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>Map</h2>
      <p>Select a marker or a place in the list to see its details.</p>
      <Button type="button" disabled={status !== "ready" || places.length === 0} onClick={centerMap}>
        Center map on results
      </Button>
      {status === "loading" && <Spinner label="Loading map…" />}
      {status === "error" && (
        <div role="alert">
          <p className={styles.error}>{error}</p>
          <Button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry map</Button>
        </div>
      )}
      {places.length === 0 && <p>No places to display on the map.</p>}
      <div ref={canvas} className={styles.canvas} role="region" aria-label="Place results map" />
    </section>
  );
}
