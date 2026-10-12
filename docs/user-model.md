# UserModel and the current backend

UserModel has userId (UUID string), email (string), displayName (string), and
administrator (boolean). getCurrentUser returns CurrentUser, combining UserModel
with the existing first_name/last_name/email profile so the account page continues
to work without a UI migration.

The current backend GET /api/v1/me returns first_name, last_name and email only,
read from the validated bearer token. The frontend preserves these fields and
combines trimmed nonempty names into displayName. Null OIDC claims are supported
as empty strings; no name or email is fabricated.

The existing backend ReviewController uses the token's UUID subject as user ID.
BusinessClaimController uses the exact realm_access.roles value admin to check
administrator privileges. The frontend follows those conventions using the same
bearer token captured for /me, after the HTTP request succeeds. It does not infer
identity from email or infer admin status from client roles or similarly named roles.

Decoding a JWT in the browser does not verify its signature. This model supplies
view data only: every privileged operation must still be authorized by the backend.
Missing/malformed UUID subjects reject; absent or malformed realm roles produce
administrator=false. HTTP errors propagate instead of accepting decoded claims as
an authenticated profile.

No backend changes or new endpoints are included. If /me later exposes userId and
administrator explicitly, the adapter can move to that server response contract.

Tests cover model mapping, nullable/Unicode names, role semantics, malformed data,
real API-client bearer/response integration and the existing account page. Validation
also includes TypeScript and the production build. HTTP tests use mocked responses;
live Keycloak integration is not exercised.
