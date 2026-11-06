import { httpClient } from "../../../core/api/httpClient.js";

function normalizeSupplier(s) {
  return {
    ...s,
    id: String(s.id),
    name: s.name || "",
    supplier_code: s.supplier_code || "—",
    phone: s.phone || "—",
    email: s.email || "—",
    address: s.address || "—",
    shipping_details: s.shipping_details || "—",
    billing_details: s.billing_details || "—",
    status: s.status === true || s.status === "Active" ? "Active" : "Inactive",
    isActive: s.status === true || s.status === "Active",
    created_at: s.created_at || null,
    updated_at: s.updated_at || null,
  };
}

export const suppliersApi = {
  async listSuppliers(params = {}) {
    const { data } = await httpClient.get("/suppliers", { params });
    const rawList = Array.isArray(data) ? data : data?.suppliers || [];
    return rawList.map(normalizeSupplier);
  },

  async getSupplier(id) {
    const { data } = await httpClient.get(`/suppliers/${id}`);
    return normalizeSupplier(data);
  },

  async createSupplier(payload) {
    const body = {
      name: payload.name.trim(),
      supplier_code: payload.supplier_code?.trim() || null,
      phone: payload.phone?.trim() || null,
      email: payload.email?.trim() || null,
      address: payload.address?.trim() || null,
      shipping_details: payload.shipping_details?.trim() || null,
      billing_details: payload.billing_details?.trim() || null,
    };
    const { data } = await httpClient.post("/suppliers", body);
    return normalizeSupplier(data);
  },

  async updateSupplier(id, payload) {
    const body = {
      name: payload.name?.trim(),
      supplier_code: payload.supplier_code !== undefined ? payload.supplier_code?.trim() || null : undefined,
      phone: payload.phone !== undefined ? payload.phone?.trim() || null : undefined,
      email: payload.email !== undefined ? payload.email?.trim() || null : undefined,
      address: payload.address !== undefined ? payload.address?.trim() || null : undefined,
      shipping_details: payload.shipping_details !== undefined ? payload.shipping_details?.trim() || null : undefined,
      billing_details: payload.billing_details !== undefined ? payload.billing_details?.trim() || null : undefined,
    };
    Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
    const { data } = await httpClient.put(`/suppliers/${id}`, body);
    return normalizeSupplier(data);
  },

  async toggleSupplierStatus(id) {
    const { data } = await httpClient.patch(`/suppliers/${id}/toggle-status`);
    return normalizeSupplier(data);
  },
};
