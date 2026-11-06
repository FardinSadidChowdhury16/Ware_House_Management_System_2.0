import React, { useState, useMemo } from "react";
import { X, Printer, Download, Copy, Sliders, Check } from "lucide-react";
import { BarcodeRenderer } from "../../../components/ui/BarcodeRenderer";

/**
 * BarcodeSheetModal
 * Displays all created/selected items as professional printable barcode stickers.
 * Supports direct printing (with thermal or A4 formatting) and downloading as an offline printable HTML file.
 */
export function BarcodeSheetModal({
  isOpen,
  onClose,
  productName = "Product",
  items = [], // [{ name, barcode, selling_price }]
}) {
  const [labelSize, setLabelSize] = useState("standard"); // 'standard' (50x25mm), 'compact' (38x25mm), 'a4' (grid)
  const [copiesPerItem, setCopiesPerItem] = useState(1);
  const [showPrice, setShowPrice] = useState(true);
  const [showItemName, setShowItemName] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  // Flatten items based on copies requested
  const expandedItems = useMemo(() => {
    const list = [];
    const validCopies = Math.max(1, Math.min(50, Number(copiesPerItem) || 1));
    (items || []).forEach((item) => {
      for (let i = 0; i < validCopies; i++) {
        list.push({ ...item, _copyIndex: i });
      }
    });
    return list;
  }, [items, copiesPerItem]);

  if (!isOpen) return null;

  // Function to download self-contained offline HTML print sheet
  const handleDownloadHtml = () => {
    const totalCount = expandedItems.length;
    const stickerHtml = expandedItems
      .map((item) => {
        const barcodeNum = item.barcode || "000000000000";
        const displayName = (item.name || productName || "Item").replace(/"/g, "&quot;");
        const priceText = showPrice ? `৳${Number(item.selling_price || 0).toLocaleString()}` : "";

        return `
          <div class="sticker sticker-${labelSize}">
            ${showItemName ? `<div class="sticker-title">${displayName}</div>` : ""}
            <div class="sticker-barcode">
              <svg class="jsbarcode" jsbarcode-value="${barcodeNum}" jsbarcode-format="CODE128" jsbarcode-height="38" jsbarcode-width="1.6" jsbarcode-displayvalue="false" jsbarcode-margin="0"></svg>
            </div>
            <div class="sticker-code">${barcodeNum}</div>
            ${showPrice ? `<div class="sticker-price">${priceText}</div>` : ""}
          </div>
        `;
      })
      .join("");

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Barcode Labels - ${productName}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; padding: 20px; color: #0f172a; }
    .no-print { background: #fff; padding: 12px 20px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
    .no-print h2 { font-size: 16px; }
    .no-print button { background: #0f172a; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; }
    .no-print button:hover { background: #1e293b; }
    .stickers-container { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-start; }
    .sticker { background: #fff; border: 1px dashed #94a3b8; border-radius: 6px; padding: 6px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: space-between; }
    .sticker-standard { width: 50mm; height: 28mm; }
    .sticker-compact { width: 40mm; height: 24mm; }
    .sticker-a4 { width: 63.5mm; height: 38.1mm; }
    .sticker-title { font-size: 10px; font-weight: 700; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .sticker-barcode { margin: 2px 0; }
    .sticker-barcode svg { max-width: 100%; height: auto; }
    .sticker-code { font-family: monospace; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; }
    .sticker-price { font-size: 10px; font-weight: 700; color: #0f172a; }
    @media print {
      body { background: #fff; padding: 0; }
      .no-print { display: none !important; }
      .stickers-container { gap: 0; }
      .sticker { border: 1px dotted #ccc; page-break-inside: avoid; }
      @page { margin: 5mm; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div>
      <h2>${productName} — ${totalCount} Barcode Labels</h2>
      <p style="font-size: 12px; color: #64748b;">Ready to print on sticker paper or thermal label rolls.</p>
    </div>
    <button onclick="window.print()">Print Now</button>
  </div>
  <div class="stickers-container">
    ${stickerHtml}
  </div>
  <script>
    window.onload = function() {
      JsBarcode(".jsbarcode").init();
    };
  </script>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `barcodes-${productName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "sheet"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-5xl max-h-[94vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded">
                BARCODE LABELS
              </span>
              <h3 className="text-base font-semibold text-white">
                {productName}
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Showing <strong>{expandedItems.length} label{expandedItems.length !== 1 ? "s" : ""}</strong> ({items.length} unique items &times; {copiesPerItem} {copiesPerItem === 1 ? "copy" : "copies"})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700 transition-colors"
              title="Download offline printable HTML file"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Download Sheet</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors shadow-sm"
              title="Print directly"
            >
              <Printer size={14} />
              <span>Print Labels</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Options Toolbar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Label Size */}
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-600">Label Size:</span>
              <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setLabelSize("standard")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    labelSize === "standard"
                      ? "bg-slate-800 text-white font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Standard (50&times;25mm)
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize("compact")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    labelSize === "compact"
                      ? "bg-slate-800 text-white font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Compact (38&times;25mm)
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize("a4")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    labelSize === "a4"
                      ? "bg-slate-800 text-white font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  A4 Grid Sheet
                </button>
              </div>
            </div>

            {/* Copies Multiplier */}
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-600">Copies/Item:</span>
              <input
                type="number"
                min="1"
                max="50"
                value={copiesPerItem}
                onChange={(e) => setCopiesPerItem(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-center text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
          </div>

          {/* Toggle Display Elements */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
              <input
                type="checkbox"
                checked={showItemName}
                onChange={(e) => setShowItemName(e.target.checked)}
                className="rounded border-slate-300 text-slate-800 focus:ring-slate-500"
              />
              <span>Show Name</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
                className="rounded border-slate-300 text-slate-800 focus:ring-slate-500"
              />
              <span>Show Price (৳)</span>
            </label>
          </div>
        </div>

        {/* Printable Area / Scrollable Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
          <div id="barcode-printable-area" className="barcode-print-canvas flex flex-wrap gap-3 justify-center items-start">
            {expandedItems.map((item, idx) => {
              const barcodeValue = item.barcode || "123456789012";
              const displayName = item.name || productName || "Item";

              // Size classes
              const sizeClasses =
                labelSize === "compact"
                  ? "w-[155px] min-h-[96px] p-2"
                  : labelSize === "a4"
                  ? "w-[240px] min-h-[140px] p-4"
                  : "w-[195px] min-h-[115px] p-2.5"; // standard

              const barcodeHeight = labelSize === "compact" ? 30 : labelSize === "a4" ? 48 : 38;
              const barcodeWidth = labelSize === "compact" ? 1.3 : labelSize === "a4" ? 1.8 : 1.5;

              return (
                <div
                  key={`${item.id || item.barcode}-${idx}`}
                  className={`bg-white rounded border border-slate-300 shadow-xs flex flex-col items-center justify-between text-center sticker-card ${sizeClasses}`}
                  style={{ breakInside: "avoid" }}
                >
                  {/* Top Item / Product Name */}
                  {showItemName && (
                    <div className="w-full text-[10px] font-bold text-slate-900 uppercase tracking-tight truncate px-0.5 leading-tight">
                      {displayName}
                    </div>
                  )}

                  {/* Scannable Real Barcode Lines */}
                  <div className="my-1 w-full flex items-center justify-center overflow-hidden">
                    <BarcodeRenderer
                      value={barcodeValue}
                      height={barcodeHeight}
                      width={barcodeWidth}
                      displayValue={false}
                      className="max-w-full"
                    />
                  </div>

                  {/* Barcode digits */}
                  <div className="font-mono text-[11px] font-semibold tracking-wider text-slate-900 leading-none">
                    {barcodeValue}
                  </div>

                  {/* Price Badge */}
                  {showPrice && (
                    <div className="mt-1 text-[11px] font-bold text-slate-800">
                      ৳{Number(item.selling_price || 0).toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500">
            Tip: For thermal roll printing, set <em>Margins: None</em> in the print dialog.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-md transition-colors shadow-xs"
            >
              <Printer size={14} />
              Print ({expandedItems.length} Stickers)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default BarcodeSheetModal;
