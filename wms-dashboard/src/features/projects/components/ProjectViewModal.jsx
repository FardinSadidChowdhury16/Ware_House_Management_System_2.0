import { useState, useEffect, useMemo } from "react";
import {
  FolderKanban,
  Package,
  FileText,
  Clock,
  MapPin,
  Phone,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import {
  Modal,
  GhostButton,
  SearchBox,
  ExportCSVButton,
  Badge,
} from "../../../components/ui/index.js";
import { projectsApi } from "../api/projectsApi.js";
import { formatBDDateTime } from "../../../shared/utils/dateUtils.js";

function defaultGetStatusBadge(status) {
  if (status === "active") return <Badge variant="success">Active</Badge>;
  if (status === "completed") return <Badge variant="info">Completed</Badge>;
  return <Badge variant="warning">On Hold</Badge>;
}

export function ProjectViewModal({ project, isOpen, onClose, getStatusBadge = defaultGetStatusBadge, initialSearch = "" }) {
  const [activeTab, setActiveTab] = useState("summary"); // "summary" | "all" | "in" | "own_out" | "other_out" | "info"
  const [itemsData, setItemsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(initialSearch || "");

  useEffect(() => {
    if (!isOpen || !project?.id) {
      setItemsData(null);
      setSearch("");
      return;
    }
    setSearch(initialSearch || "");
    setActiveTab(initialSearch ? "all" : "summary");
    setLoading(true);
    projectsApi.getProjectItems(project.id)
      .then((data) => setItemsData(data))
      .catch((err) => {
        console.error("Failed to load project items", err);
        setItemsData({
          items: [],
          product_summary: [],
          total_items: 0,
          total_in_quantity: 0,
          own_out_quantity: 0,
          other_out_quantity: 0,
          total_out_quantity: 0,
          net_quantity: 0,
        });
      })
      .finally(() => setLoading(false));
  }, [isOpen, project?.id]);

  if (!isOpen || !project) return null;

  const allItems = itemsData?.items || [];
  const productSummary = itemsData?.product_summary || [];
  const totalIn = itemsData?.total_in_quantity ?? 0;
  const ownOut = itemsData?.own_out_quantity ?? 0;
  const otherOut = itemsData?.other_out_quantity ?? 0;
  const totalOut = itemsData?.total_out_quantity ?? 0;
  const netBalance = itemsData?.net_quantity ?? 0;

  // Percentages for visual stacked distribution bar
  const denom = totalIn > 0 ? totalIn : 1;
  const ownPct = Math.min(100, Math.round((ownOut / denom) * 100));
  const otherPct = Math.min(100 - ownPct, Math.round((otherOut / denom) * 100));
  const remPct = Math.max(0, 100 - ownPct - otherPct);

  // Filter items by active tab and search query
  const tabFilteredItems = useMemo(() => {
    if (activeTab === "in") return allItems.filter((i) => i.direction === "in");
    if (activeTab === "own_out") return allItems.filter((i) => i.direction === "out" && i.out_scope === "own");
    if (activeTab === "other_out") return allItems.filter((i) => i.direction === "out" && i.out_scope === "other");
    return allItems;
  }, [allItems, activeTab]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return tabFilteredItems;
    const q = search.toLowerCase().trim();
    return tabFilteredItems.filter((i) => {
      return (
        i.product_name?.toLowerCase().includes(q) ||
        i.product_code?.toLowerCase().includes(q) ||
        i.variant_name?.toLowerCase().includes(q) ||
        i.variant_sku?.toLowerCase().includes(q) ||
        i.serial_number?.toLowerCase().includes(q) ||
        i.barcode?.toLowerCase().includes(q) ||
        i.reference_number?.toLowerCase().includes(q) ||
        i.source_warehouse_name?.toLowerCase().includes(q) ||
        i.destination_project_name?.toLowerCase().includes(q) ||
        i.destination_customer_name?.toLowerCase().includes(q) ||
        i.note?.toLowerCase().includes(q)
      );
    });
  }, [tabFilteredItems, search]);

  const filteredProductSummary = useMemo(() => {
    if (!search.trim()) return productSummary;
    const q = search.toLowerCase().trim();
    return productSummary.filter((p) =>
      p.product_name?.toLowerCase().includes(q) ||
      p.product_code?.toLowerCase().includes(q) ||
      (p.other_destinations || []).some((d) => d.toLowerCase().includes(q))
    );
  }, [productSummary, search]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FolderKanban className="text-blue-600" size={18} />
          <span className="font-semibold text-slate-900 dark:text-slate-100">{project.name}</span>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {project.code}
          </span>
          <span className="ml-1">{getStatusBadge(project.status)}</span>
        </div>
      }
      size="4xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
          <div className="inline-flex flex-wrap p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium gap-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("summary")}
              className={`px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "summary"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <BarChart3 size={14} />
              <span>Product Breakdown</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold">
                {productSummary.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "all"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Boxes size={14} />
              <span>All Movements</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold">
                {allItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("in")}
              className={`px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "in"
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <ArrowDownLeft size={14} className="text-emerald-600" />
              <span>Stock In (+)</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
                {totalIn}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("own_out")}
              className={`px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "own_out"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 size={14} className="text-blue-600" />
              <span>Own Out</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold">
                {ownOut}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("other_out")}
              className={`px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "other_out"
                  ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 font-semibold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <AlertTriangle size={14} className="text-rose-600" />
              <span>Other Project Out</span>
              <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                otherOut > 0
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                  : "bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
              }`}>
                {otherOut}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "info"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <FileText size={14} />
              <span>Details</span>
            </button>
          </div>

          {activeTab !== "info" && allItems.length > 0 && (
            <div className="flex items-center gap-2">
              {activeTab === "summary" ? (
                <ExportCSVButton
                  filename={`project-${project.code || project.id}-product-breakdown`}
                  columns={[
                    { label: "Product", key: "product_name" },
                    { label: "Product Code", key: "product_code" },
                    { label: "Tracking", key: "tracking_type" },
                    { label: "Stock In (+)", key: "stock_in_qty" },
                    { label: "Own Stock Out (-)", key: "own_out_qty" },
                    { label: "Other Project Out (-)", key: "other_out_qty" },
                    { label: "Remaining", key: "remaining_qty" },
                    { label: "Other Destinations", value: (p) => (p.other_destinations || []).join("; ") || "—" },
                  ]}
                  data={filteredProductSummary}
                  className="text-xs py-1 px-2.5"
                />
              ) : (
                <ExportCSVButton
                  filename={`project-${project.code || project.id}-${activeTab}-items`}
                  columns={[
                    { label: "Date & Time", value: (i) => formatBDDateTime(i.dispatched_at) },
                    { label: "Type", value: (i) => (i.direction === "in" ? "Stock In (+)" : i.out_scope === "own" ? "Own Stock Out (-)" : i.out_scope === "other" ? "Other Project Out (-)" : "Stock Out (-)") },
                    { label: "Destination", value: (i) => i.destination_project_name || i.destination_customer_name || "—" },
                    { label: "Product", key: "product_name" },
                    { label: "Product Code", key: "product_code" },
                    { label: "Variant / SKU", value: (i) => i.variant_name || i.variant_sku || "Standard" },
                    { label: "Tracking", key: "tracking_type" },
                    { label: "Serial Number", value: (i) => i.serial_number || "—" },
                    { label: "Barcode", value: (i) => i.barcode || "—" },
                    { label: "Quantity", value: (i) => (i.direction === "in" ? `+${i.quantity}` : `-${i.quantity}`) },
                    { label: "Warehouse", key: "source_warehouse_name" },
                    { label: "Reference #", key: "reference_number" },
                    { label: "Actor", key: "dispatched_by_name" },
                    { label: "Notes", key: "note" },
                  ]}
                  data={filteredItems}
                  className="text-xs py-1 px-2.5"
                />
              )}
            </div>
          )}
        </div>

        {activeTab !== "info" ? (
          <div className="space-y-3">
            {/* Quick Metrics & Own vs Other Project Visual Breakdown */}
            <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                  <Calculator size={13} className="text-blue-600 dark:text-blue-400" />
                  <span className="uppercase tracking-wider text-[11px]">Project Allocation &amp; Stock Out Breakdown</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  <strong className="text-emerald-700 dark:text-emerald-400">Stock In (+)</strong> − <strong className="text-blue-700 dark:text-blue-400">Own Out</strong> − <strong className="text-rose-700 dark:text-rose-400">Other Project Out</strong> = <strong className="text-purple-700 dark:text-purple-400">Remaining</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-stretch">
                {/* 1. Stock In */}
                <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase block">
                    Stock In (+)
                  </span>
                  <span className="text-xl font-bold text-emerald-950 dark:text-emerald-100 font-mono my-0.5">
                    {loading ? "..." : `+${totalIn}`}
                  </span>
                  <span className="text-[10px] text-emerald-600/90 dark:text-emerald-400/90 block">
                    Stocked in for this project
                  </span>
                </div>

                {/* 2. Stock Out (Own) */}
                <div className="relative p-2.5 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg flex flex-col items-center justify-center text-center">
                  <span className="hidden sm:flex absolute -left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-blue-300 dark:border-blue-700 items-center justify-center text-xs font-extrabold text-blue-600 shadow-xs z-10">
                    −
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase block">
                    Stock Out (Own)
                  </span>
                  <span className="text-xl font-bold text-blue-950 dark:text-blue-100 font-mono my-0.5">
                    {loading ? "..." : `-${ownOut}`}
                  </span>
                  <span className="text-[10px] text-blue-600/90 dark:text-blue-400/90 block">
                    Used in THIS project
                  </span>
                </div>

                {/* 3. Stock Out (Other Project) */}
                <div className={`relative p-2.5 rounded-lg flex flex-col items-center justify-center text-center border ${
                  otherOut > 0
                    ? "bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                }`}>
                  <span className="hidden sm:flex absolute -left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-rose-300 dark:border-rose-700 items-center justify-center text-xs font-extrabold text-rose-600 shadow-xs z-10">
                    −
                  </span>
                  <span className={`text-[10px] font-bold uppercase block flex items-center gap-1 ${
                    otherOut > 0 ? "text-rose-700 dark:text-rose-300" : "text-slate-500"
                  }`}>
                    {otherOut > 0 && <AlertTriangle size={11} className="text-rose-600" />}
                    Stock Out (Other)
                  </span>
                  <span className={`text-xl font-bold font-mono my-0.5 ${
                    otherOut > 0 ? "text-rose-800 dark:text-rose-200" : "text-slate-600 dark:text-slate-300"
                  }`}>
                    {loading ? "..." : `-${otherOut}`}
                  </span>
                  <span className={`text-[10px] block ${
                    otherOut > 0 ? "text-rose-600 dark:text-rose-400 font-medium" : "text-slate-400"
                  }`}>
                    Diverted to other project
                  </span>
                </div>

                {/* 4. Remaining Balance */}
                <div className="relative p-2.5 bg-purple-50/90 dark:bg-purple-950/40 border-2 border-purple-300 dark:border-purple-700 rounded-lg shadow-xs flex flex-col items-center justify-center text-center">
                  <span className="hidden sm:flex absolute -left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-purple-300 dark:border-purple-700 items-center justify-center text-xs font-extrabold text-purple-700 shadow-xs z-10">
                    =
                  </span>
                  <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300 uppercase block">
                    Remaining Balance
                  </span>
                  <span className="text-xl font-bold text-purple-950 dark:text-purple-100 font-mono my-0.5">
                    {loading ? "..." : netBalance}
                  </span>
                  <span className="text-[10px] text-purple-700/80 dark:text-purple-300/80 font-medium block">
                    Still available in WH
                  </span>
                </div>
              </div>

              {/* Visual Stacked Distribution Bar */}
              {totalIn > 0 && (
                <div className="pt-1 space-y-1.5">
                  <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                    {ownPct > 0 && (
                      <div
                        className="bg-blue-600 h-full transition-all"
                        style={{ width: `${ownPct}%` }}
                        title={`Own Project Stock Out: ${ownOut} units (${ownPct}%)`}
                      />
                    )}
                    {otherPct > 0 && (
                      <div
                        className="bg-rose-500 h-full transition-all"
                        style={{ width: `${otherPct}%` }}
                        title={`Other Project Stock Out: ${otherOut} units (${otherPct}%)`}
                      />
                    )}
                    {remPct > 0 && (
                      <div
                        className="bg-purple-500 h-full transition-all"
                        style={{ width: `${remPct}%` }}
                        title={`Remaining in Stock: ${netBalance} units (${remPct}%)`}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                        Own Project Out: <strong className="text-slate-800 dark:text-slate-200">{ownOut} ({ownPct}%)</strong>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                        Other Project Out: <strong className={otherOut > 0 ? "text-rose-600 font-bold" : "text-slate-800 dark:text-slate-200"}>{otherOut} ({otherPct}%)</strong>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                        Remaining: <strong className="text-purple-700 dark:text-purple-300">{netBalance} ({remPct}%)</strong>
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Total Stocked In: {totalIn} units (100%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Filter / Search inside Items */}
            {(allItems.length > 0 || productSummary.length > 0) && (
              <div className="flex items-center gap-2">
                <SearchBox
                  value={search}
                  onChange={setSearch}
                  placeholder={activeTab === "summary" ? "Search product name, code, or diverted destination..." : "Filter movements by product, serial, barcode, destination..."}
                  className="w-full text-xs"
                />
              </div>
            )}

            {/* TAB CONTENT: PRODUCT BREAKDOWN SUMMARY */}
            {activeTab === "summary" ? (
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                <div className="max-h-[340px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Product Name &amp; Code</th>
                        <th className="py-2.5 px-3 text-center">Tracking</th>
                        <th className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">Stock In (+)</th>
                        <th className="py-2.5 px-3 text-right text-blue-700 dark:text-blue-400">Own Out (−)</th>
                        <th className="py-2.5 px-3 text-right text-rose-700 dark:text-rose-400">Other Project Out (−)</th>
                        <th className="py-2.5 px-3 text-right text-purple-700 dark:text-purple-400">Remaining (=)</th>
                        <th className="py-2.5 px-3 w-40">Visual Breakdown</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400">
                            <div className="inline-flex items-center gap-2">
                              <Clock className="animate-spin text-blue-500" size={16} />
                              <span>Loading product breakdown...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredProductSummary.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center">
                            <Package size={36} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              No products stocked in for this project yet
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredProductSummary.map((p) => {
                          const pDenom = p.stock_in_qty > 0 ? p.stock_in_qty : 1;
                          const pOwnPct = Math.min(100, Math.round((p.own_out_qty / pDenom) * 100));
                          const pOtherPct = Math.min(100 - pOwnPct, Math.round((p.other_out_qty / pDenom) * 100));
                          const pRemPct = Math.max(0, 100 - pOwnPct - pOtherPct);
                          return (
                            <tr key={p.product_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">
                                  {p.product_name}
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {p.product_code}
                                </span>
                                {p.other_destinations && p.other_destinations.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {p.other_destinations.map((dest) => (
                                      <span key={dest} className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                                        → {dest}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <Badge variant={p.tracking_type === "serialized" ? "primary" : "neutral"}>
                                  {p.tracking_type}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                +{p.stock_in_qty}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                                  {p.own_out_qty > 0 ? `-${p.own_out_qty}` : "0"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {p.other_out_qty > 0 ? (
                                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300">
                                    -{p.other_out_qty}
                                  </span>
                                ) : (
                                  <span className="font-mono text-slate-400">0</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="font-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                                  {p.remaining_qty}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                                  {pOwnPct > 0 && <div className="bg-blue-600 h-full" style={{ width: `${pOwnPct}%` }} title={`Own: ${p.own_out_qty}`} />}
                                  {pOtherPct > 0 && <div className="bg-rose-500 h-full" style={{ width: `${pOtherPct}%` }} title={`Other: ${p.other_out_qty}`} />}
                                  {pRemPct > 0 && <div className="bg-purple-500 h-full" style={{ width: `${pRemPct}%` }} title={`Remaining: ${p.remaining_qty}`} />}
                                </div>
                                <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 font-mono">
                                  <span>Own {pOwnPct}%</span>
                                  {p.other_out_qty > 0 && <span className="text-rose-600 font-semibold">Other {pOtherPct}%</span>}
                                  <span>Rem {pRemPct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
            /* Items Movement Table */
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
              <div className="max-h-[340px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Date &amp; Time</th>
                      <th className="py-2.5 px-3 text-center">Type &amp; Scope</th>
                      <th className="py-2.5 px-3">Product Name &amp; Code</th>
                      <th className="py-2.5 px-3">Variant / SKU</th>
                      <th className="py-2.5 px-3">Serial / Barcode</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3">Warehouse</th>
                      <th className="py-2.5 px-3">Ref #</th>
                      <th className="py-2.5 px-3">Handled By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400">
                          <div className="inline-flex items-center gap-2">
                            <Clock className="animate-spin text-blue-500" size={16} />
                            <span>Loading project stock movements...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center">
                          <Package size={36} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {search.trim()
                              ? "No matching items found"
                              : activeTab === "in"
                              ? "No Stock In (received) items for this project yet"
                              : activeTab === "own_out"
                              ? "No Own Stock Out items for this project yet"
                              : activeTab === "other_out"
                              ? "No items diverted to other projects"
                              : "No movements recorded for this project yet"}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            {search.trim()
                              ? "Try clearing your search query above."
                              : "When you stock in or stock out items for this project, movements will appear here."}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, idx) => {
                        const isIn = item.direction === "in";
                        const isOwnOut = !isIn && item.out_scope === "own";
                        const isOtherOut = !isIn && item.out_scope === "other";
                        const isReceivedFromOther = !isIn && item.out_scope === "received_from_other";
                        return (
                          <tr
                            key={item.id || idx}
                            className={`transition-colors ${
                              isOtherOut
                                ? "bg-rose-50/40 hover:bg-rose-50/70 dark:bg-rose-950/10 dark:hover:bg-rose-950/20"
                                : "hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                            }`}
                          >
                            <td className="py-2 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                              {formatBDDateTime(item.dispatched_at)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {isIn ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <ArrowDownLeft size={11} />
                                  Stock In
                                </span>
                              ) : isOwnOut ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  <CheckCircle2 size={11} />
                                  Own Out
                                </span>
                              ) : isOtherOut ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-700 whitespace-nowrap">
                                    <AlertTriangle size={10} />
                                    Other Project Out
                                  </span>
                                  <span className="text-[9px] font-semibold text-rose-700 dark:text-rose-300">
                                    → {item.destination_project_name || item.destination_customer_name || "Other"}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <ArrowUpRight size={11} />
                                    Stock Out
                                  </span>
                                  {isReceivedFromOther && (
                                    <span className="text-[9px] font-semibold text-rose-600">
                                      From: {item.allocated_project_name || "Other"}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {item.product_name}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {item.product_code}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="text-slate-700 dark:text-slate-300">
                                {item.variant_name || "—"}
                              </div>
                              {item.variant_sku && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  SKU: {item.variant_sku}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {item.serial_number ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold">
                                  SN: {item.serial_number}
                                </span>
                              ) : item.barcode ? (
                                <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                  {item.barcode}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full font-bold font-mono text-xs ${
                                  isIn
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : isOwnOut
                                    ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                                    : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                                }`}
                              >
                                {isIn ? `+${item.quantity}` : `-${item.quantity}`}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                              {item.source_warehouse_name}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {item.reference_number || "—"}
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                              {item.dispatched_by_name || "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        ) : (
          /* Info Tab */
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-400 block mb-0.5">Status</span>
                <span>{getStatusBadge(project.status)}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Created Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatBDDateTime(project.created_at)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Last Updated</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatBDDateTime(project.updated_at)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-start gap-2.5">
              <MapPin className="text-rose-500 mt-0.5 shrink-0" size={16} />
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Site Location</span>
                <p className="text-slate-600 dark:text-slate-400">{project.location}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-start gap-2.5">
              <Phone className="text-emerald-500 mt-0.5 shrink-0" size={16} />
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Contact Information</span>
                <p className="text-slate-600 dark:text-slate-400">{project.contact_info}</p>
              </div>
            </div>

            {project.description && (
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-start gap-2.5">
                <FileText className="text-indigo-500 mt-0.5 shrink-0" size={16} />
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Description &amp; Notes</span>
                  <p className="text-slate-600 dark:text-slate-400 whitespace-pre-line">{project.description}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <GhostButton onClick={onClose}>Close</GhostButton>
        </div>
      </div>
    </Modal>
  );
}
