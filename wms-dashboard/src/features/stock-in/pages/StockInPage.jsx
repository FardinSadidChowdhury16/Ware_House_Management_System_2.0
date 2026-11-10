import { useState, useEffect } from "react";
import { 
  Toolbar, SearchBox, DateRangeFilter, FilterChips, Select, PrimaryButton,
  Card, Th, Td, Pagination, EmptyTable, Badge, Modal, TextInput, useToast, GhostButton,
  useConfirm, ExportCSVButton, FileUploadField
} from "../../../components/ui/index.js";
import { useWarehouseFilter } from "../../../app/context/WarehouseFilterContext.jsx";
import { Field } from "../../../components/ui/Field.jsx";
import { useStockIn } from "../hooks/useStockIn.js";
import { stockInApi } from "../api/stockInApi.js";
import { projectsApi } from "../../projects/api/projectsApi.js";
import { 
  Plus, Trash2, Check, Eye,
  Info, ScanLine, AlertCircle, Clock, Paperclip
} from "lucide-react";
import { MovementDetailModal } from "../../../shared/components/MovementDetailModal.jsx";
import { formatBDDateTime } from "../../../shared/utils/dateUtils.js";

// ─── Supplier Details Modal ────────────────────────────────────────────────
function SupplierDetailModal({ isOpen, onClose, supplierId, suppliers }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !supplierId) { setDetail(null); return; }
    // Try local suppliers list first for instant display
    const local = suppliers.find(s => String(s.id) === String(supplierId));
    if (local) { setDetail(local); return; }
    // Fallback: fetch from API
    setLoading(true);
    stockInApi.getSupplierDetail(supplierId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [isOpen, supplierId, suppliers]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supplier Details"
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
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Supplier</p>
            <p className="text-sm font-semibold text-slate-800">{detail.name}</p>
            {detail.supplier_code && (
              <p className="text-xs text-slate-400 font-mono">{detail.supplier_code}</p>
            )}
          </div>
          {detail.phone && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Phone</p>
              <p className="text-sm text-slate-700">{detail.phone}</p>
            </div>
          )}
          {detail.email && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email</p>
              <p className="text-sm text-slate-700">{detail.email}</p>
            </div>
          )}
          {detail.address && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Address</p>
              <p className="text-sm text-slate-600">{detail.address}</p>
            </div>
          )}
          {detail.billing_details && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Billing</p>
              <p className="text-sm text-slate-600">{detail.billing_details}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── New Stock In Modal ────────────────────────────────────────────────────
function NewStockInModal({ isOpen, onClose, onSuccess, warehouses, suppliers, defaultWarehouseId }) {
  const { createStockIn, isCreating } = useStockIn();
  const { showToast } = useToast();
  
  const [warehouseId, setWarehouseId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState([]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [showSupplierDetail, setShowSupplierDetail] = useState(false);

  useEffect(() => {
    projectsApi.listProjects()
      .then((res) => setProjects(res?.items || []))
      .catch((err) => console.error("Failed to load projects", err));
  }, []);
  
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
      serial_numbers: "",
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
        lookup_loading: false,
        lookup_error: null,
      }
    ]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const lookupBarcodeForItem = async (index) => {
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

    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], lookup_loading: true, lookup_error: null };
      return copy;
    });

    try {
      const res = await stockInApi.barcodeLookup(code);
      if (res.type === "serial_duplicate" || res.is_duplicate || res.already_exists) {
        const warn = res.warning || `⚠️ This barcode (${code}) is already assigned to '${res.assigned_warehouse_name || "a warehouse"}' (Status: ${res.item_status || "In Stock"}). Duplicate stock in is not allowed for the same barcode.`;
        setItems(prev => {
          const copy = [...prev];
          copy[index] = {
            ...copy[index],
            lookup_loading: false,
            lookup_error: warn,
            product_id: null,
            product_name: "",
          };
          return copy;
        });
        showToast({
          title: "Duplicate Barcode Blocked",
          message: warn,
          type: "error"
        });
        return;
      } else {
        setItems(prev => {
          const copy = [...prev];
          copy[index] = {
            ...copy[index],
            lookup_loading: false,
            lookup_error: null,
            barcode: res.barcode || code,
            product_id: res.product_id,
            product_name: res.product_name,
            product_code: res.product_code,
            variant_id: res.variant_id,
            variant_sku: res.variant_sku,
            variant_name: res.variant_name,
            tracking_type: res.tracking_type || "bulk",
            quantity: 1,
          };
          return copy;
        });
        showToast({
          title: "Product Verified",
          message: `${res.product_name}${res.variant_sku ? ` (${res.variant_sku})` : ""} is verified and ready for Stock In.`,
          type: "success"
        });
      }
    } catch (err) {
      const detail = err?.response?.data?.detail || "No product found with this barcode. Please check or create the product first.";
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
        lookup_loading: false,
        lookup_error: null,
      };
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!warehouseId) {
      showToast({ title: "Validation Error", message: "Destination warehouse is required", type: "error" });
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
      if (item.tracking_type === "bulk") {
        const qty = Number(item.quantity);
        if (isNaN(qty) || qty <= 0) {
          showToast({ title: "Quantity Required", message: `Please enter a valid received quantity for bulk product "${item.product_name}"`, type: "error" });
          return;
        }
      }
      formattedItems.push({
        product_id: Number(item.product_id),
        variant_id: item.variant_id ? Number(item.variant_id) : undefined,
        quantity: item.tracking_type === "serialized" ? 1 : Math.max(1, Number(item.quantity) || 1),
        serial_numbers: item.tracking_type === "serialized" && bCode ? [bCode] : undefined,
      });
    }

    try {
      await createStockIn({
        warehouse_id: Number(warehouseId),
        supplier_id: supplierId ? Number(supplierId) : undefined,
        project_id: projectId ? Number(projectId) : undefined,
        reference_number: referenceNumber.trim() || undefined,
        note: note.trim() || undefined,
        attachment_url: attachmentUrl || undefined,
        items: formattedItems
      });
      showToast({ 
        title: "Submitted for Approval", 
        message: "Stock In request submitted successfully and is pending approval.", 
        type: "success" 
      });
      onSuccess();
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || "Failed to submit stock in";
      showToast({ title: "Error", message: typeof detail === "string" ? detail : JSON.stringify(detail), type: "error" });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title="New Stock In Request" 
        size="3xl"
        footer={
          <>
            <GhostButton type="button" onClick={onClose} disabled={isCreating}>
              Cancel
            </GhostButton>
            <PrimaryButton 
              onClick={handleSubmit} 
              disabled={isCreating || !warehouseId || items.some(it => !it.product_id)}
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
            This request will be sent to the approval queue. Stock will update only after an approver reviews it.
          </div>

          {/* Header Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-lg border border-slate-200">
            <Field label="Destination Warehouse *">
              <Select 
                value={warehouseId} 
                onChange={setWarehouseId}
                options={warehouses.map(w => ({ label: `${w.name} (${w.code || "WH"})`, value: String(w.id) }))}
                placeholder="Select Warehouse"
              />
            </Field>
            <Field label="Supplier (Optional)">
              <div className="flex items-center gap-2 w-full min-w-0">
                <div className="flex-1 min-w-0">
                  <Select 
                    value={supplierId} 
                    onChange={setSupplierId}
                    options={suppliers
                      .filter(s => s.status !== false)
                      .map(s => ({
                        label: `${s.name}${s.supplier_code ? ` (${s.supplier_code})` : ""}`,
                        value: String(s.id),
                      }))
                    }
                    placeholder="Select Supplier"
                  />
                </div>
                {supplierId && (
                  <button
                    type="button"
                    title="View supplier details"
                    onClick={() => setShowSupplierDetail(true)}
                    className="flex-shrink-0 w-9 h-9 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    <Info size={15} />
                  </button>
                )}
              </div>
            </Field>
            <Field label="Project Allocation (Optional)">
              <Select 
                value={projectId} 
                onChange={setProjectId}
                options={[
                  { label: "None (General Stock)", value: "" },
                  ...projects.map(p => ({
                    label: `${p.name} (${p.code})`,
                    value: String(p.id),
                  }))
                ]}
                placeholder="Select Project (Optional)"
              />
            </Field>
            <Field label="Reference # (e.g. PO / Challan)">
              <TextInput 
                value={referenceNumber} 
                onChange={setReferenceNumber}
                placeholder="PO-2026-001"
              />
            </Field>
            <div className="col-span-1 md:col-span-2">
              <Field label="Notes / Remarks">
                <TextInput 
                  value={note} 
                  onChange={setNote}
                  placeholder="Received via transport shipment..."
                />
              </Field>
            </div>

            <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-200/80">
              <FileUploadField
                value={attachmentUrl}
                onChange={setAttachmentUrl}
                folder="stock-in"
                label="Attachment (Invoice / Challan / Delivery Slip / Photo) — Optional"
                helperText="Upload any supplier invoice, transport slip, challan, or photos (PDF, PNG, JPG up to 25 MB)"
              />
            </div>
          </div>

          {/* Line Items — Pure Barcode Scan Mode */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Items to Receive</h4>
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
                        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                              <Check size={14} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                                <span>{item.product_name}</span>
                                <Badge color={item.tracking_type === "serialized" ? "blue" : "emerald"}>
                                  {item.tracking_type === "serialized" ? "Serialized" : "Bulk"}
                                </Badge>
                                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                  {item.tracking_type === "serialized" ? "Ready for Stock In (1 Unit)" : "Verified Product"}
                                </span>
                              </div>
                              <div className="text-xs text-slate-600 font-mono flex items-center gap-3 mt-0.5 flex-wrap">
                                {item.variant_sku && <span>SKU: <strong className="text-slate-800">{item.variant_sku}</strong></span>}
                                {item.variant_name && <span>Item: <strong className="text-slate-900 font-semibold">{item.variant_name}</strong></span>}
                                {item.barcode && <span>Barcode: {item.barcode}</span>}
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

                        {/* Bulk Product: Ask for Quantity */}
                        {item.tracking_type === "bulk" && (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-3">
                            <label className="text-xs font-semibold text-slate-700 shrink-0">
                              Received Quantity * :
                            </label>
                            <input
                              type="number"
                              min="1"
                              className="w-28 px-3 py-1.5 text-sm font-semibold text-slate-800 border border-slate-300 rounded-md focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white font-mono"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                              placeholder="1"
                              autoFocus
                            />
                            <span className="text-xs text-slate-400">units to receive</span>
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

      {/* Supplier Details Modal */}
      <SupplierDetailModal
        isOpen={showSupplierDetail}
        onClose={() => setShowSupplierDetail(false)}
        supplierId={supplierId}
        suppliers={suppliers}
      />
    </>
  );
}

// ─── Main Stock In Page ────────────────────────────────────────────────────
export function StockInPage() {
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
    suppliers,
    products,
  } = useStockIn(queryParams);

  return (
    <div>
      {/* Action Toolbar & Filters */}
      <Toolbar
        action={
          <div className="flex items-center gap-2">
            <ExportCSVButton
              filename="stock-in-movements"
              columns={[
                { label: "ID", key: "id" },
                { label: "Date & Time", value: (m) => formatBDDateTime(m.created_at) },
                { label: "Product", value: (m) => m.product_name || `Product #${m.product_id}` },
                { label: "Product Code", key: "product_code" },
                { label: "Barcode / Item", value: (m) => m.barcode || m.variant_name || "—" },
                { label: "Quantity", value: (m) => m.quantity ?? m.qty ?? 1 },
                { label: "Warehouse", value: (m) => m.warehouse_name || m.destination_warehouse_name || "—" },
                { label: "Supplier", value: (m) => m.supplier_name || "—" },
                { label: "Status", key: "status" },
              ]}
              data={movements}
            />
            <PrimaryButton 
              onClick={() => setIsModalOpen(true)} 
              icon={Plus}
              className="shrink-0 whitespace-nowrap"
            >
              New Stock In
            </PrimaryButton>
          </div>
        }
      >
        <SearchBox 
          placeholder="Search all stock-in records..." 
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
                <Th>Product</Th>
                <Th>Item</Th>
                <Th>Qty</Th>
                <Th>Destination WH</Th>
                <Th>Supplier</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {isLoadingMovements ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-sm text-slate-400">
                    Loading stock movements...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <EmptyTable 
                  cols={7} 
                  message={
                    (search || fromDate || toDate || (localWarehouseId && localWarehouseId !== "all"))
                      ? "No stock movements found matching the selected filters."
                      : "No stock movements found. Submit a Stock In request to get started."
                  } 
                />
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <Td mono className="text-xs">
                      {formatBDDateTime(m.created_at)}
                    </Td>
                    <Td>
                      <div className="font-medium text-slate-800">{m.product_name || `Product #${m.product_id}`}</div>
                      {m.product_code && <div className="text-[11px] text-slate-400 font-mono">{m.product_code}</div>}
                    </Td>
                    <Td mono className="text-xs text-slate-900 font-medium">
                      {m.variant_sku || (m.variant_name ? m.variant_name : "—")}
                    </Td>
                    <Td>
                      <span className="font-semibold text-emerald-600 wms-mono text-sm">
                        +{m.quantity}
                      </span>
                    </Td>
                    <Td className="text-xs font-medium text-slate-700">
                      {m.to_warehouse_name || (m.to_warehouse_id ? `WH #${m.to_warehouse_id}` : "—")}
                    </Td>
                    <Td className="text-xs text-slate-600">
                      <div>{m.supplier_name || "—"}</div>
                      {m.project_name && (
                        <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Proj: {m.project_name}
                        </span>
                      )}
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
                          title="View stock-in details" 
                          className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800"
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

      <MovementDetailModal movement={viewingMovement} direction="in" onClose={() => setViewingMovement(null)} />

      {isModalOpen && (
        <NewStockInModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            setPage(1);
          }}
          warehouses={warehouses && warehouses.length > 0 ? warehouses : (myWarehouses || [])}
          suppliers={suppliers}
          products={products}
          defaultWarehouseId={selectedWarehouseId}
        />
      )}
    </div>
  );
}
