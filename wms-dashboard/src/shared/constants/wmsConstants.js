export const WH_OPTIONS = ["Dhaka Central Warehouse", "Chattogram Warehouse", "Sylhet Warehouse"];
export const PRODUCT_OPTIONS = ["Li-ion Battery 2200mAh", "USB-C Dongle Adapter", "65W GaN Fast Charger", "20W Standard Charger"];

export const productCatalog = [
  { name: "Li-ion Battery 2200mAh", sku: "BAT-2200-BLK", tracking: "Serialized", warrantyMonths: 24 },
  { name: "USB-C Dongle Adapter", sku: "DNG-USBC-01", tracking: "Bulk", warrantyMonths: 12 },
  { name: "65W GaN Fast Charger", sku: "CHG-65W-GAN", tracking: "Serialized", warrantyMonths: 24 },
  { name: "20W Standard Charger", sku: "CHG-20W-STD", tracking: "Bulk", warrantyMonths: 12 },
];

export const ROLE_OPTIONS = ["Admin", "Warehouse Manager", "Staff", "Service Technician"];
export const PERMISSIONS = ["View Stock", "Add Stock", "Remove Stock", "Transfer Stock", "Approve Requests", "Manage Users", "View Reports"];
export const SERVICE_PROBLEM_TYPES = [
  "Does not charge",
  "Physical damage",
  "Battery swelling",
  "Port / connector issue",
  "Software / firmware",
  "Warranty claim",
  "Other",
];
export const SERVICE_STATUSES = ["Received for Service", "Under Repair", "Repaired", "Scrapped"];
