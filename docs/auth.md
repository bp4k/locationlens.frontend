# Frontend sign-out

`app/lib/auth-client.ts` follows the other client modules with a typed AuthClient
interface and exported authClient object. Its synchronous `logOut()` operation
reuses clearSession to remove the existing access-token and expiry keys. It
preserves all other localStorage entries and is safe to call repeatedly.

Inside React, call the provider operation:

```tsx
const { logOut } = useAuth();
// Call logOut() from a future sign-out action.
```

The provider clears storage through authClient and immediately sets the shared
authentication state to false. Storage changes alone do not rerender this tab,
so UI integrations should use this provider method instead of calling the client
directly. Existing refreshAuthState behavior remains available after later login.

No production buttons, menus, routes or navigation are added by this change.
The existing protected layout sees false and redirects to /login. That route
starts OAuth automatically; when wiring the future sign-out UI, also navigate
to a public signed-out page in the same action if users should remain signed out
instead of immediately beginning another login. The redesign's /welcome route
can serve that purpose once merged.

This intentionally signs out only the frontend. It does not revoke issued
tokens, end the backend/Keycloak session, or synchronize authentication state
in other already-open tabs. Keycloak may still perform single sign-on on the
next login. Full identity-provider logout is separate backend/auth work.

Tests verify removal of both session keys, preservation of other storage, repeated
sign-out, no HTTP requests, immediate React state updates, later login refresh,
and removal of protected content through the existing route guard.
