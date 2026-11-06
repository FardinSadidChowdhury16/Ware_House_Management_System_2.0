import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../core/api/queryKeys.js";
import { userManagementApi } from "../api/userManagementApi.js";

export function useUserManagement() {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: queryKeys.userManagement.users,
    queryFn: userManagementApi.listUsers,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const rolesQuery = useQuery({
    queryKey: queryKeys.userManagement.roles,
    queryFn: userManagementApi.listRoles,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.userManagement.users });
    await queryClient.invalidateQueries({ queryKey: queryKeys.userManagement.roles });
  };

  const createUser = useMutation({
    mutationFn: userManagementApi.createUser,
    onSuccess: invalidate,
  });

  const updateUser = useMutation({
    mutationFn: ({ id, payload }) => userManagementApi.updateUser(id, payload),
    onSuccess: invalidate,
  });

  const deleteUser = useMutation({
    mutationFn: userManagementApi.deleteUser,
    onSuccess: invalidate,
  });

  const changePassword = useMutation({
    mutationFn: ({ id, password }) => userManagementApi.changeUserPassword(id, password),
    onSuccess: invalidate,
  });

  const createRole = useMutation({
    mutationFn: userManagementApi.createRole,
    onSuccess: invalidate,
  });

  const updateRole = useMutation({
    mutationFn: ({ id, payload }) => userManagementApi.updateRole(id, payload),
    onSuccess: invalidate,
  });

  const deleteRole = useMutation({
    mutationFn: userManagementApi.deleteRole,
    onSuccess: invalidate,
  });

  return {
    users: usersQuery.data || [],
    roles: rolesQuery.data || [],
    isLoading: usersQuery.isLoading || rolesQuery.isLoading,
    createUser: createUser.mutateAsync,
    updateUser: updateUser.mutateAsync,
    changePassword: changePassword.mutateAsync,
    deleteUser: deleteUser.mutateAsync,
    createRole: createRole.mutateAsync,
    updateRole: updateRole.mutateAsync,
    deleteRole: deleteRole.mutateAsync,
  };
}
