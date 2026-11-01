import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./auth-context";

/** Signed-out visitors go to the login screen and come back where they were. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { signedIn } = useAuth();
  const location = useLocation();
  if (!signedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
