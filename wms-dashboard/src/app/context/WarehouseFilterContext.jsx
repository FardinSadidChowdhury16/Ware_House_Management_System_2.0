import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { warehousesApi } from "../../features/warehouses/api/warehousesApi.js";

const WarehouseFilterContext = createContext(null);

/**
 * Provides the logged-in user's assigned warehouses + a selected warehouse state
 * to every feature in the app.
 *
 * selectedWarehouseId = null  →  "All my warehouses"
 * selectedWarehouseId = <id>  →  filter to that specific warehouse
 */
export function WarehouseFilterProvider({ children }) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);

  // Fetch summary once — this returns the warehouses list for the logged-in user
  const { data, isLoading } = useQuery({
    queryKey: ["warehouses", "my-summary", null],
    queryFn: () => warehousesApi.getMySummary(null),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const myWarehouses = data?.warehouses ?? [];

  const selectWarehouse = useCallback((id) => {
    setSelectedWarehouseId(id ?? null);
  }, []);

  const value = useMemo(() => ({
    myWarehouses,           // [{id, name, code}] — user's assigned warehouses
    selectedWarehouseId,    // null = all, number = specific
    selectWarehouse,        // (id | null) => void
    isLoadingWarehouses: isLoading,
  }), [myWarehouses, selectedWarehouseId, selectWarehouse, isLoading]);

  return (
    <WarehouseFilterContext.Provider value={value}>
      {children}
    </WarehouseFilterContext.Provider>
  );
}

export function useWarehouseFilter() {
  const ctx = useContext(WarehouseFilterContext);
  if (!ctx) {
    return {
      myWarehouses: [],
      selectedWarehouseId: null,
      selectWarehouse: () => {},
      isLoadingWarehouses: false,
    };
  }
  return ctx;
}

