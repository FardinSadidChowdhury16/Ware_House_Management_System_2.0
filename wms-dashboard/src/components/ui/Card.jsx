export function Card({ children, className = "" }) {
  return <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-lg shadow-sm transition-colors ${className}`}>{children}</div>;
}
