import { Card } from "./Card.jsx";

export function StatCard({ label, title, value, icon: Icon, tint = "slate", subtext }) {
  const tints = {
    slate: "bg-slate-900 text-white",
    amber: "bg-amber-500 text-white",
    emerald: "bg-emerald-600 text-white",
    red: "bg-red-500 text-white",
    blue: "bg-blue-600 text-white",
    purple: "bg-purple-600 text-white",
    indigo: "bg-indigo-600 text-white",
  };

  const textLabel = label ?? title;
  const isRenderableIcon = typeof Icon === "function" || (typeof Icon === "object" && Icon !== null);

  return (
    <Card className="p-4 flex items-center gap-3.5">
      {isRenderableIcon && (
        <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${tints[tint] || tints.slate}`}>
          <Icon size={18} />
        </div>
      )}
      <div>
        {textLabel && <p className="text-xs text-slate-500 dark:text-slate-400">{textLabel}</p>}
        <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 leading-tight">{value}</p>
        {subtext && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{subtext}</p>}
      </div>
    </Card>
  );
}
