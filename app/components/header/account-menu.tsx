import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Button,
} from "@fluentui/react-components";
import { PersonRegular } from "@fluentui/react-icons";
import { useNavigate } from "react-router";
import { useAuth } from "../../auth/auth-context";
import { getIdpBaseUrl, getIdpClientId } from "../../lib/env";

export function AccountMenu() {
  const navigate = useNavigate();
  const { logOut } = useAuth();

  function signOut() {
    const idpBaseUrl = getIdpBaseUrl();
    const clientId = getIdpClientId();

    // Commit the public page before emitting the shared session-cleared event.
    // Otherwise the protected guard can start login and overwrite IDP logout.
    navigate("/welcome", { replace: true, flushSync: true });
    logOut();

    if (idpBaseUrl && clientId) {
      // post_logout_redirect_uri must be pre-registered in Keycloak (Clients ->
      // locationlens -> Valid post logout redirect URIs) - a separate allow-list
      // from the app's own /v1/login ?target= one.
      const postLogoutRedirectUri = `${window.location.origin}/welcome`;
      window.location.href =
        `${idpBaseUrl}/protocol/openid-connect/logout` +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
      return;
    }

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
          {/* Sign out is temporarily unavailable in the UI; keep its handler above. */}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
