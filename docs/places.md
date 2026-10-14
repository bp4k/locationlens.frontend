# PlaceListView

`app/components/places/place-list-view.tsx` displays place names, addresses, and
readable place types. Each result is a keyboard-accessible button. The selected
result is highlighted and exposed through `aria-pressed`. An empty array shows
an empty-results message.

The future SearchView should own the results and selected place ID:

```tsx
<PlaceListView
  places={places}
  selectedPlaceId={selectedPlaceId}
  onSelect={setSelectedPlaceId}
/>
```

Pass the same selected ID to MapView and PlaceDetailsView. This implements the
diagram's display/select/highlight operations through React props: `places`
displays results, `onSelect(placeId)` reports selection, and `selectedPlaceId`
highlights the selection whether it came from the list or map.

`app/types/place.ts` follows the frontend diagram's PlaceModel and PlaceTypeModel.
Coordinate this shared type with Albert and confirm field names and enum values
with the backend owner before connecting PlaceApiClient.

This component makes no API calls. SearchView handles loading and service errors
and renders the list once results are available on the protected home page.

## PlaceDetailsView

`app/components/places/place-details-view.tsx` uses the same typed-prop and Fluent
UI styling pattern as PlaceListView. It displays a supplied place's name,
address, and readable types, or a prompt when there is no selection. The two
views share the labels in `place-type-labels.ts`.

SearchView can connect the components using its existing selected place ID:

```tsx
const selectedPlace = places.find((place) => place.placeId === selectedPlaceId);

<PlaceDetailsView
  place={selectedPlace}
  onOpenClaim={openClaimForm}
/>;
```

The review button mounts the existing ReviewView for the selected place on first
opening. Hiding/reopening reviews preserves the current draft without fetching
again. Selecting another place (or clearing the selection) unmounts the previous
review view, resets the panel and draft, and lets ReviewView ignore late responses.
An optional `apiClient` prop is passed through to ReviewView for isolated tests;
otherwise its existing authenticated HTTP client is used.

`onOpenClaim(placeId)` implements the diagram's open-claim action by delegating
to the parent. Omit it until a real claim screen is available; the claim button
is then hidden. Opening this action does not submit a claim.

PlaceDetailsView does not fetch place details or add routes. SearchView and
PlaceApiClient supply its data, and the claim owner will supply the claim
form. The diagram's display/open-review/open-claim operations are represented
by the `place` prop, review button, and claim callback respectively.

## PlaceApiClient (proposed HTTP contract)

`app/lib/place-api.ts` follows ReviewApiClient: asynchronous operations, input
validation with `ApiError` status 400, shared authenticated `apiFetch`, and
runtime response parsing in the model file. Both operations return camelCase
PlaceModel data for the existing list and details views.

**No place endpoints exist in backend master as inspected at commit 89333cd.**
The pending backend branch `codex/place-review-contracts`, commit 4d27a4b,
defines PlaceResponse and PlaceType, but implements no place controller.
The URLs and search rules below are proposed and need agreement with Aaron
before live integration. Tests verify this proposed contract using mocked HTTP;
they do not demonstrate a working backend/provider integration.

| Operation | Proposed path passed to apiFetch | Response |
| --- | --- | --- |
| search(criteria) | GET /v1/places/search | PlaceResponse[] |
| getPlaceDetails(placeId) | GET /v1/places/{encodedPlaceId} | PlaceResponse |

The API base already includes `/api`. Search uses URL-encoded query parameters:

- `location_text`: optional trimmed location text.
- `latitude` and `longitude`: optional complete coordinate pair in decimal degrees.
- `radius_meters`: required positive integer in meters, at most 2,147,483,647 (Java Integer).
- `place_type`: optional PlaceTypeModel enum name; omit for all types.

Supply nonblank location text or a valid coordinate pair. If coordinates are
provided, both must be valid even when text is also supplied. Latitude is within
[-90, 90], longitude within [-180, 180], including zero. Backend precedence when
both text and coordinates are supplied, maximum radius, and provider behavior
remain to be agreed. These local checks do not replace backend validation.

Example input:

```ts
await placeApiClient.search({
  latitude: 33.775,
  longitude: -84.396,
  radiusMeters: 1000,
  placeType: "PARK",
});
```

The pending PlaceResponse JSON contains `place_id`, `name`, `address`,
`latitude`, `longitude`, and `types`. `parsePlaceModel` checks nonblank IDs/names,
string addresses, finite geographic coordinates, and supported category arrays.
It maps `place_id` to `placeId` and copies the types array. Empty category/result
arrays are supported; any malformed item rejects the whole search result.
Provider place IDs are strings, not UUIDs, and reserved path characters are
encoded. Network and HTTP errors propagate through the existing API helper.

No production mock data or new routes are added. SearchView connects this client
to PlaceListView and PlaceDetailsView on the existing home route.

## SearchView

`app/components/places/search-view.tsx` follows the existing views: exported typed
props, Fluent UI styles/tokens, injected API clients for tests, and explicit
loading/error/empty states. The protected `/` home route now renders SearchView.
No request runs automatically on mount.

Choose location text or coordinates, enter a radius in meters (default 1000),
and submit Search. Numeric fields remain strings until submission so a blank
coordinate cannot silently become zero. Coordinates must form a valid pair;
zero and decimal coordinates are supported. Only the chosen location mode is
sent, avoiding the proposed backend's unresolved text/coordinate precedence.

Selecting a type or pressing Clear filter reruns the last submitted search with
the new type (or all types). Before the first submission, these actions only
set the upcoming search's filter. Editing a location/radius does not change the
active search until Search is submitted. Filtering uses the backend rather than
discarding results locally. Search retry also uses the last submitted criteria.

Selecting a result highlights it and calls getPlaceDetails. Successful details
are passed to PlaceDetailsView, which owns opening reviews. Errors retain the
selected ID so Retry details requests that place again. A new search/filter
clears selection and unmounts any old review panel. Search/detail sequence
counters ignore obsolete responses and failures, including after unmount; they
do not cancel network requests. Both panels use the same selection state so a
MapView shares the list's selection handler.

Optional `reviewApiClient` and `onOpenClaim` props pass through to PlaceDetailsView.
The home page supplies neither: reviews use the existing default client and the
claim action stays hidden until a real claim form is connected. No production
fixture data is included.

The place HTTP contract remains proposed. Missing backend endpoints show errors
and retry controls, not sample results. Tests cover form validation, coordinates,
filters, list/detail/review integration, retries, empty results, stale responses,
the route guard, and the default client's authenticated request/response mapping.

Run `npm test`, `npm run typecheck`, and `npm run build` to verify.

## MapView (Google Maps JavaScript API)

`app/components/places/map-view.tsx` uses the same controlled props as the list:
`places`, `selectedPlaceId`, and `onSelect(placeId)`. SearchView renders it above
the list/details panels once a search finishes. Marker and list selections both
load details through the existing client; selection remains owned by SearchView.

The slides require an interactive map alongside text results. This implementation
uses Google Maps as requested by the team. Google Places search stays in the
backend; the browser map does not fetch an independent set of places.

### Local setup

Add to your untracked `.env`, then restart the Vite server:

```dotenv
VITE_GOOGLE_MAPS_API_KEY=your_browser_maps_key
VITE_GOOGLE_MAPS_MAP_ID=your_map_id
```

Enable Maps JavaScript API on the team's Google Cloud project and configure a
browser key restricted to the application's HTTP referrers and that API. This
key is included in the browser build, so use a browser key rather than reusing a
server Places credential. Google Maps requires billing on the project. Advanced
markers require a map ID; Google's DEMO_MAP_ID is the fallback for development,
but configure a real map ID for deployment.

See [Google's advanced-marker setup](https://developers.google.com/maps/documentation/javascript/advanced-markers/start)
and [API-key setup](https://developers.google.com/maps/documentation/javascript/get-api-key).

### Rendering and lifecycle

The official `@googlemaps/js-api-loader` imports maps, marker, and core libraries
on demand. `app/lib/google-maps.ts` configures the page-wide loader once. MapView
creates the map after loading completes and ignores late completion after
unmount/retry. There is no Google script in the server-rendered HTML.

New results replace markers and fit the viewport; a single result centers at
zoom 14, and fitting multiple results caps zoom at 16. Center map on results
restores that viewport after manual panning. Selection pans to the selected
marker and changes its color, scale, stacking order, title, and aria-pressed
state without recreating the map. Google's gmpClickable advanced markers support
keyboard interaction. Place names are passed as text titles, not injected HTML.

The latest onSelect callback is read through a ref so marker listeners remain
current without rebuilding on every details update. Cleanup detaches marker
listeners/maps, clears map listeners and generated DOM, and releases references.
The shared SDK script remains loaded for the next search. An empty result set
shows a message and disables centering rather than constructing empty bounds.

Missing configuration and loader failures show an error and retry control. The
list/details remain available when the map is unavailable. Google credential,
billing, or quota diagnostics may also appear in the browser console.

Tests inject simulated Google libraries and verify marker activation, map/list
synchronization, highlighting, fitting, replacement, cleanup, failure/retry,
and late loading. Loader tests verify key handling and library configuration.
No tests call live Google services; live rendering requires the configured key
and an available place-search backend.

## Review actions when detail enrichment fails

Search results already contain a validated PlaceModel. Selecting a result now
displays that data and its review/claim actions immediately while the detail
request runs. Successful detail responses refresh it; temporary failures keep
the result visible alongside the error and Retry details button. Retrying the
same selection preserves an open review draft. HTTP 401, 403 and 404 discard
the fallback, since authorization or place existence is no longer established.

The currently inspected backend getPlaceDetails endpoint still returns an empty
HTTP 400 placeholder. This frontend fix removes that placeholder as a blocker
for writing reviews, but does not implement the unfinished backend detail lookup.
