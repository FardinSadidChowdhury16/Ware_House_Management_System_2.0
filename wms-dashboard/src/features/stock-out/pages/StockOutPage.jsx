import { useState, useEffect } from "react";
import { 
  Toolbar, SearchBox, DateRangeFilter, FilterChips, Select, PrimaryButton,
  Card, Th, Td, Pagination, EmptyTable, Badge, Modal, TextInput, useToast, GhostButton,
  useConfirm, ExportCSVButton, FileUploadField
} from "../../../components/ui/index.js";
import { useWarehouseFilter } from "../../../app/context/WarehouseFilterContext.jsx";
import { Field } from "../../../components/ui/Field.jsx";
import { useStockOut } from "../hooks/useStockOut.js";
import { stockOutApi } from "../api/stockOutApi.js";
import { MovementDetailModal } from "../../../shared/components/MovementDetailModal.jsx";
import { formatBDDateTime } from "../../../shared/utils/dateUtils.js";
import { 
  Plus, Trash2, Check, Eye,
  Info, ScanLine, AlertCircle, Clock, Paperclip,
  FolderKanban, UserCheck
} from "lucide-react";

// ─── Customer Details Modal ────────────────────────────────────────────────
function CustomerDetailModal({ isOpen, onClose, customerId, customers }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !customerId) { setDetail(null); return; }
    const local = customers.find(c => String(c.id) === String(customerId));
    if (local) { setDetail(local); return; }
    setLoading(true);
    stockOutApi.getCustomerDetail(customerId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [isOpen, customerId, customers]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Details"
      size="sm"
      footer={<GhostButton onClick={onClose}>Close</GhostButton>}
    >
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-4">Loading...</p>
      ) : !detail ? (
        <p className="text-sm text-slate-400 text-center py-4">No details found.</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Customer</p>
            <p className="text-sm font-semibold text-slate-800">{detail.name}</p>
            {detail.customer_type && (
              <p className="text-xs text-slate-400 capitalize">{detail.customer_type} Account</p>
            )}
          </div>
          {detail.phone && detail.phone !== "—" && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Phone</p>
              <p className="text-sm text-slate-700">{detail.phone}</p>
            </div>
          )}
          {detail.email && detail.email !== "—" && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email</p>
              <p className="text-sm text-slate-700">{detail.email}</p>
            </div>
          )}
          {detail.shipping_details && detail.shipping_details !== "—" && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Shipping Address</p>
              <p className="text-sm text-slate-600">{detail.shipping_details}</p>
            </div>
          )}
          {detail.billing_details && detail.billing_details !== "—" && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Billing Details</p>
              <p className="text-sm text-slate-600">{detail.billing_details}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Project Details Modal ────────────────────────────────────────────────
function ProjectDetailModal({ isOpen, onClose, projectId, projects }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !projectId) { setDetail(null); return; }
    const local = projects?.find(p => String(p.id) === String(projectId));
    if (local) { setDetail(local); return; }
    setLoading(true);
    stockOutApi.getProjectDetail(projectId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [isOpen, projectId, projects]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Project Details"
      size="sm"
      footer={<GhostButton onClick={onClose}>Close</GhostButton>}
    >
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-4">Loading...</p>
      ) : !detail ? (
        <p className="text-sm text-slate-400 text-center py-4">No details found.</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Project Name</p>
            <p className="text-sm font-semibold text-slate-800">{detail.name}</p>
            {detail.code && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-mono font-medium rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {detail.code}
              </span>
            )}
          </div>
          {detail.location && detail.location !== "—" && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Location</p>
              <p className="text-sm text-slate-700">{detail.location}</p>
            </div>
          )}
          {detail.contact_info && detail.contact_info !== "—" && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Contact Info</p>
              <p className="text-sm text-slate-700">{detail.contact_info}</p>
            </div>
          )}
          {detail.description && detail.description !== "—" && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Description</p>
              <p className="text-sm text-slate-600">{detail.description}</p>
            </div>
          )}
          {detail.status && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Status</p>
              <span className={`inline-block mt-0.5 px-2 py-0.5 text-xs font-semibold rounded capitalize ${
                detail.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"
              }`}>
                {detail.status}
              </span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── New Stock Out Modal ───────────────────────────────────────────────────
function NewStockOutModal({ isOpen, onClose, onSuccess, warehouses, customers, projects = [], defaultWarehouseId }) {
  const { createStockOut, isCreating } = useStockOut();
  const { showToast } = useToast();
  
  const [warehouseId, setWarehouseId] = useState("");
  const [destinationType, setDestinationType] = useState("customer"); // "customer" | "project"
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerInputMode, setCustomerInputMode] = useState("select"); // "select" | "manual"
  const [projectId, setProjectId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  
  const [items, setItems] = useState([
    {
      id: Date.now(),
      barcode: "",
      product_id: null,
      product_name: "",
      product_code: "",
      variant_id: null,
      variant_sku: "",
      variant_name: "",
      tracking_type: "bulk",
      quantity: 1,
      available_stock: null,
      lookup_loading: false,
      lookup_error: null,
    }
  ]);

  useEffect(() => {
    if (warehouses && warehouses.length > 0) {
      const match = warehouses.find(w => String(w.id) === String(defaultWarehouseId));
      if (match) {
        setWarehouseId(String(match.id));
      } else if (!warehouseId || !warehouses.some(w => String(w.id) === String(warehouseId))) {
        setWarehouseId(String(warehouses[0].id));
      }
    }
  }, [warehouses, defaultWarehouseId]);

  const handleWarehouseChange = async (newWhId) => {
    setWarehouseId(newWhId);
    if (!newWhId) return;

    // Refresh stock availability for all already-scanned items
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.product_id && it.barcode) {
        try {
          const res = await stockOutApi.barcodeLookup(it.barcode, newWhId);
          if (res.is_error || res.type === "wrong_warehouse" || res.type === "not_in_stock") {
            setItems(prev => {
              const copy = [...prev];
              if (copy[i]) {
                copy[i] = {
                  ...copy[i],
                  available_stock: 0,
                  lookup_error: res.error || "Item is not available in selected warehouse.",
                };
              }
              return copy;
            });
          } else {
            const avail = res.available_stock !== undefined ? res.available_stock : 0;
            setItems(prev => {
              const copy = [...prev];
              if (copy[i]) {
                copy[i] = {
                  ...copy[i],
                  available_stock: avail,
                  lookup_error: avail <= 0 ? "Product has 0 stock in this warehouse." : null,
                };
              }
              return copy;
            });
          }
        } catch {
          setItems(prev => {
            const copy = [...prev];
            if (copy[i]) {
              copy[i] = {
                ...copy[i],
                available_stock: 0,
                lookup_error: "Not in stock in selected warehouse.",
              };
            }
            return copy;
          });
        }
      }
    }
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addItem = () => {
    setItems(prev => [
      ...prev, 
      {
        id: Date.now() + Math.random(),
        barcode: "",
        product_id: null,
        product_name: "",
        product_code: "",
        variant_id: null,
        variant_sku: "",
        variant_name: "",
        tracking_type: "bulk",
        quantity: 1,
        available_stock: null,
        lookup_loading: false,
        lookup_error: null,
      }
    ]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const lookupBarcodeForItem = async (index, explicitWhId) => {
    const code = (items[index]?.barcode || "").trim();
    if (!code) return;

    // Check duplicate within the current form
    const isDuplicateInForm = items.some(
      (it, i) => i !== index && (it.barcode || "").trim().toLowerCase() === code.toLowerCase()
    );
    if (isDuplicateInForm) {
      setItems(prev => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          lookup_loading: false,
          lookup_error: `⚠️ Barcode "${code}" is already entered in another line item in this form. Duplicate barcode is not allowed.`,
          product_id: null,
          product_name: "",
        };
        return copy;
      });
      showToast({
        title: "Duplicate Barcode",
        message: `Barcode "${code}" is already entered in this form.`,
        type: "error"
      });
      return;
    }

    const currentWh = explicitWhId !== undefined ? explicitWhId : warehouseId;

    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], lookup_loading: true, lookup_error: null };
      return copy;
    });

    try {
      const res = await stockOutApi.barcodeLookup(code, currentWh);

      if (res.is_error || res.type === "wrong_warehouse" || res.type === "not_in_stock") {
        const errorText = res.error || "Item is not available in selected warehouse.";
        setItems(prev => {
          const copy = [...prev];
          copy[index] = {
            ...copy[index],
            lookup_loading: false,
            lookup_error: errorText,
            product_id: null,
            product_name: "",
          };
          return copy;
        });
        showToast({
          title: "Stock Out Unavailable",
          message: errorText,
          type: "error"
        });
        return;
      }

      const avail = res.available_stock !== undefined ? res.available_stock : 0;
      setItems(prev => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          lookup_loading: false,
          lookup_error: null,
          barcode: res.barcode || code,
          serial_number: res.serial_number || null,
          product_id: res.product_id,
          product_name: res.product_name,
          product_code: res.product_code,
          variant_id: res.variant_id,
          variant_sku: res.variant_sku,
          variant_name: res.variant_name,
          tracking_type: res.tracking_type || "bulk",
          available_stock: avail,
          quantity: 1,
        };
        return copy;
      });
      showToast({
        title: "Product Verified",
        message: `${res.product_name}${res.variant_sku ? ` (${res.variant_sku})` : ""} - Available stock: ${avail} units.`,
        type: avail > 0 ? "success" : "warning"
      });
    } catch (err) {
      const detail = err?.response?.data?.detail || "No product found with this barcode. Please check or verify product barcode.";
      setItems(prev => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          lookup_loading: false,
          lookup_error: detail,
          product_id: null,
          product_name: "",
          product_code: "",
          variant_id: null,
          variant_sku: "",
          variant_name: "",
          available_stock: null,
        };
        return copy;
      });
    }
  };

  const clearItemProduct = (index) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        barcode: "",
        product_id: null,
        product_name: "",
        product_code: "",
        variant_id: null,
        variant_sku: "",
        variant_name: "",
        tracking_type: "bulk",
        quantity: 1,
        available_stock: null,
        lookup_loading: false,
        lookup_error: null,
      };
      return copy;
    });
  };

  const hasInvalidStock = items.some(it => {
    if (!it.product_id) return true;
    if (it.available_stock !== null && it.available_stock !== undefined) {
      if (it.available_stock <= 0) return true;
      if (it.tracking_type === "bulk" && Number(it.quantity) > it.available_stock) return true;
    }
    return false;
  });

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!warehouseId) {
      showToast({ title: "Validation Error", message: "Source warehouse is required", type: "error" });
      return;
    }
    
    const formattedItems = [];
    const seenBarcodes = new Set();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.product_id) {
        showToast({ title: "Barcode Required", message: `Please scan or enter a verified barcode for Line Item #${i + 1}`, type: "error" });
        return;
      }
      const bCode = (item.barcode || "").trim();
      if (bCode) {
        if (seenBarcodes.has(bCode.toLowerCase())) {
          showToast({
            title: "Duplicate Barcode Detected",
            message: `Barcode "${bCode}" is duplicated across line items. Each unit must have a unique barcode.`,
            type: "error"
          });
          return;
        }
        seenBarcodes.add(bCode.toLowerCase());
      }

      const avail = item.available_stock !== null && item.available_stock !== undefined ? item.available_stock : 0;
      if (avail <= 0) {
        showToast({
          title: "Out of Stock",
          message: `Product "${item.product_name}" is out of stock in this warehouse (0 available). Cannot dispatch.`,
          type: "error"
        });
        return;
      }

      if (item.tracking_type === "bulk") {
        const qty = Number(item.quantity);
        if (isNaN(qty) || qty <= 0) {
          showToast({ title: "Quantity Required", message: `Please enter a valid dispatch quantity for bulk product "${item.product_name}"`, type: "error" });
          return;
        }
        if (qty > avail) {
          showToast({
            title: "Insufficient Stock",
            message: `Cannot dispatch ${qty} units of "${item.product_name}". Only ${avail} available in this warehouse.`,
            type: "error"
          });
          return;
        }
      }

      formattedItems.push({
        product_id: Number(item.product_id),
        variant_id: item.variant_id ? Number(item.variant_id) : undefined,
        quantity: item.tracking_type === "serialized" ? 1 : Math.max(1, Number(item.quantity) || 1),
        serial_numbers: item.tracking_type === "serialized" ? (item.serial_number ? [item.serial_number] : undefined) : undefined,
      });
    }

    try {
      const payload = {
        warehouse_id: Number(warehouseId),
        reference_number: referenceNumber.trim() || undefined,
        note: note.trim() || undefined,
        attachment_url: attachmentUrl || undefined,
        items: formattedItems
      };

      if (destinationType === "project") {
        if (projectId) {
          payload.project_id = Number(projectId);
        }
      } else {
        if (customerId) {
          payload.customer_id = Number(customerId);
        }
        if (customerName.trim()) {
          payload.customer_name = customerName.trim();
        }
      }

      await createStockOut(payload);
      showToast({ 
        title: "Submitted for Approval", 
        message: "Stock Out request submitted successfully and is pending approval.", 
        type: "success" 
      });
      onSuccess();
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || "Failed to submit stock out";
      showToast({ title: "Error", message: typeof detail === "string" ? detail : JSON.stringify(detail), type: "error" });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title="New Stock Out Request" 
        size="3xl"
        footer={
          <>
            <GhostButton type="button" onClick={onClose} disabled={isCreating}>
              Cancel
            </GhostButton>
            <PrimaryButton 
              onClick={handleSubmit} 
              disabled={isCreating || !warehouseId || hasInvalidStock}
            >
              {isCreating ? "Submitting..." : "Submit for Approval"}
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-5">
          {/* Approval notice */}
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-700">
            <Clock size={14} className="flex-shrink-0" />
            This request will be sent to the approval queue. Stock will be deducted only after an approver reviews it.
          </div>

          {/* Header Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-lg border border-slate-200">
            <Field label="Source Warehouse *">
              <Select 
                value={warehouseId} 
                onChange={handleWarehouseChange}
                options={warehouses.map(w => ({ label: `${w.name} (${w.code || "WH"})`, value: String(w.id) }))}
                placeholder="Select Warehouse"
              />
            </Field>

            {/* Destination Selection: Customer vs Project */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Dispatch Destination
                </label>
                <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setDestinationType("customer");
                      setProjectId("");
                    }}
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                      destinationType === "customer"
                        ? "bg-white text-blue-600 shadow-sm font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <UserCheck size={12} />
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDestinationType("project");
                      setCustomerId("");
                      setCustomerName("");
                    }}
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                      destinationType === "project"
                        ? "bg-white text-indigo-600 shadow-sm font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FolderKanban size={12} />
                    Project
                  </button>
                </div>
              </div>

              {destinationType === "customer" ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 w-full min-w-0">
                    <div className="flex-1 min-w-0">
                      {customerInputMode === "select" ? (
                        <Select 
                          value={customerId} 
                          onChange={(val) => {
                            setCustomerId(val);
                            const found = customers.find(c => String(c.id) === String(val));
                            if (found) setCustomerName(found.name);
                          }}
                          options={customers
                            .filter(c => c.status !== false)
                            .map(c => ({
                              label: `${c.name}${c.phone ? ` (${c.phone})` : ""}`,
                              value: String(c.id),
                            }))
                          }
                          placeholder="Select Customer"
                        />
                      ) : (
                        <TextInput 
                          value={customerName}
                          onChange={(val) => {
                            const str = typeof val === "string" ? val : val?.target?.value ?? "";
                            setCustomerName(str);
                          }}
                          placeholder="Type customer name..."
                        />
                      )}
                    </div>
                    {destinationType === "customer" && customerInputMode === "select" && customerId && (
                      <button
                        type="button"
                        title="View customer details"
                        onClick={() => setShowCustomerDetail(true)}
                        className="flex-shrink-0 w-9 h-9 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors border border-blue-200"
                      >
                        <Info size={15} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                    <span>
                      {customerInputMode === "select" ? "From registered customers" : "Custom customer name"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (customerInputMode === "select") {
                          setCustomerInputMode("manual");
                          setCustomerId("");
                        } else {
                          setCustomerInputMode("select");
                          setCustomerName("");
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
                    >
                      {customerInputMode === "select" ? "Or write name manually" : "Or pick registered customer"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 w-full min-w-0">
                    <div className="flex-1 min-w-0">
                      <Select 
                        value={projectId} 
                        onChange={setProjectId}
                        options={projects.map(p => ({
                          label: `${p.name}${p.code ? ` (${p.code})` : ""}${p.location ? ` — ${p.location}` : ""}`,
                          value: String(p.id),
                        }))}
                        placeholder={projects.length === 0 ? "No projects created yet" : "Select Project"}
                      />
                    </div>
                    {projectId && (
                      <button
                        type="button"
                        title="View project details"
                        onClick={() => setShowProjectDetail(true)}
                        className="flex-shrink-0 w-9 h-9 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors border border-indigo-200"
                      >
                        <Info size={15} />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 px-0.5">
                    Select target project for this dispatch
                  </p>
                </div>
              )}
            </div>
            <Field label="Reference # (e.g. Sales Invoice / DO #)">
              <TextInput 
                value={referenceNumber} 
                onChange={setReferenceNumber}
                placeholder="INV-2026-001"
              />
            </Field>
            <Field label="Notes / Remarks">
              <TextInput 
                value={note} 
                onChange={setNote}
                placeholder="Dispatched via delivery courier..."
              />
            </Field>

            <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-200/80">
              <FileUploadField
                value={attachmentUrl}
                onChange={setAttachmentUrl}
                folder="stock-out"
                label="Attachment (Delivery Order / Signed Slip / Gate Pass / Photo) — Optional"
                helperText="Upload delivery challan, signed receipt, gate pass, or dispatch photo (PDF, PNG, JPG up to 25 MB)"
              />
            </div>
          </div>

          {/* Line Items — Pure Barcode Scan Mode */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Items to Dispatch</h4>
                <p className="text-xs text-slate-400">Scan or enter barcode to fetch the exact product</p>
              </div>
              <GhostButton type="button" onClick={addItem} icon={Plus}>
                Add Item
              </GhostButton>
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => {
                return (
                  <div key={item.id} className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-semibold text-slate-700">Line Item #{index + 1}</span>
                      {items.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeItem(index)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {!item.product_id ? (
                      /* Barcode Input Only — No Dropdowns */
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Scan / Enter Barcode or SKU *
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <ScanLine size={15} className="absolute left-3 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              value={item.barcode}
                              onChange={(e) => {
                                const val = e.target.value;
                                setItems(prev => {
                                  const copy = [...prev];
                                  copy[index].barcode = val;
                                  copy[index].lookup_error = null;
                                  return copy;
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  lookupBarcodeForItem(index);
                                }
                              }}
                              placeholder="Scan barcode with scanner or type SKU / code, press Enter..."
                              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                              autoFocus
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => lookupBarcodeForItem(index)}
                            disabled={item.lookup_loading || !item.barcode?.trim()}
                            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-md transition-colors shrink-0 flex items-center gap-1.5"
                          >
                            <ScanLine size={13} />
                            {item.lookup_loading ? "Verifying..." : "Find Product"}
                          </button>
                        </div>
                        {item.lookup_error && (
                          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200 mt-1 font-medium">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{item.lookup_error}</span>
                          </div>
                        )}
                        <p className="text-[11px] text-slate-400">
                          Scan with a barcode reader or type barcode / SKU and hit Enter.
                        </p>
                      </div>
                    ) : (
                      /* Exact Product Verified Card */
                      <div className="space-y-2.5">
                        <div className={`p-3 border rounded-lg flex items-center justify-between gap-3 flex-wrap ${
                          (item.available_stock ?? 0) > 0 ? "bg-emerald-50/70 border-emerald-200" : "bg-rose-50/70 border-rose-200"
                        }`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              (item.available_stock ?? 0) > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            }`}>
                              {(item.available_stock ?? 0) > 0 ? <Check size={14} /> : <AlertCircle size={14} />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                                <span>{item.product_name}</span>
                                <Badge color={item.tracking_type === "serialized" ? "blue" : "emerald"}>
                                  {item.tracking_type === "serialized" ? "Serialized" : "Bulk"}
                                </Badge>
                                
                                {item.available_stock !== null && item.available_stock !== undefined && (
                                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                                    item.available_stock > 0 
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                                      : "bg-rose-100 text-rose-700 border border-rose-200"
                                  }`}>
                                    Available in WH: <strong>{item.available_stock} units</strong>
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 font-mono flex items-center gap-3 mt-0.5 flex-wrap">
                                {item.variant_sku && <span>SKU: <strong className="text-slate-800">{item.variant_sku}</strong></span>}
                                {item.variant_name && <span>Item: <strong className="text-slate-900 font-semibold">{item.variant_name}</strong></span>}
                                {item.barcode && <span>Barcode: <strong>{item.barcode}</strong></span>}
                                {item.serial_number && <span>SN: <strong className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded border border-blue-200">{item.serial_number}</strong></span>}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => clearItemProduct(index)}
                            className="text-xs font-medium text-slate-600 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 px-2.5 py-1.5 rounded-md transition-colors shrink-0"
                            title="Scan a different barcode"
                          >
                            Change Barcode
                          </button>
                        </div>

                        {/* If out of stock in this warehouse */}
                        {item.available_stock !== null && item.available_stock <= 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 p-2.5 rounded border border-rose-200 font-medium">
                            <AlertCircle size={15} className="shrink-0 text-rose-600" />
                            <span>This product has 0 units available in the selected warehouse. It cannot be dispatched.</span>
                          </div>
                        )}

                        {/* Bulk Product: Ask for Quantity */}
                        {item.tracking_type === "bulk" && (
                          <div className="space-y-1.5">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-3">
                              <label className="text-xs font-semibold text-slate-700 shrink-0">
                                Dispatch Quantity * :
                              </label>
                              <input
                                type="number"
                                min="1"
                                max={item.available_stock ?? undefined}
                                className={`w-28 px-3 py-1.5 text-sm font-semibold rounded-md border focus:ring-1 bg-white font-mono ${
                                  Number(item.quantity) > (item.available_stock ?? 0) || (item.available_stock ?? 0) <= 0
                                    ? "border-rose-400 text-rose-700 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/40"
                                    : "border-slate-300 text-slate-800 focus:border-emerald-500 focus:ring-emerald-500"
                                }`}
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                placeholder="1"
                                autoFocus
                              />
                              <span className="text-xs text-slate-500">
                                units to dispatch {item.available_stock !== null && item.available_stock !== undefined && (
                                  <>(Max available: <strong className="font-semibold text-slate-800">{item.available_stock}</strong>)</>
                                )}
                              </span>
                            </div>

                            {Number(item.quantity) > (item.available_stock ?? 0) && (item.available_stock ?? 0) > 0 && (
                              <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200 font-medium">
                                <AlertCircle size={14} className="shrink-0" />
                                <span>Requested quantity ({item.quantity}) exceeds available stock ({item.available_stock}).</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Customer Details Modal */}
      <CustomerDetailModal
        isOpen={showCustomerDetail}
        onClose={() => setShowCustomerDetail(false)}
        customerId={customerId}
        customers={customers}
      />

      {/* Project Details Modal */}
      <ProjectDetailModal
        isOpen={showProjectDetail}
        onClose={() => setShowProjectDetail(false)}
        projectId={projectId}
        projects={projects}
      />
    </>
  );
}

// ─── Main Stock Out Page ───────────────────────────────────────────────────
export function StockOutPage() {
  const { selectedWarehouseId, myWarehouses } = useWarehouseFilter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [localWarehouseId, setLocalWarehouseId] = useState(
    selectedWarehouseId ? String(selectedWarehouseId) : "all"
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingMovement, setViewingMovement] = useState(null);

  useEffect(() => {
    if (selectedWarehouseId) {
      setLocalWarehouseId(String(selectedWarehouseId));
    }
  }, [selectedWarehouseId]);

  const queryParams = {
    page,
    page_size: 10,
    search: search.trim() || undefined,
    warehouse_id: localWarehouseId !== "all" && localWarehouseId ? Number(localWarehouseId) : undefined,
    date_from: fromDate || undefined,
    date_to: toDate || undefined,
  };

  const {
    movements,
    totalMovements,
    totalMovementsPages,
    isLoadingMovements,
    warehouses,
    customers,
    projects,
  } = useStockOut(queryParams);

  return (
    <div>
      {/* Action Toolbar & Filters */}
      <Toolbar
        action={
          <div className="flex items-center gap-2">
            <ExportCSVButton
              filename="stock-out-movements"
              columns={[
                { label: "ID", key: "id" },
                { label: "Date & Time", value: (m) => formatBDDateTime(m.created_at) },
                { label: "Reference #", value: (m) => m.reference_number || (m.reference_id ? String(m.reference_id) : "—") },
                { label: "Product", value: (m) => m.product_name || `Product #${m.product_id}` },
                { label: "Product Code", key: "product_code" },
                { label: "Item / Variant", value: (m) => m.variant_name || m.variant_sku || "Standard" },
                { label: "Barcode", value: (m) => m.barcode || "—" },
                { label: "Serial Number", value: (m) => m.serial_number || "—" },
                { label: "Tracking Type", value: (m) => m.tracking_type || "—" },
                { label: "Quantity", value: (m) => `-${m.quantity ?? 1}` },
                { label: "Source Warehouse", value: (m) => m.from_warehouse_name || (m.from_warehouse_id ? `WH #${m.from_warehouse_id}` : "—") },
                { label: "Customer / Project", value: (m) => m.project_name ? `Project: ${m.project_name}${m.project_code ? ` (${m.project_code})` : ""}` : (m.customer_name || "—") },
                { label: "Dispatched By", value: (m) => m.created_by_name || (m.created_by ? `User #${m.created_by}` : "—") },
                { label: "Movement Type", value: (m) => m.movement_type || "sale_out" },
                { label: "Notes", value: (m) => m.note || "—" },
              ]}
              data={movements}
            />
            <PrimaryButton 
              onClick={() => setIsModalOpen(true)} 
              icon={Plus}
              className="shrink-0 whitespace-nowrap"
            >
              New Stock Out
            </PrimaryButton>
          </div>
        }
      >
        <SearchBox 
          placeholder="Search all stock-out records..." 
          value={search} 
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }} 
          className="min-w-[180px] max-w-xs shrink-0"
        />
        <Select
          value={localWarehouseId}
          onChange={(val) => {
            setLocalWarehouseId(val);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All Warehouses" },
            ...(warehouses && warehouses.length > 0 ? warehouses : (myWarehouses || [])).map((w) => ({
              value: String(w.id),
              label: `${w.name}${w.code ? ` (${w.code})` : ""}`,
            })),
          ]}
          className="min-w-36 w-auto text-xs py-1.5"
          placeholder="All Warehouses"
        />
        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={(value) => { setFromDate(value); setPage(1); }}
          onToDateChange={(value) => { setToDate(value); setPage(1); }}
        />
      </Toolbar>

      {/* Main Table Card */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Date &amp; Time</Th>
                <Th>Ref #</Th>
                <Th>Product</Th>
                <Th>Item / Variant</Th>
                <Th>Barcode / Serial</Th>
                <Th>Qty</Th>
                <Th>Source WH</Th>
                <Th>Customer / Project</Th>
                <Th>Dispatched By</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {isLoadingMovements ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-sm text-slate-400">
                    Loading stock movements...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <EmptyTable 
                  cols={10} 
                  message={
                    (search || fromDate || toDate || (localWarehouseId && localWarehouseId !== "all"))
                      ? "No outbound stock movements found matching the selected filters."
                      : "No outbound stock movements found. Submit a Stock Out request to get started."
                  } 
                />
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <Td mono className="text-xs">
                      {formatBDDateTime(m.created_at)}
                    </Td>
                    <Td mono className="text-xs font-semibold text-slate-700">
                      {m.reference_number || (m.reference_id ? String(m.reference_id) : "—")}
                    </Td>
                    <Td>
                      <div className="font-medium text-slate-900">{m.product_name || `Product #${m.product_id}`}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {m.product_code && <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 rounded">{m.product_code}</span>}
                        <Badge color={m.tracking_type === "serialized" ? "blue" : "emerald"}>
                          {m.tracking_type === "serialized" ? "Serialized" : "Bulk"}
                        </Badge>
                      </div>
                    </Td>
                    <Td mono className="text-xs text-slate-800 font-medium">
                      {m.variant_name || m.variant_sku || "Standard"}
                    </Td>
                    <Td mono className="text-xs">
                      {m.serial_number ? (
                        <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-[11px]" title="Serial Number">
                          SN: {m.serial_number}
                        </span>
                      ) : m.barcode ? (
                        <span className="text-slate-700 font-mono text-[11px]" title="Barcode">
                          {m.barcode}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td>
                      <span className="font-bold text-rose-600 font-mono text-sm">
                        -{m.quantity}
                      </span>
                    </Td>
                    <Td className="text-xs font-medium text-slate-700">
                      {m.from_warehouse_name || (m.from_warehouse_id ? `WH #${m.from_warehouse_id}` : "—")}
                    </Td>
                    <Td className="text-xs">
                      {m.project_name ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <FolderKanban size={11} className="shrink-0" />
                            {m.project_name}
                          </span>
                          {m.project_code && (
                            <span className="text-[10px] text-slate-400 font-mono pl-1">
                              {m.project_code}
                            </span>
                          )}
                        </div>
                      ) : m.customer_name ? (
                        <span className="font-medium text-slate-700 flex items-center gap-1">
                          <UserCheck size={12} className="shrink-0 text-slate-400" />
                          {m.customer_name}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td className="text-xs text-slate-600 font-medium">
                      {m.created_by_name || (m.created_by ? `User #${m.created_by}` : "—")}
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {m.attachment_url && (
                          <a
                            href={m.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="View attachment (AWS S3)"
                            className="inline-flex items-center gap-1 p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors"
                          >
                            <Paperclip size={13} />
                          </a>
                        )}
                        <button 
                          type="button" 
                          onClick={() => setViewingMovement(m)} 
                          title="View stock-out details" 
                          className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800 cursor-pointer"
                        >
                          <Eye size={13} /> View Details
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          pageSize={10}
          total={totalMovements}
          totalPages={totalMovementsPages}
          onPageChange={setPage}
          itemName="movements"
        />
      </Card>
  <MovementDetailModal movement={viewingMovement} direction="out" onClose={() => setViewingMovement(null)} />

      {isModalOpen && (
        <NewStockOutModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            setPage(1);
          }}
          warehouses={warehouses && warehouses.length > 0 ? warehouses : (myWarehouses || [])}
          customers={customers}
          projects={projects}
          defaultWarehouseId={selectedWarehouseId}
        />
      )}
    </div>
  );
}
