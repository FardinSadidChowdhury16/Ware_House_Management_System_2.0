import { Bell, ChevronDown } from "lucide-react";

export function Header({ sectionLabel }) {
  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 transition-colors">
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
        <span>WMS</span>
        <ChevronDown size={12} className="-rotate-90" />
        <span className="text-slate-800 dark:text-slate-100 font-medium">{sectionLabel}</span>
      </div>

      <div className="flex items-center gap-4">
        <button type="button" className="relative text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
          <Bell size={17} />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
        </button>
      </div>
    </header>
  );
}
