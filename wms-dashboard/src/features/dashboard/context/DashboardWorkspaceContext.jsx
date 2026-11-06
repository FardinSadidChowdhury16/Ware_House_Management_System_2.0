import { createContext, useContext, useMemo, useState } from "react";
import { categoriesSeed, projectTagsSeed, returnsSeed } from "../../../shared/data/mockSeeds.js";

const DashboardWorkspaceContext = createContext(null);

export function DashboardWorkspaceProvider({ children }) {
  const [tags, setTags] = useState(projectTagsSeed);
  const [categories, setCategories] = useState(categoriesSeed);
  const [serviceTickets, setServiceTickets] = useState(returnsSeed);

  const value = useMemo(
    () => ({ tags, setTags, categories, setCategories, serviceTickets, setServiceTickets }),
    [tags, categories, serviceTickets]
  );

  return <DashboardWorkspaceContext.Provider value={value}>{children}</DashboardWorkspaceContext.Provider>;
}

export function useDashboardWorkspace() {
  const context = useContext(DashboardWorkspaceContext);
  if (!context) {
    throw new Error("useDashboardWorkspace must be used within DashboardWorkspaceProvider");
  }
  return context;
}
