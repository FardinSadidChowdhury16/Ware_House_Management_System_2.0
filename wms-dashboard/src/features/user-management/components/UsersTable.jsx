import { KeyRound, Pencil, Trash2 } from "lucide-react";
import { StatusPill } from "../../../components/ui/StatusPill.jsx";
import { useAuth } from "../../auth/hooks/useAuth.js";
import { hasPermission } from "../../../components/layout/navigationConfig.js";

export function UsersTable({ users, onEdit, onDelete, onChangePassword }) {
  const { isAdmin, user } = useAuth();
  const canWrite = isAdmin || hasPermission(user, "user_write");
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left p-3 text-xs uppercase font-bold text-slate-500">Name</th>
            <th className="text-left p-3 text-xs uppercase font-bold text-slate-500">Email / Username</th>
            <th className="text-left p-3 text-xs uppercase font-bold text-slate-500">Role</th>
            <th className="text-left p-3 text-xs uppercase font-bold text-slate-500">Warehouse</th>
            <th className="text-left p-3 text-xs uppercase font-bold text-slate-500">Status</th>
            <th className="text-right p-3 text-xs uppercase font-bold text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="p-3 text-sm text-slate-900 font-semibold">{u.name}</td>
              <td className="p-3 text-sm text-slate-600">
                <div>
                  <span className="block font-medium">{u.email || "—"}</span>
                  {u.user_name && u.user_name !== u.email && (
                    <span className="font-mono text-[10px] text-slate-400">@{u.user_name}</span>
                  )}
                </div>
              </td>
              <td className="p-3 text-sm text-slate-600 font-medium">{u.role || "None"}</td>
              <td className="p-3 text-sm text-slate-600">{u.warehouse || "None"}</td>
              <td className="p-3">
                <StatusPill status={u.status} />
              </td>
              <td className="p-3 text-sm text-right">
                {canWrite && (
                  <div className="flex items-center justify-end gap-1.5">
                    {onChangePassword && (
                      <button
                        type="button"
                        onClick={() => onChangePassword(u)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-800 hover:bg-amber-50 px-2 py-1 rounded-md transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                        title="Change / Reset Password"
                      >
                        <KeyRound size={13} />
                        <span>Password</span>
                      </button>
                    )}
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(u)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                        title="Edit User Profile"
                      >
                        <Pencil size={13} />
                        <span>Edit</span>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(u.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer border border-transparent hover:border-red-200"
                        title="Delete User"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td className="p-8 text-center text-slate-400 text-sm" colSpan={6}>
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
