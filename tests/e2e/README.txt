Claim browser tests (controlled external services, real frontend/backend/JPA)

Prerequisites: Node 22+, Java 21+, sibling backend checkout containing the
feature/claim-place-validation change. Do not run against a production database.

1. In the backend: mvnw -DskipTests package
2. In this frontend: npm ci
3. Install Chromium: npx playwright install chromium
4. Run: npm run test:e2e

Set JAVA_HOME if java is not on PATH. E2E_BACKEND_DIR overrides the sibling
backend directory; E2E_BACKEND_JAR overrides its packaged JAR location.
Ports 5173, 9080 and 9084 must be available. Playwright starts and stops all
three loopback servers. The backend uses an isolated in-memory H2 database.

The identity fixture exercises actual OIDC authorization-code login and RSA
JWT validation; it is not a live Keycloak instance. The Google fixture requires
the production adapter's real request headers and returns controlled business,
non-business, missing-place and unavailable-provider responses. Neither live
Google billing nor production credentials are used. Test issuer keys exist only
in memory. Browser JWTs must not be logged or saved in reports.

Coverage: user login and submission, admin login and approve/reject, database
state across fresh API reads/page reloads, repeated-decision conflicts, denied
ordinary-user actions, invalid/missing tokens, and no saved claims on failed
business verification. Place search/MapView and persistence across an application
restart are outside this suite because master still has placeholder place APIs
and these tests intentionally use in-memory H2.
