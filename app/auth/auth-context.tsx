import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { isSessionValid } from "./token-storage";
import { authClient } from "../lib/auth-client";

interface AuthContextValue {
  isAuthenticated: boolean;
  refreshAuthState: () => void;
  logOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isSessionValid());

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      refreshAuthState: () => setIsAuthenticated(isSessionValid()),
      logOut: () => {
        authClient.logOut();
        // localStorage mutations do not rerender React in this tab. Update the
        // shared state immediately so existing protected views see the sign-out.
        setIsAuthenticated(false);
      },
    }),
    [isAuthenticated],
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
