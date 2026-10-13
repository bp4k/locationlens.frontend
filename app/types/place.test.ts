import { describe, expect, it } from "vitest";
import { PlaceTypeModel, isPlaceType, PLACE_TYPES, parsePlaceModel, parsePlaceModels } from "./place";

const response = {
  place_id: "ChIJ/place?123",
  name: "City Park",
  address: "1 Main St",
  latitude: 40.123456789,
  longitude: -73.987654321,
  types: ["PARK", "ATTRACTION"],
};

describe("PlaceModel backend contract", () => {
  it("maps all six fields without losing coordinate precision or opaque IDs", () => {
    expect(parsePlaceModel(response)).toEqual({
      placeId: response.place_id,
      name: response.name,
      address: response.address,
      latitude: response.latitude,
      longitude: response.longitude,
      types: response.types,
    });
  });
  it.each(PLACE_TYPES)("accepts the backend category %s", (type) => {
    expect(parsePlaceModel({ ...response, types: [type] }).types).toEqual([
      type,
    ]);
  });
  it("supports empty categories, empty address, and geographic boundaries", () => {
    expect(
      parsePlaceModel({
        ...response,
        address: "",
        types: [],
        latitude: -90,
        longitude: 180,
      }),
    ).toMatchObject({ address: "", types: [], latitude: -90, longitude: 180 });
  });
  it("copies the category array instead of retaining mutable source data", () => {
    const source = { ...response, types: ["PARK"] };
    const model = parsePlaceModel(source);
    source.types.push("OTHER");
    expect(model.types).toEqual(["PARK"]);
  });
  it.each([
    null,
    [],
    {},
    { ...response, place_id: " " },
    { ...response, name: null },
    { ...response, address: null },
    { ...response, latitude: "40" },
    { ...response, latitude: NaN },
    { ...response, latitude: 91 },
    { ...response, longitude: Infinity },
    { ...response, longitude: -181 },
    { ...response, types: null },
    { ...response, types: ["UNKNOWN"] },
    { ...response, types: [null] },
  ])("rejects malformed place %j", (value) => {
    expect(() => parsePlaceModel(value)).toThrow("invalid place response");
  });
  it("preserves list order and accepts empty results", () => {
    const second = { ...response, place_id: "second" };
    expect(parsePlaceModels([response, second]).map((p) => p.placeId)).toEqual([
      response.place_id,
      "second",
    ]);
    expect(parsePlaceModels([])).toEqual([]);
  });
  it("rejects invalid lists and malformed items", () => {
    expect(() => parsePlaceModels({ places: [response] })).toThrow(
      "invalid place list",
    );
    expect(() => parsePlaceModels([response, null])).toThrow(
      "invalid place response",
    );
  });
});

describe("PlaceTypeModel enumeration", () => {
  it("exposes exactly the seven backend values at runtime", () => {
    expect(Object.values(PlaceTypeModel)).toEqual([
      "RESTAURANT", "BATHROOM", "PARK", "ATTRACTION", "HOTEL", "HOSPITAL", "OTHER",
    ]);
    expect(PLACE_TYPES).toEqual(Object.values(PlaceTypeModel));
  });
  it.each(["park", "UNKNOWN", "", null, undefined, 0, {}])(
    "rejects unsupported category %j", (value) => {
      expect(isPlaceType(value)).toBe(false);
    },
  );
});
