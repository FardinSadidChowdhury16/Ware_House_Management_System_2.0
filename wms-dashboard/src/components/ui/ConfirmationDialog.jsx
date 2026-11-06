import React, { useEffect } from "react";
import { AlertTriangle, AlertCircle, HelpCircle, CheckCircle2, X } from "lucide-react";

export function ConfirmationDialog({ config, onConfirm, onCancel }) {
  const {
    title = "Confirm Action",
    message = "Are you sure you want to proceed with this action?",
    details = null,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "primary",
  } = config || {};

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const variantConfig = {
    danger: {
      icon: AlertTriangle,
      iconContainer: "bg-rose-50 text-rose-600 border-rose-200",
      confirmBtn: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500",
    },
    warning: {
      icon: AlertCircle,
      iconContainer: "bg-amber-50 text-amber-600 border-amber-200",
      confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
    },
    success: {
      icon: CheckCircle2,
      iconContainer: "bg-emerald-50 text-emerald-600 border-emerald-200",
      confirmBtn: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500",
    },
    primary: {
      icon: HelpCircle,
      iconContainer: "bg-slate-100 text-slate-800 border-slate-200",
      confirmBtn: "bg-slate-900 hover:bg-slate-800 text-white focus:ring-slate-700",
    },
  };

  const currentVariant = variantConfig[variant] || variantConfig.primary;
  const IconComponent = currentVariant.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px] transition-all animate-fadeIn"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon, Title, and Close */}
        <div className="p-5 pb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${currentVariant.iconContainer}`}
            >
              <IconComponent size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 leading-snug">
                {title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Please confirm to continue</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message Body */}
        <div className="px-5 pb-5 pt-1 space-y-3">
          <p className="text-sm text-slate-600 leading-relaxed font-normal">
            {message}
          </p>

          {/* Optional detail card */}
          {details && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed">
              {typeof details === "string" ? details : <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(details, null, 2)}</pre>}
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 cursor-pointer ${currentVariant.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

