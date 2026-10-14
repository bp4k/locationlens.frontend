# Place views and current API contract

SearchView coordinates submitted criteria, search results and selected-place
details. PlaceListView and MapView receive the same places/selected ID and report
selection through callbacks. PlaceDetailsView displays fetched data and integrates
the existing ReviewView and ClaimView (inline when no navigation override is given).

PlaceApiClient calls current backend endpoints `GET /api/v1/places/search` and
`GET /api/v1/places/{encodedPlaceId}`. Its shared API base includes `/api`, so
paths passed to apiFetch start `/v1`. Search uses `location_text` or a complete
coordinate pair, `radius_meters` (1–50,000), and optional uppercase `place_type`.
The backend now implements these routes and live Google Places integration;
earlier proposed-contract documentation is superseded.

Place response fields are `place_id`, `name`, `address`, `latitude`, `longitude`,
`types`. Runtime validation maps `place_id` to frontend `placeId` and rejects
malformed responses. IDs are provider strings, not UUIDs.

Search states are idle/loading/ready/error. Filtering and retry reuse last
submitted criteria. Request counters ignore out-of-order results; a new search
clears selection. Both map and list use the same selection handler to fetch details.
Safe reads/maps have 10-second deadlines; SDK completions after disposal are ignored.

Google Maps is rendering-only; backend adapters perform search/details. MapView
loads libraries once per page through the shared loader, updates markers for new
results, and highlights/pans selection without rebuilding the map. Effects clean
up markers/listeners. A failed map leaves the text list available.

Reviews mount on first opening; hiding preserves a draft. Switching the keyed
place details resets panels/drafts. A claim button opens ClaimView or delegates
to `onOpenClaim`; opening it does not itself submit a claim.

See [installation/run guide](install.md), backend [API reference](https://github.com/bp4k/locationlens/blob/master/docs/api.md), and corresponding component/client tests.
