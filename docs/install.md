# Frontend installation, operation, and handoff

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
