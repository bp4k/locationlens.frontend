/** Place types from the frontend architecture diagram. */
export type PlaceTypeModel =
  | "RESTAURANT"
  | "BATHROOM"
  | "PARK"
  | "ATTRACTION"
  | "HOTEL"
  | "HOSPITAL"
  | "OTHER";

/** Proposed frontend model; confirm the JSON contract with the backend owner. */
export interface PlaceModel {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  types: PlaceTypeModel[];
}
