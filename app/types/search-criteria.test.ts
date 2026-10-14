import { describe, expect, it } from "vitest";
import { PLACE_TYPES, PlaceTypeModel } from "./place";
import {
  SearchCriteriaModel,
  type SearchCriteriaInput,
} from "./search-criteria";

const text = { locationText: "Atlanta", radiusMeters: 1000 };

describe("SearchCriteriaModel value object", () => {
  it("stores all five attributes and provides boolean validation behavior", () => {
    const criteria = new SearchCriteriaModel({
      ...text,
      latitude: 33.775,
      longitude: -84.396,
      placeType: PlaceTypeModel.PARK,
    });
    expect(criteria).toMatchObject({
      ...text,
      latitude: 33.775,
      longitude: -84.396,
      placeType: PlaceTypeModel.PARK,
    });
    // Both location modes are retained as input, but rejected as ambiguous.
    expect(criteria.isValid()).toBe(false);
    expect(Object.keys(criteria)).not.toContain("isValid");
  });
  it.each([
    text,
    { ...text, locationText: "  Atlanta  " },
    { latitude: 0, longitude: 0, radiusMeters: 1 },
    { latitude: -90, longitude: 180, radiusMeters: 50_000 },
    { latitude: 90, longitude: -180, radiusMeters: 500 },
    { latitude: 33.123456789, longitude: -84.987654321, radiusMeters: 1000 },
    { locationText: "", latitude: 0, longitude: 0, radiusMeters: 1000 },
  ])("accepts valid criteria %j", (input) => {
    expect(new SearchCriteriaModel(input).isValid()).toBe(true);
  });
  it.each(PLACE_TYPES)("accepts supported place type %s", (placeType) => {
    expect(new SearchCriteriaModel({ ...text, placeType }).isValid()).toBe(
      true,
    );
  });
  it.each([
    { radiusMeters: 1000 },
    { ...text, locationText: " " },
    { ...text, locationText: null },
    { ...text, locationText: 123 },
    { ...text, latitude: 0 },
    { ...text, longitude: 0 },
    { ...text, latitude: 91, longitude: 0 },
    { ...text, latitude: 0, longitude: -181 },
    { ...text, latitude: NaN, longitude: 0 },
    { ...text, latitude: 0, longitude: Infinity },
    { ...text, latitude: "0", longitude: 0 },
    { ...text, radiusMeters: 0 },
    { ...text, radiusMeters: -1 },
    { ...text, radiusMeters: 1.5 },
    { ...text, radiusMeters: NaN },
    { ...text, radiusMeters: Infinity },
    { ...text, radiusMeters: "1000" },
    { ...text, radiusMeters: 2_147_483_648 },
    { ...text, radiusMeters: 50_001 },
    { ...text, latitude: 0, longitude: 0 },
    { ...text, locationText: "a".repeat(501) },
    { ...text, placeType: "UNKNOWN" },
    { ...text, placeType: null },
  ])("returns false for invalid values %j without throwing", (input) => {
    const criteria = new SearchCriteriaModel(input as SearchCriteriaInput);
    expect(criteria.isValid()).toBe(false);
    expect(criteria.getValidationError()).toEqual(expect.any(String));
  });
  it("copies input and freezes the instance, so later edits cannot change its value", () => {
    const source = { ...text };
    const criteria = new SearchCriteriaModel(source);
    source.locationText = "Decatur";
    expect(criteria.locationText).toBe("Atlanta");
    expect(Object.isFrozen(criteria)).toBe(true);
    expect(Reflect.set(criteria, "radiusMeters", 0)).toBe(false);
    expect(criteria.isValid()).toBe(true);
  });
  it("compares values rather than object identity and detects each changed attribute", () => {
    const values = {
      ...text,
      latitude: 0,
      longitude: 0,
      placeType: PlaceTypeModel.PARK,
    };
    const criteria = new SearchCriteriaModel(values);
    expect(criteria.equals(new SearchCriteriaModel(values))).toBe(true);
    for (const changed of [
      { locationText: "Decatur" },
      { latitude: 1 },
      { longitude: 1 },
      { radiusMeters: 500 },
      { placeType: PlaceTypeModel.OTHER },
    ]) {
      expect(
        criteria.equals(new SearchCriteriaModel({ ...values, ...changed })),
      ).toBe(false);
    }
  });
});
