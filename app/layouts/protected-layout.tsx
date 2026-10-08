import { Navigate, Outlet } from "react-router";
import { useAuth } from "../auth/auth-context";
import { AppHeader } from "../components/header/app-header";

export default function ProtectedLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <AppHeader />
      <Outlet />
    </>
  );
}
