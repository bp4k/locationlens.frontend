import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { isSessionValid } from "./token-storage";

interface AuthContextValue {
  isAuthenticated: boolean;
  refreshAuthState: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isSessionValid());

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      refreshAuthState: () => setIsAuthenticated(isSessionValid()),
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
