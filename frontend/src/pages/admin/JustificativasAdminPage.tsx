import { JustificativasContent } from "../JustificativasPage";
import { DashboardPageHeader } from "../../components/admin/DashboardPageHeader";

export function JustificativasAdminPage() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <DashboardPageHeader />
      <JustificativasContent />
    </div>
  );
}
