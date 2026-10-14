import { clearSession } from "../auth/token-storage";

/** Frontend authentication operations; existing login/profile helpers stay in place. */
export interface AuthClient {
  logOut(): void;
}

export const authClient: AuthClient = {
  logOut: () => {
    // Reuse the session helper so both the token and its expiry are removed.
    // Clearing only these keys preserves unrelated browser preferences/data.
    // This is local sign-out: it makes no backend or Keycloak logout request.
    clearSession();
  },
};
