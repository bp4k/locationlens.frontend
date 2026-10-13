/** Supported categories shared with the backend PlaceType enum. */
export enum PlaceTypeModel {
  RESTAURANT = "RESTAURANT",
  BATHROOM = "BATHROOM",
  PARK = "PARK",
  ATTRACTION = "ATTRACTION",
  HOTEL = "HOTEL",
  HOSPITAL = "HOSPITAL",
  OTHER = "OTHER",
}

export const PLACE_TYPES: readonly PlaceTypeModel[] = Object.freeze(
  Object.values(PlaceTypeModel),
);

/** Place IDs are opaque strings; Java Doubles are represented as JS numbers. */
export interface PlaceModel {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  types: PlaceTypeModel[];
}

/** Backend PlaceResponse JSON contract. */
export interface PlaceResponse {
  place_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  types: PlaceTypeModel[];
}

export function isPlaceType(value: unknown): value is PlaceTypeModel {
  return PLACE_TYPES.some((type) => type === value);
}

/** Coordinates use decimal degrees, including zero and fractional values. */
export function isLatitude(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) <= 90
  );
}

export function isLongitude(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) <= 180
  );
}

function isPlaceResponse(value: unknown): value is PlaceResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const place = value as Record<string, unknown>;
  return (
    typeof place.place_id === "string" &&
    place.place_id.trim().length > 0 &&
    typeof place.name === "string" &&
    place.name.trim().length > 0 &&
    typeof place.address === "string" &&
    isLatitude(place.latitude) &&
    isLongitude(place.longitude) &&
    Array.isArray(place.types) &&
    place.types.every(isPlaceType)
  );
}

export function parsePlaceModel(response: unknown): PlaceModel {
  if (!isPlaceResponse(response)) {
    throw new Error("The server returned an invalid place response.");
  }
  return {
    placeId: response.place_id,
    name: response.name,
    address: response.address,
    latitude: response.latitude,
    longitude: response.longitude,
    // Do not let a caller mutate the response's category array through the model.
    types: [...response.types],
  };
}

export function parsePlaceModels(response: unknown): PlaceModel[] {
  if (!Array.isArray(response)) {
    throw new Error("The server returned an invalid place list.");
  }
  return response.map(parsePlaceModel);
}
