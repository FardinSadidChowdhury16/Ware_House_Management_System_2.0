import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  X,
  FileCheck,
  ChevronRight,
  Info,
} from "lucide-react";
import { Modal } from "../../../components/ui/Modal.jsx";
import { PrimaryButton, GhostButton } from "../../../components/ui/index.js";
import { parseCSV } from "../../../shared/utils/csvParser.js";
import { productsApi } from "../api/productsApi.js";

function getPreviewField(row, type) {
  if (!row || typeof row !== "object") return "—";
  const normMap = {};
  for (const [k, v] of Object.entries(row)) {
    const cleanK = String(k).toLowerCase().replace(/[^a-z0-9]/g, "");
    normMap[cleanK] = v;
  }

  if (type === "id") return normMap["id"] || "—";
  if (type === "name") {
    return (
      normMap["nameserialnumber"] ||
      normMap["serialnumber"] ||
      normMap["name"] ||
      normMap["serial"] ||
      normMap["itemname"] ||
      "—"
    );
  }
  if (type === "barcode") {
    return normMap["barcode"] || normMap["itembarcode"] || "—";
  }
  if (type === "cost") {
    for (const [k, v] of Object.entries(normMap)) {
      if (k.includes("cost") || k.includes("purchase")) return v || "—";
    }
    return "—";
  }
  if (type === "selling") {
    for (const [k, v] of Object.entries(normMap)) {
      if (k.includes("sell") || k.includes("sale") || k === "price") return v || "—";
    }
    return "—";
  }
  if (type === "status") {
    for (const [k, v] of Object.entries(normMap)) {
      if (k.includes("status") && !k.includes("stock")) return v || "—";
    }
    return "—";
  }
  return "—";
}

export function BatchUpdateVariantsModal({
  isOpen = true,
  onClose,
  selectedProduct,
  onSuccess,
  onDownloadTemplate,
}) {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
  };

  const processFile = (fileObj) => {
    setParseError("");
    setResult(null);

    if (!fileObj.name.toLowerCase().endsWith(".csv")) {
      setParseError("Please upload a valid .csv file.");
      return;
    }

    setFile(fileObj);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const rows = parseCSV(text);
        if (!rows || rows.length === 0) {
          setParseError("The uploaded CSV is empty or has no data rows.");
          setParsedRows([]);
          return;
        }
        setParsedRows(rows);
      } catch (err) {
        console.error("CSV parse error:", err);
        setParseError("Failed to parse CSV file: " + (err.message || "Unknown error"));
        setParsedRows([]);
      }
    };
    reader.onerror = () => {
      setParseError("Failed to read file.");
      setParsedRows([]);
    };
    reader.readAsText(fileObj);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setParseError("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!selectedProduct?.id || parsedRows.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await productsApi.batchUpdateVariants(selectedProduct.id, parsedRows);
      setResult(res);
      if (typeof onSuccess === "function") {
        onSuccess();
      }
    } catch (err) {
      console.error("Batch update error:", err);
      const detail = err?.response?.data?.detail || err.message || "Batch update failed";
      setParseError(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Batch Update Product Items"
      size="3xl"
    >
      <div className="space-y-4">
        {/* Product Context Banner */}
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Target Product:</span>
            <strong className="text-slate-900 font-semibold">{selectedProduct?.name}</strong>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Tracking: {selectedProduct?.tracking}</span>
          </div>

          {onDownloadTemplate && (
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
              title="Download current items in CSV format to edit"
            >
              <Download size={13} />
              <span>Download Current CSV Template</span>
            </button>
          )}
        </div>

        {/* ── STEP 1 & 2: UPLOAD & PREVIEW (When not yet submitted) ── */}
        {!result && (
          <div className="space-y-4">
            {/* Dropzone */}
            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-amber-500 bg-amber-50/50"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                  <UploadCloud size={24} />
                </div>
                <p className="text-sm font-semibold text-slate-800 mb-1">
                  Click to upload or drag &amp; drop edited CSV file
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Upload the CSV you downloaded via Export CSV with your updated prices, dates, serial numbers, or statuses.
                </p>
              </div>
            ) : (
              /* Selected File Card */
              <div className="p-3.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB &bull;{" "}
                      <span className="text-emerald-700 font-medium">
                        {parsedRows.length} item rows parsed
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                  title="Choose different file"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Parse Error Notification */}
            {parseError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Preview of Parsed Rows */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Preview ({Math.min(5, parsedRows.length)} of {parsedRows.length} rows to update)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Items will be matched by ID or Barcode
                  </span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-48 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">ID</th>
                        <th className="p-2">Name / Serial Number</th>
                        <th className="p-2">Barcode</th>
                        <th className="p-2">Cost Price</th>
                        <th className="p-2">Selling Price</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {parsedRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2 text-slate-400">{idx + 1}</td>
                          <td className="p-2 font-semibold text-slate-800">
                            {getPreviewField(row, "id")}
                          </td>
                          <td className="p-2 font-sans font-medium text-slate-900">
                            {getPreviewField(row, "name")}
                          </td>
                          <td className="p-2 text-slate-600">
                            {getPreviewField(row, "barcode")}
                          </td>
                          <td className="p-2 text-slate-700">
                            {getPreviewField(row, "cost")}
                          </td>
                          <td className="p-2 text-slate-700">
                            {getPreviewField(row, "selling")}
                          </td>
                          <td className="p-2 font-sans">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                String(getPreviewField(row, "status")).toLowerCase() === "active"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {getPreviewField(row, "status")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-md border border-amber-200/70">
                  <Info size={13} className="shrink-0 text-amber-600" />
                  <span>
                    Items will be verified against this product. Any rows containing unknown items, new items, or format errors will be automatically flagged and rejected.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: RESULT & NOTIFICATIONS (After submitting) ── */}
        {result && (
          <div className="space-y-4">
            {/* If All Done (Zero Errors) */}
            {result.all_done ? (
              <div className="p-6 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-emerald-900">All Done!</h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    Successfully updated all <strong>{result.total_updated}</strong> product items with zero errors.
                  </p>
                </div>
              </div>
            ) : (
              /* If Errors / Rejected Rows Exist */
              <div className="space-y-4">
                {/* Status Badges Header */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <AlertCircle size={16} className="text-amber-500" />
                      <span>Update Completed with Exceptions</span>
                    </h4>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {result.total_updated} Updated
                      </span>
                      <span className="px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800 border border-red-200">
                        {result.total_failed} Rejected / Errors
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    {result.total_updated > 0
                      ? `Successfully updated ${result.total_updated} items. The following ${result.total_failed} items were rejected or contained invalid formats:`
                      : `No items were updated. All ${result.total_failed} rows were rejected due to the errors below:`}
                  </p>
                </div>

                {/* Error Rows Table */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700">Detailed Error Report:</p>
                  <div className="border border-red-200 rounded-lg overflow-x-auto max-h-60 text-xs bg-red-50/30">
                    <table className="w-full text-left">
                      <thead className="bg-red-50 border-b border-red-200 text-red-800 font-semibold">
                        <tr>
                          <th className="p-2 w-12">Row #</th>
                          <th className="p-2">Name / Serial Number</th>
                          <th className="p-2">Barcode</th>
                          <th className="p-2">Error Detail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {result.errors.map((err, i) => (
                          <tr key={i} className="hover:bg-red-50/50">
                            <td className="p-2 font-mono font-medium text-slate-500">
                              {err.row}
                            </td>
                            <td className="p-2 font-medium text-slate-900">
                              {err.serial_number || "—"}
                            </td>
                            <td className="p-2 font-mono text-slate-700">
                              {err.barcode || "—"}
                            </td>
                            <td className="p-2 text-red-700 font-medium">
                              <span className="inline-flex items-center gap-1">
                                <XCircle size={13} className="text-red-500 shrink-0" />
                                <span>{err.message}</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          {!result ? (
            <>
              <GhostButton onClick={onClose} disabled={isSubmitting}>
                Cancel
              </GhostButton>

              <PrimaryButton
                onClick={handleSubmit}
                disabled={parsedRows.length === 0 || isSubmitting}
                icon={isSubmitting ? Loader2 : FileCheck}
                className={isSubmitting ? "opacity-75 cursor-wait" : ""}
              >
                {isSubmitting
                  ? "Updating Items..."
                  : `Update ${parsedRows.length || 0} Items`}
              </PrimaryButton>
            </>
          ) : (
            <div className="w-full flex justify-end gap-2">
              <PrimaryButton onClick={onClose}>
                {result.all_done ? "Done" : "Done & View Items"}
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

