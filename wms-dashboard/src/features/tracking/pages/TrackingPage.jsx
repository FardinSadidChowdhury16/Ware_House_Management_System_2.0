import { useState, useRef, useEffect } from "react";
import {
  Search,
  Barcode as BarcodeIcon,
  Warehouse,
  Package,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
  X,
  History,
  Copy,
  Check,
  Building2,
  MapPin,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  Badge,
  StatCard,
  PrimaryButton,
  GhostButton,
  Modal,
  Th,
  Td,
  useToast,
} from "../../../components/ui/index.js";
import { StatusPill } from "../../../components/ui/StatusPill.jsx";
import { inventoryApi } from "../../inventory/api/inventoryApi.js";

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

// ─── Modal for viewing Serial Numbers inside a specific Warehouse ─────────────
function WarehouseSerialsModal({ warehouse, isOpen, onClose }) {
  const [search, setSearch] = useState("");
  const [copiedSerial, setCopiedSerial] = useState(null);

  if (!isOpen || !warehouse) return null;

  const items = warehouse.items || [];
  const filtered = items.filter(
    (it) =>
      !search.trim() ||
      it.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
      it.barcode?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedSerial(text);
    setTimeout(() => setCopiedSerial(null), 2000);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Warehouse className="text-amber-500" size={20} />
          <span>
            {warehouse.warehouse_name} ({warehouse.warehouse_code})
          </span>
        </div>
      }
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Location / Address</p>
            <p className="text-sm font-medium text-slate-800">{warehouse.address || "No address specified"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Total In Warehouse:</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {warehouse.total_units} unit(s)
            </span>
          </div>
        </div>

        {items.length > 5 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter serial numbers..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}

        <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-md">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Serial Number</th>
                <th className="py-2.5 px-3">Barcode</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400">
                    No matching serial numbers found.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 font-mono font-medium text-slate-900">{item.serial_number}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{item.barcode || "—"}</td>
                    <td className="py-2 px-3">
                      <StatusPill status={item.status} />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleCopy(item.serial_number)}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-amber-600 transition-colors px-2 py-0.5 rounded text-[11px]"
                      >
                        {copiedSerial === item.serial_number ? (
                          <>
                            <Check size={12} className="text-emerald-600" />
                            <span className="text-emerald-600 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <GhostButton onClick={onClose}>Close</GhostButton>
        </div>
      </div>
    </Modal>
  );
}

export function TrackingPage() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedWarehouseForSerials, setSelectedWarehouseForSerials] = useState(null);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem("wms_recent_tracking");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const inputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    // Focus barcode input on mount
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (codeToSearch) => {
    const code = (codeToSearch || barcodeInput).trim();
    if (!code) {
      toast?.error?.("Please enter or scan a barcode");
      return;
    }

    setIsSearching(true);
    setErrorMsg(null);

    try {
      const data = await inventoryApi.trackByBarcode(code);
      if (data && data.found) {
        setTrackingData(data);
        setErrorMsg(null);

        // Save to recent searches
        setRecentSearches((prev) => {
          const updated = [code, ...prev.filter((c) => c !== code)].slice(0, 5);
          try {
            localStorage.setItem("wms_recent_tracking", JSON.stringify(updated));
          } catch {}
          return updated;
        });
      } else {
        setTrackingData(null);
        setErrorMsg(data?.message || `No product or item found with barcode "${code}"`);
      }
    } catch (err) {
      setTrackingData(null);
      setErrorMsg(err?.response?.data?.detail || "Failed to search product by barcode. Please check server.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const clearSearch = () => {
    setBarcodeInput("");
    setTrackingData(null);
    setErrorMsg(null);
    inputRef.current?.focus();
  };

  const product = trackingData?.product;
  const variant = trackingData?.variant;
  const warehouses = trackingData?.warehouses || [];
  const exactItem = trackingData?.exact_item;
  const unassigned = trackingData?.unassigned_stock;
  const movements = trackingData?.recent_movements || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── Barcode Search Hero Box ─────────────────────────────────────── */}
      <Card className="p-6 bg-gradient-to-br from-white to-slate-50/50 border border-slate-200/80 shadow-sm">
        <div className="max-w-3xl mx-auto space-y-3">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Scan Barcode or Serial Number
          </label>

          <div className="relative flex items-center shadow-sm rounded-lg overflow-hidden border-2 border-amber-500/70 focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all bg-white">
            <div className="pl-4 pr-2 text-slate-400 flex items-center justify-center">
              <BarcodeIcon size={22} className="text-slate-500" />
            </div>

            <input
              ref={inputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scan barcode with scanner or type barcode/serial/SKU and press Enter..."
              disabled={isSearching}
              className="w-full py-3.5 px-2 text-base font-mono text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none bg-transparent"
            />

            {barcodeInput && !isSearching && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear"
              >
                <X size={18} />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={isSearching || !barcodeInput.trim()}
              className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search size={16} />
                  <span>Track</span>
                </>
              )}
            </button>
          </div>

          {/* Recent Searches Pills */}
          {recentSearches.length > 0 && !trackingData && !errorMsg && (
            <div className="flex items-center gap-2 pt-2 flex-wrap text-xs text-slate-500">
              <span className="font-medium text-slate-400">Recent:</span>
              {recentSearches.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setBarcodeInput(code);
                    handleSearch(code);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border border-slate-200 transition-colors font-mono text-slate-700"
                >
                  {code}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ─── Loading State ────────────────────────────────────────────────── */}
      {isSearching && (
        <div className="py-16 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-amber-50 text-amber-600">
            <RefreshCw size={30} className="animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            Querying warehouse network for barcode <span className="font-mono text-amber-600">"{barcodeInput}"</span>...
          </p>
          <p className="text-xs text-slate-400">
            Checking serialized units, bulk inventories, and unassigned stock across all locations
          </p>
        </div>
      )}

      {/* ─── Error / Not Found State ──────────────────────────────────────── */}
      {!isSearching && errorMsg && (
        <Card className="p-8 text-center border-rose-200 bg-rose-50/40 space-y-3">
          <div className="inline-flex p-3 rounded-full bg-rose-100 text-rose-600">
            <AlertCircle size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Product / Barcode Not Found</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">{errorMsg}</p>
          <p className="text-xs text-slate-400">
            Please make sure the barcode was entered or scanned correctly, or ensure the product has been registered in the system.
          </p>
          <div className="pt-2">
            <GhostButton onClick={clearSearch}>Try Another Barcode</GhostButton>
          </div>
        </Card>
      )}

      {/* ─── Empty Initial State ──────────────────────────────────────────── */}
      {!isSearching && !trackingData && !errorMsg && (
        <div className="py-16 text-center space-y-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <div className="inline-flex p-4 rounded-full bg-slate-100 text-slate-400">
            <BarcodeIcon size={36} />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No Barcode Scanned Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Scan any product barcode, item barcode, or serial number using your scanner or the search box above to track which warehouses hold this item and in what quantities.
          </p>
        </div>
      )}

      {/* ─── Tracking Results View ────────────────────────────────────────── */}
      {!isSearching && trackingData && product && (
        <div className="space-y-6">
          {/* 1. Exact Item Match Banner (If applicable) */}
          {exactItem && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500 text-white shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Exact Unit Match</span>
                    <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-amber-300">
                      SN: {exactItem.serial_number}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Currently located in:{" "}
                    <span className="font-semibold text-slate-900">{exactItem.warehouse_name}</span>
                    {exactItem.warehouse_code ? ` (${exactItem.warehouse_code})` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <StatusPill status={exactItem.status} />
              </div>
            </div>
          )}

          {/* 2. Product Overview Card */}
          <Card className="p-5 border-slate-200 shadow-sm bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                    {product.category_name || "General"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      product.tracking_type === "serialized"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-purple-50 text-purple-700 border-purple-200"
                    }`}
                  >
                    {product.tracking_type === "serialized" ? "Serialized Tracking" : "Bulk Stock"}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                    {product.status || "active"}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-slate-900">{product.name}</h2>

                <div className="flex items-center gap-4 text-xs text-slate-500 font-mono flex-wrap">
                  <span>Product Code: <strong className="text-slate-700">{product.product_code || "—"}</strong></span>
                  {variant && (
                    <>
                      <span>•</span>
                      <span>Item: <strong className="text-slate-900 font-semibold">{variant.name || "Default"}</strong></span>
                      <span>•</span>
                      <span>SKU: <strong className="text-slate-700">{variant.sku || "—"}</strong></span>
                      <span>•</span>
                      <span>Barcode: <strong className="text-amber-700">{variant.barcode || trackingData.query_barcode}</strong></span>
                    </>
                  )}
                </div>
              </div>

              {variant && (
                <div className="flex items-center gap-6 p-3 bg-slate-50 rounded-lg border border-slate-200 shrink-0 text-right">
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase font-semibold">Selling Price</p>
                    <p className="text-base font-bold text-slate-900">৳{variant.selling_price?.toFixed(2) || "0.00"}</p>
                  </div>
                  <div className="border-l border-slate-200 pl-6">
                    <p className="text-[11px] text-slate-500 uppercase font-semibold">Cost Price</p>
                    <p className="text-base font-bold text-slate-700">৳{variant.cost_price?.toFixed(2) || "0.00"}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 3. Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Units Found"
              value={trackingData.total_units}
              subtitle="Across all locations"
              icon={Package}
            />
            <StatCard
              title="Warehouses With Stock"
              value={trackingData.warehouses_count}
              subtitle="Active distribution hubs"
              icon={Warehouse}
            />
            <StatCard
              title="Available (In Stock)"
              value={trackingData.total_in_stock}
              subtitle="Ready for dispatch / sale"
              icon={CheckCircle2}
            />
            <StatCard
              title="Unassigned Units"
              value={unassigned?.total_units || 0}
              subtitle="Not assigned to warehouse"
              icon={Clock}
            />
          </div>

          {/* 4. Warehouse Distribution Table */}
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Warehouse size={17} className="text-amber-500" />
                  <span>Warehouse Stock Distribution</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Breakdown of available units across each physical warehouse location
                </p>
              </div>

              <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs">
                {warehouses.length} Warehouse(s) Found
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Warehouse Name & Code</th>
                    <th className="py-3 px-4">Location / Address</th>
                    <th className="py-3 px-4 text-center">Available Units</th>
                    <th className="py-3 px-4 text-center">In Stock Status</th>
                    <th className="py-3 px-4 text-center">Other Status</th>
                    <th className="py-3 px-4 text-right">Items Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {warehouses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        This product is currently not stocked in any warehouse.
                      </td>
                    </tr>
                  ) : (
                    warehouses.map((wh) => (
                      <tr key={wh.warehouse_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <Building2 size={16} className="text-slate-400" />
                            <div>
                              <p className="font-semibold text-slate-900">{wh.warehouse_name}</p>
                              <p className="text-[11px] font-mono text-slate-400">{wh.warehouse_code}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <MapPin size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-xs">{wh.address || "Main Facility"}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center font-bold px-3 py-1 rounded-full text-sm bg-amber-50 text-amber-800 border border-amber-200">
                            {wh.total_units} unit(s)
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs border border-emerald-100">
                            <CheckCircle2 size={12} />
                            {wh.in_stock_units} in stock
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {wh.other_status_units > 0 ? (
                            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {wh.other_status_units} service/reserved
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">0</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {product.tracking_type === "serialized" && wh.items?.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setSelectedWarehouseForSerials(wh)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-md border border-amber-200 transition-colors"
                            >
                              <span>View Serial Numbers</span>
                              <ChevronRight size={14} />
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Bulk units</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 5. Unassigned Stock Card (If any units are not assigned to a warehouse) */}
          {unassigned?.total_units > 0 && (
            <Card className="p-4 border-amber-200 bg-amber-50/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">
                      Unassigned Product Items ({unassigned.total_units} units)
                    </h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      These items have been created but have not yet been assigned or stocked in to any warehouse.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {unassigned.items?.slice(0, 5).map((it, idx) => (
                    <span
                      key={it.id || idx}
                      className="px-2 py-0.5 rounded bg-white text-slate-800 text-xs font-mono border border-amber-200"
                    >
                      {it.serial_number}
                    </span>
                  ))}
                  {unassigned.items?.length > 5 && (
                    <span className="text-xs text-slate-500 font-medium">
                      +{unassigned.items.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* 6. Recent Stock Movements Timeline */}
          {movements.length > 0 && (
            <Card className="p-5 border-slate-200 shadow-sm bg-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <History size={16} className="text-slate-500" />
                  <span>Recent Stock Movements for this Item</span>
                </h3>
                <span className="text-xs text-slate-400">Last {movements.length} logged activities</span>
              </div>

              <div className="divide-y divide-slate-100 text-xs mt-2">
                {movements.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                        {m.movement_type.replace("_", " ")}
                      </span>
                      <span className="font-semibold text-slate-800">
                        Qty: {m.quantity} unit(s)
                      </span>
                      <span className="text-slate-500">
                        {m.from_warehouse ? m.from_warehouse : "External / Inbound"}{" "}
                        <ArrowRight size={12} className="inline mx-1 text-slate-400" />{" "}
                        {m.to_warehouse ? m.to_warehouse : "Outbound / Sold"}
                      </span>
                    </div>

                    <div className="text-slate-400 text-right whitespace-nowrap">
                      {formatDate(m.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─── Modal for Serial Numbers ────────────────────────────────────── */}
      <WarehouseSerialsModal
        warehouse={selectedWarehouseForSerials}
        isOpen={Boolean(selectedWarehouseForSerials)}
        onClose={() => setSelectedWarehouseForSerials(null)}
      />
    </div>
  );
}
export default TrackingPage;
