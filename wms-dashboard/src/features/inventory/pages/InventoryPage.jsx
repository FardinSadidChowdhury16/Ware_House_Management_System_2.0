import { useMemo, useState } from "react";
import {
  Warehouse,
  CheckCircle2,
  Wrench,
  Eye,
  Barcode,
  Layers,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
} from "lucide-react";
import {
  Card,
  GhostButton,
  Th,
  Td,
  StatCard,
  Modal,
  SearchBox,
  Toolbar,
  EmptyTable,
  Pagination,
  ExportCSVButton,
} from "../../../components/ui/index.js";
import { useWarehouseFilter } from "../../../app/context/WarehouseFilterContext.jsx";
import { useInventory } from "../hooks/useInventory.js";

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

// ─── Product Warehouse Inventory Details Modal ──────────────────────────────
function ProductStockDetailModal({ item, onClose }) {
  const [unitSearch, setUnitSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  if (!item) return null;

  const isSerialized = item.tracking_type === "serialized";
  const serializedItems = item.serialized_items || [];

  const filteredUnits = serializedItems.filter((u) => {
    const matchesSearch =
      !unitSearch.trim() ||
      (u.serial_number && u.serial_number.toLowerCase().includes(unitSearch.toLowerCase())) ||
      (u.barcode && u.barcode.toLowerCase().includes(unitSearch.toLowerCase())) ||
      (u.variant_name && u.variant_name.toLowerCase().includes(unitSearch.toLowerCase()));

    const matchesStatus = statusFilter === "all" || u.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <Modal
      isOpen={!!item}
      onClose={onClose}
      title={`Product Warehouse Breakdown: ${item.product_name}`}
      size="2xl"
      footer={<GhostButton onClick={onClose}>Close</GhostButton>}
    >
      <div className="space-y-4">
        {/* Header Summary Banner */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold text-slate-900">{item.product_name}</span>
              {item.product_code && (
                <span className="text-xs font-mono bg-slate-200/90 text-slate-800 px-2 py-0.5 rounded font-semibold">
                  {item.product_code}
                </span>
              )}
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                  isSerialized
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-purple-50 text-purple-700 border border-purple-200"
                }`}
              >
                {isSerialized ? <Barcode size={12} /> : <Layers size={12} />}
                {isSerialized ? "Serialized Tracking" : "Bulk Stock"}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
              <span>
                Category: <strong className="text-slate-700 font-medium">{item.category_name || "General"}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Warehouse size={12} className="text-slate-400" />
                Warehouse: <strong className="text-slate-800 font-medium">{item.warehouse_name}</strong>
                {item.warehouse_code && (
                  <span className="font-mono text-[11px] text-slate-400">({item.warehouse_code})</span>
                )}
              </span>
            </p>
          </div>
        </div>

        {/* 5 Summary Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* Current In-Stock */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[11px] font-semibold">In Stock</span>
              <CheckCircle2 size={14} className="text-emerald-600" />
            </div>
            <span className="text-xl font-bold font-mono text-emerald-700 block mt-1">
              {item.in_stock_qty ?? 0}
            </span>
            <span className="text-[10px] text-emerald-600">Available on hand</span>
          </div>

          {/* Stock In */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between text-blue-800">
              <span className="text-[11px] font-semibold">Stock In</span>
              <ArrowDownToLine size={14} className="text-blue-600" />
            </div>
            <span className="text-xl font-bold font-mono text-blue-700 block mt-1">
              {item.stock_in_qty ?? item.total_received_qty ?? 0}
            </span>
            <span className="text-[10px] text-blue-600">Received total</span>
          </div>

          {/* Stock Out */}
          <div className="p-3 bg-slate-100/70 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between text-slate-800">
              <span className="text-[11px] font-semibold">Stock Out</span>
              <ArrowUpFromLine size={14} className="text-slate-600" />
            </div>
            <span className="text-xl font-bold font-mono text-slate-700 block mt-1">
              {item.stock_out_qty ?? item.customer_qty ?? 0}
            </span>
            <span className="text-[10px] text-slate-500">Sales / Dispatches</span>
          </div>

          {/* Transfers */}
          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between text-purple-800">
              <span className="text-[11px] font-semibold">Transfer</span>
              <ArrowLeftRight size={14} className="text-purple-600" />
            </div>
            <span className="text-xl font-bold font-mono text-purple-700 block mt-1">
              {item.transfer_qty ?? ((item.transfer_in_qty || 0) + (item.transfer_out_qty || 0))}
            </span>
            <span className="text-[10px] text-purple-600">
              In: {item.transfer_in_qty || 0} | Out: {item.transfer_out_qty || 0}
            </span>
          </div>

          {/* Under Servicing */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[11px] font-semibold">Under Servicing</span>
              <Wrench size={14} className="text-amber-600" />
            </div>
            <span className="text-xl font-bold font-mono text-amber-700 block mt-1">
              {item.servicing_qty ?? 0}
            </span>
            <span className="text-[10px] text-amber-600">In repair / ticket</span>
          </div>
        </div>

        {/* Serialized Units List or Bulk Breakdown */}
        {isSerialized ? (
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Barcode size={14} className="text-blue-600" />
                Serialized Units in this Warehouse ({filteredUnits.length} of {serializedItems.length})
              </h4>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder="Search serial / barcode..."
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="in_stock">In Stock</option>
                  <option value="under_service">In Servicing</option>
                </select>
                <ExportCSVButton
                  filename={`inventory-units-${item.product_name || "product"}`}
                  columns={[
                    { label: "ID", key: "id" },
                    { label: "Serial Number", value: (u) => u.serial_number || "—" },
                    { label: "Barcode", value: (u) => u.barcode || "—" },
                    { label: "Item", value: (u) => u.variant_name || "—" },
                    { label: "Status", key: "status" },
                    { label: "Warranty End", value: (u) => formatDate(u.warranty_end_date) },
                  ]}
                  data={filteredUnits}
                  label="CSV"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 font-semibold text-slate-600">#</th>
                    <th className="py-2 px-3 font-semibold text-slate-600">Serial Number</th>
                    <th className="py-2 px-3 font-semibold text-slate-600">Barcode</th>
                    <th className="py-2 px-3 font-semibold text-slate-600">Item</th>
                    <th className="py-2 px-3 font-semibold text-slate-600">Status</th>
                    <th className="py-2 px-3 font-semibold text-slate-600 text-right">Warranty End</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        No serialized units found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((u, idx) => (
                      <tr key={u.id || idx} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-medium text-slate-900">
                          {u.serial_number}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500">
                          {u.barcode || "—"}
                        </td>
                        <td className="py-2 px-3 text-slate-900 font-semibold">
                          {u.variant_name || "Standard"}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                              u.status === "in_stock"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : u.status === "under_service"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {u.status === "in_stock"
                              ? "In Stock"
                              : u.status === "under_service"
                              ? "In Servicing"
                              : u.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          {formatDate(u.warranty_end)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-purple-600" />
              Item Breakdown in this Warehouse
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 font-semibold text-slate-600">Item Name</th>
                    <th className="py-2 px-3 font-semibold text-slate-600 text-right">Stored Quantity</th>
                    <th className="py-2 px-3 font-semibold text-slate-600 text-right">Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(item.variants || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-slate-400">
                        No item details available.
                      </td>
                    </tr>
                  ) : (
                    (item.variants || []).map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {v.variant_name || "Standard Unit"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {v.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Available
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Main InventoryPage Component ───────────────────────────────────────────
export function InventoryPage() {
  const { selectedWarehouseId, myWarehouses } = useWarehouseFilter();
  const [search, setSearch] = useState("");
  const [trackingTypeFilter, setTrackingTypeFilter] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");

  const [selectedItemDetail, setSelectedItemDetail] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Active warehouse descriptor
  const activeWarehouse = useMemo(() => {
    if (!selectedWarehouseId) return null;
    return myWarehouses.find((w) => String(w.id) === String(selectedWarehouseId));
  }, [selectedWarehouseId, myWarehouses]);

  // Query warehouse stock summary from backend API (scoped to selected warehouse)
  const { warehouseSummary, isSummaryLoading } = useInventory({
    warehouse_id: selectedWarehouseId ?? undefined,
    search: search.trim() || undefined,
    tracking_type: trackingTypeFilter !== "all" ? trackingTypeFilter : undefined,
  });

  const {
    summary = {},
    items: displayItems = [],
  } = warehouseSummary;

  // Client-side filtering for fast interactive feedback
  const filteredDisplayItems = useMemo(() => {
    let result = displayItems;

    // Filter by stock status if specified
    if (stockStatusFilter === "in_stock") {
      result = result.filter((item) => (item.in_stock_qty || 0) > 0);
    } else if (stockStatusFilter === "out_of_stock") {
      result = result.filter((item) => (item.in_stock_qty || 0) === 0);
    }

    // Filter by search query across multiple fields (name, code, category, warehouse)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (item) =>
          (item.product_name && item.product_name.toLowerCase().includes(q)) ||
          (item.product_code && item.product_code.toLowerCase().includes(q)) ||
          (item.category_name && item.category_name.toLowerCase().includes(q)) ||
          (item.warehouse_name && item.warehouse_name.toLowerCase().includes(q)) ||
          (item.warehouse_code && item.warehouse_code.toLowerCase().includes(q))
      );
    }

    return result;
  }, [displayItems, search, stockStatusFilter]);

  // Paginated display slice
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDisplayItems.slice(start, start + pageSize);
  }, [filteredDisplayItems, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredDisplayItems.length / pageSize) || 1;

  return (
    <div className="space-y-5">
      {/* ─── 5 Professional Summary KPI Cards ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          label="Current In-Stock"
          value={summary.total_in_stock ?? 0}
          icon={CheckCircle2}
          tint="emerald"
        />
        <StatCard
          label="Total Stock In"
          value={summary.total_stock_in ?? summary.total_received ?? 0}
          icon={ArrowDownToLine}
          tint="blue"
        />
        <StatCard
          label="Total Stock Out"
          value={summary.total_stock_out ?? summary.total_customer ?? 0}
          icon={ArrowUpFromLine}
          tint="slate"
        />
        <StatCard
          label="Transfers"
          value={summary.total_transfers ?? 0}
          icon={ArrowLeftRight}
          tint="purple"
          subtext={`In: ${summary.total_transfer_in ?? 0} | Out: ${summary.total_transfer_out ?? 0}`}
        />
        <StatCard
          label="Under Servicing"
          value={summary.total_servicing ?? 0}
          icon={Wrench}
          tint="amber"
        />
      </div>

      {/* ─── Toolbar: Multi-filter Controls ──────────────────────────────── */}
      <Toolbar
        action={
          <ExportCSVButton
            filename="inventory-summary"
            columns={[
              { label: "Product Name", key: "product_name" },
              { label: "Product Code", key: "product_code" },
              { label: "Category", key: "category_name" },
              { label: "Tracking Type", key: "tracking_type" },
              { label: "Warehouse", key: "warehouse_name" },
              { label: "Warehouse Code", key: "warehouse_code" },
              { label: "In Stock Qty", key: "in_stock_qty" },
              { label: "Stock In Qty", value: (it) => it.stock_in_qty ?? it.total_received_qty ?? 0 },
              { label: "Stock Out Qty", value: (it) => it.stock_out_qty ?? it.customer_qty ?? 0 },
              { label: "Transfer In Qty", key: "transfer_in_qty" },
              { label: "Transfer Out Qty", key: "transfer_out_qty" },
              { label: "Total Transfers", key: "transfer_qty" },
              { label: "Under Servicing", key: "servicing_qty" },
            ]}
            data={filteredDisplayItems}
          />
        }
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Product Search */}
          <div className="w-64 sm:w-72">
            <SearchBox
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search product, code, SKU..."
            />
          </div>

          {/* Tracking Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Tracking:</span>
            <select
              value={trackingTypeFilter}
              onChange={(e) => {
                setTrackingTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">All Tracking Types</option>
              <option value="serialized">Serialized Units</option>
              <option value="bulk">Bulk Stock</option>
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Status:</span>
            <select
              value={stockStatusFilter}
              onChange={(e) => {
                setStockStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">All Availability</option>
              <option value="in_stock">In Stock Only (&gt; 0)</option>
              <option value="out_of_stock">Out of Stock (= 0)</option>
            </select>
          </div>
        </div>
      </Toolbar>

      {/* ─── Main Products Warehouse Inventory Table ──────────────────────── */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <Th>Product & Code</Th>
                <Th>Category</Th>
                <Th>Tracking</Th>
                <Th>Warehouse</Th>
                <Th className="text-right">In Stock</Th>
                <Th className="text-right">Stock In</Th>
                <Th className="text-right">Stock Out</Th>
                <Th className="text-right">Transfer</Th>
                <Th className="text-right">Under Servicing</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isSummaryLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-sm text-slate-400">
                    Loading inventory records...
                  </td>
                </tr>
              ) : filteredDisplayItems.length === 0 ? (
                <EmptyTable
                  cols={10}
                  message={
                    search.trim()
                      ? `No products found matching "${search}".`
                      : selectedWarehouseId
                      ? `No products currently found in ${activeWarehouse?.name || "the selected warehouse"}.`
                      : `No products found matching your inventory filters.`
                  }
                />
              ) : (
                paginatedItems.map((item) => (
                  <tr
                    key={`${item.product_id}-${item.warehouse_id}`}
                    onClick={() => setSelectedItemDetail(item)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    {/* Product & Code */}
                    <Td>
                      <div>
                        <p className="font-semibold text-slate-900 leading-tight">
                          {item.product_name}
                        </p>
                        {item.product_code && (
                          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 inline-block font-medium">
                            {item.product_code}
                          </span>
                        )}
                      </div>
                    </Td>

                    {/* Category */}
                    <Td>
                      <span className="text-xs text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        {item.category_name || "General"}
                      </span>
                    </Td>

                    {/* Tracking Type */}
                    <Td>
                      {item.tracking_type === "serialized" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                          <Barcode size={12} />
                          Serialized
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
                          <Layers size={12} />
                          Bulk Stock
                        </span>
                      )}
                    </Td>

                    {/* Warehouse */}
                    <Td>
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                          <Warehouse size={12} className="text-slate-500" />
                          {item.warehouse_name}
                        </span>
                        {item.warehouse_code && (
                          <p className="text-[11px] font-mono text-slate-400">
                            {item.warehouse_code}
                          </p>
                        )}
                      </div>
                    </Td>

                    {/* Current In-Stock */}
                    <Td className="text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 font-bold font-mono text-xs px-2.5 py-1 rounded border ${
                          (item.in_stock_qty || 0) > 0
                            ? "text-emerald-700 bg-emerald-50/80 border-emerald-200"
                            : "text-slate-400 bg-slate-50 border-slate-200"
                        }`}
                      >
                        {(item.in_stock_qty || 0) > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                        {item.in_stock_qty ?? 0}
                      </span>
                    </Td>

                    {/* Stock In */}
                    <Td className="text-right">
                      <span className="inline-flex items-center gap-1 font-bold font-mono text-xs text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded border border-blue-200">
                        {item.stock_in_qty ?? item.total_received_qty ?? 0}
                      </span>
                    </Td>

                    {/* Stock Out */}
                    <Td className="text-right">
                      <span className="inline-flex items-center gap-1 font-bold font-mono text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                        {item.stock_out_qty ?? item.customer_qty ?? 0}
                      </span>
                    </Td>

                    {/* Transfer */}
                    <Td className="text-right">
                      {(item.transfer_in_qty || item.transfer_out_qty) ? (
                        <span
                          className="inline-flex items-center gap-1.5 font-bold font-mono text-xs text-purple-700 bg-purple-50/80 px-2.5 py-1 rounded border border-purple-200"
                          title={`Transfer In: ${item.transfer_in_qty || 0} | Transfer Out: ${item.transfer_out_qty || 0}`}
                        >
                          <ArrowLeftRight size={11} className="text-purple-500" />
                          <span>In: {item.transfer_in_qty || 0}</span>
                          <span className="text-purple-300">/</span>
                          <span>Out: {item.transfer_out_qty || 0}</span>
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-400 font-medium">0</span>
                      )}
                    </Td>

                    {/* Under Servicing */}
                    <Td className="text-right">
                      {(item.servicing_qty || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold font-mono text-xs text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded border border-amber-200">
                          <Wrench size={11} />
                          {item.servicing_qty}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-400 font-medium">0</span>
                      )}
                    </Td>

                    {/* View Details Action */}
                    <Td className="text-right">
                      <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                        <GhostButton
                          onClick={() => setSelectedItemDetail(item)}
                          className="px-2.5 py-1 text-xs text-slate-700 hover:text-slate-900"
                        >
                          <Eye size={13} className="mr-1 text-slate-500" />
                          View
                        </GhostButton>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Summary Footer */}
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          total={filteredDisplayItems.length}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 50]}
          itemName="products"
        />
      </Card>

      {/* ─── Product Warehouse Inventory Detail Modal ─────────────────────── */}
      <ProductStockDetailModal
        item={selectedItemDetail}
        onClose={() => setSelectedItemDetail(null)}
      />
    </div>
  );
}
