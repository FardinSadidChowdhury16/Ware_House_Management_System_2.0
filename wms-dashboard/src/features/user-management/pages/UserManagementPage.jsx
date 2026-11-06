import { useState } from "react";
import { useUserManagement } from "../hooks/useUserManagement.js";
import { UserManagementTabs } from "../components/UserManagementTabs.jsx";
import { UsersTabPage } from "./UsersTabPage.jsx";
import { RolesTabPage } from "./RolesTabPage.jsx";
import { useWarehouses } from "../../warehouses/hooks/useWarehouses.js";

export function UserManagementPage() {
  const [activeTab, setActiveTab] = useState("users");
  const userManagement = useUserManagement();
  const { warehouses } = useWarehouses();

  return (
    <div>
      <UserManagementTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "users" ? (
        <UsersTabPage {...userManagement} warehouses={warehouses} />
      ) : (
        <RolesTabPage {...userManagement} />
      )}
    </div>
  );
}
