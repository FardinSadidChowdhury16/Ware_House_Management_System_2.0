import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../core/api/queryKeys.js";
import { suppliersApi } from "../api/suppliersApi.js";

const fallbackSuppliers = [
  {
    id: "1",
    name: "Alpha Traders",
    supplier_code: "SUP-001",
    phone: "+880 1711-111111",
    email: "alpha@traders.bd",
    address: "Plot 5, BSCIC I/A, Dhaka",
    shipping_details: "Plot 5, BSCIC I/A, Dhaka",
    billing_details: "Plot 5, BSCIC I/A, Dhaka",
    status: "Active",
    isActive: true,
  },
  {
    id: "2",
    name: "Global Supply Co.",
    supplier_code: "SUP-002",
    phone: "+880 1811-222222",
    email: "info@globalsupply.com",
    address: "House 12, Gulshan-2, Dhaka",
    shipping_details: "House 12, Gulshan-2, Dhaka",
    billing_details: "House 12, Gulshan-2, Dhaka",
    status: "Active",
    isActive: true,
  },
];

export function useSuppliers(params = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.parties.suppliers,
    queryFn: async () => {
      const data = await suppliersApi.listSuppliers(params);
      return Array.isArray(data) && data.length > 0 ? data : fallbackSuppliers;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const createMutation = useMutation({
    mutationFn: suppliersApi.createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parties.suppliers });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => suppliersApi.updateSupplier(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parties.suppliers });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: suppliersApi.toggleSupplierStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parties.suppliers });
    },
  });

  return {
    suppliers: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    createSupplier: createMutation.mutateAsync,
    updateSupplier: updateMutation.mutateAsync,
    toggleSupplierStatus: toggleStatusMutation.mutateAsync,
    refetch: query.refetch,
  };
}
