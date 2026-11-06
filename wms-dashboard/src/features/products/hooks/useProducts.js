import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../core/api/queryKeys.js";
import { productsApi } from "../api/productsApi.js";

const EMPTY_ARRAY = Object.freeze([]);

export function useProducts(params = {}) {
  const queryClient = useQueryClient();

  const typesQuery = useQuery({
    queryKey: queryKeys.products.types,
    queryFn: async () => {
      const data = await productsApi.listProductTypes();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const productsQuery = useQuery({
    queryKey: ["products", "list", params],
    queryFn: async () => {
      return productsApi.listProducts(params);
    },
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  const taxRulesQuery = useQuery({
    queryKey: queryKeys.products.taxes,
    queryFn: async () => {
      const data = await productsApi.listTaxRules();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const createProductMutation = useMutation({
    mutationFn: productsApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", "list"] });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ productId, payload }) =>
      productsApi.updateProduct(productId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products", "list"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.productId),
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: ({ productId }) => productsApi.deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", "list"] });
    },
  });

  const createTypeMutation = useMutation({
    mutationFn: productsApi.createProductType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.types });
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, payload }) => productsApi.updateProductType(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.types });
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: ({ id }) => productsApi.deleteProductType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.types });
    },
  });

  const createTaxRuleMutation = useMutation({
    mutationFn: productsApi.createTaxRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.taxes });
    },
  });

  const updateTaxRuleMutation = useMutation({
    mutationFn: ({ id, payload }) => productsApi.updateTaxRule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.taxes });
    },
  });

  const deleteTaxRuleMutation = useMutation({
    mutationFn: ({ id }) => productsApi.deleteTaxRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.taxes });
    },
  });

  const createVariantMutation = useMutation({
    mutationFn: ({ productId, variantData }) =>
      productsApi.createVariant(productId, variantData),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: ["products", variables.productId, "variants"],
      });
      queryClient.invalidateQueries({ queryKey: ["products", "list"] });
    },
  });

  const updateVariantMutation = useMutation({
    mutationFn: ({ productId, variantId, variantData }) =>
      productsApi.updateVariant(productId, variantId, variantData),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: ["products", variables.productId, "variants"],
      });
      queryClient.invalidateQueries({ queryKey: ["products", "list"] });
    },
  });

  const updateVariantPriceMutation = useMutation({
    mutationFn: ({ productId, variantId, prices }) =>
      productsApi.updateVariantPrice(productId, variantId, prices),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: ["products", variables.productId, "variants"],
      });
      queryClient.invalidateQueries({ queryKey: ["products", "list"] });
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: ({ productId, variantId }) =>
      productsApi.deleteVariant(productId, variantId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: ["products", variables.productId, "variants"],
      });
      queryClient.invalidateQueries({ queryKey: ["products", "list"] });
    },
  });

  const productsData = productsQuery.data;
  const isPaginated = productsData && Array.isArray(productsData.items);
  const products = isPaginated
    ? productsData.items
    : Array.isArray(productsData)
    ? productsData
    : [];
  const totalProducts = isPaginated ? productsData.total : products.length;
  const productPage = isPaginated ? productsData.page : 1;
  const productPageSize = isPaginated ? productsData.pageSize : products.length;
  const totalProductPages = isPaginated ? productsData.totalPages : 1;

  return {
    products,
    totalProducts,
    productPage,
    productPageSize,
    totalProductPages,
    productTypes: typesQuery.data || EMPTY_ARRAY,
    taxRules: taxRulesQuery.data || EMPTY_ARRAY,
    isLoading: productsQuery.isLoading || typesQuery.isLoading,
    isFetching: productsQuery.isFetching,
    isError: productsQuery.isError,
    createProduct: createProductMutation.mutateAsync,
    updateProduct: updateProductMutation.mutateAsync,
    deleteProduct: deleteProductMutation.mutateAsync,
    createProductType: createTypeMutation.mutateAsync,
    updateProductType: updateTypeMutation.mutateAsync,
    deleteProductType: deleteTypeMutation.mutateAsync,
    createTaxRule: createTaxRuleMutation.mutateAsync,
    updateTaxRule: updateTaxRuleMutation.mutateAsync,
    deleteTaxRule: deleteTaxRuleMutation.mutateAsync,
    createVariant: createVariantMutation.mutateAsync,
    updateVariant: updateVariantMutation.mutateAsync,
    deleteVariant: deleteVariantMutation.mutateAsync,
    updateVariantPrice: updateVariantPriceMutation.mutateAsync,
    refetch: productsQuery.refetch,
  };
}

export function useVariants(productId, params = {}) {
  const query = useQuery({
    queryKey: ["products", productId, "variants", params],
    queryFn: async () => {
      if (!productId) return { items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
      return productsApi.listVariants(productId, params);
    },
    enabled: Boolean(productId),
    staleTime: 60 * 1000,
  });

  const data = query.data || {};
  return {
    variants: data.items || [],
    total: data.total || 0,
    page: data.page || 1,
    pageSize: data.pageSize || 10,
    totalPages: data.totalPages || 1,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
