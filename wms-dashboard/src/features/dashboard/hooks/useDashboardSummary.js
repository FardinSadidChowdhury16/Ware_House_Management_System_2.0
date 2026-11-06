import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../core/api/queryKeys.js";
import { dashboardApi } from "../api/dashboardApi.js";

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: dashboardApi.getSummary,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
