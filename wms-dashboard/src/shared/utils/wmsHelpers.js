import { productCatalog, serializedUnitsSeed } from "../data/mockSeeds.js";

export function getProductByName(name) {
  return productCatalog.find((p) => p.name === name);
}

export function getAvailableUnits(productName, warehouse) {
  const prod = getProductByName(productName);
  if (!prod || prod.tracking !== "Serialized") return [];
  return serializedUnitsSeed.filter(
    (u) => u.sku === prod.sku && u.warehouse === warehouse && u.status === "In Stock"
  );
}

export function formatItemSummary(product, tracking, qty, serials = []) {
  const short = product.split(" ").slice(-1)[0] || product;
  if (tracking === "Serialized" && serials.length > 0) {
    const shown = serials.slice(0, 2).join(", ");
    const more = serials.length > 2 ? ` +${serials.length - 2}` : "";
    return `${serials.length}x ${short} (${shown}${more})`;
  }
  return `${qty}x ${short}`;
}

export function addMonthsToDate(dateStr, months) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
