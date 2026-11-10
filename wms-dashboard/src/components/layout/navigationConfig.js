import {
  LayoutDashboard,
  Users,
  Warehouse,
  Package,
  Barcode as BarcodeIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  CheckCircle2,
  ClipboardList,
  Wrench,
  ShieldCheck,
  FileBarChart,
  Building2,
  Truck,
  Settings,
  Percent,
  Radar,
  Boxes,
  AlertTriangle,
  TrendingDown,
  FolderKanban,
} from "lucide-react";

export const SECTION_PATHS = {
  overview: "/",
  users: "/users",
  customers: "/customers",
  suppliers: "/suppliers",
  warehouses: "/warehouses",
  products: "/products",
  barcode: "/barcode",
  stockin: "/stock-in",
  stockout: "/stock-out",
  transfer: "/transfer",
  approvals: "/approvals",
  inventory: "/inventory",
  tracking: "/tracking",
  returns: "/returns",
  warranty: "/warranty",
  reports: "/reports",
  report_stock_summary: "/reports/stock-summary",
  report_movement: "/reports/inventory-movement",
  report_low_stock: "/reports/low-stock",
  report_stock_sell: "/reports/stock-sell",
  report_servicing: "/reports/servicing",
  projects: "/projects",
  project_reports: "/projects/reports",
  settings: "/settings",
};

export const NAV = [
  { title: "Overview", items: [{ id: "overview", label: "Dashboard", icon: LayoutDashboard, path: SECTION_PATHS.overview }] },
  {
    title: "Setup",
    items: [
      { id: "users", label: "Users & Roles", icon: Users, path: SECTION_PATHS.users, permission: "user_read" },
      { id: "customers", label: "Customers", icon: Building2, path: SECTION_PATHS.customers, permission: "customer_read" },
      { id: "suppliers", label: "Suppliers", icon: Truck, path: SECTION_PATHS.suppliers, permission: "supplier_read" },
      { id: "warehouses", label: "Warehouses", icon: Warehouse, path: SECTION_PATHS.warehouses, permission: "warehouse_read" },
      { id: "products", label: "Products", icon: Package, path: SECTION_PATHS.products, permission: "product_read" },
      { id: "barcode", label: "Barcode", icon: BarcodeIcon, path: SECTION_PATHS.barcode, permission: "barcode_read" },
    ],
  },
  {
    title: "Operations",
    items: [
      { id: "stockin", label: "Stock In", icon: ArrowDownToLine, path: SECTION_PATHS.stockin, permission: "stock_in_read" },
      { id: "stockout", label: "Stock Out", icon: ArrowUpFromLine, path: SECTION_PATHS.stockout, permission: "stock_out_read" },
      { id: "transfer", label: "Transfer", icon: ArrowLeftRight, path: SECTION_PATHS.transfer, permission: "transfer_read" },
      { id: "approvals", label: "Approvals", icon: CheckCircle2, path: SECTION_PATHS.approvals, permission: "approval_read" },
    ],
  },
  {
    title: "Monitor",
    items: [
      { id: "inventory", label: "Inventory View", icon: ClipboardList, path: SECTION_PATHS.inventory, permission: "inventory_read" },
      { id: "tracking", label: "Tracking", icon: Radar, path: SECTION_PATHS.tracking, permission: "tracking_read" },
      { id: "returns", label: "Returns & Servicing", icon: Wrench, path: SECTION_PATHS.returns, permission: "return_read" },
      { id: "warranty", label: "Warranty", icon: ShieldCheck, path: SECTION_PATHS.warranty, permission: "warranty_read" },
    ],
  },
  {
    title: "Reports",
    icon: FileBarChart,
    items: [
      { id: "report_stock_summary", label: "Stock Summary", icon: Boxes, path: SECTION_PATHS.report_stock_summary, permission: "report_read" },
      { id: "report_movement", label: "Inventory Movement", icon: ArrowLeftRight, path: SECTION_PATHS.report_movement, permission: "report_read" },
      { id: "report_low_stock", label: "Low Stock Report", icon: AlertTriangle, path: SECTION_PATHS.report_low_stock, permission: "report_read" },
      { id: "report_stock_sell", label: "Stock Sell Report", icon: TrendingDown, path: SECTION_PATHS.report_stock_sell, permission: "report_read" },
      { id: "report_servicing", label: "Servicing Report", icon: Wrench, path: SECTION_PATHS.report_servicing, permission: "report_read" },
    ],
  },
  {
    title: "Projects",
    icon: FolderKanban,
    items: [
      { id: "projects", label: "Projects", icon: FolderKanban, path: SECTION_PATHS.projects, permission: "project_read" },
      { id: "project_reports", label: "Reports", icon: FileBarChart, path: SECTION_PATHS.project_reports, permission: "project_read" },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    items: [
      { id: "settings", label: "Tax", icon: Percent, path: SECTION_PATHS.settings, permission: "tax_read" },
    ],
  },
];

export function getSectionFromPath(pathname) {
  const normalized = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  // 1. Exact match first
  const exactMatch = Object.entries(SECTION_PATHS).find(([, path]) => path === normalized);
  if (exactMatch) return exactMatch[0];

  // 2. Longest prefix match next
  const prefixMatches = Object.entries(SECTION_PATHS)
    .filter(([, path]) => path !== "/" && normalized.startsWith(`${path}/`))
    .sort((a, b) => b[1].length - a[1].length);

  if (prefixMatches.length > 0) return prefixMatches[0][0];

  return "overview";
}

export function hasPermission(user, permission) {
  if (!permission) return true;

  const roleName = String(user?.role?.name || user?.role || user?.roleObject?.name || "").toLowerCase();
  if (["admin", "administrator", "super administrator", "superadmin"].includes(roleName)) return true;

  const perms = user?.permissions || user?.role?.permissions || user?.roleObject?.permissions || [];
  if (permission === "approval_read") {
    return perms.some((item) => {
      const name = typeof item === "string" ? item : item?.name;
      return (
        name === "approval_read" ||
        name === "stock_in_approve" ||
        name === "stock_out_approve" ||
        name === "transfer_approve"
      );
    });
  }

  return perms.some((item) => {
    const permissionName = typeof item === "string" ? item : item?.name;
    return permissionName === permission;
  });
}

export function filterNavigationByPermissions(nav, user) {
  return nav
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasPermission(user, item.permission)),
    }))
    .filter((group) => group.items.length > 0);
}

export const LABELS = {
  overview: "Dashboard",
  users: "Users & Roles",
  customers: "Customers",
  suppliers: "Suppliers",
  warehouses: "Warehouses",
  products: "Products",
  barcode: "Barcode",
  stockin: "Stock In",
  stockout: "Stock Out",
  transfer: "Transfer",
  approvals: "Approval Workflow",
  inventory: "Stock / Inventory View",
  tracking: "Product Tracking",
  returns: "Returns & Servicing",
  warranty: "Warranty Management",
  reports: "Reports & Analytics",
  report_stock_summary: "Stock Summary Report",
  report_movement: "Inventory Movement Report",
  report_low_stock: "Low Stock Report",
  report_stock_sell: "Stock Sell Report",
  report_servicing: "Servicing Report",
  projects: "Projects",
  project_reports: "Project Reports",
  settings: "Tax Rules",
};

export const DESCRIPTIONS = {
  overview: "Snapshot of everything happening across your warehouses today.",
  users: "Create roles with custom permissions and manage staff access.",
  customers: "Manage customer accounts, business types, and delivery details.",
  suppliers: "Manage supplier accounts, contact info, and delivery addresses.",
  warehouses: "Add and manage every warehouse location.",
  products: "Manage your product catalog, categories, and tracking mode.",
  barcode: "",
  stockin: "",
  stockout: "",
  transfer: "Move stock between warehouses, customers, or custom locations.",
  approvals: "",
  inventory: "",
  returns: "Track returned and faulty items through the repair process.",
  warranty: "Track warranty coverage and claims per item.",
  reports: "Export reports and monitor overall activity.",
  report_stock_summary: "Product stock balance, on-hand counts, and warehouse distribution.",
  report_movement: "Complete audit trail of all warehouse stock in/out and transfer movements.",
  report_low_stock: "Critical shortage items below minimum required safety stock levels.",
  report_stock_sell: "Customer sales dispatches, delivery references, and sold quantities.",
  report_servicing: "Service tickets received, in repair, finished, and delivered for a date range.",
  projects: "Create new projects, track site locations, codes, and contact info.",
  project_reports: "View analytics, progress, and stock distribution per project.",
  settings: "Create and manage tax rules to assign to products.",
};
