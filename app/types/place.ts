/** Supported categories shared with the backend PlaceType enum. */
export const PLACE_TYPES = [
  "RESTAURANT",
  "BATHROOM",
  "PARK",
  "ATTRACTION",
  "HOTEL",
  "HOSPITAL",
  "OTHER",
] as const;

export type PlaceTypeModel = (typeof PLACE_TYPES)[number];

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

function isCoordinate(value: unknown, limit: number): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) <= limit
  );
}

export function parsePlaceModel(response: unknown): PlaceModel {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    throw new Error("The server returned an invalid place response.");
  }
  const place = response as Record<string, unknown>;
  if (
    typeof place.place_id !== "string" ||
    !place.place_id.trim() ||
    typeof place.name !== "string" ||
    typeof place.address !== "string" ||
    !isCoordinate(place.latitude, 90) ||
    !isCoordinate(place.longitude, 180) ||
    !Array.isArray(place.types) ||
    !place.types.every(
      (type) =>
        typeof type === "string" && PLACE_TYPES.some((known) => known === type),
    )
  ) {
    throw new Error("The server returned an invalid place response.");
  }
  return {
    placeId: place.place_id,
    name: place.name,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    types: [...place.types] as PlaceTypeModel[],
  };
}

export function parsePlaceModels(response: unknown): PlaceModel[] {
  if (!Array.isArray(response)) {
    throw new Error("The server returned an invalid place list.");
  }
  return response.map(parsePlaceModel);
}
