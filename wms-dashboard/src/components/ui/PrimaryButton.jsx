export function PrimaryButton({ children, icon: Icon, onClick, type = "button", disabled = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-3.5 py-2 rounded-md transition-colors ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      }`}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}
