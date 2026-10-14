# Frontend sign-out

`app/lib/auth-client.ts` follows the other client modules with a typed AuthClient
interface and exported authClient object. Its synchronous `logOut()` operation
reuses clearSession to remove the existing access-token and expiry keys. It
preserves all other localStorage entries and is safe to call repeatedly.

Inside React, call the provider operation:

```tsx
const { logOut } = useAuth();
// AccountMenu calls this operation from its Sign out action.
```

The provider clears storage through authClient and immediately sets the shared
authentication state to false. Storage changes alone do not rerender this tab,
so UI integrations should use this provider method instead of calling the client
directly. Existing refreshAuthState behavior remains available after later login.

Account → Sign out synchronously navigates to the public /welcome page, then
clears the local session through the provider in the same action. Committing
navigation first with the framework router's flushSync option prevents the
protected guard from racing the navigation and redirecting to /login, which
would automatically start OAuth again. Navigation replaces the current history
entry, so Back does not return to that signed-in page. Existing protected routes
still reject access after sign-out. No new route or backend endpoint is added.

This intentionally signs out only the frontend. It does not revoke issued
tokens, end the backend/Keycloak session, or synchronize authentication state
in other already-open tabs. Keycloak may still perform single sign-on on the
next login. Full identity-provider logout is separate backend/auth work.

Tests verify removal of both session keys, preservation of other storage, repeated
sign-out, no HTTP requests, immediate React state updates, later login refresh,
and removal of protected content through the existing route guard. Menu tests
verify welcome navigation, history replacement, and guarded reentry after logout.
