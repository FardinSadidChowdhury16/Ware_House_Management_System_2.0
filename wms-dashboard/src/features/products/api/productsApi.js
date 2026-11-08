import { httpClient } from "../../../core/api/httpClient.js";

function normalizeVariant(v) {
  if (!v) return v;
  const isStockedIn = Boolean(
    v.is_stocked_in ??
    (v.warehouse_name || (Array.isArray(v.assigned_warehouses) && v.assigned_warehouses.length > 0))
  );
  const isSold = Boolean(
    v.stock_status === "sold" ||
    v.is_sold ||
    (!isStockedIn && (v.stock_out_details || (Array.isArray(v.movements) && v.movements.some((m) => String(m.movement_type || "").toLowerCase().includes("sale") || String(m.movement_type || "").toLowerCase().includes("out")))))
  );
  const stockStatus = isStockedIn ? "stocked_in" : isSold ? "sold" : (v.stock_status || "not_stocked_in");

  return {
    ...v,
    id: v.id,
    product_id: v.product_id,
    sku: v.sku || "",
    name: v.name || "",
    barcode: v.barcode || null,
    cost_price: Number(v.cost_price) || 0,
    selling_price: Number(v.selling_price) || 0,
    status: v.status || "active",
    warehouse_name: v.warehouse_name || null,
    assigned_warehouses: Array.isArray(v.assigned_warehouses) ? v.assigned_warehouses : [],
    is_stocked_in: isStockedIn,
    is_sold: isSold,
    stock_status: stockStatus,
    warranty_start_date: v.warranty_start_date || null,
    warranty_end_date: v.warranty_end_date || null,
    attribute_values: v.attribute_values || [],
    taxes: v.taxes || [],
    created_at: v.created_at || null,
    updated_at: v.updated_at || null,
    stock_in_details: v.stock_in_details || null,
    stock_out_details: v.stock_out_details || null,
    service_ticket_details: v.service_ticket_details || null,
    attachments: Array.isArray(v.attachments) ? v.attachments : [],
    movements: Array.isArray(v.movements) ? v.movements : [],
  };
}

function normalizeProduct(p, typeMap = {}) {
  const categoryName =
    p.category_id && typeMap[p.category_id]
      ? typeMap[p.category_id]
      : p.category || "General";

  const rawTracking = (p.tracking_type || p.tracking || "").toLowerCase();
  const tracking = rawTracking === "serialized" ? "Serialized" : "Bulk";

  const variants = Array.isArray(p.variants)
    ? p.variants.map(normalizeVariant)
    : [];

  return {
    ...p,
    id: String(p.id),
    sku: p.product_code || p.sku || `PROD-${p.id}`,
    name: p.name || "",
    category: categoryName,
    category_id: p.category_id,
    tracking,
    tracking_type: rawTracking === "serialized" ? "serialized" : "bulk",
    status: p.status || "active",
    min: p.min_stock_level ?? p.min ?? 0,
    details: p.description || p.details || "",
    variants,
  };
}

export const productsApi = {
  // ─── Product Types ───────────────────────────────────
  async listProductTypes() {
    try {
      const { data } = await httpClient.get("/products/types");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async createProductType(payload) {
    const rawTracking = (
      payload.tracking_type ||
      payload.tracking ||
      ""
    ).toLowerCase();
    const default_tracking_type =
      rawTracking === "bulk" ? "bulk" : "serialized";

    const body = {
      name: payload.name.trim(),
      description: payload.description || payload.name,
      default_tracking_type,
      attributes: Array.isArray(payload.attributes) ? payload.attributes : [],
    };
    const { data } = await httpClient.post("/products/types", body);
    return data;
  },

  async updateProductType(id, payload) {
    const body = {
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.default_tracking_type !== undefined ? { default_tracking_type: payload.default_tracking_type } : {}),
      ...(payload.attributes !== undefined ? { attributes: payload.attributes } : {}),
    };
    const { data } = await httpClient.put(`/products/types/${id}`, body);
    return data;
  },

  async deleteProductType(id) {
    await httpClient.delete(`/products/types/${id}`);
    return id;
  },

  // ─── Barcode Generation ───────────────────────────────
  async generateBarcode() {
    const { data } = await httpClient.get("/products/generate-barcode");
    return data.barcode;
  },

  async generateBarcodes(count = 1) {
    try {
      const { data } = await httpClient.get("/products/generate-barcodes", {
        params: { count },
      });
      if (data && Array.isArray(data.barcodes)) return data.barcodes;
    } catch {
      // Fallback sequentially
    }
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(await productsApi.generateBarcode());
    }
    return results;
  },

  // ─── Tax Rules ───────────────────────────────────────
  async listTaxRules() {
    try {
      const { data } = await httpClient.get("/products/taxes");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async createTaxRule(payload) {
    const body = {
      name: payload.name.trim(),
      calc_type: payload.calc_type || "percentage",
      value: Number(payload.value) || 0,
      description: payload.description || null,
    };
    const { data } = await httpClient.post("/products/taxes", body);
    return data;
  },

  async updateTaxRule(id, payload) {
    const body = {};
    if (payload.name !== undefined) body.name = payload.name.trim();
    if (payload.calc_type !== undefined) body.calc_type = payload.calc_type;
    if (payload.value !== undefined) body.value = Number(payload.value);
    if (payload.description !== undefined) body.description = payload.description || null;
    const { data } = await httpClient.put(`/products/taxes/${id}`, body);
    return data;
  },

  async deleteTaxRule(id) {
    await httpClient.delete(`/products/taxes/${id}`);
  },

  // ─── Products ────────────────────────────────────────
  async listProducts(params = {}) {
    try {
      const types = await productsApi.listProductTypes();
      const typeMap = {};
      types.forEach((t) => {
        typeMap[t.id] = t.name;
      });

      const queryParams = {};
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.pageSize !== undefined) queryParams.page_size = params.pageSize;
      if (params.page_size !== undefined) queryParams.page_size = params.page_size;
      if (params.search) queryParams.search = params.search;
      if (params.tracking && params.tracking !== "All") queryParams.tracking = params.tracking;
      if (params.status && params.status !== "All") queryParams.status = params.status;
      if (params.stock_status && params.stock_status !== "all" && params.stock_status !== "All") {
        queryParams.stock_status = params.stock_status;
      }
      if (params.skip !== undefined) queryParams.skip = params.skip;
      if (params.limit !== undefined) queryParams.limit = params.limit;

      const { data } = await httpClient.get("/products", { params: queryParams });
      if (data && Array.isArray(data.items) && typeof data.total === "number") {
        return {
          items: data.items.map((p) => normalizeProduct(p, typeMap)),
          total: data.total,
          page: data.page,
          pageSize: data.page_size,
          totalPages: data.total_pages,
        };
      }
      const rawList = Array.isArray(data) ? data : data?.products || [];
      return rawList.map((p) => normalizeProduct(p, typeMap));
    } catch {
      return params?.page
        ? { items: [], total: 0, page: 1, pageSize: params.pageSize || 10, totalPages: 1 }
        : [];
    }
  },

  async createProduct(payload) {
    const rawTracking = (
      payload.tracking_type ||
      payload.tracking ||
      ""
    ).toLowerCase();
    const tracking_type = rawTracking === "bulk" ? "bulk" : "serialized";

    const body = {
      name: payload.name.trim(),
      product_code: (payload.sku || payload.product_code || "").trim()
        ? (payload.sku || payload.product_code).trim().toUpperCase()
        : null,
      category_id: payload.category_id ? Number(payload.category_id) : 1,
      tracking_type,
      min_stock_level: Number(payload.min || payload.min_stock_level) || 0,
      status: payload.status || "active",
      variants: [],
    };

    const { data } = await httpClient.post("/products", body);
    return normalizeProduct(data);
  },

  async getProductDetails(id) {
    const types = await productsApi.listProductTypes();
    const typeMap = {};
    types.forEach((t) => {
      typeMap[t.id] = t.name;
    });
    const { data } = await httpClient.get(`/products/${id}/details`);
    return normalizeProduct(data, typeMap);
  },

  async updateProduct(productId, payload) {
    const body = {};
    if (payload.name !== undefined) body.name = payload.name.trim();
    if (payload.sku !== undefined || payload.product_code !== undefined) {
      const code = (payload.sku || payload.product_code || "").trim();
      body.product_code = code ? code.toUpperCase() : null;
    }
    if (payload.category_id !== undefined) body.category_id = Number(payload.category_id);
    if (payload.tracking_type !== undefined || payload.tracking !== undefined) {
      const rawTracking = (payload.tracking_type || payload.tracking || "").toLowerCase();
      body.tracking_type = rawTracking === "bulk" ? "bulk" : "serialized";
    }
    if (payload.min !== undefined || payload.min_stock_level !== undefined) {
      body.min_stock_level = Number(payload.min ?? payload.min_stock_level) || 0;
    }
    if (payload.status !== undefined) body.status = payload.status;

    const { data } = await httpClient.put(`/products/${productId}`, body);
    return normalizeProduct(data);
  },

  async deleteProduct(productId) {
    await httpClient.delete(`/products/${productId}`);
    return true;
  },

  // ─── Variants ────────────────────────────────────────
  async createVariant(productId, variantData) {
    const body = {
      sku: variantData.sku ? variantData.sku.trim().toUpperCase() : null,
      name: (variantData.name || "").trim() || null,
      barcode: (variantData.barcode || "").trim() || null,
      cost_price: Number(variantData.cost_price) || 0,
      selling_price: Number(variantData.selling_price) || 0,
      status: variantData.status || "active",
      warranty_start_date: variantData.warranty_start_date || null,
      warranty_end_date: variantData.warranty_end_date || null,
      attribute_values: variantData.attribute_values || [],
      tax_rule_ids: variantData.tax_rule_ids || [],
    };
    const { data } = await httpClient.post(
      `/products/${productId}/variants`,
      body
    );
    return normalizeVariant(data);
  },

  async createVariantsBatch(productId, variantsList) {
    const formatted = variantsList.map((v) => ({
      sku: v.sku ? v.sku.trim().toUpperCase() : null,
      name: (v.name || "").trim() || null,
      barcode: (v.barcode || "").trim() || null,
      cost_price: Number(v.cost_price) || 0,
      selling_price: Number(v.selling_price) || 0,
      status: v.status || "active",
      warranty_start_date: v.warranty_start_date || null,
      warranty_end_date: v.warranty_end_date || null,
      attribute_values: v.attribute_values || [],
      tax_rule_ids: v.tax_rule_ids || [],
    }));

    try {
      const { data } = await httpClient.post(
        `/products/${productId}/variants/batch`,
        formatted
      );
      return Array.isArray(data) ? data.map(normalizeVariant) : [];
    } catch (err) {
      // If batch endpoint returns an error with message, rethrow it
      if (err?.response?.data?.detail) throw err;
      // Fallback sequentially
      const created = [];
      for (const item of formatted) {
        const single = await productsApi.createVariant(productId, item);
        created.push(single);
      }
      return created;
    }
  },

  async updateVariant(productId, variantId, variantData) {
    const body = {};
    if (variantData.sku !== undefined)
      body.sku = variantData.sku.trim().toUpperCase();
    if (variantData.name !== undefined)
      body.name = variantData.name.trim() || null;
    if (variantData.barcode !== undefined)
      body.barcode = variantData.barcode.trim() || null;
    if (variantData.cost_price !== undefined)
      body.cost_price = Number(variantData.cost_price);
    if (variantData.selling_price !== undefined)
      body.selling_price = Number(variantData.selling_price);
    if (variantData.status !== undefined) body.status = variantData.status;
    if (variantData.warranty_start_date !== undefined)
      body.warranty_start_date = variantData.warranty_start_date || null;
    if (variantData.warranty_end_date !== undefined)
      body.warranty_end_date = variantData.warranty_end_date || null;

    const { data } = await httpClient.put(
      `/products/${productId}/variants/${variantId}`,
      body
    );
    return normalizeVariant(data);
  },

  async updateVariantPrice(productId, variantId, prices) {
    const body = {};
    if (prices.cost_price !== undefined)
      body.cost_price = Number(prices.cost_price);
    if (prices.selling_price !== undefined)
      body.selling_price = Number(prices.selling_price);

    const { data } = await httpClient.patch(
      `/products/${productId}/variants/${variantId}/price`,
      body
    );
    return normalizeVariant(data);
  },

  async deleteVariant(productId, variantId) {
    await httpClient.delete(`/products/${productId}/variants/${variantId}`);
    return true;
  },

  async listVariants(productId, params = {}) {
    try {
      const queryParams = {};
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.pageSize !== undefined) queryParams.page_size = params.pageSize;
      if (params.page_size !== undefined) queryParams.page_size = params.page_size;
      if (params.search) queryParams.search = params.search;
      if (params.status && params.status !== "All") queryParams.status = params.status;
      if (params.warehouse_id) queryParams.warehouse_id = params.warehouse_id;
      if (params.stock_status && params.stock_status !== "all") {
        queryParams.stock_status = params.stock_status;
      }

      const { data } = await httpClient.get(`/products/${productId}/variants`, {
        params: queryParams,
      });
      if (data && Array.isArray(data.items) && typeof data.total === "number") {
        return {
          items: data.items.map(normalizeVariant),
          total: data.total,
          page: data.page,
          pageSize: data.page_size,
          totalPages: data.total_pages,
        };
      }
      const rawList = Array.isArray(data) ? data : [];
      return {
        items: rawList.map(normalizeVariant),
        total: rawList.length,
        page: 1,
        pageSize: rawList.length || 10,
        totalPages: 1,
      };
    } catch {
      return { items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
    }
  },

  async getVariant(productId, variantId) {
    const { data } = await httpClient.get(
      `/products/${productId}/variants/${variantId}`
    );
    return normalizeVariant(data);
  },

  async batchUpdateVariants(productId, items) {
    const { data } = await httpClient.post(
      `/products/${productId}/variants/batch-update`,
      { items }
    );
    return data;
  },
};
