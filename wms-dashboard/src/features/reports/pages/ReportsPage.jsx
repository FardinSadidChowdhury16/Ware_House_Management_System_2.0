import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  ArrowLeftRight,
  AlertTriangle,
  TrendingDown,
  Building2,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Barcode,
  Layers,
  Package,
  Calendar,
  AlertCircle,
  Truck,
  UserCheck,
  Tag,
  Check,
  Copy,
  DollarSign,
  Filter,
  ArrowUpRight,
} from "lucide-react";
import {
  Badge,
  Card,
  StatCard,
  PrimaryButton,
  GhostButton,
  Th,
  Td,
  Toolbar,
  SearchBox,
  DateRangeFilter,
  FilterChips,
  EmptyTable,
  Modal,
  Pagination,
  ExportCSVButton,
} from "../../../components/ui/index.js";
import { useWarehouseFilter } from "../../../app/context/WarehouseFilterContext.jsx";
import { useInventory } from "../../inventory/hooks/useInventory.js";
import { inventoryApi } from "../../inventory/api/inventoryApi.js";
import { productsApi } from "../../products/api/productsApi.js";
import { formatBDDateTime, formatBDDate } from "../../../shared/utils/dateUtils.js";

// ─── Report Headers & Subtitles ───────────────────────────────────────────────
const REPORT_HEADERS = {
  stock_summary: {
    title: "Stock Summary",
    subtitle: "Real-time stock balance, on-hand inventory levels, and warehouse distribution.",
  },
  movement_report: {
    title: "Inventory Movement Report",
    subtitle: "Complete audit trail of inbound purchases, customer sales, and warehouse stock transfers.",
  },
  low_stock_report: {
    title: "Low Stock Report",
    subtitle: "Critical shortage items below minimum safety stock thresholds and reorder alerts.",
  },
  stock_sell_report: {
    title: "Stock Sell Report",
    subtitle: "Customer sales dispatches, delivery references, and sold quantity breakdown.",
  },
};

// ─── Movement Type Color Badge Helper ─────────────────────────────────────────
function MovementBadge({ type }) {
  const norm = String(type || "").toLowerCase();
  const map = {
    purchase_in: { color: "emerald", label: "Purchase In" },
    sale_out: { color: "rose", label: "Sale Out" },
    transfer_out: { color: "purple", label: "Transfer Out" },
    transfer_in: { color: "indigo", label: "Transfer In" },
    adjustment_in: { color: "amber", label: "Adjustment In" },
    adjustment_out: { color: "amber", label: "Adjustment Out" },
    return_in: { color: "blue", label: "Return In" },
    service_out: { color: "slate", label: "Service Out" },
    service_in: { color: "slate", label: "Service In" },
    replace_out: { color: "rose", label: "Replace Out" },
    replace_in: { color: "emerald", label: "Replace In" },
  };
  const item = map[norm] || { color: "slate", label: norm.replace("_", " ").toUpperCase() };
  return <Badge color={item.color}>{item.label}</Badge>;
}

// ─── Currency Formatter (Bangladeshi Taka ৳) ──────────────────────────────────
function formatBDT(amount) {
  const num = Number(amount) || 0;
  return `৳ ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Date Range Presets Helper ───────────────────────────────────────────────
function getDatePresetRange(preset) {
  const today = new Date();
  const format = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  if (preset === "today") {
    return { from: format(today), to: format(today) };
  }
  if (preset === "yesterday") {
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    return { from: format(yest), to: format(yest) };
  }
  if (preset === "last_7") {
    const past = new Date(today);
    past.setDate(past.getDate() - 6);
    return { from: format(past), to: format(today) };
  }
  if (preset === "this_month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: format(start), to: format(today) };
  }
  if (preset === "last_month") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: format(start), to: format(end) };
  }
  return { from: "", to: "" };
}

// ─── Product Stock Detail Modal ──────────────────────────────────────────────
function ProductDetailModal({ item, onClose }) {
  const [unitSearch, setUnitSearch] = useState("");
  const [copied, setCopied] = useState(null);

  if (!item) return null;

  const isSerialized = item.tracking_type === "serialized";
  const units = (item.serialized_items || []).filter(
    (u) =>
      !unitSearch.trim() ||
      (u.serial_number && u.serial_number.toLowerCase().includes(unitSearch.toLowerCase())) ||
      (u.barcode && u.barcode.toLowerCase().includes(unitSearch.toLowerCase())) ||
      (u.variant_name && u.variant_name.toLowerCase().includes(unitSearch.toLowerCase()))
  );

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Package className="text-blue-600" size={18} />
          <span>{item.product_name}</span>
          {item.product_code && (
            <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {item.product_code}
            </span>
          )}
        </div>
      }
      size="2xl"
    >
      <div className="space-y-4">
        {/* Quick Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div>
            <span className="text-slate-400 block mb-0.5">Category</span>
            <span className="font-semibold text-slate-800">{item.category_name || "General"}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Warehouse</span>
            <span className="font-semibold text-slate-800">{item.warehouse_name || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Tracking Mode</span>
            <span className="font-semibold text-indigo-700 capitalize">{item.tracking_type}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Available In Stock</span>
            <span className="font-bold font-mono text-emerald-700 text-sm">
              {item.in_stock_qty ?? 0} units
            </span>
          </div>
        </div>

        {/* Variant breakdown if available */}
        {item.variant_counts && Object.keys(item.variant_counts).length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Variant Breakdown
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(item.variant_counts).map(([vName, count]) => (
                <div key={vName} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs shadow-2xs">
                  <span className="font-medium text-slate-700">{vName}:</span>
                  <span className="font-bold font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Serial units table if serialized */}
        {isSerialized && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Serialized Units ({units.length})
              </h4>
              <div className="w-56">
                <input
                  type="text"
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder="Filter serials/barcodes..."
                  className="w-full text-xs px-2.5 py-1 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Serial Number</th>
                    <th className="py-2 px-3">Barcode</th>
                    <th className="py-2 px-3">Variant</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {units.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        No serialized units found matching filter.
                      </td>
                    </tr>
                  ) : (
                    units.map((u, idx) => (
                      <tr key={u.id || idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900">{u.serial_number}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{u.barcode || "—"}</td>
                        <td className="py-2 px-3 text-slate-700">{u.variant_name || "—"}</td>
                        <td className="py-2 px-3">
                          <span className="capitalize px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {u.status?.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleCopy(u.serial_number)}
                            className="text-slate-400 hover:text-blue-600 p-1"
                            title="Copy Serial Number"
                          >
                            {copied === u.serial_number ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <GhostButton onClick={onClose}>Close</GhostButton>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main ReportsPage Component ──────────────────────────────────────────────
export function ReportsPage({ initialReport = "stock_summary" }) {
  const { selectedWarehouseId, myWarehouses } = useWarehouseFilter();
  const location = useLocation();

  const getReportFromPath = (pathname) => {
    if (pathname.includes("inventory-movement")) return "movement_report";
    if (pathname.includes("low-stock")) return "low_stock_report";
    if (pathname.includes("stock-sell")) return "stock_sell_report";
    return "stock_summary";
  };

  // Active Report Option State (synced with route or initialReport)
  const [activeReport, setActiveReport] = useState(() => {
    if (location.pathname.startsWith("/reports/")) {
      return getReportFromPath(location.pathname);
    }
    return initialReport;
  });

  useEffect(() => {
    if (location.pathname.startsWith("/reports/")) {
      const matched = getReportFromPath(location.pathname);
      setActiveReport(matched);
    }
  }, [location.pathname]);

  // Detail Modal State
  const [detailItem, setDetailItem] = useState(null);

  // Active warehouse name
  const currentWh = useMemo(() => {
    if (!selectedWarehouseId) return null;
    return myWarehouses.find((w) => String(w.id) === String(selectedWarehouseId));
  }, [selectedWarehouseId, myWarehouses]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. STOCK SUMMARY & LOW STOCK DATA (from useInventory)
  // ─────────────────────────────────────────────────────────────────────────────
  const [stockSearch, setStockSearch] = useState("");
  const [stockTrackingFilter, setStockTrackingFilter] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [stockPage, setStockPage] = useState(1);
  const STOCK_PAGE_SIZE = 10;

  const { warehouseSummary, isSummaryLoading } = useInventory({
    warehouse_id: selectedWarehouseId ?? undefined,
  });

  const allStockItems = warehouseSummary?.items || [];
  const stockSummaryStats = warehouseSummary?.summary || {};

  // Filtered Stock Summary Items
  const filteredStockSummary = useMemo(() => {
    let list = allStockItems;
    if (stockTrackingFilter !== "all") {
      list = list.filter((it) => it.tracking_type === stockTrackingFilter);
    }
    if (stockStatusFilter === "in_stock") {
      list = list.filter((it) => (it.in_stock_qty || 0) > 0);
    } else if (stockStatusFilter === "out_of_stock") {
      list = list.filter((it) => (it.in_stock_qty || 0) === 0);
    }
    if (stockSearch.trim()) {
      const q = stockSearch.trim().toLowerCase();
      list = list.filter(
        (it) =>
          it.product_name?.toLowerCase().includes(q) ||
          it.product_code?.toLowerCase().includes(q) ||
          it.category_name?.toLowerCase().includes(q) ||
          it.warehouse_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allStockItems, stockTrackingFilter, stockStatusFilter, stockSearch]);

  const pagedStockItems = useMemo(() => {
    const start = (stockPage - 1) * STOCK_PAGE_SIZE;
    return filteredStockSummary.slice(start, start + STOCK_PAGE_SIZE);
  }, [filteredStockSummary, stockPage]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. INVENTORY MOVEMENT REPORT DATA (from backend /inventory/movements)
  // ─────────────────────────────────────────────────────────────────────────────
  const [movementSearch, setMovementSearch] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("");
  const [movementDateFrom, setMovementDateFrom] = useState("");
  const [movementDateTo, setMovementDateTo] = useState("");
  const [movementPage, setMovementPage] = useState(1);
  const MOVEMENT_PAGE_SIZE = 12;

  const movementParams = {
    page: movementPage,
    page_size: MOVEMENT_PAGE_SIZE,
    warehouse_id: selectedWarehouseId || undefined,
    movement_type: movementTypeFilter || undefined,
    date_from: movementDateFrom || undefined,
    date_to: movementDateTo || undefined,
    search: movementSearch.trim() || undefined,
  };

  const { data: movementData, isLoading: isMovementsLoading } = useQuery({
    queryKey: ["reports", "movements", movementParams],
    queryFn: () => inventoryApi.listMovements(movementParams),
    staleTime: 10 * 1000,
    keepPreviousData: true,
  });

  const movements = movementData?.items || [];
  const totalMovements = movementData?.total || 0;
  const movementTotalPages = movementData?.total_pages || 1;

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. LOW STOCK REPORT DATA
  // ─────────────────────────────────────────────────────────────────────────────
  const [lowStockSearch, setLowStockSearch] = useState("");
  const [lowStockSeverity, setLowStockSeverity] = useState("all"); // 'all' | 'out_of_stock' | 'low'
  const [lowStockThresholdMode, setLowStockThresholdMode] = useState("min_stock"); // 'min_stock' | '5' | '10'
  const [lowStockPage, setLowStockPage] = useState(1);
  const LOW_STOCK_PAGE_SIZE = 10;

  const lowStockItems = useMemo(() => {
    return allStockItems
      .map((it) => {
        const threshold =
          lowStockThresholdMode === "5"
            ? 5
            : lowStockThresholdMode === "10"
            ? 10
            : Number(it.min_stock_level) > 0
            ? Number(it.min_stock_level)
            : 5;
        const current = it.in_stock_qty || 0;
        const isOut = current === 0;
        const isLow = current <= threshold;
        const shortage = Math.max(0, threshold - current);
        return {
          ...it,
          threshold,
          shortage,
          isOut,
          isLow,
        };
      })
      .filter((it) => it.isLow)
      .filter((it) => {
        if (lowStockSeverity === "out_of_stock") return it.isOut;
        if (lowStockSeverity === "low") return !it.isOut && it.isLow;
        return true;
      })
      .filter((it) => {
        if (!lowStockSearch.trim()) return true;
        const q = lowStockSearch.trim().toLowerCase();
        return (
          it.product_name?.toLowerCase().includes(q) ||
          it.product_code?.toLowerCase().includes(q) ||
          it.category_name?.toLowerCase().includes(q) ||
          it.warehouse_name?.toLowerCase().includes(q)
        );
      });
  }, [allStockItems, lowStockThresholdMode, lowStockSeverity, lowStockSearch]);

  const pagedLowStockItems = useMemo(() => {
    const start = (lowStockPage - 1) * LOW_STOCK_PAGE_SIZE;
    return lowStockItems.slice(start, start + LOW_STOCK_PAGE_SIZE);
  }, [lowStockItems, lowStockPage]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. STOCK SELL REPORT DATA (sale_out movements & sales analytics)
  // ─────────────────────────────────────────────────────────────────────────────
  const [sellViewMode, setSellViewMode] = useState("item_summary"); // 'item_summary' | 'transactions' | 'category_breakdown'
  const [sellSearch, setSellSearch] = useState("");
  const [sellCategoryFilter, setSellCategoryFilter] = useState("");
  const [sellDatePreset, setSellDatePreset] = useState("all");
  const [sellDateFrom, setSellDateFrom] = useState("");
  const [sellDateTo, setSellDateTo] = useState("");
  const [sellPage, setSellPage] = useState(1);
  const SELL_PAGE_SIZE = 12;

  // Product categories for the filter
  const { data: productCategories = [] } = useQuery({
    queryKey: ["product-types-for-reports"],
    queryFn: () => productsApi.listProductTypes(),
    staleTime: 60 * 1000,
  });

  const sellParams = {
    page: sellPage,
    page_size: SELL_PAGE_SIZE,
    warehouse_id: selectedWarehouseId || undefined,
    category_id: sellCategoryFilter ? Number(sellCategoryFilter) : undefined,
    date_from: sellDateFrom || undefined,
    date_to: sellDateTo || undefined,
    search: sellSearch.trim() || undefined,
  };

  const { data: salesReportData, isLoading: isSellLoading } = useQuery({
    queryKey: ["reports", "sales-report", sellParams],
    queryFn: () => inventoryApi.getSalesReport(sellParams),
    staleTime: 10 * 1000,
    keepPreviousData: true,
  });

  const salesSummary = salesReportData?.summary || {
    total_sales_amount: 0,
    total_units_sold: 0,
    total_products_sold: 0,
    total_transactions: 0,
    top_category: "—",
    top_product: "—",
  };

  const productBreakdown = salesReportData?.product_breakdown || [];
  const categoryBreakdown = salesReportData?.category_breakdown || [];
  const sellItems = salesReportData?.transactions?.items || [];
  const totalSales = salesReportData?.transactions?.total || 0;
  const sellTotalPages = salesReportData?.transactions?.total_pages || 1;

  const handleDatePreset = (presetId) => {
    setSellDatePreset(presetId);
    const range = getDatePresetRange(presetId);
    setSellDateFrom(range.from);
    setSellDateTo(range.to);
    setSellPage(1);
  };

  return (
    <div className="space-y-6">
      {/* ─── Page Title & Subtitle ─── */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {REPORT_HEADERS[activeReport]?.title || "Warehouse Report"}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {REPORT_HEADERS[activeReport]?.subtitle || "Detailed warehouse reporting metrics and audit records."}
        </p>
      </div>

      {/* Scoped Warehouse Indicator if warehouse filter is selected */}
      {currentWh && (
        <div className="flex items-center gap-2 px-3.5 py-2 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-medium text-blue-800 dark:text-blue-200">
          <Building2 size={15} className="shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            Active Warehouse Scope: <strong>{currentWh.name}</strong> ({currentWh.code || "WH"}) — all report tables are filtered to this location.
          </span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* OPTION 1: STOCK SUMMARY REPORT                                         */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeReport === "stock_summary" && (
        <div className="space-y-4">
          {/* Summary StatCards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Catalog Products"
              value={isSummaryLoading ? "..." : stockSummaryStats.total_products || allStockItems.length}
              icon={Boxes}
              tint="blue"
            />
            <StatCard
              label="Total In-Stock Units"
              value={isSummaryLoading ? "..." : stockSummaryStats.total_in_stock ?? 0}
              icon={Package}
              tint="emerald"
            />
            <StatCard
              label="Total Inbound Received"
              value={isSummaryLoading ? "..." : stockSummaryStats.total_stock_in ?? stockSummaryStats.total_received ?? 0}
              icon={TrendingDown}
              tint="purple"
            />
            <StatCard
              label="Total Outbound Dispatched"
              value={isSummaryLoading ? "..." : stockSummaryStats.total_stock_out ?? stockSummaryStats.total_customer ?? 0}
              icon={ArrowLeftRight}
              tint="amber"
            />
          </div>

          {/* Toolbar */}
          <Toolbar
            action={
              <ExportCSVButton
                filename="Stock_Summary_Report"
                data={filteredStockSummary}
                columns={[
                  { label: "Product ID", key: "product_id" },
                  { label: "Product Name", key: "product_name" },
                  { label: "Product Code", key: "product_code" },
                  { label: "Category", key: "category_name" },
                  { label: "Tracking Type", key: "tracking_type" },
                  { label: "Warehouse", key: "warehouse_name" },
                  { label: "Current In-Stock", key: "in_stock_qty" },
                  { label: "Total Stock In", key: "stock_in_qty" },
                  { label: "Total Stock Out", key: "stock_out_qty" },
                  { label: "Transfers In", key: "transfer_in_qty" },
                  { label: "Transfers Out", key: "transfer_out_qty" },
                ]}
              />
            }
          >
            <SearchBox
              placeholder="Search products by name, code, category..."
              value={stockSearch}
              onChange={(v) => { setStockSearch(v); setStockPage(1); }}
            />
            <FilterChips
              options={[
                { label: "All Modes", value: "all" },
                { label: "Serialized", value: "serialized" },
                { label: "Bulk", value: "bulk" },
              ]}
              value={stockTrackingFilter}
              onChange={(v) => { setStockTrackingFilter(v); setStockPage(1); }}
            />
            <FilterChips
              options={[
                { label: "All Stock", value: "all" },
                { label: "In Stock (>0)", value: "in_stock" },
                { label: "Out of Stock (0)", value: "out_of_stock" },
              ]}
              value={stockStatusFilter}
              onChange={(v) => { setStockStatusFilter(v); setStockPage(1); }}
            />
          </Toolbar>

          {/* Table Card */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th className="w-12">#</Th>
                    <Th>Product Name &amp; Code</Th>
                    <Th>Category</Th>
                    <Th>Tracking</Th>
                    <Th>Warehouse</Th>
                    <Th className="text-right">In Stock</Th>
                    <Th className="text-right">Stock In</Th>
                    <Th className="text-right">Stock Out</Th>
                    <Th className="text-center">Transfers</Th>
                    <Th className="text-right">Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {isSummaryLoading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-sm text-slate-400">
                        Loading stock summary report...
                      </td>
                    </tr>
                  ) : filteredStockSummary.length === 0 ? (
                    <EmptyTable cols={10} message="No stock summary records found." />
                  ) : (
                    pagedStockItems.map((item, idx) => (
                      <tr key={`${item.product_id}-${item.warehouse_id}-${idx}`} className="hover:bg-slate-50/60">
                        <Td mono className="text-xs text-slate-400">
                          {(stockPage - 1) * STOCK_PAGE_SIZE + idx + 1}
                        </Td>
                        <Td>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">
                              {item.product_name}
                            </div>
                            {item.product_code && (
                              <span className="text-[11px] font-mono text-slate-500">
                                {item.product_code}
                              </span>
                            )}
                          </div>
                        </Td>
                        <Td>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-700 font-medium">
                            <Tag size={12} className="text-slate-400" />
                            {item.category_name || "General"}
                          </span>
                        </Td>
                        <Td>
                          <Badge color={item.tracking_type === "serialized" ? "blue" : "emerald"}>
                            {item.tracking_type}
                          </Badge>
                        </Td>
                        <Td>
                          <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                            <Building2 size={12} className="text-slate-400" />
                            {item.warehouse_name}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <span
                            className={`font-mono font-bold text-sm ${
                              (item.in_stock_qty || 0) > 0 ? "text-emerald-700" : "text-rose-600"
                            }`}
                          >
                            {item.in_stock_qty ?? 0}
                          </span>
                        </Td>
                        <Td className="text-right font-mono text-xs text-slate-600">
                          +{item.stock_in_qty ?? 0}
                        </Td>
                        <Td className="text-right font-mono text-xs text-slate-600">
                          -{item.stock_out_qty ?? 0}
                        </Td>
                        <Td className="text-center font-mono text-xs text-slate-500">
                          +{item.transfer_in_qty || 0} / -{item.transfer_out_qty || 0}
                        </Td>
                        <Td className="text-right">
                          <button
                            type="button"
                            onClick={() => setDetailItem(item)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md transition-colors"
                          >
                            <Eye size={12} />
                            Details
                          </button>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={stockPage}
              pageSize={STOCK_PAGE_SIZE}
              total={filteredStockSummary.length}
              totalPages={Math.ceil(filteredStockSummary.length / STOCK_PAGE_SIZE) || 1}
              onPageChange={setStockPage}
              itemName="products"
            />
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* OPTION 2: INVENTORY MOVEMENT REPORT                                    */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeReport === "movement_report" && (
        <div className="space-y-4">
          {/* Movement Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Transactions"
              value={isMovementsLoading ? "..." : totalMovements}
              icon={ArrowLeftRight}
              tint="indigo"
            />
            <StatCard
              label="Page Items"
              value={movements.length}
              icon={Package}
              tint="blue"
            />
            <StatCard
              label="Active Filter"
              value={movementTypeFilter ? movementTypeFilter.replace("_", " ").toUpperCase() : "All Types"}
              icon={Layers}
              tint="slate"
            />
            <StatCard
              label="Warehouse Scope"
              value={currentWh ? currentWh.name : "All Warehouses"}
              icon={Building2}
              tint="emerald"
            />
          </div>

          {/* Toolbar */}
          <Toolbar
            action={
              <ExportCSVButton
                filename="Inventory_Movement_Report"
                data={movements}
                columns={[
                  { label: "Movement ID", key: "id" },
                  { label: "Date & Time", value: (m) => formatBDDateTime(m.created_at) },
                  { label: "Movement Type", key: "movement_type" },
                  { label: "Product Name", key: "product_name" },
                  { label: "Product Code", key: "product_code" },
                  { label: "Variant / SKU", value: (m) => m.variant_name || m.variant_sku || "—" },
                  { label: "Serial / Barcode", value: (m) => m.serial_number || m.barcode || "—" },
                  { label: "Quantity", key: "quantity" },
                  { label: "From Warehouse", key: "from_warehouse_name" },
                  { label: "To Warehouse", key: "to_warehouse_name" },
                  { label: "Party", value: (m) => m.customer_name || m.supplier_name || "—" },
                  { label: "Reference #", key: "reference_number" },
                  { label: "Logged By", key: "created_by_name" },
                  { label: "Note", key: "note" },
                ]}
              />
            }
          >
            <SearchBox
              placeholder="Search by product, serial, reference #, note..."
              value={movementSearch}
              onChange={(v) => { setMovementSearch(v); setMovementPage(1); }}
            />
            <DateRangeFilter
              fromDate={movementDateFrom}
              toDate={movementDateTo}
              onFromDateChange={(v) => { setMovementDateFrom(v); setMovementPage(1); }}
              onToDateChange={(v) => { setMovementDateTo(v); setMovementPage(1); }}
            />
            <FilterChips
              options={[
                { label: "All Movements", value: "" },
                { label: "Purchase In", value: "purchase_in" },
                { label: "Sale Out", value: "sale_out" },
                { label: "Transfer In", value: "transfer_in" },
                { label: "Transfer Out", value: "transfer_out" },
                { label: "Adjustment", value: "adjustment_in" },
                { label: "Return In", value: "return_in" },
              ]}
              value={movementTypeFilter}
              onChange={(v) => { setMovementTypeFilter(v); setMovementPage(1); }}
            />
          </Toolbar>

          {/* Table Card */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th className="w-16">ID</Th>
                    <Th>Date &amp; Time</Th>
                    <Th>Type</Th>
                    <Th>Product &amp; SKU</Th>
                    <Th>Serial / Barcode</Th>
                    <Th className="text-right">Qty</Th>
                    <Th>Movement Route</Th>
                    <Th>Party / Reference</Th>
                    <Th>Logged By</Th>
                  </tr>
                </thead>
                <tbody>
                  {isMovementsLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-sm text-slate-400">
                        Loading inventory movements ledger...
                      </td>
                    </tr>
                  ) : movements.length === 0 ? (
                    <EmptyTable cols={9} message="No stock movements found matching filter." />
                  ) : (
                    movements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60">
                        <Td mono className="text-xs text-slate-400">
                          #{m.id}
                        </Td>
                        <Td className="text-xs text-slate-600 whitespace-nowrap">
                          {formatBDDateTime(m.created_at)}
                        </Td>
                        <Td>
                          <MovementBadge type={m.movement_type} />
                        </Td>
                        <Td>
                          <div className="text-sm font-semibold text-slate-800">
                            {m.product_name || `Product #${m.product_id}`}
                          </div>
                          {(m.variant_name || m.variant_sku) && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              {m.variant_name || m.variant_sku}
                            </span>
                          )}
                        </Td>
                        <Td mono className="text-xs text-slate-700">
                          {m.serial_number ? (
                            <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60">
                              SN: {m.serial_number}
                            </span>
                          ) : m.barcode ? (
                            <span>Bar: {m.barcode}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </Td>
                        <Td className="text-right font-mono font-bold text-sm text-slate-900">
                          {m.quantity}
                        </Td>
                        <Td className="text-xs text-slate-700">
                          {m.from_warehouse_name && m.to_warehouse_name ? (
                            <span>
                              {m.from_warehouse_name} → <strong>{m.to_warehouse_name}</strong>
                            </span>
                          ) : m.from_warehouse_name ? (
                            <span>From {m.from_warehouse_name}</span>
                          ) : m.to_warehouse_name ? (
                            <span>To {m.to_warehouse_name}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </Td>
                        <Td className="text-xs">
                          {m.customer_name ? (
                            <span className="font-medium text-slate-800 flex items-center gap-1">
                              <UserCheck size={12} className="text-slate-400" />
                              {m.customer_name}
                            </span>
                          ) : m.supplier_name ? (
                            <span className="font-medium text-slate-800 flex items-center gap-1">
                              <Truck size={12} className="text-slate-400" />
                              {m.supplier_name}
                            </span>
                          ) : null}
                          {m.reference_number && (
                            <span className="block font-mono text-[11px] text-slate-500">
                              Ref: {m.reference_number}
                            </span>
                          )}
                        </Td>
                        <Td className="text-xs text-slate-500">
                          {m.created_by_name || "System"}
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={movementPage}
              pageSize={MOVEMENT_PAGE_SIZE}
              total={totalMovements}
              totalPages={movementTotalPages}
              onPageChange={setMovementPage}
              itemName="movements"
            />
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* OPTION 3: LOW STOCK REPORT                                             */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeReport === "low_stock_report" && (
        <div className="space-y-4">
          {/* Low Stock Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Low Stock Items"
              value={isSummaryLoading ? "..." : lowStockItems.length}
              icon={AlertTriangle}
              tint="amber"
            />
            <StatCard
              label="Out of Stock (0 units)"
              value={isSummaryLoading ? "..." : lowStockItems.filter((i) => i.isOut).length}
              icon={XCircle}
              tint="red"
            />
            <StatCard
              label="Low Stock Warning"
              value={isSummaryLoading ? "..." : lowStockItems.filter((i) => !i.isOut).length}
              icon={AlertCircle}
              tint="amber"
            />
            <StatCard
              label="Threshold Criterion"
              value={
                lowStockThresholdMode === "min_stock"
                  ? "Product Min Level"
                  : `≤ ${lowStockThresholdMode} units`
              }
              icon={Tag}
              tint="slate"
            />
          </div>

          {/* Toolbar */}
          <Toolbar
            action={
              <ExportCSVButton
                filename="Low_Stock_Requisition_Report"
                data={lowStockItems}
                columns={[
                  { label: "Product ID", key: "product_id" },
                  { label: "Product Name", key: "product_name" },
                  { label: "Product Code", key: "product_code" },
                  { label: "Category", key: "category_name" },
                  { label: "Warehouse", key: "warehouse_name" },
                  { label: "Current In-Stock", key: "in_stock_qty" },
                  { label: "Threshold Level", key: "threshold" },
                  { label: "Reorder Deficit", key: "shortage" },
                  { label: "Tracking Type", key: "tracking_type" },
                  { label: "Urgency", value: (i) => (i.isOut ? "OUT OF STOCK" : "LOW STOCK WARNING") },
                ]}
              />
            }
          >
            <SearchBox
              placeholder="Search low stock items..."
              value={lowStockSearch}
              onChange={(v) => { setLowStockSearch(v); setLowStockPage(1); }}
            />
            <FilterChips
              options={[
                { label: "All Low Stock", value: "all" },
                { label: "Out of Stock (0)", value: "out_of_stock" },
                { label: "Warning Alert", value: "low" },
              ]}
              value={lowStockSeverity}
              onChange={(v) => { setLowStockSeverity(v); setLowStockPage(1); }}
            />
            <FilterChips
              options={[
                { label: "Min Stock Rule", value: "min_stock" },
                { label: "≤ 5 Units", value: "5" },
                { label: "≤ 10 Units", value: "10" },
              ]}
              value={lowStockThresholdMode}
              onChange={(v) => { setLowStockThresholdMode(v); setLowStockPage(1); }}
            />
          </Toolbar>

          {/* Table Card */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th className="w-12">#</Th>
                    <Th>Product &amp; Code</Th>
                    <Th>Category</Th>
                    <Th>Warehouse</Th>
                    <Th className="text-right">Available Stock</Th>
                    <Th className="text-right">Threshold</Th>
                    <Th className="text-right">Reorder Need</Th>
                    <Th className="text-center">Severity</Th>
                    <Th className="text-right">Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {isSummaryLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-sm text-slate-400">
                        Scanning inventory for low stock items...
                      </td>
                    </tr>
                  ) : lowStockItems.length === 0 ? (
                    <EmptyTable cols={9} message="Great news! No products are currently below reorder thresholds." />
                  ) : (
                    pagedLowStockItems.map((item, idx) => (
                      <tr key={`${item.product_id}-${item.warehouse_id}-${idx}`} className="hover:bg-slate-50/60">
                        <Td mono className="text-xs text-slate-400">
                          {(lowStockPage - 1) * LOW_STOCK_PAGE_SIZE + idx + 1}
                        </Td>
                        <Td>
                          <div className="font-semibold text-slate-900 text-sm">
                            {item.product_name}
                          </div>
                          {item.product_code && (
                            <span className="text-[11px] font-mono text-slate-500">
                              {item.product_code}
                            </span>
                          )}
                        </Td>
                        <Td>
                          <span className="text-xs text-slate-700">{item.category_name || "General"}</span>
                        </Td>
                        <Td>
                          <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                            <Building2 size={12} className="text-slate-400" />
                            {item.warehouse_name}
                          </span>
                        </Td>
                        <Td className="text-right font-mono font-bold text-sm">
                          {item.isOut ? (
                            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              0 units
                            </span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {item.in_stock_qty} units
                            </span>
                          )}
                        </Td>
                        <Td className="text-right font-mono text-xs text-slate-600">
                          {item.threshold} units
                        </Td>
                        <Td className="text-right font-mono font-bold text-xs text-rose-600">
                          +{item.shortage} units
                        </Td>
                        <Td className="text-center">
                          {item.isOut ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <XCircle size={12} /> Out of Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <AlertTriangle size={12} /> Low Stock
                            </span>
                          )}
                        </Td>
                        <Td className="text-right">
                          <button
                            type="button"
                            onClick={() => setDetailItem(item)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md transition-colors"
                          >
                            <Eye size={12} />
                            Details
                          </button>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={lowStockPage}
              pageSize={LOW_STOCK_PAGE_SIZE}
              total={lowStockItems.length}
              totalPages={Math.ceil(lowStockItems.length / LOW_STOCK_PAGE_SIZE) || 1}
              onPageChange={setLowStockPage}
              itemName="shortage items"
            />
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* OPTION 4: STOCK SELL REPORT                                            */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeReport === "stock_sell_report" && (
        <div className="space-y-4">
          {/* 1. Sales Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <StatCard
              label="Total Sales Value"
              value={isSellLoading ? "..." : formatBDT(salesSummary.total_sales_amount)}
              icon={DollarSign}
              tint="emerald"
            />
            <StatCard
              label="Total Units Sold"
              value={isSellLoading ? "..." : `${salesSummary.total_units_sold} units`}
              icon={Package}
              tint="blue"
            />
            <StatCard
              label="Distinct Items Sold"
              value={isSellLoading ? "..." : `${salesSummary.total_products_sold} items`}
              icon={Boxes}
              tint="purple"
            />
            <StatCard
              label="Sales Orders / Invoices"
              value={isSellLoading ? "..." : `${salesSummary.total_transactions} orders`}
              icon={TrendingDown}
              tint="indigo"
            />
            <StatCard
              label="Top Category"
              value={isSellLoading ? "..." : salesSummary.top_category || "—"}
              icon={Layers}
              tint="amber"
            />
          </div>

          {/* 2. Date Presets Quick Filter Chips */}
          <div className="flex items-center flex-wrap gap-1.5 p-2 bg-slate-100/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="text-slate-500 font-semibold px-2 flex items-center gap-1">
              <Calendar size={13} /> Quick Period:
            </span>
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "last_7", label: "Last 7 Days" },
              { id: "this_month", label: "This Month" },
              { id: "last_month", label: "Last Month" },
            ].map((preset) => {
              const active = sellDatePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleDatePreset(preset.id)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    active
                      ? "bg-emerald-600 text-white shadow-2xs font-semibold"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 border border-slate-200/60 dark:border-slate-700"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* 3. Toolbar: Search, Category Filter, Custom Date Pickers, & CSV Export */}
          <Toolbar
            action={
              <div className="flex items-center gap-2">
                {sellViewMode === "item_summary" ? (
                  <ExportCSVButton
                    filename={`Stock_Sell_Item_Summary_${sellDateFrom || "all"}_to_${sellDateTo || "now"}`}
                    data={productBreakdown}
                    columns={[
                      { label: "Product ID", key: "product_id" },
                      { label: "Product Name", key: "product_name" },
                      { label: "Product Code / SKU", key: "product_code" },
                      { label: "Category", key: "category_name" },
                      { label: "Tracking Type", key: "tracking_type" },
                      { label: "Unit Selling Price (BDT)", key: "unit_price" },
                      { label: "Total Units Sold", key: "total_units_sold" },
                      { label: "Total Sales Amount (BDT)", key: "total_sales_value" },
                      { label: "Warehouses", value: (p) => (p.warehouse_names || []).join(", ") },
                    ]}
                  />
                ) : (
                  <ExportCSVButton
                    filename={`Stock_Sell_Orders_${sellDateFrom || "all"}_to_${sellDateTo || "now"}`}
                    data={sellItems}
                    columns={[
                      { label: "Dispatch ID", key: "id" },
                      { label: "Date & Time", value: (s) => formatBDDateTime(s.created_at) },
                      { label: "Invoice / Reference #", key: "reference_number" },
                      { label: "Customer Name", key: "customer_name" },
                      { label: "Product Name", key: "product_name" },
                      { label: "Product Code", key: "product_code" },
                      { label: "Category", key: "category_name" },
                      { label: "Variant / SKU", value: (s) => s.variant_name || s.variant_sku || "—" },
                      { label: "Serial / Barcode", value: (s) => s.serial_number || s.barcode || "—" },
                      { label: "Quantity Dispatched", key: "quantity" },
                      { label: "Unit Price (BDT)", key: "unit_price" },
                      { label: "Total Price (BDT)", key: "total_price" },
                      { label: "Source Warehouse", key: "from_warehouse_name" },
                      { label: "Sales Agent", key: "created_by_name" },
                      { label: "Delivery Note", key: "note" },
                    ]}
                  />
                )}
              </div>
            }
          >
            <SearchBox
              placeholder="Search product, SKU, invoice, customer..."
              value={sellSearch}
              onChange={(v) => { setSellSearch(v); setSellPage(1); }}
            />

            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-slate-400 shrink-0" />
              <select
                value={sellCategoryFilter}
                onChange={(e) => {
                  setSellCategoryFilter(e.target.value);
                  setSellPage(1);
                }}
                className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">All Categories</option>
                {productCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Date Range Filter */}
            <DateRangeFilter
              fromDate={sellDateFrom}
              toDate={sellDateTo}
              onFromDateChange={(v) => {
                setSellDateFrom(v);
                setSellDatePreset("custom");
                setSellPage(1);
              }}
              onToDateChange={(v) => {
                setSellDateTo(v);
                setSellDatePreset("custom");
                setSellPage(1);
              }}
            />
          </Toolbar>

          {/* 4. View Mode Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
            <button
              type="button"
              onClick={() => setSellViewMode("item_summary")}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                sellViewMode === "item_summary"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              📊 Item &amp; Category Summary ({productBreakdown.length} items sold)
            </button>
            <button
              type="button"
              onClick={() => setSellViewMode("transactions")}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                sellViewMode === "transactions"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              🧾 Sales Orders &amp; Dispatches ({totalSales} records)
            </button>
            <button
              type="button"
              onClick={() => setSellViewMode("category_breakdown")}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                sellViewMode === "category_breakdown"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              📑 Category Breakdown ({categoryBreakdown.length} categories)
            </button>
          </div>

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* TAB 1: ITEM & CATEGORY SUMMARY TABLE (User's primary requirement)   */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {sellViewMode === "item_summary" && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <Th className="w-12">#</Th>
                      <Th>Item / Product</Th>
                      <Th>Category</Th>
                      <Th className="text-right">Unit Price</Th>
                      <Th className="text-right">Units Sold</Th>
                      <Th className="text-right">Total Sales Value</Th>
                      <Th className="w-36">Sales Share</Th>
                      <Th>Sold From Warehouse(s)</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {isSellLoading ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-sm text-slate-400">
                          Calculating sales summary by item and category...
                        </td>
                      </tr>
                    ) : productBreakdown.length === 0 ? (
                      <EmptyTable cols={9} message="No sales records found for the selected date range and warehouse." />
                    ) : (
                      productBreakdown.map((item, idx) => {
                        const totalAmount = salesSummary.total_sales_amount || 1;
                        const sharePercent = ((item.total_sales_value / totalAmount) * 100).toFixed(1);
                        return (
                          <tr key={item.product_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                            <Td mono className="text-xs text-slate-400">
                              {idx + 1}
                            </Td>
                            <Td>
                              <div className="flex items-center gap-2">
                                <Package size={15} className="text-blue-600 shrink-0" />
                                <div>
                                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                    {item.product_name}
                                  </span>
                                  {item.product_code && (
                                    <span className="block text-[11px] font-mono text-slate-500">
                                      {item.product_code}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  {item.tracking_type}
                                </span>
                              </div>
                            </Td>
                            <Td>
                              <Badge color="blue">{item.category_name || "General"}</Badge>
                            </Td>
                            <Td className="text-right font-mono text-xs text-slate-700 dark:text-slate-300">
                              {formatBDT(item.unit_price)}
                            </Td>
                            <Td className="text-right">
                              <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                                {item.total_units_sold} units
                              </span>
                            </Td>
                            <Td className="text-right">
                              <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-md">
                                {formatBDT(item.total_sales_value)}
                              </span>
                            </Td>
                            <Td>
                              <div className="w-full">
                                <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                  <span>{sharePercent}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-600 h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(Number(sharePercent), 100)}%` }}
                                  />
                                </div>
                              </div>
                            </Td>
                            <Td className="text-xs text-slate-600 dark:text-slate-400">
                              {item.warehouse_names && item.warehouse_names.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {item.warehouse_names.map((wh) => (
                                    <span
                                      key={wh}
                                      className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[11px]"
                                    >
                                      <Building2 size={10} /> {wh}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                "—"
                              )}
                            </Td>
                            <Td className="text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSellSearch(item.product_name);
                                  setSellViewMode("transactions");
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded transition-colors cursor-pointer"
                                title="View individual sales orders"
                              >
                                Orders <ArrowUpRight size={12} />
                              </button>
                            </Td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {productBreakdown.length > 0 && (
                    <tfoot className="bg-slate-50 dark:bg-slate-900/60 font-bold border-t border-slate-200 dark:border-slate-800 text-xs">
                      <tr>
                        <td colSpan={4} className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          Total Period Summary ({productBreakdown.length} items sold):
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sm text-slate-900 dark:text-slate-100">
                          {salesSummary.total_units_sold} units
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sm text-emerald-700 dark:text-emerald-400">
                          {formatBDT(salesSummary.total_sales_amount)}
                        </td>
                        <td colSpan={3} className="py-3 px-4 text-slate-400 text-right">
                          100% of reported sales
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* TAB 2: DETAILED SALES ORDERS & DISPATCH LOG                         */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {sellViewMode === "transactions" && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <Th className="w-16">ID</Th>
                      <Th>Date &amp; Time</Th>
                      <Th>Invoice / Reference</Th>
                      <Th>Customer</Th>
                      <Th>Product &amp; SKU</Th>
                      <Th>Category</Th>
                      <Th>Serial / Barcode</Th>
                      <Th className="text-right">Qty</Th>
                      <Th className="text-right">Unit Price</Th>
                      <Th className="text-right">Total Value</Th>
                      <Th>Dispatched From</Th>
                      <Th>Handled By</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {isSellLoading ? (
                      <tr>
                        <td colSpan={12} className="text-center py-10 text-sm text-slate-400">
                          Loading detailed sales and dispatch records...
                        </td>
                      </tr>
                    ) : sellItems.length === 0 ? (
                      <EmptyTable cols={12} message="No stock sales records found for this period." />
                    ) : (
                      sellItems.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                          <Td mono className="text-xs text-slate-400">
                            #{s.id}
                          </Td>
                          <Td className="text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {formatBDDateTime(s.created_at)}
                          </Td>
                          <Td mono className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {s.reference_number || (s.reference_id ? `SO-${s.reference_id}` : "—")}
                          </Td>
                          <Td>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                              <UserCheck size={13} className="text-slate-400 shrink-0" />
                              {s.customer_name || "General Customer"}
                            </span>
                          </Td>
                          <Td>
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {s.product_name || `Product #${s.product_id}`}
                            </div>
                            {(s.variant_name || s.variant_sku) && (
                              <span className="text-[11px] font-mono text-slate-500">
                                {s.variant_name || s.variant_sku}
                              </span>
                            )}
                          </Td>
                          <Td>
                            <Badge color="blue">{s.category_name || "General"}</Badge>
                          </Td>
                          <Td mono className="text-xs text-slate-700 dark:text-slate-300">
                            {s.serial_number ? (
                              <span className="font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-800">
                                SN: {s.serial_number}
                              </span>
                            ) : s.barcode ? (
                              <span>Bar: {s.barcode}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </Td>
                          <Td className="text-right">
                            <span className="font-mono font-bold text-sm text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                              -{s.quantity}
                            </span>
                          </Td>
                          <Td className="text-right font-mono text-xs text-slate-700 dark:text-slate-300">
                            {formatBDT(s.unit_price)}
                          </Td>
                          <Td className="text-right">
                            <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              {formatBDT(s.total_price || (s.unit_price * (s.quantity || 1)))}
                            </span>
                          </Td>
                          <Td className="text-xs text-slate-700 dark:text-slate-300">
                            <span className="flex items-center gap-1">
                              <Building2 size={12} className="text-slate-400" />
                              {s.from_warehouse_name || "—"}
                            </span>
                          </Td>
                          <Td className="text-xs text-slate-500">
                            {s.created_by_name || "Sales Operator"}
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={sellPage}
                pageSize={SELL_PAGE_SIZE}
                total={totalSales}
                totalPages={sellTotalPages}
                onPageChange={setSellPage}
                itemName="sales orders"
              />
            </Card>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* TAB 3: CATEGORY-WISE AGGREGATION                                   */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {sellViewMode === "category_breakdown" && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <Th className="w-12">#</Th>
                      <Th>Category Name</Th>
                      <Th className="text-right">Total Units Sold</Th>
                      <Th className="text-right">Total Sales Revenue</Th>
                      <Th className="w-48">Share of Revenue</Th>
                      <Th className="text-right">Filter</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {isSellLoading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-sm text-slate-400">
                          Calculating category statistics...
                        </td>
                      </tr>
                    ) : categoryBreakdown.length === 0 ? (
                      <EmptyTable cols={6} message="No category sales records found." />
                    ) : (
                      categoryBreakdown.map((cat, idx) => {
                        const totalAmount = salesSummary.total_sales_amount || 1;
                        const sharePercent = ((cat.total_sales_value / totalAmount) * 100).toFixed(1);
                        return (
                          <tr key={cat.category_name} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                            <Td mono className="text-xs text-slate-400">
                              {idx + 1}
                            </Td>
                            <Td>
                              <div className="flex items-center gap-2">
                                <Layers size={16} className="text-amber-500 shrink-0" />
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                  {cat.category_name}
                                </span>
                              </div>
                            </Td>
                            <Td className="text-right font-mono font-semibold text-sm text-slate-800 dark:text-slate-200">
                              {cat.total_units_sold} units
                            </Td>
                            <Td className="text-right">
                              <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                {formatBDT(cat.total_sales_value)}
                              </span>
                            </Td>
                            <Td>
                              <div className="w-full">
                                <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                  <span>{sharePercent}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-amber-500 h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(Number(sharePercent), 100)}%` }}
                                  />
                                </div>
                              </div>
                            </Td>
                            <Td className="text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  if (cat.category_id) {
                                    setSellCategoryFilter(String(cat.category_id));
                                  } else {
                                    setSellSearch(cat.category_name);
                                  }
                                  setSellViewMode("item_summary");
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded transition-colors cursor-pointer"
                              >
                                View Items <ArrowUpRight size={12} />
                              </button>
                            </Td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Product Detail Modal for examining breakdown */}
      <ProductDetailModal
        item={detailItem}
        onClose={() => setDetailItem(null)}
      />
    </div>
  );
}
