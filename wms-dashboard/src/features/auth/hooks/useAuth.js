import { useAuthContext } from "../context/AuthContext.jsx";

const ADMIN_ROLES = new Set(["admin", "administrator", "super administrator", "superadmin"]);

export function isAdminUser(user) {
  return ADMIN_ROLES.has((user?.role || "").toLowerCase().trim());
}

export function useAuth() {
  const ctx = useAuthContext();
  return {
    ...ctx,
    isAdmin: isAdminUser(ctx.user),
  };
}
