import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../core/api/queryKeys.js";
import { customersApi } from "../api/customersApi.js";

const fallbackCustomers = [
  {
    id: "1",
    name: "Rahim Store",
    phone: "+880 1711-223344",
    email: "rahim.store@example.com",
    customer_type: "retail",
    customerTypeDisplay: "Retail",
    shipping_details: "Shop 12, New Market, Dhaka",
    billing_details: "Shop 12, New Market, Dhaka",
    status: "Active",
    isActive: true,
  },
  {
    id: "2",
    name: "City Mart",
    phone: "+880 1819-556677",
    email: "procurement@citymart.bd",
    customer_type: "wholesale",
    customerTypeDisplay: "Wholesale",
    shipping_details: "GEC Circle, Chattogram",
    billing_details: "Holding 45, Agrabad C/A, Chattogram",
    status: "Active",
    isActive: true,
  },
  {
    id: "3",
    name: "Apex Logistics Ltd.",
    phone: "+880 1912-334455",
    email: "supply@apexlogistics.com",
    customer_type: "corporate",
    customerTypeDisplay: "Corporate",
    shipping_details: "Plot 8, Tejgaon I/A, Dhaka",
    billing_details: "Plot 8, Tejgaon I/A, Dhaka",
    status: "Active",
    isActive: true,
  },
];

export function useCustomers(params = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.parties.customers,
    queryFn: async () => {
      const data = await customersApi.listCustomers(params);
      return Array.isArray(data) && data.length > 0 ? data : fallbackCustomers;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const createMutation = useMutation({
    mutationFn: customersApi.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parties.customers });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => customersApi.updateCustomer(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parties.customers });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: customersApi.toggleCustomerStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parties.customers });
    },
  });

  return {
    customers: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    createCustomer: createMutation.mutateAsync,
    updateCustomer: updateMutation.mutateAsync,
    toggleCustomerStatus: toggleStatusMutation.mutateAsync,
    refetch: query.refetch,
  };
}
