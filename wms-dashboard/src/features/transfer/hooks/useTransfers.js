import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transferApi } from "../api/transferApi.js";
import { useToast } from "../../../shared/context/ToastContext.jsx";

export function useTransfers(filters = {}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const queryKey = [
    "transfers",
    filters.page || 1,
    filters.page_size || 10,
    filters.status || "all",
    filters.search || "",
    filters.date_from || "",
    filters.date_to || "",
    filters.warehouse_id || "all",
    filters.direction || "all",
  ];

  const transfersQuery = useQuery({
    queryKey,
    queryFn: () => {
      const params = {
        page: filters.page || 1,
        page_size: filters.page_size || 10,
      };
      if (filters.status && filters.status !== "all") {
        params.status = filters.status.toLowerCase();
      }
      if (filters.search?.trim()) {
        params.search = filters.search.trim();
      }
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.warehouse_id) params.warehouse_id = filters.warehouse_id;
      if (filters.direction && filters.direction !== "all") params.direction = filters.direction;

      return transferApi.getTransfers(params);
    },
    staleTime: 10_000,
  });

  const statsQuery = useQuery({
    queryKey: [
      "transfers",
      "stats",
      filters.warehouse_id || "all",
      filters.direction || "all",
    ],
    queryFn: () => {
      const params = {};
      if (filters.warehouse_id) params.warehouse_id = filters.warehouse_id;
      if (filters.direction && filters.direction !== "all") params.direction = filters.direction;
      return transferApi.getTransferStats(params);
    },
    staleTime: 10_000,
  });

  const submitMutation = useMutation({
    mutationFn: (payload) => transferApi.submitTransfer(payload),
    onSuccess: (data) => {
      toast.success(
        "Transfer Request Submitted",
        `Transfer #${data.id} has been submitted for approval.`
      );
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.message || "Failed to submit transfer request.";
      toast.error("Submission Failed", msg);
    },
  });

  return {
    transfers: transfersQuery.data?.items || [],
    total: transfersQuery.data?.total || 0,
    page: transfersQuery.data?.page || 1,
    pageSize: transfersQuery.data?.page_size || 10,
    totalPages: transfersQuery.data?.total_pages || 1,
    isLoading: transfersQuery.isLoading,
    isFetching: transfersQuery.isFetching,
    refetch: () => {
      transfersQuery.refetch();
      statsQuery.refetch();
    },
    stats: statsQuery.data || { total: transfersQuery.data?.total || 0, pending: 0, approved: 0, rejected: 0 },
    isLoadingStats: statsQuery.isLoading,

    submitTransfer: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
  };
}
