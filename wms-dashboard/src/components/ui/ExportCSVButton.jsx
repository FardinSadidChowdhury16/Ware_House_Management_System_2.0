import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { exportToCSV } from "../../shared/utils/csvExport";

export function ExportCSVButton({
  filename = "export",
  columns = [],
  data = [],
  getData = null,
  label = "Export CSV",
  className = "",
  disabled = false,
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (disabled || isExporting) return;

    try {
      let exportData = data;
      if (typeof getData === "function") {
        setIsExporting(true);
        const fetchedData = await getData();
        if (Array.isArray(fetchedData) && fetchedData.length > 0) {
          exportData = fetchedData;
        } else if (!exportData || exportData.length === 0) {
          exportData = fetchedData;
        }
      }

      if (!exportData || exportData.length === 0) {
        alert("No data available to export.");
        return;
      }
      exportToCSV({ filename, columns, data: exportData });
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export data: " + (err.message || "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || isExporting}
      title="Export data to CSV"
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isExporting ? (
        <Loader2 size={15} className="text-slate-500 animate-spin" />
      ) : (
        <Download size={15} className="text-slate-500" />
      )}
      <span>{isExporting ? "Exporting..." : label}</span>
    </button>
  );
}

