# Project 1 release notes

Release snapshot: October 14, 2026. This describes checked-in functionality;
successful deployment/traffic promotion must be verified separately.

## Delivered functionality

- Public welcome screen and Keycloak-backed sign-in; protected routes and account view.
- Text/coordinate search with radius and location-type filtering through the backend.
- Interactive Google map, text results, shared selection, and selected-place details.
- Responsive map/sidebar workspace and shared Fluent UI styling.
- Backend-assisted access-token renewal and session-state synchronization.
- **Additional feature 1:** reviews/ratings, place reviews, and personal review history.
- **Additional feature 2:** business claims and administrator approval/rejection UI.
- Frontend CI, fixture-backed browser workflow, and manual App Engine deployment.

## Significant corrections

- Matched plural place routes and response fields to the backend contract.
- Added stale-response guards for search/detail selection and map cleanup.
- Bounded safe-read/map loading and supplied retry states instead of indefinite spinners.
- Corrected local logout navigation ordering to prevent the protected guard racing it.
- Removed the Sign out menu item/divider after reported deployed logout failure;
  retained the handler and authentication methods.

## Known defects, limits, and incomplete functionality

- Deployed identity-provider logout remains unresolved. Sign out is **not available
  in the UI**; two retained menu interaction tests are skipped. Local/session
  functions remain, but this does not certify a working user-facing logout.
- Real Google/Keycloak round trips depend on keys, billing, origins, and redirect
  configuration; fixture tests do not verify those integrations.
- Search returns at most 20 nearby provider results; pagination is not provided.
- Reviews support submission/history, not editing/deletion; duplicate user/place
  reviews return a conflict.
- Claim existence verification does not establish ownership automatically.
- Deployment is manually triggered and does not promote traffic automatically.
- Existing server-oriented Docker/npm-start instructions are not a verified SPA
  serving path; use the documented dev command or App Engine static deployment.

## Verification evidence

On October 14, 2026, the frontend suite completed with **386 passed, 2 skipped**
across **30 test files** (`npm test -- --maxWorkers=2 --testTimeout=15000`). The two
skips concern the removed sign-out menu item. Recent TypeScript checks passed.
These are local results, not coverage percentages or proof of live deployment.
See [installation/run guide](docs/install.md) for clean-setup and acceptance steps.
