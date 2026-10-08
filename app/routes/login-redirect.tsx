import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Spinner, makeStyles } from "@fluentui/react-components";
import { saveSession } from "../auth/token-storage";
import { useAuth } from "../auth/auth-context";

const useStyles = makeStyles({
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
  },
});

export default function LoginRedirect() {
  const styles = useStyles();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAuthState } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const accessToken = searchParams.get("access_token");
    const expiresIn = searchParams.get("expires_in");

    if (accessToken && expiresIn) {
      saveSession(accessToken, Number(expiresIn));
      refreshAuthState();
    }

    navigate("/", { replace: true });
  }, [searchParams, navigate, refreshAuthState]);

  return (
    <div className={styles.container}>
      <Spinner label="Signing you in…" />
    </div>
  );
}
