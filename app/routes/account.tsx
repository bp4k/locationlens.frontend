import { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Button,
  Spinner,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { getCurrentUser } from "../lib/user-api";
import { getIdpAcctConsoleUrl } from "../lib/env";
import type { User } from "../types/user";

const useStyles = makeStyles({
  container: {
    maxWidth: "640px",
    margin: "0 auto",
    padding: tokens.spacingVerticalXXL,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  editProfileRow: {
    display: "flex",
    justifyContent: "flex-end",
  },
});

export default function Account() {
  const styles = useStyles();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setError("Could not load your account details."));
  }, []);

  const idpAcctConsoleUrl = getIdpAcctConsoleUrl();

  if (error) {
    return (
      <div className={styles.container}>
        <Text>{error}</Text>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <Spinner label="Loading your account…" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Table aria-label="Account details">
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Attribute</TableHeaderCell>
            <TableHeaderCell>Value</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>First Name</TableCell>
            <TableCell>{user.first_name}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Last Name</TableCell>
            <TableCell>{user.last_name}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Email</TableCell>
            <TableCell>{user.email}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {idpAcctConsoleUrl && (
        <div className={styles.editProfileRow}>
          <Button
            appearance="primary"
            onClick={() => {
              window.location.href = idpAcctConsoleUrl;
            }}
          >
            Edit Profile
          </Button>
        </div>
      )}
    </div>
  );
}
