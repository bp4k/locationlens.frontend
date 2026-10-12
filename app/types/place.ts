/** Place types from the frontend architecture diagram. */
export const placeTypes = [
  "RESTAURANT",
  "BATHROOM",
  "PARK",
  "ATTRACTION",
  "HOTEL",
  "HOSPITAL",
  "OTHER",
] as const;

export type PlaceTypeModel = (typeof placeTypes)[number];

/** Proposed frontend model; confirm the JSON contract with the backend owner. */
export interface PlaceModel {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  types: PlaceTypeModel[];
}

/** Wire shape in the backend's pending PlaceResponse DTO (commit 4d27a4b). */
export interface PlaceResponse {
  place_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  types: PlaceTypeModel[];
}

export function isPlaceType(value: unknown): value is PlaceTypeModel {
  return placeTypes.some((type) => type === value);
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
