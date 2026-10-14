"""Prepare repository handoff docs; stage backend writes for workspace approval."""
from pathlib import Path
import tempfile

FRONT = Path(__file__).resolve().parents[1]
BACK_STAGE = Path(tempfile.gettempdir()) / 'locationlens-backend-handoff'

COMMON = r'''
## Start the complete application

Use three running services: Keycloak (8084), backend (8080), and frontend
(127.0.0.1:5174). Start them in that order. Use the same hostname throughout:
`localhost` and `127.0.0.1` are different origins. The frontend address in this
guide is **http://127.0.0.1:5174**.

### 1. Keycloak: first-time setup

Start Docker Desktop (Linux containers) or the Docker engine. The commands below
are each one line and work in PowerShell or Bash:

```text
docker run -d -p 127.0.0.1:8084:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin -v kcdata:/opt/keycloak/data --name keycloak quay.io/keycloak/keycloak:26.7.4 start-dev
docker logs --tail 40 keycloak
```

The bootstrap credentials above are for local development only. For subsequent
sessions, reuse the existing container and its saved realm/users:

```text
docker start keycloak
docker ps
```

Wait until http://localhost:8084 responds. Open its admin console with the local
bootstrap credentials, then:

1. Create/select realm `locationlens`.
2. Create an OpenID Connect client with client ID `locationlens`. Enable
   **Client authentication** and **Standard flow** (authorization code).
3. Set Valid redirect URIs to
   `http://localhost:8080/login/oauth2/code/common-idp`. This is the backend
   callback; it is different from the frontend callback below.
4. Copy the client secret from the Credentials tab into the backend `.env`.
5. Create a normal test user with email, first name and last name. Set a password
   with Temporary disabled; complete or disable any outstanding required actions
   for the local test account. Do not use the Keycloak admin-console account as
   your application's ordinary test user.
6. Optional: enable realm User registration to let users create their own accounts
   on the Keycloak login page. No separate frontend registration form is supplied.

For administrator claim testing, create realm role `locationlens_admin` and assign
it to a separate test user. Ensure the client's `roles` client scope is attached,
and its realm-role mapper includes `realm_access.roles` in the **ID token**
("Add to ID token" enabled). A normal token role or a visible admin menu alone is
insufficient. The login success handler synchronizes that role into `User.admin`;
API authorization then reads the database. Sign in again after role changes.

The Sign out UI is currently removed. Use separate browser profiles for user/admin
testing, or close all private-browsing windows and start a fresh private session
to test another login. Clearing frontend storage alone does not end Keycloak SSO.

### 2. Google configuration

Provision a Google Cloud project with billing and enable **Places API (New)**
for backend search/details/claim checks and **Maps JavaScript API** for the
browser map. Supply a server Places key through `GOOGLE_PLACES_API_KEY` and a
browser Maps key through `VITE_GOOGLE_MAPS_API_KEY`; restrict them for their
respective services and use. Do not put a server credential into a `VITE_*` value.
The browser key is visible in the built application.

Allow the frontend origin in the browser key's HTTP referrers, for example
`http://127.0.0.1:5174/*`, plus the deployed frontend origins. Provide a configured
map ID in `VITE_GOOGLE_MAPS_MAP_ID`. The code falls back to `DEMO_MAP_ID` for
development, but deployment validation requires a map ID value. Without the map
key, the text results remain usable; without the server Places key, live search,
provider-backed details, and business verification are unavailable.

### 3. Backend terminal

From the backend repository, copy `.env.example` to `.env` and replace its
placeholder client secret and server Places key. Spring does **not** automatically
read this file; load it into the same terminal that starts Maven.

PowerShell:

```powershell
Copy-Item .env.example .env
# Edit .env before continuing; do not overwrite an existing configured file.
Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    if ($line -and !$line.StartsWith("#")) {
        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) {
            $value = $parts[1].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($parts[0].Trim(), $value, "Process")
        }
    }
}
.\mvnw.cmd spring-boot:run
```

Bash (Linux/macOS):

```bash
cp .env.example .env
# Edit .env first. Use shell-compatible values; quote values containing spaces.
set -a
. ./.env
set +a
./mvnw spring-boot:run
```

These examples assume one KEY=VALUE per line, without inline comments. Wait for
the Spring application-started message and HTTP port 8080. Leave it running.

### 4. Frontend terminal

From the frontend repository:

```text
npm ci
```

Copy `.env.example` to `.env` using `Copy-Item` (PowerShell) or `cp` (Bash), and
edit the browser Maps settings. Preserve existing configuration instead of
overwriting it. Start the frontend:

```text
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Open **http://127.0.0.1:5174/welcome**. The Vite Local URL indicates the server is
ready; initial dependency optimization can make the first load slower.
`VITE_APP_API_URL` must be `http://localhost:8080/api` with no trailing slash.
Backend `VALID_REDIRECTS` must include the exact
`http://127.0.0.1:5174/login-redirect` target. Restart Vite after environment changes;
reload the backend environment and restart Spring after backend changes.

### 5. Acceptance check and shutdown

1. Sign in as the normal test user; confirm account information is available.
2. Search Atlanta with radius 1000; try a coordinate search including valid zero
   values, and a category filter. Radius must be 1–50,000 meters.
3. Select a list result and a marker; confirm shared highlight and details.
4. Submit a rating (1–5) and nonblank review (at most 2,000 characters); check
   place reviews and My reviews. One review per user/place is enforced.
5. Claim an actual business result. Use the administrator profile to review a
   pending claim. Place verification establishes existence; approval is a human
   ownership decision. Do not test this with fabricated place IDs.
6. Confirm ordinary users cannot approve/reject claims even if they see the menu.

Press Ctrl+C in frontend and backend terminals. If Windows asks to terminate the
batch job, answer `Y`. Optionally run `docker stop keycloak`. Do not delete the
container/volume just to end a session. Default backend H2 data is erased on
restart; Keycloak data in the named Docker volume is separate and persists.

## Troubleshooting

| Symptom | Check and corrective action |
| --- | --- |
| Docker engine pipe missing / cannot connect | Start Docker Desktop and wait for the Linux engine. |
| Container name already in use | Run `docker ps -a`; reuse `docker start keycloak` rather than creating another. |
| Keycloak page unavailable | Check container status/port 8084 and `docker logs --tail 40 keycloak`; wait for startup. |
| `/undefined/v1/login` or a route error containing undefined | Set frontend `VITE_APP_API_URL`, then restart Vite. |
| `invalid_client` / invalid client credentials | Match backend client ID/secret to the configured realm/client; reload `.env` and restart backend. Restarting Docker does not load backend environment values. |
| Login returns token JSON or rejects target | Set backend `VALID_REDIRECTS` to the exact frontend `/login-redirect` URL; avoid hostname/port mismatch. |
| Keycloak invalid redirect URI | Login callback belongs to backend `/login/oauth2/code/common-idp`; post-logout `/welcome` has a separate Keycloak allow-list. |
| Search 404 | Inspect Network URL: current route is `/api/v1/places/search` (plural); ensure paired current revisions and correct API base. |
| Search 400 | Use exactly one location mode, coordinates in range, radius 1–50,000, and supported uppercase category. |
| Search/claim 503 or provider failure | Set server Places key, enable Places API (New)/billing, and check provider restrictions/quota and backend logs. |
| Map fails but list works | Check browser Maps key, Maps JavaScript API, billing/referrers/map ID and console messages; restart/rebuild frontend after changes. |
| API 401 | Sign in again in a fresh profile; check token expiry, reachable issuer and backend session. A direct API request needs a bearer token. |
| Admin API 403 | Check `locationlens_admin` role and ID-token realm-role mapper, then sign in again to synchronize database status. |
| Session refresh CORS/cookie failure | The refresh endpoint uses credentials and only origins derived from `VALID_REDIRECTS`. Check exact origin, HTTPS/cookie policy and browser third-party-cookie restrictions. |
| Review 409 | A review already exists for that user/place; editing/deletion is not provided. |
| Claim conflict | The claim may already have been reviewed; refresh pending claims instead of repeating a decision. |
| Port already in use | Stop the previous dev process; changing ports also requires updating callback/origin configuration. |
| Successful deploy but old UI | CD uses `promote: false`; test the reported version URL and explicitly migrate traffic after verification. |
| Local reviews/claims disappear | H2 memory + create-drop is disposable; configure persistent MySQL and migrations. |

## Repository access and submission

Repository owners/admins should open GitHub **Settings → Collaborators / Manage
access** for **both** repositories, invite `Nimisha-Roy` and the assigned mentor
by exact GitHub username, and confirm invitation acceptance before submitting
the two repository links. Use a read-capable role sufficient for assessment;
available roles depend on repository ownership. If invitations were already sent,
verify both assessors appear in the access list rather than only as pending invites.
Record the final frontend/backend commit IDs, successful CI/CD run links, and
deployed URLs in the submission. Branch protection requires PRs; force push does
not bypass a required-PR rule.
'''

FRONT_INSTALL = r'''# Frontend installation, operation, and handoff

## Prerequisites and dependencies

- Node.js **22.12+ within the 22.x line** and its npm (CI uses Node 22); Git and
  a modern browser. The current Dockerfile uses Node 24, but the documented
  developer/CI setup uses Node 22.
- For the complete local application: Java/JDK 21, Docker Desktop/engine, and
  internet access to package registries, Keycloak image, and Google services.
  No separate Maven install is required; the backend includes its wrapper.
- React 19, TypeScript 5.9, React Router 8 framework SPA mode, Vite 8,
  Fluent UI 9, Tailwind 4, Google Maps JS loader 2.1. `npm ci` installs versions
  resolved by package-lock.json. Vitest/Testing Library and Playwright are dev tools.
- A laptop/desktop able to run Node, a JVM, and Docker simultaneously; 8 GB RAM
  is a practical recommendation, not a measured hardware minimum. Ports 8080,
  8084 and 5174 must be free.

## Download

Run in a parent folder (GitHub access is required if repositories are private):

```text
git clone https://github.com/bp4k/locationlens.git
git clone https://github.com/bp4k/locationlens.frontend.git
cd locationlens.frontend
```

Keep the directories as siblings, especially for paired E2E fixtures. Obtain
teammate-approved paired revisions rather than independently assuming branches
are compatible.

## Frontend environment reference

Copy the tracked [.env.example](../.env.example) to ignored `.env`.

| Variable | Meaning |
| --- | --- |
| `VITE_APP_API_URL` | Required backend base including `/api`; local `http://localhost:8080/api`, no trailing slash. |
| `VITE_GOOGLE_MAPS_API_KEY` | Browser Maps JavaScript key; required for a live map. |
| `VITE_GOOGLE_MAPS_MAP_ID` | Map ID for advanced markers; configure for production. |
| `VITE_IDP_ACCT_CONSOLE` | Optional Keycloak account-console URL; local `http://localhost:8084/realms/locationlens/account`. |
| `VITE_IDP_URI` | Realm issuer/base; retained logout integration uses this with client ID, but the menu action is hidden. |
| `VITE_IDP_CLIENT_ID` | Public client identifier `locationlens`; never put the confidential client secret here. |

All `VITE_*` values are browser-visible and embedded at build time. Changing an
App Engine runtime variable alone does not update an already-built frontend.
Keep credentials out of commits; `.env` is ignored.
'''+COMMON+r'''
## Build and automated checks

From this repository:

```text
npm ci
npm run typecheck
npm test -- --maxWorkers=2 --testTimeout=15000
npm run build
```

The SPA production artifact is **build/client/**. For local testing use the
documented dev command; the generic template's `npm start` expects a server
artifact and is not the documented serving method for the current `ssr: false`
build. Static hosting must serve `index.html` for deep links such as `/account`.
The checked-in App Engine config provides that fallback. Do not assume the
existing server-oriented Dockerfile is a verified SPA delivery path.

For fixture-backed browser tests, install Chromium and build the paired backend:

```text
cd ../locationlens
```

PowerShell: `.\mvnw.cmd -DskipTests package`; Bash: `./mvnw -DskipTests package`.
Then return to the frontend:

```text
cd ../locationlens.frontend
npx playwright install chromium
npm run test:e2e
```

Read `tests/e2e/backend.mjs` for the paired JAR path. E2E starts its own fake
provider on 9084, backend on 9080, and frontend on 5173 (override with
`E2E_FRONTEND_PORT`). Free those ports first. These fixtures do not use real
Google/Keycloak and do not verify live logout or Maps rendering.

## CI/CD and App Engine

`.github/workflows/fe-ci.yml` runs on master pushes/PRs and manual dispatch:
locked dependency install → TypeScript → tests → build → artifact upload.
`claim-e2e.yml` is manual and accepts a paired backend ref.

`fe-cd.yml` is manual. Configure the repository's `production` environment:

| Kind | Names |
| --- | --- |
| Variables | `GCP_PROJECT_ID`, `VITE_APP_API_URL`, `VITE_GOOGLE_MAPS_MAP_ID`, optional `VITE_IDP_ACCT_CONSOLE`, `VITE_IDP_URI`, `VITE_IDP_CLIENT_ID` |
| Secrets | `GCP_SA_KEY` (deployment service-account JSON), `VITE_GOOGLE_MAPS_API_KEY` |

Use an initialized App Engine project with deployment/service-account permissions
and configure HTTPS backend/identity URLs. Run **Deploy Frontend to App Engine**
from the reviewed branch. It validates config, typechecks/tests/builds, copies
`app.yaml` into `build/client`, and deploys service `frontend` as a new version.
The `python312` declaration serves static files; the UI itself is React, not Python.

Deployment uses **promote: false**. Open the URL in the run summary, allow its
exact login callback in backend `VALID_REDIRECTS`, allow its origin in Maps key
referrers, and rehearse before moving App Engine traffic. If logout is restored,
register that origin's `/welcome` in Keycloak Valid post logout redirect URIs.
Backend login callback remains its own HTTPS `/login/oauth2/code/common-idp`.

## Maintainer map

- `app/routes.ts` and `layouts/protected-layout.tsx`: navigation/route guard.
- `components/places/search-view.tsx`: submitted criteria, results and selection.
- `components/places/*`: list/details/Google map presentation.
- `lib/*-api.ts` and `types/*`: request adapters, models and runtime parsing.
- `auth/*`, `lib/session-api.ts`: local session and backend-assisted renewal.
- `components/reviews`, `components/claims`: additional feature views.
- `app.css` and `root.tsx`: shared styles and Fluent theme.

Current contracts: [places](places.md), [reviews](reviews.md),
[authentication](auth.md), and the backend [API reference](https://github.com/bp4k/locationlens/blob/master/docs/api.md).
See [release notes](../RELEASE_NOTES.md) for limits and disabled UI.
'''

BACK_INSTALL = r'''# Backend installation, operation, and handoff

## Prerequisites and dependencies

JDK **21** (check `java -version`), Git, Docker Desktop/engine for Keycloak,
Node.js 22.12+ within 22.x for the paired frontend, and a modern browser.
Use `mvnw.cmd` on Windows or `./mvnw` on Linux/macOS; no global Maven is required.
If the Unix wrapper lacks executable permission, run `chmod +x mvnw`.
Internet access is needed for Maven dependencies, the Keycloak image, and Google.
An 8 GB laptop/desktop is a practical recommendation, not a tested minimum.

The Maven manifest supplies Spring Boot 4.1.1, Spring MVC, Security OIDC client
and JWT resource-server support, Bean Validation, JPA/Hibernate, Lombok, H2,
MySQL Connector/J, Cloud SQL connector and Flyway. H2 is the local/test database;
MySQL/Cloud SQL is the production configuration. Ports 8080, 8084 and 5174 must
be available for the full stack.

## Download

```text
git clone https://github.com/bp4k/locationlens.git
git clone https://github.com/bp4k/locationlens.frontend.git
cd locationlens
```

Use sibling folders and coordinated revisions. Private repos need GitHub access.

## Backend environment reference

Copy [.env.example](../.env.example) to ignored `.env` and load it into the
process as described below. Real secrets must not be committed.

| Variable | Meaning / local value |
| --- | --- |
| `IDP_CLIENT_ID` | Keycloak confidential client ID, `locationlens`. |
| `IDP_CLIENT_SECRET` | Actual secret from that client's Credentials tab. |
| `IDP_URI` | Issuer `http://localhost:8084/realms/locationlens`; must be reachable by backend/browser. |
| `VALID_REDIRECTS` | Comma-separated exact frontend callback URLs, local `http://127.0.0.1:5174/login-redirect`; also derives allowed credentialed refresh origins. |
| `GOOGLE_PLACES_API_KEY` | Server Places API (New) key for search/details and business verification. |
| `GOOGLE_PLACES_BASE_URL` | Optional provider base override for tests; default `https://places.googleapis.com/v1`. |
| `DB_URL` | Default `jdbc:h2:mem:locationlens`; use MySQL JDBC URL for persistence. |
| `DB_USER`, `DB_PASS` | Default H2 user `sa`, empty password; real database credentials for MySQL. |
| `FLYWAY_ENABLED` | `false` for H2; `true` for production MySQL migrations. |
| `DDL_AUTO` | `create-drop` for disposable H2; `validate` with production migrations. |

The application defaults Security logs to TRACE. Avoid sharing credential-bearing
logs; use `LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_SECURITY=INFO` outside debugging.
'''+COMMON+r'''
## Build and verification

With Keycloak running and the environment loaded, build/test the full application:

PowerShell:

```powershell
.\mvnw.cmd clean verify
```

Bash:

```bash
./mvnw clean verify
```

This includes the application context test, so valid reachable issuer/client
configuration is required. For CI-style isolated testing without live Keycloak:

PowerShell:

```powershell
$env:DB_URL = 'jdbc:h2:mem:locationlens-tests;DB_CLOSE_DELAY=-1'
$env:DB_USER = 'sa'
$env:DB_PASS = ''
$env:FLYWAY_ENABLED = 'false'
$env:DDL_AUTO = 'create-drop'
.\mvnw.cmd '-Dtest=*Test,*Tests,!LocationlensApplicationTests' verify
```

Bash:

```bash
DB_URL='jdbc:h2:mem:locationlens-tests;DB_CLOSE_DELAY=-1' DB_USER=sa DB_PASS='' FLYWAY_ENABLED=false DDL_AUTO=create-drop ./mvnw '-Dtest=*Test,*Tests,!LocationlensApplicationTests' verify
```

These temporarily override the process database settings. Reload the intended
environment before starting the application afterward. Excluding the context
test does not demonstrate real authentication or production-database readiness.

The packaged executable is `target/locationlens-0.0.1-SNAPSHOT.jar`:

```text
java -jar target/locationlens-0.0.1-SNAPSHOT.jar
```

The same environment must be loaded for JAR execution. Controller, service,
repository, provider-adapter and integration tests are under `src/test/java`;
results are written to `target/surefire-reports`.

## Persistent MySQL setup

Use an empty database on a MySQL 8.x instance and a database user able to apply
the initial migrations. In the MySQL client, an administrator can create these
with appropriately chosen credentials:

```sql
CREATE DATABASE locationlens CHARACTER SET utf8mb4;
CREATE USER 'locationlens'@'localhost' IDENTIFIED BY '<choose-a-password>';
GRANT ALL PRIVILEGES ON locationlens.* TO 'locationlens'@'localhost';
```

For a remote database configure the matching host/network access instead of
blindly reusing `localhost`. Set:

```ini
DB_URL=jdbc:mysql://localhost:3306/locationlens
DB_USER=locationlens
DB_PASS=<matching-password>
FLYWAY_ENABLED=true
DDL_AUTO=validate
```

Flyway applies V1 baseline schema and V2 place tables; Hibernate validates the
schema. Do not use `create-drop` against persistent customer data. Existing
nonempty databases need a reviewed migration/baseline plan and a backup; the
enabled baseline-on-migrate setting is not a substitute for that review.

## CI/CD and production setup

`java-ci.yml` tests master pushes/PRs using H2 and excluding the issuer-dependent
application context test. `java-cd.yml` is manually dispatched: Maven verify →
runtime configuration/JAR staging → Google authentication → App Engine version.
`java-cloud.yml` manually checks Cloud SQL connectivity; it does not run the UI.

Configure the repository's `production` environment:

| Kind | Names |
| --- | --- |
| Variables | `GCP_PROJECT_ID`, `CLOUD_SQL_INSTANCE` (`project:region:instance`), `CI_DB_NAME`, `GCP_RUNTIME_SERVICE_ACCOUNT`; optionally `IDP_URI`, `IDP_CLIENT_ID`, `VALID_REDIRECTS` |
| Secrets | `GCP_SA_KEY`, `CI_DB_USERNAME`, `CI_DB_PASSWORD`, `IDP_CLIENT_SECRET`, `GOOGLE_PLACES_API_KEY`; `IDP_URI`, `IDP_CLIENT_ID`, `VALID_REDIRECTS` can instead be secrets |

Provision an initialized Google App Engine Java 21 project, a Cloud SQL MySQL
instance/database/user, and a reachable HTTPS Keycloak realm. Grant the deploying
service account deployment permissions and permission to use the configured
runtime service account; grant the runtime account Cloud SQL connection access.
The preparation script requires a PUBLIC connector path (`ipTypes=PUBLIC`), so
provision a compatible Cloud SQL instance rather than assuming private-only
networking will work with the checked-in setup.

`.github/scripts/prepare-appengine.rb` validates settings, constructs the connector
JDBC URL, and creates untracked `target/appengine/app.yaml` plus `app.jar`. It
requires Ruby when run outside the GitHub runner. Generated configuration holds
runtime secrets and is cleaned by the workflow; do not publish it as an artifact.
`app.yaml` selects Java 21, service `default`, Flyway enabled and schema validation.

Run **Deploy Backend to App Engine** from the reviewed branch, then test the URL
reported in its summary. **promote: false** leaves traffic unchanged. Configure
Keycloak's valid login redirect to the intended backend HTTPS
`/login/oauth2/code/common-idp`, configure `VALID_REDIRECTS` for each exact frontend
`/login-redirect`, and rebuild the frontend with the intended HTTPS backend
`/api` base. Confirm user/admin workflows before explicitly migrating traffic.
Session refresh relies on browser cookies, so verify cookie settings and allowed
origins in the deployed domain arrangement.

After acceptance, use Google Cloud Console → App Engine → Versions, select the
relevant service/version, and migrate or split traffic deliberately. Do this for
both backend (`default`) and frontend (`frontend`) services as appropriate. Keep
the previous compatible version available for rollback and verify both final
public URLs afterward; a version-specific URL alone is not the customer release.

## Architecture and supported contracts

Controllers receive HTTP; services apply rules; repositories persist entities.
Google adapter classes translate provider data. OIDC login synchronizes users;
Spring validates API JWTs; database admin status enforces claim decisions.
See [API reference](api.md) and [release notes](../RELEASE_NOTES.md).
'''

FRONT_RELEASE = '''# Project 1 release notes

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
'''

BACK_RELEASE = '''# Project 1 release notes

Release snapshot: October 14, 2026. Pair this backend with the corresponding
frontend release and verify the serving versions before customer handoff.

## Delivered functionality

- Keycloak authorization-code login, user synchronization, JWT-protected REST API,
  account information, and backend-assisted access-token renewal.
- Google Places (New) text/coordinate nearby search and place details.
- Location type translation/filtering and validated search criteria.
- **Additional feature 1:** review/rating submission, place reviews and current-user history.
- **Additional feature 2:** verified-place business claims, pending-claim retrieval,
  and database-authorized administrator approval/rejection.
- JPA persistence, H2 development/testing, MySQL/Cloud SQL production configuration,
  and Flyway schema migrations.
- Java CI, manual App Engine deployment, and a Cloud SQL connectivity workflow.

## Significant corrections

- Replaced placeholder place responses with provider-backed search/details and a
  consistent `/api/v1/places` contract.
- Derive reviewer/claimant identity from authentication rather than client-supplied IDs.
- Enforce one review per user/place and review input validation.
- Verify Google place/business targets before claim storage and guard invalid claim decisions.
- Use transactional/locked claim decisions to protect simultaneous state changes.
- Renew access tokens with server-side refresh credentials and restricted credentialed origins.
- Synchronize the Keycloak admin realm role on login; use database admin status for requests.

## Known defects, limits, and incomplete functionality

- The paired frontend's deployed logout issue remains unresolved and its Sign out
  menu item is removed. No complete backend/Keycloak logout fix is claimed.
- Default H2/create-drop data is disposable; production persistence needs the
  documented MySQL/Cloud SQL credentials, permissions and migration setup.
- Places search caps nearby results at 20; there is no pagination.
- Reviews do not supply edit/delete operations; claims record decisions rather than
  implementing a complete verified-owner business-management portal.
- General bearer API CORS currently allows all origins; session refresh uses the
  narrower configured frontend-origin list. Review production policy deliberately.
- Admin changes are synchronized on login; changing a Keycloak role requires a new login.
- CI excludes the live-issuer application context smoke test. Fixtures and isolated
  tests do not establish production database or live-provider readiness.
- CD is manual and uses `promote: false`; a successful run may leave public traffic
  on an older version.

## Verification boundary

Controller, service, repository, provider-flow and integration test source is
included. Backend tests were inspected during documentation preparation, but no
fresh backend run or exact passing test count is asserted. Run the commands in
[installation guide](docs/install.md) and retain CI/live acceptance evidence.
'''

API = '''# Backend API reference

Base: `http://localhost:8080/api/v1` locally; HTTPS backend `/api/v1` when deployed.
Except login/session refresh, requests require `Authorization: Bearer <access token>`.
JSON submissions need `Content-Type: application/json`. User identity comes from
validated authentication, not a user ID in the request body.

| Method/path | Input | Result / access |
| --- | --- | --- |
| GET `/login` | Optional `target` URL matching `VALID_REDIRECTS` exactly | Starts OIDC login; relays token to frontend callback or JSON when no target. |
| POST `/session/refresh` | Existing OIDC session cookie; approved frontend Origin | Bearer token response; refresh token stays server-side. |
| GET `/me` | Bearer token | Current user; see controller DTO. |
| GET `/places/search` | `radius_meters`; either `location_text` or complete `latitude`/`longitude`; optional `place_type` | Array of place responses. |
| GET `/places/{placeId}` | URL-encoded provider ID | Place response (local record or Google details). |
| POST `/reviews` | `{"place_id":"provider-id","rating":5,"text":"A useful review"}` | 201 review response; 409 for duplicate user/place. |
| GET `/reviews/place/{placeId}` | URL-encoded place ID | Array of place reviews. |
| GET `/reviews/history` | Current authenticated user | Array of that user's reviews. |
| POST `/business-claims` | `{"placeId":"provider-id"}` | Created pending claim; verifies place/business first. |
| GET `/business-claims/pending` | Admin bearer token | Pending claims. |
| POST `/business-claims/{claimId}/approve` | Admin; canonical claim UUID | 204, no JSON body. |
| POST `/business-claims/{claimId}/reject` | Admin; canonical claim UUID | 204, no JSON body. |

Search radius is an integer **1–50,000 meters**; text has at most 500 characters.
Latitude is −90..90, longitude −180..180; zero is valid. Supply exactly one location
mode. Categories: `RESTAURANT`, `BATHROOM`, `PARK`, `ATTRACTION`, `HOTEL`, `HOSPITAL`,
`OTHER`. Text search first resolves a location with Places searchText and then
performs searchNearby; at most 20 results are returned. Provider categories are
translated into application categories.

Place JSON example (illustrative values, not a valid business test ID):

```json
{"place_id":"provider-id","name":"Example Park","address":"Atlanta, GA","latitude":33.78,"longitude":-84.37,"types":["PARK"]}
```

Review rating is an integer 1–5 and text is nonblank with at most 2,000 characters.
Claim response JSON uses `id`, `userId`, `placeId`, `status` (the frontend maps
`id` to `claimId`); statuses are `PENDING`,
`APPROVED`, `REJECTED`. Claim decisions are admin-only and may conflict if already
reviewed. A place ID is an opaque provider string, not a UUID; claim/user IDs are UUIDs.

To inspect a request in PowerShell, obtain your own access token through a normal
login, then set `$accessToken` locally without committing it:

```powershell
Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/places/search?location_text=Atlanta&radius_meters=1000&place_type=PARK' -Headers @{Authorization="Bearer $accessToken"}
```

Common status meanings: 400 invalid input, 401 missing/expired authentication,
403 insufficient permission, 404 unavailable resource/incorrect route, 409 state
conflict, 503 external service/configuration unavailable. Error bodies may use
`message` or Problem Detail `detail`; clients should preserve status and tolerate
non-JSON failures. Endpoint definitions/DTOs remain the source of truth.
'''

FRONT_README = '''# LocationLens frontend

React/TypeScript interface for nearby place discovery. The application provides
Keycloak sign-in, search and type filtering, synchronized Google map/text results,
place details, reviews/history, and business claims/admin review.

## Customer/developer handoff

- [Release notes and known limitations](RELEASE_NOTES.md)
- [Installation, configuration, build/run, testing, deployment and troubleshooting](docs/install.md)
- [Frontend environment template](.env.example)
- [Place components and API integration](docs/places.md)
- [Authentication/session behavior](docs/auth.md)
- [Reviews](docs/reviews.md) and [UI](docs/ui.md)
- [Paired backend repository](https://github.com/bp4k/locationlens)

Start with the installation guide. It covers **both services and Keycloak**, not
only npm commands. The local frontend address is `http://127.0.0.1:5174/welcome`.
The Sign out menu item is currently removed; its implementation remains.

## Developer checks

```text
npm ci
npm run typecheck
npm test -- --maxWorkers=2 --testTimeout=15000
npm run build
```

SPA build output: `build/client/`. CI and manually triggered deployment are in
`.github/workflows`. Deployment does not automatically promote App Engine traffic.
See the guide for GitHub assessor access and the final handoff acceptance checklist.
'''

BACK_README = '''# LocationLens backend

Java 21 / Spring Boot backend for place discovery, authentication, reviews and
business claims. It integrates Keycloak, Google Places API (New), JPA persistence,
and MySQL/Cloud SQL production configuration.

## Customer/developer handoff

- [Release notes, fixes and known limitations](RELEASE_NOTES.md)
- [Installation, configuration, build/run, testing, database setup, deployment and troubleshooting](docs/install.md)
- [Environment template](.env.example)
- [API reference and request/response examples](docs/api.md)
- [Paired frontend repository](https://github.com/bp4k/locationlens.frontend)

Start with the installation guide. It includes PowerShell and Bash commands,
first-time Keycloak/client/admin setup, Google configuration, and exact frontend
callback origins. Spring does not automatically read `.env`; load it before Maven.

Local ports: backend 8080, Keycloak 8084, frontend 5174. H2/create-drop defaults are
disposable. The paired frontend's Sign out UI is currently removed while deployed
logout is investigated.

For a configured full build use `.\\mvnw.cmd clean verify` (Windows) or
`./mvnw clean verify` (Linux/macOS). See the guide for isolated CI-style testing
and its excluded context test. Deployment is manual and does not promote traffic.
'''

PLACES = '''# Place views and current API contract

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
'''

AUTH = '''# Authentication, session renewal and sign-out status

## Current customer-visible behavior

Sign-in is available through `/login` and Keycloak. The Account menu's **Sign out
item and its divider are removed** because deployed logout was reported failing.
The menu handler, AuthClient and AuthProvider logout methods are retained. Two
menu-interaction tests are temporarily skipped; authentication-functionality tests
remain active. No working deployed sign-out is claimed.

## Sign-in and protected requests

The frontend redirects to backend `/api/v1/login?target=<origin>/login-redirect`.
The target must exactly match backend VALID_REDIRECTS. Keycloak returns to the
backend `/login/oauth2/code/common-idp`; the backend synchronizes the local user
and relays access-token data to the frontend callback. The frontend stores token
and expiry, updates AuthProvider, and navigates to exploration.

apiFetch sends bearer authentication. Frontend expiry checks improve UX; backend
JWT verification and role checks remain the security boundary. Administrator
realm role `locationlens_admin` must be included in the ID token and is synchronized
to database User.admin at login. Requests authorize against database status.

AuthProvider renews before expiry, reacts to session/storage changes, and uses
backend `/api/v1/session/refresh` with the existing OIDC cookie. Refresh tokens
remain server-side. Concurrent frontend renewals share a promise; stale responses
cannot restore a session cleared by logout or overwrite another login.

## Retained logout implementation

AuthClient.logOut clears only access-token/expiry keys. AuthProvider also updates
React state. AccountMenu's unused handler first commits `/welcome` navigation with
replace/flushSync, then clears authentication. If VITE_IDP_URI and VITE_IDP_CLIENT_ID
are supplied, it redirects to Keycloak's `/protocol/openid-connect/logout` with
client_id and post_logout_redirect_uri=<origin>/welcome. This implementation remains
for future correction; there is currently no menu item to invoke it.

Clearing local storage does not revoke an issued token or terminate Keycloak SSO.
If restoring logout, register exact frontend `/welcome` URLs in Keycloak Valid
post logout redirect URIs (separate from backend login VALID_REDIRECTS), verify
the real round trip and serving version, and re-enable the retained tests only
when their UI action is restored.

For setup, admin-role mapping, new-session testing, and troubleshooting, see
[installation guide](install.md). Fixture tests and local route tests do not prove
a working deployed identity-provider logout.
'''

front_files = {'README.md': FRONT_README, 'RELEASE_NOTES.md': FRONT_RELEASE,
 'docs/install.md': FRONT_INSTALL, 'docs/places.md': PLACES, 'docs/auth.md': AUTH,
 '.env.example': '''# Browser-visible values; never put a client secret here.
VITE_APP_API_URL=http://localhost:8080/api
VITE_GOOGLE_MAPS_API_KEY=
VITE_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID
VITE_IDP_ACCT_CONSOLE=http://localhost:8084/realms/locationlens/account
VITE_IDP_URI=http://localhost:8084/realms/locationlens
VITE_IDP_CLIENT_ID=locationlens
'''}
back_files = {'README.md': BACK_README, 'RELEASE_NOTES.md': BACK_RELEASE,
 'docs/install.md': BACK_INSTALL, 'docs/api.md': API,
 '.env.example': '''# Local development only. Replace placeholder credentials before running.
IDP_CLIENT_ID=locationlens
IDP_CLIENT_SECRET=replace-with-keycloak-client-secret
IDP_URI=http://localhost:8084/realms/locationlens
VALID_REDIRECTS=http://127.0.0.1:5174/login-redirect
GOOGLE_PLACES_API_KEY=replace-with-server-places-key
DB_URL=jdbc:h2:mem:locationlens
DB_USER=sa
DB_PASS=
FLYWAY_ENABLED=false
DDL_AUTO=create-drop
LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_SECURITY=INFO
'''}

for base, files in [(FRONT, front_files), (BACK_STAGE, back_files)]:
    for name, value in files.items():
        path = base / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value, encoding='utf-8')
print('Frontend documentation written:', ', '.join(front_files))
print('Backend documentation staged at:', BACK_STAGE)
