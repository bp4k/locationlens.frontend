# Place and review models

`app/types/place.ts` defines `PlaceModel`, `PlaceTypeModel`, the wire `PlaceResponse`,
and `parsePlaceModel` / `parsePlaceModels`. Backend `dto/PlaceResponse.java` and
`model/PlaceType.java` define the matching contract. The backend currently has no
place search/detail endpoints; this change supplies the DTO for that future work.

| Frontend  | Backend JSON | Representation                                      |
| --------- | ------------ | --------------------------------------------------- |
| placeId   | place_id     | Opaque string                                       |
| name      | name         | String                                              |
| address   | address      | String; empty supported                             |
| latitude  | latitude     | Number / Java Double, decimal degrees (-90 to 90)   |
| longitude | longitude    | Number / Java Double, decimal degrees (-180 to 180) |
| types     | types        | Array of PlaceTypeModel / PlaceType values          |

Categories are RESTAURANT, BATHROOM, PARK, ATTRACTION, HOTEL, HOSPITAL, OTHER.
A provider integration must map its categories to this enum before returning the DTO.
Empty arrays are supported. Unknown categories and invalid coordinates reject during
frontend parsing. Parsing copies the types array and preserves IDs and precision.
PlaceListView already consumes this model; an API adapter can use the exported
parsers when place endpoints are implemented.

ReviewModel contains all six architecture fields: reviewId (UUID string), rating
(integer number 1–5), text (string), createdAt (Instant string), userId (UUID string),
and placeId (opaque string). Keeping Instants as strings preserves nanosecond precision.
The companion backend adds user_id to ReviewResponse, sourced from the saved review,
for POST, place reads, and current-user history. Submission still accepts no user ID;
the backend assigns it from the authenticated JWT. History is still current-user only.

Deploy the backend response change before this frontend: missing/invalid user_id
responses are rejected instead of manufacturing author identity. Existing frontend
clients ignore the additional backend JSON field.

Validation: frontend model/API/view tests, TypeScript checks and production build;
backend DTO serialization, controller, service, authentication and claim unit tests.
HTTP tests use mocked responses; live Keycloak/database integration is not exercised.
