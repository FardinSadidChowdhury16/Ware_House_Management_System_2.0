import { useMemo, useState } from "react";
import {
  Truck,
  Plus,
  Edit2,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  Power,
  Eye,
  CreditCard,
  Hash,
  Building2,
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
import { useSuppliers } from "../hooks/useSuppliers.js";
import { useWarehouseFilter } from "../../../app/context/WarehouseFilterContext.jsx";
import { useAuth } from "../../auth/hooks/useAuth.js";
import { hasPermission } from "../../../components/layout/navigationConfig.js";

export function SuppliersPage() {
  const { isAdmin, user } = useAuth();
  const canWrite = isAdmin || hasPermission(user, "supplier_write");
  const { confirm } = useConfirm();
  const { selectedWarehouseId, myWarehouses } = useWarehouseFilter();
  const currentWh = myWarehouses.find((w) => w.id === selectedWarehouseId);
  const {
    suppliers,
    isLoading,
    createSupplier,
    updateSupplier,
    toggleSupplierStatus,
  } = useSuppliers();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    supplier_code: "",
    phone: "",
    email: "",
    address: "",
    shipping_details: "",
    billing_details: "",
  });

  const [formError, setFormError] = useState("");

  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter((s) => s.status === "Active").length;
    return { total, active };
  }, [suppliers]);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      const matchStatus =
        statusFilter === "All" || s.status === statusFilter;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.supplier_code && s.supplier_code !== "—" && s.supplier_code.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [suppliers, statusFilter, search]);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setForm({
      name: "",
      supplier_code: "",
      phone: "",
      email: "",
      address: "",
      shipping_details: "",
      billing_details: "",
    });
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (sup) => {
    setEditingSupplier(sup);
    setForm({
      name: sup.name,
      supplier_code: sup.supplier_code !== "—" ? sup.supplier_code : "",
      phone: sup.phone !== "—" ? sup.phone : "",
      email: sup.email !== "—" ? sup.email : "",
      address: sup.address !== "—" ? sup.address : "",
      shipping_details: sup.shipping_details !== "—" ? sup.shipping_details : "",
      billing_details: sup.billing_details !== "—" ? sup.billing_details : "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError("Supplier name is required.");
      return;
    }

    try {
      if (editingSupplier) {
        await updateSupplier({
          id: editingSupplier.id,
          payload: {
            name: form.name.trim(),
            supplier_code: form.supplier_code.trim() || undefined,
            phone: form.phone.trim() || undefined,
            email: form.email.trim() || undefined,
            address: form.address.trim() || undefined,
            shipping_details: form.shipping_details.trim() || undefined,
            billing_details: form.billing_details.trim() || undefined,
          },
        });
      } else {
        await createSupplier({
          name: form.name.trim(),
          supplier_code: form.supplier_code.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
          shipping_details: form.shipping_details.trim() || undefined,
          billing_details: form.billing_details.trim() || undefined,
        });
      }
      setShowModal(false);
    } catch (err) {
      console.error("Failed to save supplier:", err);
      setFormError(
        err?.response?.data?.detail || "An error occurred while saving supplier."
      );
    }
  };

  const handleToggleStatus = async (sup) => {
    const nextAction = sup.is_active ? "deactivate" : "activate";
    const isConfirmed = await confirm({
      title: `${sup.is_active ? "Deactivate" : "Activate"} Supplier`,
      message: `Are you sure you want to ${nextAction} supplier "${sup.name}"?`,
      confirmText: `Yes, ${sup.is_active ? "Deactivate" : "Activate"}`,
      variant: sup.is_active ? "warning" : "success",
    });
    if (!isConfirmed) return;

    try {
      await toggleSupplierStatus(sup.id);
    } catch (err) {
      console.error("Failed to toggle supplier status:", err);
    }
  };

  return (
    <div>
      {/* 1. Summary Metric Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          label="Total Suppliers"
          value={stats.total.toLocaleString()}
          icon={Truck}
          tint="slate"
        />
        <StatCard label="Active Suppliers" value={stats.active.toLocaleString()} icon={Power} tint="emerald" />
      </div>

      {currentWh && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-700">
          <Building2 size={14} className="shrink-0 text-blue-600" />
          <span>Active Warehouse Scope: <strong>{currentWh.name}</strong></span>
        </div>
      )}

      {/* 2. Action Toolbar & Filters */}
      <Toolbar
        action={
          <div className="flex items-center gap-2">
            <ExportCSVButton
              filename="suppliers"
              columns={[
                { label: "ID", key: "id" },
                { label: "Name", key: "name" },
                { label: "Supplier Code", key: "supplier_code" },
                { label: "Phone", key: "phone" },
                { label: "Email", key: "email" },
                { label: "Contact Person", key: "contact_person" },
                { label: "Address", key: "address" },
                { label: "Status", key: "status" },
              ]}
              data={filtered}
            />
            {canWrite && (
              <PrimaryButton icon={Plus} onClick={openCreateModal}>
                Add Supplier
              </PrimaryButton>
            )}
          </div>
        }
      >
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search by name, code, phone, email..."
        />
        <FilterChips
          options={["All", "Active", "Inactive"]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </Toolbar>

      {/* 3. Supplier Data Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sup) => (
                <tr key={sup.id} className="hover:bg-slate-50/50">
                  <Td>
                    <span className="text-xs wms-mono text-slate-500 font-medium">#{sup.id}</span>
                  </Td>
                  <Td>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{sup.name}</p>
                      {sup.supplier_code !== "—" && (
                        <p className="text-xs wms-mono text-slate-500 mt-0.5">{sup.supplier_code}</p>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <Phone size={12} className="text-slate-500 shrink-0" />
                      <span className="wms-mono">{sup.phone || "—"}</span>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <Mail size={12} className="text-slate-500 shrink-0" />
                      <span>{sup.email || "—"}</span>
                    </div>
                  </Td>
                  <Td>
                    <StatusPill status={sup.status} />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      {canWrite && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenActionMenuId((id) => (id === sup.id ? null : sup.id))}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded transition-colors"
                            aria-expanded={openActionMenuId === sup.id}
                            title="More supplier actions"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                            <ChevronDown size={12} />
                          </button>

                          {openActionMenuId === sup.id && (
                            <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-md border border-slate-200 bg-white p-1 text-left shadow-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  openEditModal(sup);
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
                                  handleToggleStatus(sup);
                                }}
                                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-xs hover:bg-slate-50 ${
                                  sup.status === "Active" ? "text-red-700" : "text-emerald-700"
                                }`}
                              >
                                <Power size={13} />
                                {sup.status === "Active" ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setViewingSupplier(sup)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded transition-colors"
                        title="View supplier details"
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
                      ? "Loading supplier records..."
                      : "No suppliers match your search or filter criteria."
                  }
                />
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Supplier Detail View Modal */}
      {viewingSupplier && (
        <Modal
          title="Supplier Details"
          onClose={() => setViewingSupplier(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setViewingSupplier(null)}
                className="text-sm text-slate-500 hover:text-slate-700 px-3.5 py-2"
              >
                Close
              </button>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => {
                    setViewingSupplier(null);
                    openEditModal(viewingSupplier);
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
            {/* Supplier Name & ID */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-slate-900">{viewingSupplier.name}</p>
                <p className="text-xs wms-mono text-slate-400 mt-0.5">ID: #{viewingSupplier.id}</p>
              </div>
              <StatusPill status={viewingSupplier.status} />
            </div>

            {viewingSupplier.supplier_code !== "—" && (
              <>
                <hr className="border-slate-100" />
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Supplier Code</p>
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <Hash size={13} className="text-slate-500" />
                    </div>
                    <span className="wms-mono">{viewingSupplier.supplier_code}</span>
                  </div>
                </div>
              </>
            )}

            <hr className="border-slate-100" />

            {/* Contact Info */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Contact Information</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Phone size={13} className="text-slate-500" />
                  </div>
                  <span className="wms-mono">{viewingSupplier.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Mail size={13} className="text-slate-500" />
                  </div>
                  <span>{viewingSupplier.email || "—"}</span>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Address */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Address</p>
              <div className="flex items-start gap-3 text-sm text-slate-700">
                <div className="w-7 h-7 rounded-full bg-violet-50 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={13} className="text-violet-500" />
                </div>
                <span className="leading-relaxed">{viewingSupplier.address || "—"}</span>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Shipping Address */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Shipping Address</p>
              <div className="flex items-start gap-3 text-sm text-slate-700">
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={13} className="text-blue-500" />
                </div>
                <span className="leading-relaxed">{viewingSupplier.shipping_details || "—"}</span>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Billing Address */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Billing Address</p>
              <div className="flex items-start gap-3 text-sm text-slate-700">
                <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                  <CreditCard size={13} className="text-emerald-500" />
                </div>
                <span className="leading-relaxed">{viewingSupplier.billing_details || "—"}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Supplier Create / Edit Modal */}
      {showModal && (
        <Modal
          title={editingSupplier ? "Edit Supplier" : "Add New Supplier"}
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
                {editingSupplier ? "Update Supplier" : "Create Supplier"}
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
              <Field label="Supplier Name *">
                <TextInput
                  value={form.name}
                  onChange={(v) => {
                    setForm({ ...form, name: v });
                    if (formError) setFormError("");
                  }}
                  placeholder="e.g. Alpha Traders"
                />
              </Field>
              <Field label="Supplier Code">
                <TextInput
                  value={form.supplier_code}
                  onChange={(v) => setForm({ ...form, supplier_code: v })}
                  placeholder="e.g. SUP-001"
                  mono
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone Number">
                <TextInput
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                  placeholder="e.g. +880 1711-000000"
                  mono
                />
              </Field>
              <Field label="Email Address">
                <TextInput
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                  placeholder="e.g. contact@supplier.com"
                />
              </Field>
            </div>

            <Field label="Address">
              <TextInput
                value={form.address}
                onChange={(v) => setForm({ ...form, address: v })}
                placeholder="Main office / warehouse address"
              />
            </Field>

            <Field label="Shipping Address / Details">
              <TextInput
                value={form.shipping_details}
                onChange={(v) => setForm({ ...form, shipping_details: v })}
                placeholder="Delivery / shipping address"
              />
            </Field>

            <Field label="Billing Address / Details">
              <TextInput
                value={form.billing_details}
                onChange={(v) => setForm({ ...form, billing_details: v })}
                placeholder="Tax / invoice billing address"
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
