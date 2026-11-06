export function Field({ label, children, className = "" }) {
  return (
    <div className={`w-full min-w-0 flex flex-col ${className}`}>
      {label && <label className="text-xs font-medium text-slate-600 block mb-1.5 truncate">{label}</label>}
      {children}
    </div>
  );
}
