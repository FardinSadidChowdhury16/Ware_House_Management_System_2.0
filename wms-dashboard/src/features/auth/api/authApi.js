import { httpClient } from "../../../core/api/httpClient.js";

export const authApi = {
  async login(payload) {
    const body = {
      user_name_or_email: payload.user_name_or_email || payload.email || payload.username || "",
      password: payload.password || "",
    };
    const { data } = await httpClient.post("/auth/login", body);
    return data;
  },
  async me() {
    const { data } = await httpClient.get("/auth/me");
    return data;
  },
  async logout() {
    try {
      const { data } = await httpClient.post("/auth/logout");
      return data;
    } catch {
      return { success: true };
    }
  },
};

