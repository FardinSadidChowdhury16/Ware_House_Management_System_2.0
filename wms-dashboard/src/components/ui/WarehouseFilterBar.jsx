import { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { useWarehouseFilter } from "../../app/context/WarehouseFilterContext.jsx";

/**
 * Reusable warehouse filter dropdown.
 * Reads from and writes to the global WarehouseFilterContext.
 */
export function WarehouseFilterBar({ className = "" }) {
  const { myWarehouses, selectedWarehouseId, selectWarehouse, isLoadingWarehouses } = useWarehouseFilter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selected = myWarehouses.find((w) => w.id === selectedWarehouseId) ?? null;
  const label = selected ? selected.name : "All Warehouses";
  const needle = query.trim().toLowerCase();
  const visibleWarehouses = myWarehouses.filter((w) =>
    !needle || w.name.toLowerCase().includes(needle) || String(w.code || "").toLowerCase().includes(needle)
  );

  if (isLoadingWarehouses) {
    return (
      <div className={`h-8 w-36 bg-slate-100 animate-pulse rounded-lg ${className}`} />
    );
  }

  // If user has only 1 warehouse -> show as clean static badge
  if (myWarehouses.length <= 1 && !selectedWarehouseId) {
    if (myWarehouses.length === 1) {
      return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-500 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm ${className}`}>
          <Building2 size={13} className="text-amber-500" />
          <span className="truncate max-w-[140px]">{myWarehouses[0].name}</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setOpen((v) => !v);
        }}
        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-500 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 shadow-sm hover:border-amber-600 hover:bg-amber-50/40 dark:hover:bg-amber-950/30 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
      >
        <Building2 size={13} className="text-amber-500 shrink-0" />
        <span className="max-w-[140px] truncate">{label}</span>
        <ChevronDown
          size={12}
          className={`text-slate-400 transition-transform duration-150 shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden py-1">
          <div className="px-2 pt-1 pb-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search warehouses..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950"
            />
          </div>
          {/* All warehouses */}
          <button
            type="button"
            className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer ${
              selectedWarehouseId === null
                ? "font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
            onClick={() => { selectWarehouse(null); setOpen(false); }}
          >
            All Warehouses
          </button>

          {visibleWarehouses.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
          )}
          {visibleWarehouses.length === 0 && (
            <p className="px-3.5 py-2 text-xs text-slate-400">No matches</p>
          )}

          {visibleWarehouses.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                selectedWarehouseId === w.id
                  ? "font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              onClick={() => { selectWarehouse(w.id); setOpen(false); }}
            >
              <span className="truncate pr-2">{w.name}</span>
              <span className="text-[10px] text-slate-400 font-mono shrink-0">{w.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

