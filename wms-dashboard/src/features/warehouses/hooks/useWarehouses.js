import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../core/api/queryKeys.js";
import { warehousesApi } from "../api/warehousesApi.js";
import { warehousesSeed } from "../../../shared/data/mockSeeds.js";

export function useWarehouses() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.warehouses.list,
    queryFn: async () => {
      const data = await warehousesApi.listWarehouses();
      // If backend DB has no warehouses yet, fall back to seed so page stays rich
      return Array.isArray(data) && data.length > 0 ? data : warehousesSeed;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const createMutation = useMutation({
    mutationFn: warehousesApi.createWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.list });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => warehousesApi.updateWarehouse(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.list });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: warehousesApi.toggleWarehouseStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.list });
    },
  });

  return {
    warehouses: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    createWarehouse: createMutation.mutateAsync,
    updateWarehouse: updateMutation.mutateAsync,
    toggleStatus: toggleStatusMutation.mutateAsync,
    refetch: query.refetch,
  };
}

/**
 * Fetches the dashboard summary (total stock, pending approvals, under repair)
 * scoped to the current user's assigned warehouses.
 * Pass warehouseId to filter to a specific warehouse.
 */
export function useMyWarehouseSummary(warehouseId = null) {
  return useQuery({
    queryKey: queryKeys.warehouses.mySummary(warehouseId),
    queryFn: () => warehousesApi.getMySummary(warehouseId),
    staleTime: 60 * 1000, // 1 minute — summary should feel fresh
    retry: 1,
  });
}
