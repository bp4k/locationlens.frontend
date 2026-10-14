import { apiFetch, ApiError } from "./api-client";
import type { PlaceModel } from "../types/place";
import {
  parsePlaceModel,
  parsePlaceModels,
} from "../types/place";
import {
  SearchCriteriaModel,
  type SearchCriteriaInput,
} from "../types/search-criteria";

export { ApiError as PlaceApiError };

export interface PlaceApiClient {
  search(criteria: SearchCriteriaInput): Promise<PlaceModel[]>;
  getPlaceDetails(placeId: string): Promise<PlaceModel>;
}

// The existing API base already includes /api and apiFetch supplies bearer auth.
export const placeApiClient: PlaceApiClient = {
  search: async (criteria) => {
    const model = new SearchCriteriaModel(criteria);
    const error = model.getValidationError();
    if (error) throw new ApiError(400, error);
    const params = new URLSearchParams();
    const locationText = model.locationText?.trim();
    if (locationText) params.set("location_text", locationText);
    // Checking undefined keeps legitimate coordinates such as latitude 0.
    if (model.latitude !== undefined)
      params.set("latitude", String(model.latitude));
    if (model.longitude !== undefined)
      params.set("longitude", String(model.longitude));
    params.set("radius_meters", String(model.radiusMeters));
    if (model.placeType !== undefined)
      params.set("place_type", model.placeType);
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
