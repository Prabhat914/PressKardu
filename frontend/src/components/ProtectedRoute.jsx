import { Navigate, useLocation } from "react-router-dom";
import { getStoredUser, isAuthenticated } from "../utils/session";

export function ProtectedRoute({ children, roles }) {
  const location = useLocation();
  const currentUser = getStoredUser();

  if (!isAuthenticated() || !currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (Array.isArray(roles) && roles.length > 0 && !roles.includes(currentUser.role)) {
    return <Navigate to={currentUser.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  return children;
}

export function GuestRoute({ children }) {
  const currentUser = getStoredUser();

  if (isAuthenticated() && currentUser) {
    return <Navigate to={currentUser.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  return children;
}
