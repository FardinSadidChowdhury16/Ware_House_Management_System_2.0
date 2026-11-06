import { httpClient } from "../../../core/api/httpClient.js";

export const stockInApi = {
  async listMovements(params = {}) {
    const { data } = await httpClient.get("/inventory/movements", {
      params: { ...params, direction: "in" },
    });
    return data;
  },
  async getStats() {
    const { data } = await httpClient.get("/inventory/stats");
    return data;
  },
  /** Submit stock-in — now routes to approval queue */
  async createStockIn(payload) {
    const { data } = await httpClient.post("/approvals/stock-in", payload);
    return data;
  },
  async listWarehouses() {
    const { data } = await httpClient.get("/warehouses");
    return Array.isArray(data) ? data : data.items || data.data || [];
  },
  async listSuppliers() {
    const { data } = await httpClient.get("/suppliers");
    return Array.isArray(data) ? data : data.suppliers || data.items || data.data || [];
  },
  async listProductsSummary() {
    const { data } = await httpClient.get("/products/summary");
    return Array.isArray(data) ? data : data.items || data.data || [];
  },
  /** Barcode lookup — returns product+variant info or duplicate warning */
  async barcodeLookup(barcode) {
    const { data } = await httpClient.get("/inventory/barcode-lookup", {
      params: { barcode, purpose: "stock_in" },
    });
    return data;
  },
  /** Get a single supplier's details for the info modal */
  async getSupplierDetail(supplierId) {
    const { data } = await httpClient.get(`/suppliers/${supplierId}`);
    return data;
  },
};

