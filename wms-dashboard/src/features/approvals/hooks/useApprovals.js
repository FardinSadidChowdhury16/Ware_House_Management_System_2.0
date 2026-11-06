import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../core/api/queryKeys.js";
import { approvalsApi } from "../api/approvalsApi.js";

export function useApprovals(params = {}) {
  const queryClient = useQueryClient();

  const { data: approvalsData, isLoading: isLoadingApprovals, refetch: refetchApprovals } = useQuery({
    queryKey: queryKeys.approvals.list(params),
    queryFn: () => approvalsApi.listApprovals(params),
    staleTime: 0,
    refetchInterval: 3000, // Auto-poll every 3 seconds for new incoming approvals & status updates
    refetchOnWindowFocus: true,
  });

  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: queryKeys.approvals.stats,
    queryFn: () => approvalsApi.getStats(),
    staleTime: 0,
    refetchInterval: 3000, // Auto-poll stats every 3 seconds
    refetchOnWindowFocus: true,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    await queryClient.refetchQueries({ queryKey: queryKeys.approvals.all });
    await queryClient.refetchQueries({ queryKey: queryKeys.inventory.all });
    await queryClient.refetchQueries({ queryKey: ["products"] });
  };

  const approveMutation = useMutation({
    mutationFn: ({ approvalId, note }) => approvalsApi.approve(approvalId, note),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: ({ approvalId, note }) => approvalsApi.reject(approvalId, note),
    onSuccess: invalidate,
  });

  return {
    approvals: approvalsData?.items || [],
    totalApprovals: approvalsData?.total ?? 0,
    totalPages: approvalsData?.total_pages || 1,
    isLoadingApprovals,
    refetch: async () => {
      await Promise.all([refetchApprovals(), refetchStats()]);
    },
    stats: stats || { pending: 0, approved: 0, rejected: 0, total: 0 },
    isLoadingStats,
    approve: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    reject: rejectMutation.mutateAsync,
    isRejecting: rejectMutation.isPending,
  };
}
