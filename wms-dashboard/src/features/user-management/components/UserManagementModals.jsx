import { useState, useMemo } from "react";
import {
  Eye,
  EyeOff,
  X,
  Shield,
  Search,
  Check,
  Building2,
  Users,
  Truck,
  UserCheck,
  Package,
  Barcode,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Boxes,
  Crosshair,
  ShieldCheck,
  RotateCcw,
  FileCheck2,
  BarChart3,
  Settings,
  Layers,
  UserPlus,
  User,
  Mail,
  Lock,
  KeyRound,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { PERMISSIONS, PERMISSION_MODULE_GROUPS, formatPermissionLabel } from "../constants.js";

const MODULE_ICON_MAP = {
  users: Users,
  warehouses: Building2,
  suppliers: Truck,
  customers: UserCheck,
  products: Package,
  barcode: Barcode,
  stock_in: ArrowDownToLine,
  stock_out: ArrowUpFromLine,
  transfer: ArrowLeftRight,
  inventory: Boxes,
  tracking: Crosshair,
  approvals: ShieldCheck,
  returns: RotateCcw,
  warranty: FileCheck2,
  reports: BarChart3,
  settings: Settings,
};

export function UserFormModal({
  isEditing,
  roles = [],
  warehouses = [],
  form,
  onChange,
  onClose,
  onSubmit,
  error,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const selectedWarehouseIds = useMemo(() => {
    return (Array.isArray(form.warehouseIds) ? form.warehouseIds : []).map(String);
  }, [form.warehouseIds]);

  const toggleWarehouse = (key) => {
    const updated = selectedWarehouseIds.includes(key)
      ? selectedWarehouseIds.filter((id) => id !== key)
      : [...selectedWarehouseIds, key];
    onChange({ ...form, warehouseIds: updated });
  };

  const handleSelectAllWarehouses = () => {
    const allKeys = warehouses.map((w) => String(w.id ?? w.code ?? w.name));
    onChange({ ...form, warehouseIds: allKeys });
  };

  const handleClearWarehouses = () => {
    onChange({ ...form, warehouseIds: [] });
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-2xl sm:max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* ── Modal Header ── */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-2xs">
              {isEditing ? <UserCheck size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? `Edit User: ${form.name || "User"}` : "Add New Team Member"}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? "Update profile details, role permissions, and assigned warehouse locations."
                  : "Provision a new user account with credentials, role assignment, and warehouse access."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Form Body ── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/30">
            
            {/* Section 1: User Profile & Credentials Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                    1
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Account Details & Role</h4>
                </div>
                <span className="text-xs font-medium text-slate-400">Login & Identity</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={form.name || ""}
                      onChange={(e) => onChange({ ...form, name: e.target.value })}
                      placeholder="e.g. Sara Khan"
                      required
                      className="w-full border border-slate-200 rounded-lg pl-10 pr-3.5 py-2.5 text-sm bg-white font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address {!isEditing && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      value={form.email || ""}
                      onChange={(e) => onChange({ ...form, email: e.target.value })}
                      placeholder="e.g. sara.khan@company.com"
                      disabled={isEditing}
                      required={!isEditing}
                      className={`w-full border border-slate-200 rounded-lg pl-10 pr-3.5 py-2.5 text-sm font-medium transition-all ${
                        isEditing
                          ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                          : "bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                      }`}
                    />
                  </div>
                  {isEditing && (
                    <p className="text-[11px] text-slate-400 mt-1">Email address cannot be changed once registered.</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {isEditing ? "Password (Optional)" : <span>Password <span className="text-red-500">*</span></span>}
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password || ""}
                      onChange={(e) => onChange({ ...form, password: e.target.value })}
                      placeholder={isEditing ? "Leave blank to keep current password" : "Enter secure password"}
                      required={!isEditing}
                      autoComplete="new-password"
                      className="w-full border border-slate-200 rounded-lg pl-10 pr-10 py-2.5 text-sm bg-white font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isEditing ? "Leave empty to retain user's existing password." : "Minimum 4 characters required for login."}
                  </p>
                </div>

                {/* Role Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Role / Authority Level
                  </label>
                  <div className="relative">
                    <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      value={form.role && form.role !== "None" ? form.role : ""}
                      onChange={(e) => onChange({ ...form, role: e.target.value || "None" })}
                      className="w-full border border-slate-200 rounded-lg pl-10 pr-8 py-2.5 text-sm bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all cursor-pointer appearance-none"
                    >
                      <option value="">No Role Assigned (Restricted)</option>
                      {roles.map((r) => (
                        <option key={r.id || r.name} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Determines feature access and approval permissions.</p>
                </div>

                {/* Status Toggle (in edit mode) */}
                {isEditing && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Account Status</span>
                      <p className="text-[11px] text-slate-400">Inactive users cannot access or log into the system.</p>
                    </div>
                    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => onChange({ ...form, status: "Active" })}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                          form.status === "Active"
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${form.status === "Active" ? "bg-white" : "bg-emerald-500"}`} />
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange({ ...form, status: "Inactive" })}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                          form.status !== "Active"
                            ? "bg-slate-700 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${form.status !== "Active" ? "bg-white" : "bg-slate-400"}`} />
                        Inactive
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Warehouse Access Permissions Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 text-xs font-bold shadow-2xs">
                    2
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">Assigned Warehouses</h4>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
                        {selectedWarehouseIds.length} / {warehouses.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Select the warehouse locations this team member is authorized to access and manage.
                    </p>
                  </div>
                </div>

                {warehouses.length > 0 && (
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAllWarehouses}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearWarehouses}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-colors shadow-2xs cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Warehouses Selection Grid */}
              {warehouses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {warehouses.map((wh) => {
                    const key = String(wh.id ?? wh.code ?? wh.name);
                    const isSelected = selectedWarehouseIds.includes(key);
                    return (
                      <div
                        key={key}
                        onClick={() => toggleWarehouse(key)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                          isSelected
                            ? "bg-amber-50/50 border-amber-400 ring-1 ring-amber-400/30 shadow-2xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleWarehouse(key)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 w-4 h-4 rounded accent-amber-600 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {wh.name}
                            </span>
                            {wh.code && (
                              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                                {wh.code}
                              </span>
                            )}
                          </div>
                          {wh.address ? (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1 truncate">
                              <MapPin size={11} className="shrink-0 text-slate-400" />
                              <span className="truncate">{wh.address}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                              <Building2 size={11} className="shrink-0 text-slate-400" />
                              <span>Warehouse Facility</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-1.5">
                  <Building2 size={24} className="text-slate-300" />
                  <span>No warehouses available in the system.</span>
                </div>
              )}
            </div>

          </div>

          {/* ── Modal Footer ── */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
            <div>
              {error && (
                <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                {isEditing ? <Check size={14} /> : <UserPlus size={14} />}
                <span>{isEditing ? "Save Changes" : "Add User"}</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}


export function RoleFormModal({
  isEditing,
  name,
  permissions = [],
  availablePermissions = [],
  onNameChange,
  onPermissionsChange,
  onClose,
  onSubmit,
  error,
}) {
  const [search, setSearch] = useState("");

  const allAvailableKeys = useMemo(() => {
    return availablePermissions.length > 0 ? availablePermissions : PERMISSIONS;
  }, [availablePermissions]);

  const selectedSet = useMemo(() => new Set(permissions), [permissions]);

  // Filter modules and strictly sequenced permissions based on search query
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PERMISSION_MODULE_GROUPS.map((group) => {
      const groupPerms = group.permissions.filter((p) =>
        allAvailableKeys.includes(p.key)
      );

      const matchingPerms = q
        ? groupPerms.filter(
            (p) =>
              p.key.toLowerCase().includes(q) ||
              p.label.toLowerCase().includes(q) ||
              p.description.toLowerCase().includes(q) ||
              group.name.toLowerCase().includes(q)
          )
        : groupPerms;

      return {
        ...group,
        permissions: matchingPerms,
        totalAvailable: groupPerms.length,
      };
    }).filter((group) => group.permissions.length > 0);
  }, [search, allAvailableKeys]);

  const togglePermission = (key) => {
    if (selectedSet.has(key)) {
      onPermissionsChange(permissions.filter((p) => p !== key));
    } else {
      onPermissionsChange([...permissions, key]);
    }
  };

  const handleToggleModule = (group) => {
    const groupKeys = group.permissions.map((p) => p.key);
    const allSelected = groupKeys.every((k) => selectedSet.has(k));

    if (allSelected) {
      onPermissionsChange(permissions.filter((k) => !groupKeys.includes(k)));
    } else {
      const newKeys = Array.from(new Set([...permissions, ...groupKeys]));
      onPermissionsChange(newKeys);
    }
  };

  const handleSelectAll = () => {
    onPermissionsChange([...allAvailableKeys]);
  };

  const handleClearAll = () => {
    onPermissionsChange([]);
  };

  const handleSelectReadOnly = () => {
    const readOnlyKeys = allAvailableKeys.filter((k) => k.endsWith("_read"));
    onPermissionsChange(readOnlyKeys);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-5xl bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* ── Modal Header ── */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-2xs">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? `Edit Role: ${name || "Untitled"}` : "Create New Role"}
              </h3>
              <p className="text-xs text-slate-500">
                Define the role title and assign granular permissions across all warehouse operations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Scrollable Body ── */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/30">
          {/* Role Name Input */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Role Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Warehouse Supervisor, Inventory Auditor, Sales Officer"
              className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm bg-white font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
            />
          </div>

          {/* Permissions Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">Assigned Permissions</h4>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
                  {permissions.length} / {allAvailableKeys.length} Selected
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Permissions strictly follow the consistent sequence: <strong className="text-slate-700 font-semibold">Read (View) → Write (Manage) → Approve (Authorize)</strong>.
              </p>
            </div>

            {/* Quick Actions & Search */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter permissions..."
                  className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 w-48 shadow-2xs"
                />
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              </div>

              {/* Preset buttons */}
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleSelectReadOnly}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 transition-colors shadow-2xs cursor-pointer"
                title="Select all Read permissions"
              >
                Read Only
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-colors shadow-2xs cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Module Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group) => {
              const IconComp = MODULE_ICON_MAP[group.id] || Layers;
              const groupKeys = group.permissions.map((p) => p.key);
              const selectedCountInGroup = groupKeys.filter((k) => selectedSet.has(k)).length;
              const isGroupFullySelected = groupKeys.length > 0 && selectedCountInGroup === groupKeys.length;

              return (
                <div
                  key={group.id}
                  className={`rounded-xl border transition-all flex flex-col justify-between overflow-hidden bg-white ${
                    selectedCountInGroup > 0
                      ? "border-amber-300 shadow-sm ring-1 ring-amber-300/30"
                      : "border-slate-200 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/80">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
                        <IconComp size={13} />
                      </div>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {group.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          selectedCountInGroup === groupKeys.length
                            ? "bg-emerald-100 text-emerald-800"
                            : selectedCountInGroup > 0
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {selectedCountInGroup}/{groupKeys.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleModule(group)}
                        className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline px-1 py-0.5 cursor-pointer"
                      >
                        {isGroupFullySelected ? "Clear" : "All"}
                      </button>
                    </div>
                  </div>

                  {/* Permissions List in strict Read -> Write -> Approve order */}
                  <div className="p-2.5 space-y-1.5 flex-1">
                    {group.permissions.map((p) => {
                      const isChecked = selectedSet.has(p.key);
                      return (
                        <div
                          key={p.key}
                          onClick={() => togglePermission(p.key)}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                            isChecked
                              ? "bg-amber-50/40 border-amber-300 text-slate-900"
                              : "bg-slate-50/40 border-slate-100 text-slate-700 hover:bg-slate-50 hover:border-slate-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(p.key)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5 w-4 h-4 rounded accent-slate-900 cursor-pointer shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded tracking-wider shrink-0 ${
                                  p.action === "read"
                                    ? "bg-sky-50 text-sky-700 border border-sky-200"
                                    : p.action === "write"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-purple-50 text-purple-700 border border-purple-200"
                                }`}
                              >
                                {p.action}
                              </span>
                              <span className="text-xs font-semibold text-slate-900 truncate">
                                {p.label}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                              {p.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredGroups.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
              No permissions found matching "{search}".
            </div>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
          <div>
            {error && (
              <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg inline-block">
                {error}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={14} />
              <span>{isEditing ? "Update Role" : "Create Role"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export function PasswordChangeModal({ user, onClose, onSubmit, isSubmitting = false }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");

    const clean = password.trim();
    if (!clean) {
      setError("Please enter a new password.");
      return;
    }
    if (clean.length < 4) {
      setError("Password must be at least 4 characters long.");
      return;
    }
    if (clean !== confirmPassword.trim()) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    onSubmit(clean);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-2xs">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Change Password</h3>
              <p className="text-xs text-slate-500">
                Update login credentials for {user.name} ({user.email || user.user_name})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password (min. 4 characters)"
                autoComplete="new-password"
                required
                className="w-full border border-slate-200 rounded-lg pl-10 pr-10 py-2.5 text-sm bg-white font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                required
                className="w-full border border-slate-200 rounded-lg pl-10 pr-3.5 py-2.5 text-sm bg-white font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Minimum 4 characters required for login.</p>
          </div>

          {error && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg flex items-center gap-1.5">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Check size={14} />
              <span>{isSubmitting ? "Updating..." : "Update Password"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
