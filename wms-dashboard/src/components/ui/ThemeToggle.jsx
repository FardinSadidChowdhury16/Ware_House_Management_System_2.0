import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../app/context/ThemeContext.jsx";

export function ThemeToggle({ className = "", compact = false }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={`inline-flex items-center justify-center rounded-lg border transition-all cursor-pointer select-none ${
        compact ? "p-1.5" : "px-2.5 py-1.5 gap-1.5 text-xs font-semibold"
      } ${
        isDark
          ? "bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700 shadow-sm"
          : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm"
      } ${className}`}
    >
      {isDark ? (
        <>
          <Sun size={14} className="text-amber-400 shrink-0" />
          {!compact && <span className="text-slate-200">Light</span>}
        </>
      ) : (
        <>
          <Moon size={14} className="text-slate-600 shrink-0" />
          {!compact && <span className="text-slate-700">Dark</span>}
        </>
      )}
    </button>
  );
}

