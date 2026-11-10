import { useState, useEffect } from "react";
import {
  FolderKanban,
  Package,
  FileText,
  Clock,
  MapPin,
  Phone,
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

export function ProjectViewModal({ project, isOpen, onClose, getStatusBadge = defaultGetStatusBadge }) {
  const [activeTab, setActiveTab] = useState("items"); // "items" | "info"
  const [itemsData, setItemsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen || !project?.id) {
      setItemsData(null);
      return;
    }
    setLoading(true);
    projectsApi.getProjectItems(project.id)
      .then((data) => setItemsData(data))
      .catch((err) => {
        console.error("Failed to load project items", err);
        setItemsData({ items: [], total_items: 0, total_quantity: 0 });
      })
      .finally(() => setLoading(false));
  }, [isOpen, project?.id]);

  if (!isOpen || !project) return null;

  const allItems = itemsData?.items || [];
  const filteredItems = search.trim()
    ? allItems.filter((i) => {
        const q = search.toLowerCase();
        return (
          i.product_name?.toLowerCase().includes(q) ||
          i.product_code?.toLowerCase().includes(q) ||
          i.variant_name?.toLowerCase().includes(q) ||
          i.variant_sku?.toLowerCase().includes(q) ||
          i.serial_number?.toLowerCase().includes(q) ||
          i.barcode?.toLowerCase().includes(q) ||
          i.reference_number?.toLowerCase().includes(q) ||
          i.source_warehouse_name?.toLowerCase().includes(q)
        );
      })
    : allItems;

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
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("items")}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "items"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Package size={14} />
              <span>Assigned Items</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 font-bold">
                {itemsData ? itemsData.total_quantity : "..."}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "info"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <FileText size={14} />
              <span>Project Details</span>
            </button>
          </div>

          {activeTab === "items" && allItems.length > 0 && (
            <div className="flex items-center gap-2">
              <ExportCSVButton
                filename={`project-${project.code || project.id}-assigned-items`}
                columns={[
                  { label: "Date & Time", value: (i) => formatBDDateTime(i.dispatched_at) },
                  { label: "Product", key: "product_name" },
                  { label: "Product Code", key: "product_code" },
                  { label: "Variant / SKU", value: (i) => i.variant_name || i.variant_sku || "Standard" },
                  { label: "Tracking", key: "tracking_type" },
                  { label: "Serial Number", value: (i) => i.serial_number || "—" },
                  { label: "Barcode", value: (i) => i.barcode || "—" },
                  { label: "Quantity", value: (i) => i.quantity ?? 1 },
                  { label: "Warehouse", key: "source_warehouse_name" },
                  { label: "Reference #", key: "reference_number" },
                  { label: "Dispatched By", key: "dispatched_by_name" },
                  { label: "Notes", key: "note" },
                ]}
                data={filteredItems}
                className="text-xs py-1 px-2.5"
              />
            </div>
          )}
        </div>

        {activeTab === "items" ? (
          <div className="space-y-3">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-lg">
                <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide block">
                  Total Dispatched Units
                </span>
                <span className="text-xl font-bold text-blue-900 dark:text-blue-100 font-mono">
                  {loading ? "..." : itemsData?.total_quantity ?? 0}
                </span>
              </div>
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-lg">
                <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide block">
                  Shipments / Batches
                </span>
                <span className="text-xl font-bold text-indigo-900 dark:text-indigo-100 font-mono">
                  {loading ? "..." : itemsData?.total_items ?? 0}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block">
                  Site Location
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {project.location || "—"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block">
                  Contact
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {project.contact_info || "—"}
                </span>
              </div>
            </div>

            {/* Filter / Search inside Assigned Items */}
            {allItems.length > 0 && (
              <div className="flex items-center gap-2">
                <SearchBox
                  value={search}
                  onChange={setSearch}
                  placeholder="Filter items by product name, serial, barcode, warehouse..."
                  className="w-full text-xs"
                />
              </div>
            )}

            {/* Items Table */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Date &amp; Time</th>
                      <th className="py-2.5 px-3">Product Name &amp; Code</th>
                      <th className="py-2.5 px-3">Variant / SKU</th>
                      <th className="py-2.5 px-3">Serial / Barcode</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3">Source WH</th>
                      <th className="py-2.5 px-3">Ref #</th>
                      <th className="py-2.5 px-3">Dispatched By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400">
                          <div className="inline-flex items-center gap-2">
                            <Clock className="animate-spin text-blue-500" size={16} />
                            <span>Loading assigned items...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center">
                          <Package size={36} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {search.trim() ? "No matching items found" : "No items assigned to this project yet"}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            {search.trim()
                              ? "Try clearing your search query above."
                              : "When you stock out items and select this project as the destination, all dispatched items will appear here."}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, idx) => (
                        <tr
                          key={item.id || idx}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-2 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {formatBDDateTime(item.dispatched_at)}
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
                            <span className="inline-block px-2 py-0.5 rounded-full font-bold font-mono text-xs bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                              -{item.quantity}
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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
