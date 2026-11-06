import { httpClient } from "../../../core/api/httpClient.js";

function normalizeClaim(c) {
  return {
    ...c,
    id: String(c.id),
    serial: c.serial || `SN-${c.product_item_id || c.id}`,
    product: c.product || "Product",
    customer: c.customer || "Customer",
    end: c.end || c.claim_date || "2027-01-01",
    status: c.status === "pending" ? "Active-Warranty" : (c.status || "Active-Warranty"),
    issue: c.issue_description || c.issue || "",
  };
}

export const warrantyApi = {
  async listClaims() {
    try {
      const { data } = await httpClient.get("/services/claims");
      const rawList = Array.isArray(data) ? data : [];
      return rawList.map(normalizeClaim);
    } catch {
      return [];
    }
  },

  async createClaim(payload) {
    const body = {
      product_item_id: Number(payload.product_item_id) || 1,
      customer_id: payload.customer_id ? Number(payload.customer_id) : undefined,
      issue_description: payload.issue_description || payload.issue || "Customer warranty registration",
    };
    const { data } = await httpClient.post("/services/claims", body);
    return normalizeClaim(data);
  },

  async updateClaim(id, payload) {
    const { data } = await httpClient.patch(`/services/claims/${id}`, payload);
    return normalizeClaim(data);
  },

  async listWarranties(params = {}) {
    const { data } = await httpClient.get("/services/warranties", { params });
    return data;
  },
};
