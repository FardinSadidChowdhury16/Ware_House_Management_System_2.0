import { httpClient } from "../../../core/api/httpClient.js";

function normalizeUser(u) {
  // Backend returns status as boolean (true/false), normalize to display string
  let status;
  if (u.status === true || u.status === "Active") {
    status = "Active";
  } else {
    status = "Inactive";
  }

  // Role can be object { id, name } or string or null
  let role;
  let role_id;
  if (typeof u.role === "object" && u.role) {
    role = u.role.name;
    role_id = u.role.id;
  } else if (u.role && u.role !== "None") {
    role = u.role;
    role_id = u.role_id;
  } else {
    role = "None";
    role_id = null;
  }

  // Warehouse normalization
  let warehouse;
  if (Array.isArray(u.warehouses) && u.warehouses.length > 0) {
    warehouse = u.warehouses.map((w) => w.name).join(", ");
  } else if (u.warehouse && u.warehouse !== "None") {
    warehouse = u.warehouse;
  } else {
    warehouse = "None";
  }

  return {
    ...u,
    id: String(u.id),
    name: u.name || u.user_name || "User",
    user_name: u.user_name || "",
    email: u.email || "",
    password: u.password || "",
    role,
    role_id,
    warehouse,
    status,
  };
}

function normalizeRole(r) {
  const permissionObjects = Array.isArray(r.permissions) ? r.permissions : [];
  const permissions = permissionObjects.map((p) => (typeof p === "string" ? p : p.name));
  const permissionIds = permissionObjects.map((p) => (typeof p === "object" ? p.id : p));
  return {
    ...r,
    id: String(r.id),
    name: r.name,
    permissions,
    permissionIds,
    users: r.users_count ?? 0,
  };
}

export const userManagementApi = {
  async listUsers() {
    const { data } = await httpClient.get("/users");
    const rawList = Array.isArray(data) ? data : data?.users || [];
    return rawList.map(normalizeUser);
  },

  async createUser(payload) {
    const cleanName = (payload.name || "").trim();
    const userSlug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const body = {
      name: cleanName,
      user_name: payload.user_name || `${userSlug || "user"}_${Date.now().toString().slice(-4)}`,
      email: payload.email,
      password: payload.password,
      status: payload.status !== undefined ? payload.status : true,
    };
    if (payload.role_id) body.role_id = Number(payload.role_id);
    if (payload.warehouse_ids && payload.warehouse_ids.length > 0) body.warehouse_ids = payload.warehouse_ids;
    const { data } = await httpClient.post("/users", body);
    return normalizeUser(data);
  },

  async changeUserPassword(id, password) {
    const { data } = await httpClient.put(`/users/${id}/password`, { password });
    return normalizeUser(data);
  },

  async updateUser(id, payload) {
    const body = {};
    if (payload.name) body.name = payload.name.trim();
    if (payload.user_name) body.user_name = payload.user_name.trim();
    if (payload.email) body.email = payload.email.trim();
    if (payload.password) body.password = payload.password;
    if (payload.role_id) body.role_id = Number(payload.role_id);
    if (payload.warehouse_ids !== undefined) body.warehouse_ids = payload.warehouse_ids;
    if (payload.status !== undefined) body.status = payload.status;

    let updated = null;
    if (Object.keys(body).length > 0) {
      const { data } = await httpClient.put(`/users/${id}`, body);
      updated = data;
    }

    return updated ? normalizeUser(updated) : { id, ...payload };
  },

  async deleteUser(id) {
    const { data } = await httpClient.delete(`/users/${id}`);
    return data;
  },

  async listRoles() {
    const { data } = await httpClient.get("/roles");
    const rawList = Array.isArray(data) ? data : data?.roles || [];
    return rawList.map(normalizeRole);
  },

  async createRole(payload) {
    const body = {
      name: (payload.name || "").trim(),
      description: payload.description || payload.name,
      permission_ids: payload.permission_ids || [],
    };
    const { data } = await httpClient.post("/roles", body);
    return normalizeRole(data);
  },

  async updateRole(id, payload) {
    const body = {
      name: payload.name?.trim(),
      description: payload.description,
      permission_ids: payload.permission_ids,
    };
    const { data } = await httpClient.put(`/roles/${id}`, body);
    return normalizeRole(data);
  },

  async deleteRole(id) {
    const { data } = await httpClient.delete(`/roles/${id}`);
    return data;
  },

  async listPermissions() {
    try {
      const { data } = await httpClient.get("/roles/permissions");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
};
