import { Package, ClipboardList, Wrench } from "lucide-react";
import { useMyWarehouseSummary } from "../../warehouses/hooks/useWarehouses.js";
import { useWarehouseFilter } from "../../../app/context/WarehouseFilterContext.jsx";

// ─── Stat Card ────────────────────────────────────────────────────────────────
const TINTS = {
  slate:   { bg: "bg-slate-50",   border: "border-slate-200", icon: "text-slate-500",  val: "text-slate-900"  },
  amber:   { bg: "bg-amber-50",   border: "border-amber-200", icon: "text-amber-500",  val: "text-amber-700"  },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-600", val: "text-emerald-800" },
};

function SummaryCard({ label, value, icon: Icon, tint = "slate", loading }) {
  const t = TINTS[tint] || TINTS.slate;
  return (
    <div className={`rounded-xl border ${t.border} ${t.bg} p-5 flex items-center gap-4`}>
      <div className={`p-2.5 rounded-lg bg-white border ${t.border} shadow-sm`}>
        <Icon size={20} className={t.icon} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        {loading ? (
          <div className="mt-1 h-7 w-20 bg-slate-200 animate-pulse rounded" />
        ) : (
          <p className={`text-2xl font-bold ${t.val} mt-0.5`}>
            {value?.toLocaleString() ?? "—"}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Overview Page ────────────────────────────────────────────────────────────
export function OverviewPage() {
  const { selectedWarehouseId, myWarehouses } = useWarehouseFilter();
  const { data, isLoading, isError } = useMyWarehouseSummary(selectedWarehouseId);

  const warehouses  = data?.warehouses?.length ? data.warehouses : myWarehouses;
  const currentWarehouseName = warehouses.find((w) => w.id === selectedWarehouseId)?.name;

  const totalStock  = isError ? "—" : data?.total_stock_units;
  const pending     = isError ? "—" : data?.pending_approvals;
  const underRepair = isError ? "—" : data?.under_repair;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Warehouse Overview</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {selectedWarehouseId
            ? `Showing data for: ${currentWarehouseName || "Selected warehouse"}`
            : "Showing combined data across all your assigned warehouses"}
        </p>
      </div>

      {/* ── 3 Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Stock Units"
          value={totalStock}
          icon={Package}
          tint="slate"
          loading={isLoading}
        />
        <SummaryCard
          label="Pending Approvals"
          value={pending}
          icon={ClipboardList}
          tint="amber"
          loading={isLoading}
        />
        <SummaryCard
          label="Under Repair"
          value={underRepair}
          icon={Wrench}
          tint="emerald"
          loading={isLoading}
        />
      </div>

      {/* ── Error state ── */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Could not load warehouse summary. Please check your connection and try again.
        </div>
      )}
    </div>
  );
}
