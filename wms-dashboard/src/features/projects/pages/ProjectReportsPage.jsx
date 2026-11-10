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

  return (
    <div className="space-y-4">
      {/* Summary StatCards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Products in Projects"
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
          label="Period Stock In (+)"
          value={isLoading ? "..." : summaryStats.total_stock_in ?? 0}
          icon={ArrowDownLeft}
          tint="emerald"
        />
        <StatCard
          label="Period Stock Out (-)"
          value={isLoading ? "..." : summaryStats.total_stock_out ?? 0}
          icon={ArrowUpRight}
          tint="amber"
        />
        <StatCard
          label={dateTo ? "Remaining (Cumulative)" : "Remaining In Stock"}
          value={isLoading ? "..." : summaryStats.total_remaining_stock ?? 0}
          icon={Boxes}
          tint="purple"
        />
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
                    { label: "Stock Out (-)", key: "stock_out_qty" },
                    { label: "Remaining", key: "remaining_stock" },
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
                    { label: "Stock Out (-)", key: "stock_out_qty" },
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
                  <Th className="text-right">Opening Stock</Th>
                  <Th className="text-right">Stock In (+)</Th>
                  <Th className="text-right">Stock Out (-)</Th>
                  <Th className="text-right">Remaining</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-sm text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <Clock className="animate-spin text-blue-500" size={16} />
                        <span>Loading product project stock report...</span>
                      </div>
                    </td>
                  </tr>
                ) : pagedItems.length === 0 ? (
                  <EmptyTable cols={10} message="No product records found for the selected project and filters." />
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
                              (item.stock_out_qty ?? 0) > 0
                                ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                                : "text-slate-400"
                            }`}
                          >
                            {(item.stock_out_qty ?? 0) > 0 ? `-${item.stock_out_qty}` : "0"}
                          </span>
                        </Td>
                        <Td className="text-right">
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
                  <Th className="text-right">Opening Stock</Th>
                  <Th className="text-right">Stock In (+)</Th>
                  <Th className="text-right">Stock Out (-)</Th>
                  <Th className="text-right">Remaining</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-sm text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <Clock className="animate-spin text-blue-500" size={16} />
                        <span>Loading projects overview...</span>
                      </div>
                    </td>
                  </tr>
                ) : pagedItems.length === 0 ? (
                  <EmptyTable cols={9} message="No projects found." />
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
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                            -{item.stock_out_qty ?? 0}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <span
                            className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                              isPositive
                                ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
                                : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {item.remaining_stock ?? 0}
                          </span>
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
