import { useAuth } from "../../auth/hooks/useAuth.js";

const selectCls = "border border-slate-300 rounded-md px-3 py-2 text-sm";

export function UsersToolbar({ search, statusFilter, roleFilter, roles, onSearchChange, onStatusChange, onRoleChange, onAdd, extraAction }) {
  const { isAdmin } = useAuth();
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-center justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search users..."
          className="border border-slate-300 rounded-md px-3 py-2 text-sm min-w-56"
        />
        <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)} className={selectCls}>
          {["All", "Active", "Inactive"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={roleFilter} onChange={(e) => onRoleChange(e.target.value)} className={selectCls}>
          <option value="All">All roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        {extraAction}
        {onAdd && (
          <button type="button" onClick={onAdd} className="text-sm bg-slate-900 text-white px-3 py-2 rounded-md">
            Add User
          </button>
        )}
      </div>
    </div>
  );
}

export function RolesToolbar({ search, onSearchChange, onAdd, extraAction }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-center justify-between">
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search roles..."
        className="border border-slate-300 rounded-md px-3 py-2 text-sm min-w-56"
      />
      <div className="flex items-center gap-2">
        {extraAction}
        {onAdd && (
          <button type="button" onClick={onAdd} className="text-sm bg-slate-900 text-white px-3 py-2 rounded-md">
            Create Role
          </button>
        )}
      </div>
    </div>
  );
}

export function LoadingState({ message = "Loading user management data..." }) {
  return <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-500 text-center">{message}</div>;
}
