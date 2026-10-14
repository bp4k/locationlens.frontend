import {
  isLatitude,
  isLongitude,
  isPlaceType,
  type PlaceTypeModel,
} from "./place";

/** Text or a complete coordinate pair identifies the search location. */
export interface SearchCriteriaInput {
  locationText?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters: number;
  /** Omit to search all place types. */
  placeType?: PlaceTypeModel;
}

/** Immutable search value; invalid values can be represented and checked by isValid(). */
export class SearchCriteriaModel implements SearchCriteriaInput {
  readonly locationText?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly radiusMeters: number;
  readonly placeType?: PlaceTypeModel;

  constructor(input: SearchCriteriaInput) {
    this.locationText = input.locationText;
    this.latitude = input.latitude;
    this.longitude = input.longitude;
    this.radiusMeters = input.radiusMeters;
    this.placeType = input.placeType;
    Object.freeze(this);
  }

  isValid(): boolean {
    return this.getValidationError() === undefined;
  }

  /** Shared with the API client so its existing useful error messages are retained. */
  getValidationError(): string | undefined {
    const hasCoordinates =
      this.latitude !== undefined || this.longitude !== undefined;
    if (
      hasCoordinates &&
      (!isLatitude(this.latitude) || !isLongitude(this.longitude))
    ) {
      return "Enter a valid latitude and longitude together.";
    }
    if (
      this.locationText !== undefined &&
      typeof this.locationText !== "string"
    ) {
      return "Enter a location or provide coordinates before searching.";
    }
    if (!this.locationText?.trim() && !hasCoordinates) {
      return "Enter a location or provide coordinates before searching.";
    }
    if (this.locationText?.trim() && hasCoordinates) {
      return "Enter either a location or coordinates, not both.";
    }
    if (this.locationText && this.locationText.length > 500) {
      return "Enter a location of at most 500 characters.";
    }
    // Google Nearby Search accepts a radius of at most 50 km.
    if (
      !Number.isInteger(this.radiusMeters) ||
      this.radiusMeters <= 0 ||
      this.radiusMeters > 50_000
    ) {
      return "Enter a positive whole-number search radius in meters (at most 50000).";
    }
    if (this.placeType !== undefined && !isPlaceType(this.placeType)) {
      return "Choose a supported place type.";
    }
    return undefined;
  }

  /** Equality uses the five values rather than object identity. */
  equals(other: SearchCriteriaModel): boolean {
    return (
      this.locationText === other.locationText &&
      this.latitude === other.latitude &&
      this.longitude === other.longitude &&
      this.radiusMeters === other.radiusMeters &&
      this.placeType === other.placeType
    );
  }
}
