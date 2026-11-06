import { useMemo, useState } from "react";
import { AlertTriangle, Warehouse, Tag, Plus, ScanLine, Search } from "lucide-react";
import {
  Badge, Card, SectionHeader, PrimaryButton, GhostButton,
  Th, Td, StatCard, TextInput, Select, Modal, FilterChips,
  SearchBox, Toolbar, EmptyTable, MiniBarcode,
} from "../../../components/ui/index.js";
import { Field } from "../../../components/ui/Field.jsx";
import { StatusPill } from "../../../components/ui/StatusPill.jsx";
import {
  WH_OPTIONS, PRODUCT_OPTIONS, ROLE_OPTIONS, PERMISSIONS,
  SERVICE_PROBLEM_TYPES, SERVICE_STATUSES,
} from "../../../shared/constants/wmsConstants.js";
import {
  warehousesSeed, productsSeed, serializedUnitsSeed, productLocationSeed,
  rolesSeed, staffUsersSeed, barcodesSeed, stockInSeed, stockOutSeed,
  transfersSeed, approvalQueueSeed, categoriesSeed, projectTagsSeed,
  tagDetailsSeed, inventorySeed, returnsSeed, warrantySeed, reportsSeed,
  activityFeed, productCatalog,
} from "../../../shared/data/mockSeeds.js";
import {
  getProductByName, getAvailableUnits, formatItemSummary, addMonthsToDate,
} from "../../../shared/utils/wmsHelpers.js";
import { SerialPicker } from "../../../shared/components/SerialPicker.jsx";

import { useDashboardWorkspace } from "../../dashboard/context/DashboardWorkspaceContext.jsx";
import { inventoryApi } from "../../inventory/api/inventoryApi.js";

export function StockMovementPage({ mode }) {
  const { tags, setServiceTickets } = useDashboardWorkspace();
  const isIn = mode === "in";
  const [rows, setRows] = useState(isIn ? stockInSeed : stockOutSeed);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [warehouse, setWarehouse] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    warehouse: WH_OPTIONS[0],
    product: PRODUCT_OPTIONS[0],
    qty: "",
    serialsText: "",
    selectedSerials: [],
    warrantyStart: new Date().toISOString().slice(0, 10),
    condition: "New",
    destination: "Customer",
    tag: "",
    problemType: SERVICE_PROBLEM_TYPES[0],
    complaint: "",
  });

  const selectedProduct = getProductByName(form.product);
  const isSerialized = selectedProduct?.tracking === "Serialized";
  const isServicingIn = isIn && form.condition === "Return for Servicing";
  const parsedSerials = form.serialsText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);

  const filtered = rows.filter((r) =>
    (status === "All" || r.status === status) &&
    (warehouse === "All" || r.warehouse === warehouse) &&
    (r.id.toLowerCase().includes(search.toLowerCase()) || r.product.toLowerCase().includes(search.toLowerCase()) || (r.tag || "").toLowerCase().includes(search.toLowerCase()))
  );

  const submit = async () => {
    const idPrefix = isIn ? "SIN" : "SOUT";
    const nextId = `${idPrefix}-${300 + rows.length}`;
    const tagLabel = tags.find((t) => t.id === form.tag)?.tag || "—";

    if (isIn) {
      if (isSerialized) {
        if (parsedSerials.length === 0) return;
      } else if (!form.qty || Number(form.qty) <= 0) {
        return;
      }
      if (form.condition === "Return for Servicing" && (!form.complaint.trim() || !form.problemType)) return;

      const entry = {
        id: nextId,
        product: form.product,
        tracking: selectedProduct?.tracking || "Bulk",
        qty: isSerialized ? parsedSerials.length : Number(form.qty),
        serials: isSerialized ? parsedSerials : [],
        warehouse: form.warehouse,
        condition: form.condition,
        tag: tagLabel,
        status: "Pending",
        date: "2026-07-08",
        ...(form.condition === "Return for Servicing" && {
          problemType: form.problemType,
          complaint: form.complaint.trim(),
        }),
      };
      setRows((prev) => [entry, ...prev]);

      try {
        await inventoryApi.createMovement({
          movement_type: form.condition === "Return for Servicing" ? "RETURN_IN" : "PURCHASE_IN",
          quantity: isSerialized ? parsedSerials.length : Number(form.qty),
          note: `Stock In: ${form.product} at ${form.warehouse}`,
        });
        if (isSerialized) {
          for (const sn of parsedSerials) {
            await inventoryApi.createSerializedItem({
              serial_number: sn,
              product_id: 1,
              warranty_start: form.warrantyStart,
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error("Backend Stock In failed:", err);
      }

      if (form.condition === "Return for Servicing" && setServiceTickets) {
        const tickets = isSerialized
          ? parsedSerials.map((sn) => ({
              id: sn,
              product: form.product,
              warehouse: form.warehouse,
              status: "Received for Service",
              problemType: form.problemType,
              complaint: form.complaint.trim(),
              source: "Stock In",
              stockInId: nextId,
              date: "2026-07-08",
            }))
          : [{
              id: `SR-${nextId}`,
              product: form.product,
              warehouse: form.warehouse,
              status: "Received for Service",
              problemType: form.problemType,
              complaint: form.complaint.trim(),
              source: "Stock In",
              stockInId: nextId,
              qty: Number(form.qty),
              date: "2026-07-08",
            }];
        setServiceTickets((prev) => [...tickets, ...prev]);
      }
    } else {
      if (isSerialized) {
        if (form.selectedSerials.length === 0) return;
      } else if (!form.qty || Number(form.qty) <= 0) {
        return;
      }
      const entry = {
        id: nextId,
        product: form.product,
        tracking: selectedProduct?.tracking || "Bulk",
        qty: isSerialized ? form.selectedSerials.length : Number(form.qty),
        serials: isSerialized ? form.selectedSerials : [],
        warehouse: form.warehouse,
        destination: form.destination,
        tag: tagLabel,
        status: "Pending",
        date: "2026-07-08",
      };
      setRows((prev) => [entry, ...prev]);

      try {
        await inventoryApi.createMovement({
          movement_type: "SALE_OUT",
          quantity: isSerialized ? form.selectedSerials.length : Number(form.qty),
          note: `Stock Out: ${form.product} from ${form.warehouse} to ${form.destination}`,
        });
        if (isSerialized) {
          for (const sn of form.selectedSerials) {
            await inventoryApi.sellSerializedItem(sn, { reference_number: nextId }).catch(() => {});
          }
        }
      } catch (err) {
        console.error("Backend Stock Out failed:", err);
      }
    }

    setShowForm(false);
    setForm({
      warehouse: WH_OPTIONS[0],
      product: PRODUCT_OPTIONS[0],
      qty: "",
      serialsText: "",
      selectedSerials: [],
      warrantyStart: new Date().toISOString().slice(0, 10),
      condition: "New",
      destination: "Customer",
      tag: "",
      problemType: SERVICE_PROBLEM_TYPES[0],
      complaint: "",
    });
  };

  const projects = tags.filter((t) => t.type === "Project");
  const customers = tags.filter((t) => t.type === "Customer");

  return (
    <div>
      {showForm && (
        <Modal
          title={isIn ? "New Stock In" : "New Stock Out"}
          onClose={() => setShowForm(false)}
          footer={
            <>
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-3.5 py-2">Cancel</button>
              <PrimaryButton onClick={submit}>{isIn ? "Submit Stock In" : "Submit Stock Out"}</PrimaryButton>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Warehouse"><Select value={form.warehouse} onChange={(v) => setForm({ ...form, warehouse: v, selectedSerials: [] })} options={WH_OPTIONS} /></Field>
            <Field label="Product">
              <Select
                value={form.product}
                onChange={(v) => setForm({ ...form, product: v, serialsText: "", qty: "", selectedSerials: [] })}
                options={PRODUCT_OPTIONS}
              />
            </Field>
            {isIn && isSerialized ? (
              <>
                {!isServicingIn && (
                  <>
                    <Field label="Warranty start (for all units in this batch)">
                      <input type="date" value={form.warrantyStart} onChange={(e) => setForm({ ...form, warrantyStart: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Warranty end (auto)">
                      <input
                        readOnly
                        value={addMonthsToDate(form.warrantyStart, selectedProduct?.warrantyMonths || 24)}
                        className={`${inputCls} bg-slate-50`}
                      />
                    </Field>
                  </>
                )}
                <div className={isServicingIn ? "col-span-2" : "col-span-2"}>
                  <Field label="Serial numbers (one per line or comma-separated)">
                    <textarea
                      value={form.serialsText}
                      onChange={(e) => setForm({ ...form, serialsText: e.target.value })}
                      placeholder={"SN-89001\nSN-89002\nSN-89003"}
                      rows={4}
                      className={`${inputCls} wms-mono resize-y`}
                    />
                  </Field>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-400">
                      {isServicingIn ? "Each serial creates a separate service ticket." : "Each serial = one physical unit. Scan or paste IDs from barcode labels."}
                    </p>
                    <button type="button" className="text-xs text-slate-500 border border-slate-200 rounded px-2 py-1 hover:bg-slate-50">
                      <ScanLine size={12} className="inline mr-1" />Scan to add
                    </button>
                  </div>
                  {parsedSerials.length > 0 && (
                    <p className="text-xs text-emerald-700 mt-2">{parsedSerials.length} unit(s) will be registered</p>
                  )}
                </div>
              </>
            ) : !isIn && isSerialized ? (
              <div className="col-span-2">
                <SerialPicker
                  productName={form.product}
                  warehouse={form.warehouse}
                  value={form.selectedSerials}
                  onChange={(serials) => setForm({ ...form, selectedSerials: serials })}
                  helperText="Pick or scan the exact serial numbers leaving this warehouse."
                />
                {form.selectedSerials.length > 0 && (
                  <p className="text-xs text-emerald-700 -mt-2">{form.selectedSerials.length} unit(s) will be removed</p>
                )}
              </div>
            ) : (
              <Field label="Quantity">
                <div className="flex gap-2">
                  <input value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="0" className={`flex-1 ${inputCls}`} />
                  {!isIn && (
                    <button type="button" className="border border-slate-200 rounded-md px-3 text-slate-500"><ScanLine size={15} /></button>
                  )}
                </div>
                {isIn && !isSerialized && (
                  <p className="text-xs text-slate-400 mt-1">Bulk product — enter quantity only, no serial numbers needed.</p>
                )}
                {!isIn && !isSerialized && (
                  <p className="text-xs text-slate-400 mt-1">Bulk product — enter quantity leaving the warehouse.</p>
                )}
              </Field>
            )}
            <Field label={isIn ? "Condition" : "Destination"}>
              <Select
                value={isIn ? form.condition : form.destination}
                onChange={(v) => setForm(isIn ? { ...form, condition: v, complaint: v === "Return for Servicing" ? form.complaint : "" } : { ...form, destination: v })}
                options={isIn ? ["New", "Return for Servicing"] : ["Customer", "Another Warehouse", "Other / Scrap"]}
              />
            </Field>
          </div>

          {isServicingIn && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 space-y-4">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Servicing details</p>
              <p className="text-xs text-amber-700 -mt-2">This stock-in will create service ticket(s) in Returns & Servicing.</p>
              <Field label="Type of problem">
                <Select value={form.problemType} onChange={(v) => setForm({ ...form, problemType: v })} options={SERVICE_PROBLEM_TYPES} />
              </Field>
              <Field label="Complaint / problem description">
                <textarea
                  value={form.complaint}
                  onChange={(e) => setForm({ ...form, complaint: e.target.value })}
                  placeholder="Describe the issue reported by customer or inspection..."
                  rows={3}
                  className={`${inputCls} resize-y`}
                />
              </Field>
            </div>
          )}
          {selectedProduct && (
            <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-800">
              <strong>{selectedProduct.name}</strong> is tracked as <strong>{selectedProduct.tracking}</strong>.
              {isSerialized
                ? (isIn ? " Register each physical item with a unique serial number." : " Select which serial numbers are leaving.")
                : " Track by quantity only."}
            </div>
          )}
          <Field label="Project / Customer tag (optional)">
            <select value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} className={inputCls}>
              <option value="">No tag — warehouse stock only</option>
              {projects.length > 0 && (
                <optgroup label="Projects">
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.tag}</option>)}
                </optgroup>
              )}
              {customers.length > 0 && (
                <optgroup label="Customers">
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.tag}</option>)}
                </optgroup>
              )}
            </select>
          </Field>
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-md">
            <AlertTriangle size={14} />This action requires approval before it's finalized
          </div>
        </Modal>
      )}

      <Toolbar action={<PrimaryButton icon={Plus} onClick={() => setShowForm(true)}>{isIn ? "New Stock In" : "New Stock Out"}</PrimaryButton>}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search ID, product, or tag..." />
        <FilterChips options={["All", "Pending", "Approved"]} value={status} onChange={setStatus} />
        <Select value={warehouse} onChange={setWarehouse} options={[{ value: "All", label: "All warehouses" }, ...WH_OPTIONS]} />
      </Toolbar>

      <Card>
        <table className="w-full">
          <thead>
            <tr>
              <Th>ID</Th><Th>Product</Th><Th>Items</Th><Th>Warehouse</Th>
              <Th>{isIn ? "Condition" : "Destination"}</Th>
              <Th>Tag</Th><Th>Status</Th><Th>Date</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <Td mono>{r.id}</Td>
                <Td>
                  <span className="font-medium text-slate-900">{r.product}</span>
                  {r.tracking && (
                    <span className="block text-xs text-slate-400 mt-0.5">{r.tracking}</span>
                  )}
                </Td>
                <Td>
                  {r.tracking === "Serialized" && r.serials?.length > 0 ? (
                    <span className="text-xs wms-mono text-slate-600">
                      {r.qty} unit{r.qty !== 1 ? "s" : ""}: {r.serials.slice(0, 2).join(", ")}{r.serials.length > 2 ? ` +${r.serials.length - 2} more` : ""}
                    </span>
                  ) : (
                    <span className="wms-mono">{r.qty}</span>
                  )}
                </Td>
                <Td>{r.warehouse}</Td>
                <Td>{isIn ? r.condition : r.destination}</Td>
                <Td>
                  {r.tag}
                  {isIn && r.condition === "Return for Servicing" && r.problemType && (
                    <span className="block text-xs text-amber-700 mt-0.5">{r.problemType}</span>
                  )}
                </Td>
                <Td><StatusPill status={r.status} /></Td>
                <Td mono>{r.date}</Td>
              </tr>
            ))}
            {filtered.length === 0 && <EmptyTable cols={8} />}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

