/**
 * Safely format a cell value for CSV export
 */
function formatCSVCell(val) {
  if (val === null || val === undefined) return '""';
  if (typeof val === "boolean") return val ? '"Yes"' : '"No"';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Export structured data to a downloadable CSV file.
 * Automatically adds UTF-8 BOM so spreadsheet viewers render unicode/symbols correctly.
 * 
 * @param {Object} options
 * @param {string} options.filename - Base filename without extension
 * @param {Array<{ label: string, key?: string, value?: (row: any) => any }>} options.columns - Column headers & accessors
 * @param {Array<Object>} options.data - The data rows to export
 */
export function exportToCSV({ filename = "export", columns = [], data = [] }) {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  // Generate header row
  const headers = columns.map((col) => formatCSVCell(col.label || col.key || ""));

  // Generate data rows
  const rows = data.map((row) =>
    columns.map((col) => {
      let cellVal;
      if (typeof col.value === "function") {
        cellVal = col.value(row);
      } else if (col.key) {
        cellVal = row[col.key];
      } else {
        cellVal = "";
      }
      return formatCSVCell(cellVal);
    })
  );

  // Add UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";
  const csvContent = BOM + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${filename}-${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

