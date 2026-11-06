const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const rawUseMockApi = import.meta.env.VITE_USE_MOCK_API;

export const env = {
  apiBaseUrl: rawBaseUrl || "",
  useMockApi: rawUseMockApi ? rawUseMockApi === "true" : !rawBaseUrl,
};
