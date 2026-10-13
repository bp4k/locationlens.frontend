/** Status names shared with the backend ClaimStatus enum. */
export const CLAIM_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ClaimStatusModel = (typeof CLAIM_STATUSES)[number];
/** Compatibility name for existing consumers. */
export type ClaimStatus = ClaimStatusModel;

/** Public frontend claim data; UUIDs and available Instants use strings. */
export interface BusinessClaimModel {
  claimId: string;
  claimantUserId: string;
  placeId: string;
  status: ClaimStatusModel;
  /** Instant string; null until the backend exposes its createdAt timestamp. */
  submittedAt: string | null;
  /** Null for pending claims or when omitted by the backend DTO. */
  reviewedAt: string | null;
}

/** BusinessClaimRequest uses camelCase JSON, unlike ReviewResponse. */
export interface BusinessClaimResponse {
  id: string;
  userId: string;
  placeId: string;
  status: ClaimStatusModel;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isClaimId(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function isBusinessClaimResponse(
  value: unknown,
): value is BusinessClaimResponse {
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
    claimantUserId: response.userId,
    placeId: response.placeId,
    status: response.status,
    // BusinessClaimRequest does not expose entity createdAt/reviewedAt.
    submittedAt: null,
    reviewedAt: null,
  };
}

export function parseBusinessClaimModels(
  response: unknown,
): BusinessClaimModel[] {
  if (!Array.isArray(response)) {
    throw new Error("The server returned an invalid business claim list.");
  }
  return response.map(parseBusinessClaimModel);
}
