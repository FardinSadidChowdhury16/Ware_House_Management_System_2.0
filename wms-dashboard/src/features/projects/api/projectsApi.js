import { httpClient } from "../../../core/api/httpClient.js";

function normalizeProject(p) {
  if (!p) return null;
  return {
    ...p,
    id: String(p.id),
    name: p.name || "",
    code: p.code || "",
    location: p.location || "—",
    contact_info: p.contact_info || "—",
    description: p.description || "",
    status: p.status || "active",
    is_active: Boolean(p.is_active),
    created_at: p.created_at || null,
    updated_at: p.updated_at || null,
  };
}

export const projectsApi = {
  async listProjects(params = {}) {
    const { data } = await httpClient.get("/projects", { params });
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return {
      items: items.map(normalizeProject),
      total: data?.total ?? items.length,
      skip: data?.skip ?? 0,
      limit: data?.limit ?? 100,
    };
  },

  async getStats() {
    const { data } = await httpClient.get("/projects/stats");
    return data || {
      total_projects: 0,
      active_projects: 0,
      completed_projects: 0,
      on_hold_projects: 0,
    };
  },

  async getProject(id) {
    const { data } = await httpClient.get(`/projects/${id}`);
    return normalizeProject(data);
  },

  async getProjectItems(id) {
    const { data } = await httpClient.get(`/projects/${id}/items`);
    return data || { items: [], total_items: 0, total_quantity: 0 };
  },

  async createProject(payload) {
    const body = {
      name: payload.name.trim(),
      code: payload.code.trim().toUpperCase(),
      location: payload.location.trim(),
      contact_info: payload.contact_info.trim(),
      description: payload.description?.trim() || null,
      status: payload.status || "active",
    };
    const { data } = await httpClient.post("/projects", body);
    return normalizeProject(data);
  },

  async updateProject(id, payload) {
    const body = {
      name: payload.name?.trim(),
      code: payload.code?.trim()?.toUpperCase(),
      location: payload.location?.trim(),
      contact_info: payload.contact_info?.trim(),
      description: payload.description?.trim() || null,
      status: payload.status,
    };
    const { data } = await httpClient.put(`/projects/${id}`, body);
    return normalizeProject(data);
  },

  async deleteProject(id) {
    const { data } = await httpClient.delete(`/projects/${id}`);
    return data;
  },

  async toggleStatus(id) {
    const { data } = await httpClient.patch(`/projects/${id}/toggle-status`);
    return normalizeProject(data);
  },
};
