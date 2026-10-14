# Frontend sign-out

Sign out now ends the Keycloak SSO session, not just the local one. Previously
the Account → Sign out action only cleared this app's stored token, so the
identity provider still held a valid SSO cookie and the next `/v1/login` was
silently re-authenticated with no login prompt: the user appeared to be signed
straight back into the same account.

`app/lib/auth-client.ts` is unchanged and still local-only. Its synchronous
`logOut()` reuses clearSession to remove the access-token and expiry keys,
preserves all other localStorage entries, and is safe to call repeatedly. The
provider operation is likewise unchanged:

```tsx
const { logOut } = useAuth();
```

The provider clears storage through authClient and immediately sets the shared
authentication state to false. Storage changes alone do not rerender this tab,
so UI integrations that stay inside the SPA should use this provider method
rather than calling the client directly.

## Identity-provider logout

`AccountMenu.signOut` reads `getIdpBaseUrl()` and `getIdpClientId()` from
`app/lib/env.ts`, backed by the new `VITE_IDP_URI` and `VITE_IDP_CLIENT_ID`
variables. When both are set it clears the token and then assigns
`window.location.href` to the realm's end-session endpoint:

```
${VITE_IDP_URI}/protocol/openid-connect/logout
  ?client_id=${VITE_IDP_CLIENT_ID}
  &post_logout_redirect_uri=${origin}/welcome
```

`client_id` alone is accepted; no `id_token_hint` is sent, and the backend
`/login-redirect` callback contract is unchanged. No backend changes or new
endpoints are included.

That branch deliberately calls `clearSession` directly instead of the provider's
`logOut`. `logOut` also flips isAuthenticated, which rerenders the protected
guard, mounts `/login`, and lets that route's effect overwrite
`window.location.href` with the app's own `/v1/login` before the browser acts on
the end-session redirect. Because the SSO cookie is still alive at that moment,
the result is a silent re-login rather than a sign-out. A full-page redirect
discards the React tree anyway, so no state update is needed. This is the same
race the fallback path below guards against, in the opposite direction.

The post-logout target is `/welcome` rather than `/` because the root is
protected: landing there signed out would redirect to `/login` and start OAuth
again.

When either variable is unset the previous local-only behavior is kept as a
fallback. It synchronously navigates to `/welcome`, then clears the session
through the provider in the same action. Committing navigation first with the
framework router's flushSync option prevents the protected guard from racing the
navigation. Navigation replaces the current history entry, so Back does not
return to the signed-in page. On this path the Keycloak session survives and
single sign-on can still occur on the next login.

## Keycloak configuration

The post-logout URI must be registered once per client, in Keycloak under
Clients → `locationlens` → Settings → Valid post logout redirect URIs. Add
`http://localhost:5173/welcome` for local development, plus the equivalent
origin for any deployed environment. This allow-list is separate from the
backend's `VALID_REDIRECTS` / `net.bp4k.locationlens.redirect-uri` property,
which governs only the `?target=` value of `/api/v1/login`.

If the URI is not registered, Keycloak answers the end-session request with its
"We are sorry… Invalid redirect uri" page and **does not end the SSO session**,
so sign-out still appears broken in exactly the way described above. The browser
network panel showing a request to `/protocol/openid-connect/logout` is
therefore not sufficient evidence that sign-out succeeded; the redirect back to
`/welcome` is.

## Scope and limitations

Sign-out does not revoke an already-issued access token, which remains valid at
the backend until it expires, and it does not synchronize authentication state
in other already-open tabs. Session storage keys, the login flow and the
protected-route guard are otherwise unchanged.

## Tests

`vitest.config.ts` sets `envDir: "./tests"`. Vite loads the project's unsuffixed
`.env` in every mode, including test, so without this a developer's local
`VITE_IDP_*` values changed which sign-out branch the suite exercised and broke
unrelated tests. Each test stubs the variables it needs with `vi.stubEnv`.

Tests verify removal of both session keys, preservation of other storage,
repeated sign-out, no HTTP requests from the client, immediate React state
updates, later login refresh, and removal of protected content through the route
guard. Menu tests cover the fallback path's welcome navigation, history
replacement and guarded reentry, and assert the exact end-session URL built when
the realm variables are configured. The real identity-provider round trip is not
covered by an automated test; it was verified manually against a local Keycloak
with a scripted browser session.
