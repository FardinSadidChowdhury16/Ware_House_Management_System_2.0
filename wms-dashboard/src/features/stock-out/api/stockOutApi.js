import { httpClient } from "../../../core/api/httpClient.js";

export const stockOutApi = {
  async listMovements(params = {}) {
    const { data } = await httpClient.get("/inventory/movements", {
      params: { ...params, direction: "out" },
    });
    return data;
  },
  /** Submit stock-out — routes to approval queue with operation_type = stock_out */
  async createStockOut(payload) {
    const { data } = await httpClient.post("/approvals/stock-out", payload);
    return data;
  },
  async listWarehouses() {
    const { data } = await httpClient.get("/warehouses");
    return Array.isArray(data) ? data : data.items || data.data || [];
  },
  async listCustomers() {
    const { data } = await httpClient.get("/customers");
    return Array.isArray(data) ? data : data.customers || data.items || data.data || [];
  },
  async listProductsSummary() {
    const { data } = await httpClient.get("/products/summary");
    return Array.isArray(data) ? data : data.items || data.data || [];
  },
  /** Barcode lookup — checks if product/variant exists and returns available stock */
  async barcodeLookup(barcode, warehouseId) {
    const { data } = await httpClient.get("/inventory/barcode-lookup", {
      params: { barcode, warehouse_id: warehouseId || undefined, purpose: "stock_out" },
    });
    return data;
  },
  /** Get a single customer's details for modal */
  async getCustomerDetail(customerId) {
    const { data } = await httpClient.get(`/customers/${customerId}`);
    return data;
  },
};
