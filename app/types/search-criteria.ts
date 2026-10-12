import type { PlaceTypeModel } from "./place";

/** Proposed search input: use location text or a complete coordinate pair. */
export interface SearchCriteriaModel {
  locationText?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters: number;
  /** Omit to search all place types. */
  placeType?: PlaceTypeModel;
}
