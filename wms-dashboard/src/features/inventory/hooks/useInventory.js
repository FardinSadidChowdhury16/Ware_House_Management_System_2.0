import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../core/api/queryKeys.js";
import { inventoryApi } from "../api/inventoryApi.js";
import { inventorySeed } from "../../../shared/data/mockSeeds.js";

export function useInventory(filters = {}) {
  const queryClient = useQueryClient();

  const serializedQuery = useQuery({
    queryKey: queryKeys.inventory.items(filters),
    queryFn: () => inventoryApi.listSerializedItems(filters),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const bulkQuery = useQuery({
    queryKey: queryKeys.inventory.bulk(filters),
    queryFn: () => inventoryApi.listBulkStock(filters),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const summaryQuery = useQuery({
    queryKey: ["inventory", "warehouse-summary", filters],
    queryFn: () => inventoryApi.getWarehouseSummary(filters),
    staleTime: 10 * 1000,
  });

  const movementMutation = useMutation({
    mutationFn: inventoryApi.createMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: ["inventory", "warehouse-summary"] });
    },
  });

  const sellMutation = useMutation({
    mutationFn: ({ serialNumber, payload }) => inventoryApi.sellSerializedItem(serialNumber, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: ["inventory", "warehouse-summary"] });
    },
  });

  return {
    warehouseSummary: summaryQuery.data || {
      selected_warehouse: null,
      warehouses: [],
      summary: {
        total_products: 0,
        total_stock_records: 0,
        total_quantity: 0,
        in_stock_quantity: 0,
        under_service_quantity: 0,
        damaged_quantity: 0,
        serialized_products_count: 0,
        bulk_products_count: 0,
      },
      items: [],
    },
    isSummaryLoading: summaryQuery.isLoading,
    refetchSummary: summaryQuery.refetch,
    serializedItems: serializedQuery.data || [],
    bulkStock: bulkQuery.data || [],
    defaultRows: inventorySeed,
    isLoading: summaryQuery.isLoading || serializedQuery.isLoading || bulkQuery.isLoading,
    createMovement: movementMutation.mutateAsync,
    sellItem: sellMutation.mutateAsync,
  };
}
