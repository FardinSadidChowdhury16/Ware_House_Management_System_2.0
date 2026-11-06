import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../core/api/queryKeys.js";
import { warrantyApi } from "../api/warrantyApi.js";

export function useWarranty(params = {}) {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: queryKeys.services.warranties(params),
    queryFn: () => warrantyApi.listWarranties(params),
    staleTime: 3000,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  return {
    warranties: data?.items || [],
    totalWarranties: data?.total ?? 0,
    totalPages: data?.total_pages || 1,
    stats: data?.stats || { total: 0, active: 0, expiring_soon: 0, expired: 0, no_warranty: 0 },
    isLoading,
    isFetching,
    refetch,
  };
}
