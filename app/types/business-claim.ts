/** Status names shared with the backend ClaimStatus enum. */
export const CLAIM_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export interface BusinessClaimModel {
  claimId: string;
  userId: string;
  placeId: string;
  status: ClaimStatus;
}

/** BusinessClaimRequest uses camelCase JSON, unlike ReviewResponse. */
export interface BusinessClaimResponse {
  id: string;
  userId: string;
  placeId: string;
  status: ClaimStatus;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isClaimId(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function isBusinessClaimResponse(value: unknown): value is BusinessClaimResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const claim = value as Record<string, unknown>;
  return (
    isClaimId(claim.id) &&
    typeof claim.userId === "string" &&
    uuidPattern.test(claim.userId) &&
    typeof claim.placeId === "string" &&
    claim.placeId.trim().length > 0 &&
    claim.placeId.length <= 255 &&
    CLAIM_STATUSES.some((status) => status === claim.status)
  );
}

export function parseBusinessClaimModel(response: unknown): BusinessClaimModel {
  if (!isBusinessClaimResponse(response)) {
    throw new Error("The server returned an invalid business claim response.");
  }
  return {
    claimId: response.id,
    userId: response.userId,
    placeId: response.placeId,
    status: response.status,
  };
}

export function parseBusinessClaimModels(response: unknown): BusinessClaimModel[] {
  if (!Array.isArray(response)) {
    throw new Error("The server returned an invalid business claim list.");
  }
  return response.map(parseBusinessClaimModel);
}
