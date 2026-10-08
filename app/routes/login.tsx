import { useEffect } from "react";
import { Navigate } from "react-router";
import { Spinner, makeStyles } from "@fluentui/react-components";
import { useAuth } from "../auth/auth-context";
import { getApiBaseUrl } from "../lib/env";

const useStyles = makeStyles({
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
  },
});

export default function Login() {
  const styles = useStyles();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) return;
    const target = `${window.location.origin}/login-redirect`;
    window.location.href = `${getApiBaseUrl()}/v1/login?target=${encodeURIComponent(target)}`;
  }, [isAuthenticated]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.container}>
      <Spinner label="Redirecting to sign in…" />
    </div>
  );
}
