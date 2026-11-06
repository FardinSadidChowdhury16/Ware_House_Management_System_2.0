export { productCatalog } from "../constants/wmsConstants.js";

export const warehousesSeed = [
  { code: "DHK-01", name: "Dhaka Central Warehouse", address: "Tejgaon I/A, Dhaka", items: 4820, status: "Active" },
  { code: "CTG-01", name: "Chattogram Warehouse", address: "Agrabad, Chattogram", items: 2210, status: "Active" },
  { code: "SYL-01", name: "Sylhet Warehouse", address: "Amberkhana, Sylhet", items: 640, status: "Inactive" },
];

export const productsSeed = [
  {
    sku: "BAT-2200-BLK",
    name: "Li-ion Battery 2200mAh",
    category: "Battery",
    tracking: "Serialized",
    stock: 1240,
    min: 300,
    details: "Rechargeable pack for SOLshare meters",
    warrantyMonths: 24,
  },
  {
    sku: "DNG-USBC-01",
    name: "USB-C Dongle Adapter",
    category: "Dongle",
    tracking: "Bulk",
    stock: 85,
    min: 100,
    details: "USB-C to micro adapter, boxed in 10s",
    warrantyMonths: 12,
  },
  {
    sku: "CHG-65W-GAN",
    name: "65W GaN Fast Charger",
    category: "Charger",
    tracking: "Serialized",
    stock: 410,
    min: 150,
    details: "GaN wall charger, 65W PD",
    warrantyMonths: 24,
  },
  {
    sku: "CHG-20W-STD",
    name: "20W Standard Charger",
    category: "Charger",
    tracking: "Bulk",
    stock: 52,
    min: 120,
    details: "Basic 20W USB-C charger",
    warrantyMonths: 12,
  },
];

export const serializedUnitsSeed = [
  { serial: "SN-88041", sku: "BAT-2200-BLK", warehouse: "Dhaka Central Warehouse", location: "Dhaka Central Warehouse", locationType: "Warehouse", condition: "New", warrantyStart: "2025-06-01", warrantyEnd: "2027-06-01", status: "In Stock" },
  { serial: "SN-88213", sku: "CHG-65W-GAN", warehouse: "Dhaka Central Warehouse", location: "Rahim Store", locationType: "Customer", condition: "Delivered", warrantyStart: "2026-01-10", warrantyEnd: "2028-01-10", status: "With Customer" },
  { serial: "SN-88410", sku: "CHG-65W-GAN", warehouse: "Dhaka Central Warehouse", location: "Dhaka Central Warehouse", locationType: "Warehouse", condition: "Return for Servicing", warrantyStart: "2025-08-15", warrantyEnd: "2027-08-15", status: "Under Repair" },
  { serial: "SN-88532", sku: "BAT-2200-BLK", warehouse: "Chattogram Warehouse", location: "Chattogram Warehouse", locationType: "Warehouse", condition: "New", warrantyStart: "2026-03-01", warrantyEnd: "2028-03-01", status: "In Stock" },
  { serial: "SN-88601", sku: "BAT-2200-BLK", warehouse: "Dhaka Central Warehouse", location: "In Transit → Chattogram", locationType: "In Transit", condition: "New", warrantyStart: "2026-07-01", warrantyEnd: "2028-07-01", status: "In Transit" },
];

export const productLocationSeed = {
  "BAT-2200-BLK": [
    { location: "Dhaka Central Warehouse", type: "Warehouse", condition: "New", qty: 980 },
    { location: "Dhaka Central Warehouse", type: "Warehouse", condition: "Return", qty: 40 },
    { location: "Dhaka Central Warehouse", type: "Warehouse", condition: "Under Repair", qty: 12 },
    { location: "Chattogram Warehouse", type: "Warehouse", condition: "New", qty: 180 },
    { location: "Rahim Store", type: "Customer", condition: "Delivered", qty: 25 },
    { location: "In Transit → Chattogram", type: "In Transit", condition: "New", qty: 3 },
  ],
  "DNG-USBC-01": [
    { location: "Dhaka Central Warehouse", type: "Warehouse", condition: "New", qty: 60 },
    { location: "Dhaka Central Warehouse", type: "Warehouse", condition: "Return", qty: 5 },
    { location: "Grameen Retail Rollout", type: "Project", condition: "With Project", qty: 320 },
    { location: "Sylhet Warehouse", type: "Warehouse", condition: "New", qty: 20 },
  ],
  "CHG-65W-GAN": [
    { location: "Chattogram Warehouse", type: "Warehouse", condition: "New", qty: 300 },
    { location: "Chattogram Warehouse", type: "Warehouse", condition: "Return", qty: 18 },
    { location: "Chattogram Warehouse", type: "Warehouse", condition: "Under Repair", qty: 6 },
    { location: "City Mart", type: "Customer", condition: "Delivered", qty: 120 },
    { location: "Dhaka Central Warehouse", type: "Warehouse", condition: "New", qty: 66 },
  ],
  "CHG-20W-STD": [
    { location: "Sylhet Warehouse", type: "Warehouse", condition: "New", qty: 40 },
    { location: "Sylhet Warehouse", type: "Warehouse", condition: "Return", qty: 4 },
    { location: "Sylhet Warehouse", type: "Warehouse", condition: "Damaged", qty: 2 },
    { location: "Dhaka Central Warehouse", type: "Warehouse", condition: "Scrapped", qty: 6 },
  ],
};

export const rolesSeed = [
  { name: "Admin", permissions: "All modules", users: 1 },
  { name: "Warehouse Manager", permissions: "Stock, Transfer, Approvals, Reports", users: 3 },
  { name: "Staff", permissions: "Stock In, Stock Out, Barcode Scan", users: 8 },
  { name: "Service Technician", permissions: "Returns & Servicing, Warranty", users: 2 },
];

export const staffUsersSeed = [
  { name: "Rafiq Ahmed", role: "Warehouse Manager", warehouse: "Dhaka Central Warehouse", status: "Active" },
  { name: "Nusrat Jahan", role: "Staff", warehouse: "Chattogram Warehouse", status: "Active" },
  { name: "Kamal Hossain", role: "Service Technician", warehouse: "Dhaka Central Warehouse", status: "Active" },
  { name: "Imran Kabir", role: "Staff", warehouse: "Sylhet Warehouse", status: "Deactivated" },
];

export const barcodesSeed = [
  { id: "SN-88410", type: "Unit", tracking: "Serialized", product: "65W GaN Fast Charger", code: "SN-88410", warehouse: "Dhaka Central Warehouse", status: "Printed" },
  { id: "SN-88532", type: "Unit", tracking: "Serialized", product: "Li-ion Battery 2200mAh", code: "SN-88532", warehouse: "Dhaka Central Warehouse", status: "Generated" },
  { id: "SN-88097", type: "Unit", tracking: "Serialized", product: "USB-C Dongle Adapter", code: "SN-88097", warehouse: "Chattogram Warehouse", status: "Printed" },
  { id: "BLK-DHK-DNG", type: "Product", tracking: "Bulk", product: "USB-C Dongle Adapter", code: "DNG-USBC-01|DHK-01", warehouse: "Dhaka Central Warehouse", copies: 1, status: "Printed" },
  { id: "BLK-SYL-CHG", type: "Product", tracking: "Bulk", product: "20W Standard Charger", code: "CHG-20W-STD|SYL-01", warehouse: "Sylhet Warehouse", copies: 5, status: "Generated" },
];

export const stockInSeed = [
  { id: "SIN-301", product: "65W GaN Fast Charger", tracking: "Serialized", qty: 2, serials: ["SN-88410", "SN-88411"], warehouse: "Dhaka Central Warehouse", condition: "New", tag: "—", status: "Pending", date: "2026-07-08" },
  { id: "SIN-300", product: "Li-ion Battery 2200mAh", tracking: "Serialized", qty: 100, serials: ["Bulk batch · 100 units"], warehouse: "Chattogram Warehouse", condition: "New", tag: "Grameen Retail Rollout", status: "Approved", date: "2026-07-07" },
  { id: "SIN-298", product: "20W Standard Charger", tracking: "Bulk", qty: 15, serials: [], warehouse: "Dhaka Central Warehouse", condition: "Return for Servicing", tag: "—", status: "Approved", date: "2026-07-05" },
];

export const stockOutSeed = [
  { id: "SOUT-220", product: "Li-ion Battery 2200mAh", tracking: "Serialized", qty: 2, serials: ["SN-88041", "SN-88532"], warehouse: "Dhaka Central Warehouse", destination: "Customer", tag: "Rahim Store", status: "Pending", date: "2026-07-08" },
  { id: "SOUT-219", product: "USB-C Dongle Adapter", tracking: "Bulk", qty: 30, serials: [], warehouse: "Chattogram Warehouse", destination: "Another Warehouse", tag: "—", status: "Approved", date: "2026-07-06" },
  { id: "SOUT-218", product: "65W GaN Fast Charger", tracking: "Serialized", qty: 1, serials: ["SN-88213"], warehouse: "Dhaka Central Warehouse", destination: "Customer", tag: "Rahim Store", status: "Approved", date: "2026-07-04" },
];

export const transfersSeed = [
  { id: "TRF-1042", product: "65W GaN Fast Charger", tracking: "Serialized", from: "Dhaka Central Warehouse", to: "Chattogram Warehouse", qty: 2, serials: ["SN-88410", "SN-88411"], items: "2x CHG-65W-GAN (SN-88410, SN-88411)", status: "In Transit", date: "2026-07-07" },
  { id: "TRF-1040", product: "Li-ion Battery 2200mAh", tracking: "Serialized", from: "Dhaka Central Warehouse", to: "Sylhet Warehouse", qty: 3, serials: ["SN-88041", "SN-88532", "SN-88601"], items: "3x BAT-2200-BLK (SN-88041, SN-88532 +1)", status: "Approved", date: "2026-07-08" },
  { id: "TRF-1041", product: "Li-ion Battery 2200mAh", tracking: "Serialized", from: "Chattogram Warehouse", to: "Customer - Rahim Store", qty: 1, serials: ["SN-88601"], items: "1x BAT-2200-BLK (SN-88601)", status: "Requested", date: "2026-07-07" },
  { id: "TRF-1039", product: "USB-C Dongle Adapter", tracking: "Bulk", from: "Dhaka Central Warehouse", to: "Sylhet Warehouse", qty: 25, serials: [], items: "25x DNG-USBC-01", status: "Received", date: "2026-07-03" },
  { id: "TRF-1037", product: "20W Standard Charger", tracking: "Bulk", from: "Sylhet Warehouse", to: "Repair Center - TechFix", qty: 5, serials: [], items: "5x CHG-20W-STD", status: "Approved", date: "2026-07-01" },
];

export const approvalQueueSeed = [
  { id: "APR-501", type: "Transfer", desc: "40x CHG-65W-GAN → Chattogram Warehouse", by: "Nusrat Jahan", date: "2026-07-08" },
  { id: "APR-502", type: "Stock Out", desc: "10x BAT-2200-BLK → Customer Rahim Store", by: "Rafiq Ahmed", date: "2026-07-08" },
  { id: "APR-503", type: "Returns/Servicing", desc: "Mark 3x CHG-20W-STD as Scrapped", by: "Kamal Hossain", date: "2026-07-07" },
];

export const categoriesSeed = ["Retail", "Wholesale", "Distributor", "Internal", "Government"];

export const projectTagsSeed = [
  { id: "PC-01", tag: "Grameen Retail Rollout", type: "Project", category: "Internal", items: 320, location: "Dhaka Central Warehouse" },
  { id: "PC-02", tag: "Rahim Store", type: "Customer", category: "Retail", items: 45, location: "In Transit" },
  { id: "PC-03", tag: "City Mart", type: "Customer", category: "Wholesale", items: 120, location: "Chattogram Warehouse" },
];

export const tagDetailsSeed = {
  "PC-01": [
    { product: "USB-C Dongle Adapter", identifier: "Bulk · 320 units", status: "With Project", location: "Dhaka Central Warehouse", date: "2026-06-02" },
  ],
  "PC-02": [
    { product: "Li-ion Battery 2200mAh", identifier: "SN-88041", status: "Sent", location: "In Transit", date: "2026-07-01" },
    { product: "65W GaN Fast Charger", identifier: "SN-88213", status: "Delivered", location: "With Customer", date: "2026-06-20" },
  ],
  "PC-03": [
    { product: "65W GaN Fast Charger", identifier: "Bulk · 120 units", status: "Delivered", location: "Chattogram Warehouse", date: "2026-05-15" },
  ],
};

export const inventorySeed = [
  { product: "Li-ion Battery 2200mAh", warehouse: "Dhaka Central Warehouse", nw: 980, ret: 40, rep: 12, dmg: 3, total: 1035 },
  { product: "USB-C Dongle Adapter", warehouse: "Dhaka Central Warehouse", nw: 60, ret: 5, rep: 0, dmg: 1, total: 66 },
  { product: "65W GaN Fast Charger", warehouse: "Chattogram Warehouse", nw: 300, ret: 18, rep: 6, dmg: 0, total: 324 },
  { product: "20W Standard Charger", warehouse: "Sylhet Warehouse", nw: 40, ret: 4, rep: 2, dmg: 2, total: 48 },
];

export const returnsSeed = [
  { id: "SN-88410", product: "65W GaN Fast Charger", warehouse: "Dhaka Central Warehouse", status: "Received for Service", problemType: "Does not charge", complaint: "Customer reports unit stopped charging after 2 months", source: "Stock In", stockInId: "SIN-295", date: "2026-07-06" },
  { id: "SN-88532", product: "Li-ion Battery 2200mAh", warehouse: "Dhaka Central Warehouse", status: "Received for Service", problemType: "Battery swelling", complaint: "Battery pack visibly swollen — safety hold", source: "Stock In", stockInId: "SIN-294", date: "2026-07-05" },
  { id: "SN-88097", product: "USB-C Dongle Adapter", warehouse: "Chattogram Warehouse", status: "Under Repair", problemType: "Port / connector issue", complaint: "USB port loose, intermittent connection", source: "Manual", stockInId: "—", date: "2026-07-02" },
  { id: "SN-87940", product: "20W Standard Charger", warehouse: "Sylhet Warehouse", status: "Repaired", problemType: "Physical damage", complaint: "Cable cut near plug — replaced", source: "Stock In", stockInId: "SIN-290", date: "2026-06-28" },
  { id: "SN-87650", product: "20W Standard Charger", warehouse: "Dhaka Central Warehouse", status: "Scrapped", problemType: "Other", complaint: "Beyond economical repair", source: "Manual", stockInId: "—", date: "2026-06-20" },
];

export const warrantySeed = [
  { serial: "SN-88213", product: "65W GaN Fast Charger", customer: "Rahim Store", end: "2027-01-10", status: "Active-Warranty" },
  { serial: "SN-88097", product: "Li-ion Battery 2200mAh", customer: "City Mart", end: "2026-08-02", status: "Expiring Soon" },
  { serial: "SN-87650", product: "20W Standard Charger", customer: "Walk-in Customer", end: "2025-05-01", status: "Expired" },
];

export const reportsSeed = [
  { name: "Stock by Warehouse", desc: "Current on-hand stock grouped by warehouse", category: "Inventory" },
  { name: "Stock by Condition", desc: "New / Return / Under Repair / Damaged breakdown", category: "Inventory" },
  { name: "Low Stock Report", desc: "Products below minimum stock level", category: "Inventory" },
  { name: "Warranty Status Report", desc: "Active, expiring soon, and expired warranties", category: "Warranty" },
  { name: "Activity Log", desc: "Full audit trail of every transaction", category: "Operations" },
  { name: "Transfer History", desc: "All warehouse and customer transfers", category: "Operations" },
];

export const activityFeed = [
  { text: "Nusrat Jahan requested Transfer TRF-1042", time: "10 min ago" },
  { text: "Rafiq Ahmed approved Stock Out APR-498", time: "42 min ago" },
  { text: "Kamal Hossain marked SN-87940 as Repaired", time: "1 hr ago" },
  { text: "System flagged USB-C Dongle Adapter as low stock", time: "2 hr ago" },
  { text: "New warehouse Sylhet Warehouse added", time: "Yesterday" },
];
