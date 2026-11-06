import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../core/api/queryKeys.js";
import { stockOutApi } from "../api/stockOutApi.js";

const EMPTY_ARRAY = Object.freeze([]);

export function useStockOut(params = {}) {
  const queryClient = useQueryClient();

  const {
    data: movementsData,
    isLoading: isLoadingMovements,
    isFetching: isFetchingMovements,
    refetch: refetchMovements,
  } = useQuery({
    queryKey: ["inventory", "movements", "out", params],
    queryFn: () => stockOutApi.listMovements(params),
    staleTime: 0,
    refetchInterval: 4000, // Auto-update movements table every 4 seconds!
    refetchOnWindowFocus: true,
  });

  const { data: warehouses, isLoading: isLoadingWarehouses } = useQuery({
    queryKey: queryKeys.warehouses.list,
    queryFn: () => stockOutApi.listWarehouses(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: queryKeys.parties.customers,
    queryFn: () => stockOutApi.listCustomers(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", "summary"],
    queryFn: () => stockOutApi.listProductsSummary(),
    staleTime: 5 * 60 * 1000,
  });

  const createStockOutMutation = useMutation({
    mutationFn: (payload) => stockOutApi.createStockOut(payload),
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
    warehouses: warehouses || EMPTY_ARRAY,
    isLoadingWarehouses,
    customers: customers || EMPTY_ARRAY,
    isLoadingCustomers,
    products: products || EMPTY_ARRAY,
    isLoadingProducts,
    createStockOut: createStockOutMutation.mutateAsync,
    isCreating: createStockOutMutation.isPending,
  };
}
