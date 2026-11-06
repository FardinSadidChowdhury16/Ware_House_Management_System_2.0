import { useMemo, useState } from "react";
import { DEFAULT_USER_FORM } from "../constants.js";
import { UserFormModal, PasswordChangeModal } from "../components/UserManagementModals.jsx";
import { UsersTable } from "../components/UsersTable.jsx";
import { UsersToolbar, LoadingState } from "../components/UserManagementToolbar.jsx";
import { useConfirm, useToast, ExportCSVButton } from "../../../components/ui/index.js";
import { useAuth } from "../../auth/hooks/useAuth.js";
import { hasPermission } from "../../../components/layout/navigationConfig.js";

const getWarehouseKey = (warehouse) => String(warehouse.id ?? warehouse.code ?? warehouse.name);

export function UsersTabPage({
  users,
  roles,
  warehouses = [],
  isLoading,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
}) {
  const { isAdmin, user } = useAuth();
  const canWrite = isAdmin || hasPermission(user, "user_write");
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [form, setForm] = useState(DEFAULT_USER_FORM);

  // Dedicated Password Change Modal state
  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          (statusFilter === "All" || u.status === statusFilter) &&
          (roleFilter === "All" || u.role === roleFilter) &&
          (u.name.toLowerCase().includes(search.toLowerCase()) ||
            (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
            (u.user_name || "").toLowerCase().includes(search.toLowerCase()))
      ),
    [roleFilter, search, statusFilter, users]
  );

  const resetForm = () => {
    setShowForm(false);
    setEditingUserId(null);
    setForm(DEFAULT_USER_FORM);
  };

  const openCreate = () => {
    setEditingUserId(null);
    setForm(DEFAULT_USER_FORM);
    setShowForm(true);
  };

  const openEdit = (targetUser) => {
    setEditingUserId(targetUser.id);

    // Resolve warehouse IDs from the user's warehouse data
    let warehouseIds = [];
    if (Array.isArray(targetUser.warehouses) && targetUser.warehouses.length > 0) {
      warehouseIds = targetUser.warehouses.map((w) => String(w.id));
    } else if (targetUser.warehouse && targetUser.warehouse !== "None") {
      const matched = warehouses.find((w) => w.name === targetUser.warehouse);
      if (matched) warehouseIds = [getWarehouseKey(matched)];
    }

    setForm({
      name: targetUser.name,
      email: targetUser.email || "",
      password: "",
      role: targetUser.role || "None",
      warehouseIds,
      status: targetUser.status || "Inactive",
    });
    setShowForm(true);
  };

  const handleOpenPasswordModal = (targetUser) => {
    setPasswordModalUser(targetUser);
  };

  const handleClosePasswordModal = () => {
    setPasswordModalUser(null);
  };

  const handleSavePassword = async (newPassword) => {
    if (!passwordModalUser) return;
    setIsUpdatingPassword(true);
    try {
      if (changePassword) {
        await changePassword({ id: passwordModalUser.id, password: newPassword });
      } else {
        await updateUser({ id: passwordModalUser.id, payload: { password: newPassword } });
      }
      toast?.success(
        `Password for "${passwordModalUser.name}" has been changed successfully. The user can now log in with the new password.`
      );
      handleClosePasswordModal();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : JSON.stringify(detail) || "Failed to update password";
      toast?.error(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const resolvePayload = () => {
    const matchedRole = roles.find((r) => r.name.toLowerCase() === String(form.role || "").toLowerCase());
    const selectedWarehouseIds = (Array.isArray(form.warehouseIds) ? form.warehouseIds : [])
      .map((id) => Number(id))
      .filter(Boolean);

    return {
      role_id: matchedRole?.id ? Number(matchedRole.id) : undefined,
      warehouse_ids: selectedWarehouseIds,
    };
  };
  const [formError, setFormError] = useState("");

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setFormError("");

    const { role_id, warehouse_ids } = resolvePayload();

    try {
      if (editingUserId) {
        const payload = {
          name: form.name.trim(),
          password: form.password?.trim() || undefined,
          role_id,
          warehouse_ids,
          status: form.status === "Active",
        };
        await updateUser({ id: editingUserId, payload });
        toast?.success(
          form.password?.trim()
            ? `User profile and password for "${form.name.trim()}" updated successfully.`
            : `User profile for "${form.name.trim()}" updated successfully.`
        );
      } else {
        if (!form.email.trim()) return;
        if (!form.password.trim()) return;

        const cleanName = form.name.trim();
        const userSlug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");

        const payload = {
          name: cleanName,
          email: form.email.trim(),
          password: form.password,
          user_name: `${userSlug || "user"}_${Date.now().toString().slice(-4)}`,
          status: true,
          role_id,
          warehouse_ids,
        };
        await createUser(payload);
        toast?.success(`New user account "${cleanName}" provisioned successfully.`);
      }
      resetForm();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : JSON.stringify(detail) || "Failed to save user";
      setFormError(msg);
    }
  };

  const handleDeleteUser = async (userId) => {
    const targetUser = users.find((u) => u.id === userId);
    const userName = targetUser?.name || "this user";

    const isConfirmed = await confirm({
      title: "Delete User",
      message: `Are you sure you want to delete user "${userName}"? This action cannot be undone.`,
      confirmText: "Yes, Delete User",
      variant: "danger",
    });
    if (!isConfirmed) return;

    try {
      await deleteUser(userId);
      toast?.success(`User "${userName}" has been deleted successfully.`);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : "Failed to delete user";
      toast?.error(msg);
      console.error("Failed to delete user:", err);
    }
  };

  if (isLoading) return <LoadingState message="Loading users..." />;

  return (
    <>
      {showForm && (
        <UserFormModal
          isEditing={Boolean(editingUserId)}
          roles={roles}
          warehouses={warehouses}
          form={form}
          onChange={setForm}
          onClose={resetForm}
          onSubmit={handleSubmit}
          error={formError}
        />
      )}

      {passwordModalUser && (
        <PasswordChangeModal
          user={passwordModalUser}
          onClose={handleClosePasswordModal}
          onSubmit={handleSavePassword}
          isSubmitting={isUpdatingPassword}
        />
      )}

      <UsersToolbar
        search={search}
        statusFilter={statusFilter}
        roleFilter={roleFilter}
        roles={roles}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onRoleChange={setRoleFilter}
        onAdd={canWrite ? openCreate : undefined}
        extraAction={
          <ExportCSVButton
            filename="users"
            columns={[
              { label: "ID", key: "id" },
              { label: "Name", key: "name" },
              { label: "Email", key: "email" },
              { label: "Role", key: "role" },
              {
                label: "Warehouses",
                value: (u) =>
                  Array.isArray(u.warehouses) && u.warehouses.length > 0
                    ? u.warehouses.map((w) => w.name).join(", ")
                    : u.warehouse || "—",
              },
              { label: "Status", key: "status" },
            ]}
            data={filteredUsers}
          />
        }
      />

      <UsersTable
        users={filteredUsers}
        onEdit={canWrite ? openEdit : undefined}
        onDelete={canWrite ? handleDeleteUser : undefined}
        onChangePassword={canWrite ? handleOpenPasswordModal : undefined}
      />
    </>
  );
}
