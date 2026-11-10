import { X } from "lucide-react";
import { Card } from "./Card.jsx";

export function Modal({ isOpen, open, title, onClose, children, footer, size = "lg", className = "" }) {
  const isVisible = open !== undefined ? open : isOpen !== undefined ? isOpen : true;
  if (!isVisible) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    full: "max-w-5xl",
  };

  const maxWidthClass = sizeClasses[size] || sizeClasses.lg;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <Card className={`w-full ${maxWidthClass} p-5 max-h-[90vh] overflow-y-auto ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" aria-label="Close modal">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </Card>
    </div>
  );
}
