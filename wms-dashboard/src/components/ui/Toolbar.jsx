export function Toolbar({ children, action, className = "", innerClassName = "" }) {
  return (
    <div className={`flex items-center justify-between mb-4 gap-2.5 flex-wrap ${className}`}>
      <div className={`flex items-center gap-2 flex-1 min-w-0 flex-wrap ${innerClassName}`}>{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
