import { createContext, useContext, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/authApi.js";
import { tokenStorage } from "../../../core/storage/tokenStorage.js";
import { userPreferenceStorage } from "../../../core/storage/userPreferenceStorage.js";

const AuthContext = createContext(null);

function normalizeAuthUser(rawUser, fallbackEmail = "") {
  if (!rawUser) return null;
  const roleName =
    typeof rawUser.role === "string"
      ? rawUser.role
      : rawUser.role?.name || "Administrator";

  return {
    ...rawUser,
    id: String(rawUser.id || "1"),
    name: rawUser.name || rawUser.user_name || (fallbackEmail ? fallbackEmail.split("@")[0] : "Admin"),
    email: rawUser.email || fallbackEmail,
    role: roleName,
    roleObject: typeof rawUser.role === "object" ? rawUser.role : null,
    permissions: rawUser.permissions || rawUser.role?.permissions || [],
  };
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(() => normalizeAuthUser(tokenStorage.getUser()));
  const [isLoading, setIsLoading] = useState(false);

  const login = async ({ email, password }) => {
    setIsLoading(true);
    try {
      const data = await authApi.login({ email, password });
      const token = data.access_token || data.token;
      if (token) {
        tokenStorage.setToken(token);
      }
      let rawUser = data.user;
      if (!rawUser) {
        try {
          rawUser = await authApi.me();
        } catch {
          rawUser = { email, name: email.split("@")[0] };
        }
      }
      const loggedUser = normalizeAuthUser(rawUser, email);
      tokenStorage.setUser(loggedUser);
      setUser(loggedUser);
      return loggedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      if (user?.id) {
        userPreferenceStorage.clearUser(user.id);
      }
      userPreferenceStorage.clearAll();
      tokenStorage.clearAll();
      setUser(null);
      queryClient.clear();
      setIsLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(tokenStorage.getToken() && user),
      login,
      logout,
    }),
    [isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
