export const PERMISSION_MODULE_GROUPS = [
  {
    id: "users",
    name: "Users & Access Control",
    icon: "Users",
    permissions: [
      { key: "user_read", action: "read", label: "User Read", description: "View user accounts, roles and permission assignments" },
      { key: "user_write", action: "write", label: "User Write", description: "Create, update, manage and deactivate user accounts and roles" },
    ],
  },
  {
    id: "warehouses",
    name: "Warehouses & Facilities",
    icon: "Building2",
    permissions: [
      { key: "warehouse_read", action: "read", label: "Warehouse Read", description: "View warehouse locations, codes and details" },
      { key: "warehouse_write", action: "write", label: "Warehouse Write", description: "Create, edit and manage warehouses and storage configurations" },
    ],
  },
  {
    id: "suppliers",
    name: "Suppliers & Vendors",
    icon: "Truck",
    permissions: [
      { key: "supplier_read", action: "read", label: "Supplier Read", description: "View supplier contact directory and profile information" },
      { key: "supplier_write", action: "write", label: "Supplier Write", description: "Create, edit and manage supplier profiles and ledger details" },
    ],
  },
  {
    id: "customers",
    name: "Customers & Clients",
    icon: "UserCheck",
    permissions: [
      { key: "customer_read", action: "read", label: "Customer Read", description: "View customer profiles, contacts and order history" },
      { key: "customer_write", action: "write", label: "Customer Write", description: "Create, edit and manage customer records and accounts" },
    ],
  },
  {
    id: "products",
    name: "Products & Catalog",
    icon: "Package",
    permissions: [
      { key: "product_read", action: "read", label: "Product Read", description: "View products, categories, variants and pricing" },
      { key: "product_write", action: "write", label: "Product Write", description: "Create, modify, configure and manage products & variants" },
    ],
  },
  {
    id: "barcode",
    name: "Barcode System",
    icon: "Barcode",
    permissions: [
      { key: "barcode_read", action: "read", label: "Barcode Read", description: "Scan, search and view generated barcodes" },
      { key: "barcode_write", action: "write", label: "Barcode Write", description: "Generate dynamic barcodes and print barcode sheets" },
    ],
  },
  {
    id: "stock_in",
    name: "Stock In (Inbound)",
    icon: "ArrowDownToLine",
    permissions: [
      { key: "stock_in_read", action: "read", label: "Stock In Read", description: "View stock-in logs, purchase orders and intake records" },
      { key: "stock_in_write", action: "write", label: "Stock In Write", description: "Submit new stock-in requests and intake serialized units" },
      { key: "stock_in_approve", action: "approve", label: "Stock In Approve", description: "Approve or reject pending stock-in requests and authorize inventory intake" },
    ],
  },
  {
    id: "stock_out",
    name: "Stock Out (Outbound)",
    icon: "ArrowUpFromLine",
    permissions: [
      { key: "stock_out_read", action: "read", label: "Stock Out Read", description: "View stock-out records, customer dispatches and sales orders" },
      { key: "stock_out_write", action: "write", label: "Stock Out Write", description: "Create stock-out orders and dispatch inventory items" },
      { key: "stock_out_approve", action: "approve", label: "Stock Out Approve", description: "Approve or reject pending stock-out dispatches" },
    ],
  },
  {
    id: "transfer",
    name: "Warehouse Transfers",
    icon: "ArrowLeftRight",
    permissions: [
      { key: "transfer_read", action: "read", label: "Transfer Read", description: "View inter-warehouse transfer requests and tracking history" },
      { key: "transfer_write", action: "write", label: "Transfer Write", description: "Initiate transfer orders to move inventory between warehouses" },
      { key: "transfer_approve", action: "approve", label: "Transfer Approve", description: "Approve or reject pending inter-warehouse transfers" },
    ],
  },
  {
    id: "inventory",
    name: "Inventory & Stock Overview",
    icon: "Boxes",
    permissions: [
      { key: "inventory_read", action: "read", label: "Inventory Read", description: "View stock overview, warehouse breakdown and serialized inventory" },
    ],
  },
  {
    id: "tracking",
    name: "Product Tracking",
    icon: "Crosshair",
    permissions: [
      { key: "tracking_read", action: "read", label: "Tracking Read", description: "Track specific serialized units, movement timelines and locations" },
    ],
  },
  {
    id: "approvals",
    name: "Approvals Center",
    icon: "ShieldCheck",
    permissions: [
      { key: "approval_read", action: "read", label: "Approval Read", description: "Access central approvals queue and review history" },
    ],
  },
  {
    id: "returns",
    name: "Returns Management",
    icon: "RotateCcw",
    permissions: [
      { key: "return_read", action: "read", label: "Return Read", description: "View customer & supplier returns, replacements and tickets" },
      { key: "return_write", action: "write", label: "Return Write", description: "Process return tickets, servicing and inventory restitution" },
    ],
  },
  {
    id: "warranty",
    name: "Warranty & Service Claims",
    icon: "FileCheck2",
    permissions: [
      { key: "warranty_read", action: "read", label: "Warranty Read", description: "View product warranties, service records and claim statuses" },
      { key: "warranty_write", action: "write", label: "Warranty Write", description: "Create warranty claims, log service progress and update tickets" },
    ],
  },
  {
    id: "reports",
    name: "Reports & Analytics",
    icon: "BarChart3",
    permissions: [
      { key: "report_read", action: "read", label: "Report Read", description: "View operational reports, analytics summaries and export data" },
    ],
  },
  {
    id: "settings",
    name: "Settings & Tax Rules",
    icon: "Settings",
    permissions: [
      { key: "tax_read", action: "read", label: "Tax Read", description: "View tax rates, calculations and financial rules" },
      { key: "tax_write", action: "write", label: "Tax Write", description: "Create, edit and manage tax rules and configurations" },
    ],
  },
];

// Flatted list strictly preserving Read -> Write -> Approve order within each module
export const PERMISSIONS = PERMISSION_MODULE_GROUPS.flatMap((group) =>
  group.permissions.map((p) => p.key)
);

export const PERMISSION_LABELS = PERMISSION_MODULE_GROUPS.reduce((acc, group) => {
  group.permissions.forEach((p) => {
    acc[p.key] = `${p.label} (${p.description})`;
  });
  return acc;
}, {});

export function formatPermissionLabel(perm) {
  if (!perm) return "";
  const name = typeof perm === "string" ? perm : perm.name;
  return PERMISSION_LABELS[name] || name.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export const WH_OPTIONS = [
  "All warehouses",
  "No warehouse",
  "Dhaka Central Warehouse",
  "Chattogram Warehouse",
  "Sylhet Warehouse",
];

export const DEFAULT_USER_FORM = {
  name: "",
  email: "",
  password: "",
  role: "None",
  warehouseIds: [],
  status: "Active",
};

export const DEFAULT_ROLE_PERMISSIONS = ["user_read", "user_write", "product_read"];
