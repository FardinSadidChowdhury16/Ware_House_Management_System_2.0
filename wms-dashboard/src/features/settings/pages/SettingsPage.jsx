import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Badge, Card, PrimaryButton, GhostButton,
  Th, Td, TextInput, Select, Modal, FilterChips,
  SearchBox, Toolbar, EmptyTable, useToast, useConfirm, ExportCSVButton
} from "../../../components/ui/index.js";
import { Field } from "../../../components/ui/Field.jsx";
import { useProducts } from "../../products/hooks/useProducts.js";
import { useAuth } from "../../auth/hooks/useAuth.js";
import { hasPermission } from "../../../components/layout/navigationConfig.js";

const SETTINGS_TABS = [
  { id: "tax", label: "Tax Rules" },
  { id: "general", label: "General System" },
];

export function SettingsPage() {
  const { isAdmin, user } = useAuth();
  const canWrite = isAdmin || hasPermission(user, "tax_write");
  const [activeTab, setActiveTab] = useState("tax");
  const { taxRules, createTaxRule, updateTaxRule, deleteTaxRule } = useProducts({ page: 1, pageSize: 1 });
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [calcFilter, setCalcFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deletingRule, setDeletingRule] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    calc_type: "percentage",
    value: "",
    description: "",
  });

  const openCreate = () => {
    setEditingRule(null);
    setForm({ name: "", calc_type: "percentage", value: "", description: "" });
    setShowModal(true);
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name || "",
      calc_type: rule.calc_type || "percentage",
      value: rule.value !== undefined ? String(rule.value) : "",
      description: rule.description || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast({ type: "error", title: "Error", message: "Rule name is required." });
      return;
    }
    if (!form.value || isNaN(Number(form.value)) || Number(form.value) < 0) {
      showToast({ type: "error", title: "Error", message: "Enter a valid positive number for rate/amount." });
      return;
    }

    const payload = {
      name: form.name.trim(),
      calc_type: form.calc_type,
      value: Number(form.value),
      description: form.description.trim() || null,
    };

    setActionLoading(true);
    try {
      if (editingRule) {
        await updateTaxRule({ id: editingRule.id, payload });
        showToast({ type: "success", title: "Updated!", message: "Tax rule changes have been saved." });
      } else {
        await createTaxRule(payload);
        showToast({ type: "success", title: "Success!", message: "New tax rule created." });
      }
      setShowModal(false);
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        message: err?.response?.data?.detail || "Operation failed.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRule) return;
    setActionLoading(true);
    try {
      await deleteTaxRule({ id: deletingRule.id });
      showToast({ type: "success", title: "Deleted!", message: `"${deletingRule.name}" has been removed.` });
      setDeletingRule(null);
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        message: err?.response?.data?.detail || "Failed to delete tax rule.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRules = (taxRules || []).filter((r) => {
    const matchesCalc =
      calcFilter === "All" ||
      (calcFilter === "Percentage" && r.calc_type === "percentage") ||
      (calcFilter === "Fixed" && r.calc_type === "fixed");
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCalc && matchesSearch;
  });

  return (
    <div>
      {/* Settings Tab Navigation */}
      <div className="flex gap-1 mb-5 border-b border-slate-200">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "tax" ? (
        <>
          <Toolbar
            action={
              <div className="flex items-center gap-2">
                <ExportCSVButton
                  filename="tax-rules"
                  columns={[
                    { label: "ID", key: "id" },
                    { label: "Rule Name", key: "name" },
                    { label: "Calculation Type", value: (r) => (r.calc_type === "percentage" ? "Percentage (%)" : "Fixed (৳)") },
                    { label: "Rate / Amount", value: (r) => (r.calc_type === "percentage" ? `${r.value}%` : `৳ ${r.value}`) },
                    { label: "Description", value: (r) => r.description || "—" },
                  ]}
                  data={filteredRules}
                />
                {canWrite && (
                  <PrimaryButton icon={Plus} onClick={openCreate}>
                    Add Tax Rule
                  </PrimaryButton>
                )}
              </div>
            }
          >
            <SearchBox value={search} onChange={setSearch} placeholder="Search tax rules..." />
            <FilterChips
              options={["All", "Percentage", "Fixed"]}
              value={calcFilter}
              onChange={setCalcFilter}
            />
          </Toolbar>

          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Rule Name</Th>
                  <Th>Calculation Type</Th>
                  <Th>Rate / Amount</Th>
                  <Th>Description</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors">
                    <Td className="font-medium text-slate-900">{rule.name}</Td>
                    <Td>
                      <Badge color={rule.calc_type === "percentage" ? "blue" : "purple"}>
                        {rule.calc_type === "percentage" ? "Percentage (%)" : "Fixed (৳)"}
                      </Badge>
                    </Td>
                    <Td className="font-semibold text-slate-800">
                      {rule.calc_type === "percentage" ? `${rule.value}%` : `৳ ${rule.value}`}
                    </Td>
                    <Td className="text-slate-500 max-w-xs truncate">
                      {rule.description || "—"}
                    </Td>
                    <Td className="text-right">
                      {canWrite ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(rule)}
                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingRule(rule)}
                            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
                {filteredRules.length === 0 && <EmptyTable cols={5} />}
              </tbody>
            </table>
          </Card>

          {/* Create / Edit Modal */}
          {showModal && (
            <Modal
              title={editingRule ? "Edit Tax Rule" : "Add Tax Rule"}
              onClose={() => setShowModal(false)}
              footer={
                <>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="text-sm text-slate-500 px-3.5 py-2"
                  >
                    Cancel
                  </button>
                  <PrimaryButton onClick={handleSave} disabled={actionLoading}>
                    {actionLoading ? "Saving..." : editingRule ? "Save Changes" : "Add Rule"}
                  </PrimaryButton>
                </>
              }
            >
              <Field label="Rule Name *">
                <TextInput
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  placeholder="e.g. Standard VAT (15%)"
                />
              </Field>
              <Field label="Calculation Type">
                <Select
                  value={form.calc_type}
                  onChange={(v) => setForm({ ...form, calc_type: v })}
                  options={[
                    { value: "percentage", label: "Percentage (%)" },
                    { value: "fixed", label: "Fixed Amount (৳)" },
                  ]}
                />
              </Field>
              <Field label={`Rate / Amount (${form.calc_type === "percentage" ? "%" : "৳"}) *`}>
                <TextInput
                  type="number"
                  value={form.value}
                  onChange={(v) => setForm({ ...form, value: v })}
                  placeholder={form.calc_type === "percentage" ? "15" : "50"}
                />
              </Field>
              <Field label="Description (optional)">
                <TextInput
                  value={form.description}
                  onChange={(v) => setForm({ ...form, description: v })}
                  placeholder="Brief notes about this tax rule"
                />
              </Field>
            </Modal>
          )}

          {/* Delete Confirmation Modal */}
          {deletingRule && (
            <Modal
              title="Delete Tax Rule"
              onClose={() => setDeletingRule(null)}
              footer={
                <>
                  <button
                    type="button"
                    onClick={() => setDeletingRule(null)}
                    className="text-sm text-slate-500 px-3.5 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? "Deleting..." : "Yes, Delete"}
                  </button>
                </>
              }
            >
              <p className="text-sm text-slate-600">
                Are you sure you want to delete <strong className="text-slate-900">{deletingRule.name}</strong>?
                This action cannot be undone and will remove the rule from associated product items.
              </p>
            </Modal>
          )}
        </>
      ) : (
        <Card className="p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-2">System Preferences</h3>
          <p className="text-sm text-slate-500 mb-4">
            Default configurations for warehouse management and item tracking.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm border-t border-slate-100 pt-4">
            <div>
              <span className="text-slate-400 block text-xs">Default Currency</span>
              <span className="font-medium text-slate-800">BDT (৳)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs">Default Timezone</span>
              <span className="font-medium text-slate-800">Asia/Dhaka (UTC+6)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs">Barcode Format</span>
              <span className="font-medium text-slate-800">EAN-13 / Serialized SN</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs">Tracking Mode</span>
              <span className="font-medium text-slate-800">Serialized &amp; Bulk Stock</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
