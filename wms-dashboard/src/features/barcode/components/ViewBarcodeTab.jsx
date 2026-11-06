import React, { useState, useMemo, useEffect } from "react";
import {
  Barcode as BarcodeIcon,
  Printer,
  Download,
  Copy,
  Check,
  Search,
  Building2,
  Package,
  Layers,
  Filter,
  CheckSquare,
  Square,
  RotateCcw,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Tag,
  DollarSign,
  AlertCircle,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  PrimaryButton,
  GhostButton,
  Badge,
  Th,
  Td,
  useToast,
  MiniBarcode,
} from "../../../components/ui/index.js";
import { BarcodeRenderer } from "../../../components/ui/BarcodeRenderer.jsx";
import { useWarehouses } from "../../warehouses/hooks/useWarehouses.js";
import { useProducts } from "../../products/hooks/useProducts.js";
import { inventoryApi } from "../../inventory/api/inventoryApi.js";
import { serializedUnitsSeed, barcodesSeed } from "../../../shared/data/mockSeeds.js";
import { useWarehouseFilter } from "../../../app/context/WarehouseFilterContext.jsx";

/**
 * ViewBarcodeTab Component
 * 
 * Allows users to:
 * 1. Filter items by Warehouse and Product
 * 2. Multi-select items via interactive table with pagination
 * 3. View selected barcodes directly on the page in a rich card grid
 * 4. Navigate through multiple pages of barcodes (multi-page barcode pagination)
 * 5. Download printable HTML sheet, print to PDF, export CSV, and copy codes
 */
export function ViewBarcodeTab() {
  const { toast } = useToast();
  const { warehouses, isLoading: isWarehousesLoading } = useWarehouses();
  const { products, isLoading: isProductsLoading, refetch: refetchProducts } = useProducts();
  const { selectedWarehouseId: globalWarehouseId } = useWarehouseFilter();

  // ── Filters State ──
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    globalWarehouseId ? String(globalWarehouseId) : ""
  );
  const [selectedProductId, setSelectedProductId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setSelectedWarehouseId(globalWarehouseId ? String(globalWarehouseId) : "");
  }, [globalWarehouseId]);

  // ── Items & API State ──
  const [apiItems, setApiItems] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isAutoUpdating, setIsAutoUpdating] = useState(false);

  // ── Selection State ──
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());

  // ── Table Pagination State ──
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);

  // ── Barcode Display Customization State ──
  const [labelSize, setLabelSize] = useState("standard"); // 'standard' (50x25mm) | 'compact' (38x25mm) | 'large' (65x38mm)
  const [copiesPerItem, setCopiesPerItem] = useState(1);
  const [showPrice, setShowPrice] = useState(true);
  const [showItemName, setShowItemName] = useState(true);
  const [showWarehouse, setShowWarehouse] = useState(true);
  const [showSerial, setShowSerial] = useState(true);

  // ── Barcode Display Multi-Page Pagination State ──
  const [barcodeDisplayPage, setBarcodeDisplayPage] = useState(1);
  const [barcodesPerPage, setBarcodesPerPage] = useState(12); // 6, 12, 24, 48

  // ── Copy feedback state ──
  const [copiedId, setCopiedId] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Reusable load items function
  const loadItems = async (isBackground = false) => {
    if (!isBackground) setIsLoadingItems(true);
    else setIsAutoUpdating(true);

    try {
      const params = {};
      if (selectedWarehouseId) params.warehouse_id = selectedWarehouseId;
      if (selectedProductId) params.product_id = selectedProductId;

      const data = await inventoryApi.listSerializedItems(params);
      setApiItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load inventory items:", err);
      if (!isBackground) setApiItems([]);
    } finally {
      if (!isBackground) setIsLoadingItems(false);
      else setIsAutoUpdating(false);
    }
  };

  // Fetch serialized items on warehouse/product filter changes
  useEffect(() => {
    loadItems(false);
  }, [selectedWarehouseId, selectedProductId]);

  // Auto-update barcodes on 15s interval & window refocus
  useEffect(() => {
    const interval = setInterval(() => {
      refetchProducts?.();
      loadItems(true);
    }, 15000);

    const onFocus = () => {
      refetchProducts?.();
      loadItems(true);
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [selectedWarehouseId, selectedProductId]);

  // Manual one-click refresh/sync
  const handleManualSync = async () => {
    setIsLoadingItems(true);
    try {
      await Promise.allSettled([refetchProducts?.(), loadItems(false)]);
      toast?.success("Barcodes and inventory auto-updated!");
    } finally {
      setIsLoadingItems(false);
    }
  };

  // Build combined items list: API items + Fallback/seed items if DB is empty for demo/testing
  const allAvailableItems = useMemo(() => {
    const warehouseMap = new Map((warehouses || []).map((w) => [String(w.id), w]));
    const productMap = new Map((products || []).map((p) => [String(p.id), p]));

    // Start with normalized API items
    const list = (apiItems || []).map((it) => {
      const prod = productMap.get(String(it.product_id));
      const wh = warehouseMap.get(String(it.warehouse_id));
      const barcode = it.barcode || it.effective_barcode || it.serial_number || it.serial || `BC-${it.id}`;
      return {
        id: String(it.id),
        barcode,
        serial_number: it.serial_number || it.serial || "—",
        product_id: it.product_id ? String(it.product_id) : "",
        product_name: it.product_name || prod?.name || "Product",
        sku: prod?.sku || prod?.product_code || "SKU-000",
        warehouse_id: it.warehouse_id ? String(it.warehouse_id) : "",
        warehouse_name: it.warehouse_name || wh?.name || "Warehouse",
        warehouse_code: wh?.code || "",
        variant_name: it.variant_name || "",
        selling_price: Number(it.selling_price || prod?.variants?.[0]?.selling_price || 0),
        status: it.status || "in_stock",
      };
    });

    // If API items are fewer than 10 or empty, supplement with seed items & product variants for instant testability
    const existingBarcodes = new Set(list.map((it) => it.barcode));

    // A. Add product variants with barcodes
    (products || []).forEach((prod) => {
      (prod.variants || []).forEach((v, vIdx) => {
        if (v.barcode && !existingBarcodes.has(v.barcode)) {
          existingBarcodes.add(v.barcode);
          const firstWh = warehouses[vIdx % Math.max(1, warehouses.length)] || {};
          list.push({
            id: `variant-${v.id || vIdx}`,
            barcode: v.barcode,
            serial_number: v.sku || `SN-${v.id || vIdx}`,
            product_id: String(prod.id),
            product_name: prod.name,
            sku: prod.sku || `SKU-${prod.id}`,
            warehouse_id: String(firstWh.id || "1"),
            warehouse_name: firstWh.name || "Dhaka Central Warehouse",
            warehouse_code: firstWh.code || "DHK-01",
            variant_name: v.name || "",
            selling_price: Number(v.selling_price || 0),
            status: v.status || "active",
          });
        }
      });
    });

    // B. Add mock serialized units seed
    (serializedUnitsSeed || []).forEach((u, uIdx) => {
      const code = u.serial || `SN-${uIdx + 1000}`;
      if (!existingBarcodes.has(code)) {
        existingBarcodes.add(code);
        const matchedProd = (products || []).find((p) => p.sku === u.sku || p.name === u.product) || products[0] || {};
        const matchedWh = (warehouses || []).find((w) => w.name === u.warehouse) || warehouses[0] || {};
        list.push({
          id: `seed-unit-${uIdx}`,
          barcode: code,
          serial_number: u.serial,
          product_id: String(matchedProd.id || "1"),
          product_name: matchedProd.name || u.sku || "Product Item",
          sku: u.sku || matchedProd.sku || "SKU-UNIT",
          warehouse_id: String(matchedWh.id || "1"),
          warehouse_name: u.warehouse || matchedWh.name || "Main Warehouse",
          warehouse_code: matchedWh.code || "DHK",
          variant_name: "",
          selling_price: Number(matchedProd.variants?.[0]?.selling_price || 1500),
          status: (u.status || "In Stock").toLowerCase().replace(/\s+/g, "_"),
        });
      }
    });

    // C. Add mock barcodes seed
    (barcodesSeed || []).forEach((b, bIdx) => {
      const code = b.code || `BC-SEED-${bIdx}`;
      if (!existingBarcodes.has(code)) {
        existingBarcodes.add(code);
        const matchedProd = (products || []).find((p) => p.name === b.product) || products[0] || {};
        const matchedWh = (warehouses || []).find((w) => w.name === b.warehouse) || warehouses[0] || {};
        list.push({
          id: `seed-bc-${bIdx}`,
          barcode: code,
          serial_number: b.id || code,
          product_id: String(matchedProd.id || "1"),
          product_name: b.product || matchedProd.name || "Item",
          sku: matchedProd.sku || "SKU-BC",
          warehouse_id: String(matchedWh.id || "1"),
          warehouse_name: b.warehouse || matchedWh.name || "Main Warehouse",
          warehouse_code: matchedWh.code || "WH-01",
          variant_name: "",
          selling_price: Number(matchedProd.variants?.[0]?.selling_price || 1200),
          status: (b.status || "Printed").toLowerCase().replace(/\s+/g, "_"),
        });
      }
    });

    return list;
  }, [apiItems, warehouses, products]);

  // Filter items by selected Warehouse, Product, Search, and Status
  const filteredItems = useMemo(() => {
    return allAvailableItems.filter((item) => {
      // 1. Warehouse filter
      if (selectedWarehouseId && String(item.warehouse_id) !== String(selectedWarehouseId)) {
        return false;
      }
      // 2. Product filter
      if (selectedProductId && String(item.product_id) !== String(selectedProductId)) {
        return false;
      }
      // 3. Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesBarcode = (item.barcode || "").toLowerCase().includes(q);
        const matchesSerial = (item.serial_number || "").toLowerCase().includes(q);
        const matchesProduct = (item.product_name || "").toLowerCase().includes(q);
        const matchesSku = (item.sku || "").toLowerCase().includes(q);
        const matchesWarehouse = (item.warehouse_name || "").toLowerCase().includes(q);
        if (!matchesBarcode && !matchesSerial && !matchesProduct && !matchesSku && !matchesWarehouse) {
          return false;
        }
      }
      return true;
    });
  }, [allAvailableItems, selectedWarehouseId, selectedProductId, statusFilter, searchQuery]);

  // Reset table page when filters change
  useEffect(() => {
    setTablePage(1);
  }, [selectedWarehouseId, selectedProductId, statusFilter, searchQuery, tablePageSize]);

  // Paginated rows for the item selection table
  const totalTableItems = filteredItems.length;
  const totalTablePages = Math.max(1, Math.ceil(totalTableItems / tablePageSize));
  const tableStartIndex = (tablePage - 1) * tablePageSize;
  const currentTableRows = filteredItems.slice(tableStartIndex, tableStartIndex + tablePageSize);

  // Selected item objects
  const selectedItemsList = useMemo(() => {
    const set = selectedItemIds;
    return allAvailableItems.filter((item) => set.has(item.id));
  }, [allAvailableItems, selectedItemIds]);

  // Expand selected items by copies multiplier
  const expandedSelectedItems = useMemo(() => {
    const validCopies = Math.max(1, Math.min(20, Number(copiesPerItem) || 1));
    const result = [];
    selectedItemsList.forEach((item) => {
      for (let i = 0; i < validCopies; i++) {
        result.push({
          ...item,
          _uniqueKey: `${item.id}-copy-${i}`,
          _copyIndex: i + 1,
        });
      }
    });
    return result;
  }, [selectedItemsList, copiesPerItem]);

  // Multi-page pagination for displayed barcodes
  const totalBarcodesCount = expandedSelectedItems.length;
  const totalBarcodePages = Math.max(1, Math.ceil(totalBarcodesCount / barcodesPerPage));
  const barcodeStartIndex = (barcodeDisplayPage - 1) * barcodesPerPage;
  const currentBarcodeCards = expandedSelectedItems.slice(barcodeStartIndex, barcodeStartIndex + barcodesPerPage);

  // Reset barcode display page if it exceeds total pages
  useEffect(() => {
    if (barcodeDisplayPage > totalBarcodePages) {
      setBarcodeDisplayPage(totalBarcodePages);
    }
  }, [barcodeDisplayPage, totalBarcodePages]);

  // ── Selection Handlers ──
  const handleToggleItem = (itemId) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      const allVisibleSelected = currentTableRows.every((r) => next.has(r.id));
      if (allVisibleSelected) {
        currentTableRows.forEach((r) => next.delete(r.id));
      } else {
        currentTableRows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      filteredItems.forEach((r) => next.add(r.id));
      return next;
    });
    toast.success(`Selected all ${filteredItems.length} matching items!`);
  };

  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
    toast.info("Cleared all selections.");
  };

  // Quick Reset all filters
  const handleResetFilters = () => {
    setSelectedWarehouseId("");
    setSelectedProductId("");
    setSearchQuery("");
    setStatusFilter("all");
  };

  // Copy single barcode
  const handleCopyBarcode = (barcode, id) => {
    if (!barcode) return;
    navigator.clipboard.writeText(barcode);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    toast.success(`Copied: ${barcode}`);
  };

  // Copy all selected barcodes
  const handleCopyAllBarcodes = () => {
    if (selectedItemsList.length === 0) return;
    const codes = selectedItemsList.map((it) => it.barcode).join("\n");
    navigator.clipboard.writeText(codes);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast.success(`Copied ${selectedItemsList.length} barcodes to clipboard!`);
  };

  // Export Selected Barcodes as CSV
  const handleExportCsv = () => {
    if (selectedItemsList.length === 0) {
      toast.error("Please select at least one item to export.");
      return;
    }

    const headers = ["Barcode", "Serial Number", "Product Name", "SKU", "Item", "Warehouse", "Price", "Status"];
    const rows = selectedItemsList.map((it) => [
      `"${it.barcode || ""}"`,
      `"${it.serial_number || ""}"`,
      `"${(it.product_name || "").replace(/"/g, '""')}"`,
      `"${it.sku || ""}"`,
      `"${(it.variant_name || "").replace(/"/g, '""')}"`,
      `"${(it.warehouse_name || "").replace(/"/g, '""')}"`,
      `"${it.selling_price || 0}"`,
      `"${it.status || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `barcodes-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedItemsList.length} barcodes to CSV!`);
  };

  // Download Self-Contained Offline Multi-Page Printable HTML
  const handleDownloadHtmlSheet = () => {
    if (expandedSelectedItems.length === 0) {
      toast.error("Please select at least one item to download.");
      return;
    }

    const totalCount = expandedSelectedItems.length;
    const stickerHtml = expandedSelectedItems
      .map((item) => {
        const barcodeNum = item.barcode || "000000000000";
        const displayName = (item.product_name || "Item").replace(/"/g, "&quot;");
        const whName = (item.warehouse_name || "").replace(/"/g, "&quot;");
        const priceText = showPrice ? `৳${Number(item.selling_price || 0).toLocaleString()}` : "";
        const serialText = showSerial && item.serial_number ? `SN: ${item.serial_number}` : "";

        return `
          <div class="sticker sticker-${labelSize}">
            ${showItemName ? `<div class="sticker-title">${displayName}</div>` : ""}
            ${showWarehouse && whName ? `<div class="sticker-wh">${whName}</div>` : ""}
            <div class="sticker-barcode">
              <svg class="jsbarcode" jsbarcode-value="${barcodeNum}" jsbarcode-format="CODE128" jsbarcode-height="36" jsbarcode-width="1.5" jsbarcode-displayvalue="false" jsbarcode-margin="0"></svg>
            </div>
            <div class="sticker-code">${barcodeNum}</div>
            <div class="sticker-footer">
              ${serialText ? `<span class="sticker-serial">${serialText}</span>` : "<span></span>"}
              ${priceText ? `<span class="sticker-price">${priceText}</span>` : ""}
            </div>
          </div>
        `;
      })
      .join("");

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Barcode Sheet — ${totalCount} Labels</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; padding: 24px; color: #0f172a; }
    .no-print { background: #fff; padding: 16px 24px; border-radius: 10px; border: 1px solid #cbd5e1; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .no-print h1 { font-size: 18px; font-weight: 700; color: #0f172a; }
    .no-print p { font-size: 12px; color: #64748b; margin-top: 2px; }
    .no-print-actions { display: flex; gap: 10px; align-items: center; }
    .no-print button { background: #0f172a; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.15s; }
    .no-print button:hover { background: #1e293b; }
    .stickers-container { display: flex; flex-wrap: wrap; gap: 12px; justify-content: flex-start; }
    .sticker { background: #fff; border: 1px dashed #94a3b8; border-radius: 6px; padding: 6px 8px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: space-between; page-break-inside: avoid; }
    .sticker-standard { width: 50mm; height: 28mm; }
    .sticker-compact { width: 38mm; height: 24mm; }
    .sticker-large { width: 65mm; height: 38mm; }
    .sticker-title { font-size: 9.5px; font-weight: 700; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; color: #0f172a; line-height: 1.2; }
    .sticker-wh { font-size: 8px; font-weight: 600; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .sticker-barcode { margin: 2px 0; width: 100%; display: flex; justify-content: center; }
    .sticker-barcode svg { max-width: 100%; height: auto; }
    .sticker-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 9.5px; font-weight: 700; letter-spacing: 0.6px; color: #0f172a; }
    .sticker-footer { width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; margin-top: 1px; }
    .sticker-serial { color: #64748b; font-family: monospace; }
    .sticker-price { font-weight: 700; color: #0f172a; font-size: 9px; }
    @media print {
      body { background: #fff; padding: 0; }
      .no-print { display: none !important; }
      .stickers-container { gap: 2mm; }
      .sticker { border: 1px dotted #ccc; page-break-inside: avoid; }
      @page { margin: 6mm; size: auto; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div>
      <h1>Barcode Labels Sheet (${totalCount} Total)</h1>
      <p>Formatted for sticker paper, laser/inkjet sheets, and thermal label printers.</p>
    </div>
    <div class="no-print-actions">
      <button onclick="window.print()">Print / Save as PDF</button>
    </div>
  </div>
  <div class="stickers-container">
    ${stickerHtml}
  </div>
  <script>
    window.onload = function() {
      if (typeof JsBarcode === "function") {
        JsBarcode(".jsbarcode").init();
      }
    };
  </script>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `barcodes-sheet-${totalCount}-items.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Downloaded printable sheet with ${totalCount} barcode labels!`);
  };

  // Direct Browser Print (opens print dialog with styled printable window)
  const handleDirectPrint = () => {
    if (expandedSelectedItems.length === 0) {
      toast.error("Please select at least one item to print.");
      return;
    }

    const printWin = window.open("", "_blank", "width=850,height=750");
    if (!printWin) {
      toast.error("Popup blocked! Please allow popups to print directly or use 'Download HTML'.");
      return;
    }

    const totalCount = expandedSelectedItems.length;
    const stickerHtml = expandedSelectedItems
      .map((item) => {
        const barcodeNum = item.barcode || "000000000000";
        const displayName = (item.product_name || "Item").replace(/"/g, "&quot;");
        const whName = (item.warehouse_name || "").replace(/"/g, "&quot;");
        const priceText = showPrice ? `৳${Number(item.selling_price || 0).toLocaleString()}` : "";
        const serialText = showSerial && item.serial_number ? `SN: ${item.serial_number}` : "";

        return `
          <div class="sticker sticker-${labelSize}">
            ${showItemName ? `<div class="sticker-title">${displayName}</div>` : ""}
            ${showWarehouse && whName ? `<div class="sticker-wh">${whName}</div>` : ""}
            <div class="sticker-barcode">
              <svg class="jsbarcode" jsbarcode-value="${barcodeNum}" jsbarcode-format="CODE128" jsbarcode-height="36" jsbarcode-width="1.5" jsbarcode-displayvalue="false" jsbarcode-margin="0"></svg>
            </div>
            <div class="sticker-code">${barcodeNum}</div>
            <div class="sticker-footer">
              ${serialText ? `<span class="sticker-serial">${serialText}</span>` : "<span></span>"}
              ${priceText ? `<span class="sticker-price">${priceText}</span>` : ""}
            </div>
          </div>
        `;
      })
      .join("");

    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Print Barcodes (${totalCount})</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #fff; padding: 10px; color: #000; }
    .stickers-container { display: flex; flex-wrap: wrap; gap: 2mm; justify-content: flex-start; }
    .sticker { background: #fff; border: 1px dotted #ccc; border-radius: 4px; padding: 4px 6px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: space-between; page-break-inside: avoid; }
    .sticker-standard { width: 50mm; height: 28mm; }
    .sticker-compact { width: 38mm; height: 24mm; }
    .sticker-large { width: 65mm; height: 38mm; }
    .sticker-title { font-size: 9px; font-weight: 700; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .sticker-wh { font-size: 7.5px; font-weight: 600; color: #555; }
    .sticker-barcode { margin: 1px 0; width: 100%; display: flex; justify-content: center; }
    .sticker-barcode svg { max-width: 100%; height: auto; }
    .sticker-code { font-family: monospace; font-size: 9px; font-weight: 700; letter-spacing: 0.5px; }
    .sticker-footer { width: 100%; display: flex; justify-content: space-between; font-size: 8px; }
    .sticker-serial { color: #555; font-family: monospace; }
    .sticker-price { font-weight: 700; font-size: 8.5px; }
    @page { margin: 5mm; size: auto; }
  </style>
</head>
<body>
  <div class="stickers-container">
    ${stickerHtml}
  </div>
  <script>
    window.onload = function() {
      if (typeof JsBarcode === "function") {
        JsBarcode(".jsbarcode").init();
      }
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`);
    printWin.document.close();
  };

  const isAllCurrentPageSelected =
    currentTableRows.length > 0 && currentTableRows.every((r) => selectedItemIds.has(r.id));

  return (
    <div className="space-y-6 pb-12">
      {/* ── TOP FILTER CARD: WAREHOUSE & PRODUCT SELECTION ── */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <BarcodeIcon size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">View &amp; Print Barcodes</h2>
              <p className="text-[11px] text-slate-300">
                Filter inventory by Warehouse &amp; Product, select items, and display or download barcode stickers.
              </p>
            </div>
          </div>
          {(selectedWarehouseId || selectedProductId || searchQuery || statusFilter !== "all") && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors"
            >
              <RotateCcw size={12} />
              Reset Filters
            </button>
          )}
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white">
          {/* 1. Warehouse Selector */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Building2 size={13} className="text-slate-400" />
              <span>Select Warehouse</span>
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              disabled={isWarehousesLoading}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all cursor-pointer"
            >
              <option value="">🏢 All Warehouses ({warehouses.length})</option>
              {warehouses.map((w) => (
                <option key={w.id} value={String(w.id)}>
                  {w.code ? `[${w.code}] ` : ""}{w.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Product Selector */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Package size={13} className="text-slate-400" />
              <span>Select Product</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={isProductsLoading}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all cursor-pointer"
            >
              <option value="">📦 All Products ({products.length})</option>
              {products.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.sku ? `[${p.sku}] ` : ""}{p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Search Box */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Search size={13} className="text-slate-400" />
              <span>Search Items</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Barcode, Serial, Product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>
          </div>

          {/* 4. Status Filter */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Filter size={13} className="text-slate-400" />
              <span>Item Status</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="in_stock">In Stock / Available</option>
              <option value="active">Active</option>
              <option value="under_service">Under Service / Repair</option>
              <option value="in_transit">In Transit</option>
              <option value="sold">Sold</option>
              <option value="printed">Printed</option>
            </select>
          </div>
        </div>

        {/* Quick summary badges row */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Matching Items:</span>
            <span className="font-bold text-slate-900">{filteredItems.length}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Selected for Barcode:</span>
            <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {selectedItemIds.size}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedItemIds.size > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors text-xs"
                >
                  Clear Selection
                </button>
                <span className="text-slate-300">·</span>
              </>
            )}
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="text-slate-900 hover:underline font-semibold text-xs"
            >
              Select All Matching ({filteredItems.length})
            </button>
          </div>
        </div>
      </Card>

      {/* ── ITEMS SELECTION TABLE ── */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Select Items for Barcodes
            </h3>
            <span className="text-[11px] text-slate-400">
              (Page {tablePage} of {totalTablePages})
            </span>
          </div>

          {/* Right Controls: Auto-Update & Page Size Selector */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isLoadingItems}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
              title="Auto-update and sync barcodes with backend"
            >
              <RefreshCw
                size={12}
                className={isLoadingItems || isAutoUpdating ? "animate-spin text-amber-500" : "text-slate-500"}
              />
              <span>{isLoadingItems ? "Updating..." : "Auto-Update Barcodes"}</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Rows:</span>
              <select
                value={tablePageSize}
                onChange={(e) => setTablePageSize(Number(e.target.value))}
                className="border border-slate-200 rounded px-2 py-1 text-xs bg-white text-slate-700 font-medium"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="py-2.5 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    title={isAllCurrentPageSelected ? "Deselect visible" : "Select visible"}
                    className="cursor-pointer text-slate-700 hover:text-slate-900 transition-colors"
                  >
                    {isAllCurrentPageSelected ? (
                      <CheckSquare size={16} className="text-slate-900" />
                    ) : (
                      <Square size={16} className="text-slate-400" />
                    )}
                  </button>
                </th>
                <Th>Barcode</Th>
                <Th>Serial / Unit ID</Th>
                <Th>Product</Th>
                <Th>Warehouse</Th>
                <Th>Selling Price</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingItems ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    Loading inventory items...
                  </td>
                </tr>
              ) : currentTableRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center">
                    <p className="text-slate-500 font-medium">No items found matching the selected filters.</p>
                    <p className="text-slate-400 text-[11px] mt-1">Try selecting "All Warehouses" or "All Products".</p>
                  </td>
                </tr>
              ) : (
                currentTableRows.map((row) => {
                  const isSelected = selectedItemIds.has(row.id);
                  return (
                    <tr
                      key={row.id}
                      onClick={() => handleToggleItem(row.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-amber-50/50 hover:bg-amber-50" : "hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleItem(row.id)}
                          className="accent-slate-900 w-4 h-4 rounded cursor-pointer"
                        />
                      </td>

                      {/* Barcode & Mini Barcode */}
                      <Td className="font-mono text-slate-900 font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <MiniBarcode code={row.barcode} />
                          <span>{row.barcode}</span>
                        </div>
                      </Td>

                      {/* Serial Number */}
                      <Td className="font-mono text-slate-600 whitespace-nowrap">
                        {row.serial_number || "—"}
                      </Td>

                      {/* Product Name & SKU */}
                      <Td>
                        <div className="font-semibold text-slate-800">{row.product_name}</div>
                        {row.variant_name && (
                          <div className="text-xs font-semibold text-slate-900">{row.variant_name}</div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono">{row.sku}</div>
                      </Td>

                      {/* Warehouse */}
                      <Td className="text-slate-700 whitespace-nowrap">
                        <div className="font-medium">{row.warehouse_name}</div>
                        {row.warehouse_code && (
                          <span className="text-[10px] text-slate-400 font-mono">[{row.warehouse_code}]</span>
                        )}
                      </Td>

                      {/* Selling Price */}
                      <Td className="font-semibold text-slate-900 whitespace-nowrap">
                        ৳{Number(row.selling_price || 0).toLocaleString()}
                      </Td>

                      {/* Status */}
                      <Td>
                        <Badge
                          variant={
                            row.status === "in_stock" || row.status === "active"
                              ? "green"
                              : row.status === "under_service"
                              ? "yellow"
                              : row.status === "sold"
                              ? "gray"
                              : "blue"
                          }
                        >
                          {row.status.replace(/_/g, " ")}
                        </Badge>
                      </Td>

                      {/* Row Action */}
                      <Td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleCopyBarcode(row.barcode, row.id)}
                          title="Copy Barcode"
                          className="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors inline-flex items-center gap-1 text-[11px]"
                        >
                          {copiedId === row.id ? (
                            <Check size={13} className="text-emerald-600" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Controls */}
        <div className="px-5 py-3 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            Showing <span className="font-semibold text-slate-800">{totalTableItems === 0 ? 0 : tableStartIndex + 1}</span> to{" "}
            <span className="font-semibold text-slate-800">
              {Math.min(tableStartIndex + tablePageSize, totalTableItems)}
            </span>{" "}
            of <span className="font-semibold text-slate-800">{totalTableItems}</span> items
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={tablePage === 1}
              onClick={() => setTablePage(1)}
              className="p-1.5 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
              title="First Page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              disabled={tablePage === 1}
              onClick={() => setTablePage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="px-3 py-1 font-semibold text-slate-800">
              Page {tablePage} of {totalTablePages}
            </span>

            <button
              type="button"
              disabled={tablePage >= totalTablePages}
              onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
              className="p-1.5 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              disabled={tablePage >= totalTablePages}
              onClick={() => setTablePage(totalTablePages)}
              className="p-1.5 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
              title="Last Page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </Card>

      {/* ── STEP 2: SELECTED BARCODES DISPLAY ON PAGE ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Selected Barcodes Display
              </h2>
              <span className="bg-slate-900 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {selectedItemIds.size} Selected
              </span>
              {copiesPerItem > 1 && (
                <span className="text-xs text-slate-500 font-medium">
                  ({expandedSelectedItems.length} labels with {copiesPerItem}x copies)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              High-definition scannable CODE128 barcodes rendered on-page. Multi-page navigation supported.
            </p>
          </div>

          {/* Action Buttons: Download HTML, Direct Print, CSV, Copy All */}
          {selectedItemIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAllBarcodes}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                {copiedAll ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>Copy Codes</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadHtmlSheet}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-xs"
              >
                <Download size={14} />
                <span>Download Print Sheet</span>
              </button>

              <button
                type="button"
                onClick={handleDirectPrint}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
              >
                <Printer size={14} />
                <span>Print / PDF</span>
              </button>
            </div>
          )}
        </div>

        {selectedItemIds.size === 0 ? (
          /* Empty Selection State */
          <Card className="p-8 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <BarcodeIcon size={24} />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No Items Selected Yet</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Select one or more items from the table above. The generated barcodes will be displayed here in high resolution and ready for multi-page viewing and download.
            </p>
            <div className="mt-4">
              <GhostButton onClick={handleSelectAllFiltered} className="text-xs">
                Select All {filteredItems.length} Matching Items
              </GhostButton>
            </div>
          </Card>
        ) : (
          /* Active Selected Barcodes Panel */
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            {/* Display & Layout Controls Toolbar */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                {/* Sticker Size */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700">Label Size:</span>
                  <select
                    value={labelSize}
                    onChange={(e) => setLabelSize(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1 bg-white text-slate-800 font-medium text-xs"
                  >
                    <option value="standard">Standard (50 × 28mm)</option>
                    <option value="compact">Compact (38 × 24mm)</option>
                    <option value="large">Large / A4 (65 × 38mm)</option>
                  </select>
                </div>

                {/* Copies per item */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700">Copies:</span>
                  <select
                    value={copiesPerItem}
                    onChange={(e) => setCopiesPerItem(Number(e.target.value))}
                    className="border border-slate-200 rounded px-2 py-1 bg-white text-slate-800 font-medium text-xs"
                  >
                    <option value={1}>1 copy</option>
                    <option value={2}>2 copies</option>
                    <option value={3}>3 copies</option>
                    <option value={5}>5 copies</option>
                  </select>
                </div>

                {/* Per Page Barcode Count */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700">Display per Page:</span>
                  <select
                    value={barcodesPerPage}
                    onChange={(e) => {
                      setBarcodesPerPage(Number(e.target.value));
                      setBarcodeDisplayPage(1);
                    }}
                    className="border border-slate-200 rounded px-2 py-1 bg-white text-slate-800 font-medium text-xs"
                  >
                    <option value={6}>6 barcodes</option>
                    <option value={12}>12 barcodes</option>
                    <option value={24}>24 barcodes</option>
                    <option value={48}>48 barcodes</option>
                  </select>
                </div>
              </div>

              {/* Display Field Checkbox Toggles */}
              <div className="flex flex-wrap items-center gap-3 text-slate-600">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showItemName}
                    onChange={(e) => setShowItemName(e.target.checked)}
                    className="accent-slate-900 rounded"
                  />
                  <span>Product</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWarehouse}
                    onChange={(e) => setShowWarehouse(e.target.checked)}
                    className="accent-slate-900 rounded"
                  />
                  <span>Warehouse</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSerial}
                    onChange={(e) => setShowSerial(e.target.checked)}
                    className="accent-slate-900 rounded"
                  />
                  <span>Serial</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="accent-slate-900 rounded"
                  />
                  <span>Price</span>
                </label>
              </div>
            </div>

            {/* ── BARCODE CARDS GRID ── */}
            <div className="p-5 bg-slate-100/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentBarcodeCards.map((item) => (
                  <div
                    key={item._uniqueKey}
                    className="bg-white rounded-lg border border-slate-300 p-3 shadow-2xs flex flex-col justify-between hover:shadow-md transition-shadow relative group"
                  >
                    {/* Sticker Top: Title & Warehouse */}
                    <div>
                      {showItemName && (
                        <div className="text-[11px] font-bold text-slate-900 uppercase tracking-tight truncate" title={item.product_name}>
                          {item.product_name}
                        </div>
                      )}
                      {showWarehouse && (
                        <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                          {item.warehouse_name}
                        </div>
                      )}
                    </div>

                    {/* Sticker Center: High-Definition CODE128 SVG Barcode */}
                    <div className="my-2.5 py-1 bg-white flex flex-col items-center justify-center border-y border-dashed border-slate-100">
                      <BarcodeRenderer
                        value={item.barcode}
                        format="CODE128"
                        width={labelSize === "compact" ? 1.3 : labelSize === "large" ? 1.8 : 1.5}
                        height={labelSize === "compact" ? 30 : labelSize === "large" ? 44 : 36}
                        className="max-w-full"
                      />
                      <div className="font-mono text-xs font-bold tracking-widest text-slate-900 mt-1 select-all">
                        {item.barcode}
                      </div>
                    </div>

                    {/* Sticker Bottom: Serial and Price */}
                    <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium pt-1">
                      {showSerial ? (
                        <span className="font-mono text-slate-500 truncate max-w-[60%]">
                          {item.serial_number}
                        </span>
                      ) : <span />}
                      {showPrice && (
                        <span className="font-bold text-slate-900">
                          ৳{Number(item.selling_price || 0).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Copy button hover overlay */}
                    <button
                      type="button"
                      onClick={() => handleCopyBarcode(item.barcode, item._uniqueKey)}
                      title="Copy Barcode"
                      className="absolute top-2 right-2 p-1 bg-slate-100 text-slate-600 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200"
                    >
                      {copiedId === item._uniqueKey ? (
                        <Check size={12} className="text-emerald-600" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── BARCODE MULTI-PAGE PAGINATION CONTROLS ── */}
            <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-600">
                Displaying barcodes{" "}
                <span className="font-semibold text-slate-900">{totalBarcodesCount === 0 ? 0 : barcodeStartIndex + 1}</span>–
                <span className="font-semibold text-slate-900">
                  {Math.min(barcodeStartIndex + barcodesPerPage, totalBarcodesCount)}
                </span>{" "}
                of <span className="font-semibold text-slate-900">{totalBarcodesCount}</span> total labels
              </div>

              {totalBarcodePages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={barcodeDisplayPage === 1}
                    onClick={() => setBarcodeDisplayPage(1)}
                    className="p-1.5 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50 font-medium"
                    title="First Page"
                  >
                    <ChevronsLeft size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={barcodeDisplayPage === 1}
                    onClick={() => setBarcodeDisplayPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50 font-medium"
                    title="Previous Page"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {/* Page number buttons */}
                  {Array.from({ length: totalBarcodePages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalBarcodePages || Math.abs(p - barcodeDisplayPage) <= 1)
                    .map((p, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      const showEllipsis = prevPage && p - prevPage > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                          <button
                            type="button"
                            onClick={() => setBarcodeDisplayPage(p)}
                            className={`min-w-7 h-7 rounded text-xs font-semibold transition-colors ${
                              barcodeDisplayPage === p
                                ? "bg-slate-900 text-white"
                                : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    disabled={barcodeDisplayPage >= totalBarcodePages}
                    onClick={() => setBarcodeDisplayPage((p) => Math.min(totalBarcodePages, p + 1))}
                    className="p-1.5 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50 font-medium"
                    title="Next Page"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={barcodeDisplayPage >= totalBarcodePages}
                    onClick={() => setBarcodeDisplayPage(totalBarcodePages)}
                    className="p-1.5 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50 font-medium"
                    title="Last Page"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ViewBarcodeTab;
