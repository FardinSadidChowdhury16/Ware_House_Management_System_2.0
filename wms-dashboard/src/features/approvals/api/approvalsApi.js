import { httpClient } from "../../../core/api/httpClient.js";

export const approvalsApi = {
  /** List approvals with optional filters */
  async listApprovals(params = {}) {
    const { data } = await httpClient.get("/approvals", { params });
    return data;
  },

  /** Approval queue statistics */
  async getStats() {
    const { data } = await httpClient.get("/approvals/stats");
    return data;
  },

  /** Approve a pending approval */
  async approve(approvalId, note = null) {
    const { data } = await httpClient.post(`/approvals/${approvalId}/approve`, { note });
    return data;
  },

  /** Reject a pending approval */
  async reject(approvalId, note = null) {
    const { data } = await httpClient.post(`/approvals/${approvalId}/reject`, { note });
    return data;
  },

  /** Submit a warehouse transfer for approval */
  async submitTransfer(payload) {
    const { data } = await httpClient.post("/approvals/transfer", payload);
    return data;
  },
};
