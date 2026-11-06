import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { hasPermission } from "../../../components/layout/navigationConfig.js";

export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export function PermissionRoute({ children, permission }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!hasPermission(user, permission)) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}
