const COLOR_MAP = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  red: "bg-red-50 text-red-700 border-red-100",
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  violet: "bg-violet-50 text-violet-700 border-violet-100",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_COLOR = {
  Active: "emerald",
  Inactive: "slate",
  Deactivated: "slate",
  Requested: "amber",
  Approved: "blue",
  Sent: "blue",
  "In Transit": "blue",
  Received: "emerald",
  Pending: "amber",
  Rejected: "red",
  "Received for Service": "amber",
  "Under Repair": "violet",
  Repaired: "emerald",
  Scrapped: "red",
  New: "emerald",
  "Return for Servicing": "amber",
  Damaged: "red",
  "Active-Warranty": "emerald",
  "Expiring Soon": "amber",
  Expired: "red",
  "With Project": "blue",
  "With Customer": "blue",
  Delivered: "emerald",
  Generated: "blue",
  Printed: "emerald",
};

export function StatusPill({ status }) {
  const color = STATUS_COLOR[status] || "slate";
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${COLOR_MAP[color]}`}>
      {status}
    </span>
  );
}
