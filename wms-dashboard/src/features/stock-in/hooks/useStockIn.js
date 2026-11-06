import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../core/api/queryKeys.js";
import { stockInApi } from "../api/stockInApi.js";

const EMPTY_ARRAY = Object.freeze([]);

export function useStockIn(params = {}) {
  const queryClient = useQueryClient();

  const { data: movementsData, isLoading: isLoadingMovements, isFetching: isFetchingMovements, refetch: refetchMovements } = useQuery({
    queryKey: queryKeys.inventory.movements({ ...params, direction: "in" }),
    queryFn: () => stockInApi.listMovements(params),
    staleTime: 0,
    refetchInterval: 4000, // Auto-update movements table every 4 seconds!
    refetchOnWindowFocus: true,
  });

  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: queryKeys.inventory.stats,
    queryFn: () => stockInApi.getStats(),
    staleTime: 0,
    refetchInterval: 4000, // Auto-update stats every 4 seconds!
    refetchOnWindowFocus: true,
  });

  const { data: warehouses, isLoading: isLoadingWarehouses } = useQuery({
    queryKey: queryKeys.warehouses.list,
    queryFn: () => stockInApi.listWarehouses(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: queryKeys.parties.suppliers,
    queryFn: () => stockInApi.listSuppliers(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", "summary"],
    queryFn: () => stockInApi.listProductsSummary(),
    staleTime: 5 * 60 * 1000,
  });

  const createStockInMutation = useMutation({
    mutationFn: (payload) => stockInApi.createStockIn(payload),
    onSuccess: async () => {
      // Invalidate and immediately refetch both inventory and approvals
      await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      await queryClient.refetchQueries({ queryKey: queryKeys.inventory.all });
      await queryClient.refetchQueries({ queryKey: queryKeys.approvals.all });
    },
  });

  const movementsList = Array.isArray(movementsData)
    ? movementsData
    : (movementsData?.items || movementsData?.data || []);
  const total = typeof movementsData?.total === "number" ? movementsData.total : movementsList.length;
  const pageSize = Number(params?.page_size) || 10;
  const totalPages = movementsData?.total_pages || Math.max(1, Math.ceil(total / pageSize));

  return {
    movements: movementsList,
    totalMovements: total,
    totalMovementsPages: totalPages,
    isLoadingMovements,
    isFetchingMovements,
    refetchMovements,
    stats,
    isLoadingStats,
    warehouses: warehouses || EMPTY_ARRAY,
    isLoadingWarehouses,
    suppliers: suppliers || EMPTY_ARRAY,
    isLoadingSuppliers,
    products: products || EMPTY_ARRAY,
    isLoadingProducts,
    createStockIn: createStockInMutation.mutateAsync,
    isCreating: createStockInMutation.isPending,
  };
}
