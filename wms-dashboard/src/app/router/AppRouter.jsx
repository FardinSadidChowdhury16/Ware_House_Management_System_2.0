import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../../features/auth/pages/LoginPage.jsx";
import { PermissionRoute, ProtectedRoute } from "../../features/auth/components/ProtectedRoute.jsx";
import { DashboardLayout } from "../layouts/DashboardLayout.jsx";
import { OverviewPage } from "../../features/overview/pages/OverviewPage.jsx";
import { UserManagementPage } from "../../features/user-management/pages/UserManagementPage.jsx";
import { CustomersPage } from "../../features/customers/pages/CustomersPage.jsx";
import { SuppliersPage } from "../../features/suppliers/pages/SuppliersPage.jsx";
import { WarehousesPage } from "../../features/warehouses/pages/WarehousesPage.jsx";
import { ProductsPage } from "../../features/products/pages/ProductsPage.jsx";
import { BarcodePage } from "../../features/barcode/pages/BarcodePage.jsx";
import { StockInPage } from "../../features/stock-in/pages/StockInPage.jsx";
import { StockOutPage } from "../../features/stock-out/pages/StockOutPage.jsx";
import { TransferPage } from "../../features/transfer/pages/TransferPage.jsx";
import { ApprovalsPage } from "../../features/approvals/pages/ApprovalsPage.jsx";
import { InventoryPage } from "../../features/inventory/pages/InventoryPage.jsx";
import { TrackingPage } from "../../features/tracking/pages/TrackingPage.jsx";
import { ReturnsPage } from "../../features/returns/pages/ReturnsPage.jsx";
import { WarrantyPage } from "../../features/warranty/pages/WarrantyPage.jsx";
import { ReportsPage } from "../../features/reports/pages/ReportsPage.jsx";
import { SettingsPage } from "../../features/settings/pages/SettingsPage.jsx";
import { ConfirmationProvider } from "../../components/ui/ConfirmationContext.jsx";

export function AppRouter() {
  return (
    <ConfirmationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="users" element={<PermissionRoute permission="user_read"><UserManagementPage /></PermissionRoute>} />
          <Route path="customers" element={<PermissionRoute permission="customer_read"><CustomersPage /></PermissionRoute>} />
          <Route path="suppliers" element={<PermissionRoute permission="supplier_read"><SuppliersPage /></PermissionRoute>} />
          <Route path="warehouses" element={<PermissionRoute permission="warehouse_read"><WarehousesPage /></PermissionRoute>} />
          <Route path="products" element={<PermissionRoute permission="product_read"><ProductsPage /></PermissionRoute>} />
          <Route path="barcode" element={<PermissionRoute permission="barcode_read"><BarcodePage /></PermissionRoute>} />
          <Route path="stock-in" element={<PermissionRoute permission="stock_in_read"><StockInPage /></PermissionRoute>} />
          <Route path="stock-out" element={<PermissionRoute permission="stock_out_read"><StockOutPage /></PermissionRoute>} />
          <Route path="transfer" element={<PermissionRoute permission="transfer_read"><TransferPage /></PermissionRoute>} />
          <Route path="approvals" element={<PermissionRoute permission="approval_read"><ApprovalsPage /></PermissionRoute>} />
          <Route path="inventory" element={<PermissionRoute permission="inventory_read"><InventoryPage /></PermissionRoute>} />
          <Route path="tracking" element={<PermissionRoute permission="tracking_read"><TrackingPage /></PermissionRoute>} />
          <Route path="returns" element={<PermissionRoute permission="return_read"><ReturnsPage /></PermissionRoute>} />
          <Route path="warranty" element={<PermissionRoute permission="warranty_read"><WarrantyPage /></PermissionRoute>} />
          <Route path="reports" element={<Navigate to="/reports/stock-summary" replace />} />
          <Route path="reports/stock-summary" element={<PermissionRoute permission="report_read"><ReportsPage initialReport="stock_summary" /></PermissionRoute>} />
          <Route path="reports/inventory-movement" element={<PermissionRoute permission="report_read"><ReportsPage initialReport="movement_report" /></PermissionRoute>} />
          <Route path="reports/low-stock" element={<PermissionRoute permission="report_read"><ReportsPage initialReport="low_stock_report" /></PermissionRoute>} />
          <Route path="reports/stock-sell" element={<PermissionRoute permission="report_read"><ReportsPage initialReport="stock_sell_report" /></PermissionRoute>} />
          <Route path="settings" element={<PermissionRoute permission="tax_read"><SettingsPage /></PermissionRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </ConfirmationProvider>
  );
}
