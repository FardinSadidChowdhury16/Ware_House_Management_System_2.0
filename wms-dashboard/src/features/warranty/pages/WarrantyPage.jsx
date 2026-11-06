import { useState } from "react";
import { 
  Eye, ShieldCheck, XCircle, 
  Package, Calendar, User
} from "lucide-react";
import {
  Badge, Card, StatCard, GhostButton,
  Th, Td, Toolbar, SearchBox, Select, EmptyTable,
  Modal, Pagination, DateRangeFilter, ExportCSVButton
} from "../../../components/ui/index.js";
import { useWarranty } from "../hooks/useWarranty.js";
import { useWarehouseFilter } from "../../../app/context/WarehouseFilterContext.jsx";

// ─── Null Helper Component ──────────────────────────────────────────────────
function NullValue({ value, mono = false }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-slate-400 font-mono italic text-xs">Null</span>;
  }
  return <span className={mono ? "font-mono" : ""}>{value}</span>;
}

// ─── Status Badge Helper ────────────────────────────────────────────────────
function WarrantyStatusBadge({ status }) {
  if (status === "active") {
    return (
      <Badge color="emerald">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck size={12} />
          Active
        </span>
      </Badge>
    );
  }
  if (status === "expired") {
    return (
      <Badge color="red">
        <span className="inline-flex items-center gap-1">
          <XCircle size={12} />
          Expired
        </span>
      </Badge>
    );
  }
  return (
    <Badge color="slate">
      <span className="inline-flex items-center gap-1 text-slate-500">
        No Warranty
      </span>
    </Badge>
  );
}

// ─── Remain Days Cell Component ─────────────────────────────────────────────
function RemainDaysCell({ remainDays, status }) {
  if (remainDays === null || remainDays === undefined) {
    return <NullValue value={null} />;
  }
  if (status === "expired" || remainDays <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle size={12} /> Expired (0 days)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
      <ShieldCheck size={12} /> {remainDays} days
    </span>
  );
}

// ─── Warranty Details Modal ─────────────────────────────────────────────────
function WarrantyDetailModal({ warranty, onClose }) {
  if (!warranty) return null;

  return (
    <Modal
      isOpen={!!warranty}
      onClose={onClose}
      title="Warranty Details"
      size="md"
      footer={<GhostButton onClick={onClose}>Close</GhostButton>}
    >
      <div className="space-y-4">
        {/* Header Status Banner */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-slate-500" />
            <span className="font-semibold text-slate-800 text-sm">
              {warranty.product_name || "Product"}
            </span>
          </div>
          <WarrantyStatusBadge status={warranty.status} />
        </div>

        {/* Core Requested Fields: Start Date, End Date, Customer Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
              <Calendar size={13} className="text-emerald-600" /> Start Date
            </p>
            <p className="text-sm font-semibold text-slate-800 font-mono">
              <NullValue value={warranty.start_date} />
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
              <Calendar size={13} className="text-rose-600" /> End Date
            </p>
            <p className="text-sm font-semibold text-slate-800 font-mono">
              <NullValue value={warranty.end_date} />
            </p>
          </div>

          <div className="sm:col-span-2 border-t border-slate-100 pt-2.5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
              <User size={13} className="text-blue-600" /> Customer Name
            </p>
            <p className="text-sm font-semibold text-slate-800">
              <NullValue value={warranty.customer_name} />
            </p>
          </div>
        </div>

        {/* Additional Product & Item Details */}
        <div className="space-y-2 border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500">Item:</span>
            <span className="font-semibold text-slate-800">
              <NullValue value={warranty.item} />
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500">Barcode:</span>
            <span className="font-mono text-slate-800">
              <NullValue value={warranty.barcode} />
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Remaining Days:</span>
            <span>
              <RemainDaysCell remainDays={warranty.remain_days} status={warranty.status} />
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Warranty Page Component ───────────────────────────────────────────
export function WarrantyPage() {
  const { selectedWarehouseId } = useWarehouseFilter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expireFrom, setExpireFrom] = useState("");
  const [expireTo, setExpireTo] = useState("");
  const [selectedWarranty, setSelectedWarranty] = useState(null);

  const queryParams = {
    page,
    page_size: 10,
    search: search.trim() || undefined,
    status: statusFilter || undefined,
    expire_from: expireFrom || undefined,
    expire_to: expireTo || undefined,
    warehouse_id: selectedWarehouseId ?? undefined,
  };

  const {
    warranties,
    totalWarranties,
    totalPages,
    stats,
    isLoading,
  } = useWarranty(queryParams);

  return (
    <div className="space-y-5">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Items"
          value={isLoading ? "..." : stats.total}
          icon={Package}
          tint="slate"
        />
        <StatCard
          label="Active Warranty"
          value={isLoading ? "..." : stats.active}
          icon={ShieldCheck}
          tint="emerald"
        />
        <StatCard
          label="Expired"
          value={isLoading ? "..." : stats.expired}
          icon={XCircle}
          tint="red"
        />
        <StatCard
          label="No Warranty"
          value={isLoading ? "..." : stats.no_warranty}
          icon={Calendar}
          tint="slate"
        />
      </div>

      {/* Action Toolbar & Filters */}
      <Toolbar
        className="flex-nowrap gap-2.5 overflow-x-auto pb-1"
        innerClassName="flex-nowrap gap-2.5 min-w-0"
        action={
          <ExportCSVButton
            filename="warranties"
            columns={[
              { label: "Barcode", value: (w) => w.barcode || "—" },
              { label: "Item", value: (w) => w.variant_name || w.item_name || "—" },
              { label: "Product Name", value: (w) => w.product_name || "—" },
              { label: "SKU", value: (w) => w.sku || "—" },
              { label: "Customer", value: (w) => w.customer_name || "—" },
              { label: "Customer Phone", value: (w) => w.customer_phone || "—" },
              { label: "Warehouse", value: (w) => w.warehouse_name || "—" },
              { label: "Start Date", value: (w) => w.start_date || w.warranty_start || "—" },
              { label: "End Date", value: (w) => w.end_date || w.warranty_end || "—" },
              { label: "Remain Days", value: (w) => (w.remain_days !== null && w.remain_days !== undefined ? w.remain_days : "—") },
              { label: "Status", value: (w) => w.status || "—" },
            ]}
            data={warranties}
          />
        }
      >
        <SearchBox
          placeholder="Search barcode, item, product, customer..."
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          className="min-w-[180px] max-w-xs shrink-0"
        />

        {/* Calendar Date Picker Filter based on Expiry Date */}
        <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Expire Date:</span>
          <DateRangeFilter
            fromDate={expireFrom}
            toDate={expireTo}
            onFromDateChange={(val) => {
              setExpireFrom(val);
              setPage(1);
            }}
            onToDateChange={(val) => {
              setExpireTo(val);
              setPage(1);
            }}
          />
        </div>

        {/* Status Dropdown Field */}
        <div className="w-44 shrink-0">
          <Select
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            placeholder="Status"
            options={[
              { label: "Active", value: "active" },
              { label: "Expired", value: "expired" },
              { label: "No Warranty", value: "no_warranty" },
            ]}
          />
        </div>
      </Toolbar>

      {/* Main Table Card */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Barcode</Th>
                <Th>Item</Th>
                <Th>Product Name</Th>
                <Th>Remain Days</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-sm text-slate-400">
                    Loading warranties...
                  </td>
                </tr>
              ) : warranties.length === 0 ? (
                <EmptyTable cols={5} message="No product warranties found matching filters." />
              ) : (
                warranties.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/50">
                    {/* 1. Barcode */}
                    <Td mono className="text-xs font-medium text-slate-800">
                      <NullValue value={w.barcode} mono />
                    </Td>

                    {/* 2. Item */}
                    <Td className="text-xs font-semibold text-slate-800">
                      <NullValue value={w.item} />
                      {w.sku && w.sku !== w.item && (
                        <span className="block text-[11px] text-slate-400 font-mono font-normal">
                          SKU: {w.sku}
                        </span>
                      )}
                    </Td>

                    {/* 3. Product Name */}
                    <Td className="text-sm font-medium text-slate-900">
                      <NullValue value={w.product_name} />
                      {w.product_code && (
                        <span className="block text-[11px] text-slate-400 font-mono">
                          {w.product_code}
                        </span>
                      )}
                    </Td>

                    {/* 4. Remain Days */}
                    <Td>
                      <RemainDaysCell remainDays={w.remain_days} status={w.status} />
                    </Td>

                    {/* 5. View Button */}
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedWarranty(w)}
                        title="View warranty details"
                        className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800"
                      >
                        <Eye size={13} /> View
                      </button>
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
          total={totalWarranties}
          totalPages={totalPages}
          onPageChange={setPage}
          itemName="items"
        />
      </Card>

      {/* View Details Modal */}
      <WarrantyDetailModal
        warranty={selectedWarranty}
        onClose={() => setSelectedWarranty(null)}
      />
    </div>
  );
}
