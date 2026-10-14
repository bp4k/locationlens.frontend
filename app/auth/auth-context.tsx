import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearSession, getAccessToken, getSessionExpiresAt, isSessionValid, SESSION_CHANGED_EVENT } from "./token-storage";
import { authClient } from "../lib/auth-client";
import { refreshAccessToken } from "../lib/session-api";

interface AuthContextValue {
  isAuthenticated: boolean;
  refreshAuthState: () => void;
  logOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isSessionValid());
  const [expiresAt, setExpiresAt] = useState(() => getSessionExpiresAt());
  const refreshAuthState = useCallback(() => {
    setIsAuthenticated(isSessionValid());
    setExpiresAt(getSessionExpiresAt());
  }, []);

  useEffect(() => {
    window.addEventListener(SESSION_CHANGED_EVENT, refreshAuthState);
    window.addEventListener("storage", refreshAuthState);
    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, refreshAuthState);
      window.removeEventListener("storage", refreshAuthState);
    };
  }, [refreshAuthState]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    const token = getAccessToken();
    function renew() {
      if (getAccessToken() !== token) return;
      void refreshAccessToken().catch(() => {
        // A temporary outage should not end a still-valid session. If renewal
        // cannot recover before expiry, stop presenting it as authenticated.
        if (getAccessToken() !== token) return;
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) clearSession();
        else expiryTimer = setTimeout(() => {
          if (getAccessToken() === token && !isSessionValid()) clearSession();
        }, remaining);
      });
    }
    const timer = setTimeout(renew, Math.max(0, expiresAt - Date.now() - 30_000));
    function onFocus() { if (!isSessionValid(30_000)) renew(); }
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(timer);
      if (expiryTimer) clearTimeout(expiryTimer);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated, expiresAt]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      refreshAuthState,
      logOut: () => {
        authClient.logOut();
        // localStorage mutations do not rerender React in this tab. Update the
        // shared state immediately so existing protected views see the sign-out.
        setIsAuthenticated(false);
      },
    }),
    [isAuthenticated, refreshAuthState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
