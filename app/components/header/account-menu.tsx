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

export function AccountMenu() {
  const navigate = useNavigate();
  const { logOut } = useAuth();

  function signOut() {
    // Commit the public route before clearing authentication. Router navigation
    // normally runs in a transition, so clearing auth first can let the protected
    // guard win the race and start OAuth again. The framework's data router
    // supports flushSync; replacing history avoids returning to this private page.
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
