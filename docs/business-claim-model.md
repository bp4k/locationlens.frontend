# BusinessClaimModel

BusinessClaimModel contains claimId and claimantUserId (UUID strings), placeId
(opaque provider string), status (ClaimStatusModel), submittedAt and reviewedAt
(Instant strings or null). ClaimStatusModel permits PENDING, APPROVED and REJECTED,
matching the backend ClaimStatus enum. ClaimStatus remains a compatibility alias.

The current backend BusinessClaimRequest response uses camelCase JSON:

| Backend field | Frontend field |
| ------------- | -------------- |
| id            | claimId        |
| userId        | claimantUserId |
| placeId       | placeId        |
| status        | status         |

BusinessClaim stores createdAt and reviewedAt, but BusinessClaimService.response
omits both from BusinessClaimRequest. The frontend therefore supplies null for both
timestamp fields, rather than inventing submission time or review time. Pending
claims also have no review time in persistence. Actual Instant values can be kept
as strings without losing precision once a backend DTO exposes them; that future
DTO change must also update the parser and contract tests.

No backend change is included. The existing POST submission and GET pending-list
API client both use parseBusinessClaimModel / parseBusinessClaimModels. The admin
view now reads claimantUserId; endpoint paths, request bodies and permissions are
unchanged. The parser validates UUIDs, supported statuses and provider place IDs,
returns a fresh model, and rejects malformed list items rather than partial lists.

Unit tests verify all six fields, all status values, exact wire mapping, unavailable
timestamps, malformed responses and list handling. Existing API and component
integration tests verify submission and admin review behavior with backend-shaped
mocked responses. Live backend integration is not exercised for this change.
