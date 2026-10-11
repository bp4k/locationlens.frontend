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
