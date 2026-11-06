import { Outlet, useLocation, useNavigate } from "react-router-dom";
import WMSAdminDashboard from "../../App.jsx";
import { useAuth } from "../../features/auth/hooks/useAuth.js";
import { DashboardWorkspaceProvider } from "../../features/dashboard/context/DashboardWorkspaceContext.jsx";
import { WarehouseFilterProvider } from "../context/WarehouseFilterContext.jsx";
import { WarehouseFilterBar } from "../../components/ui/WarehouseFilterBar.jsx";
import { ThemeToggle } from "../../components/ui/ThemeToggle.jsx";
import { getSectionFromPath } from "../../components/layout/navigationConfig.js";
import { User, LogOut } from "lucide-react";

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const section = getSectionFromPath(location.pathname);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  // Derive display values from the auth user object
  const displayName = user?.name || user?.user_name || "User";
  const displayRole = typeof user?.role === "string"
    ? user.role
    : user?.role?.name || "Staff";

  return (
    <WarehouseFilterProvider>
      <DashboardWorkspaceProvider>
        <div className="relative">
          {/* ── Top-right: Warehouse Filter right beside Name, Role & Logout ── */}
          <div className="fixed z-20 top-3 right-3 flex items-center gap-2">
            <WarehouseFilterBar />
            <ThemeToggle />
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-2.5 pr-1.5 py-1.5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 border border-slate-300/80 dark:border-slate-600 text-slate-700 dark:text-slate-300 shrink-0">
                  <User size={13} />
                </div>
                <div className="leading-tight mr-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-none">{displayName}</p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-none capitalize">{displayRole}</p>
                </div>
              </div>
              <div className="h-5 w-[1px] bg-slate-300 dark:bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                className="px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          </div>

          <WMSAdminDashboard currentUser={user} onLogout={handleLogout} section={section}>
            <Outlet />
          </WMSAdminDashboard>
        </div>
      </DashboardWorkspaceProvider>
    </WarehouseFilterProvider>
  );
}
