import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const STYLES = {
  success: {
    container: "bg-white border-emerald-200 text-slate-800 shadow-emerald-500/10",
    iconContainer: "text-emerald-600 bg-emerald-50 border-emerald-100",
    title: "text-emerald-950",
    progressBar: "bg-emerald-500",
  },
  error: {
    container: "bg-white border-rose-200 text-slate-800 shadow-rose-500/10",
    iconContainer: "text-rose-600 bg-rose-50 border-rose-100",
    title: "text-rose-950",
    progressBar: "bg-rose-500",
  },
  info: {
    container: "bg-white border-sky-200 text-slate-800 shadow-sky-500/10",
    iconContainer: "text-sky-600 bg-sky-50 border-sky-100",
    title: "text-sky-950",
    progressBar: "bg-sky-500",
  },
  warning: {
    container: "bg-white border-amber-200 text-slate-800 shadow-amber-500/10",
    iconContainer: "text-amber-600 bg-amber-50 border-amber-100",
    title: "text-amber-950",
    progressBar: "bg-amber-500",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = "info", title = "", message = "", duration = 3500 }) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      const newToast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const toastMethods = useMemo(() => {
    const success = (message, options = {}) =>
      showToast({ type: "success", message, ...options });
    const error = (message, options = {}) =>
      showToast({ type: "error", message, ...options });
    const info = (message, options = {}) =>
      showToast({ type: "info", message, ...options });
    const warning = (message, options = {}) =>
      showToast({ type: "warning", message, ...options });

    return {
      showToast,
      removeToast,
      success,
      error,
      info,
      warning,
      toast: { success, error, info, warning },
    };
  }, [showToast, removeToast]);

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}

      {/* Floating Toast Viewport */}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none transition-all duration-200"
      >
        {toasts.map((item) => {
          const Icon = ICONS[item.type] || Info;
          const style = STYLES[item.type] || STYLES.info;

          return (
            <div
              key={item.id}
              role="alert"
              className={`pointer-events-auto border rounded-xl shadow-lg p-3.5 flex items-start gap-3 bg-white/95 backdrop-blur-sm transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${style.container}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${style.iconContainer}`}
              >
                <Icon size={18} strokeWidth={2.2} />
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                {item.title ? (
                  <h4 className={`text-sm font-semibold mb-0.5 ${style.title}`}>
                    {item.title}
                  </h4>
                ) : null}
                <p className="text-xs text-slate-600 leading-relaxed break-words">
                  {item.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors shrink-0 -mr-1 -mt-1"
                aria-label="Close notification"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

