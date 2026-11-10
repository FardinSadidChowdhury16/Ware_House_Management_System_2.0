import { Sidebar } from "./components/layout/Sidebar.jsx";
import { Header } from "./components/layout/Header.jsx";
import { SectionHeader } from "./components/ui/SectionHeader.jsx";
import { filterNavigationByPermissions, NAV, LABELS, DESCRIPTIONS } from "./components/layout/navigationConfig.js";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.wms-root { font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif; }
.wms-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
`;

const NO_SECTION_HEADER_SECTIONS = [
  "stockin",
  "stockout",
  "approvals",
  "inventory",
  "tracking",
  "warranty",
  "reports",
  "report_stock_summary",
  "report_movement",
  "report_low_stock",
  "report_stock_sell",
  "report_servicing",
  "settings",
  "returns",
  "transfer",
  "barcode",
  "products",
  "warehouses",
  "suppliers",
  "customers",
  "projects",
  "project_reports",
];

export default function WMSAdminDashboard({
  currentUser,
  onLogout,
  section = "overview",
  children,
}) {
  const visibleNavigation = filterNavigationByPermissions(NAV, currentUser);

  return (
    <div className="wms-root flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <style>{FONT_IMPORT}</style>
      <Sidebar nav={visibleNavigation} currentUser={currentUser} onLogout={onLogout} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header sectionLabel={LABELS[section] || LABELS.overview} />
        <main className="flex-1 overflow-y-auto p-6">
          {!NO_SECTION_HEADER_SECTIONS.includes(section) && (
            <SectionHeader
              title={LABELS[section] || LABELS.overview}
              subtitle={DESCRIPTIONS[section] ?? DESCRIPTIONS.overview}
            />
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
