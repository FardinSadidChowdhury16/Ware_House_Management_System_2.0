import { httpClient } from "../../../core/api/httpClient.js";

function normalizeSerializedItem(item) {
  return {
    ...item,
    id: String(item.id),
    serial: item.serial_number || item.serial || "",
    serial_number: item.serial_number || item.serial || "",
    barcode: item.barcode || item.effective_barcode || item.serial_number || item.serial || "",
    product_name: item.product_name || "",
    warehouse_name: item.warehouse_name || "",
    variant_name: item.variant_name || "",
    selling_price: Number(item.selling_price) || 0,
    status: item.status || "in_stock",
  };
}

export const inventoryApi = {
  async listSerializedItems(params = {}) {
    try {
      const { data } = await httpClient.get("/inventory/items", { params });
      const rawList = Array.isArray(data) ? data : [];
      return rawList.map(normalizeSerializedItem);
    } catch {
      return [];
    }
  },

  async createSerializedItem(payload) {
    const { data } = await httpClient.post("/inventory/items", payload);
    return normalizeSerializedItem(data);
  },

  async listBulkStock(params = {}) {
    try {
      const { data } = await httpClient.get("/inventory/bulk", { params });
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async createMovement(payload) {
    const body = {
      product_id: Number(payload.product_id) || 1,
      variant_id: payload.variant_id ? Number(payload.variant_id) : undefined,
      product_item_id: payload.product_item_id ? Number(payload.product_item_id) : undefined,
      movement_type: payload.movement_type || "ADJUSTMENT_IN",
      quantity: Number(payload.quantity) || 1,
      from_warehouse_id: payload.from_warehouse_id ? Number(payload.from_warehouse_id) : undefined,
      to_warehouse_id: payload.to_warehouse_id ? Number(payload.to_warehouse_id) : undefined,
      supplier_id: payload.supplier_id ? Number(payload.supplier_id) : undefined,
      customer_id: payload.customer_id ? Number(payload.customer_id) : undefined,
      note: payload.note || "",
    };
    const { data } = await httpClient.post("/inventory/movements", body);
    return data;
  },

  async sellSerializedItem(serialNumber, payload = {}) {
    const body = {
      reference_number: payload.reference_number || `SO-${Date.now()}`,
      notes: payload.notes || "",
    };
    const { data } = await httpClient.post(`/inventory/items/${encodeURIComponent(serialNumber)}/sell`, body);
    return normalizeSerializedItem(data);
  },

  async getWarehouseSummary(params = {}) {
    try {
      const { data } = await httpClient.get("/inventory/warehouse-summary", { params });
      return data;
    } catch {
      return {
        selected_warehouse: null,
        warehouses: [],
        summary: {
          total_products: 0,
          total_in_stock: 0,
          total_stock_in: 0,
          total_stock_out: 0,
          total_transfer_in: 0,
          total_transfer_out: 0,
          total_transfers: 0,
          total_received: 0,
          total_customer: 0,
          total_servicing: 0,
        },
        items: [],
      };
    }
  },

  async trackByBarcode(barcode) {
    const { data } = await httpClient.get("/inventory/tracking", {
      params: { barcode: String(barcode).trim() },
    });
    return data;
  },

  async listMovements(params = {}) {
    const { data } = await httpClient.get("/inventory/movements", { params });
    return data;
  },

  async getSalesReport(params = {}) {
    const { data } = await httpClient.get("/inventory/sales-report", { params });
    return data;
  },
};
