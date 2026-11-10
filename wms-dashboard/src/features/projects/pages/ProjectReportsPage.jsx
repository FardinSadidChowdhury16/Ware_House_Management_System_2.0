import { useMemo, useState } from "react";
import {
  FolderKanban,
  FileBarChart,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  Info,
} from "lucide-react";
import {
  Badge,
  Card,
  StatCard,
  Th,
  Td,
  SearchBox,
  Toolbar,
  EmptyTable,
  ExportCSVButton,
} from "../../../components/ui/index.js";
import { useProjects } from "../hooks/useProjects.js";
import { formatBDDate } from "../../../shared/utils/dateUtils.js";

export function ProjectReportsPage() {
  const { projects, stats, isLoading } = useProjects();
  const [search, setSearch] = useState("");

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase().trim();
    return projects.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q)
    );
  }, [projects, search]);

  return (
    <div className="space-y-4">
      {/* Informational Banner */}
      <div className="flex items-start gap-3 p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-900 dark:text-blue-200">
        <Info className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" size={16} />
        <div>
          <span className="font-semibold block mb-0.5">Project Reports Section</span>
          <p className="text-slate-600 dark:text-slate-400">
            Overview of project allocation, active job sites, and status reports. Detailed stock consumption and milestone reports will be configured here.
          </p>
        </div>
      </div>

      {/* Summary StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Registered Projects"
          value={isLoading ? "..." : stats.total_projects}
          icon={FolderKanban}
          tint="blue"
        />
        <StatCard
          label="Active Site Projects"
          value={isLoading ? "..." : stats.active_projects}
          icon={CheckCircle2}
          tint="emerald"
        />
        <StatCard
          label="Completed Projects"
          value={isLoading ? "..." : stats.completed_projects}
          icon={Clock}
          tint="purple"
        />
        <StatCard
          label="On-Hold Projects"
          value={isLoading ? "..." : stats.on_hold_projects}
          icon={AlertCircle}
          tint="amber"
        />
      </div>

      {/* Toolbar */}
      <Toolbar
        action={
          <ExportCSVButton
            filename="Project_Reports_Summary"
            data={filteredProjects}
            columns={[
              { label: "Project Code", key: "code" },
              { label: "Project Name", key: "name" },
              { label: "Location", key: "location" },
              { label: "Contact Info", key: "contact_info" },
              { label: "Status", key: "status" },
              { label: "Created Date", key: "created_at" },
            ]}
          />
        }
      >
        <SearchBox
          placeholder="Search project summary by name, code, site location..."
          value={search}
          onChange={setSearch}
        />
      </Toolbar>

      {/* Projects Summary Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th className="w-12">#</Th>
                <Th>Code</Th>
                <Th>Project Name</Th>
                <Th>Site Location</Th>
                <Th>Contact Person / Info</Th>
                <Th>Status</Th>
                <Th>Registered On</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-sm text-slate-400">
                    Loading project summary reports...
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <EmptyTable cols={7} message="No project reports available." />
              ) : (
                filteredProjects.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <Td mono className="text-xs text-slate-400">
                      {idx + 1}
                    </Td>
                    <Td>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {p.code}
                      </span>
                    </Td>
                    <Td className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      {p.name}
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <MapPin size={13} className="shrink-0 text-slate-400" />
                        {p.location}
                      </span>
                    </Td>
                    <Td className="text-xs text-slate-700 dark:text-slate-300">
                      {p.contact_info}
                    </Td>
                    <Td>
                      <Badge
                        color={
                          p.status === "active"
                            ? "emerald"
                            : p.status === "completed"
                            ? "blue"
                            : "amber"
                        }
                      >
                        {p.status}
                      </Badge>
                    </Td>
                    <Td mono className="text-xs text-slate-500 dark:text-slate-400">
                      {formatBDDate(p.created_at)}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
