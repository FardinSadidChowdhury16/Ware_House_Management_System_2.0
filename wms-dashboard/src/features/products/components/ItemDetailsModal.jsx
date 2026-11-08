import React, { useState, useEffect } from "react";
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Paperclip,
  ShieldCheck,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Truck,
  Wrench,
  Clock,
  User,
  Building2,
  Tag,
  AlertCircle,
  Edit2,
  FileCheck,
} from "lucide-react";
import { Modal } from "../../../components/ui/Modal.jsx";
import { StatusPill } from "../../../components/ui/StatusPill.jsx";
import { productsApi } from "../api/productsApi.js";

function formatDate(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(d);
  }
}

function formatDateOnly(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(d);
  }
}

function isImageFile(url, is_image) {
  if (is_image !== undefined) return is_image;
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(clean);
}

function getSourceBadge(source) {
  switch (source) {
    case "stock_in":
      return {
        label: "Stock In",
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: ArrowDownLeft,
      };
    case "stock_out":
      return {
        label: "Stock Out",
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        icon: ArrowUpRight,
      };
    case "service_intake":
      return {
        label: "Return Intake",
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Wrench,
      };
    case "service_delivery":
      return {
        label: "Return Delivery",
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Truck,
      };
    default:
      return {
        label: "Movement",
        bg: "bg-slate-50 text-slate-700 border-slate-200",
        icon: Paperclip,
      };
  }
}

export function ItemDetailsModal({
  isOpen,
  onClose,
  variant,
  product,
  productTypes = [],
  canWrite = false,
  onEdit,
}) {
  const [activeTab, setActiveTab] = useState("attachments");
  const [detailVariant, setDetailVariant] = useState(variant);

  useEffect(() => {
    setDetailVariant(variant);
    const prodId = variant?.product_id || product?.id;
    const varId = variant?.id;
    if (isOpen && prodId && varId) {
      productsApi
        .getVariant(prodId, varId)
        .then((fresh) => {
          if (fresh) setDetailVariant(fresh);
        })
        .catch((err) => {
          console.warn("Could not fetch fresh variant details:", err);
        });
    }
  }, [isOpen, variant?.id, variant?.product_id, product?.id]);

  if (!isOpen || !variant) return null;

  const item = detailVariant || variant;

  const categoryType = productTypes.find((t) => t.id === product?.category_id);
  const attrs = categoryType?.attributes || [];
  const attributeValues = item.attribute_values || [];

  const rawMovements = item.movements || [];
  const stockIn =
    item.stock_in_details ||
    rawMovements.find(
      (m) =>
        m.movement_type === "purchase_in" ||
        m.movement_type === "PURCHASE_IN" ||
        String(m.movement_type).toLowerCase().includes("purchase") ||
        String(m.movement_type).toLowerCase().includes("in")
    );
  const stockOut =
    item.stock_out_details ||
    rawMovements.find(
      (m) =>
        m.movement_type === "sale_out" ||
        m.movement_type === "SALE_OUT" ||
        String(m.movement_type).toLowerCase().includes("sale") ||
        String(m.movement_type).toLowerCase().includes("out")
    );
  const serviceTicket = item.service_ticket_details;
  const rawAttachments = item.attachments || [];
  const movements = rawMovements;

  // Deduplicate and consolidate attachments if any additional ones exist
  const consolidatedAttachments = [...rawAttachments];
  const seenUrls = new Set(consolidatedAttachments.map((a) => a.url));

  if (stockIn?.attachment_url && !seenUrls.has(stockIn.attachment_url)) {
    consolidatedAttachments.push({
      source: "stock_in",
      title: "Stock In Document/Slip",
      url: stockIn.attachment_url,
      date: stockIn.created_at,
      note: stockIn.note,
      party: stockIn.supplier_name,
      warehouse: stockIn.warehouse_name,
      filename: stockIn.attachment_url.split("?")[0].split("/").pop(),
      is_image: isImageFile(stockIn.attachment_url),
    });
    seenUrls.add(stockIn.attachment_url);
  }

  if (stockOut?.attachment_url && !seenUrls.has(stockOut.attachment_url)) {
    consolidatedAttachments.push({
      source: "stock_out",
      title: "Stock Out Delivery Slip",
      url: stockOut.attachment_url,
      date: stockOut.created_at,
      note: stockOut.note,
      party: stockOut.customer_name,
      warehouse: stockOut.warehouse_name,
      filename: stockOut.attachment_url.split("?")[0].split("/").pop(),
      is_image: isImageFile(stockOut.attachment_url),
    });
    seenUrls.add(stockOut.attachment_url);
  }

  if (serviceTicket?.attachment_url && !seenUrls.has(serviceTicket.attachment_url)) {
    consolidatedAttachments.push({
      source: "service_intake",
      title: `Return Intake Attachment (${serviceTicket.ticket_number || ""})`,
      url: serviceTicket.attachment_url,
      date: serviceTicket.received_date || serviceTicket.created_at,
      note: serviceTicket.issue_description,
      party: serviceTicket.customer_name,
      warehouse: serviceTicket.warehouse_name,
      filename: serviceTicket.attachment_url.split("?")[0].split("/").pop(),
      is_image: isImageFile(serviceTicket.attachment_url),
    });
    seenUrls.add(serviceTicket.attachment_url);
  }

  if (serviceTicket?.delivery_attachment_url && !seenUrls.has(serviceTicket.delivery_attachment_url)) {
    consolidatedAttachments.push({
      source: "service_delivery",
      title: `Return Delivery Proof (${serviceTicket.ticket_number || ""})`,
      url: serviceTicket.delivery_attachment_url,
      date: serviceTicket.delivered_date,
      note: serviceTicket.repair_notes || "Delivered to customer",
      party: serviceTicket.customer_name,
      warehouse: serviceTicket.warehouse_name,
      filename: serviceTicket.delivery_attachment_url.split("?")[0].split("/").pop(),
      is_image: isImageFile(serviceTicket.delivery_attachment_url),
    });
    seenUrls.add(serviceTicket.delivery_attachment_url);
  }

  const isStockedIn = Boolean(
    item.is_stocked_in ||
      item.warehouse_name ||
      (Array.isArray(item.assigned_warehouses) && item.assigned_warehouses.length > 0)
  );
  const isSold = Boolean(item.is_sold || item.isSold || item.stock_status === "sold");

  return (
    <Modal
      isOpen={isOpen}
      title={`Item Details: ${item.name || item.barcode || "Item"}`}
      onClose={onClose}
      size="3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          {canWrite && onEdit ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-md transition-colors"
            >
              <Edit2 size={13} />
              Edit Item
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-white bg-slate-800 hover:bg-slate-900 px-4 py-2 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Product context banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div>
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block">
              Product & Category
            </span>
            <p className="text-sm font-semibold text-slate-900">
              {product?.name || "Product"}
              <span className="text-slate-500 font-normal ml-2">
                ({categoryType?.name || product?.category || "General"})
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isStockedIn ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-xs bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Stocked In
              </span>
            ) : isSold ? (
              <span className="inline-flex items-center gap-1 text-rose-700 font-medium text-xs bg-rose-50 border border-rose-200 rounded-full px-2.5 py-0.5 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Sold
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700 font-medium text-xs bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Not Stocked In
              </span>
            )}
            <StatusPill status={item.status === "active" ? "Active" : "Inactive"} />
          </div>
        </div>

        {/* Pricing, Barcode & Warehouse specs */}
        <div className="border border-slate-200 rounded-lg p-3.5 bg-white space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium block mb-0.5">Name/Serial Number</span>
              <p className="font-semibold text-slate-900 truncate" title={item.name}>
                {item.name || "—"}
              </p>
            </div>
            <div>
              <span className="text-slate-500 font-medium block mb-0.5">Barcode</span>
              <p className="wms-mono font-semibold text-slate-900">{item.barcode || "—"}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium block mb-0.5">Cost Price</span>
              <p className="font-semibold text-slate-900">
                ৳{Number(item.cost_price || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-slate-500 font-medium block mb-0.5">Selling Price</span>
              <p className="font-semibold text-emerald-700">
                ৳{Number(item.selling_price || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium block mb-0.5">Assigned Warehouse</span>
              <p className="font-semibold text-slate-800">
                {item.warehouse_name ||
                  (Array.isArray(item.assigned_warehouses) && item.assigned_warehouses.length > 0
                    ? item.assigned_warehouses.join(", ")
                    : "—")}
              </p>
            </div>
            <div>
              <span className="text-slate-500 font-medium block mb-0.5">Warranty Period</span>
              <p className="text-slate-800">
                {item.warranty_start_date ? formatDateOnly(item.warranty_start_date) : "Not set"}
                {item.warranty_start_date && item.warranty_end_date ? " → " : ""}
                {item.warranty_end_date ? formatDateOnly(item.warranty_end_date) : ""}
              </p>
            </div>
            <div>
              <span className="text-slate-500 font-medium block mb-0.5">Tax Rules</span>
              {item.taxes && item.taxes.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {item.taxes.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400">None</span>
              )}
            </div>
          </div>
        </div>

        {/* Custom Category Attributes if any */}
        {attrs.length > 0 && (
          <div className="border border-slate-200 rounded-lg p-3.5 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <FileText size={14} className="text-slate-500" />
                <span>Other Informations ({categoryType?.name || "Category Fields"})</span>
              </div>
              <span className="text-[11px] text-slate-400">{attrs.length} custom field(s)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              {attrs.map((attr) => {
                const attrVal = attributeValues.find((av) => Number(av.attribute_id) === Number(attr.id));
                const val = attrVal?.value;
                return (
                  <div key={attr.id} className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[11px] text-slate-500 block mb-0.5">
                      {attr.field_label}
                      {attr.unit && <span className="text-slate-400 ml-0.5">({attr.unit})</span>}
                    </span>
                    <p className="font-medium text-slate-800">
                      {val !== undefined && val !== null && String(val).trim() !== "" ? val : "—"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab navigation for Lifecycle, Attachments & Movements */}
        <div className="border-b border-slate-200 flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab("attachments")}
            className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "attachments"
                ? "border-blue-600 text-blue-700 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Paperclip size={13} />
            <span>Attached Documents & Photos</span>
            {consolidatedAttachments.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {consolidatedAttachments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("stock_in")}
            className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "stock_in"
                ? "border-emerald-600 text-emerald-700 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <ArrowDownLeft size={13} />
            <span>Stock In Details</span>
            {stockIn && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("stock_out")}
            className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "stock_out"
                ? "border-rose-600 text-rose-700 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <ArrowUpRight size={13} />
            <span>Stock Out Details</span>
            {stockOut && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("return_delivery")}
            className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "return_delivery"
                ? "border-indigo-600 text-indigo-700 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Truck size={13} />
            <span>Return / Delivery Proof</span>
            {serviceTicket && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            )}
          </button>

          {movements.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("movements")}
              className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "movements"
                  ? "border-slate-800 text-slate-900 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Clock size={13} />
              <span>Movement History</span>
              <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {movements.length}
              </span>
            </button>
          )}
        </div>

        {/* TAB 1: Consolidated Attached Documents & Photos */}
        {activeTab === "attachments" && (
          <div className="space-y-3">
            {consolidatedAttachments.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                <Paperclip size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">No attached documents or photos yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Files, invoices, slips, or photos uploaded during Stock In, Stock Out, or Return Delivery will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {consolidatedAttachments.map((att, idx) => {
                  const badge = getSourceBadge(att.source);
                  const isImg = isImageFile(att.url, att.is_image);

                  return (
                    <div
                      key={`${att.url}-${idx}`}
                      className="border border-slate-200 rounded-lg overflow-hidden bg-white hover:border-slate-300 transition-all shadow-sm flex flex-col justify-between"
                    >
                      {/* Top Header of Card */}
                      <div className="p-3 border-b border-slate-100 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold border rounded px-1.5 py-0.5 mb-1 ${badge.bg}`}
                          >
                            <badge.icon size={10} />
                            {badge.label}
                          </span>
                          <h5 className="text-xs font-semibold text-slate-800 truncate" title={att.title}>
                            {att.title || "Attached Document"}
                          </h5>
                          {att.date && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar size={10} /> {formatDate(att.date)}
                            </p>
                          )}
                        </div>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors whitespace-nowrap"
                          title="Open original file in new tab"
                        >
                          <ExternalLink size={11} />
                          View
                        </a>
                      </div>

                      {/* Preview Box */}
                      <div className="p-3 bg-slate-50 flex items-center justify-center">
                        {isImg ? (
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block group relative overflow-hidden rounded border border-slate-200 bg-white max-h-40 w-full"
                          >
                            <img
                              src={att.url}
                              alt={att.title || "Attachment"}
                              className="w-full h-36 object-contain p-1 group-hover:scale-105 transition-transform duration-200"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1">
                              <ExternalLink size={13} />
                              Open Full Size
                            </div>
                          </a>
                        ) : (
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded w-full hover:border-blue-400 transition-colors"
                          >
                            <FileText size={24} className="text-rose-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-slate-800 truncate">
                                {att.filename || "Document File"}
                              </p>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                Click to preview / download
                              </span>
                            </div>
                          </a>
                        )}
                      </div>

                      {/* Footer Info */}
                      {(att.warehouse || att.party || att.note) && (
                        <div className="p-2.5 bg-white border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
                          {att.warehouse && (
                            <p className="truncate">
                              <span className="text-slate-400">Warehouse:</span>{" "}
                              <strong className="text-slate-700 font-medium">{att.warehouse}</strong>
                            </p>
                          )}
                          {att.party && (
                            <p className="truncate">
                              <span className="text-slate-400">Party:</span>{" "}
                              <strong className="text-slate-700 font-medium">{att.party}</strong>
                            </p>
                          )}
                          {att.note && (
                            <p className="text-slate-500 text-[10px] italic line-clamp-2">
                              Note: {att.note}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Stock In Details */}
        {activeTab === "stock_in" && (
          <div className="space-y-3">
            {stockIn ? (
              <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50/20 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-md bg-emerald-100 text-emerald-800">
                      <ArrowDownLeft size={16} />
                    </span>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900">Stock In Information</h4>
                      <p className="text-[10px] text-slate-500">
                        Recorded on {formatDate(stockIn.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                    Purchased / Stocked In
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Receiving Warehouse</span>
                    <strong className="text-slate-900">{stockIn.warehouse_name || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Supplier</span>
                    <strong className="text-slate-900">{stockIn.supplier_name || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Reference # / Type</span>
                    <strong className="text-slate-900">
                      {stockIn.reference_number || stockIn.reference_id || stockIn.reference_type || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Recorded By</span>
                    <strong className="text-slate-900">{stockIn.created_by_name || "Admin"}</strong>
                  </div>
                </div>

                {stockIn.note && (
                  <div className="p-2.5 bg-white border border-emerald-100 rounded-md text-xs">
                    <span className="text-slate-400 block text-[10px] font-medium uppercase mb-0.5">
                      Stock In Note
                    </span>
                    <p className="text-slate-700">{stockIn.note}</p>
                  </div>
                )}

                {stockIn.attachment_url ? (
                  <div className="pt-2 border-t border-emerald-100">
                    <span className="text-xs font-semibold text-slate-800 block mb-1.5">
                      Attached Document / Receipt:
                    </span>
                    <div className="flex items-center gap-3">
                      {isImageFile(stockIn.attachment_url) ? (
                        <a
                          href={stockIn.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block relative group overflow-hidden rounded border border-emerald-200 bg-white"
                        >
                          <img
                            src={stockIn.attachment_url}
                            alt="Stock In Doc"
                            className="h-20 w-32 object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px]">
                            Preview
                          </span>
                        </a>
                      ) : (
                        <div className="p-3 bg-white rounded border border-emerald-200 flex items-center gap-2">
                          <FileText size={20} className="text-rose-500" />
                          <span className="text-xs text-slate-700 font-medium">
                            {stockIn.attachment_url.split("?")[0].split("/").pop()}
                          </span>
                        </div>
                      )}
                      <a
                        href={stockIn.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded transition-colors"
                      >
                        <ExternalLink size={13} />
                        View Attached File
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No document was attached during this stock in.</p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                <ArrowDownLeft size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">No Stock In record found</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  This item has not yet been processed through the Stock In module.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Stock Out Details */}
        {activeTab === "stock_out" && (
          <div className="space-y-3">
            {stockOut ? (
              <div className="border border-rose-200 rounded-lg p-4 bg-rose-50/20 space-y-3">
                <div className="flex items-center justify-between border-b border-rose-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-md bg-rose-100 text-rose-800">
                      <ArrowUpRight size={16} />
                    </span>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900">Stock Out Information</h4>
                      <p className="text-[10px] text-slate-500">
                        Dispatched on {formatDate(stockOut.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 font-medium bg-rose-50 border border-rose-200 rounded-full px-2.5 py-0.5">
                    Dispatched / Sold Out
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Dispatched Warehouse</span>
                    <strong className="text-slate-900">{stockOut.warehouse_name || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Customer</span>
                    <strong className="text-slate-900">{stockOut.customer_name || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Reference # / Type</span>
                    <strong className="text-slate-900">
                      {stockOut.reference_number || stockOut.reference_id || stockOut.reference_type || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Dispatched By</span>
                    <strong className="text-slate-900">{stockOut.created_by_name || "Admin"}</strong>
                  </div>
                </div>

                {stockOut.note && (
                  <div className="p-2.5 bg-white border border-rose-100 rounded-md text-xs">
                    <span className="text-slate-400 block text-[10px] font-medium uppercase mb-0.5">
                      Stock Out Note
                    </span>
                    <p className="text-slate-700">{stockOut.note}</p>
                  </div>
                )}

                {stockOut.attachment_url ? (
                  <div className="pt-2 border-t border-rose-100">
                    <span className="text-xs font-semibold text-slate-800 block mb-1.5">
                      Attached Delivery Slip / Challan:
                    </span>
                    <div className="flex items-center gap-3">
                      {isImageFile(stockOut.attachment_url) ? (
                        <a
                          href={stockOut.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block relative group overflow-hidden rounded border border-rose-200 bg-white"
                        >
                          <img
                            src={stockOut.attachment_url}
                            alt="Stock Out Doc"
                            className="h-20 w-32 object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px]">
                            Preview
                          </span>
                        </a>
                      ) : (
                        <div className="p-3 bg-white rounded border border-rose-200 flex items-center gap-2">
                          <FileText size={20} className="text-rose-500" />
                          <span className="text-xs text-slate-700 font-medium">
                            {stockOut.attachment_url.split("?")[0].split("/").pop()}
                          </span>
                        </div>
                      )}
                      <a
                        href={stockOut.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-800 bg-rose-100 hover:bg-rose-200 px-3 py-1.5 rounded transition-colors"
                      >
                        <ExternalLink size={13} />
                        View Attached File
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No document was attached during stock out.</p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                <ArrowUpRight size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">No Stock Out record</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  This item has not been stocked out or sold yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Service & Return Delivery Proof */}
        {activeTab === "return_delivery" && (
          <div className="space-y-3">
            {serviceTicket ? (
              <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50/20 space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-md bg-indigo-100 text-indigo-800">
                      <Truck size={16} />
                    </span>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900">
                        Service Ticket: {serviceTicket.ticket_number}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Received on {formatDateOnly(serviceTicket.received_date)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700 font-medium bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-0.5 capitalize">
                    {serviceTicket.status_display || serviceTicket.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Customer Name</span>
                    <strong className="text-slate-900">{serviceTicket.customer_name || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Warehouse</span>
                    <strong className="text-slate-900">{serviceTicket.warehouse_name || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Delivered Date</span>
                    <strong className="text-slate-900">
                      {serviceTicket.delivered_date ? formatDate(serviceTicket.delivered_date) : "Pending Delivery"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Delivered By</span>
                    <strong className="text-slate-900">
                      {serviceTicket.delivered_by_name || "—"}
                    </strong>
                  </div>
                </div>

                {serviceTicket.issue_description && (
                  <div className="p-2.5 bg-white border border-indigo-100 rounded-md text-xs">
                    <span className="text-slate-400 block text-[10px] font-medium uppercase mb-0.5">
                      Reported Issue
                    </span>
                    <p className="text-slate-700">{serviceTicket.issue_description}</p>
                  </div>
                )}

                {serviceTicket.repair_notes && (
                  <div className="p-2.5 bg-white border border-indigo-100 rounded-md text-xs">
                    <span className="text-slate-400 block text-[10px] font-medium uppercase mb-0.5">
                      Repair & Delivery Notes
                    </span>
                    <p className="text-slate-700">{serviceTicket.repair_notes}</p>
                  </div>
                )}

                {/* Attachments inside Service Ticket */}
                <div className="pt-2 border-t border-indigo-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Intake attachment */}
                  <div className="p-2.5 bg-white rounded-md border border-slate-200">
                    <span className="text-xs font-semibold text-slate-800 block mb-1">
                      Intake Attachment (Battery Photo / Card):
                    </span>
                    {serviceTicket.attachment_url ? (
                      <div className="space-y-1.5">
                        {isImageFile(serviceTicket.attachment_url) && (
                          <img
                            src={serviceTicket.attachment_url}
                            alt="Intake"
                            className="h-24 w-full object-contain rounded bg-slate-50 border border-slate-100"
                          />
                        )}
                        <a
                          href={serviceTicket.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink size={11} />
                          View Intake File
                        </a>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No intake photo/card attached.</p>
                    )}
                  </div>

                  {/* Delivery attachment */}
                  <div className="p-2.5 bg-white rounded-md border border-slate-200">
                    <span className="text-xs font-semibold text-slate-800 block mb-1">
                      Delivery Proof (Gate Pass / Receipt):
                    </span>
                    {serviceTicket.delivery_attachment_url ? (
                      <div className="space-y-1.5">
                        {isImageFile(serviceTicket.delivery_attachment_url) && (
                          <img
                            src={serviceTicket.delivery_attachment_url}
                            alt="Delivery Proof"
                            className="h-24 w-full object-contain rounded bg-slate-50 border border-slate-100"
                          />
                        )}
                        <a
                          href={serviceTicket.delivery_attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-800"
                        >
                          <ExternalLink size={11} />
                          View Delivery Proof File
                        </a>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No delivery proof attached yet.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                <Truck size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">No Return or Service Delivery Record</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  This item has not undergone return, servicing, or return delivery.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Movement History Log */}
        {activeTab === "movements" && movements.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium uppercase border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Warehouse</th>
                    <th className="py-2 px-3">Party</th>
                    <th className="py-2 px-3">Attachment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                        {formatDate(m.created_at)}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-800">
                          {m.movement_type_display || m.movement_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-700">{m.warehouse_name || "—"}</td>
                      <td className="py-2 px-3 text-slate-700">{m.party_name || "—"}</td>
                      <td className="py-2 px-3">
                        {m.attachment_url ? (
                          <a
                            href={m.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink size={11} /> File
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

