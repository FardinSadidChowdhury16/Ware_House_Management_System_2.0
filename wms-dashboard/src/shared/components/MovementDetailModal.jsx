import { useState, useEffect } from "react";
import {
  Copy,
  Package,
  Truck,
  UserCheck,
  Warehouse,
  Layers,
  Paperclip,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  Eye,
  ArrowDownLeft,
  ArrowUpRight,
  Wrench,
  FolderKanban,
} from "lucide-react";
import { Badge, GhostButton, Modal } from "../../components/ui/index.js";
import { httpClient } from "../../core/api/httpClient.js";
import { formatBDDateTime } from "../utils/dateUtils.js";
import { productsApi } from "../../features/products/api/productsApi.js";
import { ItemDetailsModal } from "../../features/products/components/ItemDetailsModal.jsx";

function isImageFile(url) {
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

export function MovementDetailModal({ movement, direction, onClose }) {
  const [copied, setCopied] = useState(false);
  const [variantsData, setVariantsData] = useState(null);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [variantDetail, setVariantDetail] = useState(null);
  const [loadingVariant, setLoadingVariant] = useState(false);
  const [showItemDetails, setShowItemDetails] = useState(false);

  const isInbound = direction === "in";

  // Fetch warehouse variants stock for inbound breakdown
  useEffect(() => {
    if (!movement?.product_id || !isInbound) {
      setVariantsData(null);
      return;
    }
    setLoadingVariants(true);
    httpClient
      .get(`/inventory/products/${movement.product_id}/variants-stock`, {
        params: { warehouse_id: movement.to_warehouse_id || undefined },
      })
      .then((res) => setVariantsData(res.data))
      .catch((err) => {
        console.error("Failed to load variants stock", err);
        setVariantsData(null);
      })
      .finally(() => setLoadingVariants(false));
  }, [movement?.product_id, movement?.to_warehouse_id, isInbound]);

  // Fetch full variant details (extra info, attachments, movement history)
  useEffect(() => {
    if (!movement?.product_id || !movement?.variant_id) {
      setVariantDetail(null);
      return;
    }
    setLoadingVariant(true);
    productsApi
      .getVariant(movement.product_id, movement.variant_id)
      .then((data) => {
        if (data) setVariantDetail(data);
      })
      .catch((err) => {
        console.warn("Could not fetch variant details", err);
      })
      .finally(() => setLoadingVariant(false));
  }, [movement?.product_id, movement?.variant_id]);

  if (!movement) return null;

  const warehouseName = isInbound
    ? movement.to_warehouse_name
    : movement.from_warehouse_name;
  const isProject = !isInbound && !!(movement.project_name || movement.project_id);
  const partyLabel = isInbound ? "Supplier" : (isProject ? "Project" : "Customer");
  const partyName = isInbound
    ? movement.supplier_name
    : (isProject
        ? `${movement.project_name || "Project"}${movement.project_code ? ` (${movement.project_code})` : ""}`
        : movement.customer_name);

  // Extract clean reference number (avoiding duplication)
  let reference = movement.reference_number;
  if (!reference && movement.reference_id) {
    reference = String(movement.reference_id);
  }
  if (!reference && movement.note && movement.note.includes("Ref:")) {
    const match = movement.note.match(/Ref:\s*([^|]+)/i);
    if (match) reference = match[1].trim();
  }
  if (!reference) reference = "—";

  // Clean note so reference text is not repeated inside the note
  let cleanNote = movement.note || "";
  if (cleanNote) {
    cleanNote = cleanNote
      .replace(/^Ref:\s*[^|]+\|\s*/i, "")
      .replace(/^Ref:\s*.*$/i, "")
      .trim();
  }

  const copySerial = async (sn) => {
    if (!sn || !navigator.clipboard) return;
    await navigator.clipboard.writeText(sn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter variants to show: variants with stock-in or current stock, or the movement's variant
  const displayVariants = variantsData?.variants
    ? variantsData.variants.filter(
        (v) =>
          v.total_stocked_in > 0 ||
          v.current_stock > 0 ||
          v.variant_id === movement.variant_id
      )
    : [];

  // Consolidate all attachments related to this movement / variant
  const allAttachments = [];
  const seenUrls = new Set();

  const addAtt = (att) => {
    if (!att || !att.url) return;
    const cleanUrl = String(att.url).trim();
    if (!cleanUrl || seenUrls.has(cleanUrl)) return;
    seenUrls.add(cleanUrl);
    allAttachments.push({
      ...att,
      url: cleanUrl,
      is_image: isImageFile(cleanUrl),
    });
  };

  // 1. Primary attachment on movement
  if (movement.attachment_url) {
    addAtt({
      id: `mov-${movement.id}`,
      url: movement.attachment_url,
      file_name: movement.attachment_url.split("/").pop(),
      source: isInbound ? "stock_in" : "stock_out",
      created_at: movement.created_at,
    });
  }

  // 2. Fallback from variant stock-in or stock-out details
  if (isInbound && variantDetail?.stock_in_details?.attachment_url) {
    addAtt({
      id: `var-in-${movement.variant_id}`,
      url: variantDetail.stock_in_details.attachment_url,
      file_name: variantDetail.stock_in_details.attachment_url.split("/").pop(),
      source: "stock_in",
      created_at: variantDetail.stock_in_details.date || movement.created_at,
    });
  } else if (!isInbound && variantDetail?.stock_out_details?.attachment_url) {
    addAtt({
      id: `var-out-${movement.variant_id}`,
      url: variantDetail.stock_out_details.attachment_url,
      file_name: variantDetail.stock_out_details.attachment_url.split("/").pop(),
      source: "stock_out",
      created_at: variantDetail.stock_out_details.date || movement.created_at,
    });
  }

  // 3. Any additional attachments from variantDetail
  if (Array.isArray(variantDetail?.attachments)) {
    variantDetail.attachments.forEach((att) => {
      addAtt(att);
    });
  }

  return (
    <>
      <Modal
        isOpen={!!movement}
        onClose={onClose}
        title={`${isInbound ? "Stock In" : "Stock Out"} Details #${movement.id}`}
        size="4xl"
        footer={
          <div className="flex justify-between items-center w-full">
            <div>
              {movement.variant_id && (
                <button
                  type="button"
                  onClick={() => setShowItemDetails(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition-colors cursor-pointer"
                >
                  <Eye size={13} className="text-blue-600" />
                  <span>View Full Item Details</span>
                </button>
              )}
            </div>
            <GhostButton onClick={onClose}>Close</GhostButton>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Key Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <div>
              <span className="mb-0.5 block text-slate-400">Date &amp; Time</span>
              <span className="font-medium text-slate-800">
                {formatBDDateTime(movement.created_at)}
              </span>
            </div>
            <div>
              <span className="mb-0.5 block text-slate-400">
                {isInbound ? "Destination Warehouse" : "Source Warehouse"}
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-800 truncate">
                <Warehouse size={13} className="shrink-0 text-slate-500" />
                {warehouseName ||
                  `WH #${(isInbound ? movement.to_warehouse_id : movement.from_warehouse_id) || "—"}`}
              </span>
            </div>
            <div>
              <span className="mb-0.5 block text-slate-400">
                {partyLabel}
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-800 truncate">
                {isInbound ? (
                  <Truck size={13} className="shrink-0 text-slate-500" />
                ) : isProject ? (
                  <FolderKanban size={13} className="shrink-0 text-indigo-600" />
                ) : (
                  <UserCheck size={13} className="shrink-0 text-slate-500" />
                )}
                {partyName || "—"}
              </span>
            </div>
            {isInbound && (movement.project_name || movement.project_id) && (
              <div>
                <span className="mb-0.5 block text-slate-400">Project Allocation</span>
                <span className="flex items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-300 truncate">
                  <FolderKanban size={13} className="shrink-0 text-indigo-600" />
                  {movement.project_name || `Project #${movement.project_id}`}
                  {movement.project_code ? ` (${movement.project_code})` : ""}
                </span>
              </div>
            )}
            <div>
              <span className="mb-0.5 block text-slate-400">Reference #</span>
              <span className="block truncate font-mono font-medium text-slate-800">
                {reference}
              </span>
            </div>
            <div>
              <span className="mb-0.5 block text-slate-400">
                {isInbound ? "Received By" : "Dispatched By"}
              </span>
              <span className="block truncate font-medium text-slate-800">
                {movement.created_by_name ||
                  (movement.created_by
                    ? `User #${movement.created_by}`
                    : "System")}
              </span>
            </div>
          </div>

          {/* Clean Note — only if actual note content exists */}
          {cleanNote && (
            <div className="rounded-md border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-700">
              <span className="mb-0.5 block font-semibold text-blue-900">
                Note / Remarks
              </span>
              {cleanNote}
            </div>
          )}

          {/* Attached Documents & Photos (AWS S3) */}
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Paperclip size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <span>Attached Documents &amp; Photos</span>
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-mono">
                      AWS S3
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {allAttachments.length > 0
                      ? `${allAttachments.length} document${allAttachments.length > 1 ? "s" : ""} or photo${allAttachments.length > 1 ? "s" : ""} attached`
                      : `Official challan, invoice slip, or inspection photo for this ${isInbound ? "stock in" : "stock out"}`}
                  </p>
                </div>
              </div>

              {allAttachments.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {allAttachments.length} attached
                </span>
              )}
            </div>

            {loadingVariant && allAttachments.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Checking for attached documents and photos...
              </div>
            ) : allAttachments.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
                <Paperclip size={20} className="mx-auto text-slate-400 mb-1" />
                <p className="text-xs text-slate-600 font-medium">
                  No documents or photos attached to this record
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Attachments uploaded during {isInbound ? "stock in" : "stock out"} or returns are stored on AWS S3 and will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {allAttachments.map((att, idx) => {
                  const badge = getSourceBadge(att.source);
                  const BadgeIcon = badge.icon;
                  const isImg = att.is_image;
                  const fileName = att.file_name || att.url.split("/").pop();

                  return (
                    <div
                      key={att.id || att.url || idx}
                      className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/60 p-3 hover:border-blue-300 transition-colors"
                    >
                      <div>
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.bg}`}
                          >
                            <BadgeIcon size={10} />
                            {badge.label}
                          </span>
                          <span className="text-[10px] font-mono font-medium text-slate-500">
                            {att.created_at
                              ? formatBDDateTime(att.created_at)
                              : "Attached"}
                          </span>
                        </div>

                        {/* Preview: Image or Document */}
                        {isImg ? (
                          <div className="mb-2">
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative block rounded-md border border-slate-200 overflow-hidden bg-white hover:border-blue-400 transition-colors"
                              title="Click to open full image in new tab"
                            >
                              <img
                                src={att.url}
                                alt={fileName}
                                className="w-full h-40 object-contain bg-slate-100 group-hover:scale-[1.02] transition-transform duration-200"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 bg-slate-900/85 text-white text-[11px] font-medium px-2.5 py-1 rounded shadow-md transition-opacity flex items-center gap-1.5">
                                  <ExternalLink size={12} /> Open Full Size
                                </span>
                              </div>
                            </a>
                          </div>
                        ) : (
                          <div className="mb-2 flex items-center gap-3 p-3 rounded-md border border-slate-200 bg-white">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <FileText size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className="text-xs font-semibold text-slate-800 truncate"
                                title={fileName}
                              >
                                {fileName}
                              </p>
                              <span className="text-[10px] font-mono text-slate-400 uppercase">
                                {fileName.split(".").pop() || "Document"}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* File Name */}
                        <p
                          className="text-xs font-medium text-slate-700 truncate"
                          title={fileName}
                        >
                          {fileName}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          AWS S3
                        </span>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors"
                        >
                          <span>{isImg ? "View Image" : "Open File"}</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Product Overview Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Package size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900">
                    {movement.product_name || `Product #${movement.product_id}`}
                  </span>
                  {movement.product_code && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                      {movement.product_code}
                    </span>
                  )}
                  <Badge
                    color={
                      movement.tracking_type === "serialized" ? "blue" : "emerald"
                    }
                  >
                    {movement.tracking_type === "serialized"
                      ? "Serialized"
                      : "Bulk"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Serial number if serialized for this specific movement */}
              {movement.serial_number && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded text-xs">
                  <span className="text-slate-500">SN:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {movement.serial_number}
                  </span>
                  <button
                    type="button"
                    onClick={() => copySerial(movement.serial_number)}
                    className="text-blue-600 hover:text-blue-800 font-medium ml-1 inline-flex items-center gap-0.5 cursor-pointer"
                    title="Copy serial number"
                  >
                    <Copy size={11} /> {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              )}

              {/* View Full Item Details Button */}
              {movement.variant_id && (
                <button
                  type="button"
                  onClick={() => setShowItemDetails(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition-colors cursor-pointer"
                  title="Open full item specifications, stock history & service tickets"
                >
                  <Eye size={12} className="text-blue-600" />
                  <span>Item Profile</span>
                </button>
              )}
            </div>
          </div>

          {/* Table Section: Variants Breakdown */}
          {isInbound ? (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <Layers size={14} className="text-emerald-600" />
                  Stocked-In Items
                </h4>
                {displayVariants.length > 0 && (
                  <span className="text-xs text-slate-400">
                    {displayVariants.length} item
                    {displayVariants.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Item Name</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Barcode</th>
                        <th className="py-2.5 px-3 text-right">Stocked-In Qty</th>
                        <th className="py-2.5 px-3 text-right">Current Available</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingVariants ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-6 text-center text-slate-400"
                          >
                            Loading items data...
                          </td>
                        </tr>
                      ) : displayVariants.length === 0 ? (
                        <tr>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">
                            {movement.variant_name ||
                              movement.product_name ||
                              "Standard"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {movement.variant_sku || "—"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">
                            {movement.barcode || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 font-mono">
                            +{movement.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-800 font-mono">
                            {movement.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge color="emerald">In Stock</Badge>
                          </td>
                        </tr>
                      ) : (
                        displayVariants.map((v) => {
                          const isCurrent = v.variant_id === movement.variant_id;
                          return (
                            <tr
                              key={v.variant_id || v.sku}
                              className={`hover:bg-slate-50/70 transition-colors ${
                                isCurrent ? "bg-emerald-50/50 font-medium" : ""
                              }`}
                            >
                              <td className="py-2.5 px-3 text-slate-800">
                                <div className="flex items-center gap-1.5">
                                  <span>{v.variant_name}</span>
                                  {isCurrent && (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">
                                      Current
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-700">
                                {v.sku}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-500">
                                {v.barcode}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 font-mono">
                                +{v.total_stocked_in ||
                                  (isCurrent ? movement.quantity : 0)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-slate-800 font-mono">
                                {v.current_stock}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {v.current_stock > 0 ? (
                                  <Badge color="emerald">In Stock</Badge>
                                ) : v.total_stocked_in > 0 ? (
                                  <Badge color="blue">Stocked In</Badge>
                                ) : (
                                  <Badge color="slate">No Stock</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : (
            /* Stock Out Dispatched Item Table */
            <section className="space-y-2">
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <Layers size={14} className="text-rose-600" />
                Dispatched Item Details
              </h4>
              <div className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Item / Product</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Barcode</th>
                        <th className="py-2.5 px-3">Serial / Unit ID</th>
                        <th className="py-2.5 px-3">Tracking</th>
                        <th className="py-2.5 px-3 text-right">Dispatched Qty</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2.5 px-3 text-slate-800 font-medium">
                          <div>
                            {movement.variant_name ||
                              movement.product_name ||
                              "Standard"}
                          </div>
                          {movement.product_code && (
                            <div className="text-[10px] font-mono text-slate-400">
                              {movement.product_code}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {movement.variant_sku || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {movement.barcode || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-800">
                          {movement.serial_number ? (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-semibold text-[11px]">
                              {movement.serial_number}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            color={
                              movement.tracking_type === "serialized"
                                ? "blue"
                                : "emerald"
                            }
                          >
                            {movement.tracking_type === "serialized"
                              ? "Serialized"
                              : "Bulk"}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600 font-mono text-sm">
                          -{movement.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge color="orange">Dispatched</Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      </Modal>

      {/* Embedded Full Item Profile Modal */}
      {showItemDetails && (
        <ItemDetailsModal
          isOpen={showItemDetails}
          onClose={() => setShowItemDetails(false)}
          variant={
            variantDetail || {
              id: movement.variant_id,
              product_id: movement.product_id,
              name: movement.variant_name,
              sku: movement.variant_sku,
            }
          }
          product={{
            id: movement.product_id,
            name: movement.product_name,
            product_code: movement.product_code,
            tracking_type: movement.tracking_type,
          }}
        />
      )}
    </>
  );
}
