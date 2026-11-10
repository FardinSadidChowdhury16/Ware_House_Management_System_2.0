import { useState, useEffect, useMemo } from "react";
import {
  FolderKanban,
  Package,
  TrendingUp,
  TrendingDown,
  Boxes,
  MapPin,
  Calendar,
  Eye,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
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

function getStatusBadge(status) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "completed":
      return <Badge variant="info">Completed</Badge>;
    case "on_hold":
      return <Badge variant="warning">On Hold</Badge>;
    default:
      return <Badge>{status || "Active"}</Badge>;
  }
}

export function ProjectReportsPage() {
  const { selectedWarehouseId } = useWarehouseFilter();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (selectedWarehouseId) params.warehouse_id = selectedWarehouseId;
      if (search.trim()) params.search = search.trim();

      const data = await projectsApi.getSummaryReport(params);
      setReportData(data);
    } catch (err) {
      console.error("Failed to load project summary report", err);
      setReportData({
        summary: {
          total_projects: 0,
          active_projects: 0,
          completed_projects: 0,
          on_hold_projects: 0,
          total_opening_balance: 0,
          total_period_in: 0,
          total_period_out: 0,
          total_period_balance: 0,
          total_closing_in: 0,
          total_closing_out: 0,
          total_closing_balance: 0,
          total_shipments_in: 0,
          total_shipments_out: 0,
        },
        items: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [dateFrom, dateTo, statusFilter, selectedWarehouseId, search]);

  const summaryStats = reportData?.summary || {};
  const allItems = reportData?.items || [];

  // Client-side pagination over fetched items
  const totalItems = allItems.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return allItems.slice(start, start + PAGE_SIZE);
  }, [allItems, page]);

  return (
    <div className="space-y-4">
      {/* Summary StatCards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Projects"
          value={isLoading ? "..." : summaryStats.total_projects ?? 0}
          icon={FolderKanban}
          tint="blue"
        />
        <StatCard
          label={dateFrom ? "Stock In Received (+)" : "Total Stock In (+)"}
          value={isLoading ? "..." : (dateFrom ? summaryStats.total_period_in : summaryStats.total_closing_in) ?? 0}
          icon={ArrowDownLeft}
          tint="emerald"
        />
        <StatCard
          label={dateFrom ? "Stock Out Dispatched (-)" : "Total Stock Out (-)"}
          value={isLoading ? "..." : (dateFrom ? summaryStats.total_period_out : summaryStats.total_closing_out) ?? 0}
          icon={ArrowUpRight}
          tint="amber"
        />
        <StatCard
          label="Remaining"
          value={isLoading ? "..." : summaryStats.total_closing_balance ?? 0}
          icon={Boxes}
          tint="purple"
        />
        <StatCard
          label="Active Job Sites"
          value={isLoading ? "..." : summaryStats.active_projects ?? 0}
          icon={MapPin}
          tint="indigo"
        />
      </div>

      {/* Active Periodic Cumulative Filter Banner */}
      {(dateFrom || dateTo) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-medium text-indigo-900 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
            <span>
              Cumulative Project Balance Period: <strong>{dateFrom ? formatBDDate(dateFrom) : "Beginning of time"}</strong> to <strong>{dateTo ? formatBDDate(dateTo) : "Present"}</strong>
              <span className="text-slate-500 dark:text-slate-400 ml-1.5 font-normal">
                (Formula: Opening Balance + Period Inbound - Period Outbound = Closing Remaining Balance)
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

      {/* Toolbar */}
      <Toolbar
        action={
          <ExportCSVButton
            filename="Projects_Stock_Report"
            data={allItems}
            columns={[
              { label: "Project Code", key: "project_code" },
              { label: "Project Name", key: "project_name" },
              { label: "Site Location", key: "location" },
              { label: "Contact Info", key: "contact_info" },
              { label: "Status", key: "status" },
              { label: "Opening Balance", key: "opening_balance" },
              { label: "Period Stock In (+)", key: "period_in" },
              { label: "Period Stock Out (-)", key: "period_out" },
              { label: "Remaining", key: "closing_balance" },
              { label: "All-Time In", key: "all_time_in" },
              { label: "All-Time Out", key: "all_time_out" },
              { label: "Distinct Products", key: "distinct_products_count" },
              { label: "Inbound Batches", key: "shipments_in_count" },
              { label: "Outbound Dispatches", key: "shipments_out_count" },
              {
                label: "Last Activity",
                value: (p) => (p.last_activity_at ? formatBDDateTime(p.last_activity_at) : "Never"),
              },
            ]}
          />
        }
      >
        <SearchBox
          placeholder="Search projects by name, code, site location, contact..."
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
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
        <Select
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          options={[
            { label: "All Status", value: "all" },
            { label: "Active", value: "active" },
            { label: "Completed", value: "completed" },
            { label: "On Hold", value: "on_hold" },
          ]}
          className="w-auto min-w-36 text-xs py-1.5"
        />
      </Toolbar>

      {/* Main Table Card */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th className="w-12">#</Th>
                <Th>Project Name &amp; Code</Th>
                <Th>Site Location</Th>
                <Th>Status</Th>
                <Th className="text-right">Opening Bal</Th>
                <Th className="text-right">Stock In (+)</Th>
                <Th className="text-right">Stock Out (-)</Th>
                <Th className="text-right">Remaining</Th>
                <Th className="text-center">Activity In / Out</Th>
                <Th>Last Activity</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-sm text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <Clock className="animate-spin text-blue-500" size={16} />
                      <span>Loading projects summary report...</span>
                    </div>
                  </td>
                </tr>
              ) : allItems.length === 0 ? (
                <EmptyTable cols={11} message="No project summary records found." />
              ) : (
                pagedItems.map((item, idx) => {
                  const rowNumber = (page - 1) * PAGE_SIZE + idx + 1;
                  const balancePositive = (item.closing_balance ?? 0) > 0;
                  const balanceNegative = (item.closing_balance ?? 0) < 0;

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
                          <span className="truncate max-w-[170px]">{item.location || "—"}</span>
                        </div>
                      </Td>
                      <Td>{getStatusBadge(item.status)}</Td>
                      
                      {/* Opening Balance */}
                      <Td className="text-right">
                        <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {item.opening_balance ?? 0}
                        </span>
                      </Td>

                      {/* Stock In (+) */}
                      <Td className="text-right">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                            (item.period_in ?? 0) > 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "text-slate-400"
                          }`}
                        >
                          {(item.period_in ?? 0) > 0 ? `+${item.period_in}` : "0"}
                        </span>
                      </Td>

                      {/* Stock Out (-) */}
                      <Td className="text-right">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                            (item.period_out ?? 0) > 0
                              ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                              : "text-slate-400"
                          }`}
                        >
                          {(item.period_out ?? 0) > 0 ? `-${item.period_out}` : "0"}
                        </span>
                      </Td>

                      {/* Remaining Balance (= In - Out) */}
                      <Td className="text-right">
                        <span
                          className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            balancePositive
                              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
                              : balanceNegative
                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {item.closing_balance ?? 0}
                        </span>
                      </Td>

                      {/* In / Out Shipments */}
                      <Td className="text-center">
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            +{item.shipments_in_count ?? 0}
                          </span>
                          <span>in</span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            -{item.shipments_out_count ?? 0}
                          </span>
                          <span>out</span>
                        </div>
                      </Td>

                      {/* Last Activity */}
                      <Td>
                        {item.last_activity_at ? (
                          <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                            {formatBDDate(item.last_activity_at)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Never</span>
                        )}
                      </Td>

                      {/* Action */}
                      <Td className="text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setViewingProject({
                              id: item.project_id,
                              name: item.project_name,
                              code: item.project_code,
                              location: item.location,
                              contact_info: item.contact_info,
                              description: item.description,
                              status: item.status,
                              created_at: item.created_at,
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
          getStatusBadge={getStatusBadge}
        />
      )}
    </div>
  );
}
