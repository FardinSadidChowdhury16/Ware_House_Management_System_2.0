const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let roleCounter = 4;
let userCounter = 4;

let rolesStore = [
  { id: "r-1", name: "Admin", permissions: ["View Stock", "Manage Users", "View Reports", "Approve Requests"] },
  { id: "r-2", name: "Warehouse Manager", permissions: ["View Stock", "Add Stock", "Remove Stock", "Transfer Stock"] },
  { id: "r-3", name: "Staff", permissions: ["View Stock", "Add Stock"] },
];

let usersStore = [
  { id: "u-1", name: "Raton Admin", role: "Admin", warehouse: "All warehouses", status: "Active" },
  { id: "u-2", name: "Sara Khan", role: "Warehouse Manager", warehouse: "Dhaka Central Warehouse", status: "Active" },
  { id: "u-3", name: "Asif Rahman", role: "Staff", warehouse: "Chattogram Warehouse", status: "Deactivated" },
];

let customerCounter = 4;
let customersStore = [
  { id: 1, name: "Rahim Store", phone: "+880 1711-223344", email: "rahim.store@example.com", shipping_details: "Shop 12, New Market, Dhaka", billing_details: "Shop 12, New Market, Dhaka", customer_type: "retail", status: true },
  { id: 2, name: "City Mart", phone: "+880 1819-556677", email: "procurement@citymart.bd", shipping_details: "GEC Circle, Chattogram", billing_details: "Holding 45, Agrabad C/A, Chattogram", customer_type: "wholesale", status: true },
  { id: 3, name: "Apex Logistics Ltd.", phone: "+880 1912-334455", email: "supply@apexlogistics.com", shipping_details: "Plot 8, Tejgaon I/A, Dhaka", billing_details: "Plot 8, Tejgaon I/A, Dhaka", customer_type: "corporate", status: true },
];

let productTypesStore = [
  { id: 1, name: "Battery", description: "Power storage", default_tracking_type: "serialized" },
  { id: 2, name: "Dongle", description: "Connectivity devices", default_tracking_type: "serialized" },
  { id: 3, name: "Charger", description: "Charging units", default_tracking_type: "bulk" },
];

let taxRulesStore = [
  { id: 1, name: "VAT 15%", calc_type: "percentage", value: 15.0, description: "Standard VAT" },
  { id: 2, name: "Service Tax", calc_type: "fixed", value: 50.0, description: "Flat service charge" },
];

let variantCounter = 10;

let productsStore = [
  {
    id: 1, name: "Li-ion Battery 3000mAh", product_code: "BAT-3000-WHT", category_id: 1,
    tracking_type: "serialized", min_stock_level: 100, stock: 120,
    variants: [
      { id: 1, product_id: 1, sku: "BAT-3000-WHT-V1", name: "White 3000mAh", barcode: "889900110011", cost_price: 850.00, selling_price: 1200.00, status: "active", attribute_values: [], taxes: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 2, product_id: 1, sku: "BAT-3000-BLK-V1", name: "Black 3000mAh", barcode: "889900110022", cost_price: 850.00, selling_price: 1250.00, status: "active", attribute_values: [], taxes: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ],
  },
  {
    id: 2, name: "Solar Charge Controller 40A", product_code: "SCC-40A-BLK", category_id: 3,
    tracking_type: "bulk", min_stock_level: 50, stock: 45,
    variants: [
      { id: 3, product_id: 2, sku: "SCC-40A-STD", name: "Standard 40A", barcode: null, cost_price: 3200.00, selling_price: 4500.00, status: "active", attribute_values: [], taxes: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ],
  },
];

function ok(config, data, status = 200) {
  return Promise.resolve({
    data,
    status,
    statusText: "OK",
    headers: {},
    config,
  });
}

function unauthorized(config, message = "Unauthorized") {
  return Promise.resolve({
    data: { message },
    status: 401,
    statusText: "Unauthorized",
    headers: {},
    config,
  });
}

function badRequest(config, message = "Bad request") {
  return Promise.resolve({
    data: { message },
    status: 400,
    statusText: "Bad Request",
    headers: {},
    config,
  });
}

function parseBody(data) {
  if (!data) return {};
  if (typeof data === "string") return JSON.parse(data || "{}");
  return data;
}

function getRoleUsage(roleName) {
  return usersStore.filter((u) => u.role === roleName).length;
}

function roleWithUsage(role) {
  return { ...role, users: getRoleUsage(role.name) };
}

export async function mockAdapter(config) {
  const method = String(config.method || "get").toLowerCase();
  const rawUrl = String(config.url || "");
  const url = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  const authHeader = config.headers?.Authorization || config.headers?.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";

  await wait(500);

  if (method === "post" && url === "/auth/login") {
    const body = parseBody(config.data);
    const email = body.email || "admin@wms.local";
    return ok(config, {
      token: `dummy-jwt-${Date.now()}`,
      user: { id: "u-1", name: "Raton Admin", role: "Administrator", email },
    });
  }

  if (method === "post" && url === "/auth/logout") {
    return ok(config, { success: true });
  }

  if (method === "get" && url === "/auth/me") {
    if (!token) return unauthorized(config);
    return ok(config, {
      user: { id: "u-1", name: "Raton Admin", role: "Administrator", email: "admin@wms.local" },
    });
  }

  if (method === "get" && url === "/dashboard/summary") {
    if (!token) return unauthorized(config);
    return ok(config, {
      kpis: {
        totalStockUnits: 7670,
        pendingApprovals: 3,
        underRepair: 12,
        expiringWarranties: 6,
      },
      generatedAt: new Date().toISOString(),
    });
  }

  if (!token) return unauthorized(config);

  if (method === "get" && url === "/users") {
    return ok(config, { users: usersStore });
  }

  if (method === "post" && url === "/users") {
    const body = parseBody(config.data);
    if (!body.name?.trim() || !body.role?.trim()) {
      return badRequest(config, "Name and role are required.");
    }
    const newUser = {
      id: `u-${userCounter++}`,
      name: body.name.trim(),
      role: body.role.trim(),
      warehouse: body.warehouse?.trim() || "All warehouses",
      status: body.status || "Active",
    };
    usersStore = [...usersStore, newUser];
    return ok(config, newUser, 201);
  }

  if (method === "put" && /^\/users\/[^/]+\/password$/.test(url)) {
    const userId = url.split("/")[2];
    const body = parseBody(config.data);
    let updatedUser = null;
    usersStore = usersStore.map((user) => {
      if (user.id !== userId) return user;
      updatedUser = { ...user, password: body.password };
      return updatedUser;
    });
    if (!updatedUser) return badRequest(config, "User not found.");
    return ok(config, updatedUser);
  }

  if (method === "put" && /^\/users\/[^/]+$/.test(url)) {
    const userId = url.split("/")[2];
    const body = parseBody(config.data);
    let updatedUser = null;
    usersStore = usersStore.map((user) => {
      if (user.id !== userId) return user;
      updatedUser = {
        ...user,
        name: body.name?.trim() || user.name,
        role: body.role?.trim() || user.role,
        warehouse: body.warehouse?.trim() || user.warehouse,
        status: body.status || user.status,
      };
      return updatedUser;
    });
    if (!updatedUser) return badRequest(config, "User not found.");
    return ok(config, updatedUser);
  }

  if (method === "delete" && /^\/users\/[^/]+$/.test(url)) {
    const userId = url.split("/")[2];
    usersStore = usersStore.filter((user) => user.id !== userId);
    return ok(config, { success: true });
  }

  if (method === "get" && url === "/roles") {
    return ok(config, { roles: rolesStore.map(roleWithUsage) });
  }

  if (method === "post" && url === "/roles") {
    const body = parseBody(config.data);
    if (!body.name?.trim()) {
      return badRequest(config, "Role name is required.");
    }
    const exists = rolesStore.some((r) => r.name.toLowerCase() === body.name.trim().toLowerCase());
    if (exists) return badRequest(config, "Role already exists.");
    const newRole = {
      id: `r-${roleCounter++}`,
      name: body.name.trim(),
      permissions: Array.isArray(body.permissions) ? body.permissions : [],
    };
    rolesStore = [...rolesStore, newRole];
    return ok(config, roleWithUsage(newRole), 201);
  }

  if (method === "put" && /^\/roles\/[^/]+$/.test(url)) {
    const roleId = url.split("/")[2];
    const body = parseBody(config.data);
    let previousRoleName = null;
    let updatedRole = null;
    rolesStore = rolesStore.map((role) => {
      if (role.id !== roleId) return role;
      previousRoleName = role.name;
      updatedRole = {
        ...role,
        name: body.name?.trim() || role.name,
        permissions: Array.isArray(body.permissions) ? body.permissions : role.permissions,
      };
      return updatedRole;
    });
    if (!updatedRole) return badRequest(config, "Role not found.");
    if (previousRoleName && updatedRole.name !== previousRoleName) {
      usersStore = usersStore.map((user) => (user.role === previousRoleName ? { ...user, role: updatedRole.name } : user));
    }
    return ok(config, roleWithUsage(updatedRole));
  }

  if (method === "delete" && /^\/roles\/[^/]+$/.test(url)) {
    const roleId = url.split("/")[2];
    const role = rolesStore.find((item) => item.id === roleId);
    if (!role) return badRequest(config, "Role not found.");
    if (getRoleUsage(role.name) > 0) {
      return badRequest(config, "Cannot delete role while users are assigned.");
    }
    rolesStore = rolesStore.filter((item) => item.id !== roleId);
    return ok(config, { success: true });
  }

  if (method === "get" && url === "/warehouses") {
    return ok(config, [
      { id: 1, name: "Dhaka Central Warehouse", code: "DHK-01", address: "Tejgaon I/A, Dhaka", status: true, items: 3420 },
      { id: 2, name: "Chattogram Port Depot", code: "CTG-01", address: "Agrabad, Chattogram", status: true, items: 2180 },
      { id: 3, name: "Sylhet Regional Hub", code: "SYL-01", address: "Subidbazar, Sylhet", status: true, items: 1240 },
    ]);
  }

  if (method === "post" && url === "/warehouses") {
    const body = parseBody(config.data);
    return ok(config, { id: Date.now(), name: body.name, code: body.code, address: body.address || "—", status: true, items: 0 }, 201);
  }

  if (method === "get" && url === "/customers") {
    return ok(config, customersStore);
  }

  if (method === "post" && url === "/customers") {
    const body = parseBody(config.data);
    if (!body.name?.trim()) return badRequest(config, "Name is required");
    const newCustomer = {
      id: customerCounter++,
      name: body.name.trim(),
      phone: body.phone || null,
      email: body.email || null,
      shipping_details: body.shipping_details || null,
      billing_details: body.billing_details || null,
      customer_type: (body.customer_type || "corporate").toLowerCase(),
      status: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    customersStore = [newCustomer, ...customersStore];
    return ok(config, newCustomer, 201);
  }

  if (method === "put" && /^\/customers\/\d+$/.test(url)) {
    const custId = Number(url.split("/")[2]);
    const body = parseBody(config.data);
    let updated = null;
    customersStore = customersStore.map((c) => {
      if (c.id !== custId) return c;
      updated = {
        ...c,
        name: body.name !== undefined ? body.name.trim() : c.name,
        phone: body.phone !== undefined ? body.phone : c.phone,
        email: body.email !== undefined ? body.email : c.email,
        shipping_details: body.shipping_details !== undefined ? body.shipping_details : c.shipping_details,
        billing_details: body.billing_details !== undefined ? body.billing_details : c.billing_details,
        customer_type: body.customer_type !== undefined ? body.customer_type.toLowerCase() : c.customer_type,
        updated_at: new Date().toISOString(),
      };
      return updated;
    });
    if (!updated) return badRequest(config, "Customer not found");
    return ok(config, updated);
  }

  if (method === "patch" && /^\/customers\/\d+\/toggle-status$/.test(url)) {
    const custId = Number(url.split("/")[2]);
    let updated = null;
    customersStore = customersStore.map((c) => {
      if (c.id !== custId) return c;
      updated = { ...c, status: !c.status, updated_at: new Date().toISOString() };
      return updated;
    });
    if (!updated) return badRequest(config, "Customer not found");
    return ok(config, updated);
  }

  if (method === "get" && url === "/products/types") {
    return ok(config, productTypesStore);
  }

  if (method === "post" && url === "/products/types") {
    const body = parseBody(config.data);
    const newType = {
      id: Date.now(),
      name: body.name,
      description: body.description || "",
      default_tracking_type: (body.default_tracking_type || "serialized").toLowerCase(),
    };
    productTypesStore = [...productTypesStore, newType];
    return ok(config, newType, 201);
  }

  if (method === "get" && url === "/products") {
    return ok(config, productsStore);
  }

  if (method === "post" && url === "/products") {
    const body = parseBody(config.data);
    const newProduct = {
      id: Date.now(),
      name: body.name,
      product_code: body.product_code,
      category_id: body.category_id,
      tracking_type: (body.tracking_type || "serialized").toLowerCase(),
      min_stock_level: body.min_stock_level || 0,
      stock: 0,
      variants: [],
    };
    productsStore = [newProduct, ...productsStore];
    return ok(config, newProduct, 201);
  }

  if (method === "get" && url === "/inventory/items") {
    return ok(config, [
      { id: 1, serial_number: "SN-89001", product_id: 1, status: "in_stock", warehouse_id: 1 },
      { id: 2, serial_number: "SN-89002", product_id: 1, status: "in_stock", warehouse_id: 1 },
    ]);
  }

  if (method === "post" && url === "/inventory/items") {
    const body = parseBody(config.data);
    return ok(config, { id: Date.now(), ...body, status: "in_stock" }, 201);
  }

  if (method === "get" && url === "/inventory/bulk") {
    return ok(config, [
      { id: 1, product_id: 2, warehouse_id: 1, quantity: 45 },
    ]);
  }

  if (method === "post" && url === "/inventory/movements") {
    const body = parseBody(config.data);
    return ok(config, { id: Date.now(), ...body, created_at: new Date().toISOString() }, 201);
  }

  if (method === "get" && url === "/services/claims") {
    return ok(config, [
      { id: 1, product_item_id: 1, serial: "SN-89001", product: "Li-ion Battery 3000mAh", customer: "Customer A", claim_date: "2026-07-08", status: "Active-Warranty" },
    ]);
  }

  if (method === "post" && url === "/services/claims") {
    const body = parseBody(config.data);
    return ok(config, { id: Date.now(), ...body, claim_date: new Date().toISOString().slice(0, 10), status: "Active-Warranty" }, 201);
  }

  if (method === "get" && url === "/services/records") {
    return ok(config, []);
  }

  if (method === "post" && url === "/services/records") {
    const body = parseBody(config.data);
    return ok(config, { id: Date.now(), ...body, status: "pending", created_at: new Date().toISOString() }, 201);
  }

  // Tax Rules
  if (method === "get" && url === "/products/taxes") {
    return ok(config, taxRulesStore);
  }

  if (method === "post" && url === "/products/taxes") {
    const body = parseBody(config.data);
    const newTax = {
      id: Date.now(),
      name: body.name,
      calc_type: body.calc_type || "percentage",
      value: body.value || 0,
      description: body.description || null,
    };
    taxRulesStore = [...taxRulesStore, newTax];
    return ok(config, newTax, 201);
  }

  // Product detail by ID
  {
    const detailMatch = url.match(/^\/products\/(\d+)\/details$/);
    if (method === "get" && detailMatch) {
      const productId = Number(detailMatch[1]);
      const product = productsStore.find((p) => p.id === productId);
      if (!product) return badRequest(config, "Product not found");
      return ok(config, product);
    }
  }

  // Get single product by ID
  {
    const singleMatch = url.match(/^\/products\/(\d+)$/);
    if (method === "get" && singleMatch) {
      const productId = Number(singleMatch[1]);
      const product = productsStore.find((p) => p.id === productId);
      if (!product) return badRequest(config, "Product not found");
      return ok(config, product);
    }
  }

  // Barcode Generation
  if (method === "get" && url === "/products/generate-barcode") {
    const raw = `${Date.now()}${Math.floor(100 + Math.random() * 900)}`.slice(0, 12);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(raw[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return ok(config, { barcode: `${raw}${check}` });
  }

  if (method === "get" && url.startsWith("/products/generate-barcodes")) {
    const params = new URLSearchParams(url.split("?")[1] || "");
    const count = parseInt(params.get("count") || "1", 10);
    const barcodes = [];
    for (let j = 0; j < count; j++) {
      const raw = `${Date.now() + j}${Math.floor(100 + Math.random() * 900)}`.slice(0, 12);
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += parseInt(raw[i], 10) * (i % 2 === 0 ? 1 : 3);
      }
      const check = (10 - (sum % 10)) % 10;
      barcodes.push(`${raw}${check}`);
    }
    return ok(config, { barcodes });
  }

  // Batch Create variants for a product
  {
    const batchVarMatch = url.match(/^\/products\/(\d+)\/variants\/batch$/);
    if (method === "post" && batchVarMatch) {
      const productId = Number(batchVarMatch[1]);
      const product = productsStore.find((p) => p.id === productId);
      if (!product) return badRequest(config, "Product not found");
      const list = parseBody(config.data);
      if (!Array.isArray(list)) return badRequest(config, "Expected array of variants");

      const barcodes = list.map((v) => (v.barcode || "").trim()).filter(Boolean);
      const set = new Set(barcodes);
      if (set.size !== barcodes.length) {
        return badRequest(config, "Duplicate barcodes detected within the batch.");
      }
      for (const b of barcodes) {
        const exists = productsStore.some((p) => (p.variants || []).some((v) => v.barcode === b));
        if (exists) {
          return badRequest(config, `Barcode '${b}' already exists in the system.`);
        }
      }

      const now = new Date().toISOString();
      const created = list.map((body) => {
        const newV = {
          id: variantCounter++,
          product_id: productId,
          sku: body.sku ? String(body.sku).toUpperCase() : null,
          name: body.name || null,
          barcode: body.barcode || null,
          cost_price: Number(body.cost_price) || 0,
          selling_price: Number(body.selling_price) || 0,
          status: body.status || "active",
          warranty_start_date: body.warranty_start_date || null,
          warranty_end_date: body.warranty_end_date || null,
          attribute_values: body.attribute_values || [],
          taxes: Array.isArray(body.tax_rule_ids)
            ? body.tax_rule_ids.map((tid) => taxRulesStore.find((t) => t.id === tid)).filter(Boolean)
            : [],
          created_at: now,
          updated_at: now,
        };
        return newV;
      });
      product.variants = [...(product.variants || []), ...created];
      return ok(config, created, 201);
    }
  }

  // Create variant for a product
  {
    const createVarMatch = url.match(/^\/products\/(\d+)\/variants$/);
    if (method === "post" && createVarMatch) {
      const productId = Number(createVarMatch[1]);
      const product = productsStore.find((p) => p.id === productId);
      if (!product) return badRequest(config, "Product not found");
      const body = parseBody(config.data);
      if (body.barcode && String(body.barcode).trim()) {
        const code = String(body.barcode).trim();
        const exists = productsStore.some((p) =>
          (p.variants || []).some((v) => v.barcode === code)
        );
        if (exists) {
          return badRequest(config, `Barcode '${code}' already exists in the system.`);
        }
      }
      const now = new Date().toISOString();
      const newVariant = {
        id: variantCounter++,
        product_id: productId,
        sku: body.sku ? String(body.sku).toUpperCase() : null,
        name: body.name || null,
        barcode: body.barcode || null,
        cost_price: body.cost_price || 0,
        selling_price: body.selling_price || 0,
        status: body.status || "active",
        attribute_values: [],
        taxes: [],
        created_at: now,
        updated_at: now,
      };
      product.variants = [...(product.variants || []), newVariant];
      return ok(config, newVariant, 201);
    }
  }

  // Update variant
  {
    const updateVarMatch = url.match(/^\/products\/(\d+)\/variants\/(\d+)$/);
    if (method === "put" && updateVarMatch) {
      const productId = Number(updateVarMatch[1]);
      const variantId = Number(updateVarMatch[2]);
      const product = productsStore.find((p) => p.id === productId);
      if (!product) return badRequest(config, "Product not found");
      const body = parseBody(config.data);
      if (body.barcode && String(body.barcode).trim()) {
        const code = String(body.barcode).trim();
        const exists = productsStore.some((p) =>
          (p.variants || []).some((v) => v.id !== variantId && v.barcode === code)
        );
        if (exists) {
          return badRequest(config, `Barcode '${code}' already exists in the system.`);
        }
      }
      let updatedVariant = null;
      product.variants = (product.variants || []).map((v) => {
        if (v.id !== variantId) return v;
        updatedVariant = {
          ...v,
          sku: body.sku !== undefined ? body.sku : v.sku,
          name: body.name !== undefined ? body.name : v.name,
          barcode: body.barcode !== undefined ? body.barcode : v.barcode,
          cost_price: body.cost_price !== undefined ? body.cost_price : v.cost_price,
          selling_price: body.selling_price !== undefined ? body.selling_price : v.selling_price,
          status: body.status !== undefined ? body.status : v.status,
          updated_at: new Date().toISOString(),
        };
        return updatedVariant;
      });
      if (!updatedVariant) return badRequest(config, "Variant not found");
      return ok(config, updatedVariant);
    }
  }

  // Update variant price
  {
    const priceMatch = url.match(/^\/products\/(\d+)\/variants\/(\d+)\/price$/);
    if (method === "patch" && priceMatch) {
      const productId = Number(priceMatch[1]);
      const variantId = Number(priceMatch[2]);
      const product = productsStore.find((p) => p.id === productId);
      if (!product) return badRequest(config, "Product not found");
      const body = parseBody(config.data);
      let updatedVariant = null;
      product.variants = (product.variants || []).map((v) => {
        if (v.id !== variantId) return v;
        updatedVariant = {
          ...v,
          cost_price: body.cost_price !== undefined ? body.cost_price : v.cost_price,
          selling_price: body.selling_price !== undefined ? body.selling_price : v.selling_price,
          updated_at: new Date().toISOString(),
        };
        return updatedVariant;
      });
      if (!updatedVariant) return badRequest(config, "Variant not found");
      return ok(config, updatedVariant);
    }
  }

  // Get single variant
  {
    const getVarMatch = url.match(/^\/products\/(\d+)\/variants\/(\d+)$/);
    if (method === "get" && getVarMatch) {
      const productId = Number(getVarMatch[1]);
      const variantId = Number(getVarMatch[2]);
      const product = productsStore.find((p) => p.id === productId);
      if (!product) return badRequest(config, "Product not found");
      const variant = (product.variants || []).find((v) => v.id === variantId);
      if (!variant) return badRequest(config, "Variant not found");
      return ok(config, variant);
    }
  }

  return ok(config, { message: `No mock route for ${method.toUpperCase()} ${url}` }, 404);
}
