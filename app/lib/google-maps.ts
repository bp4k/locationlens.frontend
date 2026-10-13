import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

export interface GoogleMapsLibraries {
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  core: google.maps.CoreLibrary;
}

let configured = false;

/** Load only rendering libraries; place searches remain behind PlaceApiClient. */
export async function loadGoogleMaps(): Promise<GoogleMapsLibraries> {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    throw new Error("The map is not configured yet. You can still select places from the list.");
  }
  // Google's loader is a page-wide singleton. Configure it once, even when React
  // remounts MapView or users run another search. Vite env changes need a restart.
  if (!configured) {
    setOptions({ key, v: "weekly" });
    configured = true;
  }
  const [maps, marker, core] = await Promise.all([
    importLibrary("maps"),
    importLibrary("marker"),
    importLibrary("core"),
  ]);
  return { maps, marker, core };
}
