import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Plus,
  Search,
  ScanLine,
  Barcode,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Warehouse,
  Package,
  Layers,
  Trash2,
  Copy,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  Badge,
  Card,
  PrimaryButton,
  GhostButton,
  Th,
  Td,
  StatCard,
  Modal,
  FilterChips,
  SearchBox,
  Toolbar,
  EmptyTable,
  Pagination,
  useToast,
  useConfirm,
  ExportCSVButton,
} from "../../../components/ui/index.js";
import { Field } from "../../../components/ui/Field.jsx";
import { useWarehouseFilter } from "../../../app/context/WarehouseFilterContext.jsx";
import { formatBDDateTime } from "../../../shared/utils/dateUtils.js";
import { useTransfers } from "../hooks/useTransfers.js";
import { transferApi } from "../api/transferApi.js";
import { warehousesApi } from "../../warehouses/api/warehousesApi.js";
import { useWarehouses } from "../../warehouses/hooks/useWarehouses.js";
import { useProducts } from "../../products/hooks/useProducts.js";

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending: { color: "yellow", icon: Clock, label: "Pending Approval" },
    approved: { color: "green", icon: CheckCircle2, label: "Approved & Transferred" },
    rejected: { color: "red", icon: XCircle, label: "Rejected" },
  };
  const conf = map[status] || { color: "slate", icon: Clock, label: status };
  const Icon = conf.icon;

  return (
    <Badge color={conf.color}>
      <span className="inline-flex items-center gap-1">
        <Icon size={12} />
        {conf.label}
      </span>
    </Badge>
  );
}

// ─── Transfer Details View Modal ──────────────────────────────────────────────
function TransferDetailModal({ transfer, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!transfer) return null;

  const payload = transfer.payload || {};
  const items = payload.items || [];
  const totalUnits = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

  const copySerials = (serials) => {
    if (!serials?.length) return;
    navigator.clipboard.writeText(serials.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={!!transfer}
      onClose={onClose}
      title={`Transfer Request #${transfer.id}`}
      size="4xl"
      footer={<GhostButton onClick={onClose}>Close</GhostButton>}
    >
      <div className="space-y-4">
        {/* Route Banner */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100/70 text-blue-700 rounded-lg">
              <Warehouse size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Source Warehouse
              </span>
              <span className="text-sm font-bold text-slate-900">
                {transfer.warehouse_name || `Warehouse #${transfer.warehouse_id}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400 px-3 py-1 bg-white rounded-full border border-slate-200 shadow-xs">
            <ArrowRight size={16} className="text-blue-600" />
            <span className="text-xs font-semibold text-slate-700 uppercase">Transfer Route</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100/70 text-emerald-700 rounded-lg">
              <Warehouse size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Destination Warehouse
              </span>
              <span className="text-sm font-bold text-emerald-800">
                {transfer.to_warehouse_name || `Warehouse #${payload.to_warehouse_id}`}
              </span>
            </div>
          </div>
        </div>

        {/* Metadata info cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Status</span>
            <StatusBadge status={transfer.status} />
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Reference #</span>
            <span className="font-mono font-medium text-slate-800 truncate block">
              {payload.reference_number || "—"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Requested By</span>
            <span className="font-medium text-slate-700 truncate block">
              {transfer.requested_by_name || "—"}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {transfer.created_at ? formatBDDateTime(transfer.created_at) : ""}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Reviewed By</span>
            <span className="font-medium text-slate-700 truncate block">
              {transfer.reviewed_by_name || "—"}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {transfer.updated_at && transfer.status !== "pending"
                ? formatBDDateTime(transfer.updated_at)
                : ""}
            </span>
          </div>
        </div>

        {/* Requester Note */}
        {payload.note && (
          <div className="p-3 bg-blue-50/70 rounded-md border border-blue-100 text-xs text-slate-700">
            <span className="font-semibold text-blue-900 block mb-0.5">Transfer Reason / Note:</span>
            {payload.note}
          </div>
        )}

        {/* Review Note */}
        {transfer.review_note && (
          <div className="p-3 bg-slate-100 rounded-md border border-slate-200 text-xs text-slate-700">
            <span className="font-semibold text-slate-800 block mb-0.5">
              Reviewer Note ({transfer.reviewed_by_name || "Approver"}):
            </span>
            {transfer.review_note}
          </div>
        )}

        {/* Products Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Package size={16} className="text-blue-600" />
              Transfer Items Breakdown ({items.length} product{items.length !== 1 ? "s" : ""},{" "}
              {totalUnits} total unit{totalUnits !== 1 ? "s" : ""})
            </h4>
          </div>

          <div className="space-y-3">
            {items.map((it, idx) => {
              const isSerialized =
                it.tracking_type === "serialized" ||
                (Array.isArray(it.serial_numbers) && it.serial_numbers.length > 0);
              const serials = it.serial_numbers || [];

              return (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-lg p-3.5 bg-white shadow-xs space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">
                        {it.product_name || `Product #${it.product_id}`}
                      </span>
                      {it.product_code && (
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {it.product_code}
                        </span>
                      )}
                      {it.variant_name && (
                        <Badge color="blue" size="sm">
                          {it.variant_name}
                        </Badge>
                      )}
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          isSerialized
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {isSerialized ? <Barcode size={11} /> : <Layers size={11} />}
                        {isSerialized ? "Serialized" : "Bulk Stock"}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-medium">Quantity</span>
                      <span className="text-sm font-bold font-mono text-slate-900">
                        {it.quantity} unit{it.quantity !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Serial Numbers List */}
                  {isSerialized && serials.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                          <Barcode size={13} className="text-blue-500" />
                          Serialized Units to Transfer ({serials.length}):
                        </span>
                        <button
                          type="button"
                          onClick={() => copySerials(serials)}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {copied ? (
                            <>
                              <Check size={12} className="text-emerald-600" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={12} /> Copy All
                            </>
                          )}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded border border-slate-200">
                        {serials.map((sn, sIdx) => (
                          <span
                            key={sIdx}
                            className="font-mono text-xs bg-white text-slate-800 border border-slate-200 px-2 py-0.5 rounded shadow-xs"
                          >
                            {sn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── New Transfer Request Modal ───────────────────────────────────────────────
function TransferCreateModal({
  isOpen,
  onClose,
  sourceWarehouses = [],
  destinationWarehouses = [],
  onSubmitted,
  defaultWarehouseId,
}) {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote] = useState("");

  // Line items ready to be transferred
  // Each item: { product_id, product_name, product_code, tracking_type, variant_id, variant_name, quantity, serial_numbers: [] }
  const [items, setItems] = useState([]);

  // Mode: "scan" | "catalog"
  const [inputMode, setInputMode] = useState("scan");

  // Barcode / Serial Scan input state
  const [scanCode, setScanCode] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupFeedback, setLookupFeedback] = useState(null); // { type: 'success'|'error'|'warning', message: '' }
  const scanInputRef = useRef(null);

  // Manual Catalog Picker State
  const { productsQuery } = useProducts();
  const allProducts = Array.isArray(productsQuery?.data)
    ? productsQuery.data
    : productsQuery?.data?.items || [];
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [catalogQty, setCatalogQty] = useState(1);
  const [availableSerials, setAvailableSerials] = useState([]);
  const [selectedSerials, setSelectedSerials] = useState([]);
  const [isLoadingSerials, setIsLoadingSerials] = useState(false);
  const [availableBulkQty, setAvailableBulkQty] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize warehouses
  useEffect(() => {
    if (isOpen && sourceWarehouses.length > 0) {
      const match = sourceWarehouses.find((w) => String(w.id) === String(defaultWarehouseId));
      const defaultFrom = match ? String(match.id) : String(sourceWarehouses[0].id);
      setFromWarehouseId(defaultFrom);
      const otherWh = destinationWarehouses.find((w) => String(w.id) !== defaultFrom);
      if (otherWh) setToWarehouseId(String(otherWh.id));
    }
  }, [sourceWarehouses, destinationWarehouses, isOpen, defaultWarehouseId]);

  // Selected product object
  const currentSelectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return allProducts.find((p) => String(p.id) === String(selectedProductId));
  }, [allProducts, selectedProductId]);

  // When Source Warehouse or Selected Product changes, load available serialized units or bulk qty
  useEffect(() => {
    if (!fromWarehouseId || !selectedProductId) {
      setAvailableSerials([]);
      setSelectedSerials([]);
      setAvailableBulkQty(0);
      return;
    }

    const p = currentSelectedProduct;
    if (!p) return;

    const isSerialized =
      p.tracking_type?.value === "serialized" || p.tracking_type === "serialized";

    if (isSerialized) {
      setIsLoadingSerials(true);
      transferApi
        .getAvailableSerials(Number(fromWarehouseId), Number(selectedProductId))
        .then((units) => {
          setAvailableSerials(units);
          setSelectedSerials([]);
        })
        .catch(() => setAvailableSerials([]))
        .finally(() => setIsLoadingSerials(false));
    } else {
      transferApi
        .getBulkStock(Number(fromWarehouseId), Number(selectedProductId))
        .then((records) => {
          const totalQty = records.reduce((s, r) => s + (r.quantity || 0), 0);
          setAvailableBulkQty(totalQty);
        })
        .catch(() => setAvailableBulkQty(0));
    }
  }, [fromWarehouseId, selectedProductId, currentSelectedProduct]);

  // Handle Barcode Scan / Lookup
  const handleBarcodeLookup = async (e) => {
    if (e) e.preventDefault();
    const code = scanCode.trim();
    if (!code) return;

    if (!fromWarehouseId) {
      setLookupFeedback({
        type: "warning",
        message: "Please select the Source Warehouse first before scanning.",
      });
      return;
    }

    setIsLookingUp(true);
    setLookupFeedback(null);

    try {
      const res = await transferApi.lookupItem(code, Number(fromWarehouseId));

      if (!res.found) {
        setLookupFeedback({
          type: "error",
          message: res.message || `No product or serial item found with code "${code}".`,
        });
        return;
      }

      // Check if product is in source warehouse
      if (!res.in_source_warehouse) {
        setLookupFeedback({
          type: "warning",
          message:
            res.message ||
            `Item "${res.product_name}" (${res.serial_number || res.barcode}) exists in "${
              res.current_warehouse_name || "another facility"
            }", but is NOT available in the selected Source Warehouse.`,
        });
        return;
      }

      // Verified and available in source warehouse!
      // Add or update in transfer items list
      if (res.type === "serialized" && res.serial_number) {
        // Check if this serial is already added
        const isAlreadyAdded = items.some((it) =>
          it.serial_numbers?.includes(res.serial_number)
        );
        if (isAlreadyAdded) {
          setLookupFeedback({
            type: "warning",
            message: `Serial unit "${res.serial_number}" is already in your transfer list.`,
          });
          setScanCode("");
          return;
        }

        // Add to existing product item or create new item
        setItems((prev) => {
          const existingItemIndex = prev.findIndex(
            (it) => it.product_id === res.product_id && it.variant_id === res.variant_id
          );
          if (existingItemIndex >= 0) {
            const updated = [...prev];
            const item = { ...updated[existingItemIndex] };
            item.serial_numbers = [...(item.serial_numbers || []), res.serial_number];
            item.quantity = item.serial_numbers.length;
            updated[existingItemIndex] = item;
            return updated;
          } else {
            return [
              ...prev,
              {
                product_id: res.product_id,
                product_name: res.product_name,
                product_code: res.product_code,
                tracking_type: "serialized",
                variant_id: res.variant_id,
                variant_name: res.variant_name,
                quantity: 1,
                serial_numbers: [res.serial_number],
              },
            ];
          }
        });

        setLookupFeedback({
          type: "success",
          message: `✓ Serial Unit "${res.serial_number}" (${res.product_name}) added to transfer list.`,
        });
        setScanCode("");
        if (scanInputRef.current) scanInputRef.current.focus();
      } else {
        // Bulk stock found by barcode / SKU
        setItems((prev) => {
          const existingItemIndex = prev.findIndex(
            (it) => it.product_id === res.product_id && it.variant_id === res.variant_id
          );
          if (existingItemIndex >= 0) {
            const updated = [...prev];
            updated[existingItemIndex] = {
              ...updated[existingItemIndex],
              quantity: updated[existingItemIndex].quantity + 1,
            };
            return updated;
          } else {
            return [
              ...prev,
              {
                product_id: res.product_id,
                product_name: res.product_name,
                product_code: res.product_code,
                tracking_type: "bulk",
                variant_id: res.variant_id,
                variant_name: res.variant_name,
                quantity: 1,
                serial_numbers: [],
              },
            ];
          }
        });

        setLookupFeedback({
          type: "success",
          message: `✓ Product "${res.product_name}" added (1 unit).`,
        });
        setScanCode("");
        if (scanInputRef.current) scanInputRef.current.focus();
      }
    } catch (err) {
      setLookupFeedback({
        type: "error",
        message: err.response?.data?.detail || "Error looking up item.",
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  // Add item from Catalog picker
  const handleAddFromCatalog = () => {
    if (!currentSelectedProduct) return;

    const isSerialized =
      currentSelectedProduct.tracking_type?.value === "serialized" ||
      currentSelectedProduct.tracking_type === "serialized";

    if (isSerialized) {
      if (selectedSerials.length === 0) {
        toast.error("No Serials Selected", "Please select at least one serial number to transfer.");
        return;
      }

      setItems((prev) => {
        const existingIdx = prev.findIndex(
          (it) => it.product_id === currentSelectedProduct.id
        );
        if (existingIdx >= 0) {
          const updated = [...prev];
          const item = { ...updated[existingIdx] };
          const combined = Array.from(new Set([...(item.serial_numbers || []), ...selectedSerials]));
          item.serial_numbers = combined;
          item.quantity = combined.length;
          updated[existingIdx] = item;
          return updated;
        } else {
          return [
            ...prev,
            {
              product_id: currentSelectedProduct.id,
              product_name: currentSelectedProduct.name,
              product_code: currentSelectedProduct.product_code,
              tracking_type: "serialized",
              variant_id: null,
              variant_name: null,
              quantity: selectedSerials.length,
              serial_numbers: selectedSerials,
            },
          ];
        }
      });

      setSelectedSerials([]);
      toast.success("Units Added", `${selectedSerials.length} serialized unit(s) added.`);
    } else {
      const qty = Number(catalogQty);
      if (!qty || qty <= 0) {
        toast.error("Invalid Quantity", "Please enter a valid transfer quantity.");
        return;
      }
      if (qty > availableBulkQty) {
        toast.error(
          "Exceeds Stock",
          `Cannot transfer ${qty} units. Only ${availableBulkQty} available in source warehouse.`
        );
        return;
      }

      setItems((prev) => {
        const existingIdx = prev.findIndex(
          (it) => it.product_id === currentSelectedProduct.id
        );
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + qty,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              product_id: currentSelectedProduct.id,
              product_name: currentSelectedProduct.name,
              product_code: currentSelectedProduct.product_code,
              tracking_type: "bulk",
              variant_id: null,
              variant_name: null,
              quantity: qty,
              serial_numbers: [],
            },
          ];
        }
      });

      setCatalogQty(1);
      toast.success("Bulk Stock Added", `${qty} unit(s) added to transfer list.`);
    }
  };

  // Remove line item
  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove individual serial number
  const handleRemoveSerial = (itemIdx, serial) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[itemIdx] };
      item.serial_numbers = item.serial_numbers.filter((s) => s !== serial);
      item.quantity = item.serial_numbers.length;
      if (item.quantity === 0) {
        return updated.filter((_, i) => i !== itemIdx);
      }
      updated[itemIdx] = item;
      return updated;
    });
  };

  // Submit Transfer for Approval
  const handleSubmitTransfer = async () => {
    if (!fromWarehouseId || !toWarehouseId) {
      toast.error("Select Warehouses", "Please select both Source and Destination warehouses.");
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast.error(
        "Invalid Route",
        "Source Warehouse and Destination Warehouse must be different."
      );
      return;
    }
    if (items.length === 0) {
      toast.error(
        "No Items Added",
        "Please add at least one product or serialized item to transfer."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        from_warehouse_id: Number(fromWarehouseId),
        to_warehouse_id: Number(toWarehouseId),
        reference_number: referenceNumber.trim() || undefined,
        note: note.trim() || undefined,
        items: items.map((it) => ({
          product_id: it.product_id,
          variant_id: it.variant_id || undefined,
          quantity: it.quantity,
          serial_numbers: it.serial_numbers?.length ? it.serial_numbers : undefined,
        })),
      };

      const res = await transferApi.submitTransfer(payload);
      toast.success(
        "Transfer Request Created",
        `Transfer #${res.id} submitted for approval. Stock will update upon manager approval.`
      );
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Failed to submit transfer request.";
      toast.error("Submission Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fromWarehouseObj = sourceWarehouses.find((w) => String(w.id) === String(fromWarehouseId))
    || destinationWarehouses.find((w) => String(w.id) === String(fromWarehouseId));
  const toWarehouseObj = destinationWarehouses.find((w) => String(w.id) === String(toWarehouseId));
  const totalUnitsAdded = items.reduce((sum, it) => sum + (it.quantity || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Warehouse Transfer Request"
      size="3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-500 font-medium">
            Total Ready to Transfer:{" "}
            <strong className="text-slate-900 font-mono">{totalUnitsAdded} unit(s)</strong> across{" "}
            <strong className="text-slate-900 font-mono">{items.length} product(s)</strong>
          </span>
          <div className="flex items-center gap-2">
            <GhostButton type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </GhostButton>
            <PrimaryButton
              type="button"
              onClick={handleSubmitTransfer}
              disabled={isSubmitting || items.length === 0}
              icon={ArrowLeftRight}
              className="!bg-blue-600 hover:!bg-blue-700"
            >
              {isSubmitting ? "Submitting..." : "Submit for Approval"}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* ─── Step 1: Warehouse Routing ─────────────────────────────────── */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Warehouse size={14} className="text-blue-600" />
            1. Select Transfer Route (Source & Destination)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Source Warehouse (From) <span className="text-red-500">*</span>
              </label>
              <select
                value={fromWarehouseId}
                onChange={async (e) => {
                  const newVal = e.target.value;
                  // Clear items if warehouse changes to prevent invalid source units
                  if (items.length > 0) {
                    const isConfirmed = await confirm({
                      title: "Change Source Warehouse",
                      message: "Changing source warehouse will clear currently picked items. Proceed?",
                      confirmText: "Yes, Clear Items & Switch",
                      variant: "warning",
                    });
                    if (!isConfirmed) return;
                    setItems([]);
                  }
                  setFromWarehouseId(newVal);
                  if (String(toWarehouseId) === String(newVal)) {
                    const nextDest = destinationWarehouses.find((w) => String(w.id) !== String(newVal));
                    setToWarehouseId(nextDest ? String(nextDest.id) : "");
                  }
                }}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Select Source Warehouse</option>
                {sourceWarehouses.map((w) => (
                  <option key={w.id} value={String(w.id)}>
                    📍 {w.name} {w.code ? `(${w.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Destination Warehouse (To) <span className="text-red-500">*</span>
              </label>
              <select
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Select Destination Warehouse</option>
                {destinationWarehouses
                  .filter((w) => String(w.id) !== String(fromWarehouseId))
                  .map((w) => (
                    <option key={w.id} value={String(w.id)}>
                      🎯 {w.name} {w.code ? `(${w.code})` : ""}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Visual Route Indicator */}
          {fromWarehouseObj && toWarehouseObj && (
            <div className="flex items-center justify-center gap-2 p-2 bg-white rounded border border-slate-200 text-xs text-slate-700 font-medium">
              <span className="text-slate-900 font-semibold">{fromWarehouseObj.name}</span>
              <ArrowRight size={14} className="text-blue-600 shrink-0" />
              <span className="text-emerald-700 font-semibold">{toWarehouseObj.name}</span>
            </div>
          )}
        </div>

        {/* ─── Step 2: Product & Item Picking ─────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Package size={14} className="text-blue-600" />
              2. Add Products to Transfer
            </h4>

            {/* Input Mode Toggle */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setInputMode("scan")}
                className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                  inputMode === "scan"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ScanLine size={13} />
                Scan / Enter Barcode
              </button>
              <button
                type="button"
                onClick={() => setInputMode("catalog")}
                className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                  inputMode === "catalog"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Layers size={13} />
                Pick from Catalog
              </button>
            </div>
          </div>

          {/* Option A: Barcode / Serial Scanner */}
          {inputMode === "scan" && (
            <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 shadow-xs">
              <form onSubmit={handleBarcodeLookup} className="flex gap-2">
                <div className="relative flex-1">
                  <ScanLine
                    size={16}
                    className="absolute left-3 top-2.5 text-blue-600"
                  />
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    placeholder="Scan or enter barcode / serial number... (Press Enter)"
                    className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                    autoFocus
                  />
                </div>
                <PrimaryButton
                  type="submit"
                  disabled={isLookingUp || !scanCode.trim()}
                  icon={Check}
                  className="shrink-0 text-xs px-3.5"
                >
                  {isLookingUp ? "Checking..." : "Verify & Add"}
                </PrimaryButton>
              </form>

              {/* Lookup Feedback Notification */}
              {lookupFeedback && (
                <div
                  className={`p-2.5 rounded-md text-xs flex items-center gap-2 border ${
                    lookupFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : lookupFeedback.type === "warning"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  }`}
                >
                  {lookupFeedback.type === "success" ? (
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  ) : lookupFeedback.type === "warning" ? (
                    <AlertCircle size={15} className="text-amber-600 shrink-0" />
                  ) : (
                    <XCircle size={15} className="text-red-600 shrink-0" />
                  )}
                  <span>{lookupFeedback.message}</span>
                </div>
              )}

              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Barcode size={13} />
                Supports instant USB/Bluetooth Barcode Scanners and manual keyboard entry. Scanned items
                are automatically checked against the Source Warehouse stock.
              </p>
            </div>
          )}

          {/* Option B: Manual Catalog Picker */}
          {inputMode === "catalog" && (
            <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Select Product
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">Choose product...</option>
                    {allProducts.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name} {p.product_code ? `(${p.product_code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {currentSelectedProduct && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Tracking Mode & Stock in Source Warehouse
                    </label>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-md text-xs flex items-center justify-between">
                      <span className="font-semibold text-slate-700">
                        {currentSelectedProduct.tracking_type === "serialized"
                          ? "Serialized Tracking"
                          : "Bulk Stock"}
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        {currentSelectedProduct.tracking_type === "serialized"
                          ? `${availableSerials.length} units in stock`
                          : `${availableBulkQty} units available`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* If Serialized: Pick serial units */}
              {currentSelectedProduct?.tracking_type === "serialized" && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Available Serial Numbers ({availableSerials.length} in this warehouse):
                    </span>
                    {availableSerials.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSerials(
                            selectedSerials.length === availableSerials.length
                              ? []
                              : availableSerials.map((u) => u.serial_number)
                          )
                        }
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {selectedSerials.length === availableSerials.length
                          ? "Deselect All"
                          : "Select All"}
                      </button>
                    )}
                  </div>

                  {isLoadingSerials ? (
                    <p className="text-xs text-slate-400 py-2">Loading serial units...</p>
                  ) : availableSerials.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                      No serialized units currently in stock for this product in the selected source warehouse.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2.5 bg-slate-50 rounded border border-slate-200">
                      {availableSerials.map((unit) => {
                        const isChecked = selectedSerials.includes(unit.serial_number);
                        return (
                          <button
                            key={unit.id}
                            type="button"
                            onClick={() =>
                              setSelectedSerials((prev) =>
                                isChecked
                                  ? prev.filter((s) => s !== unit.serial_number)
                                  : [...prev, unit.serial_number]
                              )
                            }
                            className={`px-2.5 py-1 text-xs rounded border font-mono transition-all ${
                              isChecked
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                            }`}
                          >
                            {unit.serial_number}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <PrimaryButton
                      type="button"
                      onClick={handleAddFromCatalog}
                      disabled={selectedSerials.length === 0}
                      className="text-xs"
                    >
                      Add {selectedSerials.length} Unit(s) to Transfer List
                    </PrimaryButton>
                  </div>
                </div>
              )}

              {/* If Bulk: Pick Quantity */}
              {currentSelectedProduct &&
                currentSelectedProduct.tracking_type !== "serialized" && (
                  <div className="flex items-end gap-3 pt-2 border-t border-slate-100">
                    <div className="w-36">
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Transfer Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={availableBulkQty}
                        value={catalogQty}
                        onChange={(e) => setCatalogQty(Math.max(1, Number(e.target.value)))}
                        className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <PrimaryButton
                      type="button"
                      onClick={handleAddFromCatalog}
                      disabled={availableBulkQty <= 0 || catalogQty > availableBulkQty}
                      className="text-xs"
                    >
                      Add Bulk Quantity
                    </PrimaryButton>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* ─── Step 3: Transfer Items Review Table ────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Transfer Items Queue ({items.length} items, {totalUnitsAdded} units)
            </h4>
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setItems([])}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Tracking</th>
                  <th className="py-2.5 px-3">Serial / Detail</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No items added yet. Scan a barcode above or pick products from the catalog.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 block">{it.product_name}</span>
                        {it.product_code && (
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 rounded">
                            {it.product_code}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge color={it.tracking_type === "serialized" ? "blue" : "purple"} size="sm">
                          {it.tracking_type === "serialized" ? "Serialized" : "Bulk"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        {it.tracking_type === "serialized" && it.serial_numbers?.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {it.serial_numbers.map((sn) => (
                              <span
                                key={sn}
                                className="font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                              >
                                {sn}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSerial(idx, sn)}
                                  className="text-slate-400 hover:text-red-500"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">Standard Bulk</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {it.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Step 4: Transfer Reference & Note ──────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Transfer Reference # (Optional)
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. TRF-2026-001"
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Reason / Transfer Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Branch stock replenishment, internal transfer..."
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main TransferPage Component ─────────────────────────────────────────────
export function TransferPage() {
  const { selectedWarehouseId, selectWarehouse, myWarehouses } = useWarehouseFilter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTransferForView, setSelectedTransferForView] = useState(null);

  const { warehouses: assignedWarehouses = [] } = useWarehouses();
  const sourceWarehouses = assignedWarehouses.length > 0 ? assignedWarehouses : (myWarehouses || []);

  const { data: allActiveWarehouses = [] } = useQuery({
    queryKey: ["warehouses", "all-active"],
    queryFn: () => warehousesApi.listAllActiveWarehouses(),
    staleTime: 5 * 60 * 1000,
  });
  const destinationWarehouses = allActiveWarehouses.length > 0 ? allActiveWarehouses : sourceWarehouses;

  // Reset pagination and direction when warehouse filter changes
  useEffect(() => {
    setPage(1);
    setDirectionFilter("all");
  }, [selectedWarehouseId]);

  const {
    transfers = [],
    total,
    totalPages,
    isLoading,
    isFetching,
    refetch,
    stats,
  } = useTransfers({
    page,
    page_size: 10,
    status: statusFilter,
    search,
    warehouse_id: selectedWarehouseId ?? undefined,
    direction: selectedWarehouseId && directionFilter !== "all" ? directionFilter : undefined,
  });

  return (
    <div className="space-y-5">
      {/* ─── Top Stats Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatCard
          label="Total Transfers"
          value={stats.total}
          icon={ArrowLeftRight}
          tint="blue"
        />
        <StatCard
          label="Pending Approval"
          value={stats.pending}
          icon={Clock}
          tint="amber"
        />
        <StatCard
          label="Approved & Shifted"
          value={stats.approved}
          icon={CheckCircle2}
          tint="emerald"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={XCircle}
          tint="slate"
        />
      </div>

      {/* ─── Toolbar & Filters ──────────────────────────────────────────── */}
      <Toolbar
        action={
          <div className="flex items-center gap-2">
            <ExportCSVButton
              filename="warehouse-transfers"
              columns={[
                { label: "ID", key: "id" },
                { label: "Reference", value: (t) => t.payload?.reference_number || t.reference || `#${t.id}` },
                { label: "Date & Time", value: (t) => formatBDDateTime(t.created_at) },
                { label: "Requester", value: (t) => t.requested_by_name || t.requester_name || t.requester?.name || "—" },
                { label: "Source Warehouse", value: (t) => t.warehouse_name || t.from_warehouse_name || (t.warehouse_id ? `WH #${t.warehouse_id}` : "—") },
                { label: "Destination Warehouse", value: (t) => t.to_warehouse_name || t.payload?.to_warehouse_name || (t.payload?.to_warehouse_id ? `WH #${t.payload.to_warehouse_id}` : "—") },
                { label: "Items Count", value: (t) => t.payload?.items?.length || 0 },
                { label: "Status", key: "status" },
              ]}
              data={transfers}
            />
            <GhostButton
              icon={RefreshCw}
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh Transfers"
            >
              {isFetching ? "Refreshing..." : "Refresh"}
            </GhostButton>
            <PrimaryButton
              icon={Plus}
              onClick={() => setIsCreateModalOpen(true)}
              className="!bg-blue-600 hover:!bg-blue-700"
            >
              Initiate Transfer
            </PrimaryButton>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <SearchBox
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search transfer ref, product, warehouse..."
            className="w-64 sm:w-72"
          />

          {/* Warehouse Filter */}
          {sourceWarehouses && sourceWarehouses.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Warehouse:</span>
              <select
                value={selectedWarehouseId ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  selectWarehouse(val);
                  setPage(1);
                  setDirectionFilter("all");
                }}
                className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="">All Warehouses</option>
                {sourceWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.code ? `(${w.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Direction Filter (when specific warehouse is selected) */}
          {selectedWarehouseId && (
            <FilterChips
              options={[
                { label: "All Movements", value: "all" },
                { label: "Sent (From WH)", value: "from" },
                { label: "Received (To WH)", value: "to" },
              ]}
              value={directionFilter}
              onChange={(val) => {
                setDirectionFilter(val);
                setPage(1);
              }}
            />
          )}

          <FilterChips
            options={[
              { label: "All", value: "all" },
              { label: "Pending", value: "pending" },
              { label: "Approved", value: "approved" },
              { label: "Rejected", value: "rejected" },
            ]}
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          />
        </div>
      </Toolbar>

      {/* ─── Main Transfers Table ────────────────────────────────────────── */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <Th className="w-20">#ID</Th>
                <Th>Date & Requester</Th>
                <Th>Source Warehouse (From)</Th>
                <Th>Destination Warehouse (To)</Th>
                <Th>Transfer Summary</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-slate-400">
                    Loading transfers...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <EmptyTable
                  cols={7}
                  message="No transfer records found matching your filters. Click 'Initiate Transfer' to create one."
                />
              ) : (
                transfers.map((t) => {
                  const payload = t.payload || {};
                  const itemCount = payload.items?.length || 0;
                  const totalUnits =
                    payload.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTransferForView(t)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <Td mono className="text-xs text-slate-500 font-semibold">
                        #{t.id}
                      </Td>
                      <Td>
                        <div>
                          <p className="font-semibold text-slate-900 text-xs">
                            {formatBDDateTime(t.created_at)}
                          </p>
                          <span className="text-[11px] text-slate-500">
                            By {t.requested_by_name || "Staff"}
                          </span>
                          {t.status === "approved" && t.reviewed_by_name && (
                            <p className="text-[10px] font-semibold text-emerald-700">
                              Approved by {t.reviewed_by_name}
                            </p>
                          )}
                          {t.status === "rejected" && t.reviewed_by_name && (
                            <p className="text-[10px] font-semibold text-rose-700">
                              Rejected by {t.reviewed_by_name}
                            </p>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded ${
                          selectedWarehouseId && Number(t.warehouse_id) === Number(selectedWarehouseId)
                            ? "bg-blue-100 text-blue-800 border border-blue-300 font-bold"
                            : "bg-slate-100 text-slate-800"
                        }`}>
                          <Warehouse size={12} className={selectedWarehouseId && Number(t.warehouse_id) === Number(selectedWarehouseId) ? "text-blue-600" : "text-slate-500"} />
                          {t.warehouse_name || `WH #${t.warehouse_id}`}
                          {selectedWarehouseId && Number(t.warehouse_id) === Number(selectedWarehouseId) && (
                            <span className="text-[10px] bg-blue-600 text-white px-1 rounded uppercase tracking-wider font-semibold">Origin</span>
                          )}
                        </span>
                      </Td>
                      <Td>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded border ${
                          selectedWarehouseId && Number(payload.to_warehouse_id || t.to_warehouse_id) === Number(selectedWarehouseId)
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}>
                          <Warehouse size={12} className="text-emerald-600" />
                          {t.to_warehouse_name || `WH #${payload.to_warehouse_id || "—"}`}
                          {selectedWarehouseId && Number(payload.to_warehouse_id || t.to_warehouse_id) === Number(selectedWarehouseId) && (
                            <span className="text-[10px] bg-emerald-600 text-white px-1 rounded uppercase tracking-wider font-semibold">Destination</span>
                          )}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-700">
                          <strong>{itemCount}</strong> product{itemCount !== 1 ? "s" : ""},{" "}
                          <strong>{totalUnits}</strong> unit{totalUnits !== 1 ? "s" : ""}
                        </span>
                        {payload.reference_number && (
                          <span className="font-mono text-[10px] text-slate-400 block">
                            Ref: {payload.reference_number}
                          </span>
                        )}
                      </Td>
                      <Td>
                        <StatusBadge status={t.status} />
                      </Td>
                      <Td className="text-right">
                        <div
                          className="flex items-center justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GhostButton
                            onClick={() => setSelectedTransferForView(t)}
                            className="px-2.5 py-1 text-xs text-blue-600 hover:text-blue-800"
                            icon={Eye}
                          >
                            View
                          </GhostButton>
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* ─── Detail View Modal ────────────────────────────────────────── */}
      <TransferDetailModal
        transfer={selectedTransferForView}
        onClose={() => setSelectedTransferForView(null)}
      />

      {/* ─── Create Transfer Modal ─────────────────────────────────────── */}
      <TransferCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        sourceWarehouses={sourceWarehouses}
        destinationWarehouses={destinationWarehouses}
        defaultWarehouseId={selectedWarehouseId}
        onSubmitted={() => refetch()}
      />
    </div>
  );
}
