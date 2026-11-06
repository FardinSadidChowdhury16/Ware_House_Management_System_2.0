import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../core/api/queryKeys.js";
import { returnsApi } from "../api/returnsApi.js";

export function useReturns(params = {}) {
  const queryClient = useQueryClient();

  const ticketsQuery = useQuery({
    queryKey: queryKeys.services.tickets(params),
    queryFn: () => returnsApi.listTickets(params),
    staleTime: 10 * 1000,
  });

  const createTicketMutation = useMutation({
    mutationFn: returnsApi.createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", "tickets"] });
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, payload }) => returnsApi.updateTicket(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", "tickets"] });
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: (id) => returnsApi.deleteTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", "tickets"] });
    },
  });

  const updateClaimMutation = useMutation({
    mutationFn: ({ claimId, status }) => returnsApi.updateClaimStatus(claimId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.claims });
    },
  });

  return {
    ticketsData: ticketsQuery.data || {
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 1,
      stats: { total: 0, idle: 0, on_repairing: 0, work_finish: 0, delivered: 0 },
    },
    isLoading: ticketsQuery.isLoading,
    isFetching: ticketsQuery.isFetching,
    refetch: ticketsQuery.refetch,
    createTicket: createTicketMutation.mutateAsync,
    isCreating: createTicketMutation.isPending,
    updateTicket: updateTicketMutation.mutateAsync,
    isUpdating: updateTicketMutation.isPending,
    deleteTicket: deleteTicketMutation.mutateAsync,
    isDeleting: deleteTicketMutation.isPending,
    lookupBarcode: returnsApi.lookupBarcode,
    updateClaimStatus: updateClaimMutation.mutateAsync,
  };
}

