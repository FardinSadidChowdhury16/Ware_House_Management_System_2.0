import axios from "axios";
import { env } from "../config/env.js";
import { tokenStorage } from "../storage/tokenStorage.js";
import { mockAdapter } from "./mockAdapter.js";

export const httpClient = axios.create({
  baseURL: env.apiBaseUrl || undefined,
  timeout: 15000,
  adapter: env.useMockApi ? mockAdapter : undefined,
});

httpClient.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStorage.clearAll();
    }
    return Promise.reject(error);
  }
);
