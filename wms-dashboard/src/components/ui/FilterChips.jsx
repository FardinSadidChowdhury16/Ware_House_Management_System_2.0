export function FilterChips({ options, value, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              value === val
                ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 font-semibold"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
