import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../core/api/queryKeys.js";
import { projectsApi } from "../api/projectsApi.js";

export function useProjects(params = {}) {
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(params),
    queryFn: () => projectsApi.listProjects(params),
    staleTime: 30 * 1000,
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.projects.stats,
    queryFn: () => projectsApi.getStats(),
    staleTime: 30 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => projectsApi.createProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => projectsApi.updateProject(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => projectsApi.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => projectsApi.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });

  return {
    projects: projectsQuery.data?.items || [],
    total: projectsQuery.data?.total || 0,
    stats: statsQuery.data || {
      total_projects: 0,
      active_projects: 0,
      completed_projects: 0,
      on_hold_projects: 0,
    },
    isLoading: projectsQuery.isLoading,
    isStatsLoading: statsQuery.isLoading,
    refetch: projectsQuery.refetch,
    createProject: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateProject: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteProject: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    toggleStatus: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
  };
}
