import { InvitesTab } from "../../components/company/InvitesTab";
import { DashboardPageHeader } from "../../components/admin/DashboardPageHeader";

export function ConvitesPage() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <DashboardPageHeader />
      <InvitesTab />
    </div>
  );
}
