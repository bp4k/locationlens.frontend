# UI redesign

The presentation follows a maps-inspired workspace: a scrollable search/results
sidebar next to the large Google map. At widths below 800px the map sits above a
rounded content sheet. The sidebar retains all existing form inputs and actions;
selection, filters, retries, validation, request sequencing and API calls are
unchanged. The map still mounts only after a successful search.

`app/app.css` provides shared colors, card surfaces, spacing, responsive layouts
and reduced-motion support. Scoped `ll-*` classes connect these styles to the
existing views. Component makeStyles remain in place. The app uses its existing
Fluent light theme with coordinated rounding and fonts.

Reviews, details, business claims, administrator claims and account screens use
the same panel/card styling. Their logic and permissions remain in the original
components. Account initials are derived from existing names. The header adds
links to the existing Explore and Reviews pages; the account menu is unchanged.

The public `/welcome` route introduces the app with an abstract CSS illustration,
not real map tiles or fabricated place data. Its links start the existing `/login`
flow. The root remains protected and signed-out navigation still redirects to
login. No Keycloak theme, new authentication endpoint, registration flow or
backend code is included. Registration remains on the identity provider if the
team enables it.

Preview `/welcome` without authentication. Preview `/` with an existing session
and configure the backend and Google Maps as documented in places.md to see real
results. Empty/loading/error screens remain usable without a configured map.

This change does not add photos, provider ratings, new claim fields, or pretend
that unavailable backend data exists. Google basemap configuration and API-key
restrictions remain the team's existing deployment settings.
