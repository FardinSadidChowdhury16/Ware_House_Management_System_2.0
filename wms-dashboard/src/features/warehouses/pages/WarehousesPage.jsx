import { useMemo, useState } from "react";
import {
  Warehouse,
  Plus,
  Edit2,
  ChevronDown,
  MapPin,
  Power,
  Eye,
} from "lucide-react";
import {
  Card,
  PrimaryButton,
  Th,
  Td,
  StatCard,
  TextInput,
  Modal,
  FilterChips,
  SearchBox,
  Toolbar,
  EmptyTable,
  useConfirm,
  ExportCSVButton,
} from "../../../components/ui/index.js";
import { Field } from "../../../components/ui/Field.jsx";
import { StatusPill } from "../../../components/ui/StatusPill.jsx";
import { useWarehouses } from "../hooks/useWarehouses.js";
import { useWarehouseFilter } from "../../../app/context/WarehouseFilterContext.jsx";
import { useAuth } from "../../auth/hooks/useAuth.js";
import { hasPermission } from "../../../components/layout/navigationConfig.js";

export function WarehousesPage() {
  const { isAdmin, user } = useAuth();
  const canWrite = isAdmin || hasPermission(user, "warehouse_write");
  const { confirm } = useConfirm();
  const { selectedWarehouseId } = useWarehouseFilter();
  const {
    warehouses,
    isLoading,
    createWarehouse,
    updateWarehouse,
    toggleStatus,
  } = useWarehouses();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [viewingWarehouse, setViewingWarehouse] = useState(null);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  const [form, setForm] = useState({ code: "", name: "", address: "" });
  const [formError, setFormError] = useState("");

  const stats = useMemo(() => {
    const list = selectedWarehouseId
      ? warehouses.filter((w) => String(w.id) === String(selectedWarehouseId))
      : warehouses;
    const total = list.length;
    const active = list.filter((w) => w.status === "Active").length;
    return { total, active };
  }, [warehouses, selectedWarehouseId]);

  const filtered = useMemo(() => {
    return warehouses.filter((w) => {
      const matchStatus = statusFilter === "All" || w.status === statusFilter;
      const matchSelectedWarehouse = !selectedWarehouseId || String(w.id) === String(selectedWarehouseId);
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        (w.address && w.address.toLowerCase().includes(q));
      return matchStatus && matchSearch && matchSelectedWarehouse;
    });
  }, [warehouses, statusFilter, search, selectedWarehouseId]);

  const openCreateModal = () => {
    setEditingWarehouse(null);
    setForm({ code: "", name: "", address: "" });
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (wh) => {
    setEditingWarehouse(wh);
    setForm({
      code: wh.code,
      name: wh.name,
      address: wh.address !== "—" ? wh.address : "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setFormError("Warehouse code and name are required.");
      return;
    }

    try {
      if (editingWarehouse) {
        await updateWarehouse({
          id: editingWarehouse.id,
          payload: {
            code: form.code.trim().toUpperCase(),
            name: form.name.trim(),
            address: form.address.trim() || undefined,
          },
        });
      } else {
        await createWarehouse({
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          address: form.address.trim() || undefined,
        });
      }
      setShowModal(false);
    } catch (err) {
      console.error("Failed to save warehouse:", err);
      
      setFormError(
        err?.response?.data?.detail || "An error occurred while saving warehouse."
      );
    }
  };

  const handleToggleStatus = async (wh) => {
    const nextAction = wh.is_active ? "deactivate" : "activate";
    const isConfirmed = await confirm({
      title: `${wh.is_active ? "Deactivate" : "Activate"} Warehouse`,
      message: `Are you sure you want to ${nextAction} warehouse "${wh.name}"?`,
      confirmText: `Yes, ${wh.is_active ? "Deactivate" : "Activate"}`,
      variant: wh.is_active ? "warning" : "success",
    });
    if (!isConfirmed) return;

    try {
      await toggleStatus(wh.id);
    } catch (err) {
      console.error("Failed to toggle warehouse status:", err);
    }
  };

  return (
    <div>
      {/* 1. Summary Metric Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          label="Total Warehouses"
          value={stats.total.toLocaleString()}
          icon={Warehouse}
          tint="slate"
        />
        <StatCard
          label="Active Warehouses"
          value={stats.active.toLocaleString()}
          icon={Power}
          tint="emerald"
        />
      </div>

      {/* 2. Action Toolbar & Filters */}
      <Toolbar
        action={
          <div className="flex items-center gap-2">
            <ExportCSVButton
              filename="warehouses"
              columns={[
                { label: "ID", key: "id" },
                { label: "Name", key: "name" },
                { label: "Code", key: "code" },
                { label: "Address", key: "address" },
                { label: "Status", key: "status" },
              ]}
              data={filtered}
            />
            {canWrite && (
              <PrimaryButton icon={Plus} onClick={openCreateModal}>
                Add Warehouse
              </PrimaryButton>
            )}
          </div>
        }
      >
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search by name, code, address..."
        />
        <FilterChips
          options={["All", "Active", "Inactive"]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </Toolbar>

      {/* 3. Warehouse Data Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Name</Th>
                <Th>Code</Th>
                <Th>Address</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((wh) => (
                <tr key={wh.id} className="hover:bg-slate-50/50">
                  <Td>
                    <span className="text-xs wms-mono text-slate-500 font-medium">#{wh.id}</span>
                  </Td>
                  <Td>
                    <p className="font-semibold text-slate-900 text-sm">{wh.name}</p>
                  </Td>
                  <Td>
                    <span className="text-xs wms-mono text-slate-800 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{wh.code}</span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <MapPin size={12} className="text-slate-500 shrink-0" />
                      <span>{wh.address || "—"}</span>
                    </div>
                  </Td>
                  <Td>
                    <StatusPill status={wh.status} />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      {canWrite && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenActionMenuId((id) => (id === wh.id ? null : wh.id))}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded transition-colors"
                            aria-expanded={openActionMenuId === wh.id}
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                            <ChevronDown size={12} />
                          </button>

                          {openActionMenuId === wh.id && (
                            <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-md border border-slate-200 bg-white p-1 text-left shadow-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  openEditModal(wh);
                                }}
                                className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                              >
                                <Edit2 size={13} />
                                Edit details
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleToggleStatus(wh);
                                }}
                                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-xs hover:bg-slate-50 ${
                                  wh.status === "Active" ? "text-red-700" : "text-emerald-700"
                                }`}
                              >
                                <Power size={13} />
                                {wh.status === "Active" ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setViewingWarehouse(wh)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded transition-colors"
                        title="View warehouse details"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <EmptyTable
                  cols={6}
                  message={
                    isLoading
                      ? "Loading warehouse records..."
                      : "No warehouses match your search or filter criteria."
                  }
                />
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Warehouse Detail View Modal */}
      {viewingWarehouse && (
        <Modal
          title="Warehouse Details"
          onClose={() => setViewingWarehouse(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setViewingWarehouse(null)}
                className="text-sm text-slate-500 hover:text-slate-700 px-3.5 py-2"
              >
                Close
              </button>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => {
                    setViewingWarehouse(null);
                    openEditModal(viewingWarehouse);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 px-4 py-2 rounded-md transition-colors"
                >
                  <Edit2 size={13} />
                  Edit
                </button>
              )}
            </>
          }
        >
          <div className="space-y-5">
            {/* Name & ID */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-slate-900">{viewingWarehouse.name}</p>
                <p className="text-xs wms-mono text-slate-400 mt-0.5">ID: #{viewingWarehouse.id}</p>
              </div>
              <StatusPill status={viewingWarehouse.status} />
            </div>

            <hr className="border-slate-100" />

            {/* Code */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Warehouse Code</p>
              <span className="text-sm wms-mono text-slate-700 bg-slate-100 px-3 py-1.5 rounded">
                {viewingWarehouse.code}
              </span>
            </div>

            <hr className="border-slate-100" />

            {/* Address */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Address</p>
              <div className="flex items-start gap-3 text-sm text-slate-700">
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={13} className="text-blue-500" />
                </div>
                <span className="leading-relaxed">{viewingWarehouse.address || "—"}</span>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Items on hand */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Items on Hand</p>
              <span className="text-sm font-semibold wms-mono text-slate-900">
                {(viewingWarehouse.items ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Warehouse Create / Edit Modal */}
      {showModal && (
        <Modal
          title={editingWarehouse ? "Edit Warehouse" : "Add New Warehouse"}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-sm text-slate-500 hover:text-slate-700 px-3.5 py-2"
              >
                Cancel
              </button>
              <PrimaryButton onClick={handleSubmit}>
                {editingWarehouse ? "Update Warehouse" : "Create Warehouse"}
              </PrimaryButton>
            </>
          }
        >
          {formError && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-600 font-medium">
              {formError}
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Warehouse Code *">
                <TextInput
                  value={form.code}
                  onChange={(v) => {
                    setForm({ ...form, code: v });
                    if (formError) setFormError("");
                  }}
                  placeholder="e.g. RAJ-01"
                  mono
                />
              </Field>
              <Field label="Warehouse Name *">
                <TextInput
                  value={form.name}
                  onChange={(v) => {
                    setForm({ ...form, name: v });
                    if (formError) setFormError("");
                  }}
                  placeholder="e.g. Rajshahi Warehouse"
                />
              </Field>
            </div>
            <Field label="Address">
              <TextInput
                value={form.address}
                onChange={(v) => setForm({ ...form, address: v })}
                placeholder="City / area / full address"
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
