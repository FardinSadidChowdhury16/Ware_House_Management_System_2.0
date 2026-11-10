import { useMemo, useState, useEffect } from "react";
import {
  FolderKanban,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Building,
  Package,
} from "lucide-react";
import {
  Badge,
  Card,
  PrimaryButton,
  GhostButton,
  Th,
  Td,
  StatCard,
  TextInput,
  Select,
  Modal,
  SearchBox,
  Toolbar,
  EmptyTable,
  Pagination,
  useConfirm,
  useToast,
  ExportCSVButton,
} from "../../../components/ui/index.js";
import { Field } from "../../../components/ui/Field.jsx";
import { useProjects } from "../hooks/useProjects.js";
import { projectsApi } from "../api/projectsApi.js";
import { useAuth } from "../../auth/hooks/useAuth.js";
import { hasPermission } from "../../../components/layout/navigationConfig.js";
import { formatBDDate, formatBDDateTime } from "../../../shared/utils/dateUtils.js";
import { ProjectViewModal } from "../components/ProjectViewModal.jsx";

const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "On Hold", value: "on_hold" },
  { label: "Completed", value: "completed" },
];

export function ProjectsPage() {
  const { isAdmin, user } = useAuth();
  const canWrite = isAdmin || hasPermission(user, "project_write");
  const { confirm } = useConfirm();
  const toast = useToast();

  const {
    projects,
    stats,
    isLoading,
    createProject,
    updateProject,
    deleteProject,
    isCreating,
    isUpdating,
  } = useProjects();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [viewingProject, setViewingProject] = useState(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    code: "",
    location: "",
    contact_info: "",
    description: "",
    status: "active",
  });
  const [formError, setFormError] = useState("");

  // Filtered & Paginated Projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.contact_info?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }, [projects, statusFilter, search]);

  const pagedProjects = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProjects.slice(start, start + PAGE_SIZE);
  }, [filteredProjects, page]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingProject(null);
    setForm({
      name: "",
      code: "",
      location: "",
      contact_info: "",
      description: "",
      status: "active",
    });
    setFormError("");
    setShowModal(true);
  };

  // Open Edit Modal
  const openEditModal = (p) => {
    setEditingProject(p);
    setForm({
      name: p.name || "",
      code: p.code || "",
      location: p.location || "",
      contact_info: p.contact_info || "",
      description: p.description || "",
      status: p.status || "active",
    });
    setFormError("");
    setShowModal(true);
  };

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim()) {
      setFormError("Project Name is required.");
      return;
    }
    if (!form.code.trim()) {
      setFormError("Project Code is required.");
      return;
    }
    if (!form.location.trim()) {
      setFormError("Location is required.");
      return;
    }
    if (!form.contact_info.trim()) {
      setFormError("Contact Information is required.");
      return;
    }

    try {
      if (editingProject) {
        await updateProject({
          id: editingProject.id,
          payload: form,
        });
        toast?.success?.("Project updated successfully.");
      } else {
        await createProject(form);
        toast?.success?.("New project created successfully.");
      }
      setShowModal(false);
    } catch (err) {
      setFormError(err.response?.data?.detail || err.message || "Failed to save project.");
    }
  };

  // Handle Delete
  const handleDelete = async (p) => {
    const confirmed = await confirm({
      title: "Delete Project",
      message: `Are you sure you want to permanently delete project "${p.name}" (${p.code})? This action cannot be undone.`,
      confirmLabel: "Delete",
      confirmVariant: "danger",
    });

    if (confirmed) {
      try {
        await deleteProject(p.id);
        toast?.success?.(`Project "${p.name}" deleted successfully.`);
      } catch (err) {
        toast?.error?.(err.response?.data?.detail || err.message || "Failed to delete project.");
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge color="emerald">Active</Badge>;
      case "completed":
        return <Badge color="blue">Completed</Badge>;
      case "on_hold":
        return <Badge color="amber">On Hold</Badge>;
      default:
        return <Badge color="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Projects"
          value={isLoading ? "..." : stats.total_projects}
          icon={FolderKanban}
          tint="blue"
        />
        <StatCard
          label="Active Projects"
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
          label="On Hold"
          value={isLoading ? "..." : stats.on_hold_projects}
          icon={AlertCircle}
          tint="amber"
        />
      </div>

      {/* Toolbar */}
      <Toolbar
        action={
          <div className="flex items-center gap-2">
            <ExportCSVButton
              filename="Projects_List"
              data={filteredProjects}
              columns={[
                { label: "ID", key: "id" },
                { label: "Project Code", key: "code" },
                { label: "Project Name", key: "name" },
                { label: "Location", key: "location" },
                { label: "Contact Info", key: "contact_info" },
                { label: "Status", key: "status" },
                { label: "Description", key: "description" },
                { label: "Created Date", key: "created_at" },
              ]}
            />
            {canWrite && (
              <PrimaryButton onClick={openCreateModal} className="flex items-center gap-1.5 text-xs py-1.5">
                <Plus size={14} />
                New Project
              </PrimaryButton>
            )}
          </div>
        }
      >
        <SearchBox
          placeholder="Search projects by name, code, location, contact..."
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <Select
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
          className="w-auto min-w-36 text-xs py-1.5"
        />
      </Toolbar>

      {/* Projects Table Card */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th className="w-12">#</Th>
                <Th>Code</Th>
                <Th>Project Name</Th>
                <Th>Location</Th>
                <Th>Contact Info</Th>
                <Th>Status</Th>
                <Th>Created Date</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-sm text-slate-400">
                    Loading projects...
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <EmptyTable cols={8} message="No projects found. Click 'New Project' to create one." />
              ) : (
                pagedProjects.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <Td mono className="text-xs text-slate-400">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </Td>
                    <Td>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {p.code}
                      </span>
                    </Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => setViewingProject(p)}
                        className="font-semibold text-slate-900 dark:text-slate-100 text-sm hover:text-blue-600 dark:hover:text-blue-400 text-left transition-colors cursor-pointer"
                        title="Click to view project details & assigned items"
                      >
                        {p.name}
                      </button>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <MapPin size={13} className="shrink-0 text-slate-400" />
                        <span className="truncate max-w-[180px]">{p.location}</span>
                      </span>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <Phone size={13} className="shrink-0 text-slate-400" />
                        <span className="truncate max-w-[200px]">{p.contact_info}</span>
                      </span>
                    </Td>
                    <Td>{getStatusBadge(p.status)}</Td>
                    <Td mono className="text-xs text-slate-500 dark:text-slate-400">
                      {formatBDDate(p.created_at)}
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingProject(p)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        {canWrite && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit Project"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Delete Project"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredProjects.length > PAGE_SIZE && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <Pagination
              currentPage={page}
              totalItems={filteredProjects.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* Create / Edit Project Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingProject ? "Edit Project" : "Create New Project"}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Project Name *" required>
                <TextInput
                  placeholder="e.g. Metro Rail Line-6"
                  value={form.name}
                  onChange={(v) => {
                    const val = typeof v === "string" ? v : v?.target?.value ?? "";
                    setForm((prev) => ({ ...prev, name: val }));
                    if (formError) setFormError("");
                  }}
                  required
                />
              </Field>

              <Field label="Project Code *" required hint="Unique identifier code">
                <TextInput
                  placeholder="e.g. PRJ-MRT-06"
                  value={form.code}
                  onChange={(v) => {
                    const val = typeof v === "string" ? v : v?.target?.value ?? "";
                    setForm((prev) => ({ ...prev, code: val.toUpperCase() }));
                    if (formError) setFormError("");
                  }}
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Location *" required hint="Site location, district or city">
                <TextInput
                  placeholder="e.g. Uttara Depot, Dhaka"
                  value={form.location}
                  onChange={(v) => {
                    const val = typeof v === "string" ? v : v?.target?.value ?? "";
                    setForm((prev) => ({ ...prev, location: val }));
                    if (formError) setFormError("");
                  }}
                  required
                />
              </Field>

              <Field label="Status">
                <Select
                  value={form.status}
                  onChange={(v) => setForm((prev) => ({ ...prev, status: v }))}
                  options={[
                    { label: "Active", value: "active" },
                    { label: "On Hold", value: "on_hold" },
                    { label: "Completed", value: "completed" },
                  ]}
                />
              </Field>
            </div>

            <Field label="Contact Info *" required hint="Person name, phone number, and email">
              <TextInput
                placeholder="e.g. Engr. Tanvir Ahmed (Project Director) - 01711-XXXXXX, tanvir@metrorail.gov.bd"
                value={form.contact_info}
                onChange={(v) => {
                  const val = typeof v === "string" ? v : v?.target?.value ?? "";
                  setForm((prev) => ({ ...prev, contact_info: val }));
                  if (formError) setFormError("");
                }}
                required
              />
            </Field>

            <Field label="Project Description / Notes">
              <textarea
                rows={3}
                placeholder="Optional overview, milestone targets, or warehouse delivery instructions..."
                value={form.description}
                onChange={(e) => {
                  const val = typeof e === "string" ? e : e?.target?.value ?? "";
                  setForm((prev) => ({ ...prev, description: val }));
                }}
                className="w-full text-xs p-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <GhostButton type="button" onClick={() => setShowModal(false)}>
                Cancel
              </GhostButton>
              <PrimaryButton type="submit" disabled={isCreating || isUpdating}>
                {editingProject
                  ? isUpdating
                    ? "Saving..."
                    : "Update Project"
                  : isCreating
                  ? "Creating..."
                  : "Create Project"}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Project Details Modal */}
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
