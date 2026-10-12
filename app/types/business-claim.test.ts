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
      userId: response.userId,
      placeId: response.placeId,
      status,
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
