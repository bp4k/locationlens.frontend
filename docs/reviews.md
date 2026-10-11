# ReviewView integration

The view uses Fluent UI, the existing protected layout, token storage, and
`apiFetch`. Its HTTP adapter now matches `ReviewController`, `ReviewRequest`,
`ReviewResponse`, and `ApiExceptionHandler` in backend commit
`5fed5f10f36f3b55532c41a5e425fe480d0be3b5`.

## Frontend routes

- `/places/:placeId/reviews`: place reviews and the creation form.
- `/reviews/history`: the signed-in user's history, reachable from Account → My reviews.

Both routes require the existing authenticated session. Arbitrary-user history
is not supported by the backend, so the former `/users/:userId/reviews` route
has been removed. No identity is inferred from email or decoded token claims.

Embed `<ReviewView target={{ kind: "place", placeId }} />` in a place-details
page, or use `target={{ kind: "history" }}` for the current user's history.
The optional `ReviewViewHandle` ref exposes `displayPlaceReviews(placeId)`,
`displayUserReviewHistory()` (no user argument), and
`submitReview(placeId, rating, text)`. They return `Promise<void>` and display
errors in the view. An optional API-client prop supports isolated tests.

## Backend contract

`VITE_APP_API_URL` includes `/api` (for example `http://localhost:8080/api`),
just as for the existing profile endpoint. The adapter passes these paths to
`apiFetch`, which attaches the current bearer token:

| Operation            | Path                              | Response                |
| -------------------- | --------------------------------- | ----------------------- |
| Place reviews        | `GET /v1/reviews/place/{placeId}` | `ReviewResponse[]`      |
| Current-user history | `GET /v1/reviews/history`         | `ReviewResponse[]`      |
| Submit               | `POST /v1/reviews`                | `201`, `ReviewResponse` |

Creation sends `{ "place_id": "Google place ID", "rating": 5, "text": "Great!" }`.
The backend assigns the user from the validated JWT subject. Ratings must be
integer 1–5; text must be nonblank and at most 2,000 characters. Duplicate
user/place reviews return `409`; invalid input returns `400`; invalid token
subjects return `401`. `apiFetch` supports the backend's `{ error, message }`
error body. Existing UI error states preserve drafts after failed submission.

The response contains `review_id`, `place_id`, `rating`, `text`, and `created_at`.
The adapter explicitly converts snake_case fields to the UI's camelCase
`ReviewModel`. The backend omits user ID/display name, so place-review cards
show rating, text, and date without inventing an author. History also shows the
place ID. Empty arrays remain empty states.

Target changes clear drafts and invalidate older reads. Failed submissions
preserve rating/text, duplicate clicks are blocked, and successful creation
adds the mapped response to the current place list. No update/delete operations
or backend changes are included.

## Client guarantees

The three ReviewApiClient operations are asynchronous: creation returns
`Promise<ReviewModel>` and both reads return `Promise<ReviewModel[]>`.
The backend only implements authenticated-user history, so
`getUserReviewHistory()` accepts no user ID. Fetching another user's history
would require a backend endpoint and its authorization rules first.

The client itself validates nonblank place IDs, integer ratings 1–5, and
nonblank review text up to 2,000 characters, even when called outside ReviewView.
Invalid input rejects with `ApiError` status 400 before any HTTP request; the
backend still independently validates incoming requests. Valid text and place
IDs are sent unchanged.

All successful responses are checked at runtime before conversion. Reviews must
contain the backend's string IDs, numeric integer rating, string text, and a
parseable `created_at` timestamp. Reads must return arrays, and every item must
satisfy the review contract. Malformed responses reject rather than producing
partially valid lists, undefined fields, or render-time crashes. Network and
backend HTTP errors continue to propagate through the shared API helper.

## Verification

```sh
npm ci
npm test
npm run typecheck
npm run build
```

HTTP contract tests use exact backend-shaped JSON and the real adapter/shared
fetch helper, verifying URL composition, bearer headers, request bodies,
response mapping, and backend error statuses. A component integration test
renders that wire response and submits through the default client; other tests
cover isolated view behavior, routes, auth guard, and menu navigation. These
use mocked HTTP responses; live Keycloak/database integration is not verified.
