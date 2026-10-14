import { describe, expect, it } from "vitest";
import {
  CLAIM_STATUSES,
  parseBusinessClaimModel,
  parseBusinessClaimModels,
} from "./business-claim";

const response = {
  id: "6a7d1f76-ef09-49ee-a310-25850196740a",
  userId: "a852a1c9-1384-4571-8c53-7eeeb4975329",
  placeId: "provider/place?x=1",
  status: "PENDING",
};

describe("BusinessClaimModel", () => {
  it.each(CLAIM_STATUSES)("parses the backend %s status", (status) => {
    expect(parseBusinessClaimModel({ ...response, status })).toEqual({
      claimId: response.id,
      claimantUserId: response.userId,
      placeId: response.placeId,
      status,
      submittedAt: null,
      reviewedAt: null,
    });
  });

  it("copies the response and preserves opaque place IDs", () => {
    const source = { ...response };
    const parsed = parseBusinessClaimModel(source);
    source.placeId = "modified";
    expect(parsed.placeId).toBe(response.placeId);
    expect(parsed).not.toHaveProperty("id");
  });

  it("does not share the source list", () => {
    const source = [response];
    const parsed = parseBusinessClaimModels(source);
    source.length = 0;
    expect(parsed).toHaveLength(1);
  });
});

describe("BusinessClaimModel backend boundary", () => {
  it("maps claimant identity from the backend userId without retaining wire fields", () => {
    const parsed = parseBusinessClaimModel(response);
    expect(parsed.claimantUserId).toBe(response.userId);
    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("id");
    expect(Object.keys(parsed).sort()).toEqual(
      [
        "claimId",
        "claimantUserId",
        "placeId",
        "status",
        "submittedAt",
        "reviewedAt",
      ].sort(),
    );
  });

  it("represents timestamps absent from the current DTO as null for every status", () => {
    for (const status of CLAIM_STATUSES) {
      expect(parseBusinessClaimModel({ ...response, status })).toMatchObject({
        submittedAt: null,
        reviewedAt: null,
      });
    }
  });

  it.each([
    null,
    [],
    {},
    { ...response, id: "not-a-uuid" },
    { ...response, userId: undefined },
    { ...response, userId: "not-a-uuid" },
    { ...response, claimantUserId: response.userId, userId: undefined },
    { ...response, placeId: " " },
    { ...response, status: "pending" },
    { ...response, status: "UNKNOWN" },
  ])("rejects invalid backend response %j", (value) => {
    expect(() => parseBusinessClaimModel(value)).toThrow(
      "invalid business claim response",
    );
  });

  it("preserves list order, accepts empty results, and rejects malformed lists", () => {
    const second = { ...response, id: "f86ed47b-3fd1-46c9-9404-2162d583976d" };
    expect(
      parseBusinessClaimModels([response, second]).map(
        (claim) => claim.claimId,
      ),
    ).toEqual([response.id, second.id]);
    expect(parseBusinessClaimModels([])).toEqual([]);
    expect(() => parseBusinessClaimModels({ claims: [response] })).toThrow(
      "invalid business claim list",
    );
    expect(() => parseBusinessClaimModels([response, null])).toThrow(
      "invalid business claim response",
    );
  });
});
