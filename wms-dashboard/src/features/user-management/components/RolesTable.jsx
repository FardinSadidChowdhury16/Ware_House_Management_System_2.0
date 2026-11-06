import { useAuth } from "../../auth/hooks/useAuth.js";
import { hasPermission } from "../../../components/layout/navigationConfig.js";
import { formatPermissionLabel } from "../constants.js";

export function RolesTable({ roles, onEdit, onDelete }) {
  const { isAdmin, user } = useAuth();
  const canWrite = isAdmin || hasPermission(user, "user_write");
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left p-3 text-xs uppercase text-slate-500">Role</th>
            <th className="text-left p-3 text-xs uppercase text-slate-500">Permissions</th>
            <th className="text-left p-3 text-xs uppercase text-slate-500">Users</th>
            <th className="text-left p-3 text-xs uppercase text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="p-3 text-sm text-slate-900 font-medium">{r.name}</td>
              <td className="p-3 text-sm text-slate-600">
                {Array.isArray(r.permissions)
                  ? r.permissions.map((p) => formatPermissionLabel(p)).join(", ")
                  : formatPermissionLabel(r.permissions)}
              </td>
              <td className="p-3 text-sm text-slate-600">{r.users || 0}</td>
              <td className="p-3 text-sm">
                {canWrite && (
                  <div className="flex items-center gap-2">
                    {onEdit && (
                      <button type="button" onClick={() => onEdit(r)} className="text-slate-600 hover:text-slate-900">
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(r)}
                        className={r.users > 0 ? "text-slate-400 hover:text-slate-600 transition-colors" : "text-red-600 hover:text-red-700 transition-colors font-medium"}
                        title={r.users > 0 ? "Role is assigned to users — cannot be deleted" : "Delete role"}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
          {roles.length === 0 && (
            <tr>
              <td className="p-6 text-center text-slate-400 text-sm" colSpan={4}>
                No roles found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
