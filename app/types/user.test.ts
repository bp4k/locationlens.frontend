import { describe, expect, it } from "vitest";
import { parseUserModel } from "./user";

const userId = "a852a1c9-1384-4571-8c53-7eeeb4975329";
const profile = {
  first_name: "Albert",
  last_name: "Zheng",
  email: "albert@example.com",
};

describe("UserModel", () => {
  it("maps the backend profile and UUID subject to all four model fields", () => {
    expect(parseUserModel(profile, { sub: userId })).toEqual({
      userId,
      email: profile.email,
      displayName: "Albert Zheng",
      administrator: false,
      first_name: "Albert",
      last_name: "Zheng",
    });
  });
  it("combines trimmed Unicode names while preserving the original profile fields", () => {
    const parsed = parseUserModel(
      { ...profile, first_name: "  艾伯特  ", last_name: " 郑 " },
      { sub: userId },
    );
    expect(parsed.displayName).toBe("艾伯特 郑");
    expect(parsed.first_name).toBe("  艾伯特  ");
  });
  it("supports null OIDC profile claims without manufacturing a name or email", () => {
    expect(
      parseUserModel(
        { first_name: null, last_name: null, email: null },
        { sub: userId },
      ),
    ).toMatchObject({
      displayName: "",
      email: "",
      first_name: "",
      last_name: "",
    });
    expect(
      parseUserModel({ ...profile, last_name: null }, { sub: userId })
        .displayName,
    ).toBe("Albert");
  });
  it.each([
    [{ roles: ["admin"] }, true],
    [{ roles: ["user", "admin"] }, true],
    [{ roles: ["administrator", "ADMIN"] }, false],
    [{ roles: "admin" }, false],
    [{ roles: [] }, false],
    [null, false],
  ])(
    "uses the exact realm admin role from the backend's claim convention",
    (realmAccess, expected) => {
      expect(
        parseUserModel(profile, { sub: userId, realm_access: realmAccess })
          .administrator,
      ).toBe(expected);
    },
  );
  it("ignores profile-supplied identity and administrator flags", () => {
    expect(
      parseUserModel(
        { ...profile, userId: "other", administrator: true },
        { sub: userId, resource_access: { client: { roles: ["admin"] } } },
      ),
    ).toMatchObject({ userId, administrator: false });
  });
  it.each([
    null,
    [],
    {},
    { ...profile, email: 123 },
    { ...profile, first_name: [] },
    { ...profile, last_name: undefined },
  ])("rejects invalid profile %j", (value) => {
    expect(() => parseUserModel(value, { sub: userId })).toThrow(
      "invalid user response",
    );
  });
  it.each([null, [], {}, { sub: "not-a-uuid" }, { sub: 123 }])(
    "rejects missing or invalid UUID identity %j",
    (claims) => {
      expect(() => parseUserModel(profile, claims)).toThrow("valid user UUID");
    },
  );
});
