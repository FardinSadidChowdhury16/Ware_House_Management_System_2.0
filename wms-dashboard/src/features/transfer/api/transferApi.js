import { httpClient } from "../../../core/api/httpClient.js";

export const transferApi = {
  /**
   * Submit a new Warehouse Transfer request for manager approval.
   */
  async submitTransfer(payload) {
    const { data } = await httpClient.post("/approvals/transfer", payload);
    return data;
  },

  /**
   * Fast Barcode / Serial / SKU lookup to verify if product exists and if it is in source warehouse.
   */
  async lookupItem(code, warehouseId = null) {
    const params = { code };
    if (warehouseId) params.warehouse_id = warehouseId;
    const { data } = await httpClient.get("/inventory/lookup-item", { params });
    return data;
  },

  /**
   * Fetch transfer history from approvals queue.
   */
  async getTransfers(params = {}) {
    const { data } = await httpClient.get("/approvals", {
      params: { ...params, operation_type: "transfer" },
    });
    return data;
  },

  /**
   * Fetch approval stats for transfers.
   */
  async getTransferStats(params = {}) {
    const { data } = await httpClient.get("/approvals/stats", {
      params: { ...params, operation_type: "transfer" },
    });
    return data;
  },

  /**
   * Fetch available serialized units in a warehouse.
   */
  async getAvailableSerials(warehouseId, productId = null) {
    const params = {
      warehouse_id: warehouseId,
      status_filter: "in_stock",
    };
    if (productId) params.product_id = productId;
    const { data } = await httpClient.get("/inventory/items", { params });
    return Array.isArray(data) ? data : data?.items || [];
  },

  /**
   * Fetch bulk stock for a warehouse.
   */
  async getBulkStock(warehouseId, productId = null) {
    const params = { warehouse_id: warehouseId };
    if (productId) params.product_id = productId;
    const { data } = await httpClient.get("/inventory/bulk", { params });
    return Array.isArray(data) ? data : data?.items || [];
  },
};
