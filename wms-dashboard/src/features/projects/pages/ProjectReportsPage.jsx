import { useState, useEffect, useMemo } from "react";
import {
  FolderKanban,
  Package,
  TrendingUp,
  Boxes,
  MapPin,
  Calendar,
  Eye,
  Clock,
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
          total_opening_units: 0,
          total_period_units: 0,
          total_cumulative_units: 0,
          total_shipments: 0,
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
          label={dateFrom ? "Opening Dispatched (Prior)" : "Opening Dispatched"}
          value={isLoading ? "..." : summaryStats.total_opening_units ?? 0}
          icon={Package}
          tint="indigo"
        />
        <StatCard
          label="Period Dispatched (+)"
          value={isLoading ? "..." : summaryStats.total_period_units ?? 0}
          icon={TrendingUp}
          tint="emerald"
        />
        <StatCard
          label={dateTo ? "Cumulative Dispatched Units" : "Total Dispatched Units"}
          value={isLoading ? "..." : summaryStats.total_cumulative_units ?? 0}
          icon={Boxes}
          tint="purple"
        />
        <StatCard
          label="Active Job Sites"
          value={isLoading ? "..." : summaryStats.active_projects ?? 0}
          icon={MapPin}
          tint="amber"
        />
      </div>

      {/* Active Periodic Cumulative Filter Banner */}
      {(dateFrom || dateTo) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-medium text-indigo-900 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
            <span>
              Cumulative Project Period: <strong>{dateFrom ? formatBDDate(dateFrom) : "Beginning of time"}</strong> to <strong>{dateTo ? formatBDDate(dateTo) : "Present"}</strong>
              <span className="text-slate-500 dark:text-slate-400 ml-1.5 font-normal">
                (Formula: Opening Units + Period Dispatches = Cumulative Dispatched Units)
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
            filename="Projects_Summary_Report"
            data={allItems}
            columns={[
              { label: "Project Code", key: "project_code" },
              { label: "Project Name", key: "project_name" },
              { label: "Site Location", key: "location" },
              { label: "Contact Info", key: "contact_info" },
              { label: "Status", key: "status" },
              { label: "Opening Units", key: "opening_units" },
              { label: "Period Dispatched", key: "period_units" },
              { label: "Cumulative Units", key: "closing_units" },
              { label: "Distinct Products", key: "distinct_products_count" },
              { label: "Shipments Count", key: "shipments_count" },
              {
                label: "Last Dispatched At",
                value: (p) => (p.last_dispatched_at ? formatBDDateTime(p.last_dispatched_at) : "Never"),
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
                <Th className="text-right">Opening (Prior)</Th>
                <Th className="text-right">Period Dispatched</Th>
                <Th className="text-right">Cumulative Units</Th>
                <Th className="text-center">Products / Shipments</Th>
                <Th>Last Dispatched</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-sm text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <Clock className="animate-spin text-blue-500" size={16} />
                      <span>Loading projects summary report...</span>
                    </div>
                  </td>
                </tr>
              ) : allItems.length === 0 ? (
                <EmptyTable cols={10} message="No project summary records found." />
              ) : (
                pagedItems.map((item, idx) => {
                  const rowNumber = (page - 1) * PAGE_SIZE + idx + 1;
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
                          <span className="truncate max-w-[180px]">{item.location || "—"}</span>
                        </div>
                      </Td>
                      <Td>{getStatusBadge(item.status)}</Td>
                      <Td className="text-right">
                        <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {item.opening_units}
                        </span>
                      </Td>
                      <Td className="text-right">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                            item.period_units > 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "text-slate-400"
                          }`}
                        >
                          {item.period_units > 0 ? `+${item.period_units}` : "0"}
                        </span>
                      </Td>
                      <Td className="text-right">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                          {item.closing_units}
                        </span>
                      </Td>
                      <Td className="text-center">
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.distinct_products_count}
                          </span>
                          <span>prod</span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.shipments_count}
                          </span>
                          <span>dispatches</span>
                        </div>
                      </Td>
                      <Td>
                        {item.last_dispatched_at ? (
                          <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                            {formatBDDate(item.last_dispatched_at)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Never</span>
                        )}
                      </Td>
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
