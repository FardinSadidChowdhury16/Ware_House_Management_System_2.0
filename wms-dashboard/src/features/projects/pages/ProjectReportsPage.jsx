import { useState, useEffect, useMemo } from "react";
import {
  FolderKanban,
  Package,
  Boxes,
  MapPin,
  Calendar,
  Eye,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Tag,
  Building,
  Layers,
  Layers3,
  Info,
  Calculator,
  AlertTriangle,
} from "lucide-react";
import {
  Badge,
  Card,
  StatCard,
  Th,
  Td,
  SearchBox,
  Select,
  DateRangeFilter,
  Toolbar,
  EmptyTable,
  Pagination,
  ExportCSVButton,
} from "../../../components/ui/index.js";
import { useWarehouseFilter } from "../../../app/context/WarehouseFilterContext.jsx";
import { projectsApi } from "../api/projectsApi.js";
import { formatBDDate, formatBDDateTime } from "../../../shared/utils/dateUtils.js";
import { ProjectViewModal } from "../components/ProjectViewModal.jsx";

const PAGE_SIZE = 10;

export function ProjectReportsPage() {
  const { selectedWarehouseId } = useWarehouseFilter();

  const [viewMode, setViewMode] = useState("products"); // "products" | "projects"
  const [projectId, setProjectId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [trackingFilter, setTrackingFilter] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewingProject, setViewingProject] = useState(null);

  // Fetch report data
  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (projectId && projectId !== "all") params.project_id = projectId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (selectedWarehouseId) params.warehouse_id = selectedWarehouseId;
      if (search.trim()) params.search = search.trim();
      if (trackingFilter && trackingFilter !== "all") params.tracking_type = trackingFilter;

      const data = await projectsApi.getSummaryReport(params);
      setReportData(data);
    } catch (err) {
      console.error("Failed to load project summary report", err);
      setReportData({
        summary: {
          total_products: 0,
          total_projects: 0,
          active_projects: 0,
          total_opening_stock: 0,
          total_stock_in: 0,
          total_stock_out: 0,
          total_remaining_stock: 0,
          has_date_filter: false,
        },
        items: [],
        projects_summary: [],
        projects_list: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [projectId, dateFrom, dateTo, trackingFilter, selectedWarehouseId, search]);

  const summaryStats = reportData?.summary || {};
  const rawItems = reportData?.items || [];
  const projectsSummary = reportData?.projects_summary || [];
  const projectsList = reportData?.projects_list || [];

  // Filter items by stock status if requested (all, in_stock > 0, zero <= 0)
  const filteredProductItems = useMemo(() => {
    if (stockStatusFilter === "in_stock") {
      return rawItems.filter((i) => (i.remaining_stock ?? 0) > 0);
    }
    if (stockStatusFilter === "out_of_stock") {
      return rawItems.filter((i) => (i.remaining_stock ?? 0) <= 0);
    }
    return rawItems;
  }, [rawItems, stockStatusFilter]);

  // Current display list based on view mode
  const currentList = viewMode === "products" ? filteredProductItems : projectsSummary;
  const totalItems = currentList.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return currentList.slice(start, start + PAGE_SIZE);
  }, [currentList, page]);

  const totPool = (summaryStats.total_opening_stock ?? 0) + (summaryStats.total_stock_in ?? 0);
  const totOwnOut = summaryStats.total_own_out ?? 0;
  const totOtherOut = summaryStats.total_other_out ?? 0;
  const totRem = summaryStats.total_remaining_stock ?? 0;
  const poolDenom = totPool > 0 ? totPool : 1;
  const ownPct = Math.min(100, Math.round((totOwnOut / poolDenom) * 100));
  const otherPct = Math.min(100 - ownPct, Math.round((totOtherOut / poolDenom) * 100));
  const remPct = Math.max(0, 100 - ownPct - otherPct);

  return (
    <div className="space-y-4">
      {/* Summary StatCards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Products in Projects"
          value={isLoading ? "..." : summaryStats.total_products ?? 0}
          icon={Package}
          tint="blue"
        />
        <StatCard
          label={dateFrom ? "Opening Stock (Prior)" : "Opening Stock"}
          value={isLoading ? "..." : summaryStats.total_opening_stock ?? 0}
          icon={Package}
          tint="indigo"
        />
        <StatCard
          label="Stock In (+)"
          value={isLoading ? "..." : `+${summaryStats.total_stock_in ?? 0}`}
          icon={ArrowDownLeft}
          tint="emerald"
        />
        <StatCard
          label="Own Project Out"
          value={isLoading ? "..." : `-${totOwnOut}`}
          icon={ArrowUpRight}
          tint="blue"
        />
        <StatCard
          label="Other Project Out"
          value={isLoading ? "..." : `-${totOtherOut}`}
          icon={AlertTriangle}
          tint="rose"
        />
        <StatCard
          label={dateTo ? "Remaining (Cum.)" : "Remaining"}
          value={isLoading ? "..." : totRem}
          icon={Boxes}
          tint="purple"
        />
      </div>

      {/* Visual Stock Balance Equation & Stacked Distribution Bar */}
      <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              <Calculator size={13} />
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
              Project Allocation &amp; Stock Out Equation
            </span>
            <span className="text-slate-400 dark:text-slate-500 font-medium hidden md:inline">
              — Opening + Stock In − Own Project Out − Other Project Out = Remaining
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-indigo-700 dark:text-indigo-300">Opening</span>{" "}
            <span className="text-emerald-600 font-bold">+</span>{" "}
            <span className="font-bold text-emerald-700 dark:text-emerald-300">In</span>{" "}
            <span className="text-blue-600 font-bold">−</span>{" "}
            <span className="font-bold text-blue-700 dark:text-blue-300">Own Out</span>{" "}
            <span className="text-rose-600 font-bold">−</span>{" "}
            <span className="font-bold text-rose-700 dark:text-rose-300">Other Out</span>{" "}
            <span className="text-purple-600 font-bold">=</span>{" "}
            <span className="font-bold text-purple-700 dark:text-purple-300">Remaining</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-stretch text-center">
          {/* 1. Opening */}
          <div className="flex sm:flex-col items-center justify-between sm:justify-center p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800">
            <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300">
              1. Opening
            </span>
            <span className="text-lg font-bold font-mono text-indigo-950 dark:text-indigo-100 my-0.5">
              {isLoading ? "..." : summaryStats.total_opening_stock ?? 0}
            </span>
            <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80">
              Prior Balance
            </span>
          </div>

          {/* 2. Stock In */}
          <div className="relative flex sm:flex-col items-center justify-between sm:justify-center p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800">
            <span className="hidden sm:flex absolute -left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-emerald-300 dark:border-emerald-700 items-center justify-center text-xs font-extrabold text-emerald-600 shadow-xs z-10">
              +
            </span>
            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">
              2. Stock In (+)
            </span>
            <span className="text-lg font-bold font-mono text-emerald-950 dark:text-emerald-100 my-0.5">
              {isLoading ? "..." : `+${summaryStats.total_stock_in ?? 0}`}
            </span>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
              Allocated to Projects
            </span>
          </div>

          {/* 3. Own Out */}
          <div className="relative flex sm:flex-col items-center justify-between sm:justify-center p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800">
            <span className="hidden sm:flex absolute -left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-blue-300 dark:border-blue-700 items-center justify-center text-xs font-extrabold text-blue-600 shadow-xs z-10">
              −
            </span>
            <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300">
              3. Own Out (−)
            </span>
            <span className="text-lg font-bold font-mono text-blue-950 dark:text-blue-100 my-0.5">
              {isLoading ? "..." : `−${totOwnOut}`}
            </span>
            <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80">
              Used in Own Project
            </span>
          </div>

          {/* 4. Other Project Out */}
          <div className={`relative flex sm:flex-col items-center justify-between sm:justify-center p-2.5 rounded-lg border ${
            totOtherOut > 0
              ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700"
              : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
          }`}>
            <span className="hidden sm:flex absolute -left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-rose-300 dark:border-rose-700 items-center justify-center text-xs font-extrabold text-rose-600 shadow-xs z-10">
              −
            </span>
            <span className={`text-[10px] uppercase font-bold flex items-center gap-1 ${
              totOtherOut > 0 ? "text-rose-700 dark:text-rose-300" : "text-slate-500"
            }`}>
              {totOtherOut > 0 && <AlertTriangle size={11} className="text-rose-600" />}
              4. Other Out (−)
            </span>
            <span className={`text-lg font-bold font-mono my-0.5 ${
              totOtherOut > 0 ? "text-rose-800 dark:text-rose-200" : "text-slate-600 dark:text-slate-300"
            }`}>
              {isLoading ? "..." : `−${totOtherOut}`}
            </span>
            <span className={`text-[10px] ${
              totOtherOut > 0 ? "text-rose-600 dark:text-rose-400 font-medium" : "text-slate-400"
            }`}>
              Diverted to Other
            </span>
          </div>

          {/* 5. Remaining Balance */}
          <div className="relative flex sm:flex-col items-center justify-between sm:justify-center p-2.5 rounded-lg bg-purple-50/90 dark:bg-purple-950/40 border-2 border-purple-300 dark:border-purple-700 shadow-xs">
            <span className="hidden sm:flex absolute -left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-purple-300 dark:border-purple-700 items-center justify-center text-xs font-extrabold text-purple-700 shadow-xs z-10">
              =
            </span>
            <span className="text-[10px] uppercase font-bold text-purple-800 dark:text-purple-300">
              5. Remaining
            </span>
            <span className="text-lg font-bold font-mono text-purple-950 dark:text-purple-100 my-0.5">
              {isLoading ? "..." : totRem}
            </span>
            <span className="text-[10px] text-purple-700/80 dark:text-purple-300/80 font-medium">
              Available Balance
            </span>
          </div>
        </div>

        {/* Visual Stacked Allocation Distribution Bar */}
        {totPool > 0 && (
          <div className="pt-1 space-y-1.5">
            <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex shadow-inner">
              {ownPct > 0 && (
                <div
                  className="bg-blue-600 h-full transition-all"
                  style={{ width: `${ownPct}%` }}
                  title={`Own Project Out: ${totOwnOut} units (${ownPct}%)`}
                />
              )}
              {otherPct > 0 && (
                <div
                  className="bg-rose-500 h-full transition-all"
                  style={{ width: `${otherPct}%` }}
                  title={`Other Project Out: ${totOtherOut} units (${otherPct}%)`}
                />
              )}
              {remPct > 0 && (
                <div
                  className="bg-purple-500 h-full transition-all"
                  style={{ width: `${remPct}%` }}
                  title={`Remaining Balance: ${totRem} units (${remPct}%)`}
                />
              )}
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                  Own Project Out: <strong className="text-slate-800 dark:text-slate-200">{totOwnOut} ({ownPct}%)</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  Other Project Out: <strong className={totOtherOut > 0 ? "text-rose-600 font-bold" : "text-slate-800 dark:text-slate-200"}>{totOtherOut} ({otherPct}%)</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                  Remaining: <strong className="text-purple-700 dark:text-purple-300">{totRem} ({remPct}%)</strong>
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Total Available Pool (Opening + In): {totPool} units (100%)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Active Periodic Cumulative Filter Banner */}
      {(dateFrom || dateTo) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-medium text-indigo-900 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
            <span>
              Cumulative Stock Period: <strong>{dateFrom ? formatBDDate(dateFrom) : "Beginning of time"}</strong> to <strong>{dateTo ? formatBDDate(dateTo) : "Present"}</strong>
              <span className="text-slate-500 dark:text-slate-400 ml-1.5 font-normal">
                (Formula: Opening Stock + Period Stock In - Period Stock Out = Remaining Stock)
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
            className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:underline transition-colors cursor-pointer"
          >
            Clear Date Filter
          </button>
        </div>
      )}

      {/* View Mode Toggle Bar & Quick Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setViewMode("products");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "products"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Package size={14} />
            <span>Products in Projects</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 font-bold">
              {filteredProductItems.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("projects");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "projects"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <FolderKanban size={14} />
            <span>Projects Overview</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold">
              {projectsSummary.length}
            </span>
          </button>
        </div>

        {/* Informational Subtext */}
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span>
            {viewMode === "products"
              ? "Showing product quantities and stock movements grouped per project"
              : "Showing consolidated totals per project"}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        action={
          <ExportCSVButton
            filename={viewMode === "products" ? "Projects_Product_Stock_Report" : "Projects_Overview_Report"}
            data={currentList}
            columns={
              viewMode === "products"
                ? [
                    { label: "Product Name", key: "product_name" },
                    { label: "Product Code", key: "product_code" },
                    { label: "Category", key: "category_name" },
                    { label: "Tracking", key: "tracking_type" },
                    { label: "Project Name", key: "project_name" },
                    { label: "Project Code", key: "project_code" },
                    { label: "Site Location", key: "site_location" },
                    { label: "Opening Stock", key: "opening_stock" },
                    { label: "Stock In (+)", key: "stock_in_qty" },
                    { label: "Own Stock Out (-)", key: "own_out_qty" },
                    { label: "Other Project Out (-)", key: "other_out_qty" },
                    { label: "Total Stock Out (-)", key: "stock_out_qty" },
                    { label: "Remaining", key: "remaining_stock" },
                    { label: "Other Destinations", value: (p) => (p.other_destinations || []).join("; ") || "—" },
                    {
                      label: "Last Movement",
                      value: (p) => (p.last_movement_at ? formatBDDateTime(p.last_movement_at) : "Never"),
                    },
                  ]
                : [
                    { label: "Project Code", key: "project_code" },
                    { label: "Project Name", key: "project_name" },
                    { label: "Site Location", key: "site_location" },
                    { label: "Distinct Products", key: "distinct_products_count" },
                    { label: "Opening Stock", key: "opening_stock" },
                    { label: "Stock In (+)", key: "stock_in_qty" },
                    { label: "Own Stock Out (-)", key: "own_out_qty" },
                    { label: "Other Project Out (-)", key: "other_out_qty" },
                    { label: "Total Stock Out (-)", key: "stock_out_qty" },
                    { label: "Remaining", key: "remaining_stock" },
                  ]
            }
          />
        }
      >
        <SearchBox
          placeholder="Search products by name, code, category, project..."
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />

        {/* Project Filter Dropdown */}
        <Select
          value={projectId}
          onChange={(v) => {
            setProjectId(v);
            setPage(1);
          }}
          options={[
            { label: "All Projects", value: "all" },
            ...projectsList.map((p) => ({
              label: `${p.name} (${p.code || "PRJ"})`,
              value: String(p.id),
            })),
          ]}
          className="w-auto min-w-44 text-xs py-1.5 font-medium"
        />

        <DateRangeFilter
          fromDate={dateFrom}
          toDate={dateTo}
          onFromDateChange={(v) => {
            setDateFrom(v);
            setPage(1);
          }}
          onToDateChange={(v) => {
            setDateTo(v);
            setPage(1);
          }}
        />

        {viewMode === "products" && (
          <>
            <Select
              value={trackingFilter}
              onChange={(v) => {
                setTrackingFilter(v);
                setPage(1);
              }}
              options={[
                { label: "All Modes", value: "all" },
                { label: "Serialized", value: "serialized" },
                { label: "Bulk", value: "bulk" },
              ]}
              className="w-auto min-w-32 text-xs py-1.5"
            />
            <Select
              value={stockStatusFilter}
              onChange={(v) => {
                setStockStatusFilter(v);
                setPage(1);
              }}
              options={[
                { label: "All Stock", value: "all" },
                { label: "In Stock (>0)", value: "in_stock" },
                { label: "Out of Stock (<=0)", value: "out_of_stock" },
              ]}
              className="w-auto min-w-36 text-xs py-1.5"
            />
          </>
        )}
      </Toolbar>

      {/* Main Table Card */}
      <Card>
        <div className="overflow-x-auto">
          {viewMode === "products" ? (
            /* ─── Mode 1: Product Breakdown per Project ───────────────────── */
            <table className="w-full">
              <thead>
                <tr>
                  <Th className="w-12">#</Th>
                  <Th>Product Name &amp; Code</Th>
                  <Th>Category</Th>
                  <Th>Tracking</Th>
                  <Th>Project (Site)</Th>
                  <Th className="text-right">
                    <span className="text-indigo-700 dark:text-indigo-300 font-semibold" title="Initial stock before period">
                      Opening
                    </span>
                  </Th>
                  <Th className="text-right">
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold" title="Total received (+) into project">
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] inline-flex items-center justify-center font-extrabold">+</span>
                      Stock In
                    </span>
                  </Th>
                  <Th className="text-right">
                    <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300 font-bold" title="Stocked out to this exact project (Own)">
                      <span className="w-3.5 h-3.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] inline-flex items-center justify-center font-extrabold">−</span>
                      Own Out
                    </span>
                  </Th>
                  <Th className="text-right">
                    <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300 font-bold" title="Diverted / stocked out to another project or customer">
                      <span className="w-3.5 h-3.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] inline-flex items-center justify-center font-extrabold">−</span>
                      Other Out
                    </span>
                  </Th>
                  <Th className="text-right bg-purple-50/50 dark:bg-purple-950/20">
                    <span className="inline-flex items-center gap-1 text-purple-800 dark:text-purple-300 font-bold" title="Remaining stock available on site (= Opening + In - Own Out - Other Out)">
                      <span className="w-3.5 h-3.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] inline-flex items-center justify-center font-extrabold">=</span>
                      Remaining
                    </span>
                  </Th>
                  <Th className="w-36">Visual Breakdown</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="text-center py-10 text-sm text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <Clock className="animate-spin text-blue-500" size={16} />
                        <span>Loading product project stock report...</span>
                      </div>
                    </td>
                  </tr>
                ) : pagedItems.length === 0 ? (
                  <EmptyTable cols={12} message="No product records found for the selected project and filters." />
                ) : (
                  pagedItems.map((item, idx) => {
                    const rowNumber = (page - 1) * PAGE_SIZE + idx + 1;
                    const isPositive = (item.remaining_stock ?? 0) > 0;
                    const isNegative = (item.remaining_stock ?? 0) < 0;

                    return (
                      <tr
                        key={item.id || `${item.project_id}-${item.product_id}-${idx}`}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <Td mono className="text-xs text-slate-400">
                          {rowNumber}
                        </Td>
                        <Td>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                              {item.product_name}
                            </div>
                            {item.product_code && item.product_code !== "—" && (
                              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                {item.product_code}
                              </span>
                            )}
                          </div>
                        </Td>
                        <Td>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 font-medium">
                            <Tag size={12} className="text-slate-400" />
                            {item.category_name || "General"}
                          </span>
                        </Td>
                        <Td>
                          <Badge variant={item.tracking_type === "serialized" ? "primary" : "neutral"}>
                            {item.tracking_type}
                          </Badge>
                        </Td>
                        <Td>
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1">
                              <FolderKanban size={13} className="text-blue-600 shrink-0" />
                              <span>{item.project_name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 font-mono">
                              <span>{item.project_code}</span>
                              {item.site_location && item.site_location !== "—" && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[140px]">{item.site_location}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </Td>
                        <Td className="text-right">
                          <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {item.opening_stock ?? 0}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <span
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                              (item.stock_in_qty ?? 0) > 0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "text-slate-400"
                            }`}
                          >
                            {(item.stock_in_qty ?? 0) > 0 ? `+${item.stock_in_qty}` : "0"}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <span
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                              (item.own_out_qty ?? 0) > 0
                                ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                                : "text-slate-400"
                            }`}
                          >
                            {(item.own_out_qty ?? 0) > 0 ? `-${item.own_out_qty}` : "0"}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span
                              className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                                (item.other_out_qty ?? 0) > 0
                                  ? "bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300"
                                  : "text-slate-400"
                              }`}
                            >
                              {(item.other_out_qty ?? 0) > 0 ? `-${item.other_out_qty}` : "0"}
                            </span>
                            {item.other_destinations && item.other_destinations.length > 0 && (
                              <div className="flex flex-wrap justify-end gap-0.5 mt-0.5">
                                {item.other_destinations.slice(0, 2).map((dest) => (
                                  <span key={dest} className="text-[9px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-1 py-0.2 rounded truncate max-w-[110px]" title={dest}>
                                    → {dest}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </Td>
                        <Td className="text-right bg-purple-50/30 dark:bg-purple-950/10">
                          <div className="flex flex-col items-end">
                            <span
                              className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                isPositive
                                  ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
                                  : isNegative
                                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {item.remaining_stock ?? 0}
                            </span>
                            <span
                              className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap"
                              title="Formula: Opening + Stock In − Own Out − Other Out = Remaining"
                            >
                              {item.opening_stock ?? 0} + {item.stock_in_qty ?? 0} − {item.own_out_qty ?? 0} − {item.other_out_qty ?? 0}
                            </span>
                          </div>
                        </Td>
                        <Td>
                          {(() => {
                            const rPool = (item.opening_stock ?? 0) + (item.stock_in_qty ?? 0);
                            const rDenom = rPool > 0 ? rPool : 1;
                            const rOwn = Math.min(100, Math.round(((item.own_out_qty ?? 0) / rDenom) * 100));
                            const rOther = Math.min(100 - rOwn, Math.round(((item.other_out_qty ?? 0) / rDenom) * 100));
                            const rRem = Math.max(0, 100 - rOwn - rOther);
                            return (
                              <div className="w-full min-w-[110px]">
                                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                                  {rOwn > 0 && <div className="bg-blue-600 h-full" style={{ width: `${rOwn}%` }} title={`Own Out: ${item.own_out_qty ?? 0}`} />}
                                  {rOther > 0 && <div className="bg-rose-500 h-full" style={{ width: `${rOther}%` }} title={`Other Out: ${item.other_out_qty ?? 0}`} />}
                                  {rRem > 0 && <div className="bg-purple-500 h-full" style={{ width: `${rRem}%` }} title={`Remaining: ${item.remaining_stock ?? 0}`} />}
                                </div>
                                <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                                  <span>Own {rOwn}%</span>
                                  {(item.other_out_qty ?? 0) > 0 && <span className="text-rose-600 font-semibold">Oth {rOther}%</span>}
                                  <span>Rem {rRem}%</span>
                                </div>
                              </div>
                            );
                          })()}
                        </Td>
                        <Td className="text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setViewingProject({
                                id: item.project_id,
                                name: item.project_name,
                                code: item.project_code,
                                location: item.site_location,
                                status: item.project_status,
                                focusProductName: item.product_name,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>View Items</span>
                          </button>
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* ─── Mode 2: Project Overview Summary ───────────────────────── */
            <table className="w-full">
              <thead>
                <tr>
                  <Th className="w-12">#</Th>
                  <Th>Project Name &amp; Code</Th>
                  <Th>Site Location</Th>
                  <Th className="text-center">Products Count</Th>
                  <Th className="text-right">
                    <span className="text-indigo-700 dark:text-indigo-300 font-semibold" title="Initial stock before period">
                      Opening
                    </span>
                  </Th>
                  <Th className="text-right">
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold" title="Total received (+) into project">
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] inline-flex items-center justify-center font-extrabold">+</span>
                      Stock In
                    </span>
                  </Th>
                  <Th className="text-right">
                    <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300 font-bold" title="Stocked out to this exact project (Own)">
                      <span className="w-3.5 h-3.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] inline-flex items-center justify-center font-extrabold">−</span>
                      Own Out
                    </span>
                  </Th>
                  <Th className="text-right">
                    <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300 font-bold" title="Diverted / stocked out to another project or customer">
                      <span className="w-3.5 h-3.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] inline-flex items-center justify-center font-extrabold">−</span>
                      Other Out
                    </span>
                  </Th>
                  <Th className="text-right bg-purple-50/50 dark:bg-purple-950/20">
                    <span className="inline-flex items-center gap-1 text-purple-800 dark:text-purple-300 font-bold" title="Remaining stock available on site (= Opening + In - Own Out - Other Out)">
                      <span className="w-3.5 h-3.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] inline-flex items-center justify-center font-extrabold">=</span>
                      Remaining
                    </span>
                  </Th>
                  <Th className="w-36">Visual Breakdown</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="text-center py-10 text-sm text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <Clock className="animate-spin text-blue-500" size={16} />
                        <span>Loading projects overview...</span>
                      </div>
                    </td>
                  </tr>
                ) : pagedItems.length === 0 ? (
                  <EmptyTable cols={11} message="No projects found." />
                ) : (
                  pagedItems.map((item, idx) => {
                    const rowNumber = (page - 1) * PAGE_SIZE + idx + 1;
                    const isPositive = (item.remaining_stock ?? 0) > 0;

                    return (
                      <tr
                        key={item.project_id || idx}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <Td mono className="text-xs text-slate-400">
                          {rowNumber}
                        </Td>
                        <Td>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                              {item.project_name}
                            </div>
                            <span className="text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-block mt-0.5">
                              {item.project_code}
                            </span>
                          </div>
                        </Td>
                        <Td>
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <MapPin size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate max-w-[170px]">{item.site_location || "—"}</span>
                          </div>
                        </Td>
                        <Td className="text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {item.distinct_products_count ?? 0} products
                          </span>
                        </Td>
                        <Td className="text-right font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {item.opening_stock ?? 0}
                        </Td>
                        <Td className="text-right">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                            +{item.stock_in_qty ?? 0}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <span
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                              (item.own_out_qty ?? 0) > 0
                                ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                                : "text-slate-400"
                            }`}
                          >
                            {(item.own_out_qty ?? 0) > 0 ? `-${item.own_out_qty}` : "0"}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span
                              className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                                (item.other_out_qty ?? 0) > 0
                                  ? "bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300"
                                  : "text-slate-400"
                              }`}
                            >
                              {(item.other_out_qty ?? 0) > 0 ? `-${item.other_out_qty}` : "0"}
                            </span>
                            {item.other_destinations && item.other_destinations.length > 0 && (
                              <div className="flex flex-wrap justify-end gap-0.5 mt-0.5">
                                {item.other_destinations.slice(0, 2).map((dest) => (
                                  <span key={dest} className="text-[9px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-1 py-0.2 rounded truncate max-w-[110px]" title={dest}>
                                    → {dest}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </Td>
                        <Td className="text-right bg-purple-50/30 dark:bg-purple-950/10">
                          <div className="flex flex-col items-end">
                            <span
                              className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                isPositive
                                  ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
                                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {item.remaining_stock ?? 0}
                            </span>
                            <span
                              className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap"
                              title="Formula: Opening + Stock In − Own Out − Other Out = Remaining"
                            >
                              {item.opening_stock ?? 0} + {item.stock_in_qty ?? 0} − {item.own_out_qty ?? 0} − {item.other_out_qty ?? 0}
                            </span>
                          </div>
                        </Td>
                        <Td>
                          {(() => {
                            const rPool = (item.opening_stock ?? 0) + (item.stock_in_qty ?? 0);
                            const rDenom = rPool > 0 ? rPool : 1;
                            const rOwn = Math.min(100, Math.round(((item.own_out_qty ?? 0) / rDenom) * 100));
                            const rOther = Math.min(100 - rOwn, Math.round(((item.other_out_qty ?? 0) / rDenom) * 100));
                            const rRem = Math.max(0, 100 - rOwn - rOther);
                            return (
                              <div className="w-full min-w-[110px]">
                                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                                  {rOwn > 0 && <div className="bg-blue-600 h-full" style={{ width: `${rOwn}%` }} title={`Own Out: ${item.own_out_qty ?? 0}`} />}
                                  {rOther > 0 && <div className="bg-rose-500 h-full" style={{ width: `${rOther}%` }} title={`Other Out: ${item.other_out_qty ?? 0}`} />}
                                  {rRem > 0 && <div className="bg-purple-500 h-full" style={{ width: `${rRem}%` }} title={`Remaining: ${item.remaining_stock ?? 0}`} />}
                                </div>
                                <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                                  <span>Own {rOwn}%</span>
                                  {(item.other_out_qty ?? 0) > 0 && <span className="text-rose-600 font-semibold">Oth {rOther}%</span>}
                                  <span>Rem {rRem}%</span>
                                </div>
                              </div>
                            );
                          })()}
                        </Td>
                        <Td className="text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setViewingProject({
                                id: item.project_id,
                                name: item.project_name,
                                code: item.project_code,
                                location: item.site_location,
                                status: item.status,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>View Items</span>
                          </button>
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-3">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      </Card>

      {/* Project View / Items Modal */}
      {viewingProject && (
        <ProjectViewModal
          project={viewingProject}
          isOpen={!!viewingProject}
          onClose={() => setViewingProject(null)}
          initialSearch={viewingProject.focusProductName || ""}
        />
      )}
    </div>
  );
}
