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
