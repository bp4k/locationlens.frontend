import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuDivider,
  Button,
} from "@fluentui/react-components";
import { PersonRegular } from "@fluentui/react-icons";
import { useNavigate } from "react-router";
import { useAuth } from "../../auth/auth-context";
import { clearSession } from "../../auth/token-storage";
import { getIdpBaseUrl, getIdpClientId } from "../../lib/env";

export function AccountMenu() {
  const navigate = useNavigate();
  const { logOut } = useAuth();

  function signOut() {
    const idpBaseUrl = getIdpBaseUrl();
    const clientId = getIdpClientId();

    if (idpBaseUrl && clientId) {
      // Clear the token with clearSession, NOT useAuth's logOut: logOut also
      // flips isAuthenticated, which re-renders the protected guard, mounts
      // /login, and lets its effect overwrite window.location.href with the
      // app's own /v1/login before the browser acts on the redirect below.
      // Keycloak's SSO cookie would still be alive, so that silently signs the
      // same user back in. A full-page redirect discards this React tree
      // anyway, so no state update is needed here.
      // post_logout_redirect_uri must be pre-registered in Keycloak (Clients ->
      // locationlens -> Valid post logout redirect URIs) - a separate allow-list
      // from the app's own /v1/login ?target= one.
      clearSession();
      const postLogoutRedirectUri = `${window.location.origin}/welcome`;
      window.location.href =
        `${idpBaseUrl}/protocol/openid-connect/logout` +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
      return;
    }

    // No Keycloak realm configured (e.g. local dev without an IDP wired up):
    // fall back to a local-only sign-out. Commit the public route before
    // clearing authentication - router navigation normally runs in a
    // transition, so clearing auth first can let the protected guard win the
    // race and start OAuth again. The framework's data router supports
    // flushSync; replacing history avoids returning to this private page.
    navigate("/welcome", { replace: true, flushSync: true });
    logOut();
  }

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Button appearance="subtle" icon={<PersonRegular />}>
          Account
        </Button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItem onClick={() => navigate("/account")}>Account</MenuItem>
          <MenuItem onClick={() => navigate("/reviews/history")}>
            My reviews
          </MenuItem>
          <MenuItem onClick={() => navigate("/admin/claims")}>
            Business claims (admin)
          </MenuItem>
          <MenuDivider />
          <MenuItem onClick={signOut}>Sign out</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
