export function GhostButton({ children, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 border border-slate-200 text-sm px-3 py-2 rounded-md text-slate-600 hover:bg-slate-50"
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}
