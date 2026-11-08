import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Select } from "./Select.jsx";

export function Pagination({
  page = 1,
  pageSize = 10,
  total = 0,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemName = "items",
}) {
  if (total === 0) return null;

  const from = Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, "ellipsis", totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-sm transition-colors">
      {/* Items Range Summary */}
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{from}</span> to{" "}
        <span className="font-semibold text-slate-800 dark:text-slate-200">{to}</span> of{" "}
        <span className="font-semibold text-slate-800 dark:text-slate-200">{total}</span> {itemName}
      </div>

      {/* Controls Container */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Rows per page */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mr-1">
            <span>Rows:</span>
            <Select
              value={String(pageSize)}
              onChange={(v) => onPageSizeChange(Number(v))}
              options={pageSizeOptions.map((opt) => ({ value: String(opt), label: String(opt) }))}
              className="w-auto min-w-16 text-xs py-1"
            />
          </div>
        )}

        {/* Previous | Page Numbers | Next */}
        <div className="flex items-center gap-1.5">
          {/* Previous Button */}
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Previous page (Move backward)"
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
            <span>Previous</span>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1 mx-1">
            {getPageNumbers().map((p, index) => {
              if (p === "ellipsis") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1 text-slate-400 dark:text-slate-600 select-none flex items-center justify-center"
                  >
                    <MoreHorizontal size={13} />
                  </span>
                );
              }

              const isActive = p === page;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-7 h-7 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-slate-800 dark:bg-amber-500 text-white dark:text-slate-950 font-semibold shadow-sm"
                      : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title={`Page ${p}`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Next page (Move forward)"
            aria-label="Next page"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
