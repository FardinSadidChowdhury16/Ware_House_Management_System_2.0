const TABS = [
  { id: "users", label: "Team Members" },
  { id: "roles", label: "Roles & Permissions" },
];

export function UserManagementTabs({ activeTab, onTabChange }) {
  return (
    <div className="flex gap-1 mb-5 border-b border-slate-200">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === tab.id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
