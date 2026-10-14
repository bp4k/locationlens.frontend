# SearchCriteriaModel value object

SearchCriteriaModel is a frozen value object with readonly locationText, latitude,
longitude, radiusMeters and placeType fields. Construct it from SearchCriteriaInput;
it copies the values without retaining the input object. isValid() returns a boolean,
and equals() compares all five field values rather than instance identity.

```ts
import { SearchCriteriaModel } from "../types/search-criteria";
import { PlaceTypeModel } from "../types/place";

const criteria = new SearchCriteriaModel({
  locationText: "Atlanta",
  radiusMeters: 1000,
  placeType: PlaceTypeModel.PARK,
});
criteria.isValid(); // true
await placeApiClient.search(criteria);
```

Location text or a complete coordinate pair is required. Text and coordinates
remain optional individually to support the existing two search modes. Provided
coordinates must both be finite and within latitude [-90, 90] / longitude [-180, 180],
even when location text is also supplied. Zero and fractional coordinates are valid.
Radius must be a positive integer no greater than 2,147,483,647, matching the backend
CriteriaRequest's Java Integer. Type may be omitted for all categories; otherwise
it must be a supported PlaceTypeModel enum value.

Invalid values can be constructed so isValid() can check them without throwing.
getValidationError() supplies the same validation behavior and messages to the API
client and SearchView. SearchView stores submitted criteria as frozen snapshots;
changing filters constructs a new value. Plain SearchCriteriaInput objects remain
accepted by PlaceApiClient and are copied/validated before HTTP.

No backend changes are included. The current backend CriteriaRequest uses camelCase
JSON names and a String[] placeType, while the frontend search adapter still uses its
previous proposed snake_case query parameters and one category. This model change
does not settle that unfinished endpoint contract or change search serialization.

Model tests cover input copying, runtime immutability, equality, location modes,
coordinate and integer boundaries, categories, and malformed runtime values. API
and SearchView tests verify integration. Live place-provider integration is not tested.
