import { Search } from "lucide-react";

export function SearchBox({ value, onChange, placeholder = "Search...", className = "" }) {
  return (
    <div className={`relative flex-1 max-w-xs ${className}`}>
      <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-200 dark:border-slate-700 rounded-md pl-8 pr-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition-colors"
      />
    </div>
  );
}
