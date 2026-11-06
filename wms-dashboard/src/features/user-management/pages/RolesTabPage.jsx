import { useEffect, useMemo, useState } from "react";
import { RoleFormModal } from "../components/UserManagementModals.jsx";
import { RolesTable } from "../components/RolesTable.jsx";
import { RolesToolbar, LoadingState } from "../components/UserManagementToolbar.jsx";
import { userManagementApi } from "../api/userManagementApi.js";
import { useConfirm, ExportCSVButton } from "../../../components/ui/index.js";
import { useAuth } from "../../auth/hooks/useAuth.js";
import { hasPermission } from "../../../components/layout/navigationConfig.js";

export function RolesTabPage({ users = [], roles, isLoading, createRole, updateRole, deleteRole }) {
  const { isAdmin, user } = useAuth();
  const canWrite = isAdmin || hasPermission(user, "user_write");
  const { confirm } = useConfirm();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [backendPermissions, setBackendPermissions] = useState([]);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    userManagementApi.listPermissions().then((perms) => setBackendPermissions(perms));
  }, []);

  const permissionNames = useMemo(
    () => backendPermissions.map((p) => p.name),
    [backendPermissions]
  );

  const filteredRoles = useMemo(
    () =>
      roles.filter((r) => {
        const permissionText = Array.isArray(r.permissions) ? r.permissions.join(", ") : String(r.permissions || "");
        return r.name.toLowerCase().includes(search.toLowerCase()) || permissionText.toLowerCase().includes(search.toLowerCase());
      }),
    [roles, search]
  );

  const enrichedRoles = useMemo(() => {
    return filteredRoles.map((r) => {
      const assignedUsers = (users || []).filter((u) => {
        const matchId = u.role_id && String(u.role_id) === String(r.id);
        const matchName = u.role && String(u.role).toLowerCase() === String(r.name).toLowerCase();
        return matchId || matchName;
      });
      const userCount = Math.max(Number(r.users || 0), assignedUsers.length);
      return {
        ...r,
        users: userCount,
        assignedUserNames: assignedUsers.map((u) => u.name),
      };
    });
  }, [filteredRoles, users]);

  const resetForm = () => {
    setShowForm(false);
    setEditingRoleId(null);
    setRoleName("");
    setPermissions([]);
    setSubmitError("");
  };

  const openCreate = () => {
    setEditingRoleId(null);
    setRoleName("");
    setPermissions([]);
    setSubmitError("");
    setShowForm(true);
  };
//const openEdit = (role);
  const openEdit = (role) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setPermissions(Array.isArray(role.permissions) ? role.permissions : []);
    setSubmitError("");
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!roleName.trim()) return;
    if (permissions.length === 0) {
      setSubmitError("Please select at least one permission.");
      return;
    }

    // Resolve permission names to IDs
    let available = backendPermissions;
    if (!available || available.length === 0) {
      try {
        available = await userManagementApi.listPermissions();
        setBackendPermissions(available);
      } catch (e) {
        console.error("Failed to load backend permissions:", e);
      }
    }

    const permissionIds = permissions
      .map((name) => {
        const found = (available || []).find((p) => p.name === name);
        return found ? found.id : null;
      })
      .filter(Boolean);

    const payload = { name: roleName.trim(), permission_ids: permissionIds };
    if (editingRoleId) await updateRole({ id: editingRoleId, payload });
    else await createRole(payload);
    resetForm();
  };

  const handleDelete = async (roleOrId) => {
    const targetRole = typeof roleOrId === "object" ? roleOrId : enrichedRoles.find((r) => r.id === roleOrId);
    if (!targetRole) return;

    // Check if any users are assigned to this role
    if (targetRole.users > 0) {
      const namesList = targetRole.assignedUserNames?.length
        ? `Assigned user(s): ${targetRole.assignedUserNames.slice(0, 4).join(", ")}${targetRole.assignedUserNames.length > 4 ? ` and ${targetRole.assignedUserNames.length - 4} more` : ""}.`
        : `This role is currently assigned to ${targetRole.users} user(s).`;

      await confirm({
        title: "Cannot Delete Role",
        message: `This role is currently assigned to users and cannot be deleted. (${targetRole.name})`,
        details: `${namesList} Please reassign or remove these users first before deleting this role.`,
        confirmText: "Understood",
        cancelText: "Close",
        variant: "warning",
      });
      return;
    }

    // Only allow deletion if no users are assigned
    const isConfirmed = await confirm({
      title: "Delete Role",
      message: `Are you sure you want to delete role "${targetRole.name}"? This action cannot be undone.`,
      confirmText: "Yes, Delete Role",
      variant: "danger",
    });
    if (!isConfirmed) return;

    try {
      await deleteRole(targetRole.id);
    } catch (err) {
      const detail = err?.response?.data?.detail || "This role is assigned to users, you cannot delete it.";
      await confirm({
        title: "Cannot Delete Role",
        message: typeof detail === "string" ? detail : "This role is assigned to users, you cannot delete it.",
        confirmText: "Understood",
        cancelText: "Close",
        variant: "warning",
      });
    }
  };

  if (isLoading) return <LoadingState message="Loading roles..." />;

  return (
    <>
      {showForm && (
        <RoleFormModal
          isEditing={Boolean(editingRoleId)}
          name={roleName}
          permissions={permissions}
          availablePermissions={permissionNames}
          onNameChange={setRoleName}
          onPermissionsChange={setPermissions}
          onClose={resetForm}
          onSubmit={handleSubmit}
          error={submitError}
        />
      )}

      <RolesToolbar
        search={search}
        onSearchChange={setSearch}
        onAdd={canWrite ? openCreate : undefined}
        extraAction={
          <ExportCSVButton
            filename="roles"
            columns={[
              { label: "ID", key: "id" },
              { label: "Role Name", key: "name" },
              { label: "Users Count", key: "users" },
              {
                label: "Permissions",
                value: (r) =>
                  Array.isArray(r.permissions)
                    ? r.permissions.join("; ")
                    : String(r.permissions || ""),
              },
            ]}
            data={enrichedRoles}
          />
        }
      />

      <RolesTable roles={enrichedRoles} onEdit={canWrite ? openEdit : undefined} onDelete={canWrite ? handleDelete : undefined} />
    </>
  );
}
