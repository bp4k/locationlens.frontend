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
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    setUser(null);
    getCurrentUser()
      .then((profile) => { if (active) setUser(profile); })
      .catch(() => { if (active) setError("Could not load your account details. Please try again."); });
    return () => { active = false; };
  }, [attempt]);

  const idpAcctConsoleUrl = getIdpAcctConsoleUrl();

  if (error) {
    return (
      <div className={`${styles.container} ll-account-panel`}>
        <h1>Your account</h1>
        <Text role="alert">{error}</Text>
        <Button onClick={() => setAttempt((value) => value + 1)}>Retry account</Button>
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
    <div className={`${styles.container} ll-account-panel`}>
      <div className="ll-profile-heading">
        <span className="ll-profile-avatar" aria-hidden="true">
          {user.first_name.charAt(0)}{user.last_name.charAt(0)}
        </span>
        <div><span className="ll-eyebrow">YOUR SPACE</span><h1>Your account</h1></div>
      </div>
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
