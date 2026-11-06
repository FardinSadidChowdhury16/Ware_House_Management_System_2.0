import { httpClient } from "../../../core/api/httpClient.js";

function normalizeCustomer(c) {
  const typeMap = {
    corporate: "Corporate",
    retail: "Retail",
    wholesale: "Wholesale",
  };
  const rawType = (c.customer_type || "corporate").toLowerCase();
  const displayType = typeMap[rawType] || "Corporate";

  return {
    ...c,
    id: String(c.id),
    name: c.name || "",
    phone: c.phone || "—",
    email: c.email || "—",
    shipping_details: c.shipping_details || "—",
    billing_details: c.billing_details || "—",
    customer_type: rawType,
    customerTypeDisplay: displayType,
    status: c.status === true || c.status === "Active" ? "Active" : "Inactive",
    isActive: c.status === true || c.status === "Active",
    created_at: c.created_at || null,
    updated_at: c.updated_at || null,
  };
}

export const customersApi = {
  async listCustomers(params = {}) {
    const { data } = await httpClient.get("/customers", { params });
    const rawList = Array.isArray(data) ? data : data?.customers || [];
    return rawList.map(normalizeCustomer);
  },

  async getCustomer(id) {
    const { data } = await httpClient.get(`/customers/${id}`);
    return normalizeCustomer(data);
  },

  async createCustomer(payload) {
    const body = {
      name: payload.name.trim(),
      phone: payload.phone?.trim() || null,
      email: payload.email?.trim() || null,
      shipping_details: payload.shipping_details?.trim() || null,
      billing_details: payload.billing_details?.trim() || null,
      customer_type: (payload.customer_type || "corporate").toLowerCase(),
    };
    const { data } = await httpClient.post("/customers", body);
    return normalizeCustomer(data);
  },

  async updateCustomer(id, payload) {
    const body = {
      name: payload.name?.trim(),
      phone: payload.phone !== undefined ? payload.phone?.trim() || null : undefined,
      email: payload.email !== undefined ? payload.email?.trim() || null : undefined,
      shipping_details: payload.shipping_details !== undefined ? payload.shipping_details?.trim() || null : undefined,
      billing_details: payload.billing_details !== undefined ? payload.billing_details?.trim() || null : undefined,
      customer_type: payload.customer_type ? payload.customer_type.toLowerCase() : undefined,
    };
    // Remove undefined fields
    Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

    const { data } = await httpClient.put(`/customers/${id}`, body);
    return normalizeCustomer(data);
  },

  async toggleCustomerStatus(id) {
    const { data } = await httpClient.patch(`/customers/${id}/toggle-status`);
    return normalizeCustomer(data);
  },
};
