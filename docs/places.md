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

This component makes no API calls. SearchView will handle loading and service
errors and render the list once results are available. It is not mounted on the
placeholder home page yet; there is no production sample data or search route.

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
PlaceApiClient will supply its data, and the claim owner will supply the claim
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
- `radius_meters`: required positive safe integer in meters.
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

No production mock data or new routes are added. SearchView is the next step
for connecting this client to PlaceListView and PlaceDetailsView.
