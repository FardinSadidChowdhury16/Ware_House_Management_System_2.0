import { useMemo, useState } from "react";
import {
  Building2,
  Plus,
  Edit2,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  Power,
  Eye,
  CreditCard,
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
import { useCustomers } from "../hooks/useCustomers.js";
import { useWarehouseFilter } from "../../../app/context/WarehouseFilterContext.jsx";
import { useAuth } from "../../auth/hooks/useAuth.js";
import { hasPermission } from "../../../components/layout/navigationConfig.js";

export function CustomersPage() {
  const { isAdmin, user } = useAuth();
  const canWrite = isAdmin || hasPermission(user, "customer_write");
  const { confirm } = useConfirm();
  const { selectedWarehouseId, myWarehouses } = useWarehouseFilter();
  const currentWh = myWarehouses.find((w) => w.id === selectedWarehouseId);
  const {
    customers,
    isLoading,
    createCustomer,
    updateCustomer,
    toggleCustomerStatus,
  } = useCustomers();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    shipping_details: "",
    billing_details: "",
  });

  const [formError, setFormError] = useState("");

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.status === "Active").length;
    return { total, active };
  }, [customers]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchStatus =
        statusFilter === "All" || c.status === statusFilter;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.shipping_details && c.shipping_details.toLowerCase().includes(q)) ||
        (c.billing_details && c.billing_details.toLowerCase().includes(q));

      return matchStatus && matchSearch;
    });
  }, [customers, statusFilter, search]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setForm({
      name: "",
      phone: "",
      email: "",
      shipping_details: "",
      billing_details: "",
    });
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (cust) => {
    setEditingCustomer(cust);
    setForm({
      name: cust.name,
      phone: cust.phone !== "—" ? cust.phone : "",
      email: cust.email !== "—" ? cust.email : "",
      shipping_details:
        cust.shipping_details !== "—" ? cust.shipping_details : "",
      billing_details:
        cust.billing_details !== "—" ? cust.billing_details : "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError("Customer name is required.");
      return;
    }

    try {
      if (editingCustomer) {
        await updateCustomer({
          id: editingCustomer.id,
          payload: {
            name: form.name.trim(),
            phone: form.phone.trim() || undefined,
            email: form.email.trim() || undefined,
            shipping_details: form.shipping_details.trim() || undefined,
            billing_details: form.billing_details.trim() || undefined,
          },
        });
      } else {
        await createCustomer({
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          shipping_details: form.shipping_details.trim() || undefined,
          billing_details: form.billing_details.trim() || undefined,
        });
      }
      setShowModal(false);
    } catch (err) {
      console.error("Failed to save customer:", err);
      setFormError(
        err?.response?.data?.detail || "An error occurred while saving customer."
      );
    }
  };

  const handleToggleStatus = async (cust) => {
    const nextAction = cust.is_active ? "deactivate" : "activate";
    const isConfirmed = await confirm({
      title: `${cust.is_active ? "Deactivate" : "Activate"} Customer`,
      message: `Are you sure you want to ${nextAction} customer "${cust.name}"?`,
      confirmText: `Yes, ${cust.is_active ? "Deactivate" : "Activate"}`,
      variant: cust.is_active ? "warning" : "success",
    });
    if (!isConfirmed) return;

    try {
      await toggleCustomerStatus(cust.id);
    } catch (err) {
      console.error("Failed to toggle customer status:", err);
    }
  };

  return (
    <div>
      {/* 1. Summary Metric Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          label="Total Customers"
          value={stats.total.toLocaleString()}
          icon={Building2}
          tint="slate"
        />
        <StatCard label="Active Customers" value={stats.active.toLocaleString()} icon={Power} tint="emerald" />
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
              filename="customers"
              columns={[
                { label: "ID", key: "id" },
                { label: "Name", key: "name" },
                { label: "Phone", key: "phone" },
                { label: "Email", key: "email" },
                { label: "Shipping Details", key: "shipping_details" },
                { label: "Billing Details", key: "billing_details" },
                { label: "Status", key: "status" },
              ]}
              data={filtered}
            />
            {canWrite && (
              <PrimaryButton icon={Plus} onClick={openCreateModal}>
                Add Customer
              </PrimaryButton>
            )}
          </div>
        }
      >
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search by name, phone, email, location..."
        />
        <FilterChips
          options={["All", "Active", "Inactive"]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </Toolbar>

      {/* 3. Customer Data Table */}
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
              {filtered.map((cust) => (
                <tr key={cust.id} className="hover:bg-slate-50/50">
                  <Td>
                    <span className="text-xs wms-mono text-slate-500 font-medium">#{cust.id}</span>
                  </Td>
                  <Td>
                    <p className="font-semibold text-slate-900 text-sm">{cust.name}</p>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <Phone size={12} className="text-slate-500 shrink-0" />
                      <span className="wms-mono">{cust.phone || "—"}</span>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <Mail size={12} className="text-slate-500 shrink-0" />
                      <span>{cust.email || "—"}</span>
                    </div>
                  </Td>
                  <Td>
                    <StatusPill status={cust.status} />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      {canWrite && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenActionMenuId((id) => (id === cust.id ? null : cust.id))}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded transition-colors"
                            aria-expanded={openActionMenuId === cust.id}
                            title="More customer actions"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                            <ChevronDown size={12} />
                          </button>

                          {openActionMenuId === cust.id && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-slate-200 bg-white p-1 text-left shadow-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  openEditModal(cust);
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
                                  handleToggleStatus(cust);
                                }}
                                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-xs hover:bg-slate-50 ${
                                  cust.status === "Active" ? "text-red-700" : "text-emerald-700"
                                }`}
                              >
                                <Power size={13} />
                                {cust.status === "Active" ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setViewingCustomer(cust)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded transition-colors"
                        title="View customer details"
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
                      ? "Loading customer records..."
                      : "No customers match your search or filter criteria."
                  }
                />
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Customer Detail View Modal */}
      {viewingCustomer && (
        <Modal
          title="Customer Details"
          onClose={() => setViewingCustomer(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className="text-sm text-slate-500 hover:text-slate-700 px-3.5 py-2"
              >
                Close
              </button>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => {
                    setViewingCustomer(null);
                    openEditModal(viewingCustomer);
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
            {/* Customer Name & ID */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-slate-900">{viewingCustomer.name}</p>
                <p className="text-xs wms-mono text-slate-400 mt-0.5">ID: #{viewingCustomer.id}</p>
              </div>
              <StatusPill status={viewingCustomer.status} />
            </div>

            <hr className="border-slate-100" />

            {/* Contact Info */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Contact Information</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Phone size={13} className="text-slate-500" />
                  </div>
                  <span className="wms-mono">{viewingCustomer.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Mail size={13} className="text-slate-500" />
                  </div>
                  <span>{viewingCustomer.email || "—"}</span>
                </div>
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
                <span className="leading-relaxed">{viewingCustomer.shipping_details || "—"}</span>
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
                <span className="leading-relaxed">{viewingCustomer.billing_details || "—"}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Customer Create / Edit Modal */}
      {showModal && (
        <Modal
          title={editingCustomer ? "Edit Customer" : "Add New Customer"}
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
                {editingCustomer ? "Update Customer" : "Create Customer"}
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
            <Field label="Customer Name *">
              <TextInput
                value={form.name}
                onChange={(v) => {
                  setForm({ ...form, name: v });
                  if (formError) setFormError("");
                }}
                placeholder="e.g. Acme Corporation or Rahim Store"
              />
            </Field>

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
                  placeholder="e.g. contact@example.com"
                />
              </Field>
            </div>

            <Field label="Shipping Address / Details">
              <TextInput
                value={form.shipping_details}
                onChange={(v) => setForm({ ...form, shipping_details: v })}
                placeholder="Warehouse / shop delivery address"
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
