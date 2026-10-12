import { apiFetch, ApiError } from "./api-client";
import type { BusinessClaimModel } from "../types/business-claim";
import {
  isClaimId,
  parseBusinessClaimModel,
  parseBusinessClaimModels,
} from "../types/business-claim";

export { ApiError as ClaimApiError };

export interface ClaimApiClient {
  submitClaim(placeId: string): Promise<BusinessClaimModel>;
  getPendingClaims(): Promise<BusinessClaimModel[]>;
  approveClaim(claimId: string): Promise<void>;
  rejectClaim(claimId: string): Promise<void>;
}

function validateClaimId(claimId: string): void {
  if (!isClaimId(claimId)) {
    throw new ApiError(400, "Select a valid business claim before reviewing it.");
  }
}

// The existing API base includes /api. apiFetch reads the current bearer token
// for every request; the backend derives user/admin identity and enforces roles.
export const claimApiClient: ClaimApiClient = {
  submitClaim: async (placeId) => {
    if (typeof placeId !== "string" || !placeId.trim() || placeId.length > 255) {
      throw new ApiError(400, "Select a place with an ID between 1 and 255 characters.");
    }
    const claim = await apiFetch<unknown>("/v1/business-claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId }),
    });
    return parseBusinessClaimModel(claim);
  },
  getPendingClaims: async () => {
    const claims = await apiFetch<unknown>("/v1/business-claims/pending");
    return parseBusinessClaimModels(claims);
  },
  approveClaim: async (claimId) => {
    validateClaimId(claimId);
    await apiFetch<void>(`/v1/business-claims/${encodeURIComponent(claimId)}/approve`, {
      method: "POST",
    });
  },
  rejectClaim: async (claimId) => {
    validateClaimId(claimId);
    await apiFetch<void>(`/v1/business-claims/${encodeURIComponent(claimId)}/reject`, {
      method: "POST",
    });
  },
};
