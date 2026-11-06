import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Loader2,
  Paperclip,
} from "lucide-react";
import { uploadApi } from "../../shared/api/uploadApi.js";

export function FileUploadField({
  value,
  onChange,
  folder = "attachments",
  label = "Attachment (Image or Document) — Optional",
  helperText = "Upload invoice, signed delivery slip, challan, or item photo (PDF, JPG, PNG, DOCX up to 25 MB)",
  disabled = false,
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);

  const isImage = (url, name) => {
    const target = (name || url || "").toLowerCase();
    return /\.(png|jpe?g|webp|gif|svg)$/i.test(target);
  };

  const isPdf = (url, name) => {
    const target = (name || url || "").toLowerCase();
    return /\.pdf$/i.test(target);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setIsUploading(true);
    setFileName(file.name);

    try {
      const res = await uploadApi.uploadFile(file, folder);
      if (onChange) {
        onChange(res.file_url, res);
      }
    } catch (err) {
      console.error("S3 upload failed:", err);
      const detail =
        err?.response?.data?.detail || err?.message || "Failed to upload file to S3";
      setUploadError(detail);
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setFileName("");
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onChange) {
      onChange(null);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
          <Paperclip size={13} className="text-slate-400" />
          <span>{label}</span>
        </label>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* When a file is already uploaded */}
      {value ? (
        <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              {isImage(value, fileName) ? (
                <ImageIcon size={16} />
              ) : isPdf(value, fileName) ? (
                <FileText size={16} />
              ) : (
                <Paperclip size={16} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-medium text-emerald-900 truncate">
                <span className="truncate max-w-[220px]">
                  {fileName || value.split("/").pop()}
                </span>
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              </div>
              <span className="text-[11px] text-emerald-700">Uploaded to AWS S3</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-medium transition-colors"
              title="Open document in new tab"
            >
              <span>View</span>
              <ExternalLink size={12} />
            </a>
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Remove attachment"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Upload trigger zone */
        <div
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          className={`border border-dashed rounded-lg p-3 text-center transition-all cursor-pointer ${
            disabled
              ? "bg-slate-50 border-slate-200 cursor-not-allowed opacity-60"
              : isUploading
              ? "bg-blue-50/50 border-blue-300 cursor-wait"
              : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-100/50"
          }`}
        >
          {isUploading ? (
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-blue-600 py-1">
              <Loader2 size={16} className="animate-spin text-blue-600" />
              <span>Uploading to AWS S3...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs text-slate-600 py-0.5">
              <UploadCloud size={16} className="text-slate-400" />
              <span className="font-medium text-slate-700 hover:text-blue-600">
                Click to attach image or document
              </span>
              <span className="text-slate-400 text-[11px]">(Optional)</span>
            </div>
          )}
        </div>
      )}

      {/* Error display */}
      {uploadError && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle size={13} className="shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Helper text */}
      {!uploadError && helperText && !value && (
        <p className="text-[11px] text-slate-400">{helperText}</p>
      )}
    </div>
  );
}

