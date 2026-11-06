import { httpClient } from "../../../core/api/httpClient.js";

function normalizeRecord(r) {
  return {
    ...r,
    id: String(r.id),
    service_type: r.service_type || "repair",
    status: r.status || "pending",
  };
}

export const returnsApi = {
  async listServiceRecords() {
    try {
      const { data } = await httpClient.get("/services/records");
      const rawList = Array.isArray(data) ? data : [];
      return rawList.map(normalizeRecord);
    } catch {
      return [];
    }
  },

  async createServiceRecord(payload) {
    const body = {
      product_item_id: Number(payload.product_item_id) || 1,
      warranty_claim_id: payload.warranty_claim_id ? Number(payload.warranty_claim_id) : undefined,
      service_type: payload.service_type || payload.problemType || "repair",
      description: payload.description || payload.complaint || "Service ticket",
      cost: Number(payload.cost) || 0.0,
      serviced_by: payload.serviced_by || "Technician",
    };
    const { data } = await httpClient.post("/services/records", body);
    return normalizeRecord(data);
  },

  async updateClaimStatus(claimId, status) {
    const { data } = await httpClient.patch(`/services/claims/${claimId}`, { status });
    return data;
  },

  async listTickets(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page);
    if (params.page_size) query.append("page_size", params.page_size);
    if (params.search) query.append("search", params.search);
    if (params.status && params.status !== "All") query.append("status", params.status);

    const queryString = query.toString();
    const url = `/services/tickets${queryString ? `?${queryString}` : ""}`;
    const { data } = await httpClient.get(url);
    return data;
  },

  async getTicketDetail(id) {
    const { data } = await httpClient.get(`/services/tickets/${id}`);
    return data;
  },

  async createTicket(payload) {
    const { data } = await httpClient.post("/services/tickets", payload);
    return data;
  },

  async updateTicket(id, payload) {
    const { data } = await httpClient.patch(`/services/tickets/${id}`, payload);
    return data;
  },

  async deleteTicket(id) {
    await httpClient.delete(`/services/tickets/${id}`);
    return true;
  },

  async lookupBarcode(barcode) {
    const { data } = await httpClient.get(`/services/barcode-lookup?barcode=${encodeURIComponent(barcode)}`);
    return data;
  },
};
