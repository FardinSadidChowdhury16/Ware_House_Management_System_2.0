export const queryKeys = {
  auth: {
    me: ["auth", "me"],
  },
  dashboard: {
    summary: ["dashboard", "summary"],
  },
  userManagement: {
    users: ["user-management", "users"],
    roles: ["user-management", "roles"],
    permissions: ["user-management", "permissions"],
  },
  warehouses: {
    all: ["warehouses"],
    list: ["warehouses", "list"],
    detail: (id) => ["warehouses", "detail", id],
    mySummary: (warehouseId) => ["warehouses", "my-summary", warehouseId ?? "all"],
  },
  products: {
    all: ["products"],
    list: ["products", "list"],
    types: ["products", "types"],
    detail: (id) => ["products", "detail", id],
    variants: (productId) => ["products", "variants", productId],
    taxes: ["products", "taxes"],
  },
  inventory: {
    all: ["inventory"],
    items: (filters) => ["inventory", "items", filters],
    bulk: (filters) => ["inventory", "bulk", filters],
    movements: (params) => ["inventory", "movements", params],
    stats: ["inventory", "stats"],
  },
  services: {
    claims: ["services", "claims"],
    records: ["services", "records"],
    warranties: (params) => ["services", "warranties", params],
    tickets: (params) => ["services", "tickets", params],
    ticket: (id) => ["services", "ticket", id],
  },
  parties: {
    customers: ["parties", "customers"],
    suppliers: ["parties", "suppliers"],
  },
  approvals: {
    all: ["approvals"],
    list: (params) => ["approvals", "list", params],
    stats: ["approvals", "stats"],
  },
};

