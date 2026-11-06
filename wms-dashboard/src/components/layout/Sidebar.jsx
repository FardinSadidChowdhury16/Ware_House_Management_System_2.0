import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../core/api/queryKeys.js";
import { approvalsApi } from "../../features/approvals/api/approvalsApi.js";

export function Sidebar({ nav, currentUser, onLogout }) {
  const { data: approvalStats } = useQuery({
    queryKey: queryKeys.approvals.stats,
    queryFn: () => approvalsApi.getStats(),
    staleTime: 4000,
    refetchInterval: 4000,
    enabled: !!currentUser,
  });

  const pendingApprovalsCount = approvalStats?.pending ?? 0;

  return (
    <aside className="w-60 bg-slate-900 text-slate-300 flex flex-col shrink-0">
      <div className="h-14 flex items-center gap-2 px-5 border-b border-slate-800">
        <div className="w-7 h-7 rounded-md bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-sm">W</div>
        <span className="text-white font-semibold tracking-tight">WMS Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {nav.map((group) => {
          const GroupIcon = group.icon;
          return (
            <div key={group.title} className="mb-4 px-3">
              <div className="flex items-center gap-1.5 px-2.5 mb-1.5 text-slate-500">
                {GroupIcon && <GroupIcon size={12} />}
                <p className="text-[10px] font-semibold uppercase tracking-wider">{group.title}</p>
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const badgeCount = item.id === "approvals" ? pendingApprovalsCount : item.badge;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    end={item.path === "/"}
                    className={({ isActive }) =>
                      `w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm mb-0.5 transition-colors ${
                        isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      }`
                    }
                    style={({ isActive }) => (isActive ? { boxShadow: "inset 2.5px 0 0 #f59e0b" } : undefined)}
                  >
                    <Icon size={16} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {Number(badgeCount) > 0 && (
                      <span 
                        className="bg-amber-500 text-slate-900 text-[10px] font-bold rounded-full flex items-center justify-center shrink-0" 
                        style={{ minWidth: 18, height: 18, padding: "0 4px" }}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-white">
          {String(currentUser?.name || currentUser?.user_name || "Admin")
            .split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">
            {typeof currentUser?.name === "string" ? currentUser.name : currentUser?.user_name || "Administrator"}
          </p>
          <p className="text-[10px] text-slate-500">
            {typeof currentUser?.role === "object" && currentUser?.role
              ? currentUser.role.name || "Administrator"
              : String(currentUser?.role || "Administrator")}
          </p>
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="text-[10px] px-2 py-1 rounded border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            Logout
          </button>
        )}
      </div>
    </aside>
  );
}
