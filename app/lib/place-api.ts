import { apiFetch, ApiError } from "./api-client";
import type { PlaceModel } from "../types/place";
import {
  isLatitude,
  isLongitude,
  isPlaceType,
  parsePlaceModel,
  parsePlaceModels,
} from "../types/place";
import type { SearchCriteriaModel } from "../types/search-criteria";

export { ApiError as PlaceApiError };

function validateSearch(criteria: SearchCriteriaModel): void {
  const hasCoordinates =
    criteria.latitude !== undefined || criteria.longitude !== undefined;
  if (
    hasCoordinates &&
    (!isLatitude(criteria.latitude) || !isLongitude(criteria.longitude))
  ) {
    throw new ApiError(400, "Enter a valid latitude and longitude together.");
  }
  if (!criteria.locationText?.trim() && !hasCoordinates) {
    throw new ApiError(
      400,
      "Enter a location or provide coordinates before searching.",
    );
  }
  if (!Number.isSafeInteger(criteria.radiusMeters) || criteria.radiusMeters <= 0) {
    throw new ApiError(
      400,
      "Enter a positive whole-number search radius in meters.",
    );
  }
  if (criteria.placeType !== undefined && !isPlaceType(criteria.placeType)) {
    throw new ApiError(400, "Choose a supported place type.");
  }
}

export interface PlaceApiClient {
  search(criteria: SearchCriteriaModel): Promise<PlaceModel[]>;
  getPlaceDetails(placeId: string): Promise<PlaceModel>;
}

// Proposed routes pending PlaceController implementation; see docs/places.md.
// The existing API base already includes /api and apiFetch supplies bearer auth.
export const placeApiClient: PlaceApiClient = {
  search: async (criteria) => {
    validateSearch(criteria);
    const params = new URLSearchParams();
    const locationText = criteria.locationText?.trim();
    if (locationText) params.set("location_text", locationText);
    // Checking undefined keeps legitimate coordinates such as latitude 0.
    if (criteria.latitude !== undefined)
      params.set("latitude", String(criteria.latitude));
    if (criteria.longitude !== undefined)
      params.set("longitude", String(criteria.longitude));
    params.set("radius_meters", String(criteria.radiusMeters));
    if (criteria.placeType !== undefined)
      params.set("place_type", criteria.placeType);
    const places = await apiFetch<unknown>(`/v1/places/search?${params}`);
    return parsePlaceModels(places);
  },
  getPlaceDetails: async (placeId) => {
    if (!placeId.trim()) {
      throw new ApiError(400, "Select a place before requesting its details.");
    }
    // Place IDs are provider strings, not UUIDs; encode reserved URL characters.
    const place = await apiFetch<unknown>(`/v1/places/${encodeURIComponent(placeId)}`);
    return parsePlaceModel(place);
  },
};
