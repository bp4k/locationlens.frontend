# ReviewView integration

`app/components/reviews/review-view.tsx` implements the three ReviewView
operations from the class diagram. It uses the existing Fluent UI provider,
React Router protected layout, token storage, environment configuration, and
shared `apiFetch` helper. No alternate frontend scaffold or login flow is added.

## Routes

- `/places/:placeId/reviews`: reviews and a submission form for the selected place.
- `/users/:userId/reviews`: a user's review history, including each place ID.

Both routes sit inside the existing protected layout. Until search/place-details
and user navigation are implemented, they can be reached by a direct URL once
signed in. The current `/v1/me` response has names/email but no local user UUID,
so this PR does not guess a user ID from email or the Keycloak subject.

PlaceDetailsView can also embed the view directly:

```tsx
import { ReviewView } from "../components/reviews/review-view";

<ReviewView target={{ kind: "place", placeId }} />;
```

For user history, use `target={{ kind: "user", userId }}`. An optional
`apiClient` prop allows isolated component tests. Without it, the view uses the
shared HTTP review client.

The view exposes these operations through a React ref typed as
`ReviewViewHandle`:

- `displayPlaceReviews(placeId)`
- `displayUserReviewHistory(userId)`
- `submitReview(placeId, rating, text)`

They return `Promise<void>` so callers can await completion; errors are displayed
in the view. Target changes clear the previous draft. Failed submissions preserve
rating/text, repeated clicks do not send duplicate requests, and stale reads
cannot overwrite a new selection or successful submission. Review text is
rendered as text, including markup-looking input.

## Proposed review API contract

The diagram defines models/operations but does not specify URLs, and the backend
checkout inspected for this work has no review endpoints yet. Coordinate these
routes with the backend owner before live integration:

| Operation     | Path passed to apiFetch                                 | Response              |
| ------------- | ------------------------------------------------------- | --------------------- |
| Place reviews | `GET /v1/places/{placeId}/reviews`                      | `ReviewModel[]`       |
| User history  | `GET /v1/users/{userId}/reviews`                        | `ReviewModel[]`       |
| Submit        | `POST /v1/places/{placeId}/reviews`, `{ rating, text }` | Created `ReviewModel` |

The existing `VITE_APP_API_URL` supplies the API base, for example
`http://localhost:8080/api`. The client does not add a second `/api` prefix.
`apiFetch` retrieves the current token from the existing token storage on every
request and attaches `Authorization: Bearer <token>` as before.

`ReviewModel` follows the diagram: `reviewId`, `rating`, `text`, `createdAt`,
`userId`, and `placeId`. UUIDs and ISO-8601 timestamps are JSON strings. Authors
and places currently display their IDs because the model has no display names.
The backend must assign the author from validated identity, not accept a user ID
from the submission body.

The UI validates integer ratings 1–5 and nonblank text of at most 2,000 characters
before trimming. These are proposed rules that must also be enforced by the
backend. A `409` response is shown as an existing-review conflict; the backend
owner must establish the duplicate policy. The shared helper now exposes an
`ApiError` with HTTP status and supports both `{ error, message }` and Problem
Detail responses; existing callers that catch generic Errors remain compatible.

This PR includes no backend endpoints, mocked production data, update/delete
operations, or database changes. A missing backend endpoint produces a visible
error with retry instead of appearing to save data successfully.

## Verify

```sh
npm ci
npm test
npm run typecheck
npm run build
```

Tests cover the view's three public operations, validation, failure/success
states, stale requests, API paths/JSON bodies/bearer headers, and route integration
including the existing signed-out route guard. Tests use isolated in-memory token
storage; they need no Keycloak server or database. Live integration remains
pending the review backend endpoints.
