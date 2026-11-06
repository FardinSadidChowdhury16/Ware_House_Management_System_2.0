import { httpClient } from "../../../core/api/httpClient.js";

function normalizeWarehouse(w) {
  return {
    ...w,
    id: String(w.id),
    name: w.name || "",
    code: w.code || "",
    address: w.address || "—",
    status: w.status === true || w.status === "Active" ? "Active" : "Inactive",
    items: w.items ?? 0,
  };
}

export const warehousesApi = {
  async getMySummary(warehouseId = null) {
    const params = warehouseId ? { warehouse_id: warehouseId } : {};
    const { data } = await httpClient.get("/warehouses/my-summary", { params });
    return data;
  },

  async listWarehouses() {
    const { data } = await httpClient.get("/warehouses");
    const rawList = Array.isArray(data) ? data : data?.warehouses || [];
    return rawList.map(normalizeWarehouse);
  },

  async listAllActiveWarehouses() {
    const { data } = await httpClient.get("/warehouses", { params: { all_active: true } });
    const rawList = Array.isArray(data) ? data : data?.warehouses || [];
    return rawList.map(normalizeWarehouse);
  },

  async createWarehouse(payload) {
    const body = {
      name: payload.name.trim(),
      code: payload.code.trim().toUpperCase(),
      address: payload.address?.trim() || "",
    };
    const { data } = await httpClient.post("/warehouses", body);
    return normalizeWarehouse(data);
  },

  async getWarehouse(id) {
    const { data } = await httpClient.get(`/warehouses/${id}`);
    return normalizeWarehouse(data);
  },

  async updateWarehouse(id, payload) {
    const body = {
      name: payload.name?.trim(),
      code: payload.code?.trim()?.toUpperCase(),
      address: payload.address?.trim(),
    };
    const { data } = await httpClient.put(`/warehouses/${id}`, body);
    return normalizeWarehouse(data);
  },

  async toggleWarehouseStatus(id) {
    const { data } = await httpClient.patch(`/warehouses/${id}/toggle-status`);
    return normalizeWarehouse(data);
  },
};
