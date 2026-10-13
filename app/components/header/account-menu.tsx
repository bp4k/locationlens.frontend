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

export function AccountMenu() {
  const navigate = useNavigate();

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
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
